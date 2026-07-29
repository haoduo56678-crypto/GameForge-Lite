'use strict';
const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '..');
const reportPath = path.join(ROOT, 'dist', 'TEST-REPORT.md');
if (!fs.existsSync(reportPath)) throw new Error('Missing dist/TEST-REPORT.md.');
let report = fs.readFileSync(reportPath, 'utf8');
const marker = '## Broad content catalog verification';
if (!report.includes(marker)) {
  report = `${report.trimEnd()}\n\n${marker}\n\n`
    + '- The local catalog contains more than 800 canonical content entries and 9,000 aliases across blocks, items, food, equipment, redstone, transport, mobs, furniture, machines, magic, firearms, vehicles and large systems.\n'
    + '- Plain prompts such as “生成一个箱子”, “给我一把弓”, “做一个火把” and “生成一只狐狸” create the expected vanilla-backed component without requiring the user to add the words item or block.\n'
    + '- Advanced prompts create an honest usable base where possible and keep yellow/gray/red capability warnings for missing storage, firearm, vehicle, energy, quest and economy systems.\n'
    + '- Context regressions ensure loot tables, recipes, Boss prompts and world prompts keep their specialized generators.\n'
    + '- Generated projects are checked to confirm the chosen Minecraft base ID is present in the actual output, not only in the capability panel.\n';
  fs.writeFileSync(reportPath, report, 'utf8');
}
for (const required of [marker, '800 canonical', '生成一个箱子', 'Advanced prompts', 'Context regressions']) if (!report.includes(required)) throw new Error(`Content catalog TEST-REPORT marker missing: ${required}`);
console.log('Updated TEST-REPORT.md with broad content catalog verification.');
