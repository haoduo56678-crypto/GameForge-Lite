'use strict';

(() => {
  function install() {
    if (document.getElementById('gameforge-worldgen-entry-style')) return;
    const style = document.createElement('style');
    style.id = 'gameforge-worldgen-entry-style';
    style.textContent = `
      .gf-worldgen-badge{margin-left:auto;padding:3px 6px;border-radius:999px;background:rgba(104,192,255,.14);color:#8ed3ff;font-size:9px;font-weight:850}
      .gf-worldgen-card{border-color:rgba(104,192,255,.38)!important;background:linear-gradient(135deg,rgba(74,155,236,.11),rgba(82,221,187,.06))!important}
      .gf-worldgen-card>span{background:rgba(104,192,255,.15)!important;color:#8ed3ff!important}
      @media(min-width:1280px){.gf-architecture-cards{grid-template-columns:repeat(4,1fr)!important}}
    `;
    document.head.appendChild(style);

    const advanced = Array.from(document.querySelectorAll('.nav-group')).find((group) => group.querySelector('.nav-label')?.textContent.trim() === '高级');
    if (advanced && !document.getElementById('gameforge-worldgen-entry')) {
      const nativeSystems = document.getElementById('gameforge-native-systems-entry');
      const link = document.createElement('a');
      link.id = 'gameforge-worldgen-entry';
      link.className = 'nav-item gf-architecture-link';
      link.href = 'worldgen.html';
      link.innerHTML = '<span>🌍</span><span>世界与维度</span><b class="gf-worldgen-badge">PLAYABLE</b>';
      if (nativeSystems?.nextSibling) advanced.insertBefore(link, nativeSystems.nextSibling);
      else advanced.appendChild(link);
    }

    const cards = document.getElementById('gameforge-architecture-cards');
    if (cards && !cards.querySelector('.gf-worldgen-card')) {
      const link = document.createElement('a');
      link.className = 'gf-architecture-card gf-worldgen-card';
      link.href = 'worldgen.html';
      link.innerHTML = '<span>🌍</span><div><strong>世界与维度生成</strong><small>创建自定义群系、可进入维度、浮空岛、虚空世界、结构标签和维度钥匙。</small></div>';
      cards.appendChild(link);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
  else install();
})();
