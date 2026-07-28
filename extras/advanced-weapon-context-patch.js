'use strict';

(() => {
  const GF = window.GameForge;
  const Gen = GF?.generators;
  if (!GF || !Gen || Gen.__advancedWeaponContextPatchInstalled) return;

  const previousParsePrompt = Gen.parsePrompt.bind(Gen);
  const RUNTIME_EFFECTS = new Set([
    'instant_kill', 'execute', 'damage_multiplier', 'bonus_damage', 'lifesteal',
    'knockback', 'wither', 'lightning', 'fire', 'poison', 'freeze', 'explosion'
  ]);
  const TARGET_LABELS = Object.freeze({
    any: '任意生物', undead: '亡灵生物', hostile: '敌对生物', aquatic: '水生生物',
    arthropod: '节肢生物', illager: '灾厄村民', animal: '动物', boss: 'Boss', player: '玩家'
  });
  const SPECIFIC_TARGETS = [
    [/(?:僵尸村民|殭屍村民|zombie\s*villager)/i, 'minecraft:zombie_villager', '僵尸村民'],
    [/(?:僵尸猪灵|殭屍豬布林|zombified\s*piglin)/i, 'minecraft:zombified_piglin', '僵尸猪灵'],
    [/(?:凋灵骷髅|凋靈骷髏|wither\s*skeleton)/i, 'minecraft:wither_skeleton', '凋灵骷髅'],
    [/(?:远古守卫者|遠古守衛者|elder\s*guardian)/i, 'minecraft:elder_guardian', '远古守卫者'],
    [/(?:末影龙|終界龍|ender\s*dragon)/i, 'minecraft:ender_dragon', '末影龙'],
    [/(?:洞穴蜘蛛|cave\s*spider)/i, 'minecraft:cave_spider', '洞穴蜘蛛'],
    [/(?:凋灵|凋靈|wither)/i, 'minecraft:wither', '凋灵'],
    [/(?:骷髅|骷髏|skeleton)/i, 'minecraft:skeleton', '骷髅'],
    [/(?:流浪者|stray)/i, 'minecraft:stray', '流浪者'],
    [/(?:僵尸|殭屍|zombie)/i, 'minecraft:zombie', '僵尸'],
    [/(?:尸壳|屍殼|husk)/i, 'minecraft:husk', '尸壳'],
    [/(?:溺尸|沉屍|drowned)/i, 'minecraft:drowned', '溺尸'],
    [/(?:幻翼|phantom)/i, 'minecraft:phantom', '幻翼'],
    [/(?:蜘蛛|spider)/i, 'minecraft:spider', '蜘蛛'],
    [/(?:苦力怕|爬行者|creeper)/i, 'minecraft:creeper', '苦力怕'],
    [/(?:掠夺者|掠奪者|pillager)/i, 'minecraft:pillager', '掠夺者'],
    [/(?:卫道士|衛道士|vindicator)/i, 'minecraft:vindicator', '卫道士'],
    [/(?:唤魔者|喚魔者|evoker)/i, 'minecraft:evoker', '唤魔者'],
    [/(?:守卫者|守衛者|guardian)/i, 'minecraft:guardian', '守卫者'],
    [/(?:史莱姆|史萊姆|slime)/i, 'minecraft:slime', '史莱姆'],
    [/(?:恶魂|惡魂|ghast)/i, 'minecraft:ghast', '恶魂']
  ];

  function normalize(value) {
    return String(value || '').normalize('NFKC').replace(/[，、；]/g, ',').replace(/[。！？]/g, '.').replace(/\s+/g, ' ').trim();
  }

  function isNegativeMention(text, start, end) {
    const before = text.slice(Math.max(0, start - 20), start);
    const after = text.slice(end, Math.min(text.length, end + 14));
    return /(?:不|不会|不會|禁止|排除|忽略|避开|避開|exclude|without|except|no\s*)[^,.]{0,14}$/i.test(before)
      || /^\s*(?:安全|免疫|不受伤害|不受傷害)/i.test(after);
  }

  function hasTargetContext(text, start, end) {
    const before = text.slice(Math.max(0, start - 36), start);
    const after = text.slice(end, Math.min(text.length, end + 36));
    const beforeContext = /(?:只\s*)?(?:对|對|针对|針對|专门(?:对|對)?|專門(?:對|对)?|攻击|攻擊|命中|击中|擊中|砍到|伤害|傷害|杀死|殺死|秒杀|秒殺|斩杀|斬殺|处决|處決|克制|猎杀|獵殺|against|targets?|targeting|hitting|attacking|damaging|killing|execute)\s*[^,.]{0,12}$/i.test(before);
    const afterContext = /^\s*(?:(?:生物|怪物|目标|目標|mobs?|creatures?|entities?)\s*)?(?:时|時|会|會|造成|受到|触发|觸發|秒杀|秒殺|斩杀|斬殺|处决|處決|杀死|殺死|伤害|傷害|中毒|燃烧|燃燒|凋零|冻结|凍結|击退|擊退|take|takes|deal|deals|damage|kill|execute|when|only|for)/i.test(after);
    return beforeContext || afterContext;
  }

  function contextualMatch(text, pattern, result) {
    const flags = Array.from(new Set(`${pattern.flags}g`)).join('');
    const matcher = new RegExp(pattern.source, flags);
    for (const match of text.matchAll(matcher)) {
      const start = match.index ?? 0;
      const end = start + match[0].length;
      if (isNegativeMention(text, start, end)) continue;
      if (hasTargetContext(text, start, end)) return result;
    }
    return null;
  }

  function parseContextualTarget(text) {
    const anyTarget = contextualMatch(text, /(?:任意生物|所有生物|一切生物|全部生物|any\s+(?:mob|creature|entity)|all\s+(?:mobs|creatures|entities))/i, { group: 'any', entity: '', label: TARGET_LABELS.any });
    if (anyTarget) return anyTarget;

    for (const [pattern, entity, label] of SPECIFIC_TARGETS) {
      const specific = contextualMatch(text, pattern, { group: 'specific', entity, label });
      if (specific) return specific;
    }

    const groups = [
      [/(?:亡灵(?:生物)?|亡靈(?:生物)?|不死(?:系|生物)?|undead(?:\s+(?:mob|creature))?)/i, 'undead'],
      [/(?:节肢(?:生物)?|節肢(?:生物)?|蜘蛛类|蜘蛛類|arthropods?)/i, 'arthropod'],
      [/(?:水生(?:生物)?|海洋生物|水下生物|aquatic(?:\s+(?:mob|creature))?|sea\s*creature)/i, 'aquatic'],
      [/(?:灾厄村民|災厄村民|袭击者|襲擊者|illagers?|raiders?)/i, 'illager'],
      [/(?:敌对生物|敵對生物|怪物|hostile\s*(?:mob|creature)?|monsters?)/i, 'hostile'],
      [/(?:动物|動物|被动生物|被動生物|animals?|passive\s*mobs?)/i, 'animal'],
      [/(?:Boss|首领|首領|头目|頭目|bosses)/i, 'boss'],
      [/(?:玩家|players?)/i, 'player']
    ];
    for (const [pattern, group] of groups) {
      const target = contextualMatch(text, pattern, { group, entity: '', label: TARGET_LABELS[group] });
      if (target) return target;
    }
    return null;
  }

  function summary(spec) {
    const target = spec.targetLabel || TARGET_LABELS[spec.targetGroup] || TARGET_LABELS.any;
    if (spec.effect === 'instant_kill') return `命中${target}时触发一击必杀`;
    if (spec.effect === 'execute') return `命中${target}时，对生命低于 ${Math.round((Number(spec.executeThreshold) || 0.2) * 100)}% 的目标斩杀`;
    if (spec.effect === 'damage_multiplier') return `命中${target}时造成 ${Number(spec.damageMultiplier) || 2} 倍伤害`;
    if (spec.effect === 'bonus_damage') return `命中${target}时额外造成 ${Number(spec.bonusDamage) || 4} 点伤害`;
    if (spec.effect === 'lifesteal') return `命中${target}时回复实际伤害的 ${Math.round((Number(spec.lifestealPercent) || 0.2) * 100)}%`;
    return spec.mechanicSummary || '';
  }

  function patchWeapon(component, input) {
    if (!component || component.type !== 'weapon') return;
    const text = normalize(input);
    const spec = component.spec || (component.spec = {});
    const target = parseContextualTarget(text);
    const negativePlayers = /(?:不伤害玩家|不傷害玩家|不会伤害玩家|不會傷害玩家|排除玩家|exclude\s*players?|no\s*player\s*damage)/i.test(text);
    const positivePlayers = /(?:只\s*)?(?:对|對|攻击|攻擊|伤害|傷害|秒杀|秒殺|斩杀|斬殺)\s*(?:所有)?\s*(?:玩家|players?)/i.test(text)
      || /(?:包括|包含|也能|可以).{0,8}(?:玩家|players?)/i.test(text);
    const negativeTamed = /(?:不伤害宠物|不傷害寵物|排除宠物|排除寵物|exclude\s*(?:pets?|tamed))/i.test(text);

    if (target) {
      spec.targetGroup = target.group;
      spec.targetEntity = target.entity;
      spec.targetLabel = target.label;
    } else if (spec.mechanicVersion === 1) {
      spec.targetGroup = 'any';
      spec.targetEntity = '';
      spec.targetLabel = TARGET_LABELS.any;
    }

    spec.affectPlayers = negativePlayers ? false : Boolean(target?.group === 'player' || positivePlayers);
    if (negativeTamed) spec.affectTamed = false;

    const effect = String(spec.runtimeEffect || spec.effect || 'none').toLowerCase();
    const explicitHit = /(?:命中|击中|擊中|砍到|攻击时|攻擊時|on\s*hit|when\s+(?:hitting|attacking))/i.test(text);
    const explicitRightClick = /(?:右键|右鍵|right\s*click|on\s*use|使用时|使用時)/i.test(text);
    const explicitPassive = /(?:被动|被動|passive|每秒|持续|持續)/i.test(text);

    if (!target && effect === 'none' && spec.mechanicVersion === 1) {
      spec.runtimeRequired = false;
      spec.mechanicSummary = '';
      if (!explicitHit) spec.trigger = explicitPassive ? 'passive' : 'right_click';
      if (!spec.lore || /命中.*(?:none|无|無)/i.test(spec.lore)) spec.lore = '由 GameForge 创建的自定义武器';
      return;
    }

    if (RUNTIME_EFFECTS.has(effect) && !explicitRightClick && !explicitPassive) {
      spec.trigger = 'on_hit';
      spec.runtimeEffect = effect;
      spec.runtimeRequired = true;
      spec.mechanicVersion = Math.max(1, Number(spec.mechanicVersion) || 0);
      spec.mechanicSummary = summary(spec);
      if (spec.mechanicSummary) spec.lore = spec.mechanicSummary;
    }
  }

  Gen.parsePrompt = function contextAwareAdvancedWeaponPrompt(input, project) {
    const plan = previousParsePrompt(input, project);
    if (plan && Array.isArray(plan.components)) {
      for (const component of plan.components) patchWeapon(component, input);
    }
    return plan;
  };

  Gen.advancedWeaponContext = Object.freeze({ parseContextualTarget });
  Gen.__advancedWeaponContextPatchInstalled = true;
})();
