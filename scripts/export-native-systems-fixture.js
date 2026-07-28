'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { loadGameForge, loadSource } = require('./gameforge-test-context');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const OUTPUT = path.join(ROOT, 'native-systems-fixture');
const context = loadGameForge(DIST);
for (const relative of ['native-systems.js','native-systems-legacy-bridge.js','native-systems-blueprint.js']) loadSource(context, path.join(DIST, relative));
const GF = context.GameForge;

let machine = GF.nativeSystems.createMachineComponent({
  name: '星核熔炼机', id: 'star_forge', inputItem: 'minecraft:iron_ingot', inputCount: 1,
  fuelItem: 'minecraft:coal', fuelCount: 1, outputItem: 'minecraft:gold_ingot', outputCount: 2,
  processTicks: 80, color: '#668cff', autoStart: false,
  recipeGrid: ['minecraft:iron_ingot','minecraft:redstone','minecraft:iron_ingot','minecraft:stone','minecraft:furnace','minecraft:stone','minecraft:iron_ingot','minecraft:redstone','minecraft:iron_ingot']
});
let fuelFreeMachine = GF.nativeSystems.createMachineComponent({
  name: '3D 免燃料压缩机', id: '3d_press', inputItem: 'minecraft:coal', inputCount: 9,
  fuelItem: 'minecraft:air', fuelCount: 0, outputItem: 'minecraft:coal_block', outputCount: 1,
  processTicks: 40, color: '#4f5969', autoStart: true,
  recipeGrid: ['minecraft:iron_ingot','minecraft:piston','minecraft:iron_ingot','minecraft:stone','minecraft:redstone_block','minecraft:stone','minecraft:iron_ingot','minecraft:hopper','minecraft:iron_ingot']
});
let entity = GF.nativeSystems.createEntityComponent({
  name: '亡灵守卫', id: 'undead_guard', health: 40, damage: 7, speed: 0.28, armor: 3, followRange: 36,
  mobType: 'undead',
  goals: ['float','melee_attack','random_stroll','look_at_player','random_look','hurt_by_target','nearest_player','leap_at_target'],
  targetPlayers: true, texture: 'minecraft:textures/entity/zombie/zombie.png', eggPrimary: '#334b2c', eggSecondary: '#7fa06d'
});
for (const [label, component] of [['machine', machine], ['fuel-free machine', fuelFreeMachine], ['entity', entity]]) {
  const graph = GF.blueprint.graphFromComponent(component);
  const applied = GF.blueprint.applyGraphToComponent(component, graph);
  if (applied.diagnostics.some((item) => item.severity === 'error')) throw new Error(`${label} Blueprint failed: ${JSON.stringify(applied.diagnostics)}`);
  if (label === 'machine') machine = applied.component;
  else if (label === 'fuel-free machine') fuelFreeMachine = applied.component;
  else entity = applied.component;
}
if (entity.spec.mobType !== 'undead') throw new Error('Entity MobType did not survive the Blueprint round trip.');
if (fuelFreeMachine.spec.id !== '3d_press') throw new Error('Numeric registry ID did not survive the Blueprint round trip.');

const project = GF.project.create({
  name: 'GameForge Native Systems Fixture', namespace: 'gameforge_native_systems_fixture',
  components: [machine, fuelFreeMachine, entity]
});
const output = GF.nativeForge.generate(project, {
  modId: 'gameforge_native_systems_fixture', modName: 'GameForge Native Systems Fixture',
  packageName: 'com.gameforge.nativesystemsfixture', version: '1.0.0', author: 'GameForge CI'
});

fs.rmSync(OUTPUT, { recursive: true, force: true });
for (const entry of output.files) {
  const destination = path.join(OUTPUT, ...entry.name.split('/'));
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, entry.encoding === 'base64' ? Buffer.from(entry.data, 'base64') : String(entry.data));
}
console.log(`Exported ${output.files.length} native systems-only Forge fixture files to ${OUTPUT}`);
