'use strict';

(() => {
  const NOTICE_ID = 'gameforge-runtime-download-notice';
  const STYLE_ID = 'gameforge-runtime-download-notice-style';
  const SKIP_KEY = 'gameforge.runtime.notice.installed.v1';
  const bypassOnce = new WeakSet();
  let pendingDownloadTrigger = null;
  let previousBodyOverflow = '';
  let lastFocusedElement = null;

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

  function installNoticeStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${NOTICE_ID}[hidden] { display: none !important; }
      #${NOTICE_ID} {
        position: fixed;
        inset: 0;
        z-index: 20000;
        display: grid;
        place-items: center;
        padding: 20px;
        background: rgba(3, 7, 16, 0.78);
        backdrop-filter: blur(10px);
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      #${NOTICE_ID} .gf-runtime-notice-card {
        width: min(620px, 100%);
        max-height: min(760px, calc(100vh - 40px));
        overflow: auto;
        border: 1px solid rgba(151, 183, 245, 0.28);
        border-radius: 24px;
        color: #eef4ff;
        background:
          radial-gradient(circle at 15% 0%, rgba(84, 117, 225, 0.2), transparent 26rem),
          radial-gradient(circle at 92% 8%, rgba(140, 125, 255, 0.18), transparent 24rem),
          #111829;
        box-shadow: 0 34px 100px rgba(0, 0, 0, 0.58);
      }
      #${NOTICE_ID} .gf-runtime-notice-header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 20px;
        padding: 24px 24px 18px;
        border-bottom: 1px solid rgba(147, 178, 238, 0.18);
      }
      #${NOTICE_ID} .gf-runtime-notice-heading {
        display: flex;
        gap: 15px;
        align-items: flex-start;
      }
      #${NOTICE_ID} .gf-runtime-notice-icon {
        display: grid;
        flex: 0 0 auto;
        place-items: center;
        width: 44px;
        height: 44px;
        border-radius: 13px;
        color: #07101f;
        background: linear-gradient(135deg, #80a9ff, #b099ff);
        box-shadow: 0 10px 28px rgba(78, 112, 221, 0.28);
        font-size: 22px;
        font-weight: 900;
      }
      #${NOTICE_ID} h2 {
        margin: 1px 0 7px;
        font-size: clamp(22px, 4vw, 28px);
        line-height: 1.15;
        letter-spacing: -0.025em;
      }
      #${NOTICE_ID} .gf-runtime-notice-subtitle {
        margin: 0;
        color: #9facbf;
        font-size: 14px;
        line-height: 1.65;
      }
      #${NOTICE_ID} .gf-runtime-notice-close {
        display: grid;
        flex: 0 0 auto;
        place-items: center;
        width: 36px;
        height: 36px;
        border: 1px solid rgba(147, 178, 238, 0.2);
        border-radius: 10px;
        color: #aebbd0;
        background: rgba(255, 255, 255, 0.035);
        cursor: pointer;
        font: 700 20px/1 inherit;
      }
      #${NOTICE_ID} .gf-runtime-notice-close:hover {
        color: #eef4ff;
        border-color: rgba(147, 178, 238, 0.5);
      }
      #${NOTICE_ID} .gf-runtime-notice-body { padding: 22px 24px 24px; }
      #${NOTICE_ID} .gf-runtime-notice-summary {
        margin: 0 0 16px;
        color: #dce7fa;
        line-height: 1.72;
      }
      #${NOTICE_ID} .gf-runtime-notice-list {
        display: grid;
        gap: 9px;
        margin: 0;
        padding: 0;
        list-style: none;
      }
      #${NOTICE_ID} .gf-runtime-notice-list li {
        position: relative;
        padding: 11px 13px 11px 38px;
        border: 1px solid rgba(147, 178, 238, 0.14);
        border-radius: 12px;
        color: #aebbd0;
        background: rgba(255, 255, 255, 0.025);
        font-size: 14px;
        line-height: 1.55;
      }
      #${NOTICE_ID} .gf-runtime-notice-list li::before {
        content: '!';
        position: absolute;
        left: 13px;
        top: 12px;
        display: grid;
        place-items: center;
        width: 17px;
        height: 17px;
        border-radius: 50%;
        color: #211b0d;
        background: #ffd28d;
        font-size: 11px;
        font-weight: 900;
      }
      #${NOTICE_ID} .gf-runtime-notice-good {
        margin-top: 15px;
        padding: 13px 14px;
        border: 1px solid rgba(119, 226, 172, 0.25);
        border-radius: 12px;
        color: #bdeed4;
        background: rgba(119, 226, 172, 0.065);
        font-size: 14px;
        line-height: 1.6;
      }
      #${NOTICE_ID} .gf-runtime-notice-honest {
        margin: 13px 0 0;
        color: #8394ad;
        font-size: 12px;
        line-height: 1.55;
      }
      #${NOTICE_ID} .gf-runtime-notice-remember {
        display: flex;
        align-items: center;
        gap: 9px;
        margin-top: 18px;
        color: #aebbd0;
        font-size: 13px;
        cursor: pointer;
        user-select: none;
      }
      #${NOTICE_ID} .gf-runtime-notice-remember input {
        width: 16px;
        height: 16px;
        accent-color: #80a9ff;
      }
      #${NOTICE_ID} .gf-runtime-notice-actions {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 11px;
        margin-top: 20px;
      }
      #${NOTICE_ID} .gf-runtime-notice-button {
        display: inline-flex;
        min-height: 50px;
        align-items: center;
        justify-content: center;
        padding: 0 16px;
        border-radius: 14px;
        text-align: center;
        text-decoration: none;
        cursor: pointer;
        font: 850 14px/1.25 Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        transition: transform 150ms ease, filter 150ms ease, border-color 150ms ease;
      }
      #${NOTICE_ID} .gf-runtime-notice-button:hover { transform: translateY(-2px); filter: brightness(1.06); }
      #${NOTICE_ID} .gf-runtime-notice-primary {
        border: 0;
        color: #07101f;
        background: linear-gradient(135deg, #80a9ff, #b099ff);
        box-shadow: 0 13px 30px rgba(78, 112, 221, 0.25);
      }
      #${NOTICE_ID} .gf-runtime-notice-secondary {
        border: 1px solid rgba(147, 178, 238, 0.25);
        color: #eef4ff;
        background: rgba(255, 255, 255, 0.035);
      }
      @media (max-width: 580px) {
        #${NOTICE_ID} { padding: 10px; }
        #${NOTICE_ID} .gf-runtime-notice-header { padding: 19px 17px 15px; }
        #${NOTICE_ID} .gf-runtime-notice-body { padding: 17px; }
        #${NOTICE_ID} .gf-runtime-notice-actions { grid-template-columns: 1fr; }
        #${NOTICE_ID} .gf-runtime-notice-icon { width: 38px; height: 38px; }
      }
    `;
    document.head.appendChild(style);
  }

  function createNotice() {
    if (document.getElementById(NOTICE_ID)) return document.getElementById(NOTICE_ID);

    const overlay = document.createElement('div');
    overlay.id = NOTICE_ID;
    overlay.hidden = true;
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', `${NOTICE_ID}-title`);
    overlay.innerHTML = `
      <section class="gf-runtime-notice-card" tabindex="-1">
        <header class="gf-runtime-notice-header">
          <div class="gf-runtime-notice-heading">
            <span class="gf-runtime-notice-icon" aria-hidden="true">i</span>
            <div>
              <h2 id="${NOTICE_ID}-title">温馨提示：建议先安装 Runtime GUI</h2>
              <p class="gf-runtime-notice-subtitle">它是 GameForge 网站与游戏内作品之间的统一操作面板，安装一次即可管理多个作品。</p>
            </div>
          </div>
          <button class="gf-runtime-notice-close" type="button" aria-label="关闭提示">×</button>
        </header>
        <div class="gf-runtime-notice-body">
          <p class="gf-runtime-notice-summary"><strong>不安装 Runtime，作品核心内容通常仍能加载，</strong>但可能出现以下情况：</p>
          <ul class="gf-runtime-notice-list">
            <li>低代码物品使用原版载体和 CustomModelData，创造模式或 JEI 不一定能直接搜到最终物品。</li>
            <li>需要自己记住 <code>/function</code> 或 <code>/trigger</code>，才能获取武器、召唤 Boss 或打开项目菜单。</li>
            <li>无法按 <strong>G</strong> 打开统一作品控制台，也不能在一个界面中管理多个 GameForge 作品。</li>
            <li>无法使用一键兼容诊断、获取全部、召唤全部和清理生成物等便捷操作。</li>
            <li>多人游戏时，客户端与服务端需要安装相同版本的 Runtime，GUI 操作才能正常同步。</li>
          </ul>
          <div class="gf-runtime-notice-good"><strong>推荐做法：</strong>先安装 GameForge Runtime GUI，再下载作品 JAR。以后新增作品不需要重复安装 Runtime。</div>
          <p class="gf-runtime-notice-honest">Runtime 是推荐配套组件，不是对所有低代码作品的强制依赖；选择继续下载不会损坏作品文件。</p>
          <label class="gf-runtime-notice-remember">
            <input type="checkbox" data-gf-runtime-remember>
            <span>我已经安装 Runtime，以后下载作品时不再提示</span>
          </label>
          <div class="gf-runtime-notice-actions">
            <a class="gf-runtime-notice-button gf-runtime-notice-primary" href="runtime.html" data-gf-runtime-notice-action>先下载 Runtime GUI（推荐）</a>
            <button class="gf-runtime-notice-button gf-runtime-notice-secondary" type="button" data-gf-runtime-continue data-gf-runtime-notice-action>仍然下载作品</button>
          </div>
        </div>
      </section>
    `;

    const closeButton = overlay.querySelector('.gf-runtime-notice-close');
    const continueButton = overlay.querySelector('[data-gf-runtime-continue]');
    closeButton.addEventListener('click', closeNotice);
    continueButton.addEventListener('click', continueDownload);
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) closeNotice();
    });
    overlay.addEventListener('keydown', trapNoticeFocus);
    document.body.appendChild(overlay);
    return overlay;
  }

  function trapNoticeFocus(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeNotice();
      return;
    }
    if (event.key !== 'Tab') return;

    const overlay = document.getElementById(NOTICE_ID);
    if (!overlay || overlay.hidden) return;
    const focusable = Array.from(overlay.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'));
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function openNotice(trigger) {
    installNoticeStyles();
    const overlay = createNotice();
    pendingDownloadTrigger = trigger;
    lastFocusedElement = document.activeElement;
    previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    overlay.hidden = false;
    const primary = overlay.querySelector('.gf-runtime-notice-primary');
    window.setTimeout(() => primary && primary.focus(), 0);
  }

  function closeNotice() {
    const overlay = document.getElementById(NOTICE_ID);
    if (!overlay || overlay.hidden) return;
    overlay.hidden = true;
    document.body.style.overflow = previousBodyOverflow;
    pendingDownloadTrigger = null;
    if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
      lastFocusedElement.focus();
    }
  }

  function continueDownload() {
    const overlay = document.getElementById(NOTICE_ID);
    const trigger = pendingDownloadTrigger;
    const remember = overlay && overlay.querySelector('[data-gf-runtime-remember]');
    if (remember && remember.checked) {
      try {
        window.localStorage.setItem(SKIP_KEY, 'installed');
      } catch (error) {
        console.warn('GameForge could not save the Runtime notice preference.', error);
      }
    }

    if (overlay) overlay.hidden = true;
    document.body.style.overflow = previousBodyOverflow;
    pendingDownloadTrigger = null;

    if (trigger && typeof trigger.click === 'function') {
      bypassOnce.add(trigger);
      window.setTimeout(() => trigger.click(), 0);
    }
  }

  function noticeWasAcknowledged() {
    try {
      return window.localStorage.getItem(SKIP_KEY) === 'installed';
    } catch {
      return false;
    }
  }

  function isProjectDownloadTrigger(element) {
    if (!element || element.closest(`#${NOTICE_ID}`)) return false;
    const text = [
      element.textContent,
      element.getAttribute('aria-label'),
      element.getAttribute('title'),
      element.getAttribute('data-action'),
      element.id,
    ]
      .filter(Boolean)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!text) return false;
    if (/runtime|gui|zip\s*→\s*jar|源码|source/i.test(text)) return false;
    return /下载.{0,6}作品|作品.{0,6}下载|导出.{0,6}作品|下载.{0,4}项目|download.{0,8}(project|work)|export.{0,8}(project|work)/i.test(text);
  }

  function interceptProjectDownload(event) {
    if (!(event.target instanceof Element)) return;
    const trigger = event.target.closest('button, a, [role="button"]');
    if (!trigger || !isProjectDownloadTrigger(trigger)) return;

    if (bypassOnce.has(trigger)) {
      bypassOnce.delete(trigger);
      return;
    }
    if (noticeWasAcknowledged()) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    openNotice(trigger);
  }

  function installEntries() {
    entries.forEach(makeEntry);
    installNoticeStyles();
    createNotice();
    document.addEventListener('click', interceptProjectDownload, true);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', installEntries, { once: true });
  } else {
    installEntries();
  }
})();
