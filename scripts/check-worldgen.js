'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { loadGameForge, loadSource } = require('./gameforge-test-context');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const scripts = [
  'worldgen-core.js', 'worldgen-native.js', 'worldgen-blueprint.js',
  'worldgen-entry.js', 'worldgen-page.js'
];
for (const relative of scripts) {
  const filePath = path.join(DIST, relative);
  if (!fs.existsSync(filePath)) throw new Error(`Missing worldgen build file: dist/${relative}`);
  execFileSync(process.execPath, ['--check', filePath], { stdio: 'inherit' });
}

const context = loadGameForge(DIST);
for (const relative of [
  'native-systems.js', 'native-systems-legacy-bridge.js', 'native-systems-blueprint.js',
  'worldgen-core.js', 'worldgen-native.js', 'worldgen-blueprint.js'
]) loadSource(context, path.join(DIST, relative));
const GF = context.GameForge;
if (!GF.worldgen?.__installed) throw new Error('Worldgen IR/parser extension did not install.');
if (!GF.worldgenNative?.__installed) throw new Error('Native Forge worldgen backend did not install.');
if (!GF.blueprint?.__worldgenInstalled) throw new Error('Worldgen Blueprint extension did not install.');
if (!GF.pipeline.listParsers().some((entry) => entry.id === 'worldgen-rules')) throw new Error('Worldgen parser is not registered.');
if (!GF.pipeline.listBackends().some((entry) => entry.id === 'native-forge-worldgen')) throw new Error('Worldgen backend is not registered.');

const parsedIr = GF.pipeline.parse(
  '做一个叫灰烬荒原的永夜末日废土维度，有村庄、矿井和废弃传送门',
  { namespace: 'worldgen_fixture', name: 'Worldgen Fixture' },
  'worldgen-rules'
);
if (parsedIr.components.length !== 2) throw new Error(`World prompt should create a biome and dimension, got ${parsedIr.components.length}.`);
const parsedBiome = parsedIr.components.find(GF.worldgen.isBiome);
const parsedDimension = parsedIr.components.find(GF.worldgen.isDimension);
if (!parsedBiome || !parsedDimension) throw new Error('World prompt did not create both component kinds.');
if (parsedDimension.config.terrainPreset !== 'overworld' || parsedDimension.config.fixedTime !== 18000) throw new Error('Wasteland eternal-night prompt did not preserve terrain/time.');
if (!parsedBiome.config.structures.includes('village') || !parsedBiome.config.structures.includes('mineshaft') || !parsedBiome.config.structures.includes('ruined_portal')) throw new Error('World prompt structure recognition failed.');
let issues = GF.pipeline.validate(parsedIr);
if (issues.some((issue) => issue.severity === 'error')) throw new Error(`Parsed world IR validation failed: ${JSON.stringify(issues)}`);

for (const component of [parsedBiome, parsedDimension]) {
  const graph = GF.blueprint.graphFromComponent(component);
  const graphIssues = GF.blueprint.validateGraph(graph);
  if (graphIssues.some((issue) => issue.severity === 'error')) throw new Error(`Worldgen Blueprint validation failed: ${JSON.stringify(graphIssues)}`);
  const compiled = GF.blueprint.compileGraph(graph);
  const expectedType = GF.worldgen.isBiome(component) ? 'biome' : 'dimension';
  if (compiled.system?.type !== expectedType) throw new Error(`${expectedType} Blueprint did not compile into worldgen config.`);
  const applied = GF.blueprint.applyGraphToComponent(component, graph);
  if (applied.diagnostics.some((issue) => issue.severity === 'error')) throw new Error(`${expectedType} Blueprint round trip failed.`);
  if (expectedType === 'biome' && !GF.worldgen.isBiome(applied.component)) throw new Error('Biome Blueprint lost its component type.');
  if (expectedType === 'dimension' && !GF.worldgen.isDimension(applied.component)) throw new Error('Dimension Blueprint lost its component type.');
}

function worldPair(name, id, terrain, options = {}) {
  const theme = {
    skyColor: options.skyColor || '#6688aa', fogColor: options.fogColor || '#7a8191',
    waterColor: options.waterColor || '#315a86', waterFogColor: options.waterFogColor || '#102342',
    grassColor: options.grassColor || '#65734f', foliageColor: options.foliageColor || '#59694a'
  };
  const biome = GF.worldgen.createBiomeComponent({
    name: `${name}群系`, id: `${id}_biome`, terrainPreset: terrain,
    temperature: options.temperature ?? 0.5, downfall: options.downfall ?? 0.2,
    precipitation: options.precipitation ?? false, featurePreset: options.featurePreset,
    spawnPreset: options.spawnPreset, structures: options.structures || [], ...theme
  });
  const dimension = GF.worldgen.createDimensionComponent({
    name: `${name}维度`, id, terrainPreset: terrain, biomeId: `worldgen_fixture:${id}_biome`,
    fixedTime: options.fixedTime, createPlatform: options.createPlatform,
    platformBlock: options.platformBlock || 'minecraft:stone', spawnY: options.spawnY
  });
  return [biome, dimension];
}

const components = [
  ...worldPair('灰烬荒原', 'ash_wastes', 'overworld', { featurePreset: 'sparse', spawnPreset: 'hostile', fixedTime: 18000, structures: ['village','mineshaft','ruined_portal'] }),
  ...worldPair('熔火深渊', 'molten_depths', 'nether', { featurePreset: 'nether', spawnPreset: 'nether', fixedTime: 18000, temperature: 2 }),
  ...worldPair('云海群岛', 'sky_archipelago', 'floating_islands', { featurePreset: 'end', spawnPreset: 'end', fixedTime: 6000, createPlatform: true, spawnY: 104 }),
  ...worldPair('寂静虚空', 'silent_void', 'void', { featurePreset: 'empty', spawnPreset: 'empty', fixedTime: 6000, createPlatform: true, platformBlock: 'minecraft:obsidian', spawnY: 96 })
];
const project = GF.project.create({ name: 'Worldgen Fixture', namespace: 'worldgen_fixture', components });
const ir = GF.pipeline.fromLegacyProject(project);
issues = GF.pipeline.validate(ir);
if (issues.some((issue) => issue.severity === 'error')) throw new Error(`Worldgen fixture IR validation failed: ${JSON.stringify(issues)}`);

const output = GF.nativeForge.generate(project, {
  modId: 'worldgen_fixture', modName: 'Worldgen Fixture',
  packageName: 'com.gameforge.worldgenfixture', version: '1.0.0', author: 'GameForge CI'
});
const byName = new Map(output.files.map((entry) => [entry.name, entry]));
if (byName.size !== output.files.length) throw new Error('Worldgen generator emitted duplicate file paths.');
const report = output.report.worldgen;
if (!report || report.biomes.length !== 4 || report.dimensions.length !== 4) throw new Error('Worldgen capability report counts are incorrect.');
if (!report.capabilities.customBiome || !report.capabilities.playableDimension || !report.capabilities.travelItem) throw new Error('Worldgen capability report is incomplete.');

function textEnding(suffix) {
  const entry = output.files.find((item) => item.name.endsWith(suffix));
  if (!entry || entry.encoding === 'base64') throw new Error(`Generated worldgen text file missing: ${suffix}`);
  return String(entry.data || '');
}
function jsonEnding(suffix) {
  return JSON.parse(textEnding(suffix));
}

for (const suffix of [
  '/worldgen/WorldgenBootstrap.java', '/worldgen/registry/WorldgenItems.java', '/worldgen/item/DimensionTravelItem.java',
  '/worldgen/biome/ash_wastes_biome.json', '/dimension_type/ash_wastes.json', '/dimension/ash_wastes.json',
  '/dimension/sky_archipelago.json', '/dimension/silent_void.json', 'gameforge-worldgen-report.json'
]) textEnding(suffix);

const travel = textEnding('/worldgen/item/DimensionTravelItem.java');
for (const marker of ['ResourceKey.create(Registries.DIMENSION', 'serverPlayer.teleportTo', 'safePosition', 'buildPlatform', 'getHeightmapPos']) {
  if (!travel.includes(marker)) throw new Error(`Dimension travel item missing marker: ${marker}`);
}
const items = textEnding('/worldgen/registry/WorldgenItems.java');
for (const id of ['ASH_WASTES_KEY', 'MOLTEN_DEPTHS_KEY', 'SKY_ARCHIPELAGO_KEY', 'SILENT_VOID_KEY']) {
  if (!items.includes(id)) throw new Error(`Dimension travel item registry missing: ${id}`);
}

const overworldDimension = jsonEnding('/dimension/ash_wastes.json');
if (overworldDimension.generator.type !== 'minecraft:noise' || overworldDimension.generator.settings !== 'minecraft:overworld') throw new Error('Overworld dimension generator is incorrect.');
if (overworldDimension.generator.biome_source.biome !== 'worldgen_fixture:ash_wastes_biome') throw new Error('Fixed custom biome source was not preserved.');
const netherDimension = jsonEnding('/dimension/molten_depths.json');
if (netherDimension.generator.settings !== 'minecraft:nether') throw new Error('Nether dimension preset is incorrect.');
const floatingDimension = jsonEnding('/dimension/sky_archipelago.json');
if (floatingDimension.generator.settings !== 'minecraft:floating_islands') throw new Error('Floating-islands preset is incorrect.');
const voidDimension = jsonEnding('/dimension/silent_void.json');
if (voidDimension.generator.type !== 'minecraft:flat' || voidDimension.generator.settings.layers[0].block !== 'minecraft:air') throw new Error('Void dimension flat generator is incorrect.');
const dimensionType = jsonEnding('/dimension_type/ash_wastes.json');
if (dimensionType.min_y !== -64 || dimensionType.height !== 384 || dimensionType.fixed_time !== 18000) throw new Error('Custom dimension type values are incorrect.');
const biomeJson = jsonEnding('/worldgen/biome/ash_wastes_biome.json');
if (!Array.isArray(biomeJson.features) || !biomeJson.spawners?.monster?.length || biomeJson.effects.sky_color === undefined) throw new Error('Custom biome JSON is incomplete.');
const villageTag = jsonEnding('/tags/worldgen/biome/has_structure/village_plains.json');
if (!villageTag.values.includes('worldgen_fixture:ash_wastes_biome')) throw new Error('Village biome tag did not include the custom biome.');
const irFile = JSON.parse(textEnding('gameforge-ir.json'));
if (irFile.components.filter(GF.worldgen.isDimension).length !== 4) throw new Error('Embedded IR lost worldgen components.');

const invalidProject = GF.project.create({
  name: 'Invalid World', namespace: 'invalid_world',
  components: [GF.worldgen.createDimensionComponent({ name: '坏维度', id: 'bad_dimension', terrainPreset: 'amplified', minY: 0, height: 256, logicalHeight: 256, biomeId: 'minecraft:plains' })]
});
const invalidIssues = GF.pipeline.validate(GF.pipeline.fromLegacyProject(invalidProject));
if (!invalidIssues.some((issue) => issue.code === 'worldgen.dimension.noise_height' && issue.severity === 'error')) throw new Error('Worldgen validation did not reject incompatible noise height.');

const mainPage = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');
const blueprintPage = fs.readFileSync(path.join(DIST, 'blueprint.html'), 'utf8');
const forgePage = fs.readFileSync(path.join(DIST, 'native-forge.html'), 'utf8');
const worldgenPage = fs.readFileSync(path.join(DIST, 'worldgen.html'), 'utf8');
const sw = fs.readFileSync(path.join(DIST, 'sw.js'), 'utf8');
for (const marker of ['worldgen-core.js','worldgen-native.js','worldgen-blueprint.js','worldgen-entry.js']) if (!mainPage.includes(marker)) throw new Error(`Main page is missing worldgen integration: ${marker}`);
for (const marker of ['worldgen-core.js','worldgen-native.js','worldgen-blueprint.js','blueprint-editor.js']) if (!blueprintPage.includes(marker)) throw new Error(`Blueprint page is missing worldgen integration: ${marker}`);
if (!(blueprintPage.indexOf('worldgen-blueprint.js') < blueprintPage.indexOf('blueprint-editor.js'))) throw new Error('Worldgen Blueprint extension loads after the editor.');
for (const marker of ['worldgen-core.js','worldgen-native.js','native-forge-page.js']) if (!forgePage.includes(marker)) throw new Error(`Native Forge page is missing worldgen integration: ${marker}`);
for (const marker of ['World & Dimension Studio','可进入维度','worldgen-page.js']) if (!worldgenPage.includes(marker)) throw new Error(`Worldgen studio page missing marker: ${marker}`);
for (const marker of ['worldgen.html','worldgen-core.js','worldgen-native.js']) if (!sw.includes(marker)) throw new Error(`Service worker missing worldgen asset: ${marker}`);
if (!/const CACHE_NAME = 'gameforge-lite-v2\.1\.1-[^']+';/.test(sw)) throw new Error('Service worker cache version is missing or malformed.');

console.log(`Worldgen checks passed: ${output.files.length} generated files, 4 custom biomes, 4 playable dimensions, Blueprint and travel items verified.`);
