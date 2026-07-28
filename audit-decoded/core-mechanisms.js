'use strict';

(() => {
  const GF = window.GameForge;
  const Gen = GF?.generators;
  const U = GF?.utils;
  if (!GF || !Gen || !U || Gen.__coreMechanismsInstalled) return;

  const CORE_VERSION = '1.1.0';
  const originalGenerateProject = Gen.generateProject.bind(Gen);
  const originalDiagnose = Gen.diagnose.bind(Gen);
  const originalSelfTests = Gen.selfTests.bind(Gen);

  function textFile(name, data, extra = {}) {
    return { name, data: String(data ?? ''), encoding: 'utf8', ...extra };
  }

  function jsonFile(name, value, extra = {}) {
    return textFile(name, `${JSON.stringify(value, null, 2)}\n`, extra);
  }

  function parseJsonEntry(entry, fallback = {}) {
    if (!entry || typeof entry.data !== 'string') return U.deepClone(fallback);
    try { return JSON.parse(entry.data); }
    catch { return U.deepClone(fallback); }
  }

  function upsert(map, entry) {
    map.set(entry.name, entry);
  }

  function mergeFunctionTag(map, type, functionId) {
    const path = `data/minecraft/tags/functions/${type}.json`;
    const current = parseJsonEntry(map.get(path), { replace: false, values: [] });
    const values = Array.isArray(current.values) ? current.values.slice() : [];
    if (!values.includes(functionId)) values.push(functionId);
    upsert(map, jsonFile(path, { replace: Boolean(current.replace), values }));
  }

  function snbtString(value) {
    return JSON.stringify(String(value ?? ''));
  }

  function textComponentString(text, color = 'white', italic = false) {
    return JSON.stringify(JSON.stringify({ text: String(text ?? ''), color, italic }));
  }

  function visualBase(visual) {
    if (visual === 'axe') return 'minecraft:diamond_axe';
    if (visual === 'staff' || visual === 'wand') return 'minecraft:blaze_rod';
    if (visual === 'hammer') return 'minecraft:iron_axe';
    if (visual === 'dagger') return 'minecraft:iron_sword';
    return 'minecraft:diamond_sword';
  }

  function customItemNbt(project, component, kind = 'resource') {
    const namespace = U.cleanNamespace(project.namespace);
    const spec = component.spec || {};
    const id = U.cleanId(spec.id || component.name, 'custom_item');
    const name = spec.name || component.name || id;
    const modelData = Math.max(1, Math.round(Number(spec.modelData) || 1301));
    const parts = [
      `gameforge:{id:${snbtString(`${namespace}:${kind}:${id}`)},kind:${snbtString(kind)}}`,
      `display:{Name:${textComponentString(name, 'aqua', false)},Lore:[${textComponentString('由 GameForge 核心运行时提供', 'gray', false)}]}`,
      `CustomModelData:${modelData}`
    ];
    if (spec.glow !== false) parts.push('Enchantments:[{id:"minecraft:unbreaking",lvl:1s}]', 'HideFlags:1');
    return `{${parts.join(',')}}`;
  }

  function targetSelector(spec) {
    const range = U.clamp(spec?.range || 6, 1, 30);
    return `@e[type=!minecraft:player,type=!minecraft:item,type=!minecraft:experience_orb,type=!minecraft:armor_stand,distance=..${range},sort=nearest,limit=1]`;
  }

  function effectRequiresTarget(effect) {
    return ['lightning', 'fire', 'explosion', 'poison', 'freeze'].includes(effect);
  }

  function effectCommands(spec) {
    const effect = spec?.effect || 'none';
    const range = U.clamp(spec?.range || 6, 1, 30);
    const power = U.clamp(spec?.power || 1, 1, 10);
    const target = targetSelector(spec);
    const lines = [];
    if (effect === 'lightning') lines.push(`execute as ${target} at @s run summon minecraft:lightning_bolt ~ ~ ~`);
    else if (effect === 'fire') lines.push(`execute as ${target} run data merge entity @s {Fire:${Math.round(power * 50)}s}`);
    else if (effect === 'explosion') lines.push(`execute as ${target} at @s run summon minecraft:creeper ~ ~ ~ {Fuse:0s,ignited:1b,ExplosionRadius:${U.clamp(power, 1, 10)}b}`);
    else if (effect === 'poison') lines.push(`effect give ${target} minecraft:poison ${Math.max(2, Math.round(power * 2))} ${Math.min(4, Math.max(0, Math.floor(power / 2)))} true`);
    else if (effect === 'freeze') lines.push(`effect give ${target} minecraft:slowness ${Math.max(2, Math.round(power * 2))} ${Math.min(10, power)} true`, `execute as ${target} run data merge entity @s {TicksFrozen:${Math.min(300, Math.round(power * 35))}}`);
    else if (effect === 'heal') lines.push(`effect give @s minecraft:instant_health 1 ${Math.min(4, Math.max(0, power - 1))} true`);
    else if (effect === 'dash') lines.push(`tp @s ^ ^ ^${Math.max(2, Number(power) + 2)}`);
    else if (effect === 'summon_wolf') {
      const wolfTag = `gf_temp_wolf_${U.hashString(spec?.id || spec?.name || 'guardian_wolf')}`;
      lines.push(
        `summon minecraft:wolf ~ ~ ~ {Tags:["${wolfTag}"],PersistenceRequired:1b,CustomName:${textComponentString(`${spec?.name || '武器'}的守护狼`, 'aqua', false)}}`,
        `data modify entity @e[type=minecraft:wolf,tag=${wolfTag},sort=nearest,limit=1,distance=..3] Owner set from entity @s UUID`,
        `tag @e[type=minecraft:wolf,tag=${wolfTag},sort=nearest,limit=1,distance=..3] remove ${wolfTag}`
      );
    }
    if (spec?.particles !== false) {
      lines.push('particle minecraft:electric_spark ~ ~1 ~ 0.6 0.6 0.6 0.08 35 force @a[distance=..32]');
      lines.push('playsound minecraft:block.amethyst_block.chime player @a[distance=..32] ~ ~ ~ 1 1.2');
    }
    return lines;
  }

  function tellraw(parts) {
    return `tellraw @s ${JSON.stringify(['', ...parts])}`;
  }

  function textPart(text, color = 'gray', extra = {}) {
    return { text: String(text), color, ...extra };
  }

  function triggerButton(label, objective, code, color, hover) {
    return {
      text: `[${label}]`, color, bold: true,
      clickEvent: { action: 'run_command', value: `/trigger ${objective} set ${code}` },
      hoverEvent: { action: 'show_text', contents: { text: hover, color: 'gray' } }
    };
  }

  function runtimeAction(code, component, label, functionId, buttonLabel, color = 'green', description = '') {
    return { code, componentId: component?.id || null, componentType: component?.type || 'runtime', label, functionId, buttonLabel, color, description };
  }

  function recipeExists(project) {
    return project.components.some((component) => {
      if (component.type === 'recipe') return true;
      if (['weapon', 'item'].includes(component.type)) return component.spec?.recipeEnabled !== false;
      return false;
    });
  }

  function ensureResourceGive(datapackMap, project, component) {
    const namespace = U.cleanNamespace(project.namespace);
    const spec = component.spec || {};
    const id = U.cleanId(spec.id || component.name, 'resource_item');
    const path = `data/${namespace}/functions/resource/${id}/give.mcfunction`;
    if (datapackMap.has(path)) return `${namespace}:resource/${id}/give`;
    const base = U.ensureMinecraftId(spec.base || 'minecraft:iron_sword');
    const nbt = customItemNbt(project, component, 'resource');
    upsert(datapackMap, textFile(path, `give @s ${base}${nbt} 1\ntitle @s actionbar ${JSON.stringify({ text: `${spec.name || component.name} 已获得`, color: 'aqua' })}\n`));
    return `${namespace}:resource/${id}/give`;
  }

  function patchWeaponMechanics(datapackMap, project, component) {
    const namespace = U.cleanNamespace(project.namespace);
    const spec = component.spec || {};
    const id = U.cleanId(spec.id || component.name, 'custom_weapon');
    const root = `weapon/${id}`;
    const trigger = spec.trigger || 'right_click';
    const effect = spec.effect || 'none';
    if (effect === 'none') return;

    const cooldownObjective = U.objectiveName(`${namespace}:${root}:cooldown`, 'gfc');
    const cooldownTicks = Math.max(trigger === 'passive' ? 20 : 0, Math.round((Number(spec.cooldown) || 0) * 20));
    const selector = targetSelector(spec);
    const tryPath = `data/${namespace}/functions/${root}/try_activate.mcfunction`;

    if (trigger !== 'passive' && datapackMap.has(tryPath)) {
      const lines = [
        `execute if score @s ${cooldownObjective} matches 1.. run title @s actionbar ${JSON.stringify({ text: '技能冷却中', color: 'red' })}`
      ];
      if (effectRequiresTarget(effect)) {
        lines.push(`execute unless score @s ${cooldownObjective} matches 1.. if entity ${selector} run function ${namespace}:${root}/activate`);
        lines.push(`execute unless score @s ${cooldownObjective} matches 1.. unless entity ${selector} run title @s actionbar ${JSON.stringify({ text: '附近没有可作用的目标', color: 'yellow' })}`);
      } else {
        lines.push(`execute unless score @s ${cooldownObjective} matches 1.. run function ${namespace}:${root}/activate`);
      }
      upsert(datapackMap, textFile(tryPath, `${lines.join('\n')}\n`));
    }

    if (trigger !== 'passive') return;

    const baseItem = visualBase(spec.visual);
    const loadPath = `data/${namespace}/functions/${root}/load.mcfunction`;
    const tickPath = `data/${namespace}/functions/${root}/tick.mcfunction`;
    const activatePath = `data/${namespace}/functions/${root}/activate.mcfunction`;
    const heldNbt = `nbt={SelectedItem:{id:"${baseItem}",tag:{gameforge:{id:"${namespace}:weapon:${id}"}}}}`;
    const heldSelector = `@a[${heldNbt}]`;
    const readyHeldSelector = `@a[scores={${cooldownObjective}=0},${heldNbt}]`;
    const activation = [
      ...effectCommands(spec),
      `scoreboard players set @s ${cooldownObjective} ${cooldownTicks}`,
      `title @s actionbar ${JSON.stringify({ text: `✦ ${spec.name || component.name}的被动技能已触发`, color: 'aqua' })}`
    ];
    upsert(datapackMap, textFile(activatePath, `${activation.join('\n')}\n`));
    upsert(datapackMap, textFile(loadPath, `scoreboard objectives add ${cooldownObjective} dummy\n`));
    const passiveRun = effectRequiresTarget(effect)
      ? `execute as ${readyHeldSelector} at @s if entity ${selector} run function ${namespace}:${root}/activate`
      : `execute as ${readyHeldSelector} at @s run function ${namespace}:${root}/activate`;
    upsert(datapackMap, textFile(tickPath, `scoreboard players add ${heldSelector} ${cooldownObjective} 0\nscoreboard players remove @a[scores={${cooldownObjective}=1..}] ${cooldownObjective} 1\n${passiveRun}\n`));
    mergeFunctionTag(datapackMap, 'load', `${namespace}:${root}/load`);
    mergeFunctionTag(datapackMap, 'tick', `${namespace}:${root}/tick`);
  }

  function patchBlockMechanics(datapackMap, project, component) {
    const namespace = U.cleanNamespace(project.namespace);
    const spec = component.spec || {};
    const id = U.cleanId(spec.id || component.name, 'custom_block');
    const root = `block/${id}`;
    const carrier = U.ensureMinecraftId(spec.carrier || 'minecraft:warped_fungus_on_a_stick');
    const modelData = Math.max(1, Math.round(Number(spec.modelData) || 1201));
    const placeAtPath = `data/${namespace}/functions/${root}/place_at.mcfunction`;
    const original = datapackMap.get(placeAtPath)?.data || '';
    if (original && !original.includes('gamemode=creative')) {
      const consume = `execute unless entity @s[gamemode=creative] run clear @s ${carrier}{gameforge:{id:"${namespace}:block:${id}"},CustomModelData:${modelData}} 1`;
      upsert(datapackMap, textFile(placeAtPath, `${original.trimEnd()}\n${consume}\ntitle @s actionbar ${JSON.stringify({ text: `${spec.name || component.name} 已放置`, color: 'green' })}\n`));
    }
    const removePath = `data/${namespace}/functions/${root}/remove.mcfunction`;
    const givePath = `${namespace}:${root}/give`;
    upsert(datapackMap, textFile(removePath, [
      `execute unless entity @e[tag=gf.block.${namespace}.${id},sort=nearest,limit=1,distance=..6] run title @s actionbar ${JSON.stringify({ text: '附近没有可移除的装饰方块', color: 'yellow' })}`,
      `execute if entity @e[tag=gf.block.${namespace}.${id},sort=nearest,limit=1,distance=..6] run function ${givePath}`,
      `execute if entity @e[tag=gf.block.${namespace}.${id},sort=nearest,limit=1,distance=..6] run title @s actionbar ${JSON.stringify({ text: `${spec.name || component.name} 已回收`, color: 'aqua' })}`,
      `execute as @e[tag=gf.block.${namespace}.${id},sort=nearest,limit=1,distance=..6] at @s run setblock ~ ~ ~ minecraft:air`,
      `kill @e[tag=gf.block.${namespace}.${id},sort=nearest,limit=1,distance=..6]`
    ].join('\n') + '\n'));
  }

  function buildRuntime(project, datapackMap) {
    const namespace = U.cleanNamespace(project.namespace);
    const triggerObjective = U.objectiveName(`${namespace}:gameforge:menu`, 'gfm');
    const readyTag = `gf_${U.hashString(`${namespace}:${CORE_VERSION}`).slice(0, 8)}_ready`;
    const recipePrefix = `data/${namespace}/recipes/`;
    const recipeIds = Array.from(datapackMap.keys())
      .filter((path) => path.startsWith(recipePrefix) && path.endsWith('.json'))
      .map((path) => `${namespace}:${path.slice(recipePrefix.length, -'.json'.length)}`)
      .sort();
    const hasRecipes = recipeIds.length > 0;
    const actions = [];
    const getAll = [];
    const spawnAll = [];
    const cleanup = [];
    const uninstallObjectives = [triggerObjective];
    let nextCode = 100;

    const addAction = (component, label, functionId, buttonLabel, color = 'green', description = '') => {
      const action = runtimeAction(nextCode, component, label, functionId, buttonLabel, color, description);
      actions.push(action);
      nextCode += 1;
      return action;
    };

    for (const component of project.components) {
      const spec = component.spec || {};
      if (component.type === 'weapon') {
        const id = U.cleanId(spec.id || component.name, 'custom_weapon');
        const give = `${namespace}:weapon/${id}/give`;
        addAction(component, spec.name || component.name, give, '获取', 'green', '获得自定义武器');
        getAll.push(`function ${give}`);
        patchWeaponMechanics(datapackMap, project, component);
        if (spec.effect && spec.effect !== 'none' && spec.trigger !== 'passive') {
          uninstallObjectives.push(U.objectiveName(`${namespace}:weapon/${id}:cooldown`, 'gfc'));
          if ((spec.trigger || 'right_click') === 'right_click') uninstallObjectives.push(U.objectiveName(`${namespace}:weapon/${id}:use`, 'gfu'));
        } else if (spec.trigger === 'passive' && spec.effect && spec.effect !== 'none') {
          uninstallObjectives.push(U.objectiveName(`${namespace}:weapon/${id}:cooldown`, 'gfc'));
        }
      } else if (component.type === 'item') {
        const id = U.cleanId(spec.id || component.name, 'custom_item');
        const give = `${namespace}:item/${id}/give`;
        addAction(component, spec.name || component.name, give, '获取', 'green', '获得自定义物品');
        getAll.push(`function ${give}`);
      } else if (component.type === 'block') {
        const id = U.cleanId(spec.id || component.name, 'custom_block');
        const give = `${namespace}:block/${id}/give`;
        const remove = `${namespace}:block/${id}/remove`;
        addAction(component, spec.name || component.name, give, '获取', 'green', '获得装饰方块物品');
        addAction(component, spec.name || component.name, remove, '回收最近', 'yellow', '回收六格内最近的同类装饰方块');
        getAll.push(`function ${give}`);
        patchBlockMechanics(datapackMap, project, component);
        cleanup.push(`execute as @e[tag=gf.block.${namespace}.${id}] at @s run setblock ~ ~ ~ minecraft:air`, `kill @e[tag=gf.block.${namespace}.${id}]`);
        uninstallObjectives.push(U.objectiveName(`${namespace}:block/${id}:use`, 'gfb'));
      } else if (component.type === 'mob') {
        const id = U.cleanId(spec.id || component.name, 'custom_mob');
        const spawn = `${namespace}:mob/${id}/spawn`;
        const clear = `${namespace}:mob/${id}/clear`;
        addAction(component, spec.name || component.name, spawn, '召唤', 'red', '在玩家位置召唤生物');
        addAction(component, spec.name || component.name, clear, '清除', 'yellow', '清除该项目生成的同类生物');
        spawnAll.push(`function ${spawn}`);
        cleanup.push(`function ${clear}`);
      } else if (component.type === 'command') {
        const id = U.cleanPath(spec.id || 'command');
        addAction(component, component.name || id, `${namespace}:command/${id}`, '运行', 'aqua', '运行生成的指令函数');
      } else if (component.type === 'function') {
        const id = U.cleanPath(spec.id || 'main');
        addAction(component, component.name || id, `${namespace}:function/${id}`, '运行', 'aqua', '手动运行此函数一次');
      } else if (component.type === 'recipe') {
        const id = U.cleanPath(spec.id || 'recipe');
        const helper = `gameforge/actions/recipe_${U.cleanId(id.replaceAll('/', '_'), 'recipe')}`;
        upsert(datapackMap, textFile(`data/${namespace}/functions/${helper}.mcfunction`, `recipe give @s ${namespace}:${id}\ntitle @s actionbar ${JSON.stringify({ text: `${component.name || id} 配方已解锁`, color: 'green' })}\n`));
        addAction(component, component.name || id, `${namespace}:${helper}`, '解锁配方', 'green', '把配方加入玩家的配方书');
      } else if (component.type === 'loot') {
        const id = U.cleanPath(spec.id || 'loot');
        const type = Gen.normalizeLootType ? Gen.normalizeLootType(spec.tableType) : (spec.tableType || 'entity');
        const folder = type === 'entity' ? 'entities' : type === 'block' ? 'blocks' : type === 'chest' ? 'chests' : 'gameplay';
        const safeHelperId = U.cleanId(id.replaceAll('/', '_'), 'loot');
        const testHelper = `gameforge/actions/loot_${safeHelperId}_test`;
        upsert(datapackMap, textFile(`data/${namespace}/functions/${testHelper}.mcfunction`, `loot give @s loot ${namespace}:${folder}/${id}\ntitle @s actionbar ${JSON.stringify({ text: `${component.name || id} 已测试`, color: 'aqua' })}\n`));
        addAction(component, component.name || id, `${namespace}:${testHelper}`, '测试掉落', 'aqua', '直接把该掉落表的结果给予玩家');
        if (type === 'entity') {
          const applyHelper = `gameforge/actions/loot_${safeHelperId}_apply_entity`;
          upsert(datapackMap, textFile(`data/${namespace}/functions/${applyHelper}.mcfunction`, [
            `execute unless entity @e[type=!minecraft:player,type=!minecraft:item,type=!minecraft:experience_orb,distance=..8,sort=nearest,limit=1] run title @s actionbar ${JSON.stringify({ text: '附近没有可应用掉落表的实体', color: 'yellow' })}`,
            `execute if entity @e[type=!minecraft:player,type=!minecraft:item,type=!minecraft:experience_orb,distance=..8,sort=nearest,limit=1] run title @s actionbar ${JSON.stringify({ text: '已应用到最近实体', color: 'green' })}`,
            `execute as @e[type=!minecraft:player,type=!minecraft:item,type=!minecraft:experience_orb,distance=..8,sort=nearest,limit=1] run data merge entity @s {DeathLootTable:"${namespace}:${folder}/${id}"}`
          ].join('\n') + '\n'));
          addAction(component, component.name || id, `${namespace}:${applyHelper}`, '应用最近实体', 'yellow', '把掉落表写入八格内最近实体');
        } else if (type === 'chest') {
          const applyHelper = `gameforge/actions/loot_${safeHelperId}_apply_chest`;
          upsert(datapackMap, textFile(`data/${namespace}/functions/${applyHelper}.mcfunction`, `data merge block ~ ~-1 ~ {LootTable:"${namespace}:${folder}/${id}"}\ntitle @s actionbar ${JSON.stringify({ text: '已把掉落表写入脚下容器', color: 'green' })}\n`));
          addAction(component, component.name || id, `${namespace}:${applyHelper}`, '应用脚下容器', 'yellow', '站在箱子上点击，把掉落表写入容器');
        }
      } else if (component.type === 'advancement') {
        const id = U.cleanPath(spec.id || 'advancement');
        const safeId = U.cleanId(id.replaceAll('/', '_'), 'advancement');
        const grantHelper = `gameforge/actions/advancement_${safeId}_grant`;
        const revokeHelper = `gameforge/actions/advancement_${safeId}_revoke`;
        upsert(datapackMap, textFile(`data/${namespace}/functions/${grantHelper}.mcfunction`, `advancement grant @s only ${namespace}:${id}\n`));
        upsert(datapackMap, textFile(`data/${namespace}/functions/${revokeHelper}.mcfunction`, `advancement revoke @s only ${namespace}:${id}\n`));
        addAction(component, component.name || id, `${namespace}:${grantHelper}`, '授予', 'green', '授予此进度');
        addAction(component, component.name || id, `${namespace}:${revokeHelper}`, '撤销', 'yellow', '撤销此进度');
      } else if (component.type === 'resource') {
        const give = ensureResourceGive(datapackMap, project, component);
        addAction(component, spec.name || component.name, give, '获取', 'green', '获得带有自定义模型的资源物品');
        getAll.push(`function ${give}`);
      }
    }

    const globalCodes = { menu: 1, getAll: 2, spawnAll: 3, cleanup: 4, doctor: 5 };
    const menuLines = [
      tellraw([textPart(`✦ ${project.name}`, 'aqua', { bold: true })]),
      tellraw([textPart(`GameForge 核心 ${CORE_VERSION} · ${project.components.length} 个组件`, 'gray')]),
      tellraw([
        triggerButton('全部获取', triggerObjective, globalCodes.getAll, 'green', '获得项目中的全部武器、物品和装饰方块'), textPart(' '),
        triggerButton('全部召唤', triggerObjective, globalCodes.spawnAll, 'red', '召唤项目中的全部生物与 Boss'), textPart(' '),
        triggerButton('清理生成物', triggerObjective, globalCodes.cleanup, 'yellow', '清理项目生成的实体与装饰方块'), textPart(' '),
        triggerButton('自检', triggerObjective, globalCodes.doctor, 'aqua', '检查项目核心运行时')
      ])
    ];

    for (const component of project.components) {
      const componentActions = actions.filter((action) => action.componentId === component.id);
      if (!componentActions.length) continue;
      const parts = [textPart(`• ${component.name || component.type} `, 'white')];
      componentActions.forEach((action, index) => {
        if (index) parts.push(textPart(' '));
        parts.push(triggerButton(action.buttonLabel, triggerObjective, action.code, action.color, action.description || action.label));
      });
      menuLines.push(tellraw(parts));
    }
    menuLines.push(tellraw([textPart('提示：菜单按钮使用 /trigger，普通玩家也可以点击。', 'dark_gray')]));
    menuLines.push(`scoreboard players enable @s ${triggerObjective}`);

    const playerInit = [
      `tag @s add ${readyTag}`,
      `scoreboard players enable @s ${triggerObjective}`,
      ...recipeIds.map((recipeId) => `recipe give @s ${recipeId}`),
      tellraw([textPart(`${project.name} 已加载。`, 'green'), textPart(' 点击下面菜单即可获取和测试内容。', 'gray')]),
      `function ${namespace}:gameforge/menu`
    ];

    const load = [
      `execute unless data storage ${namespace}:gameforge runtime.initialized run scoreboard objectives add ${triggerObjective} trigger`,
      `data modify storage ${namespace}:gameforge runtime.initialized set value 1b`,
      `data modify storage ${namespace}:gameforge runtime.version set value ${snbtString(CORE_VERSION)}`,
      `data modify storage ${namespace}:gameforge runtime.project set value ${snbtString(project.name)}`,
      `scoreboard players enable @a ${triggerObjective}`,
      ...recipeIds.map((recipeId) => `recipe give @a ${recipeId}`),
      `execute as @a[tag=!${readyTag}] run function ${namespace}:gameforge/player_init`
    ];

    const tick = [
      `execute as @a[tag=!${readyTag}] run function ${namespace}:gameforge/player_init`,
      `execute as @a[scores={${triggerObjective}=${globalCodes.menu}}] run function ${namespace}:gameforge/menu`,
      `execute as @a[scores={${triggerObjective}=${globalCodes.getAll}}] run function ${namespace}:gameforge/get_all`,
      `execute as @a[scores={${triggerObjective}=${globalCodes.spawnAll}}] at @s run function ${namespace}:gameforge/spawn_all`,
      `execute as @a[scores={${triggerObjective}=${globalCodes.cleanup}}] at @s run function ${namespace}:gameforge/cleanup`,
      `execute as @a[scores={${triggerObjective}=${globalCodes.doctor}}] run function ${namespace}:gameforge/doctor`,
      ...actions.map((action) => `execute as @a[scores={${triggerObjective}=${action.code}}] at @s run function ${action.functionId}`),
      `scoreboard players set @a[scores={${triggerObjective}=1..}] ${triggerObjective} 0`,
      `scoreboard players enable @a ${triggerObjective}`
    ];

    const getAllLines = getAll.length
      ? [...getAll, `title @s actionbar ${JSON.stringify({ text: '已获得项目中的全部可获取内容', color: 'green' })}`]
      : [tellraw([textPart('这个项目没有可直接获取的物品组件。', 'yellow')])];
    const spawnAllLines = spawnAll.length
      ? [...spawnAll, `title @s actionbar ${JSON.stringify({ text: '已召唤项目中的全部生物', color: 'red' })}`]
      : [tellraw([textPart('这个项目没有生物或 Boss 组件。', 'yellow')])];
    const cleanupLines = cleanup.length
      ? [...cleanup, `title @s actionbar ${JSON.stringify({ text: '项目生成物已清理', color: 'yellow' })}`]
      : [tellraw([textPart('这个项目没有需要清理的实体或装饰方块。', 'gray')])];

    const doctorLines = [
      tellraw([textPart('GameForge 自检', 'aqua', { bold: true })]),
      `execute if data storage ${namespace}:gameforge runtime.initialized run ${tellraw([textPart('✓ 核心存储存在', 'green')])}`,
      `execute unless data storage ${namespace}:gameforge runtime.initialized run ${tellraw([textPart('✗ 核心存储缺失，请执行 /reload', 'red')])}`,
      `execute if score @s ${triggerObjective} matches 0.. run ${tellraw([textPart('✓ 玩家触发器已启用', 'green')])}`,
      `execute unless score @s ${triggerObjective} matches 0.. run ${tellraw([textPart('✗ 玩家触发器未启用', 'red')])}`,
      tellraw([textPart(`✓ 项目组件：${project.components.length}`, 'green')]),
      tellraw([textPart(`✓ 获取动作：${getAll.length} · 召唤动作：${spawnAll.length} · 菜单动作：${actions.length}`, 'green')]),
      tellraw([textPart(`重新打开菜单：/trigger ${triggerObjective} set 1`, 'gray')])
    ];

    const uninstallLines = [
      `function ${namespace}:gameforge/cleanup`,
      ...recipeIds.map((recipeId) => `recipe take @a ${recipeId}`),
      `tag @a remove ${readyTag}`,
      ...U.unique(uninstallObjectives).map((objective) => `scoreboard objectives remove ${objective}`),
      `data remove storage ${namespace}:gameforge runtime`,
      `tellraw @a ${JSON.stringify({ text: `${project.name} 的运行时状态已清理；移除 JAR/数据包后重进世界即可彻底卸载。`, color: 'yellow' })}`
    ];

    upsert(datapackMap, textFile(`data/${namespace}/functions/gameforge/menu.mcfunction`, `${menuLines.join('\n')}\n`));
    upsert(datapackMap, textFile(`data/${namespace}/functions/gameforge/help.mcfunction`, `function ${namespace}:gameforge/menu\n`));
    upsert(datapackMap, textFile(`data/${namespace}/functions/gameforge/player_init.mcfunction`, `${playerInit.join('\n')}\n`));
    upsert(datapackMap, textFile(`data/${namespace}/functions/gameforge/load.mcfunction`, `${load.join('\n')}\n`));
    upsert(datapackMap, textFile(`data/${namespace}/functions/gameforge/tick.mcfunction`, `${tick.join('\n')}\n`));
    upsert(datapackMap, textFile(`data/${namespace}/functions/gameforge/get_all.mcfunction`, `${getAllLines.join('\n')}\n`));
    upsert(datapackMap, textFile(`data/${namespace}/functions/gameforge/spawn_all.mcfunction`, `${spawnAllLines.join('\n')}\n`));
    upsert(datapackMap, textFile(`data/${namespace}/functions/gameforge/cleanup.mcfunction`, `${cleanupLines.join('\n')}\n`));
    upsert(datapackMap, textFile(`data/${namespace}/functions/gameforge/doctor.mcfunction`, `${doctorLines.join('\n')}\n`));
    upsert(datapackMap, textFile(`data/${namespace}/functions/gameforge/uninstall.mcfunction`, `${uninstallLines.join('\n')}\n`));
    upsert(datapackMap, jsonFile(`data/${namespace}/gameforge/runtime.json`, {
      version: CORE_VERSION,
      project: project.name,
      namespace,
      triggerObjective,
      readyTag,
      actions: actions.map(({ code, componentId, componentType, label, functionId, buttonLabel }) => ({ code, componentId, componentType, label, functionId, buttonLabel }))
    }));
    mergeFunctionTag(datapackMap, 'load', `${namespace}:gameforge/load`);
    mergeFunctionTag(datapackMap, 'tick', `${namespace}:gameforge/tick`);

    return { triggerObjective, readyTag, actions, hasRecipes };
  }

  function augmentProject(generated) {
    const project = generated?.project;
    if (!project || !project.components?.length) return generated;
    if (generated.coreRuntime?.version === CORE_VERSION) return generated;

    const lowCodeComponents = project.components.filter((component) => component.type !== 'forge');
    if (!lowCodeComponents.length) return generated;

    const datapackMap = new Map((generated.datapack || []).map((entry) => [entry.name, { ...entry }]));
    const runtime = buildRuntime(project, datapackMap);
    const namespace = U.cleanNamespace(project.namespace);

    const readme = [
      `项目：${project.name}`,
      'Minecraft Java：1.20.1',
      `命名空间：${namespace}`,
      `GameForge 核心：${CORE_VERSION}`,
      '',
      '安装后无需去创造物品栏寻找自定义内容。第一次进入世界会自动显示可点击菜单。',
      `重新打开菜单：/function ${namespace}:gameforge/menu`,
      `普通玩家菜单：/trigger ${runtime.triggerObjective} set 1`,
      `全部获取：/function ${namespace}:gameforge/get_all`,
      `全部召唤：/function ${namespace}:gameforge/spawn_all`,
      `清理生成物：/function ${namespace}:gameforge/cleanup`,
      `运行时自检：/function ${namespace}:gameforge/doctor`,
      `清理运行时状态：/function ${namespace}:gameforge/uninstall`,
      '',
      '自定义物品使用原版载体 + CustomModelData；菜单与配方负责获取，不会作为全新注册物品出现在创造栏。'
    ].join('\n');
    upsert(datapackMap, textFile('README_GAMEFORGE.txt', `${readme}\n`));

    const datapack = Array.from(datapackMap.values()).sort((a, b) => a.name.localeCompare(b.name));
    generated.datapack = datapack;

    const bundleMap = new Map((generated.bundle || []).filter((entry) => !entry.name.startsWith('datapack/')).map((entry) => [entry.name, { ...entry }]));
    for (const entry of datapack) {
      upsert(bundleMap, { ...entry, name: `datapack/${entry.name}`, group: 'datapack' });
    }

    const manifestEntry = bundleMap.get('manifest.json');
    const manifest = parseJsonEntry(manifestEntry, {});
    manifest.runtime = {
      version: CORE_VERSION,
      menuFunction: `${namespace}:gameforge/menu`,
      triggerObjective: runtime.triggerObjective,
      actions: runtime.actions.map(({ code, componentType, label, functionId, buttonLabel }) => ({ code, componentType, label, functionId, buttonLabel }))
    };
    manifest.outputs = { ...(manifest.outputs || {}), datapack: datapack.length };
    upsert(bundleMap, jsonFile('manifest.json', manifest, { group: 'project' }));

    const firstReadme = [
      `GameForge 完整项目：${project.name}`,
      '',
      '- 推荐：使用网站“一键 Forge JAR”，把 JAR 放入 PCL 的 mods 文件夹。',
      '- 也可以分别安装 datapack 与 resourcepack。',
      '- 第一次进入世界会自动打开游戏内菜单。',
      `- 菜单函数：/function ${namespace}:gameforge/menu`,
      `- 普通玩家：/trigger ${runtime.triggerObjective} set 1`,
      '- project.json：可重新导入 GameForge。',
      '',
      '请先在复制的测试世界运行爆炸、传送和高频函数。'
    ].join('\n');
    upsert(bundleMap, textFile('README_FIRST.txt', `${firstReadme}\n`, { group: 'project' }));

    const bundle = Array.from(bundleMap.values());
    generated.bundle = bundle;
    generated.allFiles = bundle;
    generated.coreRuntime = { version: CORE_VERSION, ...runtime };
    return generated;
  }

  Gen.generateProject = function patchedGenerateProject(projectInput) {
    return augmentProject(originalGenerateProject(projectInput));
  };

  Gen.diagnose = function patchedDiagnose(projectInput, generatedInput) {
    const generated = generatedInput?.coreRuntime ? generatedInput : Gen.generateProject(projectInput);
    const issues = originalDiagnose(projectInput, generated).filter((issue) => issue.title !== '核心结构检查通过');
    const namespace = U.cleanNamespace(generated.project.namespace);
    const required = [
      `data/${namespace}/functions/gameforge/menu.mcfunction`,
      `data/${namespace}/functions/gameforge/player_init.mcfunction`,
      `data/${namespace}/functions/gameforge/load.mcfunction`,
      `data/${namespace}/functions/gameforge/tick.mcfunction`,
      `data/${namespace}/functions/gameforge/doctor.mcfunction`,
      'data/minecraft/tags/functions/load.json',
      'data/minecraft/tags/functions/tick.json'
    ];
    const paths = new Set((generated.datapack || []).map((entry) => entry.name));
    const missing = required.filter((path) => !paths.has(path));
    if (missing.length) issues.push({ severity: 'error', title: '游戏内核心机制缺失', message: missing.join('、'), sourceId: null });
    else issues.push({ severity: 'success', title: '游戏内核心机制齐全', message: `菜单、普通玩家触发器、首次进入初始化、配方解锁、获取/召唤/清理与自检均已生成，共 ${generated.coreRuntime?.actions?.length || 0} 个菜单动作。`, sourceId: null });
    if (!issues.some((issue) => issue.severity === 'error')) issues.push({ severity: 'success', title: '核心结构检查通过', message: `已检查 ${generated.datapack.length + generated.resourcepack.length + generated.forge.length} 个输出文件。`, sourceId: null });
    return issues;
  };

  Gen.selfTests = async function patchedSelfTests() {
    const results = await originalSelfTests();
    const test = async (name, fn) => {
      try { await fn(); results.push({ status: 'pass', name, message: '通过' }); }
      catch (error) { results.push({ status: 'fail', name, message: error?.message || String(error) }); }
    };

    await test('游戏内菜单、触发器与首次进入初始化', () => {
      const project = GF.project.create({
        name: 'Runtime Test', namespace: 'gf_runtime',
        components: Gen.templateComponents('thunder_blade')
      });
      const generated = Gen.generateProject(project);
      const names = new Set(generated.datapack.map((entry) => entry.name));
      for (const required of [
        'data/gf_runtime/functions/gameforge/menu.mcfunction',
        'data/gf_runtime/functions/gameforge/player_init.mcfunction',
        'data/gf_runtime/functions/gameforge/load.mcfunction',
        'data/gf_runtime/functions/gameforge/tick.mcfunction'
      ]) if (!names.has(required)) throw new Error(`缺少 ${required}`);
      if ((generated.coreRuntime?.triggerObjective || '').length > 16) throw new Error('Trigger objective 超过 16 字符');
      const menu = generated.datapack.find((entry) => entry.name.endsWith('/gameforge/menu.mcfunction'))?.data || '';
      if (!menu.includes('/trigger ') || !menu.includes('[获取]')) throw new Error('菜单没有普通玩家可用的获取按钮');
    });

    await test('被动武器会自动生成冷却与 Tick 机制', () => {
      const component = Gen.makeComponent('weapon', '寒冰守护', {
        id: 'frost_guard', name: '寒冰守护', visual: 'sword', modelData: 1009,
        trigger: 'passive', effect: 'freeze', damage: 9, attackSpeed: 1.6,
        cooldown: 3, range: 5, power: 2, recipeEnabled: false
      });
      const generated = Gen.generateProject(GF.project.create({ namespace: 'gf_passive', components: [component] }));
      for (const path of [
        'data/gf_passive/functions/weapon/frost_guard/load.mcfunction',
        'data/gf_passive/functions/weapon/frost_guard/tick.mcfunction',
        'data/gf_passive/functions/weapon/frost_guard/activate.mcfunction'
      ]) if (!generated.datapack.some((entry) => entry.name === path)) throw new Error(`被动武器缺少 ${path}`);
    });

    await test('全部组件都有可发现的游戏内动作', () => {
      const components = [
        Gen.makeComponent('weapon', '测试剑', { id: 'test_sword', name: '测试剑', visual: 'sword', modelData: 1010, trigger: 'right_click', effect: 'lightning', damage: 8, attackSpeed: 1.6, cooldown: 2, range: 5, power: 1, recipeEnabled: true }),
        Gen.makeComponent('item', '测试物品', { id: 'test_item', name: '测试物品', base: 'minecraft:amethyst_shard', modelData: 1110, count: 1, recipeEnabled: true }),
        Gen.makeComponent('block', '测试方块', { id: 'test_block', name: '测试方块', carrier: 'minecraft:warped_fungus_on_a_stick', modelData: 1210, collision: 'minecraft:barrier', scale: 1 }),
        Gen.makeComponent('mob', '测试 Boss', { id: 'test_boss', name: '测试 Boss', base: 'minecraft:zombie', health: 40, damage: 5, speed: .25, armor: 2, followRange: 32, boss: true, drops: 'minecraft:diamond,100,1,1' }),
        Gen.makeComponent('recipe', '测试配方', { id: 'test_recipe', recipeType: 'shapeless', grid: ['minecraft:stone'], result: 'minecraft:diamond', count: 1 }),
        Gen.makeComponent('loot', '测试掉落', { id: 'test_loot', tableType: 'entity', entries: 'minecraft:diamond,100,1,1' }),
        Gen.makeComponent('command', '测试指令', { id: 'test_command', command: '/say hello' }),
        Gen.makeComponent('function', '测试函数', { id: 'test_function', trigger: 'manual', commands: 'say hello' }),
        Gen.makeComponent('advancement', '测试进度', { id: 'test_advancement', title: '测试进度', description: 'test', icon: 'minecraft:diamond', trigger: 'inventory_changed', target: 'minecraft:stone' }),
        Gen.makeComponent('resource', '测试资源', { id: 'test_resource', name: '测试资源', base: 'minecraft:stick', modelData: 1310, style: 'handheld', giveFunction: false })
      ];
      const generated = Gen.generateProject(GF.project.create({ namespace: 'gf_actions', components }));
      if ((generated.coreRuntime?.actions?.length || 0) < 12) throw new Error('菜单动作数量不足');
      for (const required of [
        'data/gf_actions/functions/resource/test_resource/give.mcfunction',
        'data/gf_actions/functions/gameforge/actions/loot_test_loot_test.mcfunction',
        'data/gf_actions/functions/gameforge/actions/recipe_test_recipe.mcfunction'
      ]) if (!generated.datapack.some((entry) => entry.name === required)) throw new Error(`缺少 ${required}`);
    });

    return results;
  };

  Gen.__coreMechanismsInstalled = true;
})();
