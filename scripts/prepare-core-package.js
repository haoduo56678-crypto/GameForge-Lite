'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const ROOT = path.resolve(__dirname, '..');
const PARTS_DIR = path.join(ROOT, 'extras', 'core-runtime');
const OUTPUT_PATH = path.join(ROOT, 'extras', 'core-mechanisms.js.gz.b64');
const EXPECTED_NAMES = Array.from({ length: 6 }, (_, index) => `chunk-${String(index).padStart(2, '0')}`);
const EXPECTED_ENCODED_SHA256 = '9ea51aa57efebc9e60f370843d237e6f34267eef5df74cc8baff7765613a5c94';
const EXPECTED_SOURCE_SHA256 = '78e8b5ee4232dc283f154beb851a52c456fa4c92a44868c5baa1f738766dd5b1';

if (!fs.existsSync(PARTS_DIR)) {
  throw new Error(`Missing core runtime chunks directory: ${PARTS_DIR}`);
}

const names = fs.readdirSync(PARTS_DIR)
  .filter((name) => /^chunk-\d+$/.test(name))
  .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));

if (names.length !== EXPECTED_NAMES.length || names.some((name, index) => name !== EXPECTED_NAMES[index])) {
  throw new Error(`Core runtime chunks are incomplete: ${names.join(', ')}`);
}

const encoded = names
  .map((name) => fs.readFileSync(path.join(PARTS_DIR, name), 'utf8').replace(/\s+/g, ''))
  .join('');
const encodedSha256 = crypto.createHash('sha256').update(encoded).digest('hex');
if (encodedSha256 !== EXPECTED_ENCODED_SHA256) {
  throw new Error(`Core runtime encoded checksum mismatch: ${encodedSha256}`);
}

const source = zlib.gunzipSync(Buffer.from(encoded, 'base64'));
const sourceSha256 = crypto.createHash('sha256').update(source).digest('hex');
if (sourceSha256 !== EXPECTED_SOURCE_SHA256) {
  throw new Error(`Core runtime source checksum mismatch: ${sourceSha256}`);
}

fs.writeFileSync(OUTPUT_PATH, encoded, 'utf8');
console.log(`Prepared GameForge core runtime package from ${names.length} verified chunks.`);
console.log(`Source SHA-256: ${sourceSha256}`);
