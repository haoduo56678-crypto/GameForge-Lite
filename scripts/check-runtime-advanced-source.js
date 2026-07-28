'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const handlerPath = path.join(ROOT, 'runtime', 'src', 'main', 'java', 'ai', 'gameforge', 'runtime', 'AdvancedWeaponHandler.java');
const propertiesPath = path.join(ROOT, 'runtime', 'gradle.properties');
const workflowPath = path.join(ROOT, '.github', 'workflows', 'runtime-build.yml');

function read(filePath) {
  if (!fs.existsSync(filePath)) throw new Error(`Missing Runtime advanced-weapon file: ${path.relative(ROOT, filePath)}`);
  return fs.readFileSync(filePath, 'utf8');
}

const source = read(handlerPath);
const properties = read(propertiesPath);
const workflow = read(workflowPath);

for (const marker of [
  'LivingDamageEvent',
  'event.getEntity()',
  'event.getSource().getEntity() instanceof ServerPlayer attacker',
  'attacker.getMainHandItem()',
  'net.minecraft.world.entity.TamableAnimal',
  'MobType.UNDEAD',
  'target instanceof Enemy',
  'runtimeRequired',
  'instant_kill',
  'execute',
  'damage_multiplier',
  'affectPlayers',
  'affectTamed',
  'setVisualOnly(true)',
  'message.gameforge_runtime.weapon_triggered',
]) {
  if (!source.includes(marker)) throw new Error(`AdvancedWeaponHandler.java is missing marker: ${marker}`);
}

for (const forbidden of [
  'it is null',
  'getZh',
  '@e[sort=nearest',
  'net.minecraft.world.entity.animal.TamableAnimal',
]) {
  if (source.includes(forbidden)) throw new Error(`AdvancedWeaponHandler.java contains forbidden marker: ${forbidden}`);
}

if (!/mod_version=1\.20\.1-0\.3\.0\b/.test(properties)) {
  throw new Error('runtime/gradle.properties is not set to Runtime 0.3.0.');
}
for (const marker of [
  "gameforge-runtime-1.20.1-0.3.0.jar",
  'AdvancedWeaponHandler.class',
  'runtime-v0.3.0',
]) {
  if (!workflow.includes(marker)) throw new Error(`Runtime build workflow is missing marker: ${marker}`);
}

console.log('Runtime 0.3.0 precise advanced-weapon source checks passed.');
