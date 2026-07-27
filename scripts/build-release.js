'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const ROOT = path.resolve(__dirname, '..');
const PARTS_DIR = path.join(ROOT, '.release-v2');
const OUT_DIR = path.join(ROOT, 'dist');
const EXPECTED_SHA256 = '0a415215227002f9d8764605a5482d473e7e85ba87772429fee7dab17a8ddbff';
const REQUIRED_FILES = [
  'index.html',
  'styles.css',
  'js/core.js',
  'js/generators.js',
  'js/app.js',
  'manifest.webmanifest',
  'sw.js',
];

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

function build() {
  if (!fs.existsSync(PARTS_DIR)) {
    throw new Error(`Missing release parts directory: ${PARTS_DIR}`);
  }

  const partNames = fs.readdirSync(PARTS_DIR)
    .filter((name) => /^part-\d+$/.test(name))
    .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));

  if (partNames.length !== 7) {
    throw new Error(`Expected 7 release parts, found ${partNames.length}`);
  }

  const encoded = partNames
    .map((name) => fs.readFileSync(path.join(PARTS_DIR, name), 'utf8').replace(/\s+/g, ''))
    .join('');
  const archive = Buffer.from(encoded, 'base64');
  const sha256 = crypto.createHash('sha256').update(archive).digest('hex');

  if (sha256 !== EXPECTED_SHA256) {
    throw new Error(`Release checksum mismatch: ${sha256}`);
  }

  const tarBuffer = zlib.gunzipSync(archive);
  fs.rmSync(OUT_DIR, { recursive: true, force: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const extracted = extractTar(tarBuffer);

  for (const relativePath of REQUIRED_FILES) {
    if (!fs.existsSync(path.join(OUT_DIR, relativePath))) {
      throw new Error(`Release is missing required file: ${relativePath}`);
    }
  }

  console.log(`GameForge Lite 2.1.1 built successfully: ${extracted} files -> ${OUT_DIR}`);
}

try {
  build();
} catch (error) {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
}
