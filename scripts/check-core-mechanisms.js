'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const indexPath = path.join(DIST, 'index.html');
const corePath = path.join(DIST, 'core-mechanisms.js');

function readRequired(filePath) {
  if (!fs.existsSync(filePath)) throw new Error(`Missing built file: ${path.relative(ROOT, filePath)}`);
  return fs.readFileSync(filePath, 'utf8');
}

function requireMarkers(text, fileName, markers) {
  for (const marker of markers) {
    if (!text.includes(marker)) throw new Error(`${fileName} is missing required marker: ${marker}`);
  }
}

const index = readRequired(indexPath);
const core = readRequired(corePath);

requireMarkers(index, 'dist/index.html', [
  '<script src="core-mechanisms.js"></script>',
  '<script src="js/app.js"></script>'
]);
if (index.indexOf('core-mechanisms.js') > index.indexOf('js/app.js')) {
  throw new Error('Core mechanisms are loaded after the app.');
}

requireMarkers(core, 'dist/core-mechanisms.js', [
  'function buildRuntime',
  'gameforge/player_init.mcfunction',
  'gameforge/get_all.mcfunction',
  'gameforge/spawn_all.mcfunction',
  'gameforge/cleanup.mcfunction',
  'gameforge/doctor.mcfunction',
  'gameforge/uninstall.mcfunction',
  'triggerButton',
  'patchWeaponMechanics',
  'patchBlockMechanics',
  'Gen.__coreMechanismsInstalled = true'
]);

console.log('GameForge core mechanism build checks passed.');
