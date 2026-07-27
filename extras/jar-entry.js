'use strict';

(() => {
  function installEntry() {
    if (document.getElementById('gameforge-zip-to-jar-entry')) return;

    const button = document.createElement('a');
    button.id = 'gameforge-zip-to-jar-entry';
    button.href = 'jar.html';
    button.textContent = 'ZIP → JAR';
    button.setAttribute('aria-label', '把 GameForge ZIP 转换成 Forge JAR');
    Object.assign(button.style, {
      position: 'fixed',
      right: '20px',
      bottom: '20px',
      zIndex: '9999',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '44px',
      padding: '0 18px',
      border: '1px solid rgba(138, 180, 255, 0.55)',
      borderRadius: '999px',
      background: 'rgba(23, 31, 51, 0.94)',
      color: '#f5f8ff',
      boxShadow: '0 12px 30px rgba(0, 0, 0, 0.28)',
      textDecoration: 'none',
      font: '700 14px/1 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      backdropFilter: 'blur(12px)'
    });

    button.addEventListener('mouseenter', () => {
      button.style.transform = 'translateY(-2px)';
      button.style.borderColor = 'rgba(138, 180, 255, 0.95)';
    });
    button.addEventListener('mouseleave', () => {
      button.style.transform = '';
      button.style.borderColor = 'rgba(138, 180, 255, 0.55)';
    });

    document.body.appendChild(button);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', installEntry, { once: true });
  } else {
    installEntry();
  }
})();
