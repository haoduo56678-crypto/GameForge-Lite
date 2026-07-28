'use strict';

const path = require('node:path');
const { loadGameForge, loadSource } = require('./gameforge-test-context');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const context = loadGameForge(DIST);
for (const relative of ['native-systems.js','native-systems-legacy-bridge.js','native-systems-blueprint.js']) loadSource(context, path.join(DIST, relative));
const GF = context.GameForge;

const inferred = GF.nativeSystems.parsePrompt('做一个叫亡灵守卫的自定义怪物，生命40，攻击7，近战攻击玩家');
if (inferred.spec.mobType !== 'undead') throw new Error(`Prompt MobType inference failed: ${inferred.spec.mobType}`);
const spider = GF.nativeSystems.parsePrompt('做一个叫洞穴猎手的自定义蜘蛛怪物，生命24，攻击5');
if (spider.spec.mobType !== 'arthropod') throw new Error(`Arthropod MobType inference failed: ${spider.spec.mobType}`);

let entity = GF.nativeSystems.createEntityComponent({
  name: '亡灵守卫', id: 'undead_guard', mobType: 'undead', health: 40, damage: 7,
  goals: ['float','melee_attack','hurt_by_target','nearest_player'], targetPlayers: true
});
const graph = GF.blueprint.graphFromComponent(entity);
const attributeNode = graph.nodes.find((node) => node.type === 'action.entity_attributes');
if (!attributeNode || attributeNode.properties.mobType !== 'undead') throw new Error('Entity Blueprint did not expose MobType.');
const applied = GF.blueprint.applyGraphToComponent(entity, graph);
if (applied.diagnostics.some((issue) => issue.severity === 'error') || applied.component.spec.mobType !== 'undead') {
  throw new Error(`Entity MobType Blueprint round trip failed: ${JSON.stringify(applied.diagnostics)}`);
}
entity = applied.component;

const project = GF.project.create({ name: 'Classification Fixture', namespace: 'classification_fixture', components: [entity] });
const output = GF.nativeForge.generate(project, {
  modId: 'classification_fixture', modName: 'Classification Fixture',
  packageName: 'com.gameforge.classificationfixture', version: '1.0.0', author: 'GameForge CI'
});
const read = (suffix) => {
  const entry = output.files.find((item) => item.name.endsWith(suffix));
  if (!entry || entry.encoding === 'base64') throw new Error(`Generated classification file missing: ${suffix}`);
  return String(entry.data || '');
};
const definition = read('/EntityDefinition.java');
const definitions = read('/EntityDefinitions.java');
const mob = read('/GameForgeCustomMob.java');
for (const marker of ['String mobType']) if (!definition.includes(marker)) throw new Error(`EntityDefinition missing: ${marker}`);
if (!definitions.includes('"undead"')) throw new Error('EntityDefinitions did not preserve the undead classification.');
for (const marker of ['MobType getMobType()', 'case "undead" -> MobType.UNDEAD', 'case "arthropod" -> MobType.ARTHROPOD', 'case "illager" -> MobType.ILLAGER', 'case "water" -> MobType.WATER']) {
  if (!mob.includes(marker)) throw new Error(`Generated custom entity classification missing: ${marker}`);
}
const report = output.report.nativeSystems;
if (report?.entities?.[0]?.mobType !== 'undead') throw new Error('Native systems report did not preserve MobType.');
console.log('Custom EntityType MobType prompt, Blueprint, IR, Java and report checks passed.');
