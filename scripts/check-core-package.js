'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const ROOT = path.resolve(__dirname, '..');
const PACKAGE_PATH = path.join(ROOT, 'extras', 'core-mechanisms.js.gz.b64');

if (!fs.existsSync(PACKAGE_PATH)) {
  throw new Error('Missing packaged GameForge core runtime.');
}

const encoded = fs.readFileSync(PACKAGE_PATH, 'utf8').replace(/\s+/g, '');
const compressed = Buffer.from(encoded, 'base64');
const source = zlib.gunzipSync(compressed);
const sha256 = crypto.createHash('sha256').update(source).digest('hex');
const text = source.toString('utf8');

for (const marker of [
  "const CORE_VERSION = '1.1.0'",
  'Gen.__coreMechanismsInstalled = true',
  'gameforge/player_init.mcfunction',
  'gameforge/doctor.mcfunction',
  '被动武器会自动生成冷却与 Tick 机制',
  'recipeIds.map((recipeId) => `recipe give @s ${recipeId}`)'
]) {
  if (!text.includes(marker)) throw new Error(`Core runtime package is missing marker: ${marker}`);
}

console.log(`Core runtime package decoded and marker checks passed: ${sha256}`);
