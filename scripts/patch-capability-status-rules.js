'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const sourcePath = path.join(ROOT, 'dist', 'capability-status.js');
if (!fs.existsSync(sourcePath)) throw new Error('Missing dist/capability-status.js.');
let source = fs.readFileSync(sourcePath, 'utf8');

const before = "['version.other', /(?:minecraft\\s*(?:1\\.(?:21|19|18|17|16)|2\\.)|mc\\s*1\\.(?:21|19|18|17|16))/i";
const after = "['version.other', /(?:(?:minecraft|mc)\\s*)?(?:1\\.(?:21|19|18|17|16)|2\\.)/i";
if (source.includes(before)) source = source.replace(before, after);
else if (!source.includes(after)) throw new Error('Could not patch plain Minecraft version detection.');

if (!source.includes(after)) throw new Error('Plain Minecraft version detection marker is missing.');
fs.writeFileSync(sourcePath, source, 'utf8');
execFileSync(process.execPath, ['--check', sourcePath], { stdio: 'inherit' });
console.log('Patched capability rules to recognize plain version requests such as Fabric 1.21.');
