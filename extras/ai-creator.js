'use strict';

(() => {
  const GF = globalThis.GameForge || {};
  const $ = (id) => document.getElementById(id);
  const prompt = $('aiPrompt');
  const startButton = $('startAiCreation');
  const result = $('aiResult');
  const resultBody = $('aiResultBody');
  const state = $('aiResultState');
  let currentPlan = null;

  function safeJson(value) {
    try { return JSON.parse(JSON.stringify(value)); } catch (_) { return null; }
  }

  function getCurrentProject() {
    try {
      const id = GF.project?.activeId?.();
      return (id && GF.project?.get?.(id)) || GF.project?.loadOrCreateActive?.() || null;
    } catch (_) { return null; }
  }

  function projectSummary(project) {
    if (!project) return null;
    return {
      id: project.id || '',
      name: project.name || project.meta?.name || 'GameForge 项目',
      namespace: project.namespace || project.meta?.namespace || '',
      updatedAt: project.updatedAt || '',
      components: (project.components || []).map((component) => ({
        id: component.id || '',
        type: component.type || component.kind || '',
        name: component.name || component.spec?.name || component.config?.name || '',
        contentType: component.spec?.contentType || component.config?.contentType || '',
        summary: component.spec?.description || component.config?.description || ''
      })).slice(0, 120)
    };
  }

  function buildRequest() {
    const project = getCurrentProject();
    return {
      schema: 'gameforge.ai-creation-request',
      version: 1,
      language: 'zh-CN',
      target: { minecraft: '1.20.1', loader: 'forge', forge: '47.4.21', java: 17 },
      prompt: String(prompt?.value || '').trim(),
      includeProject: Boolean($('includeProject')?.checked),
      project: $('includeProject')?.checked ? projectSummary(project) : null,
      capabilityContract: {
        statuses: ['ready', 'partial', 'saved', 'unsupported'],
        rule: 'AI 只负责理解和规划，最终能力状态由 GameForge 本地能力引擎决定。'
      },
      expectedResponse: {
        schema: 'gameforge.ai-creation-plan',
        version: 1,
        title: 'string',
        summary: 'string',
        actions: [{ action: 'create_component | update_component | add_behavior | connect_components', componentType: 'string', name: 'string', settings: {} }],
        assumptions: ['string'],
        questions: ['string']
      }
    };
  }

  function adapter() {
    return globalThis.GameForgeAIAdapter;
  }

  function refreshConnection() {
    const connected = Boolean(adapter() && typeof adapter().createPlan === 'function');
    const label = $('aiConnectionState');
    if (label) {
      label.classList.toggle('connected', connected);
      label.lastChild.textContent = connected ? 'AI API 已连接' : '等待接入 API';
    }
    if (startButton) {
      startButton.disabled = !connected || !String(prompt?.value || '').trim();
      $('startButtonHint').textContent = connected ? '发送需求并生成创作计划' : 'API 接入后即可发送';
    }
    return connected;
  }

  function updatePromptState() {
    const length = String(prompt?.value || '').length;
    $('promptCount').textContent = `${length} / 12000`;
    refreshConnection();
  }

  function loadHandoff() {
    const parameters = new URLSearchParams(location.search);
    const direct = parameters.get('prompt');
    let stored = '';
    try {
      stored = sessionStorage.getItem('gameforge.ai.handoff.prompt') || '';
      sessionStorage.removeItem('gameforge.ai.handoff.prompt');
    } catch (_) {}
    prompt.value = direct || stored || '';
    updatePromptState();
    if (prompt.value) prompt.focus();
  }

  function renderLoading() {
    result.hidden = false;
    state.textContent = 'AI 规划中';
    resultBody.innerHTML = $('aiLoadingTemplate').innerHTML;
    result.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function renderError(error) {
    result.hidden = false;
    state.textContent = '请求失败';
    resultBody.innerHTML = `<div class="gf-ai-error"><strong>AI 没有返回可用计划</strong><p>${String(error?.message || error || '请检查 API 连接后重试。')}</p></div>`;
  }

  function validatePlan(plan) {
    if (!plan || typeof plan !== 'object') throw new Error('AI 返回内容不是有效对象。');
    if (plan.schema && plan.schema !== 'gameforge.ai-creation-plan') throw new Error(`不支持的返回格式：${plan.schema}`);
    if (!Array.isArray(plan.actions)) throw new Error('AI 返回内容缺少 actions 数组。');
    return { schema: 'gameforge.ai-creation-plan', version: 1, title: plan.title || 'AI 创作计划', summary: plan.summary || '', actions: plan.actions, assumptions: Array.isArray(plan.assumptions) ? plan.assumptions : [], questions: Array.isArray(plan.questions) ? plan.questions : [] };
  }

  function localReview(plan) {
    if (adapter()?.reviewPlan) return adapter().reviewPlan(safeJson(plan), { GameForge: GF });
    return {
      headline: 'AI 计划已收到，等待接入本地计划转换器',
      finalText: '当前页面已经完成 AI 请求与返回展示；接入 applyPlan 或 reviewPlan 后，可继续执行本地能力检查和项目修改。',
      items: plan.actions.map((action, index) => ({ id: `ai-action-${index + 1}`, name: action.name || action.componentType || action.action || `步骤 ${index + 1}`, status: 'saved', detail: 'AI 已规划此步骤，等待转换成 GameForge 组件操作。' }))
    };
  }

  function renderPlan(plan, review) {
    currentPlan = plan;
    result.hidden = false;
    state.textContent = adapter()?.reviewPlan ? '本地检查完成' : '等待本地转换器';
    const actions = plan.actions.map((action, index) => `<article><strong>${index + 1}. ${String(action.name || action.componentType || action.action || '创作步骤')}</strong><p>${String(action.description || action.reason || JSON.stringify(action.settings || {}))}</p></article>`).join('');
    const reviewItems = (review?.items || []).map((entry) => `<article><strong>${String(entry.name || '能力检查')}</strong><p>${String(entry.detail || entry.status || '')}</p></article>`).join('');
    resultBody.innerHTML = `<div class="gf-ai-plan-preview"><article><strong>${String(plan.title)}</strong><p>${String(plan.summary || 'AI 已拆分你的创作要求。')}</p></article>${actions}${reviewItems}<article><strong>最终说明</strong><p>${String(review?.finalText || '应用前仍需经过 GameForge 本地生成器。')}</p></article></div>`;
    $('applyAiPlan').disabled = !(adapter() && typeof adapter().applyPlan === 'function');
    $('applyAiPlan').querySelector('small').textContent = $('applyAiPlan').disabled ? '等待接入 applyPlan()' : '由本地生成器执行';
  }

  async function createPlan() {
    if (!refreshConnection()) return;
    const request = buildRequest();
    if (!request.prompt) return;
    renderLoading();
    startButton.disabled = true;
    try {
      const raw = await adapter().createPlan(safeJson(request));
      const plan = validatePlan(raw);
      const review = await localReview(plan);
      renderPlan(plan, review);
      globalThis.dispatchEvent(new CustomEvent('gameforge:ai-plan-ready', { detail: { request, plan, review } }));
    } catch (error) {
      renderError(error);
    } finally {
      refreshConnection();
    }
  }

  async function applyPlan() {
    if (!currentPlan || !adapter()?.applyPlan) return;
    const button = $('applyAiPlan');
    button.disabled = true;
    button.querySelector('strong').textContent = '正在应用到项目…';
    try {
      const output = await adapter().applyPlan(safeJson(currentPlan), { project: getCurrentProject(), GameForge: GF });
      globalThis.dispatchEvent(new CustomEvent('gameforge:ai-plan-applied', { detail: output }));
      button.querySelector('strong').textContent = '已应用，返回项目';
      button.querySelector('small').textContent = '点击查看生成结果';
      button.disabled = false;
      button.onclick = () => { location.href = 'index.html'; };
    } catch (error) {
      renderError(error);
      button.disabled = false;
      button.querySelector('strong').textContent = '重新应用到当前项目';
    }
  }

  function installEvents() {
    prompt?.addEventListener('input', updatePromptState);
    $('clearPrompt')?.addEventListener('click', () => { prompt.value = ''; updatePromptState(); prompt.focus(); });
    document.querySelectorAll('[data-prompt]').forEach((button) => button.addEventListener('click', () => { prompt.value = button.dataset.prompt || ''; updatePromptState(); prompt.focus(); }));
    startButton?.addEventListener('click', createPlan);
    $('applyAiPlan')?.addEventListener('click', applyPlan);
    $('editAgain')?.addEventListener('click', () => { result.hidden = true; prompt.focus(); });
    globalThis.addEventListener('gameforge:ai-adapter-ready', refreshConnection);
    setInterval(refreshConnection, 1200);
  }

  globalThis.GameForgeAIHandoff = Object.freeze({
    VERSION: 1,
    buildRequest,
    getCurrentProject,
    projectSummary,
    refreshConnection,
    createPlan,
    applyPlan
  });

  installEvents();
  loadHandoff();
  refreshConnection();
})();
