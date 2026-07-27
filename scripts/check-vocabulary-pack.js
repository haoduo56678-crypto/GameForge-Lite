'use strict';

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');
const { execFileSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const LOCAL_PATH = path.join(DIST, 'local-vocabulary.js');
const DATA_PATH = path.join(DIST, 'vocabulary-data.js');
const PACK_PATH = path.join(DIST, 'vocabulary-pack.js');

function requireFile(filePath) {
  if (!fs.existsSync(filePath)) throw new Error(`Missing vocabulary file: ${path.relative(ROOT, filePath)}`);
  return fs.readFileSync(filePath, 'utf8');
}

for (const filePath of [LOCAL_PATH, DATA_PATH, PACK_PATH]) {
  requireFile(filePath);
  execFileSync(process.execPath, ['--check', filePath], { stdio: 'inherit' });
}

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
          clearRect() {},
          fillRect() {},
          drawImage() {},
          createImageData: (width, height) => ({ data: new Uint8ClampedArray(width * height * 4) }),
          putImageData() {},
          imageSmoothingEnabled: false,
        }),
        toDataURL: () => 'data:image/png;base64,',
        click() {},
        append() {},
        appendChild() {},
        remove() {},
        setAttribute() {},
        addEventListener() {},
      }),
      body: { appendChild() {}, append() {}, classList: { add() {}, remove() {}, toggle() {} } },
      documentElement: { dataset: {}, classList: { add() {}, remove() {}, toggle() {} } },
    },
    Image: class {
      set src(value) {
        this.value = value;
        if (this.onload) this.onload();
      }
    },
    FileReader: class {},
    navigator: { userAgent: 'node' },
  };
  context.window = context;
  context.globalThis = context;
  return vm.createContext(context);
}

function load(context, filePath) {
  vm.runInContext(requireFile(filePath), context, { filename: filePath });
}

const context = createContext();
load(context, path.join(DIST, 'js/core.js'));
context.GameForge.texture.generateTextureBase64 = () => 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+MY7vWQAAAABJRU5ErkJggg==';
load(context, path.join(DIST, 'js/generators.js'));
load(context, LOCAL_PATH);
load(context, DATA_PATH);
load(context, PACK_PATH);

const GF = context.GameForge;
if (!GF?.vocabularyExpansion?.installed) throw new Error('Vocabulary expansion did not install.');
const stats = GF.vocabularyExpansion.stats || {};
const minimums = {
  baseAliases: 4000,
  effectiveAliases: 6300,
  concepts: 100,
  items: 180,
  entities: 70,
  attributes: 16,
};
for (const [key, minimum] of Object.entries(minimums)) {
  if (Number(stats[key]) < minimum) throw new Error(`Vocabulary ${key} is too small: ${stats[key]} < ${minimum}`);
}

const project = GF.project.create({ namespace: 'gf_vocab_check' });
const cases = [
  {
    prompt: '整一把叫霜月的太刀，砍到怪时冻住，攻击力二十，CD三秒',
    check(plan) {
      const component = plan.components?.[0];
      const spec = component?.spec || {};
      return component?.type === 'weapon' && component.name === '霜月' && spec.effect === 'freeze'
        && spec.trigger === 'on_hit' && spec.damage === 20 && spec.cooldown === 3;
    },
  },
  {
    prompt: '创建一个叫传送核心的物品，基础材料是末影珍珠，蓝色发光',
    check(plan) {
      const component = plan.components?.[0];
      const spec = component?.spec || {};
      return component?.type === 'item' && component.name === '传送核心'
        && spec.base === 'minecraft:ender_pearl' && spec.color === '#4ca7ff' && spec.glow === true;
    },
  },
  {
    prompt: '做一只叫沙漠猎手的尸壳，HP八十，攻击力九',
    check(plan) {
      const component = plan.components?.[0];
      const spec = component?.spec || {};
      return component?.type === 'mob' && component.name === '沙漠猎手'
        && spec.base === 'minecraft:husk' && spec.health === 80 && spec.damage === 9;
    },
  },
  {
    prompt: '给玩家夜视两百秒等级二',
    check(plan) {
      const spec = plan.components?.[0]?.spec || {};
      return plan.components?.[0]?.type === 'command' && spec.commandId === 'minecraft:night_vision'
        && spec.amount === 200 && spec.extra === 1;
    },
  },
  {
    prompt: '做一个永夜冰雪末日世界，有暴雪和地下遗迹',
    check(plan) {
      const component = plan.components?.[0];
      return component?.type === 'concept' && component.spec?.category === 'domain.world';
    },
  },
  {
    prompt: '我要一个赛博朋克维度，有霓虹城市和低重力',
    check(plan) {
      const component = plan.components?.[0];
      return component?.type === 'concept' && component.spec?.category === 'domain.dimension';
    },
  },
];

for (const testCase of cases) {
  const plan = GF.generators.parsePrompt(testCase.prompt, project);
  if (!testCase.check(plan)) {
    throw new Error(`Vocabulary parsing regression: ${testCase.prompt}\n${JSON.stringify(plan, null, 2)}`);
  }
}

console.log(`Vocabulary checks passed: ${stats.baseAliases} source aliases, ${stats.effectiveAliases} effective aliases, ${cases.length} parser cases.`);
