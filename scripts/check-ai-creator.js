'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const required = ['ai-creator.html','ai-creator.css','ai-creator.js','ai-entry.js','index.html','manifest.webmanifest','sw.js'];
for (const relative of required) {
  if (!fs.existsSync(path.join(DIST, relative))) throw new Error(`Missing AI creator file: ${relative}`);
}
for (const relative of ['ai-creator.js','ai-entry.js']) execFileSync(process.execPath, ['--check', path.join(DIST, relative)], { stdio: 'inherit' });

const page = fs.readFileSync(path.join(DIST, 'ai-creator.html'), 'utf8');
for (const marker of [
  '交给 AI 深度设计',
  'AI 不能私自把功能标绿',
  '简单内容继续免费本地生成',
  'window.GameForgeAIAdapter.createPlan()',
  'aiPrompt',
  'startAiCreation',
  'applyAiPlan',
  'ai-creator.js'
]) if (!page.includes(marker)) throw new Error(`AI creator page missing marker: ${marker}`);

const source = fs.readFileSync(path.join(DIST, 'ai-creator.js'), 'utf8');
for (const marker of [
  "schema: 'gameforge.ai-creation-request'",
  "schema: 'gameforge.ai-creation-plan'",
  'GameForgeAIAdapter',
  'createPlan',
  'reviewPlan',
  'applyPlan',
  'capabilityContract',
  'projectSummary',
  'gameforge:ai-plan-ready',
  'gameforge:ai-plan-applied'
]) if (!source.includes(marker)) throw new Error(`AI adapter contract missing marker: ${marker}`);

const entry = fs.readFileSync(path.join(DIST, 'ai-entry.js'), 'utf8');
for (const marker of ['openAiCreator','使用 AI 创作','gameforge.ai.handoff.prompt','ai-creator.html']) if (!entry.includes(marker)) throw new Error(`AI homepage entry missing marker: ${marker}`);

const index = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');
if (!index.includes('ai-entry.js')) throw new Error('Homepage does not load the AI entry button.');

const sw = fs.readFileSync(path.join(DIST, 'sw.js'), 'utf8');
for (const marker of ['ai-creator.html','ai-creator.css','ai-creator.js','ai-entry.js','gameforge-lite-v2.1.1-ai-handoff-v1']) if (!sw.includes(marker)) throw new Error(`Service worker missing AI asset: ${marker}`);

const manifest = JSON.parse(fs.readFileSync(path.join(DIST, 'manifest.webmanifest'), 'utf8'));
if (!String(manifest.description || '').includes('复杂 Mod')) throw new Error('Manifest does not describe AI handoff.');

console.log('AI creation handoff checks passed: page, prompt transfer, adapter contract, local capability boundary and offline assets verified.');
