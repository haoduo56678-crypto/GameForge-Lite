'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const sourcePath = path.join(ROOT, 'extras', 'native-forge-generator.js');

if (!fs.existsSync(sourcePath)) {
  throw new Error('Missing extras/native-forge-generator.js after architecture package extraction.');
}

let source = fs.readFileSync(sourcePath, 'utf8');
const oldImport = 'import net.minecraft.world.entity.ProjectileUtil;';
const correctImport = 'import net.minecraft.world.entity.projectile.ProjectileUtil;';

if (source.includes(oldImport)) {
  source = source.replaceAll(oldImport, correctImport);
  fs.writeFileSync(sourcePath, source, 'utf8');
}

if (!source.includes(correctImport)) {
  throw new Error('Native Forge generator is missing the Minecraft 1.20.1 ProjectileUtil import.');
}
if (source.includes(oldImport)) {
  throw new Error('Native Forge generator still contains the invalid ProjectileUtil package.');
}

console.log('Patched native Forge generator for the Minecraft 1.20.1 ProjectileUtil package.');
