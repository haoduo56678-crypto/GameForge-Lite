'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const sourcePath = path.join(DIST, 'advanced-weapon-mechanics.js');
const indexPath = path.join(DIST, 'index.html');

if (!fs.existsSync(sourcePath)) {
  throw new Error('Missing dist/advanced-weapon-mechanics.js. The extras directory was not copied into the release.');
}
if (!fs.existsSync(indexPath)) throw new Error('Missing dist/index.html.');

execFileSync(process.execPath, ['--check', sourcePath], { stdio: 'inherit' });

let index = fs.readFileSync(indexPath, 'utf8');
const advancedTag = '<script src="advanced-weapon-mechanics.js"></script>';
const coreTag = '<script src="core-mechanisms.js"></script>';
const appTag = '<script src="js/app.js"></script>';

if (!index.includes(advancedTag)) {
  if (!index.includes(appTag)) throw new Error('Could not find js/app.js insertion point for advanced weapon mechanics.');
  index = index.replace(appTag, `  ${advancedTag}\n  ${appTag}`);
  fs.writeFileSync(indexPath, index, 'utf8');
}

const corePosition = index.indexOf('core-mechanisms.js');
const advancedPosition = index.indexOf('advanced-weapon-mechanics.js');
const appPosition = index.indexOf('js/app.js');
const vocabularyPackPosition = index.indexOf('vocabulary-pack.js');
if (corePosition < 0 || advancedPosition < 0 || appPosition < 0) {
  throw new Error('Advanced weapon script references are incomplete.');
}
if (!(corePosition < advancedPosition && advancedPosition < appPosition)) {
  throw new Error('Advanced weapon mechanics must load after core-mechanisms.js and before js/app.js.');
}
if (vocabularyPackPosition >= 0 && !(vocabularyPackPosition < advancedPosition)) {
  throw new Error('Expanded vocabulary must load before advanced weapon semantics.');
}

console.log('Installed advanced targeted weapon mechanics into dist.');
