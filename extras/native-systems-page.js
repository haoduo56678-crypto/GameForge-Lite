'use strict';

(() => {
  const GF = window.GameForge;
  const Systems = GF?.nativeSystems;
  if (!GF || !Systems || !GF.pipeline || !GF.blueprint) throw new Error('GameForge 原生系统依赖没有正确加载。');

  const $ = (id) => document.getElementById(id);
  const ui = {
    projectSelect: $('projectSelect'), promptInput: $('promptInput'), status: $('statusText'), componentList: $('componentList'),
    componentCount: $('componentCount'), editorTitle: $('editorTitle'), editorSubtitle: $('editorSubtitle'), deleteButton: $('deleteComponent'),
    machineForm: $('machineForm'), entityForm: $('entityForm'), diagnostics: $('diagnostics'), metrics: $('metrics'), irPreview: $('irPreview'),
    blueprintLink: $('blueprintLink'), forgeLink: $('forgeLink')
  };
  let project = null;
  let selectedId = '';
  let activeTab = 'machine';
  const escape = (value) => GF.utils.escapeHtml(value);
  const number = (id, fallback) => Number.isFinite(Number($(id).value)) ? Number($(id).value) : fallback;
  const value = (id) => $(id).value.trim();

  function setStatus(message, state = '') {
    ui.status.textContent = message;
    ui.status.className = `ns-status${state ? ` ${state}` : ''}`;
  }
  function projectList() {
    const projects = GF.project.list();
    if (projects.length) return projects;
    return [GF.project.save(GF.project.create({ name: '原生系统项目', namespace: 'native_systems' }))];
  }
  function systemComponents() { return (project?.components || []).filter((component) => Systems.isMachine(component) || Systems.isCustomEntity(component)); }
  function selectTab(tab) {
    activeTab = tab;
    document.querySelectorAll('.ns-tabs button').forEach((button) => button.classList.toggle('active', button.dataset.tab === tab));
    ui.machineForm.hidden = tab !== 'machine';
    ui.entityForm.hidden = tab !== 'entity';
    ui.editorTitle.textContent = tab === 'machine' ? '机器 / BlockEntity 编辑器' : '自定义 EntityType 编辑器';
    ui.editorSubtitle.textContent = tab === 'machine' ? '生成方块、存档、容器 GUI 和双向网络同步。' : '生成新实体 ID、属性、渲染器、刷怪蛋和 Goal AI。';
  }
  function updateLinks() {
    const query = project ? `?project=${encodeURIComponent(project.id)}` : '';
    ui.blueprintLink.href = `blueprint.html${query}`;
    ui.forgeLink.href = `native-forge.html${query}`;
  }
  function loadProjects(preferred = '') {
    const projects = projectList();
    ui.projectSelect.innerHTML = projects.map((item) => `<option value="${escape(item.id)}">${escape(item.name)}</option>`).join('');
    const queryId = new URLSearchParams(location.search).get('project');
    const target = preferred || queryId || GF.project.activeId() || projects[0].id;
    ui.projectSelect.value = projects.some((item) => item.id === target) ? target : projects[0].id;
    loadProject(ui.projectSelect.value);
  }
  function loadProject(id) {
    project = GF.project.get(id) || GF.project.loadOrCreateActive();
    GF.project.setActive(project.id);
    selectedId = systemComponents()[0]?.id || '';
    render();
    setStatus(`已载入项目“${project.name}”。`, 'good');
  }
  function saveProject() {
    project.updatedAt = new Date().toISOString();
    project = GF.project.save(project);
    GF.project.setActive(project.id);
    updateLinks();
  }
  function attachBlueprint(component) {
    try {
      const graph = GF.blueprint.graphFromComponent(component);
      component.blueprint = graph;
      component.behaviors = [];
      component.spec = { ...(component.spec || {}), blueprint: graph };
    } catch (error) {
      console.warn('Could not create native system Blueprint.', error);
    }
    return component;
  }
  function replaceOrAdd(component) {
    const index = project.components.findIndex((item) => item.id === selectedId);
    if (index >= 0) {
      component.id = project.components[index].id;
      component.createdAt = project.components[index].createdAt || component.createdAt;
      project.components[index] = component;
    } else project.components.push(component);
    selectedId = component.id;
    saveProject();
    render();
  }

  function renderComponentList() {
    const components = systemComponents();
    ui.componentCount.textContent = String(components.length);
    ui.componentList.innerHTML = components.map((component) => {
      const machine = Systems.isMachine(component);
      const description = machine
        ? `${component.spec.inputItem || '输入'} → ${component.spec.outputItem || '输出'} · ${Math.round(Number(component.spec.processTicks || 100) / 20 * 100) / 100}s`
        : `HP ${component.spec.health || 30} · ATK ${component.spec.damage || 6} · ${(component.spec.goals || []).length} Goals`;
      return `<button class="ns-component${component.id === selectedId ? ' active' : ''}" data-id="${escape(component.id)}"><span>${machine ? '⚙' : 'E'}</span><span><strong>${escape(component.name)}</strong><small>${escape(description)}</small></span><em>${machine ? '机器' : '实体'}</em></button>`;
    }).join('') || '<div class="ns-empty">项目中还没有原生机器或自定义实体。</div>';
    ui.componentList.querySelectorAll('[data-id]').forEach((button) => button.addEventListener('click', () => selectComponent(button.dataset.id)));
  }
  function selectComponent(id) {
    selectedId = id;
    const component = project.components.find((item) => item.id === id);
    if (!component) return;
    if (Systems.isMachine(component)) fillMachine(component);
    else fillEntity(component);
    ui.deleteButton.disabled = false;
    renderComponentList();
    renderDiagnostics();
  }
  function fillMachine(component) {
    const spec = component.spec || {};
    selectTab('machine');
    $('machineName').value = component.name || spec.name || '';
    $('machineId').value = spec.id || component.registryId || '';
    $('machineInput').value = spec.inputItem || 'minecraft:iron_ingot';
    $('machineInputCount').value = spec.inputCount || 1;
    $('machineFuel').value = spec.fuelItem || 'minecraft:coal';
    $('machineFuelCount').value = spec.fuelCount ?? 1;
    $('machineOutput').value = spec.outputItem || 'minecraft:gold_ingot';
    $('machineOutputCount').value = spec.outputCount || 1;
    $('machineSeconds').value = Math.max(0.05, Number(spec.processTicks || 100) / 20);
    $('machineColor').value = /^#[0-9a-f]{6}$/i.test(spec.color || '') ? spec.color : '#6a8dff';
    $('machineAutoStart').checked = Boolean(spec.autoStart);
  }
  function fillEntity(component) {
    const spec = component.spec || {};
    selectTab('entity');
    $('entityName').value = component.name || spec.name || '';
    $('entityId').value = spec.id || component.registryId || '';
    $('entityHealth').value = spec.health || 30;
    $('entityDamage').value = spec.damage || 6;
    $('entitySpeed').value = spec.speed || 0.28;
    $('entityArmor').value = spec.armor || 2;
    $('entityTexture').value = spec.texture || 'minecraft:textures/entity/zombie/zombie.png';
    $('entityExperience').value = spec.experience || 10;
    $('entityTargetPlayers').checked = spec.targetPlayers !== false;
    $('entityFireImmune').checked = Boolean(spec.fireImmune);
    $('entityBoss').checked = Boolean(spec.boss);
    const selectedGoals = new Set(spec.goals || []);
    document.querySelectorAll('[data-goal]').forEach((input) => { input.checked = selectedGoals.has(input.dataset.goal); });
  }
  function renderGoalList() {
    const labels = {
      float: '漂浮/游泳', melee_attack: '近战攻击', random_stroll: '随机游荡', look_at_player: '观察玩家', random_look: '随机环顾',
      hurt_by_target: '受击反击', nearest_player: '寻找最近玩家', leap_at_target: '跳跃攻击', move_towards_target: '靠近目标'
    };
    $('goalList').innerHTML = Systems.SUPPORTED_GOALS.map((goal) => `<label class="ns-goal"><input type="checkbox" data-goal="${escape(goal)}"${['float','melee_attack','random_stroll','look_at_player','random_look','hurt_by_target','nearest_player'].includes(goal) ? ' checked' : ''}>${escape(labels[goal] || goal)}</label>`).join('');
  }

  function renderDiagnostics() {
    if (!project) return;
    try {
      const ir = GF.pipeline.fromLegacyProject(project);
      const issues = GF.pipeline.validate(ir);
      const generated = GF.nativeForge.generateFromIR(ir, {
        modId: GF.nativeForge.cleanModId(project.namespace || project.name),
        modName: project.name,
        packageName: `com.gameforge.${GF.nativeForge.cleanModId(project.namespace || project.name).replace(/_/g, '')}`,
        version: '1.0.0', author: 'GameForge Creator'
      });
      const systems = generated.report.nativeSystems || { machines: [], entities: [], capabilities: {} };
      const capabilities = systems.capabilities || {};
      ui.metrics.innerHTML = [
        [systems.machines?.length || 0, 'BlockEntity'], [capabilities.customGui ? 1 : 0, 'Screen/Menu'], [capabilities.simpleChannel ? 2 : 0, '网络包'],
        [systems.entities?.length || 0, 'EntityType'], [capabilities.basicGoalAi ? (systems.entities || []).reduce((sum, entity) => sum + (entity.goals?.length || 0), 0) : 0, 'Goal AI']
      ].map(([count, label]) => `<div class="ns-metric"><strong>${count}</strong><span>${label}</span></div>`).join('');
      ui.diagnostics.innerHTML = issues.map((issue) => `<div class="ns-diagnostic ${escape(issue.severity)}">${escape(issue.message)}</div>`).join('');
      ui.irPreview.textContent = JSON.stringify(ir, null, 2);
    } catch (error) {
      ui.diagnostics.innerHTML = `<div class="ns-diagnostic error">${escape(error.message)}</div>`;
      ui.irPreview.textContent = error.stack || error.message;
    }
  }
  function render() {
    updateLinks(); renderComponentList();
    const selected = project.components.find((item) => item.id === selectedId);
    if (selected) selectComponent(selected.id); else { ui.deleteButton.disabled = true; selectTab(activeTab); renderDiagnostics(); }
  }

  function saveMachine(event) {
    event.preventDefault();
    const component = attachBlueprint(Systems.createMachineComponent({
      name: value('machineName') || '自定义机器', id: value('machineId'), inputItem: value('machineInput'), inputCount: number('machineInputCount', 1),
      fuelItem: value('machineFuel') || 'minecraft:air', fuelCount: number('machineFuelCount', 0), outputItem: value('machineOutput'), outputCount: number('machineOutputCount', 1),
      processSeconds: number('machineSeconds', 5), color: $('machineColor').value, autoStart: $('machineAutoStart').checked
    }));
    replaceOrAdd(component); setStatus(`机器“${component.name}”已保存。`, 'good');
  }
  function saveEntity(event) {
    event.preventDefault();
    const goals = Array.from(document.querySelectorAll('[data-goal]:checked')).map((input) => input.dataset.goal);
    const component = attachBlueprint(Systems.createEntityComponent({
      name: value('entityName') || '自定义生物', id: value('entityId'), health: number('entityHealth', 30), damage: number('entityDamage', 6),
      speed: number('entitySpeed', 0.28), armor: number('entityArmor', 2), texture: value('entityTexture'), experience: number('entityExperience', 10),
      goals, targetPlayers: $('entityTargetPlayers').checked, fireImmune: $('entityFireImmune').checked, boss: $('entityBoss').checked
    }));
    replaceOrAdd(component); setStatus(`自定义实体“${component.name}”已保存。`, 'good');
  }
  function newComponent(type) {
    selectedId = '';
    ui.deleteButton.disabled = true;
    selectTab(type);
    if (type === 'machine') fillMachine(Systems.createMachineComponent()); else fillEntity(Systems.createEntityComponent());
    renderComponentList();
    setStatus(`正在新建${type === 'machine' ? '机器' : '实体'}。`);
  }
  function parsePrompt() {
    try {
      const component = attachBlueprint(Systems.parsePrompt(ui.promptInput.value));
      replaceOrAdd(component);
      if (Systems.isMachine(component)) fillMachine(component); else fillEntity(component);
      setStatus(`已从一句话创建“${component.name}”。`, 'good');
    } catch (error) { setStatus(error.message, 'error'); }
  }
  function deleteSelected() {
    if (!selectedId) return;
    const component = project.components.find((item) => item.id === selectedId);
    if (!component || !confirm(`确定删除“${component.name}”吗？`)) return;
    project.components = project.components.filter((item) => item.id !== selectedId);
    selectedId = systemComponents()[0]?.id || '';
    saveProject(); render(); setStatus('组件已删除。', 'good');
  }

  function init() {
    renderGoalList();
    ui.projectSelect.addEventListener('change', () => loadProject(ui.projectSelect.value));
    $('parsePrompt').addEventListener('click', parsePrompt);
    $('newMachine').addEventListener('click', () => newComponent('machine'));
    $('newEntity').addEventListener('click', () => newComponent('entity'));
    ui.machineForm.addEventListener('submit', saveMachine);
    ui.entityForm.addEventListener('submit', saveEntity);
    ui.deleteButton.addEventListener('click', deleteSelected);
    $('refreshDiagnostics').addEventListener('click', renderDiagnostics);
    document.querySelectorAll('.ns-tabs button').forEach((button) => button.addEventListener('click', () => newComponent(button.dataset.tab)));
    loadProjects();
  }
  init();
})();
