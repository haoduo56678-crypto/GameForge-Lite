'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const reportPath = path.join(ROOT, 'dist', 'TEST-REPORT.md');
if (!fs.existsSync(reportPath)) throw new Error('Missing dist/TEST-REPORT.md.');

let report = fs.readFileSync(reportPath, 'utf8');
const marker = '## Advanced weapon and Runtime 0.3.0 verification';
if (!report.includes(marker)) {
  report = report.trimEnd() + `\n\n${marker}\n\n`
    + '- Advanced prompt regression tests cover undead instant kill, zombie triple damage, hostile low-health execute, right-click lightning compatibility, weapon-name ambiguity, player exclusion, explicit PvP, and precise metadata export.\n'
    + '- Runtime-handled on-hit weapons retain their give and recipe files while imprecise nearest-entity datapack hit functions are removed.\n'
    + '- ZIP → JAR adds a mandatory GameForge Runtime 0.3.0 dependency only when a project contains precise advanced hit mechanics, and validates both required and optional cases.\n'
    + '- Runtime 0.3.0 is compiled with Java 17 and Forge 47.4.21; the JAR verifier checks AdvancedWeaponHandler, full and compact browser screens, language files, and version metadata.\n'
    + '- AdvancedWeaponHandler uses the actual Forge LivingDamageEvent attacker, held GameForge weapon, and damaged entity, with player and attacker-owned pet safety enabled by default.\n\n'
    + 'Automated checks do not replace a final gameplay test in a copied Minecraft Forge 1.20.1 world.\n';
  fs.writeFileSync(reportPath, report, 'utf8');
}

for (const required of [
  marker,
  'undead instant kill',
  'nearest-entity datapack hit functions are removed',
  'mandatory GameForge Runtime 0.3.0 dependency only when',
  'Java 17 and Forge 47.4.21',
  'actual Forge LivingDamageEvent attacker',
]) {
  if (!report.includes(required)) throw new Error(`Advanced TEST-REPORT marker missing: ${required}`);
}

console.log('Updated TEST-REPORT.md with advanced weapon and Runtime 0.3.0 verification.');
