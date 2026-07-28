'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const pagePath = path.join(ROOT, 'dist', 'runtime.html');
if (!fs.existsSync(pagePath)) throw new Error('Missing dist/runtime.html.');
let page = fs.readFileSync(pagePath, 'utf8');

page = page
  .replace(/<title>[\s\S]*?<\/title>/, '<title>GameForge Runtime GUI 0.3.0 · 精确高级武器与响应式内容浏览器</title>')
  .replace(/<meta name="description" content="[^"]*">/, '<meta name="description" content="下载 GameForge Runtime 0.3.0：精确处理真实命中目标、亡灵秒杀、倍率伤害与斩杀，并保留响应式 JEI 风格内容浏览器。">');

const mainStart = page.indexOf('  <main class="shell">');
const mainEnd = page.indexOf('  </main>', mainStart);
if (mainStart < 0 || mainEnd < 0) throw new Error('Could not locate runtime page main content.');

const main = `  <main class="shell">
    <div class="topbar">
      <a class="back" href="index.html">← 返回 GameForge 工作室</a>
      <span class="pill"><span class="dot"></span>Runtime 0.3.0 构建已验证</span>
    </div>

    <section class="hero">
      <div>
        <p class="eyebrow">GameForge Runtime · Precise Advanced Weapons 0.3.0</p>
        <h1><span class="gradient">让“秒杀亡灵”真正命中你砍到的那只怪。</span></h1>
        <p class="lead">Runtime 0.3.0 不再使用“附近最近实体”猜测目标，而是通过 Forge 服务端伤害事件识别真实攻击者、玩家手中的 GameForge 武器与真实受击实体。亡灵秒杀、低血量斩杀、倍率伤害、额外伤害、吸血和击退现在可以按目标条件精确执行。</p>
        <div class="actions">
          <a class="button primary" href="https://github.com/haoduo56678-crypto/GameForge-Lite/releases/download/runtime-v0.3.0/gameforge-runtime-1.20.1-0.3.0.jar">下载 Runtime 0.3.0 JAR</a>
          <a class="button secondary" href="#install">查看安装步骤</a>
        </div>
        <div class="meta">
          <span><b>✓</b> Minecraft 1.20.1</span>
          <span><b>✓</b> Forge 47.x</span>
          <span><b>✓</b> 精确真实命中目标</span>
          <span><b>✓</b> 自动适配 GUI Scale</span>
        </div>
      </div>

      <div class="preview-wrap" aria-label="GameForge Runtime 0.3.0 高级武器与紧凑界面预览">
        <div class="preview-glow"></div>
        <div class="window">
          <div class="bar"><div class="brand"><span class="logo">GF</span> GAMEFORGE RUNTIME</div><div class="version">0.3.0 · PRECISE HIT</div></div>
          <div class="runtime-body">
            <aside class="rail">
              <div class="nav active">▦ 内容浏览</div>
              <div class="nav">◆ 我的作品</div>
              <div class="nav">✓ 诊断</div>
              <div class="nav">? 帮助</div>
            </aside>
            <section class="work">
              <div class="search">搜索名称、目标、技能或作品…</div>
              <div class="categories"><span class="cat active">全部</span><span class="cat">武器</span><span class="cat">物品</span><span class="cat">方块</span><span class="cat">生物</span><span class="cat">Boss</span><span class="cat">配方</span></div>
              <div class="grid">
                <div class="item selected"><span class="item-icon">⚔</span></div><div class="item"><span class="item-icon">⚡</span></div><div class="item"><span class="item-icon">◆</span></div><div class="item"><span class="item-icon">☠</span></div><div class="item"><span class="item-icon">▣</span></div><div class="item"><span class="item-icon">★</span></div><div class="item"><span class="item-icon">🍎</span></div><div class="item"><span class="item-icon">◇</span></div>
              </div>
              <div class="selected-bar">
                <div class="selected-info"><strong>亡灵剑 · 一击必杀</strong><span>目标：亡灵生物 · 玩家安全：开启</span></div>
                <div class="quick-actions"><span class="quick primary">获取</span><span class="quick good">配方</span><span class="quick">详情</span></div>
              </div>
            </section>
          </div>
          <div class="footerbar"><span>真实受击目标 · 不再误杀附近实体</span><span>GF 0.3.0</span></div>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="heading"><h2>0.3.0 补齐高级武器的整条链路</h2><p>从一句话解析、project.json 元数据、ZIP → JAR 依赖声明，到 Forge 服务端实际命中事件和游戏内 GUI，全部使用同一套标准机制。</p></div>
      <div class="features">
        <article class="feature"><div class="icon">◎</div><h3>真实命中目标</h3><p>精确使用 Forge LivingDamageEvent 中的攻击者与受击者，不再通过距离选择“附近最近的怪物”。</p></article>
        <article class="feature"><div class="icon">☠</div><h3>亡灵与目标分类</h3><p>支持亡灵、敌对、水生、节肢、灾厄村民、动物、Boss、玩家和具体实体。</p></article>
        <article class="feature"><div class="icon">⚔</div><h3>高级命中效果</h3><p>支持一击必杀、低生命斩杀、倍率伤害、额外伤害、吸血、击退和多种状态效果。</p></article>
        <article class="feature"><div class="icon">🛡</div><h3>默认安全保护</h3><p>默认不对玩家和攻击者自己的驯服宠物触发高风险能力，只有提示词明确要求时才开放。</p></article>
        <article class="feature"><div class="icon">↔</div><h3>响应式 GUI 保留</h3><p>高 GUI Scale 自动使用紧凑图标网格、底部操作条与独立详情／配方页面。</p></article>
        <article class="feature"><div class="icon">✓</div><h3>自动依赖检查</h3><p>含精确命中技能的作品 JAR 会声明 Runtime 0.3.0 依赖；普通作品不会被错误强制依赖。</p></article>
      </div>
    </section>

    <section class="section" id="install">
      <div class="install">
        <div>
          <div class="heading"><h2>替换旧 Runtime，再重新生成作品</h2><p>已经生成的旧亡灵剑 JAR 没有高级技能元数据，安装新版 Runtime 后也不会自动变成新武器。</p></div>
          <div class="steps">
            <div class="step">完全关闭 Minecraft，并删除旧的 <code>gameforge-runtime-1.20.1-0.2.1.jar</code>。</div>
            <div class="step">放入 <code>gameforge-runtime-1.20.1-0.3.0.jar</code>；Runtime 只保留一个版本。</div>
            <div class="step">刷新网站，重新输入“做一把亡灵剑，命中时秒杀亡灵生物，不伤害玩家”，再下载作品 ZIP。</div>
            <div class="step">重新转换 JAR，删除旧亡灵剑 JAR，只保留新版本后启动游戏。</div>
          </div>
        </div>
        <div class="compat">
          <div class="heading"><h2>兼容与依赖</h2><p>精确命中技能由 Runtime 处理；普通右键技能和普通作品仍可继续使用原数据包机制。</p></div>
          <div class="rows">
            <div class="row"><span>Minecraft Java</span><b>1.20.1</b></div>
            <div class="row"><span>Mod Loader</span><b>Forge 47.x</b></div>
            <div class="row"><span>Java</span><b>17 或更高</b></div>
            <div class="row"><span>高级命中技能</span><b>Runtime 0.3.0+</b></div>
            <div class="row"><span>JEI</span><b>可同时安装</b></div>
            <div class="row"><span>多人游戏</span><b>客户端 + 服务端同版本</b></div>
          </div>
          <div class="notice">多人服务器中，客户端与服务端必须安装相同版本的 Runtime 和作品 JAR。秒杀、斩杀等能力默认不会作用于玩家或攻击者自己的驯服宠物；明确启用 PvP 前请先在复制世界测试。</div>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="download">
        <h2>下载 GameForge Runtime 0.3.0</h2>
        <p>源码使用 Java 17 与 Forge 47.4.21 编译。自动检查覆盖精确命中处理器、目标分类、安全限制、响应式内容浏览器、语言文件和 JAR 结构。</p>
        <a class="button primary" href="https://github.com/haoduo56678-crypto/GameForge-Lite/releases/download/runtime-v0.3.0/gameforge-runtime-1.20.1-0.3.0.jar">下载 GameForge Runtime 0.3.0</a>
        <div class="verified">Advanced Weapons Runtime · Minecraft Java 1.20.1 · Forge 47.x · Java 17</div>
      </div>
    </section>

    <footer>GameForge Runtime 0.3.0 · MIT License · 与 GameForge Lite 2.1.1 配套</footer>
  </main>`;

page = page.slice(0, mainStart) + main + page.slice(mainEnd + '  </main>'.length);

for (const marker of [
  'Runtime 0.3.0 构建已验证',
  'gameforge-runtime-1.20.1-0.3.0.jar',
  'runtime-v0.3.0',
  '真实命中目标',
  'LivingDamageEvent',
  '默认安全保护',
]) {
  if (!page.includes(marker)) throw new Error(`Runtime 0.3.0 page is missing marker: ${marker}`);
}

fs.writeFileSync(pagePath, page, 'utf8');
console.log('Patched Runtime website page for precise advanced weapons 0.3.0.');
