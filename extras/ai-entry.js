'use strict';

(() => {
  if (globalThis.__gameforgeAiEntryInstalled) return;
  globalThis.__gameforgeAiEntryInstalled = true;

  const $ = (id) => document.getElementById(id);

  function handoff() {
    const value = String($('smartPrompt')?.value || '').trim();
    try {
      if (value) sessionStorage.setItem('gameforge.ai.handoff.prompt', value);
    } catch (_) {}
    location.href = 'ai-creator.html';
  }

  function install() {
    const createButton = $('smartCreate');
    if (!createButton || $('openAiCreator')) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.id = 'openAiCreator';
    button.className = 'gf-ai-entry-button';
    button.innerHTML = '<span>✦</span><span><strong>使用 AI 创作</strong><small>复杂 Mod、多个系统、持续修改</small></span><b>→</b>';
    button.addEventListener('click', handoff);

    const actions = createButton.parentElement;
    if (actions) actions.insertBefore(button, createButton);

    const style = document.createElement('style');
    style.textContent = '.gf-ai-entry-button{display:inline-flex;align-items:center;gap:10px;border:1px solid rgba(136,151,255,.42);background:linear-gradient(135deg,rgba(72,87,165,.28),rgba(104,67,152,.25));color:#e7e9ff;border-radius:13px;padding:10px 14px;cursor:pointer;text-align:left;box-shadow:0 8px 28px rgba(77,78,175,.12)}.gf-ai-entry-button>span:first-child{width:28px;height:28px;border-radius:9px;display:grid;place-items:center;background:linear-gradient(145deg,#769bff,#a57aff);color:white}.gf-ai-entry-button>span:nth-child(2){display:flex;flex-direction:column}.gf-ai-entry-button strong{font-size:13px}.gf-ai-entry-button small{font-size:10px;color:#929bc3;margin-top:2px}.gf-ai-entry-button>b{font-size:17px;color:#aab8ff}.gf-ai-entry-button:hover{border-color:#9eaaff;transform:translateY(-1px)}@media(max-width:680px){.gf-ai-entry-button small{display:none}.gf-ai-entry-button{padding:10px}.gf-ai-entry-button>b{display:none}}';
    document.head.appendChild(style);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
  else install();
})();
