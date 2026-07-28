'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const entryPath = path.join(ROOT, 'dist', 'jar-entry.js');
if (!fs.existsSync(entryPath)) throw new Error('Missing dist/jar-entry.js.');
let source = fs.readFileSync(entryPath, 'utf8');

function replaceOnce(search, replacement, label) {
  const first = source.indexOf(search);
  if (first < 0) throw new Error(`Runtime notice 0.3.0 patch could not find ${label}.`);
  if (source.indexOf(search, first + search.length) >= 0) throw new Error(`Runtime notice 0.3.0 patch found duplicate ${label}.`);
  source = source.replace(search, replacement);
}

if (!source.includes('精确命中高级技能需要 Runtime 0.3.0')) {
  replaceOnce(
    '温馨提示：建议先安装 Runtime GUI',
    '温馨提示：建议先安装 Runtime 0.3.0',
    'dialog title'
  );
  replaceOnce(
    '它是 GameForge 网站与游戏内作品之间的统一操作面板，安装一次即可管理多个作品。',
    '它既是统一作品控制台，也是亡灵秒杀、斩杀和倍率伤害等精确命中技能的服务端运行层。',
    'dialog subtitle'
  );
  replaceOnce(
    '<p class="gf-runtime-notice-summary"><strong>不安装 Runtime，作品核心内容通常仍能加载，</strong>但可能出现以下情况：</p>',
    '<p class="gf-runtime-notice-summary"><strong>普通低代码内容通常仍能加载；但精确命中高级技能需要 Runtime 0.3.0。</strong>不安装或版本过旧时可能出现以下情况：</p>',
    'dialog summary'
  );
  replaceOnce(
    '<li>多人游戏时，客户端与服务端需要安装相同版本的 Runtime，GUI 操作才能正常同步。</li>',
    '<li><strong>亡灵秒杀、低生命斩杀、倍率伤害、吸血和精确目标条件不会生效</strong>，因为这些能力必须由 Runtime 0.3.0 识别真实攻击者与真实受击实体。</li>\n            <li>多人游戏时，客户端与服务端需要安装相同版本的 Runtime 和作品 JAR，GUI 与精确命中技能才能正常同步。</li>',
    'advanced mechanics warning'
  );
  replaceOnce(
    '<div class="gf-runtime-notice-good"><strong>推荐做法：</strong>先安装 GameForge Runtime GUI，再下载作品 JAR。以后新增作品不需要重复安装 Runtime。</div>',
    '<div class="gf-runtime-notice-good"><strong>推荐做法：</strong>先安装 GameForge Runtime 0.3.0，再下载作品 JAR。转换器若显示“Runtime 必需”，客户端与服务端都必须安装；以后新增作品不需要重复安装 Runtime。</div>',
    'recommended action'
  );
  replaceOnce(
    '<p class="gf-runtime-notice-honest">Runtime 是推荐配套组件，不是对所有低代码作品的强制依赖；选择继续下载不会损坏作品文件。</p>',
    '<p class="gf-runtime-notice-honest">Runtime 对普通作品仍是推荐组件；但转换器标记为“Runtime 必需”的高级命中作品必须安装 0.3.0 或更高版本。选择继续下载不会损坏文件，只是对应高级技能在未安装时无法运行。</p>',
    'honest compatibility note'
  );
  replaceOnce(
    '先下载 Runtime GUI（推荐）',
    '先下载 Runtime 0.3.0（推荐）',
    'primary button'
  );
}

for (const marker of [
  '温馨提示：建议先安装 Runtime 0.3.0',
  '精确命中高级技能需要 Runtime 0.3.0',
  '亡灵秒杀、低生命斩杀、倍率伤害、吸血和精确目标条件不会生效',
  '转换器若显示“Runtime 必需”',
  '先下载 Runtime 0.3.0（推荐）',
]) {
  if (!source.includes(marker)) throw new Error(`Runtime notice 0.3.0 marker missing: ${marker}`);
}

fs.writeFileSync(entryPath, source, 'utf8');
execFileSync(process.execPath, ['--check', entryPath], { stdio: 'inherit' });
console.log('Updated project-download notice for Runtime 0.3.0 advanced mechanics.');
