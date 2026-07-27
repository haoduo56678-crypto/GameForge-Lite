'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const pagePath = path.join(DIST, 'runtime.html');
const entryPath = path.join(DIST, 'jar-entry.js');

function requireFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing Runtime website file: ${path.relative(ROOT, filePath)}`);
  }
  return fs.readFileSync(filePath, 'utf8');
}

const page = requireFile(pagePath);
const entry = requireFile(entryPath);

for (const marker of [
  'GameForge Runtime GUI',
  'gameforge-runtime-1.20.1-0.1.0.jar',
  'Minecraft 1.20.1',
  'Forge 47.x',
  '6092a7af6571c82eb4848d5b6998e0f0fec553d50ed7a505255b3615bc75e53f',
]) {
  if (!page.includes(marker)) {
    throw new Error(`runtime.html is missing marker: ${marker}`);
  }
}

for (const marker of ['runtime.html', 'jar.html', 'Runtime GUI', 'ZIP → JAR']) {
  if (!entry.includes(marker)) {
    throw new Error(`jar-entry.js is missing marker: ${marker}`);
  }
}

execFileSync(process.execPath, ['--check', entryPath], { stdio: 'inherit' });
console.log('Runtime website page and quick-access entry checks passed.');
