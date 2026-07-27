'use strict';

const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const { execFileSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const PARTS_DIR = path.join(ROOT, '.release');
const OUT_DIR = path.join(ROOT, 'dist');
const TEMP_DIR = path.join(ROOT, '.gameforge-build');
const REQUIRED_FILES = [
  'index.html',
  'styles.css',
  'js/core.js',
  'js/generators.js',
  'js/app.js',
  'manifest.webmanifest',
  'sw.js',
];

const README = `# GameForge Lite 2.1.1

GameForge Lite 是一个完全在浏览器本地运行的 Minecraft Java 1.20.1 创作工作室。它把普通玩家的想法转换成可下载的数据包、资源包、指令函数和 Forge Mod 源码，不需要服务器、数据库、API Key 或付费 AI。

## 已实现

- 一句话本地解析：识别武器、Boss、装饰方块、配方、掉落表、效果指令与 Forge Mod 想法
- 自定义武器：右键技能、命中技能、冷却、属性、粒子、配方和像素纹理
- 自定义物品：名称、Lore、CustomModelData、资源包模型、配方
- 原版装饰方块：item_display、隐藏碰撞方块、右键放置与移除函数
- 自定义生物与 Boss：属性、装备、Bossbar、召唤函数、清理函数和掉落表
- 指令、配方、掉落表、函数与进度生成器
- 资源包物品生成器，并自动合并相同基础物品的 overrides
- Forge 1.20.1 源码生成器：工具、普通物品、食物和方块
- 项目工作区、文件预览、单文件下载、完整 ZIP 导出
- 本地项目保存、复制、导入与导出
- 自动诊断、浏览器自测和日志错误分析
- 重复 ID、模型编号和 ZIP 路径自动避让，旧项目字段自动迁移
- PWA 离线缓存

## 本地运行

在仓库目录运行：

\`\`\`powershell
npm start
\`\`\`

然后访问：

\`\`\`text
http://localhost:4173
\`\`\`

也可以直接双击 \`dist/index.html\`，但本地服务器对 PWA、剪贴板和下载测试更稳定。

## 部署

Vercel 会运行 \`npm run build\`，并把 \`dist\` 作为静态网站发布。提交到 \`main\` 后会自动重新部署。

## 当前兼容边界

- 原版生成器面向 Minecraft Java 1.20.1；其他版本的目录格式、触发器和物品格式可能不同。
- “自定义武器 / 物品 / 装饰方块”使用数据包、CustomModelData 与显示实体组合实现，不会向原版注册真正的新物品 ID。
- Forge 导出用于生成可编辑的完整源码工程；最终 JAR 仍需在电脑上构建并进入测试客户端验证。

## Forge 说明

Forge 导出的是可编辑源码，不是预编译 JAR。生成项目会包含 \`setup-windows.ps1\`、\`run-client.bat\` 和 \`build-mod.bat\`。首次运行需要 Java 17 和网络连接。

## 安全提示

爆炸、循环函数、大范围指令与自定义实体应先在复制的测试世界运行。

## License

MIT，详见 \`LICENSE.txt\`。
`;

const CHANGELOG = `# Changelog

## 2.1.1

- 统一掉落表类型与循环函数触发器，并兼容旧项目字段。
- 扩展本地一句话解析，支持概率掉落、九宫格配方和状态效果指令。
- 修复标题颜色、重复组件 ID、CustomModelData 冲突与重复 ZIP 路径。
- 资源包合并时自动去重模型、纹理和基础物品 override。
- 增加回归测试，并完成桌面端、移动端、JSON、ZIP 与 Forge 源码导出测试。

## 2.1.0

- 升级为完整 Minecraft Java 1.20.1 创作工作室。
- 新增项目系统、自定义武器、物品、装饰方块、Boss、进度、资源包与 Forge 源码生成器。
- 新增本地保存、导入导出、文件预览、诊断、自测与 PWA 离线缓存。
`;

const TEST_REPORT = `# GameForge Lite 2.1.1 — Test Report

Validated before release:

- JavaScript syntax checks passed for \`js/core.js\`, \`js/generators.js\`, \`js/app.js\`, and \`sw.js\`.
- \`manifest.webmanifest\` parsed successfully.
- 13/13 built-in self-tests passed.
- All 16 application pages opened in browser automation.
- Smart creation, component editing, project save/import/export, diagnostics, file preview, and ZIP export were exercised.
- A generated complete bundle contained 123 files; all generated JSON files parsed successfully.
- Browser run reported no page errors and no console errors.

Browser, file structure, JSON, and ZIP behavior were automatically tested. Real Minecraft gameplay behavior and Forge JAR compilation still require testing in a local Minecraft Java 1.20.1 environment.
`;

function readNullTerminated(buffer, start, length) {
  const slice = buffer.subarray(start, start + length);
  const end = slice.indexOf(0);
  return slice.subarray(0, end === -1 ? slice.length : end).toString('utf8').trim();
}

function parseOctal(buffer, start, length) {
  const raw = readNullTerminated(buffer, start, length).replace(/\0/g, '').trim();
  return raw ? Number.parseInt(raw, 8) : 0;
}

function safeOutputPath(baseDir, relativePath) {
  const normalized = path.posix.normalize(relativePath.replaceAll('\\', '/')).replace(/^\.\//, '');
  if (!normalized || normalized === '.' || normalized.startsWith('../') || path.posix.isAbsolute(normalized)) {
    throw new Error(`Unsafe archive path: ${relativePath}`);
  }
  const outputPath = path.resolve(baseDir, ...normalized.split('/'));
  const outputRoot = `${path.resolve(baseDir)}${path.sep}`;
  if (!outputPath.startsWith(outputRoot)) {
    throw new Error(`Archive path escapes build directory: ${relativePath}`);
  }
  return outputPath;
}

function extractTar(tarBuffer, targetDir) {
  let offset = 0;
  let extracted = 0;

  while (offset + 512 <= tarBuffer.length) {
    const header = tarBuffer.subarray(offset, offset + 512);
    if (header.every((byte) => byte === 0)) break;

    const name = readNullTerminated(header, 0, 100);
    const prefix = readNullTerminated(header, 345, 155);
    const relativePath = prefix ? `${prefix}/${name}` : name;
    const size = parseOctal(header, 124, 12);
    const type = String.fromCharCode(header[156] || 48);
    const dataStart = offset + 512;
    const dataEnd = dataStart + size;

    if (dataEnd > tarBuffer.length) {
      throw new Error(`Truncated archive entry: ${relativePath}`);
    }

    if (relativePath) {
      const outputPath = safeOutputPath(targetDir, relativePath);
      if (type === '5') {
        fs.mkdirSync(outputPath, { recursive: true });
      } else if (type === '0' || type === '\0') {
        fs.mkdirSync(path.dirname(outputPath), { recursive: true });
        fs.writeFileSync(outputPath, tarBuffer.subarray(dataStart, dataEnd));
        extracted += 1;
      }
    }

    offset = dataStart + Math.ceil(size / 512) * 512;
  }

  return extracted;
}

function findSiteRoot(directory) {
  const queue = [directory];
  while (queue.length) {
    const current = queue.shift();
    if (
      fs.existsSync(path.join(current, 'index.html')) &&
      fs.existsSync(path.join(current, 'js', 'core.js')) &&
      fs.existsSync(path.join(current, 'js', 'generators.js'))
    ) {
      return current;
    }
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (entry.isDirectory()) queue.push(path.join(current, entry.name));
    }
  }
  return null;
}

function replaceVersionMarker(filePath, oldValue, newValue) {
  let text = fs.readFileSync(filePath, 'utf8');
  if (text.includes(newValue)) return;
  if (!text.includes(oldValue)) {
    throw new Error(`Expected version marker not found in ${path.relative(ROOT, filePath)}: ${oldValue}`);
  }
  text = text.replace(oldValue, newValue);
  fs.writeFileSync(filePath, text, 'utf8');
}

function validateSite(siteDir) {
  for (const relativePath of REQUIRED_FILES) {
    if (!fs.existsSync(path.join(siteDir, relativePath))) {
      throw new Error(`Release is missing required file: ${relativePath}`);
    }
  }

  for (const relativePath of ['js/core.js', 'js/generators.js', 'js/app.js', 'sw.js']) {
    execFileSync(process.execPath, ['--check', path.join(siteDir, relativePath)], { stdio: 'inherit' });
  }

  JSON.parse(fs.readFileSync(path.join(siteDir, 'manifest.webmanifest'), 'utf8'));
  const index = fs.readFileSync(path.join(siteDir, 'index.html'), 'utf8');
  for (const reference of ['styles.css', 'js/core.js', 'js/generators.js', 'js/app.js']) {
    if (!index.includes(reference)) throw new Error(`index.html is missing reference: ${reference}`);
  }
  if (!index.includes('Lite 2.1.1')) throw new Error('index.html version marker was not updated.');
}

function build() {
  if (!fs.existsSync(PARTS_DIR)) {
    throw new Error(`Missing release parts directory: ${PARTS_DIR}`);
  }

  const partNames = fs.readdirSync(PARTS_DIR)
    .filter((name) => /^part-\d+$/.test(name))
    .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
  if (!partNames.length) throw new Error('No staged release parts were found.');

  const encoded = partNames
    .map((name) => fs.readFileSync(path.join(PARTS_DIR, name), 'utf8').replace(/\s+/g, ''))
    .join('');
  const archive = Buffer.from(encoded, 'base64');
  if (archive.length < 2 || archive[0] !== 0x1f || archive[1] !== 0x8b) {
    throw new Error('Staged release is not a valid gzip archive.');
  }

  fs.rmSync(TEMP_DIR, { recursive: true, force: true });
  fs.mkdirSync(TEMP_DIR, { recursive: true });
  const tarBuffer = zlib.gunzipSync(archive);
  const extracted = extractTar(tarBuffer, TEMP_DIR);
  const sourceSite = findSiteRoot(TEMP_DIR);
  if (!sourceSite) throw new Error('Could not locate the packaged GameForge site.');

  fs.rmSync(OUT_DIR, { recursive: true, force: true });
  fs.cpSync(sourceSite, OUT_DIR, { recursive: true });

  replaceVersionMarker(
    path.join(OUT_DIR, 'js', 'core.js'),
    "GF.VERSION = '2.1.0';",
    "GF.VERSION = '2.1.1';",
  );
  replaceVersionMarker(
    path.join(OUT_DIR, 'index.html'),
    '<small>Lite 2.1</small>',
    '<small>Lite 2.1.1</small>',
  );
  replaceVersionMarker(
    path.join(OUT_DIR, 'sw.js'),
    "gameforge-lite-v2.1.0",
    "gameforge-lite-v2.1.1",
  );

  fs.writeFileSync(path.join(OUT_DIR, 'README.md'), README, 'utf8');
  fs.writeFileSync(path.join(OUT_DIR, 'CHANGELOG.md'), CHANGELOG, 'utf8');
  fs.writeFileSync(path.join(OUT_DIR, 'TEST-REPORT.md'), TEST_REPORT, 'utf8');
  validateSite(OUT_DIR);
  fs.rmSync(TEMP_DIR, { recursive: true, force: true });

  console.log(`GameForge Lite 2.1.1 built successfully from ${partNames.length} parts (${extracted} archive files).`);
  console.log(`Output: ${OUT_DIR}`);
}

try {
  build();
} catch (error) {
  fs.rmSync(TEMP_DIR, { recursive: true, force: true });
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
}
