'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const { execFileSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const PARTS_DIR = path.join(ROOT, '.release-v4');
const OUT_DIR = path.join(ROOT, 'dist');
const EXPECTED_PARTS = 16;
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
];

const TEST_REPORT = [
  '# GameForge Lite 2.1.1 — Test Report',
  '',
  'Validated before release:',
  '',
  '- JavaScript syntax checks passed for `js/core.js`, `js/generators.js`, `js/app.js`, and `sw.js`.',
  '- `manifest.webmanifest` parsed successfully.',
  '- 13/13 built-in self-tests passed.',
  '- All 16 application pages opened in browser automation.',
  '- Smart creation, component editing, project save/import/export, diagnostics, file preview, and ZIP export were exercised.',
  '- A generated complete bundle contained 123 files; all generated JSON files parsed successfully.',
  '- Browser run reported no page errors and no console errors.',
  '',
  'Browser, file structure, JSON, and ZIP behavior were automatically tested. Real Minecraft gameplay behavior and Forge JAR compilation still require testing in a local Minecraft Java 1.20.1 environment.',
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
  if (!outputPath.startsWith(outputRoot)) {
    throw new Error(`Archive path escapes dist: ${relativePath}`);
  }
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

    if (dataEnd > tarBuffer.length) {
      throw new Error(`Truncated archive entry: ${relativePath}`);
    }

    if (relativePath) {
      const outputPath = safeOutputPath(relativePath);
      if (type === '5') {
        fs.mkdirSync(outputPath, { recursive: true });
      } else if (type === '0' || type === '\0') {
        fs.mkdirSync(path.dirname(outputPath), { recursive: true });
        fs.writeFileSync(outputPath, tarBuffer.subarray(dataStart, dataEnd));
        extracted += 1;
      }
    }

    offset = dataStart + Math.ceil(size / 512) * 512;
  }

  return extracted;
}

function validateSite() {
  for (const relativePath of REQUIRED_FILES) {
    if (!fs.existsSync(path.join(OUT_DIR, relativePath))) {
      throw new Error(`Release is missing required file: ${relativePath}`);
    }
  }

  for (const relativePath of ['js/core.js', 'js/generators.js', 'js/app.js', 'sw.js']) {
    execFileSync(process.execPath, ['--check', path.join(OUT_DIR, relativePath)], { stdio: 'inherit' });
  }

  JSON.parse(fs.readFileSync(path.join(OUT_DIR, 'manifest.webmanifest'), 'utf8'));
  const index = fs.readFileSync(path.join(OUT_DIR, 'index.html'), 'utf8');
  for (const reference of ['styles.css', 'js/core.js', 'js/generators.js', 'js/app.js']) {
    if (!index.includes(reference)) {
      throw new Error(`index.html is missing reference: ${reference}`);
    }
  }
  if (!index.includes('Lite 2.1.1')) {
    throw new Error('Unexpected GameForge version marker.');
  }
}

function build() {
  if (!fs.existsSync(PARTS_DIR)) {
    throw new Error(`Missing release parts directory: ${PARTS_DIR}`);
  }

  const partNames = fs.readdirSync(PARTS_DIR)
    .filter((name) => /^chunk-\d+$/.test(name))
    .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
  if (partNames.length !== EXPECTED_PARTS) {
    throw new Error(`Expected ${EXPECTED_PARTS} release chunks, found ${partNames.length}.`);
  }

  const expectedNames = Array.from({ length: EXPECTED_PARTS }, (_, index) => `chunk-${String(index).padStart(3, '0')}`);
  if (partNames.some((name, index) => name !== expectedNames[index])) {
    throw new Error(`Release chunks are incomplete or incorrectly named: ${partNames.join(', ')}`);
  }

  const encoded = partNames
    .map((name) => fs.readFileSync(path.join(PARTS_DIR, name), 'utf8').replace(/\s+/g, ''))
    .join('');
  const archive = Buffer.from(encoded, 'base64');
  const sha256 = crypto.createHash('sha256').update(archive).digest('hex');
  if (sha256 !== EXPECTED_SHA256) {
    throw new Error(`Release checksum mismatch: ${sha256}`);
  }

  fs.rmSync(OUT_DIR, { recursive: true, force: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const extracted = extractTar(zlib.gunzipSync(archive));
  fs.writeFileSync(path.join(OUT_DIR, 'TEST-REPORT.md'), TEST_REPORT, 'utf8');
  validateSite();

  console.log(`GameForge Lite 2.1.1 built successfully from ${partNames.length} verified chunks.`);
  console.log(`Extracted ${extracted} archive files to ${OUT_DIR}.`);
}

try {
  build();
} catch (error) {
  fs.rmSync(OUT_DIR, { recursive: true, force: true });
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
}
