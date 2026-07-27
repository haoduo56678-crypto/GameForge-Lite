'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const FILE_PATH = path.join(ROOT, 'dist', 'local-vocabulary.js');

if (!fs.existsSync(FILE_PATH)) {
  throw new Error('Missing built local-vocabulary.js.');
}

const source = fs.readFileSync(FILE_PATH, 'utf8');
const sandbox = {
  console: { info() {}, warn() {}, error() {} },
  setInterval() { return 1; },
  clearInterval() {},
  setTimeout(callback) { if (typeof callback === 'function') callback(); return 1; },
  clearTimeout() {},
  GameForge: {
    Generators: {
      parsePrompt(text) { return text; }
    }
  }
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;

vm.runInNewContext(source, sandbox, { filename: 'local-vocabulary.js' });
const vocabulary = sandbox.GameForgeVocabulary;
if (!vocabulary) throw new Error('Vocabulary API was not installed.');
if (vocabulary.conceptCount < 380) throw new Error(`Expected at least 380 concepts, found ${vocabulary.conceptCount}.`);
if (vocabulary.aliasCount < 4500) throw new Error(`Expected at least 4500 aliases, found ${vocabulary.aliasCount}.`);

function ids(text) {
  return new Set(vocabulary.analyze(text).hits.map((hit) => hit.id));
}

function requireConcepts(text, expected) {
  const found = ids(text);
  for (const id of expected) {
    if (!found.has(id)) throw new Error(`Vocabulary failed to recognize ${id} in: ${text}`);
  }
}

requireConcepts('给我整一个永夜酸雨废土世界，每七天来一波强化尸潮', [
  'intent_create', 'domain_world', 'time_night', 'weather_acid', 'terrain_wasteland', 'event_horde'
]);
requireConcepts('create a cyberpunk dimension with low gravity, meteor storms and a ruined city', [
  'intent_create', 'domain_dimension', 'style_cyberpunk', 'environment_gravity_low', 'weather_meteor', 'terrain_city'
]);
requireConcepts('做一把右键召唤闪电、命中燃烧、冷却5秒的太刀', [
  'intent_create', 'weapon_katana', 'trigger_right_click', 'effect_lightning', 'effect_burn', 'parameter_cooldown'
]);
requireConcepts('搞个修仙RPG世界，有宗门声望、任务、商店、Boss副本', [
  'domain_world', 'style_xianxia', 'mode_rpg', 'domain_faction', 'domain_reputation', 'domain_quest', 'domain_shop', 'domain_boss'
]);
requireConcepts('做一扇会传送的门', ['intent_create', 'block_door', 'effect_teleport']);

const factionIds = ids('宗门声望');
if (factionIds.has('block_door')) throw new Error('The single-character door alias produced a false positive inside 宗门.');

const patched = sandbox.GameForge.Generators.parsePrompt('弄一个永夜世界');
if (!patched.includes('[GF_LOCAL_VOCAB')) throw new Error('Prompt parser bridge did not append local semantic context.');
if (!patched.includes('世界') || !patched.includes('夜晚')) throw new Error('Prompt parser bridge omitted expected semantic concepts.');

console.log(
  `Vocabulary checks passed: ${vocabulary.conceptCount} concepts, ` +
  `${vocabulary.aliasCount} direct aliases, ~${vocabulary.productivePhraseEstimate} composable phrases.`
);
