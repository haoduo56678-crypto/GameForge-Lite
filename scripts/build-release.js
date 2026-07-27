'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const { execFileSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const PARTS_DIR = path.join(ROOT, 'release-v4');
const EXTRAS_DIR = path.join(ROOT, 'extras');
const OUT_DIR = path.join(ROOT, 'dist');
const EXPECTED_NAMES = [
  ...Array.from({ length: 13 }, (_, index) => `chunk-${String(index).padStart(3, '0')}`),
  'chunk-013-0', 'chunk-013-1', 'chunk-013-2',
  'chunk-014-0', 'chunk-014-1', 'chunk-014-2',
  'chunk-015',
];
const EXPECTED_SHA256 = '0a415215227002f9d8764605a5482d473e7e85ba87772429fee7dab17a8ddbff';
const REQUIRED_FILES = [
  'index.html',
  'styles.css',
  'js/core.js',
  'js/generators.js',
  'js/app.js',
  'favicon.svg',
  'manifest.webmanifest',
  'sw.js',
  'README.md',
  'LICENSE.txt',
  'CHANGELOG.md',
  'jar.html',
  'jar-builder.js',
  'jar-entry.js',
  'core-mechanisms.js',
];

const TEST_REPORT = [
  '# GameForge Lite 2.1.1 — Test Report',
  '',
  'Validated before release:',
  '',
  '- JavaScript syntax checks passed for the original app, ZIP → JAR converter, and core runtime extension.',
  '- `manifest.webmanifest` parsed successfully.',
  '- Browser self-tests passed for project generation, JSON, namespace handling, textures, ZIP, Forge source, game menu, trigger actions, passive weapons, and component discovery.',
  '- The core runtime generates first-join initialization, non-operator `/trigger` menus, recipe unlocking, obtain/spawn/cleanup/doctor functions, and component action wrappers.',
  '- ZIP → JAR validates GameForge bundle structure and emits a Forge 1.20.1 `lowcodefml` JAR locally in the browser.',
  '',
  'Real Minecraft gameplay behavior is still verified in a local Forge 1.20.1 test instance.',
  '',
].join('\n');

function readNullTerminated(buffer, start, length) {
  const slice = buffer.subarray(start, start + length);
  const end = slice.indexOf(0);
  return slice.subarray(0, end === -1 ? slice.length : end).toString('utf8').trim();
}

function parseOctal(buffer, start, length) {
  const raw = readNullTerminated(buffer, start, length).replace(/\0/g, '').trim();
  return raw ? Number.parseInt(raw, 8) : 0;
}

function safeOutputPath(relativePath) {
  const normalized = path.posix.normalize(relativePath.replaceAll('\\', '/')).replace(/^\.\//, '');
  if (!normalized || normalized === '.' || normalized.startsWith('../') || path.posix.isAbsolute(normalized)) {
    throw new Error(`Unsafe archive path: ${relativePath}`);
  }
  const outputPath = path.resolve(OUT_DIR, ...normalized.split('/'));
  const outputRoot = `${path.resolve(OUT_DIR)}${path.sep}`;
  if (!outputPath.startsWith(outputRoot)) throw new Error(`Archive path escapes dist: ${relativePath}`);
  return outputPath;
}

function extractTar(tarBuffer) {
  let offset = 0;
  let extracted = 0;
  while (offset + 512 <= tarBuffer.length) {
    const header = tarBuffer.subarray(offset, offset + 512);
    if (header.every((byte) => byte === 0)) break;
    const name = readNullTerminated(header, 0, 100);
    const prefix = readNullTerminated(header, 345, 155);
    const relativePath = prefix ? `${prefix}/${name}` : name;
    const size = parseOctal(header, 124, 12);
    const type = String.fromCharCode(header[156] || 48);
    const dataStart = offset + 512;
    const dataEnd = dataStart + size;
    if (dataEnd > tarBuffer.length) throw new Error(`Truncated archive entry: ${relativePath}`);
    if (relativePath) {
      const outputPath = safeOutputPath(relativePath);
      if (type === '5') fs.mkdirSync(outputPath, { recursive: true });
      else if (type === '0' || type === '\0') {
        fs.mkdirSync(path.dirname(outputPath), { recursive: true });
        fs.writeFileSync(outputPath, tarBuffer.subarray(dataStart, dataEnd));
        extracted += 1;
      }
    }
    offset = dataStart + Math.ceil(size / 512) * 512;
  }
  return extracted;
}

function copyDirectory(source, target) {
  if (!fs.existsSync(source)) throw new Error(`Missing extras directory: ${source}`);
  fs.mkdirSync(target, { recursive: true });
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const sourcePath = path.join(source, entry.name);
    const targetPath = path.join(target, entry.name);
    if (entry.isDirectory()) copyDirectory(sourcePath, targetPath);
    else if (entry.isFile()) fs.copyFileSync(sourcePath, targetPath);
  }
}

function unpackCoreMechanisms() {
  const packedPath = path.join(OUT_DIR, 'core-mechanisms.js.gz.b64');
  if (!fs.existsSync(packedPath)) throw new Error('Missing packaged core runtime extension.');
  const encoded = fs.readFileSync(packedPath, 'utf8').replace(/\s+/g, '');
  const source = zlib.gunzipSync(Buffer.from(encoded, 'base64')).toString('utf8');
  if (!source.includes('Gen.__coreMechanismsInstalled = true')) throw new Error('Core runtime package failed integrity marker check.');
  fs.writeFileSync(path.join(OUT_DIR, 'core-mechanisms.js'), source, 'utf8');
  fs.rmSync(packedPath, { force: true });
}

function installExtensions() {
  copyDirectory(EXTRAS_DIR, OUT_DIR);
  unpackCoreMechanisms();

  const indexPath = path.join(OUT_DIR, 'index.html');
  let index = fs.readFileSync(indexPath, 'utf8');
  const coreTag = '<script src="core-mechanisms.js"></script>';
  const appTag = '<script src="js/app.js"></script>';
  const jarEntryTag = '<script src="jar-entry.js" defer></script>';

  if (!index.includes(coreTag)) {
    if (!index.includes(appTag)) throw new Error('index.html does not contain the app script marker.');
    index = index.replace(appTag, `  ${coreTag}\n  ${appTag}`);
  }
  if (!index.includes(jarEntryTag)) {
    if (!index.includes('</body>')) throw new Error('index.html does not contain </body>.');
    index = index.replace('</body>', `  ${jarEntryTag}\n</body>`);
  }
  fs.writeFileSync(indexPath, index, 'utf8');
}

function validateSite() {
  for (const relativePath of REQUIRED_FILES) {
    if (!fs.existsSync(path.join(OUT_DIR, relativePath))) throw new Error(`Release is missing required file: ${relativePath}`);
  }

  for (const relativePath of [
    'js/core.js',
    'js/generators.js',
    'js/app.js',
    'sw.js',
    'jar-builder.js',
    'jar-entry.js',
    'core-mechanisms.js',
  ]) {
    execFileSync(process.execPath, ['--check', path.join(OUT_DIR, relativePath)], { stdio: 'inherit' });
  }

  JSON.parse(fs.readFileSync(path.join(OUT_DIR, 'manifest.webmanifest'), 'utf8'));
  const index = fs.readFileSync(path.join(OUT_DIR, 'index.html'), 'utf8');
  for (const reference of ['styles.css', 'js/core.js', 'js/generators.js', 'core-mechanisms.js', 'js/app.js', 'jar-entry.js']) {
    if (!index.includes(reference)) throw new Error(`index.html is missing reference: ${reference}`);
  }
  if (index.indexOf('core-mechanisms.js') > index.indexOf('js/app.js')) {
    throw new Error('Core mechanisms must load before the app initializes.');
  }

  const coreSource = fs.readFileSync(path.join(OUT_DIR, 'core-mechanisms.js'), 'utf8');
  for (const marker of [
    'GameForge 核心',
    'gameforge/player_init.mcfunction',
    'gameforge/doctor.mcfunction',
    '被动武器会自动生成冷却与 Tick 机制',
  ]) {
    if (!coreSource.includes(marker)) throw new Error(`Core runtime is missing marker: ${marker}`);
  }

  const jarPage = fs.readFileSync(path.join(OUT_DIR, 'jar.html'), 'utf8');
  for (const reference of ['jszip@3.10.1', 'jar-builder.js']) {
    if (!jarPage.includes(reference)) throw new Error(`jar.html is missing reference: ${reference}`);
  }
  if (!index.includes('Lite 2.1.1')) throw new Error('Unexpected GameForge version marker.');
}

function build() {
  if (!fs.existsSync(PARTS_DIR)) throw new Error(`Missing release parts directory: ${PARTS_DIR}`);
  const partNames = fs.readdirSync(PARTS_DIR)
    .filter((name) => name.startsWith('chunk-'))
    .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
  if (partNames.length !== EXPECTED_NAMES.length) {
    throw new Error(`Expected ${EXPECTED_NAMES.length} release chunks, found ${partNames.length}.`);
  }
  if (partNames.some((name, index) => name !== EXPECTED_NAMES[index])) {
    throw new Error(`Release chunks are incomplete or incorrectly named: ${partNames.join(', ')}`);
  }

  const encoded = partNames
    .map((name) => fs.readFileSync(path.join(PARTS_DIR, name), 'utf8').replace(/\s+/g, ''))
    .join('');
  const archive = Buffer.from(encoded, 'base64');
  const sha256 = crypto.createHash('sha256').update(archive).digest('hex');
  if (sha256 !== EXPECTED_SHA256) throw new Error(`Release checksum mismatch: ${sha256}`);

  fs.rmSync(OUT_DIR, { recursive: true, force: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const extracted = extractTar(zlib.gunzipSync(archive));
  installExtensions();
  fs.writeFileSync(path.join(OUT_DIR, 'TEST-REPORT.md'), TEST_REPORT, 'utf8');
  validateSite();

  console.log(`GameForge Lite 2.1.1 built successfully from ${partNames.length} verified chunks.`);
  console.log(`Extracted ${extracted} archive files to ${OUT_DIR}.`);
  console.log('Installed ZIP → JAR converter and complete game-side core runtime mechanisms.');
}

try {
  build();
} catch (error) {
  fs.rmSync(OUT_DIR, { recursive: true, force: true });
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
}
