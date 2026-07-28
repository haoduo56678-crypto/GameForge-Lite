'use strict';

const path = require('node:path');
const { loadGameForge, loadSource } = require('./gameforge-test-context');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const context = loadGameForge(DIST);
for (const relative of ['native-systems.js','native-systems-legacy-bridge.js','native-systems-blueprint.js']) loadSource(context, path.join(DIST, relative));
const GF = context.GameForge;

for (const [raw, expected] of [
  ['3d_printer', '_3D_PRINTER'],
  ['9-lives', '_9_LIVES'],
  ['normal_machine', 'NORMAL_MACHINE']
]) {
  const actual = GF.nativeSystems.javaConstant(raw);
  if (actual !== expected) throw new Error(`Java constant normalization failed for ${raw}: ${actual} !== ${expected}`);
}

const machine = GF.nativeSystems.createMachineComponent({
  name: '3D 打印机', id: '3d_printer', inputItem: 'minecraft:iron_ingot',
  fuelItem: 'minecraft:redstone', outputItem: 'minecraft:iron_block', processTicks: 20
});
const entity = GF.nativeSystems.createEntityComponent({
  name: '九命守卫', id: '9_lives', health: 90, damage: 9,
  goals: ['float','melee_attack','nearest_player'], targetPlayers: true
});
const project = GF.project.create({ name: 'Numeric IDs', namespace: 'numeric_ids', components: [machine, entity] });
const output = GF.nativeForge.generate(project, {
  modId: 'numeric_ids', modName: 'Numeric IDs',
  packageName: 'com.gameforge.numericids', version: '1.0.0', author: 'GameForge CI'
});
const text = (suffix) => {
  const entry = output.files.find((item) => item.name.endsWith(suffix));
  if (!entry || entry.encoding === 'base64') throw new Error(`Generated numeric-ID file missing: ${suffix}`);
  return String(entry.data || '');
};
const blocks = text('/SystemBlocks.java');
const items = text('/SystemItems.java');
const entities = text('/SystemEntities.java');
const bootstrap = text('/NativeSystemsBootstrap.java');
for (const [source, marker] of [
  [blocks, 'RegistryObject<Block> _3D_PRINTER'],
  [items, 'RegistryObject<Item> _3D_PRINTER'],
  [items, 'RegistryObject<Item> _9_LIVES_SPAWN_EGG'],
  [entities, 'RegistryObject<EntityType<GameForgeCustomMob>> _9_LIVES'],
  [bootstrap, 'SystemEntities._9_LIVES.get()'],
  [bootstrap, 'SystemItems._3D_PRINTER'],
  [bootstrap, 'SystemItems._9_LIVES_SPAWN_EGG']
]) {
  if (!source.includes(marker)) throw new Error(`Generated Java numeric identifier is missing: ${marker}`);
}
for (const source of [blocks, items, entities, bootstrap]) {
  if (/\b(?:RegistryObject<[^>]+>|System(?:Blocks|Items|Entities)\.)\s*[0-9]/.test(source)) {
    throw new Error('Generated Java still contains an identifier beginning with a digit.');
  }
}
console.log('Numeric Minecraft registry IDs are converted into valid Java field constants.');
