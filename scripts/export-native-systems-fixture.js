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

const base = GF.project.create({ name: 'GameForge Native Systems Fixture', namespace: 'gameforge_native_systems_fixture' });
const weapon = GF.generators.parsePrompt('做一把叫工程守卫剑的剑，命中亡灵时造成三倍伤害，不伤害玩家', base).components[0];
let machine = GF.nativeSystems.createMachineComponent({
  name: '星核熔炼机', id: 'star_forge', inputItem: 'minecraft:iron_ingot', inputCount: 1,
  fuelItem: 'minecraft:coal', fuelCount: 1, outputItem: 'minecraft:gold_ingot', outputCount: 2,
  processTicks: 80, color: '#668cff', autoStart: false,
  recipeGrid: ['minecraft:iron_ingot','minecraft:redstone','minecraft:iron_ingot','minecraft:stone','minecraft:furnace','minecraft:stone','minecraft:iron_ingot','minecraft:redstone','minecraft:iron_ingot']
});
let entity = GF.nativeSystems.createEntityComponent({
  name: '亡灵守卫', id: 'undead_guard', health: 40, damage: 7, speed: 0.28, armor: 3, followRange: 36,
  goals: ['float','melee_attack','random_stroll','look_at_player','random_look','hurt_by_target','nearest_player','leap_at_target'],
  targetPlayers: true, texture: 'minecraft:textures/entity/zombie/zombie.png', eggPrimary: '#334b2c', eggSecondary: '#7fa06d'
});
const machineGraph = GF.blueprint.graphFromComponent(machine);
const machineApplied = GF.blueprint.applyGraphToComponent(machine, machineGraph);
if (machineApplied.diagnostics.some((item) => item.severity === 'error')) throw new Error(`Machine Blueprint failed: ${JSON.stringify(machineApplied.diagnostics)}`);
machine = machineApplied.component;
const entityGraph = GF.blueprint.graphFromComponent(entity);
const entityApplied = GF.blueprint.applyGraphToComponent(entity, entityGraph);
if (entityApplied.diagnostics.some((item) => item.severity === 'error')) throw new Error(`Entity Blueprint failed: ${JSON.stringify(entityApplied.diagnostics)}`);
entity = entityApplied.component;

const project = GF.project.create({
  name: 'GameForge Native Systems Fixture', namespace: 'gameforge_native_systems_fixture',
  components: [weapon, machine, entity]
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
console.log(`Exported ${output.files.length} native systems Forge fixture files to ${OUTPUT}`);
