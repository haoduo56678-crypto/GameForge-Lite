'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const sourcePath = path.join(ROOT, 'dist', 'worldgen-native.js');
if (!fs.existsSync(sourcePath)) throw new Error('Missing dist/worldgen-native.js.');
let source = fs.readFileSync(sourcePath, 'utf8');

function replaceOnce(search, replacement, label) {
  const count = source.split(search).length - 1;
  if (count === 0) {
    if (source.includes(replacement)) return;
    throw new Error(`Worldgen API patch could not find ${label}.`);
  }
  if (count !== 1) throw new Error(`Worldgen API patch found ${count} copies of ${label}.`);
  source = source.replace(search, replacement);
}

replaceOnce(
  '    patchMain(files, config);\n\n    if (dimensions.length) {',
  '    if (dimensions.length) patchMain(files, config);\n\n    if (dimensions.length) {',
  'biome-only main-class integration'
);

for (const marker of [
  'if (dimensions.length) patchMain(files, config);',
  'ResourceLocation.tryParse',
  'ResourceKey.create(Registries.DIMENSION',
  'serverPlayer.teleportTo',
]) {
  if (!source.includes(marker)) throw new Error(`Worldgen API patch missing marker: ${marker}`);
}

fs.writeFileSync(sourcePath, source, 'utf8');
execFileSync(process.execPath, ['--check', sourcePath], { stdio: 'inherit' });
console.log('Patched worldgen native backend for biome-only projects and verified travel APIs.');
