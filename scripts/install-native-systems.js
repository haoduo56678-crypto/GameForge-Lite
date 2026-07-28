'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const required = [
  'native-systems.js','native-systems-legacy-bridge.js','native-systems-blueprint.js','native-systems-entry.js',
  'native-systems.html','native-systems.css','native-systems-page.js',
  'index.html','blueprint.html','native-forge.html','manifest.webmanifest','sw.js'
];
for (const relative of required) {
  const filePath = path.join(DIST, relative);
  if (!fs.existsSync(filePath)) throw new Error(`Native systems build file missing: dist/${relative}`);
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
const nativeGeneratorTag = '<script src="native-forge-generator.js"></script>';
const appTag = '<script src="js/app.js"></script>';
if (!index.includes(nativeGeneratorTag) || !index.includes(appTag)) throw new Error('index.html is missing native Forge architecture scripts.');
for (const tag of ['<script src="native-systems.js"></script>','<script src="native-systems-legacy-bridge.js"></script>','<script src="native-systems-blueprint.js"></script>']) {
  if (!index.includes(tag)) index = index.replace(appTag, `  ${tag}\n  ${appTag}`);
}
const entryTag = '<script src="native-systems-entry.js" defer></script>';
if (!index.includes(entryTag)) index = index.replace('</body>', `  ${entryTag}\n</body>`);
index = index.replace(
  /<meta name="description" content="[^"]*"\s*\/>/,
  '<meta name="description" content="GameForge Lite：本地 Minecraft Java 1.20.1 创作工作室，提供 IR、Blueprint、原生 Forge Java 工程、自定义 GUI、网络同步、BlockEntity、EntityType 与 Goal AI 生成。" />'
);
fs.writeFileSync(indexPath, index, 'utf8');

const blueprint = injectBefore(path.join(DIST, 'blueprint.html'), '<script src="blueprint-editor.js"></script>', [
  '<script src="native-systems.js"></script>',
  '<script src="native-systems-legacy-bridge.js"></script>',
  '<script src="native-systems-blueprint.js"></script>'
]);
if (!(blueprint.indexOf('native-forge-generator.js') < blueprint.indexOf('native-systems.js')
  && blueprint.indexOf('native-systems.js') < blueprint.indexOf('native-systems-legacy-bridge.js')
  && blueprint.indexOf('native-systems-legacy-bridge.js') < blueprint.indexOf('native-systems-blueprint.js')
  && blueprint.indexOf('native-systems-blueprint.js') < blueprint.indexOf('blueprint-editor.js'))) {
  throw new Error('blueprint.html native systems scripts load in the wrong order.');
}

const forgePath = path.join(DIST, 'native-forge.html');
let forge = injectBefore(forgePath, '<script src="native-forge-page.js"></script>', ['<script src="native-systems.js"></script>','<script src="native-systems-legacy-bridge.js"></script>']);
forge = forge
  .replace('注册物品、方块、武器与召唤物品', '注册物品、方块、武器、机器 BlockEntity 与全新 EntityType')
  .replace('生物／Boss 当前生成原生召唤物品来创建并配置原版实体。全新 EntityType、模型动画和复杂 AI 属于下一层扩展。', '自定义生物现在可以注册真正的新 EntityType、属性、渲染器、刷怪蛋与基础 Goal AI；复杂骨骼动画、Brain AI 和特殊导航仍属于后续扩展。');
if (!forge.includes('native-systems.js')) throw new Error('native-forge.html did not receive native-systems.js.');
fs.writeFileSync(forgePath, forge, 'utf8');

const manifestPath = path.join(DIST, 'manifest.webmanifest');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const shortcuts = Array.isArray(manifest.shortcuts) ? manifest.shortcuts.filter((item) => item.url !== './native-systems.html') : [];
shortcuts.unshift({
  name: '原生机器与自定义实体', short_name: 'Native Systems',
  description: 'GUI、网络、BlockEntity、EntityType 与 Goal AI',
  url: './native-systems.html', icons: manifest.icons || []
});
manifest.shortcuts = shortcuts.slice(0, 4);
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

const swPath = path.join(DIST, 'sw.js');
let sw = fs.readFileSync(swPath, 'utf8');
sw = sw.replace(/const CACHE_NAME = '[^']+';/, "const CACHE_NAME = 'gameforge-lite-v2.1.1-native-systems-v1';");
for (const asset of [
  './gameforge-ir.js','./gameforge-blueprint.js','./native-forge-generator.js',
  './blueprint.html','./blueprint.css','./blueprint-editor.js',
  './native-forge.html','./native-forge.css','./native-forge-page.js',
  './native-systems.js','./native-systems-legacy-bridge.js','./native-systems-blueprint.js',
  './native-systems.html','./native-systems.css','./native-systems-page.js','./native-systems-entry.js'
]) {
  if (!sw.includes(`  '${asset}',`)) {
    const marker = "  './manifest.webmanifest'";
    if (!sw.includes(marker)) throw new Error('sw.js is missing manifest asset insertion point.');
    sw = sw.replace(marker, `  '${asset}',\n${marker}`);
  }
}
fs.writeFileSync(swPath, sw, 'utf8');
execFileSync(process.execPath, ['--check', swPath], { stdio: 'inherit' });

const order = ['native-forge-generator.js','native-systems.js','native-systems-legacy-bridge.js','native-systems-blueprint.js','js/app.js'];
for (const reference of order) if (!index.includes(reference)) throw new Error(`index.html is missing native systems reference: ${reference}`);
for (let indexPosition = 1; indexPosition < order.length; indexPosition += 1) {
  if (index.indexOf(order[indexPosition - 1]) > index.indexOf(order[indexPosition])) throw new Error(`Native system script order invalid: ${order[indexPosition - 1]} must precede ${order[indexPosition]}`);
}
for (const marker of ['BlockEntity','SimpleChannel','EntityType','Goal AI','native-systems-page.js']) {
  const page = fs.readFileSync(path.join(DIST, 'native-systems.html'), 'utf8');
  if (!page.includes(marker)) throw new Error(`native-systems.html is missing marker: ${marker}`);
}

console.log('Installed native GUI, networking, BlockEntity, EntityType and Goal AI studio into dist.');
