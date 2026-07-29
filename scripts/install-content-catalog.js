'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const sourcePath = path.join(ROOT, 'extras', 'content-catalog.js');
const targetPath = path.join(DIST, 'content-catalog.js');

if (!fs.existsSync(sourcePath)) throw new Error('Missing extras/content-catalog.js.');
if (!fs.existsSync(DIST)) throw new Error('Missing dist. Run the base release build first.');
fs.copyFileSync(sourcePath, targetPath);
execFileSync(process.execPath, ['--check', targetPath], { stdio: 'inherit' });

function installPage(relative) {
  const filePath = path.join(DIST, relative);
  if (!fs.existsSync(filePath)) throw new Error(`Missing dist/${relative}.`);
  let source = fs.readFileSync(filePath, 'utf8');
  const capabilityTag = '<script src="capability-status.js"></script>';
  const catalogTag = '<script src="content-catalog.js"></script>';
  if (!source.includes(capabilityTag)) throw new Error(`${relative} is missing capability-status.js.`);
  if (!source.includes(catalogTag)) source = source.replace(capabilityTag, `${capabilityTag}\n  ${catalogTag}`);
  if (!(source.indexOf(capabilityTag) < source.indexOf(catalogTag))) throw new Error(`${relative} loads content catalog before the capability system.`);
  if (source.includes('capability-status-ui.js') && !(source.indexOf(catalogTag) < source.indexOf('capability-status-ui.js'))) {
    throw new Error(`${relative} loads the capability UI before the content catalog.`);
  }
  fs.writeFileSync(filePath, source, 'utf8');
  return source;
}

for (const relative of ['index.html','blueprint.html','native-forge.html','native-systems.html','worldgen.html']) installPage(relative);

const swPath = path.join(DIST, 'sw.js');
let sw = fs.readFileSync(swPath, 'utf8');
sw = sw.replace(/const CACHE_NAME = '[^']+';/, "const CACHE_NAME = 'gameforge-lite-v2.1.1-content-catalog-v1';");
const asset = './content-catalog.js';
if (!sw.includes(`'${asset}'`)) {
  const start = sw.indexOf('const ASSETS = [');
  const end = sw.indexOf('];', start);
  if (start < 0 || end < 0) throw new Error('sw.js is missing the ASSETS array.');
  const before = sw.slice(0, end);
  const body = sw.slice(start + 'const ASSETS = ['.length, end).trim();
  const separator = body && !body.endsWith(',') ? ',\n' : (body ? '\n' : '');
  sw = `${before}${separator}  '${asset}',\n${sw.slice(end)}`;
}
fs.writeFileSync(swPath, sw, 'utf8');
execFileSync(process.execPath, ['--check', swPath], { stdio: 'inherit' });

console.log('Installed the broad vanilla and advanced content catalog into every creation surface.');
