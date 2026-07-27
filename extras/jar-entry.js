'use strict';

(() => {
  const entries = [
    {
      id: 'gameforge-runtime-entry',
      href: 'runtime.html',
      label: 'Runtime GUI',
      aria: '下载 GameForge 游戏内 Runtime GUI',
      primary: true,
    },
    {
      id: 'gameforge-zip-to-jar-entry',
      href: 'jar.html',
      label: 'ZIP → JAR',
      aria: '把 GameForge ZIP 转换成 Forge JAR',
      primary: false,
    },
  ];

  function makeEntry(entry, index) {
    if (document.getElementById(entry.id)) return;

    const link = document.createElement('a');
    link.id = entry.id;
    link.href = entry.href;
    link.textContent = entry.label;
    link.setAttribute('aria-label', entry.aria);

    Object.assign(link.style, {
      position: 'fixed',
      right: '20px',
      bottom: `${20 + index * 54}px`,
      zIndex: '9999',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '44px',
      minWidth: '116px',
      padding: '0 17px',
      border: entry.primary
        ? '1px solid rgba(154, 183, 255, 0.9)'
        : '1px solid rgba(138, 180, 255, 0.45)',
      borderRadius: '999px',
      background: entry.primary
        ? 'linear-gradient(135deg, rgba(128, 169, 255, 0.98), rgba(176, 153, 255, 0.98))'
        : 'rgba(23, 31, 51, 0.94)',
      color: entry.primary ? '#07101f' : '#f5f8ff',
      boxShadow: entry.primary
        ? '0 14px 34px rgba(78, 112, 221, 0.32)'
        : '0 12px 30px rgba(0, 0, 0, 0.28)',
      textDecoration: 'none',
      font: '800 14px/1 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      backdropFilter: 'blur(12px)',
      transition: 'transform 160ms ease, border-color 160ms ease, filter 160ms ease',
    });

    link.addEventListener('mouseenter', () => {
      link.style.transform = 'translateY(-2px)';
      link.style.filter = 'brightness(1.08)';
      link.style.borderColor = 'rgba(170, 197, 255, 1)';
    });
    link.addEventListener('mouseleave', () => {
      link.style.transform = '';
      link.style.filter = '';
      link.style.borderColor = entry.primary
        ? 'rgba(154, 183, 255, 0.9)'
        : 'rgba(138, 180, 255, 0.45)';
    });

    document.body.appendChild(link);
  }

  function installEntries() {
    entries.forEach(makeEntry);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', installEntries, { once: true });
  } else {
    installEntries();
  }
})();
