'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { loadGameForge, loadSource } = require('./gameforge-test-context');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const OUTPUT = path.join(ROOT, 'worldgen-fixture');
const context = loadGameForge(DIST);
for (const relative of [
  'native-systems.js', 'native-systems-legacy-bridge.js', 'native-systems-blueprint.js',
  'worldgen-core.js', 'worldgen-native.js', 'worldgen-blueprint.js'
]) loadSource(context, path.join(DIST, relative));
const GF = context.GameForge;

function pair(name, id, terrain, options = {}) {
  const biome = GF.worldgen.createBiomeComponent({
    name: `${name}群系`, id: `${id}_biome`, terrainPreset: terrain,
    temperature: options.temperature ?? 0.6, downfall: options.downfall ?? 0.2,
    precipitation: options.precipitation ?? false,
    featurePreset: options.featurePreset,
    spawnPreset: options.spawnPreset,
    structures: options.structures || [],
    skyColor: options.skyColor || '#7f91ae', fogColor: options.fogColor || '#7a7780',
    waterColor: options.waterColor || '#3c5c72', waterFogColor: options.waterFogColor || '#152938',
    grassColor: options.grassColor || '#686a4f', foliageColor: options.foliageColor || '#5c6048'
  });
  const dimension = GF.worldgen.createDimensionComponent({
    name: `${name}维度`, id, terrainPreset: terrain,
    biomeId: `gameforge_worldgen_fixture:${id}_biome`, fixedTime: options.fixedTime,
    travelItemId: `${id}_key`, travelItemName: `${name}钥匙`,
    createPlatform: options.createPlatform, spawnY: options.spawnY,
    platformBlock: options.platformBlock || 'minecraft:stone'
  });
  for (const component of [biome, dimension]) {
    const graph = GF.blueprint.graphFromComponent(component);
    const applied = GF.blueprint.applyGraphToComponent(component, graph);
    if (applied.diagnostics.some((issue) => issue.severity === 'error')) throw new Error(`${component.name} Blueprint failed: ${JSON.stringify(applied.diagnostics)}`);
    if (GF.worldgen.isBiome(component)) Object.assign(biome, applied.component);
    else Object.assign(dimension, applied.component);
  }
  return [biome, dimension];
}

const ashStalker = GF.nativeSystems.createEntityComponent({
  name: '灰烬潜行者', id: 'ash_stalker', mobType: 'undead', health: 34, damage: 6,
  speed: 0.3, armor: 2, followRange: 36,
  goals: ['float','melee_attack','random_stroll','look_at_player','random_look','hurt_by_target','nearest_player'],
  targetPlayers: true, texture: 'minecraft:textures/entity/zombie/husk.png',
  eggPrimary: '#665445', eggSecondary: '#b09268'
});

const components = [
  ashStalker,
  ...pair('灰烬荒原', 'ash_wastes', 'overworld', {
    temperature: 1.4, downfall: 0, featurePreset: 'sparse', spawnPreset: 'hostile', fixedTime: 18000,
    structures: ['village','mineshaft','ruined_portal'], skyColor: '#8d765f', fogColor: '#6f6256',
    waterColor: '#5e6f56', waterFogColor: '#303b2c', grassColor: '#7c7352', foliageColor: '#71694d'
  }),
  ...pair('云海群岛', 'sky_archipelago', 'floating_islands', {
    featurePreset: 'end', spawnPreset: 'end', fixedTime: 6000, createPlatform: true, spawnY: 104,
    skyColor: '#000000', fogColor: '#9d8daf', grassColor: '#827a92', foliageColor: '#777088'
  }),
  ...pair('三维寂静虚空', '3d_void', 'void', {
    featurePreset: 'empty', spawnPreset: 'empty', fixedTime: 6000, createPlatform: true,
    platformBlock: 'minecraft:obsidian', spawnY: 96, skyColor: '#000000', fogColor: '#111111'
  })
];

const project = GF.project.create({
  name: 'GameForge Worldgen Fixture', namespace: 'gameforge_worldgen_fixture', components
});
const ir = GF.pipeline.fromLegacyProject(project);
const issues = GF.pipeline.validate(ir);
if (issues.some((issue) => issue.severity === 'error')) throw new Error(`Worldgen fixture validation failed: ${JSON.stringify(issues)}`);
const output = GF.nativeForge.generate(project, {
  modId: 'gameforge_worldgen_fixture', modName: 'GameForge Worldgen Fixture',
  packageName: 'com.gameforge.worldgenfixture', version: '1.0.0', author: 'GameForge CI'
});

fs.rmSync(OUTPUT, { recursive: true, force: true });
for (const entry of output.files) {
  const destination = path.join(OUTPUT, ...entry.name.split('/'));
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, entry.encoding === 'base64' ? Buffer.from(entry.data, 'base64') : String(entry.data));
}
fs.mkdirSync(path.join(OUTPUT, 'run'), { recursive: true });
fs.writeFileSync(path.join(OUTPUT, 'run', 'eula.txt'), 'eula=true\n', 'utf8');
fs.writeFileSync(path.join(OUTPUT, 'run', 'server.properties'), 'online-mode=false\nlevel-name=worldgen-ci\ndifficulty=easy\nspawn-protection=0\nview-distance=4\nsimulation-distance=4\n', 'utf8');
console.log(`Exported ${output.files.length} worldgen Forge fixture files to ${OUTPUT}`);
