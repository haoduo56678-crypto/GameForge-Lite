'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const { execFileSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const PARTS_ROOT = path.join(ROOT, 'extras', 'vocabulary-expansion');

const BUNDLES = [
  {
    directory: 'data',
    output: 'vocabulary-data.js',
    chunks: 4,
    sourceSha256: '96c7c29b3cbf9b2778a571b77a115da512a30b69d6e5e03d9a3dce766cf8e657',
    markers: ['GameForgeVocabularyData', 'type.weapon', 'domain.world'],
  },
  {
    directory: 'pack',
    output: 'vocabulary-pack.js',
    chunks: 2,
    sourceSha256: 'e1559751ec81a2267f047db241a0e5983f464ce1634ef2d4a6d5d9a24fc8f420',
    markers: ['GameForge Vocabulary Expansion', 'vocabularyExpansion', 'Gen.parsePrompt = parsePrompt'],
  },
];

function installBundle(bundle) {
  const directory = path.join(PARTS_ROOT, bundle.directory);
  const expectedNames = Array.from({ length: bundle.chunks }, (_, index) => `chunk-${String(index).padStart(2, '0')}`);
  if (!fs.existsSync(directory)) throw new Error(`Missing vocabulary expansion chunks: ${directory}`);
  const names = fs.readdirSync(directory)
    .filter((name) => /^chunk-\d+$/.test(name))
    .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
  if (names.length !== expectedNames.length || names.some((name, index) => name !== expectedNames[index])) {
    throw new Error(`Vocabulary expansion ${bundle.directory} chunks are incomplete: ${names.join(', ')}`);
  }

  const encoded = names
    .map((name) => fs.readFileSync(path.join(directory, name), 'utf8').replace(/\s+/g, ''))
    .join('');
  const source = zlib.gunzipSync(Buffer.from(encoded, 'base64'));
  const sha256 = crypto.createHash('sha256').update(source).digest('hex');
  if (sha256 !== bundle.sourceSha256) {
    throw new Error(`Vocabulary expansion ${bundle.output} checksum mismatch: ${sha256}`);
  }

  const text = source.toString('utf8');
  for (const marker of bundle.markers) {
    if (!text.includes(marker)) throw new Error(`${bundle.output} is missing marker: ${marker}`);
  }

  const target = path.join(DIST, bundle.output);
  fs.writeFileSync(target, source);
  execFileSync(process.execPath, ['--check', target], { stdio: 'inherit' });
}

if (!fs.existsSync(DIST)) throw new Error('Missing dist directory. Run build-release.js first.');
for (const bundle of BUNDLES) installBundle(bundle);

const indexPath = path.join(DIST, 'index.html');
if (!fs.existsSync(indexPath)) throw new Error('Missing dist/index.html.');
let index = fs.readFileSync(indexPath, 'utf8');

const localTag = '<script src="local-vocabulary.js"></script>';
const dataTag = '<script src="vocabulary-data.js"></script>';
const packTag = '<script src="vocabulary-pack.js"></script>';
const coreTag = '<script src="core-mechanisms.js"></script>';

if (!index.includes(dataTag) || !index.includes(packTag)) {
  if (index.includes(localTag)) {
    index = index.replace(localTag, `${localTag}\n  ${dataTag}\n  ${packTag}`);
  } else if (index.includes(coreTag)) {
    index = index.replace(coreTag, `${dataTag}\n  ${packTag}\n  ${coreTag}`);
  } else {
    throw new Error('Could not find the vocabulary/core script insertion point in dist/index.html.');
  }
  fs.writeFileSync(indexPath, index, 'utf8');
}

const localPosition = index.indexOf('local-vocabulary.js');
const dataPosition = index.indexOf('vocabulary-data.js');
const packPosition = index.indexOf('vocabulary-pack.js');
const corePosition = index.indexOf('core-mechanisms.js');
const appPosition = index.indexOf('js/app.js');

if (dataPosition < 0 || packPosition < 0 || corePosition < 0 || appPosition < 0) {
  throw new Error('Vocabulary expansion script references are incomplete.');
}
if (localPosition >= 0 && !(localPosition < dataPosition)) {
  throw new Error('The existing semantic vocabulary must load before the expanded phrase parser.');
}
if (!(dataPosition < packPosition && packPosition < corePosition && corePosition < appPosition)) {
  throw new Error('Vocabulary expansion scripts must load before core-mechanisms.js and js/app.js.');
}

console.log('Installed expanded local prompt vocabulary into dist.');
