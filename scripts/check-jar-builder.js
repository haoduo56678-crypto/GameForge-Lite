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

execFileSync(process.execPath, ['--check', fileNamePath], { stdio: 'inherit' });

requireMarkers(builder, 'dist/jar-builder.js', [
  'const TARGET_PACK_FORMAT = 15',
  "addText('pack.mcmeta'",
  'function validateGeneratedJar',
  'modLoader="lowcodefml"',
  '重新打开并验证 JAR'
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
  '温馨提示：建议先安装 Runtime GUI',
  '仍然下载作品',
  'gameforge.runtime.notice.installed.v1',
  'interceptProjectDownload'
]);

console.log('ZIP → JAR naming, validation, and Runtime download notice checks passed.');
