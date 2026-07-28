'use strict';

(() => {
  const GF = window.GameForge;
  const Cap = GF?.capabilities;
  if (!GF || !Cap || globalThis.__gameforgeCapabilityUiInstalled) return;
  globalThis.__gameforgeCapabilityUiInstalled = true;

  const STATUS_ORDER = ['ready', 'partial', 'saved', 'unsupported'];
  const GROUP_TITLES = {
    ready: '会生成',
    partial: '只能生成一部分',
    saved: '只会记下来，不会变成可玩的功能',
    unsupported: '现在不会生成'
  };
  const $ = (id) => document.getElementById(id);
  const escape = (value) => GF.utils?.escapeHtml ? GF.utils.escapeHtml(String(value ?? '')) : String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const surface = Cap.surfaceFromLocation();
  let lastPromptReport = null;
  let promptTimer = 0;
  let projectFingerprint = '';

  function statusLegend() {
    return `<div class="gf-capability-legend" aria-label="能力状态说明">
      <span class="ready"><i></i><b>绿色</b>：会生成</span>
      <span class="partial"><i></i><b>黄色</b>：只能做一部分</span>
      <span class="saved"><i></i><b>灰色</b>：只会记下来</span>
      <span class="unsupported"><i></i><b>红色</b>：现在做不了</span>
    </div>`;
  }

  function reportHtml(report, options = {}) {
    const compact = Boolean(options.compact);
    const groups = STATUS_ORDER.map((status) => {
      const entries = (report.items || []).filter((entry) => entry.status === status);
      if (!entries.length) return '';
      return `<section class="gf-capability-group ${status}">
        <h4><span></span>${escape(GROUP_TITLES[status])}<em>${entries.length}</em></h4>
        <div class="gf-capability-items">${entries.map((entry) => `<article class="gf-capability-item ${status}">
          <span class="gf-capability-dot" aria-hidden="true"></span>
          <div><strong>${escape(entry.name)}</strong><p>${escape(entry.detail)}</p>${entry.route ? `<small>去哪里做：${escape(entry.route)}</small>` : ''}</div>
          <b>${escape(Cap.STATUS_META[status].label)}</b>
        </article>`).join('')}</div>
      </section>`;
    }).join('');
    return `<div class="gf-capability-report${compact ? ' compact' : ''}">
      <div class="gf-capability-intro"><span>先说清楚</span><div><strong>${escape(report.headline)}</strong><p>下面告诉你最终会生成什么，不会生成什么。</p></div></div>
      <div class="gf-capability-final">${escape(report.finalText)}</div>
      ${compact ? '' : statusLegend()}
      <div class="gf-capability-groups">${groups}</div>
    </div>`;
  }

  function ensurePanel(id, anchor, position = 'afterend', compact = false) {
    let panel = $(id);
    if (panel) return panel;
    panel = document.createElement('section');
    panel.id = id;
    panel.className = `gf-capability-panel${compact ? ' compact' : ''}`;
    panel.hidden = true;
    panel.setAttribute('aria-live', 'polite');
    if (anchor) anchor.insertAdjacentElement(position, panel);
    return panel;
  }

  function renderPanel(panel, report, options = {}) {
    if (!panel || !report) return;
    panel.hidden = false;
    panel.innerHTML = reportHtml(report, options);
    panel.dataset.reportFingerprint = JSON.stringify(report.counts || {});
  }

  function activeProject() {
    const selected = $('projectSelect')?.value;
    const id = selected || GF.project?.activeId?.();
    return (id && GF.project?.get?.(id)) || GF.project?.loadOrCreateActive?.() || null;
  }

  function rememberCurrent(report) {
    const project = activeProject();
    if (project?.id && report) Cap.rememberReport(project.id, report);
  }

  function analyzePromptInput(input, panel) {
    const value = String(input?.value || '').trim();
    if (!value) {
      lastPromptReport = null;
      if (panel) panel.hidden = true;
      return null;
    }
    const report = Cap.analyzePrompt(value, { surface });
    lastPromptReport = report;
    renderPanel(panel, report);
    return report;
  }

  function installPromptSurface() {
    const input = surface === 'home' ? $('smartPrompt') : $('promptInput');
    if (!input) return;
    const anchor = surface === 'home' ? $('smartPlan') : $('statusText');
    const panel = ensurePanel('gameforgeCapabilityPromptPanel', anchor, 'afterend');
    const update = () => {
      clearTimeout(promptTimer);
      promptTimer = setTimeout(() => analyzePromptInput(input, panel), 180);
    };
    input.addEventListener('input', update);
    input.addEventListener('change', update);

    if (surface === 'home') {
      $('smartAnalyze')?.addEventListener('click', () => setTimeout(() => analyzePromptInput(input, panel), 0));
      document.querySelectorAll('.prompt-examples [data-prompt]').forEach((button) => button.addEventListener('click', () => setTimeout(() => analyzePromptInput(input, panel), 0)));
    } else {
      $('parsePrompt')?.addEventListener('click', () => setTimeout(() => {
        const report = analyzePromptInput(input, panel);
        rememberCurrent(report);
      }, 0));
      document.querySelectorAll('[data-template]').forEach((button) => button.addEventListener('click', () => setTimeout(() => analyzePromptInput(input, panel), 0)));
    }
    if (input.value.trim()) update();
  }

  function ensureModal() {
    let modal = $('gameforgeCapabilityModal');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.id = 'gameforgeCapabilityModal';
    modal.className = 'gf-capability-modal';
    modal.hidden = true;
    modal.innerHTML = `<div class="gf-capability-backdrop" data-capability-close></div><section class="gf-capability-dialog" role="dialog" aria-modal="true" aria-labelledby="gfCapabilityModalTitle">
      <header><div><span>下载或创建前确认</span><h2 id="gfCapabilityModalTitle">先看清楚最终会得到什么</h2></div><button type="button" class="gf-capability-close" data-capability-close aria-label="关闭">×</button></header>
      <div class="gf-capability-modal-body" id="gfCapabilityModalBody"></div>
      <footer><button type="button" class="gf-capability-button secondary" data-capability-close>返回修改</button><button type="button" class="gf-capability-button primary" id="gfCapabilityContinue">我知道了，继续</button></footer>
    </section>`;
    document.body.appendChild(modal);
    return modal;
  }

  function showModal(report, options = {}) {
    const modal = ensureModal();
    const title = options.title || '先看清楚最终会得到什么';
    const continueText = options.continueText || '我知道了，继续';
    const allowContinue = options.allowContinue !== false && report.canProceed;
    modal.querySelector('h2').textContent = title;
    modal.querySelector('#gfCapabilityModalBody').innerHTML = reportHtml(report);
    const continueButton = modal.querySelector('#gfCapabilityContinue');
    continueButton.textContent = allowContinue ? continueText : '当前没有可生成内容';
    continueButton.disabled = !allowContinue;
    modal.hidden = false;
    document.documentElement.classList.add('gf-capability-modal-open');
    setTimeout(() => (allowContinue ? continueButton : modal.querySelector('[data-capability-close]'))?.focus(), 0);

    return new Promise((resolve) => {
      let settled = false;
      const finish = (value) => {
        if (settled) return;
        settled = true;
        modal.hidden = true;
        document.documentElement.classList.remove('gf-capability-modal-open');
        modal.querySelectorAll('[data-capability-close]').forEach((node) => node.removeEventListener('click', close));
        continueButton.removeEventListener('click', proceed);
        resolve(value);
      };
      const close = () => finish(false);
      const proceed = () => finish(true);
      modal.querySelectorAll('[data-capability-close]').forEach((node) => node.addEventListener('click', close));
      continueButton.addEventListener('click', proceed);
    });
  }

  function replayClick(element) {
    element.dataset.gfCapabilityBypass = '1';
    element.click();
    queueMicrotask(() => delete element.dataset.gfCapabilityBypass);
  }

  async function guardElement(event, element, report, options = {}) {
    if (!element || element.dataset.gfCapabilityBypass === '1') return;
    if (report.canProceed && !report.needsConfirmation) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    const proceed = await showModal(report, options);
    if (proceed) {
      if (options.remember) rememberCurrent(report);
      replayClick(element);
    }
  }

  function installCreateGuard() {
    document.addEventListener('click', (event) => {
      const button = event.target.closest('#smartCreate');
      if (!button || button.dataset.gfCapabilityBypass === '1') return;
      const input = $('smartPrompt');
      const report = Cap.analyzePrompt(input?.value || '', { surface: 'home' });
      lastPromptReport = report;
      renderPanel($('gameforgeCapabilityPromptPanel'), report);
      if (!report.canProceed || report.needsConfirmation) guardElement(event, button, report, { title: '这次创建会少哪些功能？', continueText: '接受这些限制并创建', remember: true });
    }, true);
    $('smartCreate')?.addEventListener('click', () => setTimeout(() => {
      if (lastPromptReport) rememberCurrent(lastPromptReport);
    }, 0));
  }

  function projectReport() {
    return Cap.analyzeProject(activeProject() || {}, { surface });
  }

  function installDownloadGuards() {
    const selectors = ['#downloadDatapack', '#downloadResourcepack', '#downloadForge', '#downloadProjectSource', '#downloadBundleWorkspace', '#downloadBundleTop', '#downloadProject'].join(',');
    document.addEventListener('click', (event) => {
      const button = event.target.closest(selectors);
      if (!button || button.dataset.gfCapabilityBypass === '1') return;
      const report = projectReport();
      if (!report.canProceed || report.needsConfirmation) guardElement(event, button, report, { title: '下载前请确认最终效果', continueText: '我已看清楚，继续下载' });
    }, true);
  }

  function installProjectSurface() {
    let anchor = null;
    let position = 'beforebegin';
    let compact = false;
    if (surface === 'native-forge') anchor = $('diagnostics');
    else if (surface === 'blueprint') { anchor = $('inspectorBody'); position = 'afterend'; compact = true; }
    else if (surface === 'home') { anchor = $('homeProjectDescription')?.parentElement; position = 'afterend'; compact = true; }
    if (!anchor) return;
    const panel = ensurePanel('gameforgeCapabilityProjectPanel', anchor, position, compact);
    const update = () => {
      const project = activeProject();
      const fingerprint = JSON.stringify({ id: project?.id, updatedAt: project?.updatedAt, count: project?.components?.length, selected: $('componentSelect')?.value });
      if (fingerprint === projectFingerprint) return;
      projectFingerprint = fingerprint;
      renderPanel(panel, Cap.analyzeProject(project || {}, { surface }), { compact });
    };
    update();
    $('projectSelect')?.addEventListener('change', () => setTimeout(update, 0));
    $('componentSelect')?.addEventListener('change', () => setTimeout(update, 0));
    ['applyButton', 'validateButton', 'refreshOutput', 'refreshDiagnostics'].forEach((id) => $(id)?.addEventListener('click', () => setTimeout(update, 0)));
    setInterval(update, 1400);
  }

  function installKeyboardClose() {
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !$('gameforgeCapabilityModal')?.hidden) $('gameforgeCapabilityModal')?.querySelector('[data-capability-close]')?.click();
    });
  }

  function init() {
    installPromptSurface();
    installCreateGuard();
    installDownloadGuards();
    installProjectSurface();
    installKeyboardClose();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
