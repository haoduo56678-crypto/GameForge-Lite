'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const required = [
  'capability-status.js', 'capability-status-ui.js', 'capability-status.css',
  'index.html', 'blueprint.html', 'native-forge.html', 'native-systems.html', 'worldgen.html',
  'manifest.webmanifest', 'sw.js'
];

for (const relative of required) {
  const filePath = path.join(DIST, relative);
  if (!fs.existsSync(filePath)) throw new Error(`Capability status build file missing: dist/${relative}`);
  if (relative.endsWith('.js')) execFileSync(process.execPath, ['--check', filePath], { stdio: 'inherit' });
}

function injectBefore(filePath, marker, snippets) {
  let source = fs.readFileSync(filePath, 'utf8');
  for (const snippet of snippets) {
    if (source.includes(snippet)) continue;
    if (!source.includes(marker)) throw new Error(`${path.basename(filePath)} is missing capability insertion marker: ${marker}`);
    source = source.replace(marker, `  ${snippet}\n  ${marker}`);
  }
  fs.writeFileSync(filePath, source, 'utf8');
  return source;
}

function installPage(relative, scriptMarker) {
  const filePath = path.join(DIST, relative);
  let source = injectBefore(filePath, '</head>', ['<link rel="stylesheet" href="capability-status.css">']);
  source = injectBefore(filePath, scriptMarker, ['<script src="capability-status.js"></script>']);
  source = injectBefore(filePath, '</body>', ['<script src="capability-status-ui.js" defer></script>']);
  return source;
}

const index = installPage('index.html', '<script src="js/app.js"></script>')
  .replace(
    /<meta name="description" content="[^"]*"\s*\/>/,
    '<meta name="description" content="GameForge Lite：创建前直接说明哪些内容会生成、只能做一部分、只会保存需求或当前无法生成。支持低代码、Blueprint、原生 Forge、机器、自定义实体和世界维度。" />'
  );
fs.writeFileSync(path.join(DIST, 'index.html'), index, 'utf8');

const blueprint = installPage('blueprint.html', '<script src="blueprint-editor.js"></script>');
const nativeForge = installPage('native-forge.html', '<script src="native-forge-page.js"></script>');
const nativeSystems = installPage('native-systems.html', '<script src="native-systems-page.js"></script>');
const worldgen = installPage('worldgen.html', '<script src="worldgen-page.js"></script>');

const orders = [
  ['index.html', index, ['worldgen-blueprint.js', 'capability-status.js', 'js/app.js', 'capability-status-ui.js']],
  ['blueprint.html', blueprint, ['worldgen-blueprint.js', 'capability-status.js', 'blueprint-editor.js', 'capability-status-ui.js']],
  ['native-forge.html', nativeForge, ['worldgen-native.js', 'capability-status.js', 'native-forge-page.js', 'capability-status-ui.js']],
  ['native-systems.html', nativeSystems, ['native-systems-blueprint.js', 'capability-status.js', 'native-systems-page.js', 'capability-status-ui.js']],
  ['worldgen.html', worldgen, ['worldgen-blueprint.js', 'capability-status.js', 'worldgen-page.js', 'capability-status-ui.js']]
];
for (const [label, source, order] of orders) {
  for (const reference of order) if (!source.includes(reference)) throw new Error(`${label} is missing capability dependency: ${reference}`);
  for (let index = 1; index < order.length; index += 1) {
    if (source.indexOf(order[index - 1]) > source.indexOf(order[index])) throw new Error(`${label} script order invalid: ${order[index - 1]} must precede ${order[index]}`);
  }
}

const manifestPath = path.join(DIST, 'manifest.webmanifest');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
manifest.description = '本地 Minecraft 创作工作室：创建和下载前，用直白文字说明最终会生成什么、不会生成什么。';
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

const swPath = path.join(DIST, 'sw.js');
let sw = fs.readFileSync(swPath, 'utf8');
sw = sw.replace(/const CACHE_NAME = '[^']+';/, "const CACHE_NAME = 'gameforge-lite-v2.1.1-capability-status-v1';");
const assets = ['./capability-status.js', './capability-status-ui.js', './capability-status.css'];
const assetStart = sw.indexOf('const ASSETS = [');
const assetEnd = sw.indexOf('];', assetStart);
if (assetStart < 0 || assetEnd < 0) throw new Error('sw.js is missing the ASSETS array.');
const missing = assets.filter((asset) => !sw.includes(`'${asset}'`));
if (missing.length) {
  const beforeEnd = sw.slice(0, assetEnd);
  const body = sw.slice(assetStart + 'const ASSETS = ['.length, assetEnd).trim();
  const separator = body && !body.endsWith(',') ? ',\n' : (body ? '\n' : '');
  const insertion = `${missing.map((asset) => `  '${asset}',`).join('\n')}\n`;
  sw = `${beforeEnd}${separator}${insertion}${sw.slice(assetEnd)}`;
}
fs.writeFileSync(swPath, sw, 'utf8');
execFileSync(process.execPath, ['--check', swPath], { stdio: 'inherit' });

console.log('Installed plain-language capability status panels, creation/download guards and report assets into dist.');
