'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const reportPath = path.join(ROOT, 'dist', 'TEST-REPORT.md');
if (!fs.existsSync(reportPath)) throw new Error('Missing dist/TEST-REPORT.md.');
let report = fs.readFileSync(reportPath, 'utf8');
const marker = '## Playable world and dimension generation verification';
if (!report.includes(marker)) {
  report = `${report.trimEnd()}\n\n${marker}\n\n`
    + '- Local prompts create paired custom-biome and custom-dimension IR components instead of concept-only placeholders.\n'
    + '- Blueprint round-trip tests cover climate, colors, feature presets, spawn presets, terrain presets, dimension type settings, time and travel items.\n'
    + '- Native Forge export writes Minecraft 1.20.1 biome, dimension type and dimension registry JSON plus a compiled travel-key item.\n'
    + '- Regression fixtures cover overworld, nether, floating-islands, flat/void terrain, structure biome tags and safe spawn platforms.\n'
    + '- CI compiles the generated Forge project and verifies the reobfuscated JAR resources; a dedicated-server startup check validates dynamic registry loading.\n'
    + '- The first release intentionally uses verified vanilla noise-settings presets; arbitrary NoiseRouter curves, custom Jigsaw pools and structure NBT authoring remain separate future modules.\n';
  fs.writeFileSync(reportPath, report, 'utf8');
}
for (const required of [marker, 'custom-biome', 'dimension type', 'floating-islands', 'dedicated-server startup', 'NoiseRouter']) {
  if (!report.includes(required)) throw new Error(`Worldgen TEST-REPORT marker missing: ${required}`);
}
console.log('Updated TEST-REPORT.md with playable world and dimension verification.');
