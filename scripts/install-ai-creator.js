'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');

for (const relative of ['ai-creator.html','ai-creator.css','ai-creator.js','ai-entry.js']) {
  const filePath = path.join(DIST, relative);
  if (!fs.existsSync(filePath)) throw new Error(`AI creator asset missing: dist/${relative}`);
  if (relative.endsWith('.js')) execFileSync(process.execPath, ['--check', filePath], { stdio: 'inherit' });
}

const indexPath = path.join(DIST, 'index.html');
let index = fs.readFileSync(indexPath, 'utf8');
const entryTag = '<script src="ai-entry.js" defer></script>';
if (!index.includes(entryTag)) {
  if (!index.includes('</body>')) throw new Error('index.html is missing </body> for AI entry installation.');
  index = index.replace('</body>', `  ${entryTag}\n</body>`);
}
fs.writeFileSync(indexPath, index, 'utf8');

const manifestPath = path.join(DIST, 'manifest.webmanifest');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
manifest.description = 'GameForge Lite：本地免费创建简单内容，复杂 Mod 可切换到 AI 深度设计，再由本地能力引擎检查和生成。';
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

const swPath = path.join(DIST, 'sw.js');
let sw = fs.readFileSync(swPath, 'utf8');
sw = sw.replace(/const CACHE_NAME = '[^']+';/, "const CACHE_NAME = 'gameforge-lite-v2.1.1-ai-handoff-v1';");
const assets = ['./ai-creator.html','./ai-creator.css','./ai-creator.js','./ai-entry.js'];
const start = sw.indexOf('const ASSETS = [');
const end = sw.indexOf('];', start);
if (start < 0 || end < 0) throw new Error('sw.js is missing the ASSETS array.');
const missing = assets.filter((asset) => !sw.includes(`'${asset}'`));
if (missing.length) {
  const beforeEnd = sw.slice(0, end);
  const body = sw.slice(start + 'const ASSETS = ['.length, end).trim();
  const separator = body && !body.endsWith(',') ? ',\n' : (body ? '\n' : '');
  sw = `${beforeEnd}${separator}${missing.map((asset) => `  '${asset}',`).join('\n')}\n${sw.slice(end)}`;
}
fs.writeFileSync(swPath, sw, 'utf8');
execFileSync(process.execPath, ['--check', swPath], { stdio: 'inherit' });

console.log('Installed AI creation handoff page, local-to-AI entry button and adapter contract.');
