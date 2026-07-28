'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { loadGameForge, loadSource } = require('./gameforge-test-context');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const scripts = ['capability-status.js', 'capability-status-ui.js'];
for (const relative of scripts) {
  const filePath = path.join(DIST, relative);
  if (!fs.existsSync(filePath)) throw new Error(`Missing capability status build file: dist/${relative}`);
  execFileSync(process.execPath, ['--check', filePath], { stdio: 'inherit' });
}
if (!fs.existsSync(path.join(DIST, 'capability-status.css'))) throw new Error('Missing capability status stylesheet.');

const context = loadGameForge(DIST);
for (const relative of [
  'native-systems.js', 'native-systems-legacy-bridge.js', 'native-systems-blueprint.js',
  'worldgen-core.js', 'worldgen-native.js', 'worldgen-blueprint.js',
  'capability-status.js'
]) loadSource(context, path.join(DIST, relative));
const GF = context.GameForge;
const Cap = GF.capabilities;
if (!Cap?.__installed) throw new Error('Plain-language capability engine did not install.');

function status(report, id, expected) {
  const entry = report.items.find((item) => item.id === id);
  if (!entry) throw new Error(`Capability report missing ${id}: ${JSON.stringify(report.items)}`);
  if (entry.status !== expected) throw new Error(`${id} status ${entry.status} !== ${expected}`);
  return entry;
}

const boss = Cap.analyzePrompt('做一个多阶段飞行 Boss');
status(boss, 'boss.basic', 'ready');
status(boss, 'boss.phases', 'saved');
status(boss, 'entity.flight', 'unsupported');
if (!boss.finalText.includes('阶段切换') || !boss.finalText.includes('飞行寻路')) throw new Error(`Boss final result is not direct enough: ${boss.finalText}`);
if (!boss.summary.includes('最终会生成') || !boss.summary.includes('不会生成')) throw new Error('Boss report does not directly state the final result.');

const world = Cap.analyzePrompt('做一个酸雨世界，每七天来一波强化尸潮');
status(world, 'worldgen.playable', 'ready');
status(world, 'world.weather_events', 'saved');
status(world, 'world.hordes', 'saved');
if (!world.finalText.includes('新维度') || !world.finalText.includes('特殊天气玩法')) throw new Error(`World final result is incomplete: ${world.finalText}`);

const machine = Cap.analyzePrompt('做一个叫星核熔炼机的机器，用 minecraft:iron_ingot 和 minecraft:coal，输出 minecraft:gold_ingot');
status(machine, 'machine.native', 'ready');
status(machine, 'machine.gui', 'ready');
if (machine.needsConfirmation) throw new Error('A basic generated machine should not show a limitation warning.');

const unsupported = Cap.analyzePrompt('生成 Fabric 1.21 的匹配大厅 Mod');
status(unsupported, 'backend.fabric', 'unsupported');
status(unsupported, 'version.other', 'unsupported');
status(unsupported, 'multiplayer.framework', 'unsupported');
if (unsupported.canProceed) throw new Error('An unsupported-only request should not be allowed to create misleading content.');

const project = GF.project.create({ name: 'Capability Fixture', namespace: 'capability_fixture' });
const smartWorld = GF.generators.parsePrompt('做一个叫云海群岛的浮空岛世界，永昼并创建安全平台', project);
if (smartWorld.components.length !== 2 || !smartWorld.components.some(GF.worldgen.isBiome) || !smartWorld.components.some(GF.worldgen.isDimension)) {
  throw new Error('Main smart creation did not route a world prompt to the real worldgen generator.');
}
if (!smartWorld.capabilityReport || !smartWorld.components.every((component) => component.spec?.gameforgeCapabilityReport)) throw new Error('Smart world components did not preserve the capability report.');

const smartMachine = GF.generators.parsePrompt('做一个叫量子加工机的机器，用 minecraft:iron_ingot 和 minecraft:coal，输出 minecraft:diamond，3秒完成', project);
if (smartMachine.components.length !== 1 || !GF.nativeSystems.isMachine(smartMachine.components[0])) throw new Error('Main smart creation did not route a machine prompt to the native systems generator.');

const weaponPlan = GF.generators.parsePrompt('做一把右键召唤闪电的剑', project);
const lowCodeProject = GF.project.create({ name: 'Capability Bundle', namespace: 'capability_bundle', components: weaponPlan.components });
const generated = GF.generators.generateProject(lowCodeProject);
for (const filename of ['gameforge-capability-report.json', 'README_CAPABILITY_STATUS.txt']) {
  if (!generated.bundle.some((entry) => entry.name === filename)) throw new Error(`Low-code bundle missing ${filename}.`);
  if (!generated.allFiles.some((entry) => entry.name === filename)) throw new Error(`Generated file list missing ${filename}.`);
}

const nativeProject = GF.project.create({
  name: 'Capability Native', namespace: 'capability_native',
  components: [
    GF.worldgen.createBiomeComponent({ name: '测试群系', id: 'test_biome', terrainPreset: 'overworld' }),
    GF.worldgen.createDimensionComponent({ name: '测试维度', id: 'test_dimension', terrainPreset: 'overworld', biomeId: 'capability_native:test_biome' })
  ]
});
const nativeOutput = GF.nativeForge.generate(nativeProject, {
  modId: 'capability_native', modName: 'Capability Native', packageName: 'com.gameforge.capabilitynative', version: '1.0.0', author: 'GameForge CI'
});
for (const filename of ['gameforge-capability-report.json', 'README_CAPABILITY_STATUS.txt']) {
  if (!nativeOutput.files.some((entry) => entry.name === filename)) throw new Error(`Native Forge project missing ${filename}.`);
}
if (!nativeOutput.report?.capabilityStatus || !nativeOutput.capabilityReport) throw new Error('Native Forge report did not expose capability status.');

const pages = ['index.html', 'blueprint.html', 'native-forge.html', 'native-systems.html', 'worldgen.html'];
for (const page of pages) {
  const source = fs.readFileSync(path.join(DIST, page), 'utf8');
  for (const marker of ['capability-status.css', 'capability-status.js', 'capability-status-ui.js']) {
    if (!source.includes(marker)) throw new Error(`${page} missing ${marker}.`);
  }
}
const index = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');
if (!(index.indexOf('worldgen-blueprint.js') < index.indexOf('capability-status.js') && index.indexOf('capability-status.js') < index.indexOf('js/app.js'))) {
  throw new Error('Capability parser must load after generator extensions and before the main app.');
}
const ui = fs.readFileSync(path.join(DIST, 'capability-status-ui.js'), 'utf8');
for (const marker of ['绿色', '会生成', '黄色', '只能生成一部分', '灰色', '只会记下来', '红色', '现在不会生成', '下面告诉你最终会生成什么，不会生成什么。']) {
  if (!ui.includes(marker)) throw new Error(`Plain-language UI missing: ${marker}`);
}
for (const marker of ['#smartCreate', '#downloadBundleTop', '#downloadProject', '下载前请确认最终效果']) {
  if (!ui.includes(marker)) throw new Error(`Creation/download guard missing: ${marker}`);
}
const sw = fs.readFileSync(path.join(DIST, 'sw.js'), 'utf8');
for (const marker of ['capability-status.js', 'capability-status-ui.js', 'capability-status.css', 'gameforge-lite-v2.1.1-capability-status-v1']) {
  if (!sw.includes(marker)) throw new Error(`Service worker missing capability asset: ${marker}`);
}

console.log('Plain-language capability status checks passed: prompt honesty, smart routing, project reports, download guards and visible color states verified.');
