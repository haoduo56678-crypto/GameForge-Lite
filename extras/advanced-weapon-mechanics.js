'use strict';

(() => {
  const GF = window.GameForge;
  const Gen = GF?.generators;
  if (!GF || !Gen || Gen.__advancedWeaponMechanicsInstalled) return;

  const U = GF.utils;
  const originalParsePrompt = Gen.parsePrompt.bind(Gen);
  const originalGenerateProject = Gen.generateProject.bind(Gen);
  const originalDiagnose = Gen.diagnose.bind(Gen);
  const originalSelfTests = Gen.selfTests.bind(Gen);

  const VERSION = '1.0.0';
  const RUNTIME_EFFECTS = new Set([
    'instant_kill', 'execute', 'damage_multiplier', 'bonus_damage', 'lifesteal',
    'knockback', 'wither', 'lightning', 'fire', 'poison', 'freeze', 'explosion'
  ]);

  const EFFECT_LABELS = Object.freeze({
    instant_kill: '一击必杀',
    execute: '低生命斩杀',
    damage_multiplier: '倍率伤害',
    bonus_damage: '额外伤害',
    lifesteal: '生命偷取',
    knockback: '强力击退',
    wither: '凋零',
    lightning: '召唤闪电',
    fire: '点燃目标',
    poison: '使目标中毒',
    freeze: '冻结目标',
    explosion: '命中爆炸'
  });

  const TARGET_LABELS = Object.freeze({
    any: '任意生物',
    undead: '亡灵生物',
    hostile: '敌对生物',
    aquatic: '水生生物',
    arthropod: '节肢生物',
    illager: '灾厄村民',
    animal: '动物',
    boss: 'Boss',
    player: '玩家'
  });

  const SPECIFIC_TARGETS = [
    [/(?:僵尸村民|殭屍村民|zombie\s*villager)/i, 'minecraft:zombie_villager', '僵尸村民'],
    [/(?:僵尸猪灵|殭屍豬布林|zombified\s*piglin)/i, 'minecraft:zombified_piglin', '僵尸猪灵'],
    [/(?:凋灵骷髅|凋靈骷髏|wither\s*skeleton)/i, 'minecraft:wither_skeleton', '凋灵骷髅'],
    [/(?:远古守卫者|遠古守衛者|elder\s*guardian)/i, 'minecraft:elder_guardian', '远古守卫者'],
    [/(?:末影龙|終界龍|ender\s*dragon)/i, 'minecraft:ender_dragon', '末影龙'],
    [/(?:洞穴蜘蛛|cave\s*spider)/i, 'minecraft:cave_spider', '洞穴蜘蛛'],
    [/(?:骷髅|骷髏|skeleton)/i, 'minecraft:skeleton', '骷髅'],
    [/(?:流浪者|stray)/i, 'minecraft:stray', '流浪者'],
    [/(?:僵尸|殭屍|zombie)/i, 'minecraft:zombie', '僵尸'],
    [/(?:尸壳|屍殼|husk)/i, 'minecraft:husk', '尸壳'],
    [/(?:溺尸|沉屍|drowned)/i, 'minecraft:drowned', '溺尸'],
    [/(?:幻翼|phantom)/i, 'minecraft:phantom', '幻翼'],
    [/(?:凋灵|凋靈|wither)/i, 'minecraft:wither', '凋灵'],
    [/(?:蜘蛛|spider)/i, 'minecraft:spider', '蜘蛛'],
    [/(?:苦力怕|爬行者|creeper)/i, 'minecraft:creeper', '苦力怕'],
    [/(?:掠夺者|掠奪者|pillager)/i, 'minecraft:pillager', '掠夺者'],
    [/(?:卫道士|衛道士|vindicator)/i, 'minecraft:vindicator', '卫道士'],
    [/(?:唤魔者|喚魔者|evoker)/i, 'minecraft:evoker', '唤魔者'],
    [/(?:守卫者|守衛者|guardian)/i, 'minecraft:guardian', '守卫者'],
    [/(?:史莱姆|史萊姆|slime)/i, 'minecraft:slime', '史莱姆'],
    [/(?:恶魂|惡魂|ghast)/i, 'minecraft:ghast', '恶魂']
  ];

  function normalizeText(value) {
    return String(value || '')
      .normalize('NFKC')
      .replace(/[，、；]/g, ',')
      .replace(/[。！？]/g, '.')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function explicitNumber(text, patterns) {
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const value = Number(match[1]);
        if (Number.isFinite(value)) return value;
      }
    }
    return null;
  }

  function extractDirectWeaponName(text) {
    const patterns = [
      /(?:做|制作|製作|创建|創建|生成|整|造|来|來)\s*(?:一|1)?\s*(?:把|个|個)?\s*([^,.]{1,32}?)(?=\s*(?:,|\.|可以|能|会|會|用来|用來|命中|攻击|攻擊|右键|右鍵|左键|左鍵|秒杀|秒殺|一击|一擊|对|對|只|$))/i,
      /(?:make|create|generate)\s+(?:an?\s+)?([^,.]{1,32}?)(?=\s+(?:that|which|with|to|for)|[,.$])/i
    ];
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (!match) continue;
      const name = match[1]
        .replace(/^(?:叫做?|名为|名為|named|called)\s*/i, '')
        .trim();
      if (name && !/^(?:一个|一把|武器|剑|劍|刀)$/i.test(name)) return name;
    }
    return '';
  }

  function parseTarget(text) {
    const specific = SPECIFIC_TARGETS.find(([pattern]) => pattern.test(text));
    if (specific) return { group: 'specific', entity: specific[1], label: specific[2] };
    if (/(?:亡灵|亡靈|不死(?:系|生物)?|undead)/i.test(text)) return { group: 'undead', entity: '', label: TARGET_LABELS.undead };
    if (/(?:节肢|節肢|蜘蛛类|蜘蛛類|arthropod)/i.test(text)) return { group: 'arthropod', entity: '', label: TARGET_LABELS.arthropod };
    if (/(?:水生|海洋生物|水下生物|aquatic|sea\s*creature)/i.test(text)) return { group: 'aquatic', entity: '', label: TARGET_LABELS.aquatic };
    if (/(?:灾厄村民|災厄村民|袭击者|襲擊者|illager|raider)/i.test(text)) return { group: 'illager', entity: '', label: TARGET_LABELS.illager };
    if (/(?:敌对生物|敵對生物|怪物|hostile\s*(?:mob|creature)?|monster)/i.test(text)) return { group: 'hostile', entity: '', label: TARGET_LABELS.hostile };
    if (/(?:动物|動物|被动生物|被動生物|animal|passive\s*mob)/i.test(text)) return { group: 'animal', entity: '', label: TARGET_LABELS.animal };
    if (/(?:Boss|首领|首領|头目|頭目)/i.test(text)) return { group: 'boss', entity: '', label: TARGET_LABELS.boss };
    if (/(?:玩家|player)/i.test(text)) return { group: 'player', entity: '', label: TARGET_LABELS.player };
    return { group: 'any', entity: '', label: TARGET_LABELS.any };
  }

  function parseAdvancedEffect(text) {
    if (/(?:秒杀|秒殺|一击必杀|一擊必殺|一刀秒|直接杀死|直接殺死|instant\s*kill|one[ -]?shot)/i.test(text)) return { effect: 'instant_kill' };

    const threshold = explicitNumber(text, [
      /(?:生命|血量|health|hp)[^\d]{0,12}(\d+(?:\.\d+)?)\s*%[^,.]{0,16}(?:斩杀|斬殺|处决|處決|execute)/i,
      /(?:低于|低於|少于|少於|below|under)\s*(\d+(?:\.\d+)?)\s*%[^,.]{0,16}(?:斩杀|斬殺|处决|處決|execute)/i,
      /(?:斩杀|斬殺|处决|處決|execute)[^\d]{0,16}(\d+(?:\.\d+)?)\s*%/i
    ]);
    if (threshold !== null || /(?:斩杀|斬殺|处决|處決|execute\s+low)/i.test(text)) {
      return { effect: 'execute', executeThreshold: Math.min(1, Math.max(0.01, (threshold ?? 20) / 100)) };
    }

    const multiplier = explicitNumber(text, [
      /(?:造成|打出|deal)?\s*(\d+(?:\.\d+)?)\s*(?:倍|x)\s*(?:伤害|傷害|damage)/i,
      /(?:伤害|傷害|damage)\s*(?:变成|變成|为|為|x|×)?\s*(\d+(?:\.\d+)?)\s*(?:倍|x)/i
    ]);
    if (multiplier !== null || /(?:双倍伤害|雙倍傷害|double\s*damage|三倍伤害|三倍傷害|triple\s*damage)/i.test(text)) {
      const fallback = /(?:三倍|triple)/i.test(text) ? 3 : 2;
      return { effect: 'damage_multiplier', damageMultiplier: Math.min(100, Math.max(0.1, multiplier ?? fallback)) };
    }

    const bonus = explicitNumber(text, [
      /(?:额外|額外|追加|bonus)\s*(\d+(?:\.\d+)?)\s*(?:点|點)?\s*(?:伤害|傷害|damage)/i,
      /(?:增加|加)\s*(\d+(?:\.\d+)?)\s*(?:点|點)?\s*(?:伤害|傷害)/i
    ]);
    if (bonus !== null) return { effect: 'bonus_damage', bonusDamage: Math.min(2048, Math.max(0, bonus)) };

    const lifesteal = explicitNumber(text, [/(?:吸血|生命偷取|lifesteal)[^\d]{0,8}(\d+(?:\.\d+)?)\s*%/i]);
    if (lifesteal !== null || /(?:吸血|生命偷取|lifesteal)/i.test(text)) {
      return { effect: 'lifesteal', lifestealPercent: Math.min(1, Math.max(0.01, (lifesteal ?? 20) / 100)) };
    }

    const knockback = explicitNumber(text, [/(?:击退|擊退|knockback)[^\d]{0,8}(\d+(?:\.\d+)?)/i]);
    if (knockback !== null || /(?:强力击退|強力擊退|knockback)/i.test(text)) {
      return { effect: 'knockback', knockbackStrength: Math.min(10, Math.max(0.1, knockback ?? 2)) };
    }
    if (/(?:凋零|wither)/i.test(text)) return { effect: 'wither' };
    return null;
  }

  function hasExplicitCooldown(text) {
    return /(?:冷却|冷卻|cd|cooldown)\s*(?:为|為|是|:|：|=)?\s*\d/i.test(text)
      || /\d+(?:\.\d+)?\s*(?:秒|s)\s*(?:冷却|冷卻|cd|cooldown)/i.test(text);
  }

  function impliesHitTrigger(text, advancedEffect, target) {
    if (/(?:右键|右鍵|右擊|right\s*click|on\s*use|使用时|使用時)/i.test(text)) return false;
    if (/(?:被动|被動|passive|每秒|持续|持續)/i.test(text)) return false;
    return Boolean(advancedEffect) || target.group !== 'any'
      || /(?:命中|击中|擊中|砍到|攻击时|攻擊時|攻击目标|攻擊目標|on\s*hit|when\s+(?:hitting|attacking))/i.test(text);
  }

  function mechanicSummary(spec) {
    const effect = EFFECT_LABELS[spec.effect] || spec.effect || '普通攻击';
    const target = spec.targetLabel || TARGET_LABELS[spec.targetGroup] || TARGET_LABELS.any;
    if (spec.effect === 'damage_multiplier') return `命中${target}时造成 ${spec.damageMultiplier} 倍伤害`;
    if (spec.effect === 'bonus_damage') return `命中${target}时额外造成 ${spec.bonusDamage} 点伤害`;
    if (spec.effect === 'execute') return `命中${target}时，对生命低于 ${Math.round(spec.executeThreshold * 100)}% 的目标斩杀`;
    if (spec.effect === 'lifesteal') return `命中${target}时回复实际伤害的 ${Math.round(spec.lifestealPercent * 100)}%`;
    return `命中${target}时触发${effect}`;
  }

  function applyWeaponSemantics(component, rawText) {
    if (!component || component.type !== 'weapon') return false;
    const text = normalizeText(rawText);
    const spec = component.spec || (component.spec = {});
    const target = parseTarget(text);
    const advanced = parseAdvancedEffect(text);
    const existingHitEffect = spec.effect && spec.effect !== 'none' && (spec.trigger === 'on_hit' || /(?:命中|击中|擊中|砍到|on\s*hit)/i.test(text));
    const runtimeEffect = advanced?.effect || (existingHitEffect ? spec.effect : null);
    const hitTrigger = impliesHitTrigger(text, advanced, target);

    const directName = extractDirectWeaponName(text);
    if (directName && (!component.name || /^(?:自定义武器|自定義武器|custom weapon)$/i.test(component.name))) {
      component.name = directName;
      spec.name = directName;
      spec.id = U.cleanId(String(directName).normalize('NFKD').replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').toLowerCase() || spec.id || 'custom_weapon', 'custom_weapon');
    }

    if (!runtimeEffect && target.group === 'any') return false;
    if (hitTrigger) spec.trigger = 'on_hit';
    if (runtimeEffect) spec.effect = runtimeEffect;

    spec.targetGroup = target.group;
    spec.targetEntity = target.entity;
    spec.targetLabel = target.label;
    spec.affectPlayers = target.group === 'player' || /(?:包括|包含|也能|可以).{0,6}(?:玩家|player)|(?:伤害|傷害|攻击|攻擊).{0,6}(?:玩家|player)/i.test(text);
    if (/(?:不伤害玩家|不傷害玩家|不会伤害玩家|不會傷害玩家|排除玩家|exclude\s*players?|no\s*player\s*damage)/i.test(text)) spec.affectPlayers = false;
    spec.affectTamed = /(?:包括|伤害|傷害).{0,6}(?:宠物|寵物|驯服|馴服|tamed|pets?)/i.test(text);
    if (/(?:不伤害宠物|不傷害寵物|排除宠物|排除寵物|exclude\s*(?:pets?|tamed))/i.test(text)) spec.affectTamed = false;

    if (advanced) Object.assign(spec, advanced);
    if (spec.effect === 'instant_kill') spec.instantKill = true;
    if (spec.effect === 'execute' && !Number.isFinite(Number(spec.executeThreshold))) spec.executeThreshold = 0.2;
    if (spec.effect === 'damage_multiplier' && !Number.isFinite(Number(spec.damageMultiplier))) spec.damageMultiplier = 2;
    if (spec.effect === 'bonus_damage' && !Number.isFinite(Number(spec.bonusDamage))) spec.bonusDamage = 4;
    if (spec.effect === 'lifesteal' && !Number.isFinite(Number(spec.lifestealPercent))) spec.lifestealPercent = 0.2;
    if (spec.effect === 'knockback' && !Number.isFinite(Number(spec.knockbackStrength))) spec.knockbackStrength = 2;

    spec.mechanicVersion = 1;
    spec.runtimeEffect = spec.effect;
    spec.runtimeRequired = spec.trigger === 'on_hit' && RUNTIME_EFFECTS.has(spec.effect);
    spec.mechanicSummary = mechanicSummary(spec);
    spec.lore = spec.mechanicSummary;
    if (spec.runtimeRequired && !hasExplicitCooldown(text) && ['instant_kill', 'execute', 'damage_multiplier', 'bonus_damage', 'lifesteal', 'knockback'].includes(spec.effect)) spec.cooldown = 0;
    return true;
  }

  function patchPlan(plan, input) {
    if (!plan || !Array.isArray(plan.components)) return plan;
    let changed = false;
    for (const component of plan.components) changed = applyWeaponSemantics(component, input) || changed;
    if (changed) {
      plan.confidence = Math.max(Number(plan.confidence) || 0, 94);
      plan.notes = Array.isArray(plan.notes) ? plan.notes : [];
      if (!plan.notes.includes('高级命中技能需要 GameForge Runtime 0.3.0 或更高版本。')) plan.notes.push('高级命中技能需要 GameForge Runtime 0.3.0 或更高版本。');
    }
    return plan;
  }

  function removeRuntimeHandledDatapack(entries, project) {
    const namespace = U.cleanNamespace(project.namespace);
    const runtimeRoots = new Set();
    for (const component of project.components || []) {
      const spec = component.spec || {};
      if (component.type !== 'weapon' || !spec.runtimeRequired || spec.trigger !== 'on_hit') continue;
      runtimeRoots.add(`weapon/${U.cleanId(spec.id || component.name, 'custom_weapon')}`);
    }
    if (!runtimeRoots.size) return entries;

    const shouldRemove = (name) => {
      for (const root of runtimeRoots) {
        if (name === `data/${namespace}/advancements/${root}/hit.json`) return true;
        if (name.startsWith(`data/${namespace}/functions/${root}/`) && /\/(?:activate|try_activate|on_hit|load|tick)\.mcfunction$/.test(name)) return true;
      }
      return false;
    };

    return (entries || []).flatMap((entry) => {
      if (shouldRemove(entry.name)) return [];
      if (entry.name === 'data/minecraft/tags/functions/load.json' || entry.name === 'data/minecraft/tags/functions/tick.json') {
        try {
          const parsed = JSON.parse(entry.data);
          parsed.values = (parsed.values || []).filter((value) => {
            const raw = typeof value === 'string' ? value : value?.id;
            if (!raw) return true;
            return !Array.from(runtimeRoots).some((root) => raw === `${namespace}:${root}/load` || raw === `${namespace}:${root}/tick`);
          });
          if (!parsed.values.length) return [];
          return [{ ...entry, data: `${JSON.stringify(parsed, null, 2)}\n` }];
        } catch (_) {
          return [entry];
        }
      }
      return [entry];
    });
  }

  function rebuildBundle(generated) {
    const nonDatapack = (generated.bundle || []).filter((entry) => !entry.name.startsWith('datapack/'));
    const datapack = (generated.datapack || []).map((entry) => ({ ...entry, name: `datapack/${entry.name}`, group: 'datapack' }));
    const byPath = new Map();
    for (const entry of [...nonDatapack, ...datapack]) byPath.set(entry.name, entry);
    generated.bundle = Array.from(byPath.values());
    generated.allFiles = generated.bundle;
    return generated;
  }

  Gen.parsePrompt = function advancedParsePrompt(input, project) {
    return patchPlan(originalParsePrompt(input, project), input);
  };

  Gen.generateProject = function advancedGenerateProject(projectInput) {
    const generated = originalGenerateProject(projectInput);
    generated.datapack = removeRuntimeHandledDatapack(generated.datapack, generated.project);
    return rebuildBundle(generated);
  };

  Gen.diagnose = function advancedDiagnose(projectInput, generatedInput) {
    const project = GF.project.normalize(projectInput);
    const generated = generatedInput || Gen.generateProject(project);
    const issues = originalDiagnose(project, generated);
    for (const component of project.components) {
      const spec = component.spec || {};
      if (component.type !== 'weapon') continue;
      if (spec.trigger === 'on_hit' && spec.effect && spec.effect !== 'none' && !spec.runtimeRequired) {
        issues.push({ severity: 'warning', title: '命中技能缺少精确运行标记', message: `${component.name} 会退回不精确的数据包目标选择；建议重新生成该组件。`, sourceId: component.id });
      }
      if (spec.runtimeRequired) issues.push({ severity: 'info', title: '需要 GameForge Runtime', message: `${component.name} 的“${spec.mechanicSummary || EFFECT_LABELS[spec.effect] || spec.effect}”由 Runtime 精确处理攻击者与真实受击目标。`, sourceId: component.id });
      if (spec.effect === 'instant_kill' && spec.targetGroup === 'any') issues.push({ severity: 'warning', title: '秒杀范围过宽', message: `${component.name} 会对任意生物触发秒杀。建议明确“亡灵、敌对生物或某一种实体”，并默认排除玩家。`, sourceId: component.id });
      if (spec.affectPlayers && ['instant_kill', 'execute'].includes(spec.effect)) issues.push({ severity: 'warning', title: '高风险玩家伤害', message: `${component.name} 被设置为可对玩家触发${EFFECT_LABELS[spec.effect]}，请只在明确允许 PvP 的世界使用。`, sourceId: component.id });
    }
    return issues;
  };

  Gen.selfTests = async function advancedSelfTests() {
    const results = await originalSelfTests();
    const test = async (name, fn) => {
      try { await fn(); results.push({ status: 'pass', name, message: '通过' }); }
      catch (error) { results.push({ status: 'fail', name, message: error?.message || String(error) }); }
    };

    await test('亡灵剑会解析成精确命中秒杀机制', () => {
      const project = GF.project.create({ namespace: 'gf_undead' });
      const plan = Gen.parsePrompt('做一把叫亡灵剑的剑，命中时秒杀亡灵生物，不伤害玩家', project);
      const component = plan.components?.[0];
      const spec = component?.spec || {};
      if (component?.type !== 'weapon') throw new Error('没有生成武器');
      if (component.name !== '亡灵剑') throw new Error(`名称错误：${component.name}`);
      if (spec.trigger !== 'on_hit' || spec.effect !== 'instant_kill') throw new Error('没有生成命中秒杀');
      if (spec.targetGroup !== 'undead' || spec.affectPlayers !== false) throw new Error('亡灵目标或玩家安全设置错误');
      if (!spec.runtimeRequired || spec.cooldown !== 0) throw new Error('Runtime 或冷却设置错误');
    });

    await test('目标倍率、斩杀与具体实体语义可区分', () => {
      const project = GF.project.create({ namespace: 'gf_semantics' });
      const multiplier = Gen.parsePrompt('做一把猎尸剑，对僵尸造成三倍伤害', project).components?.[0]?.spec || {};
      if (multiplier.effect !== 'damage_multiplier' || multiplier.damageMultiplier !== 3 || multiplier.targetEntity !== 'minecraft:zombie') throw new Error('僵尸三倍伤害解析失败');
      const execute = Gen.parsePrompt('做一把收割镰刀，命中敌对生物时，血量低于20%直接斩杀', project).components?.[0]?.spec || {};
      if (execute.effect !== 'execute' || execute.executeThreshold !== 0.2 || execute.targetGroup !== 'hostile') throw new Error('低生命斩杀解析失败');
    });

    await test('Runtime 命中技能不会再生成最近目标数据包函数', () => {
      const project = GF.project.create({ namespace: 'gf_precise', components: [Gen.parsePrompt('做一把叫亡灵剑的剑，秒杀亡灵生物', GF.project.create()).components[0]] });
      const generated = Gen.generateProject(project);
      const paths = new Set(generated.datapack.map((entry) => entry.name));
      if (!Array.from(paths).some((path) => path.endsWith('/give.mcfunction'))) throw new Error('获取函数丢失');
      if (Array.from(paths).some((path) => /weapon\/[^/]+\/(?:activate|try_activate|on_hit)\.mcfunction$/.test(path))) throw new Error('仍生成不精确的命中函数');
      const projectJson = JSON.parse(generated.bundle.find((entry) => entry.name === 'project.json').data);
      if (!projectJson.components[0].spec.runtimeRequired) throw new Error('project.json 没有保存 Runtime 依赖');
    });

    return results;
  };

  Gen.advancedWeaponMechanics = Object.freeze({ version: VERSION, effectLabels: EFFECT_LABELS, targetLabels: TARGET_LABELS, parseTarget, parseAdvancedEffect });
  Gen.__advancedWeaponMechanicsInstalled = true;
})();
