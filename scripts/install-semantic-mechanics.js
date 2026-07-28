'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const SOURCE = path.join(ROOT, 'extras', 'semantic-mechanics.js');
const TARGET = path.join(DIST, 'semantic-mechanics.js');
const INDEX = path.join(DIST, 'index.html');
const SERVICE_WORKER = path.join(DIST, 'sw.js');

const SCRIPT_TAG = '<script src="semantic-mechanics.js?v=2.2.0"></script>';
const CORE_TAG = '<script src="core-mechanisms.js"></script>';
const APP_TAG = '<script src="js/app.js"></script>';
const SW_MARKER = '// GameForge semantic mechanics offline cache v2.2.0';

function requireFile(filePath, label) {
  if (!fs.existsSync(filePath)) throw new Error(`Missing ${label}: ${path.relative(ROOT, filePath)}`);
  return fs.readFileSync(filePath, 'utf8');
}

function requireMarkers(source, label, markers) {
  for (const marker of markers) {
    if (!source.includes(marker)) throw new Error(`${label} is missing marker: ${marker}`);
  }
}

if (!fs.existsSync(DIST)) throw new Error('Missing dist directory. Run build-release.js first.');
const semantic = requireFile(SOURCE, 'semantic mechanics source');
requireMarkers(semantic, 'semantic-mechanics.js', [
  "const VERSION = '1.0.0'",
  'instant_kill',
  'player_hurt_entity',
  'GAMEFORGE_PREFLIGHT.json',
  'Gen.__semanticMechanicsInstalled = true',
  'GF.semanticMechanics = Object.freeze'
]);
fs.copyFileSync(SOURCE, TARGET);
execFileSync(process.execPath, ['--check', TARGET], { stdio: 'inherit' });

let index = requireFile(INDEX, 'dist/index.html');
if (!index.includes(SCRIPT_TAG)) {
  if (index.includes(CORE_TAG)) {
    index = index.replace(CORE_TAG, `${CORE_TAG}\n  ${SCRIPT_TAG}`);
  } else if (index.includes(APP_TAG)) {
    index = index.replace(APP_TAG, `${SCRIPT_TAG}\n  ${APP_TAG}`);
  } else {
    throw new Error('Could not find a script insertion point for semantic-mechanics.js.');
  }
  fs.writeFileSync(INDEX, index, 'utf8');
}

index = fs.readFileSync(INDEX, 'utf8');
const semanticPosition = index.indexOf('semantic-mechanics.js');
const corePosition = index.indexOf('core-mechanisms.js');
const appPosition = index.indexOf('js/app.js');
if (semanticPosition < 0 || appPosition < 0) throw new Error('Semantic mechanics script reference is incomplete.');
if (corePosition >= 0 && semanticPosition < corePosition) {
  throw new Error('Semantic mechanics must load after core-mechanisms.js so it can patch the final generators.');
}
if (semanticPosition > appPosition) throw new Error('Semantic mechanics must load before js/app.js.');

let sw = requireFile(SERVICE_WORKER, 'dist/sw.js');
if (!sw.includes(SW_MARKER)) {
  sw += `\n\n${SW_MARKER}\n`;
  sw += `const GF_SEMANTIC_CACHE = 'gameforge-semantic-mechanics-v2.2.0';\n`;
  sw += `const GF_SEMANTIC_ASSETS = ['./semantic-mechanics.js', './runtime.html', './jar.html'];\n`;
  sw += `self.addEventListener('install', (event) => {\n`;
  sw += `  self.skipWaiting();\n`;
  sw += `  event.waitUntil(caches.open(GF_SEMANTIC_CACHE).then((cache) => cache.addAll(GF_SEMANTIC_ASSETS)));\n`;
  sw += `});\n`;
  sw += `self.addEventListener('activate', (event) => {\n`;
  sw += `  event.waitUntil(self.clients.claim());\n`;
  sw += `});\n`;
  fs.writeFileSync(SERVICE_WORKER, sw, 'utf8');
}
execFileSync(process.execPath, ['--check', SERVICE_WORKER], { stdio: 'inherit' });

console.log('Installed semantic mechanics, conditional weapon generation, preflight metadata, and offline cache support.');
