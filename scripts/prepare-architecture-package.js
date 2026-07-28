'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const ROOT = path.resolve(__dirname, '..');
const PACKAGE_DIR = path.join(ROOT, 'architecture-v1');
const EXPECTED_CHUNKS = [
  'chunk-00', 'chunk-01', 'chunk-02', 'chunk-03',
  'chunk-04', 'chunk-05', 'chunk-06', 'chunk-07',
  'chunk-08', 'chunk-09', 'chunk-10', 'chunk-11',
];
const EXPECTED_SHA256 = 'd31ffffdd74cb19a0a2b42bf61a5195c4aa4ea08370c9fd31aceece97427d81d';
const EXPECTED_FILES = new Set([
  'extras/blueprint-editor.js',
  'extras/blueprint.css',
  'extras/blueprint.html',
  'extras/gameforge-blueprint.js',
  'extras/gameforge-ir.js',
  'extras/native-forge-generator.js',
  'extras/native-forge-page.js',
  'extras/native-forge.css',
  'extras/native-forge.html',
  'extras/studio-entry.js',
  'extras/sw.js',
  'scripts/install-architecture.js',
  'scripts/check-architecture.js',
  'scripts/gameforge-test-context.js',
  'scripts/export-native-forge-fixture.js',
  'scripts/patch-test-report-architecture.js',
]);

function readNullTerminated(buffer, start, length) {
  const slice = buffer.subarray(start, start + length);
  const end = slice.indexOf(0);
  return slice.subarray(0, end === -1 ? slice.length : end).toString('utf8').trim();
}

function parseOctal(buffer, start, length) {
  const raw = readNullTerminated(buffer, start, length).replace(/\0/g, '').trim();
  return raw ? Number.parseInt(raw, 8) : 0;
}

function safeTarget(relativePath) {
  const normalized = path.posix.normalize(String(relativePath || '').replaceAll('\\', '/')).replace(/^\.\//, '');
  if (!EXPECTED_FILES.has(normalized)) throw new Error(`Unexpected architecture package path: ${relativePath}`);
  const absolute = path.resolve(ROOT, ...normalized.split('/'));
  const rootPrefix = `${ROOT}${path.sep}`;
  if (!absolute.startsWith(rootPrefix)) throw new Error(`Architecture path escapes repository: ${relativePath}`);
  return { normalized, absolute };
}

function extractTar(buffer) {
  const found = new Set();
  let offset = 0;
  while (offset + 512 <= buffer.length) {
    const header = buffer.subarray(offset, offset + 512);
    if (header.every((byte) => byte === 0)) break;
    const name = readNullTerminated(header, 0, 100);
    const prefix = readNullTerminated(header, 345, 155);
    const relative = prefix ? `${prefix}/${name}` : name;
    const size = parseOctal(header, 124, 12);
    const type = String.fromCharCode(header[156] || 48);
    const start = offset + 512;
    const end = start + size;
    if (end > buffer.length) throw new Error(`Truncated architecture entry: ${relative}`);
    if (relative && (type === '0' || type === '\0')) {
      const target = safeTarget(relative);
      fs.mkdirSync(path.dirname(target.absolute), { recursive: true });
      fs.writeFileSync(target.absolute, buffer.subarray(start, end));
      found.add(target.normalized);
    } else if (relative && type !== '5') {
      throw new Error(`Unsupported architecture archive entry type ${type}: ${relative}`);
    }
    offset = start + Math.ceil(size / 512) * 512;
  }
  const missing = [...EXPECTED_FILES].filter((file) => !found.has(file));
  if (missing.length) throw new Error(`Architecture package is missing: ${missing.join(', ')}`);
  return found.size;
}

for (const name of EXPECTED_CHUNKS) {
  if (!fs.existsSync(path.join(PACKAGE_DIR, name))) throw new Error(`Missing architecture package chunk: architecture-v1/${name}`);
}
const encoded = EXPECTED_CHUNKS
  .map((name) => fs.readFileSync(path.join(PACKAGE_DIR, name), 'utf8').replace(/\s+/g, ''))
  .join('');
const compressed = Buffer.from(encoded, 'base64');
const sha256 = crypto.createHash('sha256').update(compressed).digest('hex');
if (sha256 !== EXPECTED_SHA256) throw new Error(`Architecture package checksum mismatch: ${sha256}`);
const count = extractTar(zlib.gunzipSync(compressed));
console.log(`Prepared ${count} GameForge IR, Blueprint and native Forge source files.`);
