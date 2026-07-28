'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');
const { execFileSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const ADVANCED = path.join(DIST, 'advanced-weapon-mechanics.js');

function read(filePath) {
  if (!fs.existsSync(filePath)) throw new Error(`Missing advanced weapon test file: ${path.relative(ROOT, filePath)}`);
  return fs.readFileSync(filePath, 'utf8');
}

execFileSync(process.execPath, ['--check', ADVANCED], { stdio: 'inherit' });

function createContext() {
  const storage = new Map();
  const context = {
    console,
    crypto: webcrypto,
    TextEncoder,
    TextDecoder,
    Uint8Array,
    Uint8ClampedArray,
    Uint16Array,
    Uint32Array,
    ArrayBuffer,
    DataView,
    Date,
    Math,
    JSON,
    Intl,
    Map,
    Set,
    WeakMap,
    WeakSet,
    Promise,
    RegExp,
    String,
    Number,
    Boolean,
    Object,
    Array,
    Error,
    TypeError,
    setTimeout,
    clearTimeout,
    performance,
    Blob,
    URL,
    btoa: (value) => Buffer.from(value, 'binary').toString('base64'),
    atob: (value) => Buffer.from(value, 'base64').toString('binary'),
    localStorage: {
      getItem: (key) => storage.has(key) ? storage.get(key) : null,
      setItem: (key, value) => storage.set(key, String(value)),
      removeItem: (key) => storage.delete(key),
    },
    document: {
      getElementById: () => null,
      querySelectorAll: () => [],
      createElement: () => ({
        style: {},
        getContext: () => ({
          clearRect() {}, fillRect() {}, drawImage() {},
          createImageData: (width, height) => ({ data: new Uint8ClampedArray(width * height * 4) }),
          putImageData() {}, imageSmoothingEnabled: false,
        }),
        toDataURL: () => 'data:image/png;base64,',
        click() {}, append() {}, appendChild() {}, remove() {}, setAttribute() {}, addEventListener() {},
      }),
      body: { appendChild() {}, append() {}, classList: { add() {}, remove() {}, toggle() {} } },
      documentElement: { dataset: {}, classList: { add() {}, remove() {}, toggle() {} } },
    },
    Image: class { set src(value) { this.value = value; if (this.onload) this.onload(); } },
    FileReader: class {},
    navigator: { userAgent: 'node' },
  };
  context.window = context;
  context.globalThis = context;
  return vm.createContext(context);
}

function load(context, relative) {
  const filePath = path.join(DIST, relative);
  vm.runInContext(read(filePath), context, { filename: filePath });
}

const context = createContext();
load(context, 'js/core.js');
context.GameForge.texture.generateTextureBase64 = () => 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+MY7vWQAAAABJRU5ErkJggg==';
load(context, 'js/generators.js');
load(context, 'vocabulary-data.js');
load(context, 'vocabulary-pack.js');
load(context, 'core-mechanisms.js');
load(context, 'advanced-weapon-mechanics.js');

const GF = context.GameForge;
if (!GF?.generators?.__advancedWeaponMechanicsInstalled) throw new Error('Advanced weapon mechanics did not install.');

const project = GF.project.create({ namespace: 'gf_advanced_check' });
const cases = [
  {
    prompt: '做一把叫亡灵剑的剑，命中时秒杀亡灵生物，不伤害玩家',
    check(spec, component) {
      return component.name === '亡灵剑' && spec.trigger === 'on_hit' && spec.effect === 'instant_kill'
        && spec.targetGroup === 'undead' && spec.affectPlayers === false && spec.runtimeRequired === true && spec.cooldown === 0;
    },
  },
  {
    prompt: '做一把猎尸剑，对僵尸造成三倍伤害',
    check(spec) {
      return spec.effect === 'damage_multiplier' && spec.damageMultiplier === 3
        && spec.targetEntity === 'minecraft:zombie' && spec.runtimeRequired === true;
    },
  },
  {
    prompt: '做一把收割镰刀，命中敌对生物时，血量低于20%直接斩杀',
    check(spec) {
      return spec.effect === 'execute' && spec.executeThreshold === 0.2 && spec.targetGroup === 'hostile';
    },
  },
  {
    prompt: '做一把右键召唤闪电的雷霆之剑，冷却5秒',
    check(spec) {
      return spec.effect === 'lightning' && spec.trigger === 'right_click' && !spec.runtimeRequired && spec.cooldown === 5;
    },
  },
];

for (const testCase of cases) {
  const plan = GF.generators.parsePrompt(testCase.prompt, project);
  const component = plan.components?.[0];
  const spec = component?.spec || {};
  if (component?.type !== 'weapon' || !testCase.check(spec, component)) {
    throw new Error(`Advanced weapon parsing regression: ${testCase.prompt}\n${JSON.stringify(plan, null, 2)}`);
  }
}

const undeadComponent = GF.generators.parsePrompt(cases[0].prompt, project).components[0];
const generated = GF.generators.generateProject(GF.project.create({ namespace: 'gf_precise', components: [undeadComponent] }));
const paths = generated.datapack.map((entry) => entry.name);
if (!paths.some((entry) => entry.endsWith('/give.mcfunction'))) throw new Error('Advanced weapon lost its give function.');
if (paths.some((entry) => /weapon\/[^/]+\/(activate|try_activate|on_hit)\.mcfunction$/.test(entry))) {
  throw new Error('Runtime-handled weapon still contains an imprecise nearest-target hit function.');
}
const projectEntry = generated.bundle.find((entry) => entry.name === 'project.json');
const metadata = JSON.parse(projectEntry.data);
if (!metadata.components?.[0]?.spec?.runtimeRequired || metadata.components[0].spec.targetGroup !== 'undead') {
  throw new Error('Advanced weapon metadata was not preserved in project.json.');
}

console.log(`Advanced weapon checks passed: ${cases.length} parser cases and precise Runtime export validation.`);
