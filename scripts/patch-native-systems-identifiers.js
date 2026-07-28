'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const sourcePath = path.join(ROOT, 'dist', 'native-systems.js');
if (!fs.existsSync(sourcePath)) throw new Error('Missing dist/native-systems.js.');
let source = fs.readFileSync(sourcePath, 'utf8');

const helperAnchor = `  function javaString(value) {`;
const helper = `  function javaConstant(value, fallback = 'CONTENT') {
    const result = cleanId(value, String(fallback || 'content').toLowerCase())
      .toUpperCase()
      .replace(/[^A-Z0-9_]/g, '_');
    if (!result) return String(fallback || 'CONTENT').toUpperCase();
    return /^[0-9]/.test(result) ? \`_\${result}\` : result;
  }

`;
if (!source.includes('function javaConstant(')) {
  if (!source.includes(helperAnchor)) throw new Error('Could not find native systems Java helper insertion point.');
  source = source.replace(helperAnchor, `${helper}${helperAnchor}`);
}

const replacements = [
  ['${machine.id.toUpperCase()}', '${javaConstant(machine.id)}'],
  ['${entity.id.toUpperCase()}', '${javaConstant(entity.id)}']
];
for (const [search, replacement] of replacements) {
  const count = source.split(search).length - 1;
  if (count > 0) source = source.split(search).join(replacement);
  if (source.includes(search)) throw new Error(`Native systems Java field still uses unsafe identifier expression: ${search}`);
}

const exportAnchor = `    normalizeMobType,
    inferMobType,
    validate: validateSystems,`;
const exportReplacement = `    normalizeMobType,
    inferMobType,
    javaConstant,
    validate: validateSystems,`;
if (!source.includes('    javaConstant,\n    validate: validateSystems,')) {
  if (!source.includes(exportAnchor)) throw new Error('Could not expose javaConstant from GameForge.nativeSystems.');
  source = source.replace(exportAnchor, exportReplacement);
}

for (const marker of [
  'function javaConstant(value',
  'return /^[0-9]/.test(result) ? `_ ${result}`'.replace('_ ', '_'),
  '${javaConstant(machine.id)}',
  '${javaConstant(entity.id)}',
  '    javaConstant,\n    validate: validateSystems,'
]) {
  if (!source.includes(marker)) throw new Error(`Native systems identifier patch missing marker: ${marker}`);
}

fs.writeFileSync(sourcePath, source, 'utf8');
execFileSync(process.execPath, ['--check', sourcePath], { stdio: 'inherit' });
console.log('Patched native system Java constants so registry IDs beginning with digits compile safely.');
