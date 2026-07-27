'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const ROOT = path.resolve(__dirname, '..');
const PARTS_DIR = path.join(ROOT, 'extras', 'vocabulary');
const OUTPUT_PATH = path.join(ROOT, 'extras', 'local-vocabulary.js.gz.b64');
const EXPECTED_NAMES = Array.from({ length: 5 }, (_, index) => `chunk-${String(index).padStart(2, '0')}`);
const EXPECTED_ENCODED_SHA256 = '1883e7e22379d7458baba415c027657484ea25f808611a940690adfd3a9555be';
const EXPECTED_SOURCE_SHA256 = '28ea252bb0b7ce4282156e68748302b1aedc3c715fd1ff2595d7477325fa7b83';

if (!fs.existsSync(PARTS_DIR)) {
  throw new Error(`Missing vocabulary chunks directory: ${PARTS_DIR}`);
}

const names = fs.readdirSync(PARTS_DIR)
  .filter((name) => /^chunk-\d+$/.test(name))
  .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));

if (names.length !== EXPECTED_NAMES.length || names.some((name, index) => name !== EXPECTED_NAMES[index])) {
  throw new Error(`Vocabulary chunks are incomplete: ${names.join(', ')}`);
}

const encoded = names
  .map((name) => fs.readFileSync(path.join(PARTS_DIR, name), 'utf8').replace(/\s+/g, ''))
  .join('');
const encodedSha256 = crypto.createHash('sha256').update(encoded).digest('hex');
if (encodedSha256 !== EXPECTED_ENCODED_SHA256) {
  throw new Error(`Vocabulary encoded checksum mismatch: ${encodedSha256}`);
}

const source = zlib.gunzipSync(Buffer.from(encoded, 'base64'));
const sourceSha256 = crypto.createHash('sha256').update(source).digest('hex');
if (sourceSha256 !== EXPECTED_SOURCE_SHA256) {
  throw new Error(`Vocabulary source checksum mismatch: ${sourceSha256}`);
}

const text = source.toString('utf8');
for (const marker of [
  "const VERSION = '1.0.0'",
  'domain_world',
  'domain_dimension',
  'weather_acid',
  'style_cyberpunk',
  'GameForgeVocabulary'
]) {
  if (!text.includes(marker)) throw new Error(`Vocabulary package is missing marker: ${marker}`);
}

fs.writeFileSync(OUTPUT_PATH, encoded, 'utf8');
console.log(`Prepared GameForge vocabulary package from ${names.length} verified chunks.`);
console.log(`Vocabulary source SHA-256: ${sourceSha256}`);
