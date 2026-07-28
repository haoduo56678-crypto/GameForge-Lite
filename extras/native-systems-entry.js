'use strict';

(() => {
  function install() {
    if (document.getElementById('gameforge-native-systems-entry-style')) return;
    const style = document.createElement('style');
    style.id = 'gameforge-native-systems-entry-style';
    style.textContent = `
      .gf-native-system-badge{margin-left:auto;padding:3px 6px;border-radius:999px;background:rgba(119,226,172,.13);color:#8ce8b7;font-size:9px;font-weight:850}
      .gf-native-systems-card{border-color:rgba(119,226,172,.34)!important;background:linear-gradient(135deg,rgba(119,226,172,.08),rgba(128,169,255,.06))!important}
      .gf-native-systems-card>span{background:rgba(119,226,172,.15)!important;color:#8ce8b7!important}
      @media(min-width:1040px){.gf-architecture-cards{grid-template-columns:repeat(3,1fr)!important}}
    `;
    document.head.appendChild(style);

    const advanced = Array.from(document.querySelectorAll('.nav-group')).find((group) => group.querySelector('.nav-label')?.textContent.trim() === '高级');
    if (advanced && !document.getElementById('gameforge-native-systems-entry')) {
      const nativeForge = document.getElementById('gameforge-native-forge-entry');
      const link = document.createElement('a');
      link.id = 'gameforge-native-systems-entry';
      link.className = 'nav-item gf-architecture-link';
      link.href = 'native-systems.html';
      link.innerHTML = '<span>⚙</span><span>原生机器与实体</span><b class="gf-native-system-badge">5 IN 1</b>';
      if (nativeForge?.nextSibling) advanced.insertBefore(link, nativeForge.nextSibling);
      else advanced.appendChild(link);
    }

    const cards = document.getElementById('gameforge-architecture-cards');
    if (cards && !cards.querySelector('.gf-native-systems-card')) {
      const link = document.createElement('a');
      link.className = 'gf-architecture-card gf-native-systems-card';
      link.href = 'native-systems.html';
      link.innerHTML = '<span>⚙</span><div><strong>原生机器与自定义实体</strong><small>生成 GUI、网络同步、BlockEntity、新 EntityType 与基础 Goal AI。</small></div>';
      cards.appendChild(link);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
  else install();
})();
