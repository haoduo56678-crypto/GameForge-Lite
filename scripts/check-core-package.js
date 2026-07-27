'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const ROOT = path.resolve(__dirname, '..');
const PACKAGE_PATH = path.join(ROOT, 'extras', 'core-mechanisms.js.gz.b64');
const EXPECTED_SOURCE_SHA256 = '87836ad996301c76c5ee22ff53986db82a41f8fff7cfbf55a1a6f87d62d8090b';

if (!fs.existsSync(PACKAGE_PATH)) {
  throw new Error('Missing packaged GameForge core runtime.');
}

const encoded = fs.readFileSync(PACKAGE_PATH, 'utf8').replace(/\s+/g, '');
const compressed = Buffer.from(encoded, 'base64');
const source = zlib.gunzipSync(compressed);
const sha256 = crypto.createHash('sha256').update(source).digest('hex');

if (sha256 !== EXPECTED_SOURCE_SHA256) {
  throw new Error(`Core runtime checksum mismatch: ${sha256}`);
}

const text = source.toString('utf8');
for (const marker of [
  'Gen.__coreMechanismsInstalled = true',
  'gameforge/player_init.mcfunction',
  'gameforge/doctor.mcfunction',
  '被动武器会自动生成冷却与 Tick 机制',
  'recipeIds.map((recipeId) => `recipe give @s ${recipeId}`)'
]) {
  if (!text.includes(marker)) throw new Error(`Core runtime package is missing marker: ${marker}`);
}

console.log(`Core runtime package checksum passed: ${sha256}`);
