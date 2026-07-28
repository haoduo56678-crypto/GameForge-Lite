'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const sourcePath = path.join(ROOT, 'dist', 'native-systems.js');
if (!fs.existsSync(sourcePath)) throw new Error('Missing dist/native-systems.js.');
let source = fs.readFileSync(sourcePath, 'utf8');

function replaceOnce(search, replacement, label) {
  const count = source.split(search).length - 1;
  if (count === 0) {
    if (source.includes(replacement)) return;
    throw new Error(`Native systems prompt patch could not find ${label}.`);
  }
  if (count !== 1) throw new Error(`Native systems prompt patch found ${count} copies of ${label}.`);
  source = source.replace(search, replacement);
}

replaceOnce(
  "    if (match) return match[1].replace(/(?:的)?(?:机器|機器|生物|怪物|实体|實體)$/i, '').trim() || fallback;",
  "    if (match) return match[1].replace(/(?:的)?(?:自定义|自定義)?[^，,。.;；]{0,10}?(?:机器|機器|生物|怪物|实体|實體)$/i, '').trim() || fallback;",
  'named native-system suffix cleanup'
);

replaceOnce(
  "    const entity = /(?:自定义生物|自定義生物|自定义怪物|自定義怪物|新生物|新怪物|实体|實體|custom\\s+(?:mob|entity)|monster)/i.test(text);",
  "    const entity = /(?:自定义[^，,。.;；]{0,12}(?:生物|怪物|实体)|自定義[^，,。.;；]{0,12}(?:生物|怪物|實體)|新生物|新怪物|实体|實體|custom\\s+(?:mob|entity)|monster)/i.test(text);",
  'custom entity prompt recognition'
);

for (const marker of [
  '自定义[^，,。.;；]{0,12}(?:生物|怪物|实体)',
  '(?:自定义|自定義)?[^，,。.;；]{0,10}?(?:机器|機器|生物|怪物|实体|實體)',
]) {
  if (!source.includes(marker)) throw new Error(`Native systems prompt patch missing marker: ${marker}`);
}

fs.writeFileSync(sourcePath, source, 'utf8');
execFileSync(process.execPath, ['--check', sourcePath], { stdio: 'inherit' });
console.log('Expanded native-system prompt recognition for described custom mob types and cleaned generated names.');
