(function () {
  'use strict';

  const GF = window.GameForge;
  const Data = window.GameForgeVocabularyData;
  if (!GF?.generators?.parsePrompt || !Data) {
    console.warn('[GameForge Vocabulary] Core generators or vocabulary data are unavailable.');
    return;
  }
  if (GF.vocabularyExpansion?.installed) return;
  const baseVocabulary = GF.vocabulary || null;

  const Gen = GF.generators;
  const U = GF.utils;
  const originalParsePrompt = Gen.parsePrompt.bind(Gen);
  const originalComponentSummary = Gen.componentSummary.bind(Gen);
  const originalSelfTests = Gen.selfTests.bind(Gen);

  const PACK_VERSION = Data.version || '1.0.0';
  const TYPE_IDS = new Set(['type.weapon','type.item','type.block','type.mob','type.boss','type.loot','type.recipe','type.advancement','type.command','type.forge']);
  const FUTURE_DOMAIN_PREFIX = 'domain.';
  const VISUAL_TO_VALUE = Object.freeze({
    'visual.sword': 'sword',
    'visual.axe': 'axe',
    'visual.staff': 'staff',
    'visual.wand': 'wand',
    'visual.hammer': 'hammer',
    'visual.dagger': 'dagger',
    'visual.spear': 'staff',
    'visual.bow': 'wand',
    'visual.scythe': 'axe'
  });
  const EFFECT_TO_VALUE = Object.freeze({
    'effect.lightning': 'lightning',
    'effect.fire': 'fire',
    'effect.explosion': 'explosion',
    'effect.poison': 'poison',
    'effect.freeze': 'freeze',
    'effect.heal': 'heal',
    'effect.dash': 'dash',
    'effect.summon_wolf': 'summon_wolf'
  });
  const TRIGGER_TO_VALUE = Object.freeze({
    'trigger.on_hit': 'on_hit',
    'trigger.right_click': 'right_click',
    'trigger.passive': 'passive'
  });
  const COMMAND_EFFECT_NAMES = Object.freeze({
    'minecraft:speed': '速度',
    'minecraft:strength': '力量',
    'minecraft:haste': '急迫',
    'minecraft:resistance': '抗性',
    'minecraft:regeneration': '生命恢复',
    'minecraft:night_vision': '夜视',
    'minecraft:invisibility': '隐身',
    'minecraft:jump_boost': '跳跃'
  });

  const tradMap = Data.traditionalToSimplified || {};
  const tradPattern = Object.keys(tradMap).length
    ? new RegExp(`[${Object.keys(tradMap).map((char) => char.replace(/[\\\]\-^]/g, '\\$&')).join('')}]`, 'g')
    : null;

  function simplify(value) {
    const source = String(value ?? '').normalize('NFKC');
    return tradPattern ? source.replace(tradPattern, (char) => tradMap[char] || char) : source;
  }

  function normalize(value) {
    return simplify(value)
      .toLowerCase()
      .replace(/[‐‑‒–—―−_\/\\]+/g, ' ')
      .replace(/[，、；;。！？!?：:“”"'‘’（）()【】\[\]{}<>《》|]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function isLatinAlias(value) {
    return /^[a-z0-9][a-z0-9 .:+#-]*$/i.test(value);
  }

  function effectiveAliases(alias) {
    const normalized = normalize(alias);
    const variants = new Set([normalized]);
    if (normalized.includes(' ')) {
      variants.add(normalized.replace(/\s+/g, ''));
      variants.add(normalized.replace(/\s+/g, '-'));
      variants.add(normalized.replace(/\s+/g, '_'));
    }
    if (/^[a-z][a-z0-9 ]+$/i.test(normalized)) {
      if (normalized.endsWith('ies')) variants.add(`${normalized.slice(0, -3)}y`);
      else if (normalized.endsWith('es')) variants.add(normalized.slice(0, -2));
      else if (normalized.endsWith('s')) variants.add(normalized.slice(0, -1));
      else variants.add(`${normalized}s`);
    }
    return [...variants].filter(Boolean);
  }

  function compileEntries(entries, kind) {
    const records = [];
    for (const entry of entries || []) {
      for (const rawAlias of entry.aliases || []) {
        for (const alias of effectiveAliases(rawAlias)) {
          records.push({
            kind,
            alias,
            latin: isLatinAlias(alias),
            length: alias.length,
            entry
          });
        }
      }
    }
    records.sort((a, b) => b.length - a.length || (b.entry.priority || 0) - (a.entry.priority || 0));
    return records;
  }

  const conceptIndex = compileEntries(Data.concepts, 'concept');
  const itemIndex = compileEntries(Data.items, 'item');
  const entityIndex = compileEntries(Data.entities, 'entity');
  const colorIndex = compileEntries(Data.colors, 'color');
  const commandEffectIndex = compileEntries(Data.commandEffects, 'commandEffect');
  const attributeIndex = compileEntries(Data.attributes, 'attribute');

  function findAlias(source, record, from = 0) {
    if (!record.alias) return -1;
    if (!record.latin) return source.indexOf(record.alias, from);
    let index = source.indexOf(record.alias, from);
    while (index >= 0) {
      const before = index === 0 ? ' ' : source[index - 1];
      const afterIndex = index + record.alias.length;
      const after = afterIndex >= source.length ? ' ' : source[afterIndex];
      if (!/[a-z0-9]/i.test(before) && !/[a-z0-9]/i.test(after)) return index;
      index = source.indexOf(record.alias, index + 1);
    }
    return -1;
  }

  function bestMatches(source, index, keyFn, limit = Infinity) {
    const selected = new Map();
    for (const record of index) {
      const position = findAlias(source, record);
      if (position < 0) continue;
      const key = keyFn(record.entry);
      const previous = selected.get(key);
      if (!previous || record.length > previous.length || (record.length === previous.length && position < previous.position)) {
        selected.set(key, { ...record.entry, alias: record.alias, position, length: record.length });
      }
      if (selected.size >= limit && limit === 1) break;
    }
    return [...selected.values()].sort((a, b) => a.position - b.position || b.length - a.length).slice(0, limit);
  }

  function chineseNumber(value) {
    const source = simplify(String(value || '')).trim();
    if (!source) return NaN;
    if (/^-?\d+(?:\.\d+)?$/.test(source)) return Number(source);
    if (source === '半') return 0.5;
    const digit = { 零:0, 〇:0, 一:1, 二:2, 两:2, 三:3, 四:4, 五:5, 六:6, 七:7, 八:8, 九:9 };
    const unit = { 十:10, 百:100, 千:1000, 万:10000, 亿:100000000 };
    if (source.includes('点')) {
      const [left, right = ''] = source.split('点', 2);
      const integer = chineseNumber(left || '零');
      if (!Number.isFinite(integer)) return NaN;
      const decimalDigits = [...right].map((char) => digit[char]).filter((number) => Number.isFinite(number));
      return Number(`${integer}.${decimalDigits.join('') || '0'}`);
    }
    let total = 0;
    let section = 0;
    let number = 0;
    let saw = false;
    for (const char of source) {
      if (Object.prototype.hasOwnProperty.call(digit, char)) {
        number = digit[char];
        saw = true;
      } else if (Object.prototype.hasOwnProperty.call(unit, char)) {
        const currentUnit = unit[char];
        saw = true;
        if (currentUnit >= 10000) {
          section = (section + (number || 0)) * currentUnit;
          total += section;
          section = 0;
        } else {
          section += (number || 1) * currentUnit;
        }
        number = 0;
      } else {
        return NaN;
      }
    }
    return saw ? total + section + number : NaN;
  }

  function readNumberAt(source, start) {
    const tail = source.slice(start).replace(/^\s*(?:为|是|有|达到|约|大约|大概|差不多|:|=)?\s*/i, '');
    const match = tail.match(/^(-?\d+(?:\.\d+)?|[零〇一二两三四五六七八九十百千万亿点半]+)/);
    if (!match) return null;
    const value = chineseNumber(match[1]);
    return Number.isFinite(value) ? value : null;
  }

  function readNumberBefore(source, start) {
    const head = source.slice(Math.max(0, start - 20), start);
    const match = head.match(/(-?\d+(?:\.\d+)?|[零〇一二两三四五六七八九十百千万亿点半]+)\s*(?:点|级|秒|格|米|滴|颗|顆|个|個|次)?\s*$/);
    if (!match) return null;
    const value = chineseNumber(match[1]);
    return Number.isFinite(value) ? value : null;
  }

  function findAttributeValues(source) {
    const found = {};
    for (const record of attributeIndex) {
      if (Object.prototype.hasOwnProperty.call(found, record.entry.id)) continue;
      const position = findAlias(source, record);
      if (position < 0) continue;
      const after = readNumberAt(source, position + record.alias.length);
      const before = readNumberBefore(source, position);
      const value = after ?? before;
      if (Number.isFinite(value)) {
        found[record.entry.id] = {
          id: record.entry.id,
          canonical: record.entry.canonical,
          value,
          alias: record.alias,
          position
        };
      }
    }
    return found;
  }

  function analyze(input) {
    const raw = String(input || '').trim();
    const source = normalize(raw);
    const concepts = bestMatches(source, conceptIndex, (entry) => entry.id);
    const items = bestMatches(source, itemIndex, (entry) => entry.id, 8);
    const entities = bestMatches(source, entityIndex, (entry) => entry.id, 5);
    const colors = bestMatches(source, colorIndex, (entry) => entry.id, 3);
    const commandEffects = bestMatches(source, commandEffectIndex, (entry) => entry.id, 3);
    const attributes = findAttributeValues(source);
    const futureDomains = concepts.filter((entry) => entry.future && entry.id.startsWith(FUTURE_DOMAIN_PREFIX));
    const themes = concepts.filter((entry) => entry.category === 'theme');
    const type = chooseType({ source, concepts, items, entities, futureDomains });
    return { raw, source, concepts, items, entities, colors, commandEffects, attributes, futureDomains, themes, type };
  }

  function hasConcept(analysis, id) {
    return analysis.concepts.some((entry) => entry.id === id);
  }

  function longestEntity(analysis) {
    return analysis.entities.slice().sort((a, b) => b.length - a.length || a.position - b.position)[0] || null;
  }

  function longestItem(analysis) {
    return analysis.items.slice().sort((a, b) => b.length - a.length || a.position - b.position)[0] || null;
  }

  function chooseType({ source, concepts, items, entities, futureDomains }) {
    const ids = new Set(concepts.map((entry) => entry.id));
    const visual = concepts.some((entry) => entry.category === 'visual');
    const explicitForge = ids.has('type.forge');
    const futureOnly = futureDomains.length && !visual && ![...TYPE_IDS].some((id) => ids.has(id));
    if (futureOnly) return 'concept';
    if (futureDomains.length && explicitForge && !visual && !ids.has('type.block') && !ids.has('type.item')) return 'concept';
    if (explicitForge) return 'forge';
    if (ids.has('type.loot') || /(掉落|掉宝|drop|loot|死亡后|击杀后|挖掘后)/i.test(source)) return 'loot';
    if (ids.has('type.recipe') && !visual && !ids.has('type.weapon')) return 'recipe';
    // A weapon prompt often mentions an “enemy” as its target. Visual weapon nouns must
    // therefore win over generic mob words such as 敌人 / monster.
    if (visual || ids.has('type.weapon')) return 'weapon';
    if (ids.has('type.block')) return 'block';
    if (ids.has('type.boss') || ids.has('type.mob')) return 'mob';
    if (ids.has('type.advancement')) return 'advancement';
    // Explicit item wording must win over ability-like names such as “传送核心”.
    if (ids.has('type.item')) return 'item';
    if (ids.has('type.command')) return 'command';
    if (entities.length && !items.length) return 'mob';
    if (items.length) return 'item';
    return null;
  }

  function hintsFor(analysis) {
    const hints = [];
    const typeHint = {
      weapon: '武器 剑', item: '物品', block: '方块', mob: '生物', loot: '掉落', recipe: '配方',
      advancement: '进度', command: '指令', forge: '模组'
    }[analysis.type];
    if (typeHint) hints.push(typeHint);
    for (const concept of analysis.concepts) {
      if (concept.category === 'effect' || concept.category === 'trigger' || concept.category === 'flag') {
        hints.push(...(concept.hints || []));
      }
    }
    for (const attribute of Object.values(analysis.attributes)) hints.push(`${attribute.canonical} ${attribute.value}`);
    for (const commandEffect of analysis.commandEffects) {
      const label = COMMAND_EFFECT_NAMES[commandEffect.id];
      if (label) hints.push(label);
    }
    return [...new Set(hints.filter(Boolean))];
  }

  function augmentPrompt(input, analysis) {
    const hints = hintsFor(analysis);
    return hints.length ? `${String(input || '').trim()}\n解析标签：${hints.join('；')}` : String(input || '').trim();
  }

  function guessName(input, fallback) {
    const raw = String(input || '').trim();
    const quoted = raw.match(/[“"']([^”"']{1,42})[”"']/);
    if (quoted) return quoted[1].trim();
    const called = raw.match(/(?:叫做?|名为|命名为|名字(?:叫|是)?|called|named)\s*[:：]?\s*([^，,。.!！？\n]{1,48})/i);
    if (called) return cleanName(called[1], fallback);
    const created = raw.match(/(?:做|制作|製作|创建|創建|创造|創造|生成|打造|设计|設計|弄|搞|整|来|來|build|create|make|generate|design)\s*(?:一个|一個|一种|一種|一把|一只|一隻|一块|一塊|一套|个|個|把|只|隻|块|塊|套)?\s*([^，,。.!！？\n]{1,48})/i);
    return created ? cleanName(created[1], fallback) : fallback;
  }

  function cleanName(value, fallback) {
    let name = String(value || '').trim();
    name = name.split(/(?:右键|右鍵|左键|左鍵|命中|攻击时|攻擊時|可以|能够|能夠|会|會|拥有|擁有|带有|帶有|附带|附帶|伤害|傷害|血量|生命|冷却|冷卻|范围|範圍|并且|並且|而且|然后|然後|with\s|that\s|which\s)/i, 1)[0].trim();
    name = name.replace(/^(?:叫做?|名为|名為|名字是)\s*/i, '').trim();
    // “叫霜月的太刀 / 叫沙漠猎手的尸壳”中的尾部类别是在说明载体，
    // 不属于玩家给作品起的名字。
    name = name.replace(/的(?:下界合金|钻石|鑽石|铁|鐵|金|木|石)?(?:太刀|武士刀|长剑|長劍|短剑|短劍|巨剑|巨劍|大剑|大劍|战锤|戰錘|锤|錘|战斧|戰斧|斧头|斧頭|法杖|魔杖|匕首|长枪|長槍|长矛|長矛|弓|弩|镰刀|鐮刀|剑|劍|武器|物品|道具|方块|方塊|生物|怪物|实体|實體|尸壳|屍殼|僵尸|殭屍|骷髅|骷髏|末影龙|末影龍|龙|龍|boss|首领|首領)(?:\s*(?:boss|Boss|BOSS|首领|首領))?\s*$/i, '').trim();
    return name.slice(0, 42) || fallback;
  }

  function conceptPlan(input, project, analysis) {
    const domains = analysis.futureDomains.length ? analysis.futureDomains : analysis.concepts.filter((entry) => entry.future);
    const domainPriority = [
      'domain.world', 'domain.dimension', 'domain.biome', 'domain.structure', 'domain.terrain',
      'domain.game_mode', 'domain.dungeon', 'domain.minigame', 'domain.story', 'domain.quest',
      'domain.ecology', 'domain.world_rule', 'domain.world_event', 'domain.weather', 'domain.time'
    ];
    const primary = domainPriority.map((id) => domains.find((entry) => entry.id === id)).find(Boolean)
      || domains[0]
      || { id: 'domain.world', label: '大型玩法' };
    const name = guessName(input, `${primary.label}概念`);
    const id = U.cleanId(`concept_${U.hashString(`${primary.id}:${input}`).slice(0, 10)}`, 'concept_draft');
    const detected = [...new Set([...domains, ...analysis.themes].map((entry) => entry.label))];
    const component = GF.project.normalizeComponent({
      type: 'concept',
      name,
      spec: {
        id,
        category: primary.id,
        categoryLabel: primary.label,
        prompt: String(input || '').trim(),
        detected,
        vocabularyVersion: PACK_VERSION,
        status: 'vocabulary_only'
      }
    });
    return {
      type: 'concept',
      confidence: Math.min(96, 78 + detected.length * 3),
      components: [component],
      note: `已识别为“${primary.label}”方向，并保存为概念草案。当前这一步只扩充本地词汇，不会把世界、维度或系统错误伪装成一把武器；后续生成器可直接读取这份草案。`,
      vocabulary: summarizeAnalysis(analysis)
    };
  }

  function summarizeAnalysis(analysis) {
    return {
      version: PACK_VERSION,
      normalized: analysis.source,
      type: analysis.type,
      concepts: analysis.concepts.map(({ id, label, category, future, alias }) => ({ id, label, category, future: Boolean(future), alias })),
      items: analysis.items.map(({ id, alias }) => ({ id, alias })),
      entities: analysis.entities.map(({ id, alias, boss }) => ({ id, alias, boss: Boolean(boss) })),
      attributes: Object.fromEntries(Object.entries(analysis.attributes).map(([key, value]) => [key, value.value])),
      colors: analysis.colors.map(({ id, value, alias }) => ({ id, value, alias }))
    };
  }

  function applyName(component, input, fallbacks) {
    if (!component) return;
    const current = String(component.name || '');
    const hasExplicitName = /(?:叫做?|名为|名為|命名为|命名為|名字(?:叫|是)?|called|named)\s*[:：]?/i.test(String(input || ''));
    if (!hasExplicitName && !fallbacks.some((fallback) => current === fallback || current.startsWith(fallback))) return;
    const guessed = guessName(input, current);
    if (guessed && guessed !== current) {
      component.name = guessed;
      if (component.spec) component.spec.name = guessed;
    }
  }

  function applyAttributes(spec, analysis, mapping) {
    if (!spec) return;
    for (const [attributeId, specKey] of Object.entries(mapping)) {
      const match = analysis.attributes[attributeId];
      if (match) spec[specKey] = match.value;
    }
  }

  function applyFlags(spec, analysis) {
    if (!spec) return;
    if (hasConcept(analysis, 'flag.no_recipe')) spec.recipeEnabled = false;
    if (hasConcept(analysis, 'flag.no_collision')) spec.collision = 'minecraft:light';
    if (hasConcept(analysis, 'flag.no_glow')) spec.glow = false;
    else if (hasConcept(analysis, 'flag.glow')) spec.glow = true;
    if (hasConcept(analysis, 'flag.unbreakable')) spec.unbreakable = true;
    if (hasConcept(analysis, 'flag.silent')) spec.silent = true;
    if (hasConcept(analysis, 'flag.persistent')) spec.persistent = true;
  }

  function applyColor(spec, analysis) {
    if (spec && analysis.colors[0]?.value) spec.color = analysis.colors[0].value;
  }

  function itemMatchesBySide(analysis) {
    const splitMatch = analysis.source.match(/(?:合成|制作成|制成|做成|craft(?:ed)?(?: into)?)/i);
    const split = splitMatch ? splitMatch.index : -1;
    if (split < 0) return { before: analysis.items[0] || null, after: analysis.items[1] || analysis.items[0] || null };
    return {
      before: analysis.items.filter((entry) => entry.position < split).sort((a, b) => b.length - a.length)[0] || null,
      after: analysis.items.filter((entry) => entry.position > split).sort((a, b) => b.length - a.length)[0] || null
    };
  }

  function updateRecipe(spec, analysis) {
    if (!spec) return;
    const sides = itemMatchesBySide(analysis);
    if (sides.after) spec.result = sides.after.id;
    if (analysis.attributes.count) spec.count = U.clamp(Math.round(analysis.attributes.count.value), 1, 64);
    if (sides.before) {
      const countMatch = analysis.source.slice(0, Math.max(0, sides.before.position + sides.before.length)).match(/(\d+|[一二两三四五六七八九十]+)\s*(?:个|個)?[^\d一二两三四五六七八九十]{0,8}$/);
      const ingredientCount = U.clamp(countMatch ? chineseNumber(countMatch[1]) : spec.grid?.filter(Boolean).length || 1, 1, 9);
      spec.grid = Array(9).fill('');
      if (ingredientCount >= 9) spec.grid.fill(sides.before.id);
      else if (ingredientCount === 1) spec.grid[4] = sides.before.id;
      else for (let index = 0; index < ingredientCount; index += 1) spec.grid[index] = sides.before.id;
    }
  }

  function updateLoot(spec, analysis) {
    if (!spec) return;
    const dropMarker = analysis.source.search(/(?:掉落|掉宝|掉|drop|loot)/i);
    const candidates = dropMarker >= 0 ? analysis.items.filter((entry) => entry.position >= dropMarker) : analysis.items;
    const chosen = candidates[0] || analysis.items[0];
    if (!chosen) return;
    const percentMatch = analysis.source.match(/(\d+(?:\.\d+)?)\s*%/);
    const chance = percentMatch ? U.clamp(Number(percentMatch[1]), 0, 100) : 100;
    const range = analysis.source.match(/(\d+)\s*(?:到|至|~|-)\s*(\d+)\s*(?:个|個)?/);
    const min = range ? Math.min(Number(range[1]), Number(range[2])) : 1;
    const max = range ? Math.max(Number(range[1]), Number(range[2])) : min;
    spec.entries = `${chosen.id},${chance},${min},${max}`;
  }

  function postProcess(plan, input, project, analysis) {
    if (!plan?.components?.length) return plan;
    const component = plan.components[0];
    const spec = component.spec || {};

    if (component.type === 'weapon') {
      applyName(component, input, ['自定义武器','雷霆之刃','烈焰法杖','治愈之刃']);
      const visual = analysis.concepts.find((entry) => VISUAL_TO_VALUE[entry.id]);
      if (visual) spec.visual = VISUAL_TO_VALUE[visual.id];
      const effect = analysis.concepts.find((entry) => EFFECT_TO_VALUE[entry.id]);
      if (effect) spec.effect = EFFECT_TO_VALUE[effect.id];
      const trigger = analysis.concepts.find((entry) => TRIGGER_TO_VALUE[entry.id]);
      if (trigger) spec.trigger = TRIGGER_TO_VALUE[trigger.id];
      applyAttributes(spec, analysis, { damage:'damage', cooldown:'cooldown', range:'range', power:'power', attack_speed:'attackSpeed', model_data:'modelData' });
      applyColor(spec, analysis);
      applyFlags(spec, analysis);
      if (spec.effect && spec.effect !== 'none') {
        const triggerText = spec.trigger === 'on_hit' ? '命中时' : spec.trigger === 'passive' ? '被动' : '右键';
        spec.lore = `${triggerText}触发${Gen.EFFECT_META[spec.effect]?.label || '特殊效果'}`;
      }
    } else if (component.type === 'mob') {
      applyName(component, input, ['废土守卫','自定义生物']);
      const mob = longestEntity(analysis);
      if (mob) spec.base = mob.id;
      if (mob?.boss || hasConcept(analysis, 'type.boss')) spec.boss = true;
      applyAttributes(spec, analysis, { health:'health', damage:'damage', speed:'speed', armor:'armor', follow_range:'followRange' });
      applyFlags(spec, analysis);
    } else if (component.type === 'item') {
      applyName(component, input, ['自定义物品']);
      const matchedItem = longestItem(analysis);
      if (matchedItem) spec.base = matchedItem.id;
      applyAttributes(spec, analysis, { count:'count', model_data:'modelData' });
      applyColor(spec, analysis);
      applyFlags(spec, analysis);
    } else if (component.type === 'block') {
      applyName(component, input, ['星辉方块']);
      applyAttributes(spec, analysis, { range:'distance', scale:'scale', model_data:'modelData' });
      applyColor(spec, analysis);
      applyFlags(spec, analysis);
    } else if (component.type === 'recipe') {
      updateRecipe(spec, analysis);
    } else if (component.type === 'loot') {
      updateLoot(spec, analysis);
    } else if (component.type === 'command') {
      const commandEffect = analysis.commandEffects[0];
      if (commandEffect) {
        spec.type = 'effect';
        spec.commandId = commandEffect.id;
        spec.name = `${COMMAND_EFFECT_NAMES[commandEffect.id] || '状态'}效果`;
        if (analysis.attributes.duration) spec.amount = analysis.attributes.duration.value;
        if (analysis.attributes.level) spec.extra = Math.max(0, analysis.attributes.level.value - 1);
        spec.command = Gen.buildCommand(spec);
      } else if (/给|给予|give/i.test(analysis.source) && longestItem(analysis)) {
        spec.type = 'give';
        spec.commandId = longestItem(analysis).id;
        if (analysis.attributes.count) spec.amount = analysis.attributes.count.value;
        spec.command = Gen.buildCommand(spec);
      }
    } else if (component.type === 'forge') {
      applyName(component, input, ['Ruby Gear']);
      applyAttributes(spec, analysis, { damage:'primaryStat', durability:'durability', attack_speed:'secondaryStat', nutrition:'primaryStat' });
      applyColor(spec, analysis);
      applyFlags(spec, analysis);
    }

    plan.vocabulary = summarizeAnalysis(analysis);
    const matchedCount = plan.vocabulary.concepts.length + plan.vocabulary.items.length + plan.vocabulary.entities.length + Object.keys(plan.vocabulary.attributes).length;
    if (matchedCount) {
      const domains = analysis.futureDomains.map((entry) => entry.label);
      const suffix = domains.length ? `；同时识别到未来领域：${[...new Set(domains)].join('、')}` : '';
      plan.note = `本地扩展词库命中 ${matchedCount} 个概念/实体/参数，未调用 AI${suffix}。生成后仍可在对应工作室细调。`;
      plan.confidence = U.clamp((plan.confidence || 75) + Math.min(8, Math.floor(matchedCount / 2)), 1, 98);
    }
    return plan;
  }

  function forcePromptForType(type, input) {
    const name = guessName(input, {
      weapon: '自定义武器', item: '自定义物品', block: '自定义方块', mob: '自定义生物',
      loot: '自定义掉落', recipe: '自定义配方', advancement: '自定义进度',
      command: '智能指令', forge: 'GameForge Mod'
    }[type] || '自定义内容');
    // Use unambiguous placeholders here. The original player-provided name is restored
    // by postProcess/applyName, so words such as “传送” inside a title cannot force the
    // legacy parser into command mode.
    return {
      weapon: '创建一把自定义剑',
      item: '创建一个自定义物品',
      block: '创建一个自定义方块',
      mob: '创建一只自定义生物',
      loot: '创建一个掉落表，死亡后掉钻石',
      recipe: '创建一个配方，用钻石合成钻石块',
      advancement: '创建一个自定义进度',
      command: '创建一条指令 say GameForge',
      forge: '创建一个 Forge Mod'
    }[type] || String(input || '');
  }

  function parsePrompt(input, project) {
    const analysis = analyze(input);
    if (analysis.type === 'concept') return conceptPlan(input, project, analysis);
    let plan = originalParsePrompt(augmentPrompt(input, analysis), project);
    const generatedType = plan?.components?.[0]?.type;
    if (analysis.type && generatedType && generatedType !== analysis.type) {
      plan = originalParsePrompt(forcePromptForType(analysis.type, input), project);
    }
    return postProcess(plan, input, project, analysis);
  }

  Gen.TYPE_META.concept = { label: '概念草案', icon: '◈', group: '本地词库已识别 · 等待对应生成器' };
  Gen.parsePrompt = parsePrompt;
  Gen.componentSummary = function (component) {
    if (component?.type === 'concept') {
      const spec = component.spec || {};
      const terms = Array.isArray(spec.detected) ? spec.detected.slice(0, 4).join(' · ') : '';
      return `${spec.categoryLabel || '大型玩法'}${terms ? ` · ${terms}` : ''}`;
    }
    return originalComponentSummary(component);
  };

  Gen.selfTests = async function () {
    const results = await originalSelfTests();
    const test = async (name, fn) => {
      const started = performance.now();
      try {
        await fn();
        results.push({ name, ok: true, duration: performance.now() - started });
      } catch (error) {
        results.push({ name, ok: false, duration: performance.now() - started, message: error.message });
      }
    };

    await test('扩展词库识别口语武器、数值与触发方式', () => {
      const project = GF.project.create({ namespace: 'gf_vocab' });
      const plan = parsePrompt('整一把叫霜月的太刀，砍到怪时冻住，攻击力二十，CD三秒', project);
      const spec = plan.components[0]?.spec;
      if (plan.components[0]?.type !== 'weapon' || spec.effect !== 'freeze' || spec.trigger !== 'on_hit' || spec.damage !== 20 || spec.cooldown !== 3) {
        throw new Error('口语武器解析不完整');
      }
    });
    await test('扩展词库识别实体别名', () => {
      const project = GF.project.create({ namespace: 'gf_vocab' });
      const plan = parsePrompt('做一只叫沙漠猎手的尸壳，HP八十，攻击力九', project);
      const spec = plan.components[0]?.spec;
      if (plan.components[0]?.type !== 'mob' || spec.base !== 'minecraft:husk' || spec.health !== 80 || spec.damage !== 9) {
        throw new Error('实体别名解析不完整');
      }
    });
    await test('扩展词库识别更多原版物品', () => {
      const project = GF.project.create({ namespace: 'gf_vocab' });
      const plan = parsePrompt('创建一个叫传送核心的物品，基础材料是末影珍珠，蓝色发光', project);
      const spec = plan.components[0]?.spec;
      if (plan.components[0]?.type !== 'item' || spec.base !== 'minecraft:ender_pearl' || spec.color !== '#4ca7ff' || !spec.glow) {
        throw new Error('原版物品或颜色解析不完整');
      }
    });
    await test('世界提示词不再误生成武器', () => {
      const project = GF.project.create({ namespace: 'gf_vocab' });
      const plan = parsePrompt('做一个永夜冰雪末日世界，有暴雪和地下遗迹', project);
      if (plan.components[0]?.type !== 'concept' || plan.components[0]?.spec?.category !== 'domain.world') {
        throw new Error('世界提示词仍被错误分类');
      }
    });

    return results;
  };

  const effectiveAliasCount = new Set([
    ...conceptIndex.map((record) => `c:${record.alias}`),
    ...itemIndex.map((record) => `i:${record.alias}`),
    ...entityIndex.map((record) => `e:${record.alias}`),
    ...colorIndex.map((record) => `o:${record.alias}`),
    ...commandEffectIndex.map((record) => `m:${record.alias}`),
    ...attributeIndex.map((record) => `a:${record.alias}`)
  ]).size;

  const expansionApi = Object.freeze({
    installed: true,
    version: PACK_VERSION,
    stats: Object.freeze({
      ...(Data.stats || {}),
      effectiveAliases: effectiveAliasCount,
      futureDomains: Data.concepts.filter((entry) => entry.future && entry.id.startsWith(FUTURE_DOMAIN_PREFIX)).length,
      themes: Data.concepts.filter((entry) => entry.category === 'theme').length
    }),
    analyze,
    normalize,
    parsePrompt,
    data: Data,
    baseVocabulary
  });

  GF.vocabularyExpansion = expansionApi;
  if (!GF.vocabulary?.installed) GF.vocabulary = expansionApi;

  console.info(`[GameForge Vocabulary Expansion] v${PACK_VERSION} installed: ${effectiveAliasCount} effective aliases.`);
})();
