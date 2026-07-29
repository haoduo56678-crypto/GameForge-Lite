'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { loadGameForge, loadSource } = require('./gameforge-test-context');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const catalogPath = path.join(DIST, 'content-catalog.js');
if (!fs.existsSync(catalogPath)) throw new Error('Missing dist/content-catalog.js.');
execFileSync(process.execPath, ['--check', catalogPath], { stdio: 'inherit' });

const context = loadGameForge(DIST);
for (const relative of [
  'native-systems.js','native-systems-legacy-bridge.js','native-systems-blueprint.js',
  'worldgen-core.js','worldgen-native.js','worldgen-blueprint.js',
  'capability-status.js','content-catalog.js'
]) loadSource(context, path.join(DIST, relative));
const GF = context.GameForge;
const Catalog = GF.contentCatalog;
if (!Catalog?.__installed) throw new Error('Content catalog did not install.');
if (!GF.capabilities?.__contentCatalogInstalled) throw new Error('Capability analyzer did not receive the content catalog.');
if (!GF.generators?.__contentCatalogInstalled) throw new Error('Smart generator did not receive the content catalog.');

for (const [label, actual, minimum] of [
  ['catalog entries', Catalog.stats.entries, 800],
  ['catalog aliases', Catalog.stats.aliases, 9000],
  ['vanilla-backed entries', Catalog.stats.vanilla, 700],
  ['advanced entries', Catalog.stats.advanced, 80]
]) if (actual < minimum) throw new Error(`${label} is too small: ${actual} < ${minimum}`);

function plan(prompt) {
  return GF.generators.parsePrompt(prompt, GF.project.create({ name:'Catalog Test', namespace:'catalog_test' }));
}
function report(prompt) { return GF.capabilities.analyzePrompt(prompt, { surface:'home' }); }
function component(prompt, index = 0) {
  const value = plan(prompt).components[index];
  if (!value) throw new Error(`No generated component for: ${prompt}`);
  return value;
}
function expectBase(prompt, expected) {
  const value = component(prompt);
  const actual = value.spec?.base || value.config?.base;
  if (actual !== expected) throw new Error(`${prompt} used ${actual || 'no base'} instead of ${expected}`);
}
function expectMatch(prompt, id) {
  const matches = Catalog.matchAll(prompt);
  if (!matches.some((match) => match.entry.id === id)) throw new Error(`${prompt} did not match ${id}: ${matches.map((match) => match.entry.id).join(', ')}`);
}
function expectStatus(prompt, status, idPart = '') {
  const value = report(prompt);
  const item = value.items.find((entry) => entry.status === status && (!idPart || entry.id.includes(idPart)));
  if (!item) throw new Error(`${prompt} did not expose ${status}${idPart ? ` for ${idPart}` : ''}: ${JSON.stringify(value.items)}`);
  if (value.items.some((entry) => entry.id === 'request.unclear')) throw new Error(`${prompt} still falls back to “没有看懂”.`);
  return value;
}

// 基础内容：不需要用户额外写“物品”或“方块”。
const basicCases = [
  ['生成一个箱子','block.chest','minecraft:chest'],
  ['做个工作台','block.crafting_table','minecraft:crafting_table'],
  ['来一个熔炉','block.furnace','minecraft:furnace'],
  ['给我一把弓','weapon.bow','minecraft:bow'],
  ['生成一面盾牌','weapon.shield','minecraft:shield'],
  ['做一个火把','basic.torch','minecraft:torch'],
  ['生成一张床','basic.generic_bed','minecraft:white_bed'],
  ['给我一个药水','basic.potion','minecraft:potion'],
  ['做一个指南针','item.compass','minecraft:compass'],
  ['生成一个钻石镐','tool.diamond.pickaxe','minecraft:diamond_pickaxe'],
  ['做一双下界合金靴子','armor.netherite.boots','minecraft:netherite_boots'],
  ['生成一块钻石矿石','ore.diamond_ore','minecraft:diamond_ore'],
  ['来一个红色潜影盒','color.red.shulker_box','minecraft:red_shulker_box'],
  ['生成 minecraft:spyglass','dynamic.spyglass','minecraft:spyglass']
];
for (const [prompt, id, base] of basicCases) {
  expectMatch(prompt, id);
  expectBase(prompt, base);
  expectStatus(prompt, 'ready');
}

const fox = component('生成一只狐狸');
if (fox.type !== 'mob' || fox.spec?.base !== 'minecraft:fox') throw new Error('Fox should become a fox-backed mob component.');
expectStatus('生成一只狐狸','ready','mob.fox');

const pair = plan('生成一个箱子和熔炉');
if (pair.components.length !== 2 || !pair.components.some((entry) => entry.spec?.base === 'minecraft:chest') || !pair.components.some((entry) => entry.spec?.base === 'minecraft:furnace')) {
  throw new Error('A prompt containing two catalog objects should create both components.');
}

// 非基础内容：生成可用底座，同时直说缺失能力。
expectStatus('做一个保险箱，54格容量带密码','partial','storage');
const firearmReport = expectStatus('做一把激光枪，使用电池和自定义子弹','partial','laser_gun');
if (!firearmReport.items.some((entry) => entry.status === 'ready')) throw new Error('Laser gun should still produce a usable ranged base.');
const reactor = plan('做一台核反应堆，连接能源网络');
if (!reactor.components.some((entry) => (entry.spec || entry.config)?.contentType === 'machine')) throw new Error('Nuclear reactor should route to the native machine base.');
expectStatus('做一台核反应堆，连接能源网络','partial','reactor');
const carReport = expectStatus('做一辆能开的汽车','unsupported','drive');
if (!carReport.items.some((entry) => entry.status === 'partial')) throw new Error('Car should expose a decorative partial result as well as unsupported driving.');
expectStatus('做一个任务NPC商店','saved','quest');
expectStatus('做一个任务NPC商店','saved','economy');

const nativeChest = component('生成一个真正的新箱子方块');
if (nativeChest.type !== 'forge' || nativeChest.spec?.contentType !== 'block') throw new Error('Explicit native chest request should create a true Forge block component.');

// 上下文优先级：不能把掉落、配方、Boss 或世界需求抢成普通目录物品。
if (plan('箱子掉落钻石').components[0]?.type !== 'loot') throw new Error('Chest loot prompt should remain a loot table.');
if (plan('9个木板合成箱子').components[0]?.type !== 'recipe') throw new Error('Chest recipe prompt should remain a recipe.');
if (plan('做一个箱子 Boss').components[0]?.type !== 'mob') throw new Error('Chest Boss prompt should remain a mob/Boss request.');
const worldPlan = plan('做一个有箱子的浮空岛世界');
if (worldPlan.components.length < 2 || !worldPlan.components.some(GF.worldgen.isDimension)) throw new Error('World prompt should remain in the world generator.');

// 生成结果要真正使用目录指定的原版载体，而不是只在提示层变绿。
const chestProject = GF.project.create({ name:'Chest Catalog Fixture', namespace:'chest_catalog_fixture', components:[component('生成一个箱子')] });
const generated = GF.generators.generateProject(chestProject);
const chestGive = generated.datapack.find((entry) => entry.name.endsWith('/give.mcfunction'));
if (!chestGive?.data.includes('minecraft:chest')) throw new Error('Generated chest project does not give a real chest-backed item.');
if (!generated.bundle.some((entry) => entry.name === 'gameforge-capability-report.json')) throw new Error('Catalog project lost its capability report.');

for (const relative of ['index.html','blueprint.html','native-forge.html','native-systems.html','worldgen.html']) {
  const source = fs.readFileSync(path.join(DIST, relative), 'utf8');
  for (const marker of ['capability-status.js','content-catalog.js','capability-status-ui.js']) if (!source.includes(marker)) throw new Error(`${relative} is missing ${marker}.`);
  if (!(source.indexOf('capability-status.js') < source.indexOf('content-catalog.js') && source.indexOf('content-catalog.js') < source.indexOf('capability-status-ui.js'))) {
    throw new Error(`${relative} loads the content catalog in the wrong order.`);
  }
}
const sw = fs.readFileSync(path.join(DIST, 'sw.js'), 'utf8');
if (!sw.includes('content-catalog.js') || !sw.includes('content-catalog-v1')) throw new Error('Service worker is missing the content catalog asset or cache version.');

console.log(`Broad content catalog checks passed: ${Catalog.stats.entries} entries, ${Catalog.stats.aliases} aliases, basics, advanced concepts, routing and generated output verified.`);
