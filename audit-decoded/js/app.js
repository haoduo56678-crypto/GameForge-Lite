(function () {
  'use strict';

  const GF = window.GameForge;
  const Gen = GF?.generators;
  if (!GF || !Gen) throw new Error('GameForge failed to initialize.');

  const U = GF.utils;
  const $ = U.$;
  const $$ = U.$$;

  let project = GF.project.loadOrCreateActive();
  let generated = null;
  let diagnostics = [];
  let selectedFile = '';
  let currentPlan = null;
  let editingComponentId = null;
  let editingType = null;
  const textureState = { weapon: '', item: '', block: '', resource: '', forge: '' };

  const TYPE_BUTTONS = {
    weapon: ['weaponAdd', 'weaponAddTop'], item: ['itemAdd', 'itemAddTop'], block: ['blockAdd', 'blockAddTop'], mob: ['mobAdd', 'mobAddTop'],
    recipe: ['recipeAdd', 'recipeAddTop'], loot: ['lootAdd', 'lootAddTop'], function: ['functionAdd', 'functionAddTop'],
    advancement: ['advancementAdd', 'advancementAddTop'], resource: ['resourceAdd', 'resourceAddTop'], forge: ['forgeAdd', 'forgeAddTop']
  };

  function toast(title, message = '', type = 'success') {
    const region = $('toastRegion');
    if (!region) return;
    const node = document.createElement('div');
    node.className = `toast ${type === 'error' ? 'error' : type === 'warning' ? 'error' : 'success'}`;
    node.innerHTML = `<span class="toast-icon">${type === 'error' ? '!' : type === 'warning' ? '△' : '✓'}</span><div><strong>${U.escapeHtml(title)}</strong>${message ? `<p>${U.escapeHtml(message)}</p>` : ''}</div>`;
    region.appendChild(node);
    setTimeout(() => node.classList.add('out'), 2800);
    setTimeout(() => node.remove(), 3100);
  }

  function setSaveState(text) {
    if ($('saveStateText')) $('saveStateText').textContent = text;
  }

  function value(id, fallback = '') {
    const node = $(id);
    return node ? String(node.value ?? fallback) : String(fallback);
  }
  function number(id, fallback = 0) {
    const parsed = Number(value(id, fallback));
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  function checked(id) {
    return Boolean($(id)?.checked);
  }
  function setValue(id, next) {
    const node = $(id);
    if (node && next !== undefined && next !== null) node.value = String(next);
  }
  function setChecked(id, next) {
    const node = $(id);
    if (node) node.checked = Boolean(next);
  }
  function gridValues(containerId) {
    return $$(`#${containerId} input`).map((input) => input.value.trim());
  }
  function setGrid(containerId, values) {
    $$(`#${containerId} input`).forEach((input, index) => { input.value = values?.[index] || ''; });
  }

  function componentIdentity(component) {
    const spec = component?.spec || {};
    const raw = component?.type === 'forge' ? spec.modId : spec.id;
    return raw ? `${component.type}:${String(raw).toLowerCase()}` : '';
  }

  function uniqueComponent(component) {
    const next = GF.project.normalizeComponent(component);
    const spec = U.deepClone(next.spec || {});
    const field = next.type === 'forge' ? 'modId' : 'id';
    const raw = spec[field];
    if (raw) {
      const base = next.type === 'forge' ? U.cleanId(raw, 'gameforge_mod').replace(/[.-]/g, '_') : U.cleanPath(raw, 'component');
      const used = new Set(project.components.map(componentIdentity));
      let candidate = base;
      let suffix = 2;
      while (used.has(`${next.type}:${candidate.toLowerCase()}`)) candidate = `${base}_${suffix++}`;
      if (candidate !== base) {
        spec[field] = candidate;
        next.name = `${next.name} ${suffix - 1}`;
        if (next.type === 'forge' && /^com\.gameforge\./.test(String(spec.packageName || ''))) spec.packageName = `com.gameforge.${candidate}`;
      } else spec[field] = base;
    }
    if (['weapon','item','block','resource'].includes(next.type) && Number(spec.modelData) >= 1) {
      const usedModels = new Set(project.components.filter((entry) => ['weapon','item','block','resource'].includes(entry.type)).map((entry) => Number(entry.spec?.modelData)).filter(Number.isFinite));
      let modelData = Math.round(Number(spec.modelData));
      while (usedModels.has(modelData)) modelData += 1;
      spec.modelData = modelData;
    }
    next.spec = spec;
    return next;
  }

  function projectFilename(suffix) {
    const base = U.cleanId(project.namespace || project.name || 'gameforge_project', 'gameforge_project');
    return `${base}${suffix}`;
  }

  function saveProject(render = true) {
    setSaveState('正在保存…');
    project = GF.project.save(project);
    setSaveState('已自动保存');
    if (render) renderAll();
  }

  function goTo(page, updateHash = true) {
    const target = $(`page-${page}`) ? page : 'home';
    $$('.page').forEach((section) => section.classList.toggle('active', section.id === `page-${target}`));
    $$('.nav-item[data-page]').forEach((button) => button.classList.toggle('active', button.dataset.page === target));
    $('sidebar')?.classList.remove('open');
    if (updateHash) history.replaceState(null, '', `#${target}`);
    if (target === 'workspace') renderWorkspace();
    if (target === 'projects') renderProjects();
    if (target === 'diagnostics') renderDiagnostics();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function addOrUpdateComponent(type, name, spec, options = {}) {
    const normalizedName = String(name || Gen.TYPE_META[type]?.label || '组件').trim();
    if (editingComponentId && editingType === type) {
      const index = project.components.findIndex((component) => component.id === editingComponentId);
      if (index >= 0) {
        const old = project.components[index];
        project.components[index] = GF.project.normalizeComponent({ ...old, type, name: normalizedName, spec });
        toast('修改已保存', normalizedName);
      }
    } else {
      const candidate = uniqueComponent(Gen.makeComponent(type, normalizedName, spec));
      project.components.push(candidate);
      const changed = candidate.spec?.id !== spec?.id || candidate.spec?.modId !== spec?.modId || candidate.spec?.modelData !== spec?.modelData;
      toast('已加入项目', changed ? `${candidate.name}（已自动避开重复 ID / 模型编号）` : candidate.name);
    }
    editingComponentId = null;
    editingType = null;
    updateEditingButtons();
    saveProject();
    if (options.navigate !== false) goTo('workspace');
  }

  function addManyComponents(components, message = '组件已加入项目') {
    const existing = new Set(project.components.map(componentIdentity).filter(Boolean));
    const added = [];
    let skipped = 0;
    for (const raw of components) {
      const component = GF.project.normalizeComponent(raw);
      const key = componentIdentity(component);
      if (key && existing.has(key)) { skipped += 1; continue; }
      const unique = uniqueComponent(component);
      const uniqueKey = componentIdentity(unique);
      if (uniqueKey) existing.add(uniqueKey);
      project.components.push(unique);
      added.push(unique);
    }
    const detail = skipped ? `加入 ${added.length} 个，跳过 ${skipped} 个已存在组件` : `共加入 ${added.length} 个组件`;
    toast(added.length ? message : '模板已经存在', detail, added.length ? 'success' : 'warning');
    if (added.length) saveProject();
    else renderAll();
    goTo('workspace');
  }

  function updateEditingButtons() {
    for (const [type, ids] of Object.entries(TYPE_BUTTONS)) {
      ids.forEach((id) => {
        const button = $(id);
        if (!button) return;
        const active = editingComponentId && editingType === type;
        if (id.endsWith('Top')) button.textContent = active ? '保存修改' : '加入项目';
        else button.textContent = active ? '保存修改' : (type === 'weapon' || type === 'item' || type === 'block' || type === 'mob' ? '生成并加入项目' : '加入项目');
      });
    }
  }

  function ensureTexture(spec, formType, options) {
    return spec.textureBase64 || textureState[formType] || GF.texture.generateTextureBase64(options);
  }

  function renderTextureCanvases(kind, canvasIds, options) {
    const base64 = textureState[kind];
    for (const id of canvasIds) {
      const canvas = $(id);
      if (!canvas) continue;
      if (base64) GF.texture.drawBase64OnCanvas(canvas, base64).catch(() => GF.texture.drawTexturePreview(canvas, options));
      else GF.texture.drawTexturePreview(canvas, options);
    }
  }

  async function bindTextureUpload(inputId, kind, canvasIds, optionFactory) {
    const input = $(inputId);
    if (!input) return;
    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        textureState[kind] = await GF.binary.readFileAsBase64(file);
        renderTextureCanvases(kind, canvasIds, optionFactory());
        toast('纹理已载入', file.name);
      } catch (error) {
        toast('读取纹理失败', error.message, 'error');
      }
    });
  }

  function resetGeneratedTexture(kind, canvasIds, options) {
    textureState[kind] = '';
    renderTextureCanvases(kind, canvasIds, options);
  }

  function weaponOptions() {
    return { kind: value('weaponVisual', 'sword'), color: value('weaponColor', '#69d8ff'), effect: value('weaponEffect', 'lightning') };
  }
  function itemOptions() {
    return { kind: value('itemModelStyle') === 'cube' ? 'block' : 'item', color: value('itemColor', '#c886ff') };
  }
  function blockOptions() {
    return { kind: 'block', color: value('blockColor', '#48e0d1') };
  }
  function resourceOptions() {
    return { kind: value('resourceStyle') === 'cube' ? 'block' : 'item', color: value('resourceColor', '#8da6ff') };
  }
  function forgeOptions() {
    const type = value('forgeContentType', 'tool');
    return { kind: type === 'block' ? 'block' : type === 'tool' ? 'sword' : type === 'food' ? 'food' : 'item', color: value('forgeColor', '#e5395d') };
  }

  function updateWeaponPreview() {
    renderTextureCanvases('weapon', ['weaponTextureCanvas', 'weaponBigPreview', 'weaponResultIcon'], weaponOptions());
    $('weaponPreviewName').textContent = value('weaponName', '自定义武器');
    $('weaponPreviewLore').textContent = value('weaponLore', '');
    $('weaponPreviewStats').textContent = `${number('weaponDamage', 1)} 攻击伤害 · ${number('weaponCooldown', 0)} 秒冷却`;
    $('weaponRecipeResultName').textContent = value('weaponName', '自定义武器');
    $('weaponGivePreview').textContent = `/function ${U.cleanNamespace(project.namespace)}:weapon/${U.cleanId(value('weaponId'))}/give`;
    $('weaponRecipeCard').classList.toggle('hidden', !checked('weaponRecipeEnabled'));
  }

  function gatherWeapon() {
    const spec = {
      id: U.cleanId(value('weaponId'), 'custom_weapon'), name: value('weaponName', '自定义武器'), lore: value('weaponLore'), visual: value('weaponVisual', 'sword'),
      modelData: Math.max(1, Math.round(number('weaponModelData', 1001))), color: value('weaponColor', '#69d8ff'), trigger: value('weaponTrigger', 'right_click'),
      effect: value('weaponEffect', 'lightning'), damage: number('weaponDamage', 12), attackSpeed: number('weaponAttackSpeed', 1.6), cooldown: number('weaponCooldown', 5),
      range: number('weaponRange', 6), power: number('weaponPower', 3), enchant: number('weaponEnchant', 3), unbreakable: checked('weaponUnbreakable'),
      glow: checked('weaponGlow'), recipeEnabled: checked('weaponRecipeEnabled'), particles: checked('weaponParticles'), recipeGrid: gridValues('weaponCraftGrid')
    };
    spec.textureBase64 = ensureTexture(spec, 'weapon', weaponOptions());
    return spec;
  }

  function updateItemPreview() {
    renderTextureCanvases('item', ['itemTextureCanvas', 'itemResultIcon'], itemOptions());
    $('itemPreviewName').textContent = value('itemName', '自定义物品');
    $('itemPreviewLore').textContent = value('itemLore', '');
    $('itemRecipeResultName').textContent = value('itemName', '自定义物品');
  }

  function gatherItem() {
    const spec = {
      id: U.cleanId(value('itemId'), 'custom_item'), name: value('itemName', '自定义物品'), base: U.ensureMinecraftId(value('itemBase'), 'minecraft:amethyst_shard'),
      count: U.clamp(number('itemCount', 1), 1, 64), lore: value('itemLore'), style: value('itemModelStyle', 'generated'), modelData: Math.max(1, Math.round(number('itemModelData', 1101))),
      color: value('itemColor', '#c886ff'), glow: checked('itemGlow'), unbreakable: checked('itemUnbreakable'), recipeEnabled: checked('itemRecipeEnabled'), recipeGrid: gridValues('itemCraftGrid')
    };
    spec.textureBase64 = ensureTexture(spec, 'item', itemOptions());
    return spec;
  }

  function updateBlockPreview() {
    renderTextureCanvases('block', ['blockTextureCanvas'], blockOptions());
    $('blockUsePreview').textContent = `拿着${value('blockName', '自定义方块')}右键放置`;
  }

  function gatherBlock() {
    const spec = {
      id: U.cleanId(value('blockId'), 'custom_block'), name: value('blockName', '自定义方块'), carrier: U.ensureMinecraftId(value('blockCarrier'), 'minecraft:warped_fungus_on_a_stick'),
      collision: U.ensureMinecraftId(value('blockCollision'), 'minecraft:barrier'), modelData: Math.max(1, Math.round(number('blockModelData', 1201))),
      distance: U.clamp(number('blockDistance', 3), 1, 8), scale: U.clamp(number('blockScale', 1), .25, 4), color: value('blockColor', '#48e0d1'),
      glow: checked('blockGlow'), gravity: checked('blockGravity')
    };
    spec.textureBase64 = ensureTexture(spec, 'block', blockOptions());
    return spec;
  }

  function updateMobPreview() {
    $('mobPreviewName').textContent = value('mobName', '自定义生物');
    $('mobPreviewHealth').textContent = String(number('mobHealth', 20));
    $('mobPreviewDamage').textContent = String(number('mobDamage', 2));
    $('mobPreviewSpeed').textContent = String(number('mobSpeed', .25));
    $('mobBossbarFill').style.width = checked('mobBoss') ? '100%' : '0%';
    $('mobAvatar').textContent = checked('mobBoss') ? '☠' : '♜';
    $('mobSummonPreview').textContent = `/function ${U.cleanNamespace(project.namespace)}:mob/${U.cleanId(value('mobId'))}/spawn`;
  }

  function gatherMob() {
    return {
      id: U.cleanId(value('mobId'), 'custom_mob'), name: value('mobName', '自定义生物'), base: U.ensureMinecraftId(value('mobBase'), 'minecraft:zombie'),
      health: number('mobHealth', 20), damage: number('mobDamage', 2), speed: number('mobSpeed', .25), armor: number('mobArmor', 0), followRange: number('mobFollowRange', 32),
      mainHand: value('mobMainHand'), head: value('mobHead'), boss: checked('mobBoss'), glow: checked('mobGlow'), persistent: checked('mobPersistent'), silent: checked('mobSilent'), drops: value('mobDrops')
    };
  }

  function commandSpec() {
    const commandId = value('commandId', 'minecraft:stone');
    const spec = {
      type: value('commandType', 'give'), target: value('commandTarget', '@p'), id: commandId, commandId, amount: number('commandAmount', 1),
      name: value('commandName', 'GameForge'), extra: value('commandExtra', '1'), x: value('commandX', '~'), y: value('commandY', '~'), z: value('commandZ', '~'), second: value('commandSecond', '~5 ~5 ~5')
    };
    spec.command = Gen.buildCommand(spec);
    spec.idPath = U.cleanPath(`${spec.type}_${Date.now().toString(36)}`);
    return spec;
  }

  function updateCommandPreview() {
    const spec = commandSpec();
    $('commandOutput').textContent = spec.command;
    $('commandExplanation').textContent = Gen.explainCommand(spec.command);
  }

  function recipeSpec() {
    return {
      id: U.cleanPath(value('recipeId'), 'recipe'), recipeType: value('recipeType', 'shaped'), result: U.ensureMinecraftId(value('recipeResult'), 'minecraft:stone'),
      count: U.clamp(number('recipeCount', 1), 1, 64), group: value('recipeGroup'), experience: number('recipeExperience', 0), cookingTime: number('recipeCookingTime', 200), grid: gridValues('recipeCraftGrid')
    };
  }

  function updateRecipePreview() {
    const spec = recipeSpec();
    $('recipePreview').textContent = JSON.stringify(Gen.recipeFromGrid(spec), null, 2);
    $('recipeResultPreview').textContent = `${spec.result} ×${spec.count}`;
    $('recipePathPreview').textContent = `${U.cleanNamespace(project.namespace)}:${spec.id}`;
  }

  function lootSpec() {
    return { id: U.cleanPath(value('lootId'), 'loot'), tableType: Gen.normalizeLootType(value('lootType', 'entity')), entries: value('lootEntries'), killedByPlayer: checked('lootKilledByPlayer'), survivesExplosion: checked('lootSurvivesExplosion') };
  }

  function updateLootPreview() {
    const spec = lootSpec();
    const entries = Gen.parseLootEntries(spec.entries);
    $('lootEntryCount').textContent = `${entries.length} 个有效条目`;
    $('lootPreview').textContent = JSON.stringify(Gen.lootTableFromEntries(entries, { type: spec.tableType, killedByPlayer: spec.killedByPlayer && spec.tableType === 'entity', survivesExplosion: spec.survivesExplosion && spec.tableType === 'block' }), null, 2);
  }

  function functionSpec() {
    return { id: U.cleanPath(value('functionId'), 'main'), trigger: Gen.normalizeFunctionTrigger(value('functionTrigger', 'manual')), interval: Math.max(1, Math.round(number('functionInterval', 100))), commands: value('functionCommands') };
  }

  function updateFunctionPreview() {
    const spec = functionSpec();
    const cleaned = Gen.cleanFunctionCommands(spec.commands);
    $('functionLineCount').textContent = `${cleaned.split(/\n/).filter(Boolean).length} 条有效指令`;
    $('functionPreview').textContent = `${cleaned}${spec.trigger === 'interval' ? `\nschedule function ${U.cleanNamespace(project.namespace)}:function/${spec.id} ${spec.interval}t replace` : ''}`;
  }

  function advancementSpec() {
    return {
      id: U.cleanPath(value('advancementId'), 'advancement'), parent: value('advancementParent'), title: value('advancementTitle', '新进度'), icon: U.ensureMinecraftId(value('advancementIcon'), 'minecraft:nether_star'),
      description: value('advancementDescription'), frame: value('advancementFrame', 'task'), trigger: value('advancementTrigger', 'inventory_changed'), target: value('advancementTarget'), reward: value('advancementReward'),
      toast: checked('advancementToast'), announce: checked('advancementAnnounce'), hidden: checked('advancementHidden')
    };
  }

  function updateAdvancementPreview() {
    const spec = advancementSpec();
    $('advancementPreviewTitle').textContent = spec.title;
    $('advancementPreviewDescription').textContent = spec.description;
    $('advancementPreviewIcon').textContent = spec.frame === 'challenge' ? '★' : spec.frame === 'goal' ? '◆' : '◇';
    $('advancementPreview').textContent = JSON.stringify(Gen.advancementJson(spec, U.cleanNamespace(project.namespace)), null, 2);
  }

  function updateResourcePreview() {
    renderTextureCanvases('resource', ['resourceTextureCanvas'], resourceOptions());
    $('resourceCmdPreview').textContent = `/give @p ${U.ensureMinecraftId(value('resourceBase'))}{CustomModelData:${Math.max(1, Math.round(number('resourceModelData', 1301)))}}`;
  }

  function gatherResource() {
    const spec = {
      id: U.cleanId(value('resourceId'), 'resource_item'), name: value('resourceName', '资源包物品'), base: U.ensureMinecraftId(value('resourceBase'), 'minecraft:iron_sword'),
      modelData: Math.max(1, Math.round(number('resourceModelData', 1301))), style: value('resourceStyle', 'handheld'), color: value('resourceColor', '#8da6ff'),
      giveFunction: checked('resourceGiveFunction'), glow: checked('resourceGlow')
    };
    spec.textureBase64 = ensureTexture(spec, 'resource', resourceOptions());
    return spec;
  }

  function updateForgePreview() {
    $('forgePreviewName').textContent = value('forgeModName', 'GameForge Mod');
  }

  function gatherForge() {
    const spec = {
      modId: U.cleanId(value('forgeModId'), 'gameforge_mod').replace(/[.-]/g, '_'), modName: value('forgeModName', 'GameForge Mod'), packageName: value('forgePackage', 'com.gameforge.generated'),
      author: value('forgeAuthor', 'GameForge Creator'), version: value('forgeVersion', '1.0.0'), license: value('forgeLicense', 'MIT'), description: value('forgeDescription'),
      contentType: value('forgeContentType', 'tool'), registryId: U.cleanId(value('forgeRegistryId'), 'custom_item'), displayName: value('forgeDisplayName', 'Custom Item'),
      primaryStat: number('forgePrimaryStat', 10), secondaryStat: number('forgeSecondaryStat', -2.4), durability: number('forgeDurability', 1800), hardness: number('forgeHardness', 3), resistance: number('forgeResistance', 6),
      color: value('forgeColor', '#e5395d'), recipeEnabled: checked('forgeRecipeEnabled'), creativeTab: checked('forgeCreativeTab')
    };
    spec.textureBase64 = ensureTexture(spec, 'forge', forgeOptions());
    return spec;
  }

  function renderSmartPlan(plan) {
    const panel = $('smartPlan');
    if (!plan || !plan.components?.length) {
      panel.hidden = true;
      return;
    }
    panel.hidden = false;
    const first = plan.components[0];
    const meta = Gen.TYPE_META[first.type] || { label: first.type, icon: '✦', group: '' };
    $('smartPlanIcon').textContent = meta.icon;
    $('smartPlanTitle').textContent = plan.components.length > 1 ? `${meta.label}等 ${plan.components.length} 个组件` : meta.label;
    $('smartPlanSubtitle').textContent = meta.group;
    $('smartConfidence').textContent = `本地解析 ${plan.confidence}%`;
    const rows = [];
    for (const component of plan.components) {
      rows.push(`<div><span>类型</span><strong>${U.escapeHtml(Gen.TYPE_META[component.type]?.label || component.type)}</strong></div>`);
      rows.push(`<div><span>名称</span><strong>${U.escapeHtml(component.name)}</strong></div>`);
      rows.push(`<div><span>概要</span><strong>${U.escapeHtml(Gen.componentSummary(component))}</strong></div>`);
    }
    $('smartPlanGrid').innerHTML = rows.join('');
    $('smartPlanNote').textContent = plan.note;
  }

  function analyzeSmartPrompt(createImmediately = false) {
    const prompt = value('smartPrompt').trim();
    if (!prompt) {
      toast('先描述你的想法', '例如：做一把右键召唤闪电的剑。', 'warning');
      return;
    }
    currentPlan = Gen.parsePrompt(prompt, project);
    renderSmartPlan(currentPlan);
    if (createImmediately) addManyComponents(currentPlan.components, '智能创建完成');
  }

  function renderHome() {
    $('topProjectName').textContent = project.name;
    $('homeProjectName').textContent = project.name;
    $('homeComponentCount').textContent = String(project.components.length);
    $('homeFileCount').textContent = String(generated?.allFiles?.length || 0);
    const issueCount = diagnostics.filter((issue) => ['error', 'warning'].includes(issue.severity)).length;
    $('homeIssueCount').textContent = String(issueCount);
    $('homeProjectDescription').textContent = project.components.length ? `${project.description} · 当前有 ${project.components.length} 个组件。` : '还没有组件。先从上面的智能创建或模板开始。';
  }

  function renderComponentList() {
    const container = $('componentList');
    $('componentPanelSubtitle').textContent = project.components.length ? `${project.components.length} 个组件` : '还没有组件';
    $('workspaceCount').textContent = String(project.components.length);
    if (!project.components.length) {
      container.innerHTML = '<div class="empty-state"><span>＋</span><p>项目还没有组件。使用左侧工作室或首页模板开始。</p></div>';
      return;
    }
    container.innerHTML = project.components.map((component) => {
      const meta = Gen.TYPE_META[component.type] || { icon: '•', label: component.type };
      return `<article class="component-item" data-component-id="${U.escapeHtml(component.id)}"><span class="component-symbol">${U.escapeHtml(meta.icon)}</span><div><strong>${U.escapeHtml(component.name)}</strong><small>${U.escapeHtml(meta.label)} · ${U.escapeHtml(Gen.componentSummary(component))}</small></div><div class="component-actions"><button title="编辑" data-action="edit">✎</button><button title="复制" data-action="duplicate">⧉</button><button title="删除" data-action="delete">×</button></div></article>`;
    }).join('');
  }

  function filePreviewText(entry) {
    if (!entry) return '选择一个文件查看。';
    if (entry.encoding === 'base64') {
      let size = 0;
      try { size = GF.binary.base64ToBytes(entry.data).length; } catch (_) {}
      return `[二进制文件]\n路径：${entry.name}\n类型：PNG / binary\n大小：${U.humanBytes(size)}\n\n可通过右上角“下载”保存此文件。`;
    }
    return String(entry.data ?? '');
  }

  function selectGeneratedFile(path) {
    selectedFile = path;
    const entry = generated?.allFiles?.find((item) => item.name === path);
    $('selectedFilePath').textContent = entry?.name || '选择一个文件查看';
    $('selectedFileContent').textContent = filePreviewText(entry);
    $$('.file-row').forEach((row) => row.classList.toggle('active', row.dataset.path === path));
  }

  function renderFileTree() {
    const container = $('fileTree');
    const query = value('fileSearch').trim().toLowerCase();
    const files = (generated?.allFiles || []).filter((entry) => entry.name.toLowerCase().includes(query));
    $('filePanelSubtitle').textContent = `${generated?.allFiles?.length || 0} 个文件`;
    if (!files.length) {
      container.innerHTML = '<div class="empty-state compact"><span>⌕</span><p>没有匹配的文件。</p></div>';
      $('selectedFilePath').textContent = '选择一个文件查看';
      $('selectedFileContent').textContent = project.components.length ? '调整搜索条件。' : '项目生成后，文件会显示在这里。';
      return;
    }
    container.innerHTML = files.map((entry) => {
      const ext = entry.name.split('.').pop();
      const icon = entry.encoding === 'base64' ? '▧' : ['json','mcmeta'].includes(ext) ? '{}' : ext === 'mcfunction' ? 'ƒ' : ext === 'java' ? 'J' : '•';
      return `<button class="file-row ${entry.name === selectedFile ? 'active' : ''}" data-path="${U.escapeHtml(entry.name)}"><span>${icon}</span>${U.escapeHtml(entry.name)}</button>`;
    }).join('');
    if (!selectedFile || !files.some((entry) => entry.name === selectedFile)) selectGeneratedFile(files[0].name);
  }

  function renderWorkspace() {
    if (!generated) return;
    $('workspaceComponentStat').textContent = String(project.components.length);
    $('workspaceDatapackStat').textContent = String(generated.datapack.length);
    $('workspaceResourceStat').textContent = String(generated.resourcepack.length);
    $('workspaceForgeStat').textContent = String(generated.forge.length);
    $('workspaceIssueStat').textContent = String(diagnostics.filter((issue) => ['error','warning'].includes(issue.severity)).length);
    renderComponentList();
    renderFileTree();
  }

  function renderProjects() {
    setValue('projectNameInput', project.name);
    setValue('projectNamespaceInput', project.namespace);
    setValue('projectVersionInput', project.minecraftVersion);
    setValue('projectDescriptionInput', project.description);
    const projects = GF.project.list();
    $('projectStorageInfo').textContent = `${projects.length} 个本地项目${GF.project.storageAvailable ? '' : ' · 当前浏览器限制了持久存储'}`;
    $('projectGrid').innerHTML = projects.map((item) => `<article class="project-card ${item.id === project.id ? 'active' : ''}" data-project-id="${U.escapeHtml(item.id)}"><div class="project-card-top"><h3>${U.escapeHtml(item.name)}</h3><small>${U.escapeHtml(U.formatDate(item.updatedAt))}</small></div><p>${U.escapeHtml(item.description || '')}</p><div class="project-card-meta"><span>${U.escapeHtml(item.namespace)}</span><span>${item.components.length} 组件</span><span>MC ${U.escapeHtml(item.minecraftVersion)}</span></div><div class="project-card-actions"><button class="button ghost" data-project-action="open">打开</button><button class="button ghost" data-project-action="duplicate">复制</button><button class="button danger-ghost" data-project-action="delete">删除</button></div></article>`).join('');
  }

  function renderDiagnostics() {
    const errors = diagnostics.filter((issue) => issue.severity === 'error').length;
    const warnings = diagnostics.filter((issue) => issue.severity === 'warning').length;
    const score = Math.max(0, 100 - errors * 24 - warnings * 8);
    $('diagnosticScore').textContent = String(score);
    $('diagnosticSummary').style.setProperty('--score', `${score}%`);
    $('diagnosticHeadline').textContent = errors ? '发现阻止导出的问题' : warnings ? '可以测试，但有风险提示' : '项目准备就绪';
    $('diagnosticDescription').textContent = errors ? `${errors} 个错误，${warnings} 个警告。` : warnings ? `${warnings} 个警告；建议测试后再用于重要世界。` : '没有发现阻止下载的问题。';
    const count = errors + warnings;
    $('diagnosticCount').textContent = String(count);
    $('diagnosticList').innerHTML = diagnostics.map((issue) => {
      const css = issue.severity === 'error' ? 'error' : issue.severity === 'warning' ? 'warning' : 'info';
      const icon = issue.severity === 'error' ? '!' : issue.severity === 'warning' ? '△' : '✓';
      return `<article class="diag-item ${css}"><span class="diag-icon">${icon}</span><div><strong>${U.escapeHtml(issue.title)}</strong><p>${U.escapeHtml(issue.message)}</p></div></article>`;
    }).join('');
  }

  function renderAll() {
    generated = Gen.generateProject(project);
    diagnostics = Gen.diagnose(project, generated);
    renderHome();
    renderWorkspace();
    renderProjects();
    renderDiagnostics();
  }

  function downloadFiles(files, filename) {
    if (!files?.length) {
      toast('没有可下载的文件', '先向项目中加入对应类型的组件。', 'warning');
      return;
    }
    try {
      GF.zip.downloadBlob(GF.zip.makeZip(files), filename);
      toast('下载已开始', filename);
    } catch (error) {
      toast('打包失败', error.message, 'error');
    }
  }

  function downloadSelectedFile() {
    const entry = generated?.allFiles?.find((item) => item.name === selectedFile);
    if (!entry) return toast('没有选中文件', '', 'warning');
    const data = entry.encoding === 'base64' ? GF.binary.base64ToBytes(entry.data) : String(entry.data ?? '');
    const blob = new Blob([data], { type: entry.encoding === 'base64' ? 'application/octet-stream' : 'text/plain;charset=utf-8' });
    GF.zip.downloadBlob(blob, entry.name.split('/').pop());
  }

  function copySelectedFile() {
    const entry = generated?.allFiles?.find((item) => item.name === selectedFile);
    if (!entry || entry.encoding === 'base64') return toast('二进制文件不能复制为文本', '', 'warning');
    navigator.clipboard.writeText(String(entry.data)).then(() => toast('已复制文件内容')).catch(() => toast('复制失败', '浏览器没有授予剪贴板权限。', 'error'));
  }

  function populateComponent(component) {
    editingComponentId = component.id;
    editingType = component.type;
    const spec = component.spec || {};
    if (component.type === 'weapon') {
      setValue('weaponId', spec.id); setValue('weaponName', spec.name); setValue('weaponLore', spec.lore); setValue('weaponVisual', spec.visual); setValue('weaponModelData', spec.modelData); setValue('weaponColor', spec.color);
      setValue('weaponTrigger', spec.trigger); setValue('weaponEffect', spec.effect); setValue('weaponDamage', spec.damage); setValue('weaponAttackSpeed', spec.attackSpeed); setValue('weaponCooldown', spec.cooldown); setValue('weaponRange', spec.range); setValue('weaponPower', spec.power); setValue('weaponEnchant', spec.enchant);
      setChecked('weaponUnbreakable', spec.unbreakable); setChecked('weaponGlow', spec.glow); setChecked('weaponRecipeEnabled', spec.recipeEnabled); setChecked('weaponParticles', spec.particles); setGrid('weaponCraftGrid', spec.recipeGrid); textureState.weapon = spec.textureBase64 || ''; updateWeaponPreview();
    } else if (component.type === 'item') {
      setValue('itemId', spec.id); setValue('itemName', spec.name); setValue('itemBase', spec.base); setValue('itemCount', spec.count); setValue('itemLore', spec.lore); setValue('itemModelStyle', spec.style); setValue('itemModelData', spec.modelData); setValue('itemColor', spec.color);
      setChecked('itemGlow', spec.glow); setChecked('itemUnbreakable', spec.unbreakable); setChecked('itemRecipeEnabled', spec.recipeEnabled); setGrid('itemCraftGrid', spec.recipeGrid); textureState.item = spec.textureBase64 || ''; updateItemPreview();
    } else if (component.type === 'block') {
      setValue('blockId', spec.id); setValue('blockName', spec.name); setValue('blockCarrier', spec.carrier); setValue('blockCollision', spec.collision); setValue('blockModelData', spec.modelData); setValue('blockDistance', spec.distance); setValue('blockScale', spec.scale); setValue('blockColor', spec.color);
      setChecked('blockGlow', spec.glow); setChecked('blockGravity', spec.gravity); textureState.block = spec.textureBase64 || ''; updateBlockPreview();
    } else if (component.type === 'mob') {
      setValue('mobId', spec.id); setValue('mobName', spec.name); setValue('mobBase', spec.base); setValue('mobHealth', spec.health); setValue('mobDamage', spec.damage); setValue('mobSpeed', spec.speed); setValue('mobArmor', spec.armor); setValue('mobFollowRange', spec.followRange); setValue('mobMainHand', spec.mainHand); setValue('mobHead', spec.head); setValue('mobDrops', spec.drops);
      setChecked('mobBoss', spec.boss); setChecked('mobGlow', spec.glow); setChecked('mobPersistent', spec.persistent); setChecked('mobSilent', spec.silent); updateMobPreview();
    } else if (component.type === 'recipe') {
      setValue('recipeId', spec.id); setValue('recipeType', spec.recipeType); setValue('recipeResult', spec.result); setValue('recipeCount', spec.count); setValue('recipeGroup', spec.group); setValue('recipeExperience', spec.experience); setValue('recipeCookingTime', spec.cookingTime); setGrid('recipeCraftGrid', spec.grid); updateRecipePreview();
    } else if (component.type === 'loot') {
      setValue('lootId', spec.id); setValue('lootType', Gen.normalizeLootType(spec.tableType)); setValue('lootEntries', spec.entries); setChecked('lootKilledByPlayer', spec.killedByPlayer); setChecked('lootSurvivesExplosion', spec.survivesExplosion); updateLootPreview();
    } else if (component.type === 'function') {
      setValue('functionId', spec.id); setValue('functionTrigger', Gen.normalizeFunctionTrigger(spec.trigger)); setValue('functionInterval', spec.interval); setValue('functionCommands', spec.commands); updateFunctionPreview();
    } else if (component.type === 'advancement') {
      setValue('advancementId', spec.id); setValue('advancementParent', spec.parent); setValue('advancementTitle', spec.title); setValue('advancementIcon', spec.icon); setValue('advancementDescription', spec.description); setValue('advancementFrame', spec.frame); setValue('advancementTrigger', spec.trigger); setValue('advancementTarget', spec.target); setValue('advancementReward', spec.reward);
      setChecked('advancementToast', spec.toast); setChecked('advancementAnnounce', spec.announce); setChecked('advancementHidden', spec.hidden); updateAdvancementPreview();
    } else if (component.type === 'resource') {
      setValue('resourceId', spec.id); setValue('resourceName', spec.name); setValue('resourceBase', spec.base); setValue('resourceModelData', spec.modelData); setValue('resourceStyle', spec.style); setValue('resourceColor', spec.color); setChecked('resourceGiveFunction', spec.giveFunction); setChecked('resourceGlow', spec.glow); textureState.resource = spec.textureBase64 || ''; updateResourcePreview();
    } else if (component.type === 'forge') {
      setValue('forgeModId', spec.modId); setValue('forgeModName', spec.modName); setValue('forgePackage', spec.packageName); setValue('forgeAuthor', spec.author); setValue('forgeVersion', spec.version); setValue('forgeLicense', spec.license); setValue('forgeDescription', spec.description); setValue('forgeContentType', spec.contentType); setValue('forgeRegistryId', spec.registryId); setValue('forgeDisplayName', spec.displayName); setValue('forgePrimaryStat', spec.primaryStat); setValue('forgeSecondaryStat', spec.secondaryStat); setValue('forgeDurability', spec.durability); setValue('forgeHardness', spec.hardness); setValue('forgeResistance', spec.resistance); setValue('forgeColor', spec.color); setChecked('forgeRecipeEnabled', spec.recipeEnabled); setChecked('forgeCreativeTab', spec.creativeTab); textureState.forge = spec.textureBase64 || ''; updateForgePreview();
    } else if (component.type === 'command') {
      const specCommand = spec.command || '';
      $('commandOutput').textContent = specCommand;
      $('commandExplanation').textContent = Gen.explainCommand(specCommand);
    }
    updateEditingButtons();
    goTo(component.type === 'command' ? 'command' : component.type);
    toast('正在编辑', component.name);
  }

  function bindAddButtons() {
    ['weaponAdd','weaponAddTop'].forEach((id) => $(id)?.addEventListener('click', () => { const spec = gatherWeapon(); addOrUpdateComponent('weapon', spec.name, spec); }));
    ['itemAdd','itemAddTop'].forEach((id) => $(id)?.addEventListener('click', () => { const spec = gatherItem(); addOrUpdateComponent('item', spec.name, spec); }));
    ['blockAdd','blockAddTop'].forEach((id) => $(id)?.addEventListener('click', () => { const spec = gatherBlock(); addOrUpdateComponent('block', spec.name, spec); }));
    ['mobAdd','mobAddTop'].forEach((id) => $(id)?.addEventListener('click', () => { const spec = gatherMob(); addOrUpdateComponent('mob', spec.name, spec); }));
    ['recipeAdd','recipeAddTop'].forEach((id) => $(id)?.addEventListener('click', () => { const spec = recipeSpec(); addOrUpdateComponent('recipe', spec.id, spec); }));
    ['lootAdd','lootAddTop'].forEach((id) => $(id)?.addEventListener('click', () => { const spec = lootSpec(); addOrUpdateComponent('loot', spec.id, spec); }));
    ['functionAdd','functionAddTop'].forEach((id) => $(id)?.addEventListener('click', () => { const spec = functionSpec(); addOrUpdateComponent('function', spec.id, spec); }));
    ['advancementAdd','advancementAddTop'].forEach((id) => $(id)?.addEventListener('click', () => { const spec = advancementSpec(); addOrUpdateComponent('advancement', spec.title, spec); }));
    ['resourceAdd','resourceAddTop'].forEach((id) => $(id)?.addEventListener('click', () => { const spec = gatherResource(); addOrUpdateComponent('resource', spec.name, spec); }));
    ['forgeAdd','forgeAddTop'].forEach((id) => $(id)?.addEventListener('click', () => { const spec = gatherForge(); addOrUpdateComponent('forge', spec.modName, spec); }));
  }

  function bindPreviewInputs() {
    const bind = (selector, handler) => $$(selector).forEach((node) => node.addEventListener('input', handler));
    bind('#page-weapon input, #page-weapon select', updateWeaponPreview);
    bind('#page-item input, #page-item select', updateItemPreview);
    bind('#page-block input, #page-block select', updateBlockPreview);
    bind('#page-mob input, #page-mob select, #page-mob textarea', updateMobPreview);
    bind('#page-command input, #page-command select', updateCommandPreview);
    bind('#page-recipe input, #page-recipe select', updateRecipePreview);
    bind('#page-loot input, #page-loot select, #page-loot textarea', updateLootPreview);
    bind('#page-function input, #page-function select, #page-function textarea', updateFunctionPreview);
    bind('#page-advancement input, #page-advancement select', updateAdvancementPreview);
    bind('#page-resource input, #page-resource select', updateResourcePreview);
    bind('#page-forge input, #page-forge select', updateForgePreview);
  }

  function bindNavigation() {
    $$('.nav-item[data-page]').forEach((button) => button.addEventListener('click', () => goTo(button.dataset.page)));
    $$('[data-go]').forEach((button) => button.addEventListener('click', () => goTo(button.dataset.go)));
    $('mobileNavToggle')?.addEventListener('click', () => $('sidebar')?.classList.toggle('open'));
    $('openWorkspaceTop')?.addEventListener('click', () => goTo('workspace'));
    $('newProjectTop')?.addEventListener('click', createNewProject);
    const hash = location.hash.replace('#', '');
    if (hash) goTo(hash, false);
  }

  function createNewProject() {
    const count = GF.project.list().length + 1;
    project = GF.project.save(GF.project.create({ name: `GameForge 项目 ${count}`, namespace: `gameforge_${count}` }));
    editingComponentId = null;
    editingType = null;
    selectedFile = '';
    renderAll();
    goTo('home');
    toast('新项目已创建', project.name);
  }

  function bindProjects() {
    $('createProjectButton')?.addEventListener('click', createNewProject);
    $('saveProjectSettings')?.addEventListener('click', () => {
      project.name = value('projectNameInput', project.name).trim() || project.name;
      project.namespace = U.cleanNamespace(value('projectNamespaceInput'), project.namespace);
      project.description = value('projectDescriptionInput');
      saveProject();
      toast('项目信息已保存');
    });
    $('exportCurrentProject')?.addEventListener('click', () => {
      GF.zip.downloadBlob(new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' }), projectFilename('.gameforge.json'));
      toast('项目 JSON 已导出');
    });
    $('importProjectButton')?.addEventListener('click', () => $('importProjectInput')?.click());
    $('importProjectInput')?.addEventListener('change', async () => {
      const file = $('importProjectInput').files?.[0];
      if (!file) return;
      try {
        const parsed = JSON.parse(await file.text());
        const imported = GF.project.normalize(parsed);
        imported.id = U.uid('project');
        imported.name = `${imported.name}（导入）`;
        project = GF.project.save(imported);
        renderAll();
        toast('项目导入成功', project.name);
      } catch (error) {
        toast('项目导入失败', error.message, 'error');
      } finally {
        $('importProjectInput').value = '';
      }
    });
    $('deleteCurrentProject')?.addEventListener('click', () => {
      if (!confirm(`确定删除“${project.name}”吗？此操作不能撤销。`)) return;
      GF.project.delete(project.id);
      project = GF.project.loadOrCreateActive();
      renderAll();
      toast('项目已删除');
    });
    $('projectGrid')?.addEventListener('click', (event) => {
      const button = event.target.closest('[data-project-action]');
      const card = event.target.closest('[data-project-id]');
      if (!button || !card) return;
      const target = GF.project.get(card.dataset.projectId);
      if (!target) return;
      const action = button.dataset.projectAction;
      if (action === 'open') {
        project = target;
        GF.project.setActive(project.id);
        renderAll();
        toast('项目已打开', project.name);
      } else if (action === 'duplicate') {
        project = GF.project.duplicate(target);
        renderAll();
        toast('项目已复制', project.name);
      } else if (action === 'delete') {
        if (!confirm(`确定删除“${target.name}”吗？`)) return;
        GF.project.delete(target.id);
        if (target.id === project.id) project = GF.project.loadOrCreateActive();
        renderAll();
      }
    });
  }

  function bindWorkspace() {
    $('componentList')?.addEventListener('click', (event) => {
      const actionButton = event.target.closest('[data-action]');
      const card = event.target.closest('[data-component-id]');
      if (!actionButton || !card) return;
      const index = project.components.findIndex((component) => component.id === card.dataset.componentId);
      if (index < 0) return;
      const component = project.components[index];
      if (actionButton.dataset.action === 'edit') populateComponent(component);
      else if (actionButton.dataset.action === 'duplicate') {
        const clone = uniqueComponent(Gen.makeComponent(component.type, `${component.name} 副本`, U.deepClone(component.spec)));
        project.components.splice(index + 1, 0, clone);
        saveProject();
        toast('组件已复制', clone.name);
      } else if (actionButton.dataset.action === 'delete') {
        project.components.splice(index, 1);
        saveProject();
        toast('组件已删除', component.name);
      }
    });
    $('clearComponents')?.addEventListener('click', () => {
      if (!project.components.length || !confirm('确定清空当前项目的全部组件吗？')) return;
      project.components = [];
      selectedFile = '';
      saveProject();
    });
    $('fileSearch')?.addEventListener('input', renderFileTree);
    $('fileTree')?.addEventListener('click', (event) => {
      const row = event.target.closest('[data-path]');
      if (row) selectGeneratedFile(row.dataset.path);
    });
    $('copySelectedFile')?.addEventListener('click', copySelectedFile);
    $('downloadSelectedFile')?.addEventListener('click', downloadSelectedFile);
    $('downloadDatapack')?.addEventListener('click', () => downloadFiles(generated.datapack, projectFilename('-datapack.zip')));
    $('downloadResourcepack')?.addEventListener('click', () => downloadFiles(generated.resourcepack, projectFilename('-resourcepack.zip')));
    $('downloadForge')?.addEventListener('click', () => downloadFiles(generated.forge, projectFilename('-forge-source.zip')));
    $('downloadProjectSource')?.addEventListener('click', () => downloadFiles(generated.bundle, projectFilename('-complete.zip')));
    $('downloadBundleWorkspace')?.addEventListener('click', () => downloadFiles(generated.bundle, projectFilename('-complete.zip')));
    $('downloadBundleTop')?.addEventListener('click', () => downloadFiles(generated.bundle, projectFilename('-complete.zip')));
  }

  function bindDiagnostics() {
    $('runDiagnostics')?.addEventListener('click', () => { renderAll(); toast('诊断已完成'); });
    $('runSelfTests')?.addEventListener('click', async () => {
      const container = $('selfTestList');
      container.innerHTML = '<div class="empty-state compact"><span>…</span><p>正在运行核心生成器测试。</p></div>';
      const results = await Gen.selfTests();
      container.innerHTML = results.map((result) => `<article class="test-item ${result.status}"><span class="test-icon">${result.status === 'pass' ? '✓' : '!'}</span><div><strong>${U.escapeHtml(result.name)}</strong><p>${U.escapeHtml(result.message)}</p></div></article>`).join('');
      const failed = results.filter((result) => result.status === 'fail').length;
      toast(failed ? '自测发现问题' : '全部自测通过', failed ? `${failed} 项失败` : `${results.length} 项通过`, failed ? 'error' : 'success');
    });
    $('analyzeLog')?.addEventListener('click', () => {
      const results = Gen.analyzeLog(value('logInput'));
      $('logResults').innerHTML = results.length ? results.map((result) => `<article class="log-result"><strong>${U.escapeHtml(result.title)}</strong><p>${U.escapeHtml(result.advice)}</p></article>`).join('') : '<div class="empty-state compact"><span>⌕</span><p>请先粘贴报错内容。</p></div>';
    });
  }

  function bindMisc() {
    $('smartAnalyze')?.addEventListener('click', () => analyzeSmartPrompt(false));
    $('smartCreate')?.addEventListener('click', () => analyzeSmartPrompt(true));
    $$('.prompt-examples [data-prompt]').forEach((button) => button.addEventListener('click', () => { setValue('smartPrompt', button.dataset.prompt); analyzeSmartPrompt(false); }));
    $$('[data-template]').forEach((button) => button.addEventListener('click', () => addManyComponents(Gen.templateComponents(button.dataset.template), '模板已加入')));
    $('generateCommand')?.addEventListener('click', updateCommandPreview);
    $('copyCommand')?.addEventListener('click', () => navigator.clipboard.writeText($('commandOutput').textContent).then(() => toast('指令已复制')).catch(() => toast('复制失败', '', 'error')));
    $('commandExplain')?.addEventListener('click', () => { $('commandExplanation').textContent = Gen.explainCommand($('commandOutput').textContent); });
    $('addCommandToProject')?.addEventListener('click', () => { const spec = commandSpec(); spec.id = U.cleanPath(`${spec.type}_${Date.now().toString(36)}`); addOrUpdateComponent('command', `${spec.type} 指令`, spec); });
    $('lootValidateLines')?.addEventListener('click', () => { updateLootPreview(); toast('掉落条目已检查', $('lootEntryCount').textContent); });
    $('functionClean')?.addEventListener('click', () => { setValue('functionCommands', Gen.cleanFunctionCommands(value('functionCommands'))); updateFunctionPreview(); toast('函数已整理'); });
    $('weaponGenerateTexture')?.addEventListener('click', () => resetGeneratedTexture('weapon', ['weaponTextureCanvas','weaponBigPreview','weaponResultIcon'], weaponOptions()));
    $('itemGenerateTexture')?.addEventListener('click', () => resetGeneratedTexture('item', ['itemTextureCanvas','itemResultIcon'], itemOptions()));
    $('blockGenerateTexture')?.addEventListener('click', () => resetGeneratedTexture('block', ['blockTextureCanvas'], blockOptions()));
    $('resourceGenerateTexture')?.addEventListener('click', () => resetGeneratedTexture('resource', ['resourceTextureCanvas'], resourceOptions()));
    $$('.guide-tabs [data-guide]').forEach((button) => button.addEventListener('click', () => {
      $$('.guide-tabs [data-guide]').forEach((item) => item.classList.toggle('active', item === button));
      $$('.guide-content').forEach((content) => content.classList.toggle('active', content.id === `guide-${button.dataset.guide}`));
    }));
    $$('[data-clean="id"]').forEach((input) => input.addEventListener('blur', () => { input.value = U.cleanId(input.value); }));
    $$('[data-clean="path"]').forEach((input) => input.addEventListener('blur', () => { input.value = U.cleanPath(input.value); }));
  }

  async function initialize() {
    bindNavigation();
    bindAddButtons();
    bindPreviewInputs();
    bindProjects();
    bindWorkspace();
    bindDiagnostics();
    bindMisc();
    await bindTextureUpload('weaponTexture', 'weapon', ['weaponTextureCanvas','weaponBigPreview','weaponResultIcon'], weaponOptions);
    await bindTextureUpload('itemTexture', 'item', ['itemTextureCanvas','itemResultIcon'], itemOptions);
    await bindTextureUpload('blockTexture', 'block', ['blockTextureCanvas'], blockOptions);
    await bindTextureUpload('resourceTexture', 'resource', ['resourceTextureCanvas'], resourceOptions);
    await bindTextureUpload('forgeTexture', 'forge', [], forgeOptions);
    updateWeaponPreview();
    updateItemPreview();
    updateBlockPreview();
    updateMobPreview();
    updateCommandPreview();
    updateRecipePreview();
    updateLootPreview();
    updateFunctionPreview();
    updateAdvancementPreview();
    updateResourcePreview();
    updateForgePreview();
    updateEditingButtons();
    renderAll();
    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('./sw.js').catch(() => {});
  }

  document.addEventListener('DOMContentLoaded', initialize);
})();
