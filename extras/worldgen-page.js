'use strict';

(() => {
  const GF = window.GameForge;
  const Worldgen = GF?.worldgen;
  if (!GF || !Worldgen || !GF.pipeline || !GF.blueprint || !GF.nativeForge) {
    throw new Error('GameForge 世界与维度依赖没有正确加载。');
  }

  const $ = (id) => document.getElementById(id);
  const ui = {
    projectSelect: $('projectSelect'), promptInput: $('promptInput'), status: $('statusText'),
    componentList: $('componentList'), componentCount: $('componentCount'),
    editorTitle: $('editorTitle'), editorSubtitle: $('editorSubtitle'), deleteButton: $('deleteComponent'),
    biomeForm: $('biomeForm'), dimensionForm: $('dimensionForm'), diagnostics: $('diagnostics'),
    metrics: $('metrics'), irPreview: $('irPreview'), blueprintLink: $('blueprintLink'),
    forgeLink: $('forgeLink'), heroForgeLink: $('heroForgeLink'), biomeOptions: $('biomeOptions')
  };
  let project = null;
  let selectedId = '';
  let activeTab = 'biome';
  const escape = (value) => GF.utils.escapeHtml(value);
  const value = (id) => $(id).value.trim();
  const number = (id, fallback) => Number.isFinite(Number($(id).value)) ? Number($(id).value) : fallback;

  function setStatus(message, state = '') {
    ui.status.textContent = message;
    ui.status.className = `wg-status${state ? ` ${state}` : ''}`;
  }

  function projectList() {
    const projects = GF.project.list();
    if (projects.length) return projects;
    return [GF.project.save(GF.project.create({ name: '世界生成项目', namespace: 'worldgen_project' }))];
  }

  function worldgenComponents() {
    return (project?.components || []).filter((component) => Worldgen.isBiome(component) || Worldgen.isDimension(component));
  }

  function selectTab(tab) {
    activeTab = tab;
    document.querySelectorAll('.wg-tabs button').forEach((button) => button.classList.toggle('active', button.dataset.tab === tab));
    ui.biomeForm.hidden = tab !== 'biome';
    ui.dimensionForm.hidden = tab !== 'dimension';
    ui.editorTitle.textContent = tab === 'biome' ? '自定义群系编辑器' : '可进入维度编辑器';
    ui.editorSubtitle.textContent = tab === 'biome'
      ? '定义气候、颜色、地物、生物生成和原版结构标签。'
      : '定义地形预设、维度类型、固定群系、时间和入口钥匙。';
  }

  function updateLinks() {
    const query = project ? `?project=${encodeURIComponent(project.id)}` : '';
    ui.blueprintLink.href = `blueprint.html${query}`;
    ui.forgeLink.href = `native-forge.html${query}`;
    ui.heroForgeLink.href = `native-forge.html${query}`;
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
    selectedId = worldgenComponents()[0]?.id || '';
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
      if (component.config) component.config = { ...component.config, blueprint: graph };
    } catch (error) {
      console.warn('Could not create worldgen Blueprint.', error);
    }
    return component;
  }

  function componentRegistryId(component) {
    const config = Worldgen.configOf(component);
    return String(config.id || component.registryId || '');
  }

  function replaceOrAdd(component) {
    const replacingIndex = project.components.findIndex((item) => item.id === selectedId
      && ((Worldgen.isBiome(item) && Worldgen.isBiome(component)) || (Worldgen.isDimension(item) && Worldgen.isDimension(component))));
    if (replacingIndex >= 0) {
      component.id = project.components[replacingIndex].id;
      component.createdAt = project.components[replacingIndex].createdAt || component.createdAt;
      project.components[replacingIndex] = component;
    } else {
      const duplicate = project.components.findIndex((item) => componentRegistryId(item) === componentRegistryId(component)
        && ((Worldgen.isBiome(item) && Worldgen.isBiome(component)) || (Worldgen.isDimension(item) && Worldgen.isDimension(component))));
      if (duplicate >= 0) {
        component.id = project.components[duplicate].id;
        component.createdAt = project.components[duplicate].createdAt || component.createdAt;
        project.components[duplicate] = component;
      } else project.components.push(component);
    }
    selectedId = component.id;
    saveProject();
    render();
  }

  function upsertPromptPair(biome, dimension) {
    const pair = [attachBlueprint(biome), attachBlueprint(dimension)];
    for (const component of pair) {
      const index = project.components.findIndex((item) => componentRegistryId(item) === componentRegistryId(component)
        && ((Worldgen.isBiome(item) && Worldgen.isBiome(component)) || (Worldgen.isDimension(item) && Worldgen.isDimension(component))));
      if (index >= 0) {
        component.id = project.components[index].id;
        component.createdAt = project.components[index].createdAt || component.createdAt;
        project.components[index] = component;
      } else project.components.push(component);
    }
    selectedId = dimension.id;
    saveProject();
    render();
  }

  function renderBiomeOptions() {
    const namespace = project?.namespace || 'gameforge';
    ui.biomeOptions.innerHTML = (project?.components || []).filter(Worldgen.isBiome).map((component) => {
      const descriptor = Worldgen.biomeDescriptor(component, namespace);
      return `<option value="${escape(descriptor.resourceId)}">${escape(descriptor.name)}</option>`;
    }).join('');
  }

  function renderComponentList() {
    const components = worldgenComponents();
    ui.componentCount.textContent = String(components.length);
    ui.componentList.innerHTML = components.map((component) => {
      const biome = Worldgen.isBiome(component);
      const spec = Worldgen.configOf(component);
      const description = biome
        ? `${spec.featurePreset || 'lush'} · ${spec.spawnPreset || 'mixed'} · T ${spec.temperature ?? 0.8}`
        : `${spec.terrainPreset || 'overworld'} · ${spec.biomeId || 'minecraft:plains'}`;
      return `<button class="wg-component${component.id === selectedId ? ' active' : ''}" data-id="${escape(component.id)}"><span>${biome ? 'B' : 'D'}</span><span><strong>${escape(component.name)}</strong><small>${escape(description)}</small></span><em>${biome ? '群系' : '维度'}</em></button>`;
    }).join('') || '<div class="wg-empty">项目中还没有群系或维度。</div>';
    ui.componentList.querySelectorAll('[data-id]').forEach((button) => button.addEventListener('click', () => selectComponent(button.dataset.id)));
  }

  function selectComponent(id) {
    selectedId = id;
    const component = project.components.find((item) => item.id === id);
    if (!component) return;
    if (Worldgen.isBiome(component)) fillBiome(component);
    else fillDimension(component);
    ui.deleteButton.disabled = false;
    renderComponentList();
    renderDiagnostics();
  }

  function setStructureChecks(structures = []) {
    const selected = new Set(structures);
    document.querySelectorAll('[data-structure]').forEach((input) => { input.checked = selected.has(input.dataset.structure); });
  }

  function fillBiome(component) {
    const spec = Worldgen.configOf(component);
    selectTab('biome');
    $('biomeName').value = component.name || spec.name || '';
    $('biomeId').value = spec.id || component.registryId || '';
    $('biomeTemperature').value = spec.temperature ?? 0.8;
    $('biomeDownfall').value = spec.downfall ?? 0.4;
    $('biomePrecipitation').checked = spec.precipitation !== false;
    $('biomeSky').value = /^#[0-9a-f]{6}$/i.test(spec.skyColor || '') ? spec.skyColor : '#78a7ff';
    $('biomeFog').value = /^#[0-9a-f]{6}$/i.test(spec.fogColor || '') ? spec.fogColor : '#c0d8ff';
    $('biomeWater').value = /^#[0-9a-f]{6}$/i.test(spec.waterColor || '') ? spec.waterColor : '#3f76e4';
    $('biomeWaterFog').value = /^#[0-9a-f]{6}$/i.test(spec.waterFogColor || '') ? spec.waterFogColor : '#050533';
    $('biomeGrass').value = /^#[0-9a-f]{6}$/i.test(spec.grassColor || '') ? spec.grassColor : '#79c05a';
    $('biomeFoliage').value = /^#[0-9a-f]{6}$/i.test(spec.foliageColor || '') ? spec.foliageColor : '#59ae30';
    $('biomeFeatures').value = Worldgen.normalizeFeaturePreset(spec.featurePreset, spec.terrainPreset);
    $('biomeSpawns').value = Worldgen.normalizeSpawnPreset(spec.spawnPreset, spec.terrainPreset);
    setStructureChecks(spec.structures || []);
  }

  function terrainDefaults(terrain) {
    const defaults = Worldgen.defaultDimensionType(terrain);
    return {
      ...defaults,
      spawnY: terrain === 'void' || terrain === 'floating_islands' ? 96 : terrain === 'nether' ? 64 : 80,
      createPlatform: terrain === 'void' || terrain === 'floating_islands'
    };
  }

  function applyTerrainDefaults(force = false) {
    const terrain = Worldgen.normalizeTerrainPreset($('dimensionTerrain').value);
    const defaults = terrainDefaults(terrain);
    if (force || !$('dimensionMinY').dataset.edited) $('dimensionMinY').value = defaults.minY;
    if (force || !$('dimensionHeight').dataset.edited) $('dimensionHeight').value = defaults.height;
    if (force || !$('dimensionLogicalHeight').dataset.edited) $('dimensionLogicalHeight').value = defaults.logicalHeight;
    if (force || !$('dimensionScale').dataset.edited) $('dimensionScale').value = defaults.coordinateScale;
    if (force) {
      $('dimensionNatural').checked = defaults.natural;
      $('dimensionSkylight').checked = defaults.skylight;
      $('dimensionCeiling').checked = defaults.ceiling;
      $('dimensionUltrawarm').checked = defaults.ultrawarm;
      $('dimensionBedWorks').checked = defaults.bedWorks;
      $('dimensionAnchorWorks').checked = defaults.respawnAnchorWorks;
      $('dimensionEffects').value = defaults.effects;
      $('dimensionFixedTime').value = defaults.fixedTime ?? -1;
      $('dimensionSpawnY').value = defaults.spawnY;
      $('dimensionPlatform').checked = defaults.createPlatform;
    }
  }

  function fillDimension(component) {
    const spec = Worldgen.configOf(component);
    const terrain = Worldgen.normalizeTerrainPreset(spec.terrainPreset);
    const defaults = terrainDefaults(terrain);
    selectTab('dimension');
    $('dimensionName').value = component.name || spec.name || '';
    $('dimensionId').value = spec.id || component.registryId || '';
    $('dimensionTerrain').value = terrain;
    $('dimensionBiome').value = spec.biomeId || 'minecraft:plains';
    $('dimensionMinY').value = spec.minY ?? defaults.minY;
    $('dimensionHeight').value = spec.height ?? defaults.height;
    $('dimensionLogicalHeight').value = spec.logicalHeight ?? defaults.logicalHeight;
    $('dimensionScale').value = spec.coordinateScale ?? defaults.coordinateScale;
    $('dimensionNatural').checked = spec.natural ?? defaults.natural;
    $('dimensionSkylight').checked = spec.skylight ?? defaults.skylight;
    $('dimensionCeiling').checked = spec.ceiling ?? defaults.ceiling;
    $('dimensionUltrawarm').checked = spec.ultrawarm ?? defaults.ultrawarm;
    $('dimensionBedWorks').checked = spec.bedWorks ?? defaults.bedWorks;
    $('dimensionAnchorWorks').checked = spec.respawnAnchorWorks ?? defaults.respawnAnchorWorks;
    $('dimensionFixedTime').value = spec.fixedTime === null || spec.fixedTime === undefined ? -1 : spec.fixedTime;
    $('dimensionEffects').value = spec.effects || defaults.effects;
    $('dimensionKeyId').value = spec.travelItemId || `${spec.id || 'dimension'}_key`;
    $('dimensionKeyName').value = spec.travelItemName || `${component.name || '维度'}钥匙`;
    $('dimensionSpawnY').value = spec.spawnY ?? defaults.spawnY;
    $('dimensionPlatformBlock').value = spec.platformBlock || 'minecraft:stone';
    $('dimensionPlatform').checked = spec.createPlatform ?? defaults.createPlatform;
    ['dimensionMinY','dimensionHeight','dimensionLogicalHeight','dimensionScale'].forEach((id) => { delete $(id).dataset.edited; });
  }

  function selectedStructures() {
    return Array.from(document.querySelectorAll('[data-structure]:checked')).map((input) => input.dataset.structure);
  }

  function saveBiome(event) {
    event.preventDefault();
    const component = attachBlueprint(Worldgen.createBiomeComponent({
      name: value('biomeName') || '自定义群系', id: value('biomeId'),
      temperature: number('biomeTemperature', 0.8), downfall: number('biomeDownfall', 0.4),
      precipitation: $('biomePrecipitation').checked, skyColor: $('biomeSky').value,
      fogColor: $('biomeFog').value, waterColor: $('biomeWater').value,
      waterFogColor: $('biomeWaterFog').value, grassColor: $('biomeGrass').value,
      foliageColor: $('biomeFoliage').value, featurePreset: $('biomeFeatures').value,
      spawnPreset: $('biomeSpawns').value, structures: selectedStructures()
    }));
    replaceOrAdd(component);
    setStatus(`群系“${component.name}”已保存。`, 'good');
  }

  function saveDimension(event) {
    event.preventDefault();
    const fixed = number('dimensionFixedTime', -1);
    const component = attachBlueprint(Worldgen.createDimensionComponent({
      name: value('dimensionName') || '自定义维度', id: value('dimensionId'),
      terrainPreset: $('dimensionTerrain').value, biomeId: value('dimensionBiome') || 'minecraft:plains',
      minY: number('dimensionMinY', -64), height: number('dimensionHeight', 384),
      logicalHeight: number('dimensionLogicalHeight', 384), coordinateScale: number('dimensionScale', 1),
      natural: $('dimensionNatural').checked, skylight: $('dimensionSkylight').checked,
      ceiling: $('dimensionCeiling').checked, ultrawarm: $('dimensionUltrawarm').checked,
      bedWorks: $('dimensionBedWorks').checked, respawnAnchorWorks: $('dimensionAnchorWorks').checked,
      fixedTime: fixed < 0 ? null : fixed, effects: $('dimensionEffects').value,
      travelItemId: value('dimensionKeyId'), travelItemName: value('dimensionKeyName'),
      spawnY: number('dimensionSpawnY', 80), platformBlock: value('dimensionPlatformBlock') || 'minecraft:stone',
      createPlatform: $('dimensionPlatform').checked
    }));
    replaceOrAdd(component);
    setStatus(`维度“${component.name}”已保存。`, 'good');
  }

  function newComponent(type) {
    selectedId = '';
    ui.deleteButton.disabled = true;
    selectTab(type);
    if (type === 'biome') fillBiome(Worldgen.createBiomeComponent());
    else fillDimension(Worldgen.createDimensionComponent());
    selectedId = '';
    renderComponentList();
    setStatus(`正在新建${type === 'biome' ? '群系' : '维度'}。`);
  }

  function parsePrompt() {
    try {
      const parsed = Worldgen.parsePrompt(ui.promptInput.value, { namespace: project.namespace });
      parsed.dimension.spec.biomeId = `${project.namespace}:${parsed.biome.spec.id}`;
      parsed.dimension.spec.travelItemId = `${parsed.dimension.spec.id}_key`;
      upsertPromptPair(parsed.biome, parsed.dimension);
      fillDimension(parsed.dimension);
      setStatus(`已创建“${parsed.biome.name}”和“${parsed.dimension.name}”。`, 'good');
    } catch (error) {
      setStatus(error.message, 'error');
    }
  }

  function applyTemplate(template) {
    const prompts = {
      wasteland: '做一个叫灰烬荒原的永夜末日废土维度，有村庄、矿井和废弃传送门',
      floating: '做一个叫云海群岛的浮空岛世界，永昼并创建安全平台',
      void: '做一个叫寂静虚空的虚空维度，不生成生物并创建出生平台'
    };
    ui.promptInput.value = prompts[template] || prompts.wasteland;
    parsePrompt();
  }

  function deleteSelected() {
    if (!selectedId) return;
    const component = project.components.find((item) => item.id === selectedId);
    if (!component || !confirm(`确定删除“${component.name}”吗？`)) return;
    project.components = project.components.filter((item) => item.id !== selectedId);
    selectedId = worldgenComponents()[0]?.id || '';
    saveProject();
    render();
    setStatus('组件已删除。', 'good');
  }

  function renderDiagnostics() {
    if (!project) return;
    try {
      const ir = GF.pipeline.fromLegacyProject(project);
      const issues = GF.pipeline.validate(ir);
      const error = issues.some((issue) => issue.severity === 'error');
      let report = { biomes: [], dimensions: [], capabilities: {} };
      let fileCount = 0;
      if (!error) {
        const modId = GF.nativeForge.cleanModId(project.namespace || project.name);
        const generated = GF.nativeForge.generateFromIR(ir, {
          modId, modName: project.name,
          packageName: `com.gameforge.${modId.replace(/_/g, '')}`,
          version: '1.0.0', author: 'GameForge Creator'
        });
        report = generated.report.worldgen || report;
        fileCount = generated.files.length;
      }
      const capabilities = report.capabilities || {};
      const structureCount = (report.biomes || []).reduce((sum, biome) => sum + (biome.structures?.length || 0), 0);
      ui.metrics.innerHTML = [
        [(report.biomes || []).length, '自定义群系'],
        [(report.dimensions || []).length, '可进入维度'],
        [capabilities.travelItem ? (report.dimensions || []).length : 0, '入口钥匙'],
        [structureCount, '结构标签'],
        [fileCount, '工程文件']
      ].map(([count, label]) => `<div class="wg-metric"><strong>${count}</strong><span>${label}</span></div>`).join('');
      ui.diagnostics.innerHTML = issues.map((issue) => `<div class="wg-diagnostic ${escape(issue.severity)}">${escape(issue.message)}</div>`).join('');
      ui.irPreview.textContent = JSON.stringify({ ir, worldgenReport: report }, null, 2);
    } catch (error) {
      ui.diagnostics.innerHTML = `<div class="wg-diagnostic error">${escape(error.message)}</div>`;
      ui.irPreview.textContent = error.stack || error.message;
    }
  }

  function render() {
    updateLinks();
    renderBiomeOptions();
    renderComponentList();
    const selected = project.components.find((item) => item.id === selectedId);
    if (selected) selectComponent(selected.id);
    else {
      ui.deleteButton.disabled = true;
      selectTab(activeTab);
      renderDiagnostics();
    }
  }

  function init() {
    ui.projectSelect.addEventListener('change', () => loadProject(ui.projectSelect.value));
    $('parsePrompt').addEventListener('click', parsePrompt);
    $('newBiome').addEventListener('click', () => newComponent('biome'));
    $('newDimension').addEventListener('click', () => newComponent('dimension'));
    ui.biomeForm.addEventListener('submit', saveBiome);
    ui.dimensionForm.addEventListener('submit', saveDimension);
    ui.deleteButton.addEventListener('click', deleteSelected);
    $('refreshDiagnostics').addEventListener('click', renderDiagnostics);
    document.querySelectorAll('.wg-tabs button').forEach((button) => button.addEventListener('click', () => newComponent(button.dataset.tab)));
    document.querySelectorAll('[data-template]').forEach((button) => button.addEventListener('click', () => applyTemplate(button.dataset.template)));
    $('dimensionTerrain').addEventListener('change', () => applyTerrainDefaults(true));
    ['dimensionMinY','dimensionHeight','dimensionLogicalHeight','dimensionScale'].forEach((id) => $(id).addEventListener('input', () => { $(id).dataset.edited = 'true'; }));
    loadProjects();
  }

  init();
})();
