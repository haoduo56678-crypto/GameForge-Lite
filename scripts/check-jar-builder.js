'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const builderPath = path.join(DIST, 'jar-builder.js');
const pagePath = path.join(DIST, 'jar.html');
const entryPath = path.join(DIST, 'jar-entry.js');
const fileNamePath = path.join(DIST, 'jar-filename.js');

function requireFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing built ZIP → JAR file: ${path.relative(ROOT, filePath)}`);
  }
  return fs.readFileSync(filePath, 'utf8');
}

function requireMarkers(text, fileName, markers) {
  for (const marker of markers) {
    if (!text.includes(marker)) {
      throw new Error(`${fileName} is missing required marker: ${marker}`);
    }
  }
}

const builder = requireFile(builderPath);
const page = requireFile(pagePath);
const entry = requireFile(entryPath);
const fileName = requireFile(fileNamePath);

execFileSync(process.execPath, ['--check', builderPath], { stdio: 'inherit' });
execFileSync(process.execPath, ['--check', fileNamePath], { stdio: 'inherit' });
execFileSync(process.execPath, ['--check', entryPath], { stdio: 'inherit' });

requireMarkers(builder, 'dist/jar-builder.js', [
  'const TARGET_PACK_FORMAT = 15',
  "addText('pack.mcmeta'",
  'function validateGeneratedJar',
  'modLoader="lowcodefml"',
  '重新打开并验证 JAR',
  'runtimeRequiredComponents',
  'modId="gameforge_runtime"',
  'versionRange="[1.20.1-0.3.0,)"',
  '高级命中技能缺少 GameForge Runtime 0.3.0 依赖声明',
  '普通作品不应被错误标记为必须安装 GameForge Runtime'
]);

requireMarkers(page, 'dist/jar.html', [
  '补全、检查并下载 JAR',
  'pack.mcmeta',
  'id="jarFileName"',
  'jar-filename.js?v=2.1.2-content-name',
  '亡灵剑-1.0.0-forge-1.20.1.jar'
]);

requireMarkers(fileName, 'dist/jar-filename.js', [
  'chooseJarBaseName',
  'component?.spec?.name',
  'components.length === 1',
  'sanitizeWindowsFileName',
  'forge-1.20.1.jar'
]);

requireMarkers(entry, 'dist/jar-entry.js', [
  'Runtime GUI',
  '温馨提示：建议先安装 Runtime 0.3.0',
  '精确命中高级技能需要 Runtime 0.3.0',
  '亡灵秒杀、低生命斩杀、倍率伤害、吸血和精确目标条件不会生效',
  '转换器若显示“Runtime 必需”',
  '我已经安装 Runtime 0.3.0 或更高版本',
  '先下载 Runtime 0.3.0（推荐）',
  '仍然下载作品',
  'gameforge.runtime.notice.installed.v2',
  'interceptProjectDownload'
]);
if (entry.includes('gameforge.runtime.notice.installed.v1')) {
  throw new Error('Runtime download notice still contains the old acknowledgement key.');
}

console.log('ZIP → JAR naming, conditional Runtime dependency, advanced download notice, acknowledgement migration, and validation checks passed.');
