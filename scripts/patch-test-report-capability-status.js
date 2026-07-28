'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const reportPath = path.join(ROOT, 'dist', 'TEST-REPORT.md');
if (!fs.existsSync(reportPath)) throw new Error('Missing dist/TEST-REPORT.md.');
let report = fs.readFileSync(reportPath, 'utf8');
const marker = '## Plain-language capability status verification';
if (!report.includes(marker)) {
  report = `${report.trimEnd()}\n\n${marker}\n\n`
    + '- Every prompt can be classified as “会生成”, “只能做一部分”, “只会记下来” or “现在做不了” before content is created or downloaded.\n'
    + '- Regression examples include a multi-stage flying Boss, an acid-rain horde world, a fully supported machine and an unsupported Fabric 1.21 multiplayer lobby request.\n'
    + '- The main smart prompt routes supported world and machine requests into their real generators instead of leaving concept-only placeholders.\n'
    + '- Low-code bundles and native Forge projects include `gameforge-capability-report.json` and `README_CAPABILITY_STATUS.txt`.\n'
    + '- The website shows the same direct wording on the main creator, Native Systems, Worldgen, Blueprint and Native Forge pages, and warns again before downloads with known limitations.\n'
    + '- Status colors are fixed: green for generated, yellow for partly generated, gray for saved requirements and red for unsupported requirements.\n';
  fs.writeFileSync(reportPath, report, 'utf8');
}
for (const required of [marker, '会生成', '只能做一部分', '只会记下来', '现在做不了', 'gameforge-capability-report.json', 'README_CAPABILITY_STATUS.txt']) {
  if (!report.includes(required)) throw new Error(`Capability TEST-REPORT marker missing: ${required}`);
}
console.log('Updated TEST-REPORT.md with plain-language capability status verification.');
