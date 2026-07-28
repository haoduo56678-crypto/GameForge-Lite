'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const required = [
  'worldgen-core.js', 'worldgen-native.js', 'worldgen-blueprint.js', 'worldgen-entry.js',
  'worldgen.html', 'worldgen.css', 'worldgen-page.js',
  'index.html', 'blueprint.html', 'native-forge.html', 'manifest.webmanifest', 'sw.js'
];
for (const relative of required) {
  const filePath = path.join(DIST, relative);
  if (!fs.existsSync(filePath)) throw new Error(`Worldgen build file missing: dist/${relative}`);
  if (relative.endsWith('.js')) execFileSync(process.execPath, ['--check', filePath], { stdio: 'inherit' });
}

function injectBefore(filePath, marker, tags) {
  let source = fs.readFileSync(filePath, 'utf8');
  for (const tag of tags) {
    if (!source.includes(tag)) {
      if (!source.includes(marker)) throw new Error(`${path.basename(filePath)} is missing insertion marker: ${marker}`);
      source = source.replace(marker, `  ${tag}\n  ${marker}`);
    }
  }
  fs.writeFileSync(filePath, source, 'utf8');
  return source;
}

const indexPath = path.join(DIST, 'index.html');
let index = fs.readFileSync(indexPath, 'utf8');
const appTag = '<script src="js/app.js"></script>';
for (const tag of [
  '<script src="worldgen-core.js"></script>',
  '<script src="worldgen-native.js"></script>',
  '<script src="worldgen-blueprint.js"></script>'
]) {
  if (!index.includes(tag)) index = index.replace(appTag, `  ${tag}\n  ${appTag}`);
}
const entryTag = '<script src="worldgen-entry.js" defer></script>';
if (!index.includes(entryTag)) index = index.replace('</body>', `  ${entryTag}\n</body>`);
index = index.replace(
  /<meta name="description" content="[^"]*"\s*\/>/,
  '<meta name="description" content="GameForge Lite：本地 Minecraft Java 1.20.1 创作工作室，支持 IR、Blueprint、原生 Forge、机器、自定义实体、可进入维度与自定义群系生成。" />'
);
fs.writeFileSync(indexPath, index, 'utf8');

const blueprintPath = path.join(DIST, 'blueprint.html');
const blueprint = injectBefore(blueprintPath, '<script src="blueprint-editor.js"></script>', [
  '<script src="worldgen-core.js"></script>',
  '<script src="worldgen-native.js"></script>',
  '<script src="worldgen-blueprint.js"></script>'
]);
const blueprintOrder = [
  'native-forge-generator.js', 'native-systems.js', 'native-systems-legacy-bridge.js',
  'native-systems-blueprint.js', 'worldgen-core.js', 'worldgen-native.js',
  'worldgen-blueprint.js', 'blueprint-editor.js'
];
for (const reference of blueprintOrder) if (!blueprint.includes(reference)) throw new Error(`blueprint.html is missing worldgen dependency: ${reference}`);
for (let i = 1; i < blueprintOrder.length; i += 1) {
  if (blueprint.indexOf(blueprintOrder[i - 1]) > blueprint.indexOf(blueprintOrder[i])) throw new Error(`Blueprint script order invalid: ${blueprintOrder[i - 1]} must precede ${blueprintOrder[i]}`);
}

const forgePath = path.join(DIST, 'native-forge.html');
let forge = injectBefore(forgePath, '<script src="native-forge-page.js"></script>', [
  '<script src="worldgen-core.js"></script>',
  '<script src="worldgen-native.js"></script>'
]);
forge = forge
  .replace('注册物品、方块、武器、机器 BlockEntity 与全新 EntityType', '注册物品、方块、武器、机器 BlockEntity、全新 EntityType、自定义群系与可进入维度')
  .replace('自定义生物现在可以注册真正的新 EntityType、属性、渲染器、刷怪蛋与基础 Goal AI；复杂骨骼动画、Brain AI 和特殊导航仍属于后续扩展。', '自定义生物可以注册真正的新 EntityType；世界生成可以输出自定义群系、维度类型、地形预设和入口钥匙。任意 NoiseRouter、Jigsaw 结构编辑与复杂动画仍属于后续扩展。');
fs.writeFileSync(forgePath, forge, 'utf8');

const manifestPath = path.join(DIST, 'manifest.webmanifest');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const shortcuts = Array.isArray(manifest.shortcuts) ? manifest.shortcuts.filter((item) => item.url !== './worldgen.html') : [];
shortcuts.unshift({
  name: '世界与维度生成', short_name: 'Worldgen',
  description: '自定义群系、可进入维度、浮空岛、虚空世界和维度钥匙',
  url: './worldgen.html', icons: manifest.icons || []
});
manifest.shortcuts = shortcuts.slice(0, 4);
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

const swPath = path.join(DIST, 'sw.js');
let sw = fs.readFileSync(swPath, 'utf8');
sw = sw.replace(/const CACHE_NAME = '[^']+';/, "const CACHE_NAME = 'gameforge-lite-v2.1.1-worldgen-v1';");
const worldgenAssets = [
  './worldgen-core.js', './worldgen-native.js', './worldgen-blueprint.js', './worldgen-entry.js',
  './worldgen.html', './worldgen.css', './worldgen-page.js'
];
const assetStart = sw.indexOf('const ASSETS = [');
const assetEnd = sw.indexOf('];', assetStart);
if (assetStart < 0 || assetEnd < 0) throw new Error('sw.js is missing the ASSETS array.');
const missingAssets = worldgenAssets.filter((asset) => !sw.includes(`'${asset}'`));
if (missingAssets.length) {
  const beforeEnd = sw.slice(0, assetEnd);
  const arrayBody = sw.slice(assetStart + 'const ASSETS = ['.length, assetEnd).trim();
  const separator = arrayBody && !arrayBody.endsWith(',') ? ',\n' : (arrayBody ? '\n' : '');
  const insertion = `${missingAssets.map((asset) => `  '${asset}',`).join('\n')}\n`;
  sw = `${beforeEnd}${separator}${insertion}${sw.slice(assetEnd)}`;
}
fs.writeFileSync(swPath, sw, 'utf8');
execFileSync(process.execPath, ['--check', swPath], { stdio: 'inherit' });

const indexOrder = [
  'native-forge-generator.js', 'native-systems.js', 'native-systems-legacy-bridge.js',
  'native-systems-blueprint.js', 'worldgen-core.js', 'worldgen-native.js',
  'worldgen-blueprint.js', 'js/app.js'
];
for (const reference of indexOrder) if (!index.includes(reference)) throw new Error(`index.html is missing worldgen reference: ${reference}`);
for (let i = 1; i < indexOrder.length; i += 1) {
  if (index.indexOf(indexOrder[i - 1]) > index.indexOf(indexOrder[i])) throw new Error(`Worldgen script order invalid: ${indexOrder[i - 1]} must precede ${indexOrder[i]}`);
}

const worldgenPage = fs.readFileSync(path.join(DIST, 'worldgen.html'), 'utf8');
for (const marker of ['World & Dimension Studio', 'worldgen-core.js', 'worldgen-native.js', 'worldgen-blueprint.js', 'worldgen-page.js', '可进入维度']) {
  if (!worldgenPage.includes(marker)) throw new Error(`worldgen.html is missing marker: ${marker}`);
}

console.log('Installed custom biome, playable dimension, Blueprint and worldgen studio assets into dist.');
