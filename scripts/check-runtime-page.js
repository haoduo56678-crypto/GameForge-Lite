'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const pagePath = path.join(DIST, 'runtime.html');
const entryPath = path.join(DIST, 'jar-entry.js');

function requireFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing Runtime website file: ${path.relative(ROOT, filePath)}`);
  }
  return fs.readFileSync(filePath, 'utf8');
}

const page = requireFile(pagePath);
const entry = requireFile(entryPath);

for (const marker of [
  'GameForge Runtime GUI 0.3.0',
  'gameforge-runtime-1.20.1-0.3.0.jar',
  'runtime-v0.3.0',
  '精确高级武器',
  '真实命中目标',
  'LivingDamageEvent',
  '亡灵秒杀',
  '默认安全保护',
  '自动适配 GUI Scale',
  'Minecraft 1.20.1',
  'Forge 47.x',
  '可同时安装',
]) {
  if (!page.includes(marker)) {
    throw new Error(`runtime.html is missing marker: ${marker}`);
  }
}

for (const marker of ['runtime.html', 'jar.html', 'Runtime GUI', 'ZIP → JAR']) {
  if (!entry.includes(marker)) {
    throw new Error(`jar-entry.js is missing marker: ${marker}`);
  }
}

execFileSync(process.execPath, ['--check', entryPath], { stdio: 'inherit' });
console.log('Runtime 0.3.0 advanced-weapon website page and quick-access entry checks passed.');
