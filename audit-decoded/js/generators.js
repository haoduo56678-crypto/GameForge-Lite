(function () {
  'use strict';

  const GF = window.GameForge;
  if (!GF) throw new Error('GameForge core failed to load.');

  const U = GF.utils;
  const B = GF.binary;
  const PACK_FORMAT = GF.PACK_FORMAT;
  const MC_VERSION = GF.MINECRAFT_VERSION;
  const FORGE_VERSION = GF.FORGE_VERSION;

  const TYPE_META = {
    weapon: { label: '自定义武器', icon: '⚔', group: '数据包 + 资源包' },
    item: { label: '自定义物品', icon: '◆', group: '数据包 + 资源包' },
    block: { label: '装饰方块', icon: '▣', group: '数据包 + 资源包' },
    mob: { label: '生物与 Boss', icon: '♜', group: '数据包' },
    command: { label: '指令', icon: '›_', group: '函数' },
    recipe: { label: '配方', icon: '⌘', group: '数据包' },
    loot: { label: '掉落表', icon: '◇', group: '数据包' },
    function: { label: '函数', icon: 'ƒ', group: '数据包' },
    advancement: { label: '进度', icon: '★', group: '数据包' },
    resource: { label: '资源包物品', icon: '▤', group: '资源包' },
    forge: { label: 'Forge Mod', icon: '⬡', group: 'Forge 源码' }
  };

  const EFFECT_META = {
    lightning: { label: '召唤闪电', icon: '⚡', color: 'aqua' },
    fire: { label: '点燃目标', icon: '🔥', color: 'red' },
    explosion: { label: '爆炸', icon: '✹', color: 'gold' },
    poison: { label: '中毒', icon: '☠', color: 'green' },
    freeze: { label: '冻结减速', icon: '❄', color: 'aqua' },
    heal: { label: '治疗自己', icon: '✚', color: 'light_purple' },
    dash: { label: '向前突进', icon: '➤', color: 'yellow' },
    summon_wolf: { label: '召唤驯服狼', icon: '♞', color: 'white' },
    none: { label: '无主动效果', icon: '—', color: 'gray' }
  };

  const file = (name, data, extra = {}) => ({ ...extra, name: String(name).replace(/^\/+/, ''), data });
  const jsonFile = (name, value, extra = {}) => file(name, `${JSON.stringify(value, null, 2)}\n`, extra);
  const packMeta = (description) => ({ pack: { pack_format: PACK_FORMAT, description } });
  const textComponent = (text, color = 'white', italic = false) => JSON.stringify({ text: String(text), color, italic });
  const snbtString = (value) => `'${String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
  const decimal = (value, suffix = '') => `${Number(value).toFixed(4).replace(/0+$/, '').replace(/\.$/, '') || '0'}${suffix}`;
  const boolByte = (value) => value ? '1b' : '0b';
  const stripNamespace = (value) => U.ensureMinecraftId(value).split(':')[1];
  const namespaceOf = (value) => U.ensureMinecraftId(value).split(':')[0];
  const dataPath = (namespace, folder, id, extension) => `data/${namespace}/${folder}/${U.cleanPath(id)}.${extension}`;
  const javaString = (value) => String(value ?? '').replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\r?\n/g, '\\n');

  const VALID_TEXT_COLORS = new Set(['black','dark_blue','dark_green','dark_aqua','dark_red','dark_purple','gold','gray','dark_gray','blue','green','aqua','red','light_purple','yellow','white']);
  const LOOT_TYPE_ALIASES = Object.freeze({ entity: 'entity', entities: 'entity', mob: 'entity', mobs: 'entity', block: 'block', blocks: 'block', chest: 'chest', chests: 'chest', generic: 'generic', gameplay: 'generic' });
  const FUNCTION_TRIGGER_ALIASES = Object.freeze({ manual: 'manual', load: 'load', tick: 'tick', interval: 'interval', schedule: 'interval' });

  function normalizeLootType(value) {
    return LOOT_TYPE_ALIASES[String(value || '').trim().toLowerCase()] || 'generic';
  }

  function normalizeFunctionTrigger(value) {
    return FUNCTION_TRIGGER_ALIASES[String(value || '').trim().toLowerCase()] || 'manual';
  }

  function normalizeTextColor(value, fallback = 'aqua') {
    const color = String(value || '').trim().toLowerCase();
    return VALID_TEXT_COLORS.has(color) ? color : fallback;
  }

  function makeComponent(type, name, spec) {
    return GF.project.normalizeComponent({ type, name: name || TYPE_META[type]?.label || '组件', spec: { ...spec } });
  }

  function effectFromText(text) {
    if (/(闪电|雷霆|雷电|lightning|thunder)/i.test(text)) return 'lightning';
    if (/(火焰|烈焰|燃烧|点燃|fire|flame|burn)/i.test(text)) return 'fire';
    if (/(爆炸|爆裂|tnt|explode|explosion)/i.test(text)) return 'explosion';
    if (/(剧毒|中毒|毒|poison|toxic)/i.test(text)) return 'poison';
    if (/(冻结|冰冻|寒冰|freeze|frost|ice)/i.test(text)) return 'freeze';
    if (/(治疗|回血|恢复生命|heal|healing)/i.test(text)) return 'heal';
    if (/(突进|冲刺|dash|blink|跃迁)/i.test(text)) return 'dash';
    if (/(狼|wolf)/i.test(text)) return 'summon_wolf';
    return 'none';
  }

  function extractName(text, fallback) {
    const source = String(text || '').trim();
    const quoted = source.match(/[“"']([^”"']{1,42})[”"']/);
    if (quoted) return quoted[1].trim();
    const called = source.match(/(?:叫做?|名为|名字(?:叫|是)?|called|named)\s*[:：]?\s*([^，,。.!！？\n]{1,48})/i);
    if (called) {
      let name = called[1]
        .split(/(?:右键|左键|攻击时|攻擊時|命中时|命中時|伤害|傷害|冷却|冷卻|还要|還要|并且|並且|而且|可以|能够|能夠|that\s|with\s)/i, 1)[0]
        .trim();
      // “叫雷霆审判的钻石剑”中的“钻石剑”是在说明载体，不属于作品名。
      name = name.replace(/的(?:下界合金|钻石|鑽石|铁|鐵|金|石|木)?(?:长剑|長劍|剑|劍|战斧|戰斧|斧头|斧頭|法杖|魔杖|匕首|锤|錘|武器|方块|方塊|物品|Boss|boss|模组|模組|Mod|mod)\s*$/i, '').trim();
      return name || fallback;
    }
    return fallback;
  }

  function numberNear(text, labels, fallback) {
    const escaped = labels.map((label) => label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    const after = new RegExp(`(?:${escaped})\\s*(?:为|是|:|：|=|of)?\\s*(-?\\d+(?:\\.\\d+)?)`, 'i');
    const before = new RegExp(`(-?\\d+(?:\\.\\d+)?)\\s*(?:${escaped})`, 'i');
    const match = String(text).match(after) || String(text).match(before);
    return match ? Number(match[1]) : fallback;
  }

  function modelDataFor(text, fallback) {
    return Math.max(1, Math.round(numberNear(text, ['模型编号', 'CustomModelData', 'model data'], fallback)));
  }

  function idFromName(name, fallback) {
    const ascii = String(name || '').normalize('NFKD').replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').toLowerCase();
    return U.cleanId(ascii || fallback, fallback);
  }

  const ITEM_ALIASES = [
    [/(?:minecraft:netherite_ingot|下界合金锭|下界合金錠|netherite ingot)/i, 'minecraft:netherite_ingot', '下界合金锭'],
    [/(?:minecraft:diamond_block|钻石块|鑽石塊|diamond block)/i, 'minecraft:diamond_block', '钻石块'],
    [/(?:minecraft:nether_star|下界之星|nether star)/i, 'minecraft:nether_star', '下界之星'],
    [/(?:minecraft:lightning_rod|避雷针|避雷針|闪电杆|閃電桿|lightning rod)/i, 'minecraft:lightning_rod', '避雷针'],
    [/(?:minecraft:blaze_rod|烈焰棒|blaze rod)/i, 'minecraft:blaze_rod', '烈焰棒'],
    [/(?:minecraft:amethyst_shard|紫水晶碎片|amethyst shard)/i, 'minecraft:amethyst_shard', '紫水晶碎片'],
    [/(?:minecraft:diamond|钻石|鑽石|diamond)/i, 'minecraft:diamond', '钻石'],
    [/(?:minecraft:emerald|绿宝石|綠寶石|emerald)/i, 'minecraft:emerald', '绿宝石'],
    [/(?:minecraft:gold_ingot|金锭|金錠|gold ingot)/i, 'minecraft:gold_ingot', '金锭'],
    [/(?:minecraft:iron_ingot|铁锭|鐵錠|iron ingot)/i, 'minecraft:iron_ingot', '铁锭'],
    [/(?:minecraft:lapis_lazuli|青金石|lapis)/i, 'minecraft:lapis_lazuli', '青金石'],
    [/(?:minecraft:redstone|红石|紅石|redstone)/i, 'minecraft:redstone', '红石'],
    [/(?:minecraft:glowstone_dust|萤石粉|螢石粉|glowstone dust)/i, 'minecraft:glowstone_dust', '萤石粉'],
    [/(?:minecraft:rotten_flesh|腐肉|rotten flesh)/i, 'minecraft:rotten_flesh', '腐肉'],
    [/(?:minecraft:cobblestone|圆石|圓石|cobblestone)/i, 'minecraft:cobblestone', '圆石'],
    [/(?:minecraft:stone|石头|石頭|stone)/i, 'minecraft:stone', '石头'],
    [/(?:minecraft:stick|木棍|棍子|stick)/i, 'minecraft:stick', '木棍'],
    [/(?:minecraft:apple|苹果|蘋果|apple)/i, 'minecraft:apple', '苹果']
  ];

  function itemFromText(text, fallback = 'minecraft:stone') {
    const source = String(text || '');
    const explicit = source.match(/minecraft:[a-z0-9_./-]+/i);
    if (explicit) return U.ensureMinecraftId(explicit[0], fallback);
    for (const [pattern, id] of ITEM_ALIASES) if (pattern.test(source)) return id;
    return U.ensureMinecraftId(fallback);
  }

  function itemDisplayName(id) {
    const normalized = U.ensureMinecraftId(id);
    const match = ITEM_ALIASES.find(([, candidate]) => candidate === normalized);
    return match ? match[2] : normalized.split(':')[1].replace(/_/g, ' ');
  }

  function extractPercent(text, fallback = 100) {
    const match = String(text || '').match(/(\d+(?:\.\d+)?)\s*%/);
    return U.clamp(match ? Number(match[1]) : fallback, 0, 100);
  }

  function extractCountRange(text, fallbackMin = 1, fallbackMax = fallbackMin) {
    const source = String(text || '');
    const range = source.match(/(\d+)\s*(?:到|至|[-~～])\s*(\d+)\s*(?:个|個)?/);
    if (range) {
      const first = Math.max(0, Number(range[1]) || 0);
      const second = Math.max(0, Number(range[2]) || 0);
      return { min: Math.min(first, second), max: Math.max(first, second) };
    }
    const single = source.match(/(?:掉落?|drop(?:s)?|数量|數量|count)[^\d]{0,8}(\d+)\s*(?:个|個)?/i) || source.match(/(\d+)\s*(?:个|個)(?:\s*(?:掉落?|drop))?/i);
    const count = single ? Math.max(0, Number(single[1]) || 0) : fallbackMin;
    return { min: count, max: single ? count : fallbackMax };
  }

  function extractLootDetails(text, defaults = {}) {
    const source = String(text || '');
    const dropParts = source.split(/(?:掉落|掉|drop(?:s)?)/i);
    const preferred = dropParts.length > 1 ? dropParts.slice(1).join(' ') : source;
    const fallbackItem = defaults.item || 'minecraft:diamond';
    let item = itemFromText(preferred, fallbackItem);
    if (preferred !== source && item === U.ensureMinecraftId(fallbackItem)) item = itemFromText(source, item);
    const chance = extractPercent(source, defaults.chance ?? 100);
    const counts = extractCountRange(preferred, defaults.min ?? 1, defaults.max ?? defaults.min ?? 1);
    return { item, chance, min: counts.min, max: counts.max };
  }

  function recipeDetailsFromText(text, namespace) {
    const source = String(text || '').trim();
    const pieces = source.split(/(?:合成|制作成|製作成|做成|craft(?:ed)?(?:\s+into)?)/i);
    const left = pieces[0] || source;
    const right = pieces.length > 1 ? pieces.slice(1).join(' ') : '';
    const ingredientCountMatch = left.match(/(\d+)\s*(?:个|個)?/);
    const resultCountMatch = right.match(/(\d+)\s*(?:个|個)?/);
    const ingredientCount = U.clamp(ingredientCountMatch ? Number(ingredientCountMatch[1]) : 1, 1, 9);
    const ingredient = itemFromText(left, 'minecraft:diamond');
    const result = itemFromText(right, 'minecraft:diamond_block');
    const count = U.clamp(resultCountMatch ? Number(resultCountMatch[1]) : 1, 1, 64);
    const grid = Array(9).fill('');
    if (ingredientCount >= 9) grid.fill(ingredient);
    else if (ingredientCount === 1) grid[4] = ingredient;
    else for (let index = 0; index < ingredientCount; index += 1) grid[index] = ingredient;
    const resultName = itemDisplayName(result);
    return {
      id: `${U.cleanId(result.split(':')[1], 'custom')}_recipe`, name: `${resultName}配方`,
      recipeType: /(无序|無序|shapeless)/i.test(source) ? 'shapeless' : 'shaped',
      result, count, group: namespace, experience: 0, cookingTime: 200, grid
    };
  }

  function commandFromPrompt(text) {
    const source = String(text || '').trim();
    const duration = U.clamp(numberNear(source, ['秒', '时长', '時長', 'duration'], 30), 1, 1000000);
    const level = U.clamp(numberNear(source, ['等级', '等級', '级', '級', 'level', 'amplifier'], 1), 1, 256);
    const target = /所有|全部|everyone|@a/i.test(source) ? '@a' : '@p';
    let effectId = '';
    if (/(速度|speed)/i.test(source)) effectId = 'minecraft:speed';
    else if (/(力量|strength)/i.test(source)) effectId = 'minecraft:strength';
    else if (/(急迫|haste)/i.test(source)) effectId = 'minecraft:haste';
    else if (/(抗性|resistance)/i.test(source)) effectId = 'minecraft:resistance';
    else if (/(生命恢复|生命恢復|再生|regeneration)/i.test(source)) effectId = 'minecraft:regeneration';
    else if (/(夜视|夜視|night vision)/i.test(source)) effectId = 'minecraft:night_vision';
    else if (/(隐身|隱身|invisibility)/i.test(source)) effectId = 'minecraft:invisibility';
    else if (/(跳跃|跳躍|jump)/i.test(source)) effectId = 'minecraft:jump_boost';

    let spec;
    if (effectId) spec = { id: `effect_${effectId.split(':')[1]}`, type: 'effect', target, commandId: effectId, amount: duration, name: `${itemDisplayName(effectId)}效果`, extra: level - 1, x: '~', y: '~', z: '~', second: '~5 ~5 ~5' };
    else if (/(闪电|雷电|雷霆|lightning|thunder)/i.test(source)) spec = { id: 'summon_lightning', type: 'summon', target, commandId: 'minecraft:lightning_bolt', amount: 1, name: '闪电', extra: '1', x: '~', y: '~', z: '~', second: '~5 ~5 ~5' };
    else if (/(标题|title)/i.test(source)) spec = { id: 'show_title', type: 'title', target, commandId: 'minecraft:stone', amount: 1, name: extractName(source, 'GameForge'), extra: 'aqua', x: '~', y: '~', z: '~', second: '~5 ~5 ~5' };
    else if (/(给予|给|獲得|获得|give)/i.test(source)) {
      const item = itemFromText(source, 'minecraft:diamond');
      const amountMatch = source.match(/(\d+)\s*(?:个|個)/);
      spec = { id: `give_${item.split(':')[1]}`, type: 'give', target, commandId: item, amount: amountMatch ? Number(amountMatch[1]) : 1, name: itemDisplayName(item), extra: '1', x: '~', y: '~', z: '~', second: '~5 ~5 ~5' };
    } else {
      const direct = source.match(/^\s*\/(.+)$/);
      spec = { id: 'smart_command', type: 'raw', target, commandId: direct ? direct[1] : `say ${source || 'GameForge 已收到你的想法'}`, amount: 1, name: '智能指令', extra: '1', x: '~', y: '~', z: '~', second: '~5 ~5 ~5' };
    }
    spec.command = buildCommand(spec);
    return spec;
  }

  function parsePrompt(input, project) {
    const text = String(input || '').trim();
    const namespace = U.cleanNamespace(project?.namespace || 'gameforge');
    const weaponLike = /(剑|劍|武器|法杖|魔杖|匕首|锤|錘|战斧|戰斧|axe|sword|staff|wand|hammer|dagger)/i.test(text);
    let type = 'weapon';
    if (/(forge|\bmod\b|模组|模組)/i.test(text)) type = 'forge';
    else if (/(boss|首领|首領|生物|怪物|实体|實體|僵尸|殭屍|骷髅|骷髏|苦力怕|牛|猪|豬|羊|cow|pig|sheep|zombie|skeleton|creeper)/i.test(text) && !/(掉(?:落)?|loot|drop)/i.test(text)) type = 'mob';
    else if (/(boss|首领|首領)/i.test(text)) type = 'mob';
    else if (/(方块|方塊|block)/i.test(text)) type = 'block';
    else if (/(掉落|\d+(?:\.\d+)?\s*%\s*(?:会|會)?掉|死亡后?.{0,20}掉|擊殺后?.{0,20}掉|击杀后?.{0,20}掉|loot|drops?)/i.test(text)) type = 'loot';
    else if (/(配方|recipe|合成|制作成|製作成|做成|craft)/i.test(text) && !weaponLike) type = 'recipe';
    else if (/(进度|進度|advancement|成就)/i.test(text)) type = 'advancement';
    else if ((/(指令|command|^\s*\/|给(?:所有|全部|玩家|我)|給(?:所有|全部|玩家|我)|给予|給予|状态效果|狀態效果|效果\s*\d*\s*秒|传送|傳送|标题|標題|粒子|声音|聲音)/i.test(text)) && !weaponLike) type = 'command';
    else if (/(物品|item|水晶|宝石|寶石|图腾|圖騰)/i.test(text) && !weaponLike) type = 'item';

    const effect = effectFromText(text);
    const plan = { type, confidence: 82, components: [], note: '使用本地规则解析，不调用付费 AI。生成前仍可在对应工作室继续修改。' };

    if (type === 'weapon') {
      const fallbackName = effect === 'lightning' ? '雷霆之刃' : effect === 'fire' ? '烈焰法杖' : effect === 'heal' ? '治愈之刃' : '自定义武器';
      const name = extractName(text, fallbackName);
      const visual = /(法杖|staff)/i.test(text) ? 'staff' : /(魔杖|wand)/i.test(text) ? 'wand' : /(斧|axe)/i.test(text) ? 'axe' : /(锤|錘|hammer)/i.test(text) ? 'hammer' : /(匕首|dagger)/i.test(text) ? 'dagger' : 'sword';
      const trigger = /(命中|攻击时|攻擊時|on hit)/i.test(text) ? 'on_hit' : /(没有技能|沒有技能|被动|被動|passive)/i.test(text) ? 'passive' : 'right_click';
      const spec = {
        id: idFromName(name, `${effect === 'none' ? 'custom' : effect}_${visual}`), name,
        lore: effect === 'none' ? '由 GameForge 创建的自定义武器' : `${trigger === 'right_click' ? '右键' : '命中时'}触发${EFFECT_META[effect].label}`,
        visual, modelData: modelDataFor(text, 1001), color: effect === 'fire' ? '#ff7a36' : effect === 'heal' ? '#6fe6a0' : effect === 'poison' ? '#78d94b' : '#69d8ff',
        trigger, effect, damage: U.clamp(numberNear(text, ['伤害', 'damage'], 12), 1, 100), attackSpeed: visual === 'axe' || visual === 'hammer' ? 1 : 1.6,
        cooldown: U.clamp(numberNear(text, ['冷却', 'cooldown'], effect === 'explosion' ? 8 : 5), 0, 120), range: U.clamp(numberNear(text, ['距离', '范围', 'range'], 6), 1, 30),
        power: U.clamp(numberNear(text, ['强度', '威力', 'power'], 3), 1, 10), enchant: 3, unbreakable: true, glow: true,
        recipeEnabled: !/(不要配方|无配方|無配方|no recipe)/i.test(text), particles: true,
        recipeGrid: ['minecraft:diamond', 'minecraft:nether_star', 'minecraft:diamond', '', 'minecraft:lightning_rod', '', '', 'minecraft:blaze_rod', '']
      };
      plan.components.push(makeComponent('weapon', name, spec));
      plan.confidence = effect === 'none' ? 74 : 92;
    } else if (type === 'mob') {
      const name = extractName(text, /(?:boss|首领|首領)/i.test(text) ? '废土守卫' : '自定义生物');
      const base = /(骷髅|骷髏|skeleton)/i.test(text) ? 'minecraft:skeleton' : /(守卫者|warden)/i.test(text) ? 'minecraft:warden' : /(苦力怕|creeper)/i.test(text) ? 'minecraft:creeper' : /(牛|cow)/i.test(text) ? 'minecraft:cow' : /(猪|豬|pig)/i.test(text) ? 'minecraft:pig' : 'minecraft:zombie';
      const drop = extractLootDetails(text, { item: 'minecraft:diamond', chance: 35, min: 1, max: 1 });
      plan.components.push(makeComponent('mob', name, {
        id: idFromName(name, 'custom_boss'), name, base, health: U.clamp(numberNear(text, ['血', '生命', 'health'], 200), 1, 10000),
        damage: U.clamp(numberNear(text, ['伤害', 'damage'], 16), 0, 1000), speed: U.clamp(numberNear(text, ['速度', 'speed'], .28), 0, 2), armor: 10, followRange: 48,
        mainHand: base === 'minecraft:cow' || base === 'minecraft:pig' ? '' : 'minecraft:netherite_axe', head: base === 'minecraft:cow' || base === 'minecraft:pig' ? '' : 'minecraft:netherite_helmet', boss: /boss|首领|首領/i.test(text), glow: true, persistent: true, silent: false,
        drops: `${drop.item},${drop.chance},${drop.min},${drop.max}\nminecraft:rotten_flesh,100,2,8`
      }));
      plan.confidence = 90;
    } else if (type === 'block') {
      const name = extractName(text, '星辉方块');
      plan.components.push(makeComponent('block', name, {
        id: idFromName(name, 'custom_block'), name, carrier: 'minecraft:warped_fungus_on_a_stick', collision: /无碰撞|無碰撞|no collision/i.test(text) ? 'minecraft:light' : 'minecraft:barrier',
        modelData: modelDataFor(text, 1201), distance: U.clamp(numberNear(text, ['距离', 'distance'], 3), 1, 8), scale: U.clamp(numberNear(text, ['缩放', 'scale'], 1), .25, 4),
        color: /蓝|藍|blue/i.test(text) ? '#4ca7ff' : '#48e0d1', glow: !/(不发光|不發光|no glow)/i.test(text), gravity: false
      }));
      plan.confidence = 88;
    } else if (type === 'forge') {
      const name = extractName(text, 'Ruby Gear');
      const contentType = /(方块|方塊|block)/i.test(text) ? 'block' : /(食物|food)/i.test(text) ? 'food' : /(普通物品|item)/i.test(text) ? 'item' : 'tool';
      const id = idFromName(name, contentType === 'block' ? 'ruby_block' : contentType === 'food' ? 'ruby_apple' : contentType === 'item' ? 'ruby_gem' : 'ruby_sword');
      const modId = U.cleanId(id.replace(/_(sword|block|item|gem|apple)$/, '') || 'gameforge_mod').replace(/[.-]/g, '_');
      plan.components.push(makeComponent('forge', name, {
        modId, modName: name, packageName: `com.gameforge.${modId}`, author: 'GameForge Creator', version: '1.0.0', license: 'MIT', description: `A mod generated from: ${text}`,
        contentType, registryId: id, displayName: name, primaryStat: numberNear(text, ['伤害', 'damage', '营养', '營養'], contentType === 'food' ? 6 : 10),
        secondaryStat: numberNear(text, ['攻击速度', '攻擊速度', '饱和度', '飽和度'], contentType === 'food' ? .6 : -2.4), durability: numberNear(text, ['耐久', 'durability', '堆叠', '堆疊'], contentType === 'item' ? 64 : 1800),
        hardness: 3, resistance: 6, color: '#e5395d', recipeEnabled: true, creativeTab: true
      }));
      plan.confidence = 89;
    } else if (type === 'loot') {
      const drop = extractLootDetails(text, { item: 'minecraft:diamond', chance: 10, min: 1, max: 1 });
      const name = extractName(text, `${itemDisplayName(drop.item)}掉落表`);
      const tableType = /(方块|方塊|挖掘|破坏|破壞|block)/i.test(text) ? 'block' : /(箱子|宝箱|寶箱|chest)/i.test(text) ? 'chest' : 'entity';
      plan.components.push(makeComponent('loot', name, { id: idFromName(name, `${drop.item.split(':')[1]}_drop`), tableType, entries: `${drop.item},${drop.chance},${drop.min},${drop.max}`, killedByPlayer: /(玩家击杀|玩家擊殺|killed by player)/i.test(text), survivesExplosion: tableType === 'block' }));
      plan.confidence = 91;
    } else if (type === 'recipe') {
      const spec = recipeDetailsFromText(text, namespace);
      plan.components.push(makeComponent('recipe', spec.name, spec));
      plan.confidence = spec.result !== 'minecraft:diamond_block' || /钻石块|鑽石塊|diamond block/i.test(text) ? 91 : 76;
    } else if (type === 'advancement') {
      const name = extractName(text, '新的进度');
      plan.components.push(makeComponent('advancement', name, { id: idFromName(name, 'custom_advancement'), parent: 'minecraft:story/root', title: name, icon: 'minecraft:nether_star', description: text, frame: 'goal', trigger: 'inventory_changed', target: itemFromText(text, 'minecraft:nether_star'), reward: '', toast: true, announce: true, hidden: false }));
      plan.confidence = 76;
    } else if (type === 'command') {
      const spec = commandFromPrompt(text);
      plan.components.push(makeComponent('command', '智能生成指令', spec));
      plan.confidence = spec.type === 'raw' ? 68 : 92;
    } else {
      const name = extractName(text, '自定义物品');
      const base = itemFromText(text, 'minecraft:amethyst_shard');
      plan.components.push(makeComponent('item', name, { id: idFromName(name, 'custom_item'), name, base, count: 1, lore: text || '由 GameForge 创建', style: 'generated', modelData: modelDataFor(text, 1101), color: '#c886ff', glow: true, unbreakable: false, recipeEnabled: true, recipeGrid: ['minecraft:amethyst_shard','minecraft:glowstone_dust','minecraft:amethyst_shard','minecraft:glowstone_dust','minecraft:nether_star','minecraft:glowstone_dust','minecraft:amethyst_shard','minecraft:glowstone_dust','minecraft:amethyst_shard'] }));
      plan.confidence = 78;
    }
    return plan;
  }

  function templateComponents(key) {
    const templates = {
      thunder_blade: [makeComponent('weapon', '雷霆之刃', { id: 'thunder_blade', name: '雷霆之刃', lore: '右键释放雷霆之力', visual: 'sword', modelData: 1001, color: '#69d8ff', trigger: 'right_click', effect: 'lightning', damage: 12, attackSpeed: 1.6, cooldown: 5, range: 7, power: 3, enchant: 3, unbreakable: true, glow: true, recipeEnabled: true, particles: true, recipeGrid: ['minecraft:diamond','minecraft:nether_star','minecraft:diamond','','minecraft:lightning_rod','','','minecraft:blaze_rod',''] })],
      fire_staff: [makeComponent('weapon', '烈焰法杖', { id: 'fire_staff', name: '烈焰法杖', lore: '右键点燃最近的敌人', visual: 'staff', modelData: 1002, color: '#ff7338', trigger: 'right_click', effect: 'fire', damage: 8, attackSpeed: 1.8, cooldown: 3, range: 9, power: 4, enchant: 2, unbreakable: true, glow: true, recipeEnabled: true, particles: true, recipeGrid: ['minecraft:blaze_powder','minecraft:fire_charge','minecraft:blaze_powder','','minecraft:blaze_rod','','','minecraft:stick',''] })],
      healing_totem: [makeComponent('weapon', '治愈图腾', { id: 'healing_totem', name: '治愈图腾', lore: '右键恢复生命值', visual: 'wand', modelData: 1003, color: '#6fe6a0', trigger: 'right_click', effect: 'heal', damage: 4, attackSpeed: 2, cooldown: 8, range: 4, power: 2, enchant: 1, unbreakable: true, glow: true, recipeEnabled: true, particles: true, recipeGrid: ['minecraft:gold_ingot','minecraft:ghast_tear','minecraft:gold_ingot','','minecraft:totem_of_undying','','','minecraft:stick',''] })],
      boss_zombie: [makeComponent('mob', '废土守卫', { id: 'wasteland_guardian', name: '废土守卫', base: 'minecraft:zombie', health: 200, damage: 16, speed: .28, armor: 10, followRange: 48, mainHand: 'minecraft:netherite_axe', head: 'minecraft:netherite_helmet', boss: true, glow: true, persistent: true, silent: false, drops: 'minecraft:netherite_ingot,35,1,1\nminecraft:diamond,75,2,5\nminecraft:rotten_flesh,100,4,12' })],
      diamond_cow: [makeComponent('loot', '钻石牛掉落', { id: 'cow', tableType: 'entity', entries: 'minecraft:beef,100,1,3\nminecraft:leather,75,0,2\nminecraft:diamond,10,1,2', killedByPlayer: false, survivesExplosion: false })],
      magic_block: [makeComponent('block', '星辉方块', { id: 'starlight_block', name: '星辉方块', carrier: 'minecraft:warped_fungus_on_a_stick', collision: 'minecraft:barrier', modelData: 1201, distance: 3, scale: 1, color: '#48e0d1', glow: true, gravity: false })],
      forge_ruby_sword: [makeComponent('forge', 'Ruby Gear', { modId: 'rubygear', modName: 'Ruby Gear', packageName: 'com.gameforge.rubygear', author: 'GameForge Creator', version: '1.0.0', license: 'MIT', description: 'A Forge mod generated with GameForge Lite.', contentType: 'tool', registryId: 'ruby_sword', displayName: 'Ruby Sword', primaryStat: 10, secondaryStat: -2.4, durability: 1800, hardness: 3, resistance: 6, color: '#e5395d', recipeEnabled: true, creativeTab: true })]
    };
    if (key === 'starter_pack') {
      return [
        ...templateComponents('thunder_blade'),
        ...templateComponents('boss_zombie'),
        makeComponent('advancement', '雷霆初醒', { id: 'obtain_thunder_blade', parent: 'minecraft:story/root', title: '雷霆初醒', icon: 'minecraft:lightning_rod', description: '制作雷霆之刃', frame: 'goal', trigger: 'recipe_crafted', target: 'weapon/thunder_blade', reward: '', toast: true, announce: true, hidden: false }),
        makeComponent('function', '欢迎提示', { id: 'welcome', trigger: 'load', interval: 100, commands: 'tellraw @a {"text":"GameForge 完整试玩包已加载","color":"green"}' })
      ];
    }
    return (templates[key] || []).map((component) => GF.project.normalizeComponent(component));
  }

  function visualBase(visual) {
    return visual === 'axe' ? 'minecraft:diamond_axe' : visual === 'staff' || visual === 'wand' ? 'minecraft:blaze_rod' : visual === 'hammer' ? 'minecraft:iron_axe' : visual === 'dagger' ? 'minecraft:iron_sword' : 'minecraft:diamond_sword';
  }

  function modelParent(style, baseItem) {
    if (style === 'cube') return 'minecraft:block/cube_all';
    if (style === 'handheld' || ['sword','axe','staff','wand','hammer','dagger'].includes(style)) return 'minecraft:item/handheld';
    const base = stripNamespace(baseItem);
    if (base === 'carrot_on_a_stick' || base === 'warped_fungus_on_a_stick') return 'minecraft:item/handheld_rod';
    return 'minecraft:item/generated';
  }

  function vanillaBaseParent(baseItem) {
    const base = stripNamespace(baseItem);
    if (base === 'carrot_on_a_stick' || base === 'warped_fungus_on_a_stick' || base === 'fishing_rod') return 'minecraft:item/handheld_rod';
    if (/(sword|axe|pickaxe|shovel|hoe)$/.test(base) || ['stick','blaze_rod'].includes(base)) return 'minecraft:item/handheld';
    return 'minecraft:item/generated';
  }

  function textureBase64(spec, options) {
    return spec.textureBase64 || GF.texture.generateTextureBase64(options);
  }

  function itemNbt({ project, id, kind, name, lore, modelData, damage, attackSpeed, glow, unbreakable, enchant = 0 }) {
    const namespace = U.cleanNamespace(project.namespace);
    const uuid = U.uuidInts(`${namespace}:${kind}:${id}`);
    const loreLines = Array.isArray(lore) ? lore : String(lore || '').split(/\r?\n/).filter(Boolean);
    const parts = [
      `gameforge:{id:${snbtString(`${namespace}:${kind}:${id}`)},kind:${snbtString(kind)}}`,
      `display:{Name:${snbtString(textComponent(name, 'aqua', false))}${loreLines.length ? `,Lore:[${loreLines.map((line) => snbtString(textComponent(line, 'gray', false))).join(',')}]` : ''}}`,
      `CustomModelData:${Math.max(1, Math.round(Number(modelData) || 1))}`
    ];
    if (Number.isFinite(Number(damage)) && Number.isFinite(Number(attackSpeed))) {
      parts.push(`AttributeModifiers:[{AttributeName:"minecraft:generic.attack_damage",Name:"gameforge.attack_damage",Amount:${decimal(Number(damage) - 1, 'd')},Operation:0,UUID:[I;${uuid.join(',')}],Slot:"mainhand"},{AttributeName:"minecraft:generic.attack_speed",Name:"gameforge.attack_speed",Amount:${decimal(Number(attackSpeed) - 4, 'd')},Operation:0,UUID:[I;${uuid.slice().reverse().join(',')}],Slot:"mainhand"}]`);
    }
    if (glow || Number(enchant) > 0) parts.push(`Enchantments:[{id:"minecraft:unbreaking",lvl:${Math.max(1, Math.round(Number(enchant) || 1))}s}]`);
    if (unbreakable) parts.push('Unbreakable:1b');
    if (glow) parts.push('HideFlags:1');
    return `{${parts.join(',')}}`;
  }

  function giveCommand(baseItem, nbt, count = 1, target = '@s') {
    return `give ${target} ${U.ensureMinecraftId(baseItem)}${nbt} ${U.clamp(count, 1, 64)}`;
  }

  function parseLootEntries(text) {
    const entries = [];
    for (const raw of String(text || '').split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith('#')) continue;
      const [itemId, chanceRaw = '100', minRaw = '1', maxRaw = minRaw] = line.split(',').map((part) => part.trim());
      if (!itemId) continue;
      const min = Math.max(0, Math.floor(Number(minRaw) || 0));
      const max = Math.max(min, Math.floor(Number(maxRaw) || min));
      entries.push({ item: U.ensureMinecraftId(itemId, 'minecraft:stone'), chance: U.clamp(chanceRaw, 0, 100), min, max });
    }
    return entries;
  }

  function lootTableFromEntries(entries, options = {}) {
    const tableType = normalizeLootType(options.type);
    const pools = entries.map((entry) => {
      const conditions = [];
      if (entry.chance < 100) conditions.push({ condition: 'minecraft:random_chance', chance: entry.chance / 100 });
      if (options.killedByPlayer) conditions.push({ condition: 'minecraft:killed_by_player' });
      if (options.survivesExplosion) conditions.push({ condition: 'minecraft:survives_explosion' });
      const functions = [];
      if (entry.min !== 1 || entry.max !== 1) functions.push({ function: 'minecraft:set_count', count: entry.min === entry.max ? entry.min : { type: 'minecraft:uniform', min: entry.min, max: entry.max } });
      const itemEntry = { type: 'minecraft:item', name: entry.item };
      if (conditions.length) itemEntry.conditions = conditions;
      if (functions.length) itemEntry.functions = functions;
      return { rolls: 1, bonus_rolls: 0, entries: [itemEntry] };
    });
    return { type: `minecraft:${tableType}`, pools };
  }

  function recipeFromGrid(spec, placeholderResult = null) {
    const type = spec.recipeType || 'shaped';
    const resultId = placeholderResult || U.ensureMinecraftId(spec.result, 'minecraft:stone');
    const count = U.clamp(spec.count || 1, 1, 64);
    const grid = Array.from({ length: 9 }, (_, index) => String(spec.grid?.[index] || '').trim());
    if (type === 'shapeless') {
      const ingredients = grid.filter(Boolean).map((value) => ({ item: U.ensureMinecraftId(value) }));
      if (!ingredients.length) ingredients.push({ item: 'minecraft:stone' });
      return { type: 'minecraft:crafting_shapeless', group: spec.group || undefined, ingredients, result: { item: resultId, count } };
    }
    if (['smelting','blasting','smoking','campfire_cooking'].includes(type)) return { type: `minecraft:${type}`, group: spec.group || undefined, ingredient: { item: U.ensureMinecraftId(grid.find(Boolean) || 'minecraft:cobblestone') }, result: resultId, experience: Number(spec.experience) || 0, cookingtime: Math.max(1, Math.round(Number(spec.cookingTime) || 200)) };
    if (type === 'stonecutting') return { type: 'minecraft:stonecutting', group: spec.group || undefined, ingredient: { item: U.ensureMinecraftId(grid.find(Boolean) || 'minecraft:stone') }, result: resultId, count };

    if (!grid.some(Boolean)) grid[4] = 'minecraft:stone';
    const rows = [grid.slice(0,3), grid.slice(3,6), grid.slice(6,9)];
    const usedRows = rows.map((row, rowIndex) => ({ row, rowIndex })).filter(({ row }) => row.some(Boolean));
    const minRow = usedRows.length ? usedRows[0].rowIndex : 0;
    const maxRow = usedRows.length ? usedRows[usedRows.length - 1].rowIndex : 0;
    const usedCols = [];
    for (let col = 0; col < 3; col += 1) if (rows.some((row) => row[col])) usedCols.push(col);
    const minCol = usedCols.length ? Math.min(...usedCols) : 0;
    const maxCol = usedCols.length ? Math.max(...usedCols) : 0;
    const uniqueIngredients = [];
    for (let row = minRow; row <= maxRow; row += 1) for (let col = minCol; col <= maxCol; col += 1) {
      const value = grid[row * 3 + col];
      if (value && !uniqueIngredients.includes(value)) uniqueIngredients.push(value);
    }
    const letters = 'ABCDEFGHI'.split('');
    const letterByItem = Object.fromEntries(uniqueIngredients.map((value, index) => [value, letters[index]]));
    const pattern = [];
    for (let row = minRow; row <= maxRow; row += 1) {
      let line = '';
      for (let col = minCol; col <= maxCol; col += 1) line += grid[row * 3 + col] ? letterByItem[grid[row * 3 + col]] : ' ';
      pattern.push(line || ' ');
    }
    const key = {};
    uniqueIngredients.forEach((value, index) => { key[letters[index]] = { item: U.ensureMinecraftId(value) }; });
    return { type: 'minecraft:crafting_shaped', group: spec.group || undefined, pattern, key, result: { item: resultId, count } };
  }

  function cleanUndefined(value) {
    if (Array.isArray(value)) return value.map(cleanUndefined);
    if (value && typeof value === 'object') {
      const output = {};
      for (const [key, child] of Object.entries(value)) if (child !== undefined && child !== '') output[key] = cleanUndefined(child);
      return output;
    }
    return value;
  }

  function effectCommands(spec) {
    const range = U.clamp(spec.range || 6, 1, 30);
    const power = U.clamp(spec.power || 1, 1, 10);
    const target = `@e[type=!minecraft:player,type=!minecraft:item,type=!minecraft:experience_orb,type=!minecraft:armor_stand,distance=..${range},sort=nearest,limit=1]`;
    const lines = [];
    if (spec.effect === 'lightning') lines.push(`execute as ${target} at @s run summon minecraft:lightning_bolt ~ ~ ~`);
    else if (spec.effect === 'fire') lines.push(`execute as ${target} run data merge entity @s {Fire:${Math.round(power * 50)}s}`);
    else if (spec.effect === 'explosion') lines.push(`execute as ${target} at @s run summon minecraft:creeper ~ ~ ~ {Fuse:0s,ignited:1b,ExplosionRadius:${U.clamp(power,1,10)}b}`);
    else if (spec.effect === 'poison') lines.push(`effect give ${target} minecraft:poison ${Math.max(2, Math.round(power * 2))} ${Math.min(4, Math.max(0, Math.floor(power / 2)))} true`);
    else if (spec.effect === 'freeze') lines.push(`effect give ${target} minecraft:slowness ${Math.max(2, Math.round(power * 2))} ${Math.min(10, power)} true`, `execute as ${target} run data merge entity @s {TicksFrozen:${Math.min(300, Math.round(power * 35))}}`);
    else if (spec.effect === 'heal') lines.push(`effect give @s minecraft:instant_health 1 ${Math.min(4, Math.max(0, power - 1))} true`);
    else if (spec.effect === 'dash') lines.push(`tp @s ^ ^ ^${Math.max(2, Number(power) + 2)}`);
    else if (spec.effect === 'summon_wolf') {
      const wolfTag = `gf.temp.wolf.${U.hashString(spec.id || spec.name || 'guardian_wolf')}`;
      lines.push(
        `summon minecraft:wolf ~ ~ ~ {Tags:["${wolfTag}"],PersistenceRequired:1b,CustomName:${snbtString(textComponent(`${spec.name || '武器'}的守护狼`, 'aqua', false))}}`,
        `data modify entity @e[type=minecraft:wolf,tag=${wolfTag},sort=nearest,limit=1,distance=..3] Owner set from entity @s UUID`,
        `tag @e[type=minecraft:wolf,tag=${wolfTag},sort=nearest,limit=1,distance=..3] remove ${wolfTag}`
      );
    }
    if (spec.particles) {
      lines.push(`particle minecraft:electric_spark ~ ~1 ~ 0.6 0.6 0.6 0.08 35 force @a[distance=..32]`);
      lines.push(`playsound minecraft:block.amethyst_block.chime player @a[distance=..32] ~ ~ ~ 1 1.2`);
    }
    return lines;
  }

  function customRecipeFiles(project, typeFolder, spec, baseItem, nbt, count = 1) {
    if (!spec.recipeEnabled) return [];
    const namespace = U.cleanNamespace(project.namespace);
    const recipeId = `${typeFolder}/${U.cleanId(spec.id)}`;
    const recipe = recipeFromGrid({ recipeType: 'shaped', grid: spec.recipeGrid || [], result: 'minecraft:knowledge_book', count: 1, group: namespace }, 'minecraft:knowledge_book');
    const advancement = {
      criteria: { crafted: { trigger: 'minecraft:recipe_crafted', conditions: { recipe_id: `${namespace}:${recipeId}` } } },
      rewards: { function: `${namespace}:${typeFolder}/${U.cleanId(spec.id)}/crafted` }
    };
    return [
      jsonFile(`data/${namespace}/recipes/${recipeId}.json`, cleanUndefined(recipe)),
      jsonFile(`data/${namespace}/advancements/${typeFolder}/${U.cleanId(spec.id)}_crafted.json`, advancement),
      file(`data/${namespace}/functions/${typeFolder}/${U.cleanId(spec.id)}/crafted.mcfunction`, `clear @s minecraft:knowledge_book 1\n${giveCommand(baseItem, nbt, count, '@s')}\nadvancement revoke @s only ${namespace}:${typeFolder}/${U.cleanId(spec.id)}_crafted\n`)
    ];
  }

  function generateWeapon(component, project) {
    const spec = component.spec;
    const namespace = U.cleanNamespace(project.namespace);
    const id = U.cleanId(spec.id, 'custom_weapon');
    const trigger = spec.trigger || 'right_click';
    const baseItem = trigger === 'right_click' ? 'minecraft:carrot_on_a_stick' : visualBase(spec.visual);
    const nbt = itemNbt({ project, id, kind: 'weapon', name: spec.name || component.name, lore: spec.lore, modelData: spec.modelData, damage: Number(spec.damage) || 1, attackSpeed: Number(spec.attackSpeed) || 1.6, glow: spec.glow, unbreakable: spec.unbreakable, enchant: spec.enchant });
    const root = `weapon/${id}`;
    const files = [file(`data/${namespace}/functions/${root}/give.mcfunction`, `${giveCommand(baseItem, nbt, 1, '@s')}\ntitle @s actionbar ${JSON.stringify({ text: `${spec.name || component.name} 已获得`, color: 'aqua' })}\n`)];
    const loadFunctions = [];
    const tickFunctions = [];
    if (trigger !== 'passive' && spec.effect && spec.effect !== 'none') {
      const cooldownObjective = U.objectiveName(`${namespace}:${root}:cooldown`, 'gfc');
      const cooldownTicks = Math.max(0, Math.round((Number(spec.cooldown) || 0) * 20));
      loadFunctions.push(`scoreboard objectives add ${cooldownObjective} dummy`);
      tickFunctions.push(`scoreboard players remove @a[scores={${cooldownObjective}=1..}] ${cooldownObjective} 1`);
      const activation = [
        ...effectCommands(spec),
        `scoreboard players set @s ${cooldownObjective} ${cooldownTicks}`,
        `title @s actionbar ${JSON.stringify({ text: `${EFFECT_META[spec.effect]?.icon || '✦'} ${EFFECT_META[spec.effect]?.label || '技能'}已触发`, color: EFFECT_META[spec.effect]?.color || 'aqua' })}`
      ].join('\n') + '\n';
      files.push(file(`data/${namespace}/functions/${root}/activate.mcfunction`, activation));
      files.push(file(`data/${namespace}/functions/${root}/try_activate.mcfunction`, `execute if score @s ${cooldownObjective} matches 1.. run title @s actionbar ${JSON.stringify({ text: '技能冷却中', color: 'red' })}\nexecute unless score @s ${cooldownObjective} matches 1.. run function ${namespace}:${root}/activate\n`));
      if (trigger === 'right_click') {
        const useObjective = U.objectiveName(`${namespace}:${root}:use`, 'gfu');
        loadFunctions.push(`scoreboard objectives add ${useObjective} minecraft.used:minecraft.carrot_on_a_stick`);
        tickFunctions.push(`execute as @a[scores={${useObjective}=1..},nbt={SelectedItem:{id:"minecraft:carrot_on_a_stick",tag:{gameforge:{id:"${namespace}:weapon:${id}"}}}}] at @s run function ${namespace}:${root}/try_activate`);
        tickFunctions.push(`scoreboard players set @a[scores={${useObjective}=1..}] ${useObjective} 0`);
      } else if (trigger === 'on_hit') {
        files.push(jsonFile(`data/${namespace}/advancements/${root}/hit.json`, {
          criteria: { hit: { trigger: 'minecraft:player_hurt_entity', conditions: { player: { equipment: { mainhand: { items: [baseItem], nbt: `{gameforge:{id:"${namespace}:weapon:${id}"}}` } } } } } },
          rewards: { function: `${namespace}:${root}/on_hit` }
        }));
        files.push(file(`data/${namespace}/functions/${root}/on_hit.mcfunction`, `advancement revoke @s only ${namespace}:${root}/hit\nfunction ${namespace}:${root}/try_activate\n`));
      }
    }
    if (loadFunctions.length) files.push(file(`data/${namespace}/functions/${root}/load.mcfunction`, `${loadFunctions.join('\n')}\n`), jsonFile('data/minecraft/tags/functions/load.json', { values: [`${namespace}:${root}/load`] }, { mergeTag: true }));
    if (tickFunctions.length) files.push(file(`data/${namespace}/functions/${root}/tick.mcfunction`, `${tickFunctions.join('\n')}\n`), jsonFile('data/minecraft/tags/functions/tick.json', { values: [`${namespace}:${root}/tick`] }, { mergeTag: true }));
    files.push(...customRecipeFiles(project, 'weapon', spec, baseItem, nbt, 1));
    return {
      datapack: files,
      resources: [{ sourceId: component.id, id, name: spec.name || component.name, baseItem, modelData: Number(spec.modelData) || 1001, style: spec.visual || 'sword', color: spec.color || '#69d8ff', effect: spec.effect || 'none', textureBase64: textureBase64(spec, { kind: spec.visual || 'sword', color: spec.color || '#69d8ff', effect: spec.effect || 'none' }), kind: 'item' }]
    };
  }

  function generateItem(component, project) {
    const spec = component.spec;
    const namespace = U.cleanNamespace(project.namespace);
    const id = U.cleanId(spec.id, 'custom_item');
    const base = U.ensureMinecraftId(spec.base || 'minecraft:amethyst_shard');
    const nbt = itemNbt({ project, id, kind: 'item', name: spec.name || component.name, lore: spec.lore, modelData: spec.modelData, glow: spec.glow, unbreakable: spec.unbreakable });
    const root = `item/${id}`;
    const files = [file(`data/${namespace}/functions/${root}/give.mcfunction`, `${giveCommand(base, nbt, spec.count || 1, '@s')}\n`)];
    files.push(...customRecipeFiles(project, 'item', spec, base, nbt, spec.count || 1));
    return { datapack: files, resources: [{ sourceId: component.id, id, name: spec.name || component.name, baseItem: base, modelData: Number(spec.modelData) || 1101, style: spec.style || 'generated', color: spec.color || '#c886ff', effect: 'none', textureBase64: textureBase64(spec, { kind: spec.style === 'cube' ? 'block' : 'item', color: spec.color || '#c886ff' }), kind: spec.style === 'cube' ? 'block' : 'item' }] };
  }

  function generateBlock(component, project) {
    const spec = component.spec;
    const namespace = U.cleanNamespace(project.namespace);
    const id = U.cleanId(spec.id, 'custom_block');
    const carrier = U.ensureMinecraftId(spec.carrier || 'minecraft:warped_fungus_on_a_stick');
    const carrierShort = stripNamespace(carrier);
    const nbt = itemNbt({ project, id, kind: 'block', name: spec.name || component.name, lore: '右键放置装饰方块', modelData: spec.modelData, glow: true, unbreakable: true });
    const root = `block/${id}`;
    const useObjective = U.objectiveName(`${namespace}:${root}:use`, 'gfb');
    const collision = spec.collision === 'minecraft:light' ? 'minecraft:light[level=15]' : U.ensureMinecraftId(spec.collision || 'minecraft:barrier');
    const scale = U.clamp(spec.scale || 1, .25, 4);
    const displayNbt = `{Tags:["gf.block.${namespace}.${id}"],item:{id:"${carrier}",Count:1b,tag:{CustomModelData:${Math.max(1, Math.round(Number(spec.modelData) || 1201))}}},item_display:"fixed",Glowing:${boolByte(spec.glow)},NoGravity:${boolByte(!spec.gravity)},transformation:{translation:[-0.5f,-0.5f,-0.5f],scale:[${decimal(scale,'f')},${decimal(scale,'f')},${decimal(scale,'f')}]}${spec.glow ? ',brightness:{block:15,sky:15}' : ''}}`;
    const files = [
      file(`data/${namespace}/functions/${root}/give.mcfunction`, `${giveCommand(carrier, nbt, 1, '@s')}\n`),
      file(`data/${namespace}/functions/${root}/load.mcfunction`, `scoreboard objectives add ${useObjective} minecraft.used:minecraft.${carrierShort}\n`),
      file(`data/${namespace}/functions/${root}/tick.mcfunction`, `execute as @a[scores={${useObjective}=1..},nbt={SelectedItem:{id:"${carrier}",tag:{gameforge:{id:"${namespace}:block:${id}"}}}}] at @s run function ${namespace}:${root}/place\nscoreboard players set @a[scores={${useObjective}=1..}] ${useObjective} 0\n`),
      file(`data/${namespace}/functions/${root}/place.mcfunction`, `execute positioned ^ ^1.5 ^${U.clamp(spec.distance || 3,1,8)} align xyz if block ~ ~ ~ minecraft:air run function ${namespace}:${root}/place_at\n`),
      file(`data/${namespace}/functions/${root}/place_at.mcfunction`, `setblock ~ ~ ~ ${collision} keep\nexecute positioned ~0.5 ~0.5 ~0.5 run summon minecraft:item_display ~ ~ ~ ${displayNbt}\nplaysound minecraft:block.amethyst_block.place block @a[distance=..24] ~ ~ ~ 1 1.1\n`),
      file(`data/${namespace}/functions/${root}/remove.mcfunction`, `execute as @e[tag=gf.block.${namespace}.${id},sort=nearest,limit=1,distance=..6] at @s run setblock ~ ~ ~ minecraft:air\nkill @e[tag=gf.block.${namespace}.${id},sort=nearest,limit=1,distance=..6]\n`),
      jsonFile('data/minecraft/tags/functions/load.json', { values: [`${namespace}:${root}/load`] }, { mergeTag: true }),
      jsonFile('data/minecraft/tags/functions/tick.json', { values: [`${namespace}:${root}/tick`] }, { mergeTag: true })
    ];
    return { datapack: files, resources: [{ sourceId: component.id, id, name: spec.name || component.name, baseItem: carrier, modelData: Number(spec.modelData) || 1201, style: 'cube', color: spec.color || '#48e0d1', effect: 'none', textureBase64: textureBase64(spec, { kind: 'block', color: spec.color || '#48e0d1' }), kind: 'block' }] };
  }

  function generateMob(component, project) {
    const spec = component.spec;
    const namespace = U.cleanNamespace(project.namespace);
    const id = U.cleanId(spec.id, 'custom_mob');
    const base = U.ensureMinecraftId(spec.base || 'minecraft:zombie');
    const root = `mob/${id}`;
    const tag = `gf.mob.${namespace}.${id}`;
    const health = U.clamp(spec.health || 20, 1, 10000);
    const attributes = [
      `{Name:"minecraft:generic.max_health",Base:${decimal(health,'d')}}`,
      `{Name:"minecraft:generic.attack_damage",Base:${decimal(U.clamp(spec.damage || 2,0,1000),'d')}}`,
      `{Name:"minecraft:generic.movement_speed",Base:${decimal(U.clamp(spec.speed || .25,0,2),'d')}}`,
      `{Name:"minecraft:generic.armor",Base:${decimal(U.clamp(spec.armor || 0,0,30),'d')}}`,
      `{Name:"minecraft:generic.follow_range",Base:${decimal(U.clamp(spec.followRange || 32,1,128),'d')}}`
    ];
    const mainHand = spec.mainHand ? `{id:"${U.ensureMinecraftId(spec.mainHand)}",Count:1b}` : '{}';
    const head = spec.head ? `{id:"${U.ensureMinecraftId(spec.head)}",Count:1b}` : '{}';
    const summonNbt = `{Tags:["${tag}"],CustomName:${snbtString(textComponent(spec.name || component.name, 'red', false))},CustomNameVisible:1b,PersistenceRequired:${boolByte(spec.persistent)},Glowing:${boolByte(spec.glow)},Silent:${boolByte(spec.silent)},CanPickUpLoot:0b,Health:${decimal(health,'f')},Attributes:[${attributes.join(',')}],HandItems:[${mainHand},{}],ArmorItems:[{},{},{},${head}],DeathLootTable:"${namespace}:entities/${id}"}`;
    const entries = parseLootEntries(spec.drops);
    const files = [
      file(`data/${namespace}/functions/${root}/spawn.mcfunction`, `summon ${base} ~ ~ ~ ${summonNbt}\n${spec.boss ? `bossbar set ${namespace}:${id} visible true\n` : ''}`),
      file(`data/${namespace}/functions/${root}/clear.mcfunction`, `kill @e[tag=${tag}]\n${spec.boss ? `bossbar set ${namespace}:${id} visible false\n` : ''}`),
      jsonFile(`data/${namespace}/loot_tables/entities/${id}.json`, lootTableFromEntries(entries.length ? entries : [{ item: 'minecraft:rotten_flesh', chance: 100, min: 1, max: 3 }], { type: 'entity' }))
    ];
    if (spec.boss) {
      const storagePath = `bossbar_${U.hashString(`${namespace}:${id}`)}`;
      files.push(
        file(`data/${namespace}/functions/${root}/load.mcfunction`, `execute unless data storage ${namespace}:state ${storagePath} run bossbar add ${namespace}:${id} ${JSON.stringify({ text: spec.name || component.name, color: 'red' })}\ndata modify storage ${namespace}:state ${storagePath} set value 1b\nbossbar set ${namespace}:${id} name ${JSON.stringify({ text: spec.name || component.name, color: 'red' })}\nbossbar set ${namespace}:${id} max ${Math.round(health)}\nbossbar set ${namespace}:${id} color red\nbossbar set ${namespace}:${id} style notched_10\nbossbar set ${namespace}:${id} visible false\n`),
        file(`data/${namespace}/functions/${root}/tick.mcfunction`, `execute as @e[tag=${tag},sort=nearest,limit=1] at @s run bossbar set ${namespace}:${id} players @a[distance=..64]\nexecute store result bossbar ${namespace}:${id} value run data get entity @e[tag=${tag},sort=nearest,limit=1] Health 1\nexecute if entity @e[tag=${tag},limit=1] run bossbar set ${namespace}:${id} visible true\nexecute unless entity @e[tag=${tag},limit=1] run bossbar set ${namespace}:${id} visible false\n`),
        jsonFile('data/minecraft/tags/functions/load.json', { values: [`${namespace}:${root}/load`] }, { mergeTag: true }),
        jsonFile('data/minecraft/tags/functions/tick.json', { values: [`${namespace}:${root}/tick`] }, { mergeTag: true })
      );
    }
    return { datapack: files, resources: [] };
  }

  function buildCommand(spec) {
    const type = spec.type || 'give';
    const target = String(spec.target || '@p').trim();
    const commandId = String(spec.commandId || spec.targetId || spec.id || 'minecraft:stone').trim();
    const amount = Math.max(1, Math.round(Number(spec.amount) || 1));
    const name = String(spec.name || 'GameForge');
    const extra = String(spec.extra ?? '1').trim();
    const pos = `${spec.x || '~'} ${spec.y || '~'} ${spec.z || '~'}`;
    const secondPos = String(spec.second || '~5 ~5 ~5').trim();
    if (type === 'give') return `/give ${target} ${U.ensureMinecraftId(commandId)}{display:{Name:${snbtString(textComponent(name,'aqua',false))}}} ${amount}`;
    if (type === 'summon') return `/summon ${U.ensureMinecraftId(commandId, 'minecraft:pig')} ${pos} {CustomName:${snbtString(textComponent(name,'white',false))},CustomNameVisible:1b}`;
    if (type === 'effect') return `/effect give ${target} ${U.ensureMinecraftId(commandId, 'minecraft:speed')} ${amount} ${Math.max(0, Math.round(Number(extra) || 0))} true`;
    if (type === 'teleport') return `/tp ${target} ${pos}`;
    if (type === 'fill') return `/fill ${pos} ${secondPos} ${U.ensureMinecraftId(commandId)} replace`;
    if (type === 'title') return `/title ${target} title ${JSON.stringify({ text: name, color: normalizeTextColor(extra) })}`;
    if (type === 'particle') return `/particle ${U.ensureMinecraftId(commandId, 'minecraft:flame')} ${pos} 0.5 0.5 0.5 0.03 ${amount} force ${target}`;
    if (type === 'playsound') return `/playsound ${U.ensureMinecraftId(commandId, 'minecraft:block.note_block.pling')} master ${target} ${pos} 1 ${Number(extra) || 1}`;
    if (type === 'execute') return `/execute as ${target} at @s positioned ${pos} run ${U.stripLeadingSlash(commandId)}`;
    if (type === 'raw') return `/${U.stripLeadingSlash(commandId)}`;
    return `/${U.stripLeadingSlash(commandId)}`;
  }

  function explainCommand(command) {
    const raw = String(command || '');
    if (raw.startsWith('/give ')) return '把指定物品交给目标选择器。花括号内是名称、模型等 NBT；最后一个数字是数量。';
    if (raw.startsWith('/summon ')) return '在坐标位置召唤实体，并写入自定义名称等实体 NBT。';
    if (raw.startsWith('/effect ')) return '给目标添加状态效果，参数依次是效果、持续秒数、等级和是否隐藏粒子。';
    if (raw.startsWith('/fill ')) return '用一种方块填充两个坐标围成的长方体。大范围执行可能造成卡顿。';
    if (raw.startsWith('/execute ')) return '先改变执行者或执行位置，再运行最后的子指令。';
    if (raw.startsWith('/particle ')) return '在指定位置生成粒子；数量过大可能影响帧率。';
    return '这是一条可直接粘贴到聊天栏或 mcfunction 文件中的 Minecraft 指令。';
  }

  function generateCommand(component, project) {
    const namespace = U.cleanNamespace(project.namespace);
    const id = U.cleanPath(component.spec.id || 'command');
    const command = component.spec.command || buildCommand(component.spec);
    return { datapack: [file(`data/${namespace}/functions/command/${id}.mcfunction`, `${U.stripLeadingSlash(command)}\n`)], resources: [] };
  }

  function generateRecipe(component, project) {
    const namespace = U.cleanNamespace(project.namespace);
    const id = U.cleanPath(component.spec.id || 'recipe');
    return { datapack: [jsonFile(`data/${namespace}/recipes/${id}.json`, cleanUndefined(recipeFromGrid(component.spec)))], resources: [] };
  }

  function generateLoot(component, project) {
    const namespace = U.cleanNamespace(project.namespace);
    const id = U.cleanPath(component.spec.id || 'loot');
    const type = normalizeLootType(component.spec.tableType);
    const folder = type === 'entity' ? 'entities' : type === 'block' ? 'blocks' : type === 'chest' ? 'chests' : 'gameplay';
    const entries = parseLootEntries(component.spec.entries);
    return { datapack: [jsonFile(`data/${namespace}/loot_tables/${folder}/${id}.json`, lootTableFromEntries(entries, { type, killedByPlayer: component.spec.killedByPlayer && type === 'entity', survivesExplosion: component.spec.survivesExplosion && type === 'block' }))], resources: [] };
  }

  function cleanFunctionCommands(text) {
    return String(text || '').split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.startsWith('//')).map((line) => line.startsWith('#') ? line : U.stripLeadingSlash(line)).join('\n');
  }

  function generateFunction(component, project) {
    const namespace = U.cleanNamespace(project.namespace);
    const id = U.cleanPath(component.spec.id || 'main');
    const trigger = normalizeFunctionTrigger(component.spec.trigger);
    let commands = cleanFunctionCommands(component.spec.commands);
    const files = [];
    if (trigger === 'interval') commands += `\nschedule function ${namespace}:function/${id} ${Math.max(1, Math.round(Number(component.spec.interval) || 100))}t replace`;
    files.push(file(`data/${namespace}/functions/function/${id}.mcfunction`, `${commands}\n`));
    if (trigger === 'load' || trigger === 'tick') files.push(jsonFile(`data/minecraft/tags/functions/${trigger}.json`, { values: [`${namespace}:function/${id}`] }, { mergeTag: true }));
    if (trigger === 'interval') files.push(jsonFile('data/minecraft/tags/functions/load.json', { values: [`${namespace}:function/${id}`] }, { mergeTag: true }));
    return { datapack: files, resources: [] };
  }

  function advancementJson(spec, namespace) {
    const target = String(spec.target || '').trim();
    let criteria;
    if (spec.trigger === 'consume_item') criteria = { trigger: 'minecraft:consume_item', conditions: { item: { items: [U.ensureMinecraftId(target, 'minecraft:apple')] } } };
    else if (spec.trigger === 'player_killed_entity') criteria = { trigger: 'minecraft:player_killed_entity', conditions: { entity: { type: U.ensureMinecraftId(target, 'minecraft:zombie') } } };
    else if (spec.trigger === 'tick') criteria = { trigger: 'minecraft:tick' };
    else if (spec.trigger === 'recipe_crafted') criteria = { trigger: 'minecraft:recipe_crafted', conditions: { recipe_id: target.includes(':') ? target : `${namespace}:${U.cleanPath(target || 'recipe')}` } };
    else criteria = { trigger: 'minecraft:inventory_changed', conditions: { items: [{ items: [U.ensureMinecraftId(target, 'minecraft:stone')] }] } };
    const value = {
      display: {
        icon: { item: U.ensureMinecraftId(spec.icon || 'minecraft:nether_star') },
        title: { text: spec.title || 'GameForge 进度' },
        description: { text: spec.description || '' },
        frame: spec.frame || 'task',
        show_toast: spec.toast !== false,
        announce_to_chat: spec.announce !== false,
        hidden: Boolean(spec.hidden)
      },
      criteria: { trigger: criteria }
    };
    if (spec.parent) value.parent = spec.parent.includes(':') ? spec.parent : `${namespace}:${U.cleanPath(spec.parent)}`;
    if (spec.reward) value.rewards = { function: spec.reward.includes(':') ? spec.reward : `${namespace}:function/${U.cleanPath(spec.reward)}` };
    return value;
  }

  function generateAdvancement(component, project) {
    const namespace = U.cleanNamespace(project.namespace);
    const id = U.cleanPath(component.spec.id || 'advancement');
    return { datapack: [jsonFile(`data/${namespace}/advancements/${id}.json`, advancementJson(component.spec, namespace))], resources: [] };
  }

  function generateResource(component, project) {
    const spec = component.spec;
    const namespace = U.cleanNamespace(project.namespace);
    const id = U.cleanId(spec.id, 'resource_item');
    const base = U.ensureMinecraftId(spec.base || 'minecraft:iron_sword');
    const result = { datapack: [], resources: [{ sourceId: component.id, id, name: spec.name || component.name, baseItem: base, modelData: Number(spec.modelData) || 1301, style: spec.style || 'handheld', color: spec.color || '#8da6ff', effect: 'none', textureBase64: textureBase64(spec, { kind: spec.style === 'cube' ? 'block' : 'item', color: spec.color || '#8da6ff' }), kind: spec.style === 'cube' ? 'block' : 'item' }] };
    if (spec.giveFunction) {
      const nbt = itemNbt({ project, id, kind: 'resource', name: spec.name || component.name, lore: '由资源包提供自定义外观', modelData: spec.modelData, glow: spec.glow, unbreakable: false });
      result.datapack.push(file(`data/${namespace}/functions/resource/${id}/give.mcfunction`, `${giveCommand(base, nbt, 1, '@s')}\n`));
    }
    return result;
  }

  function forgeClassName(modId) {
    return `${U.toClassName(modId, 'GameForge')}Mod`;
  }

  function forgeProject(component) {
    const spec = component.spec;
    const modId = U.cleanId(spec.modId || 'gameforge_mod').replace(/[.-]/g, '_');
    const modName = String(spec.modName || component.name || 'GameForge Mod');
    const packageName = U.sanitizePackage(spec.packageName || `com.gameforge.${modId}`, `com.gameforge.${modId}`);
    const packagePath = packageName.replace(/\./g, '/');
    const className = forgeClassName(modId);
    const registryId = U.cleanId(spec.registryId || 'custom_item');
    const displayName = String(spec.displayName || registryId);
    const type = spec.contentType || 'tool';
    const texture = textureBase64(spec, { kind: type === 'block' ? 'block' : type === 'tool' ? 'sword' : type === 'food' ? 'food' : 'item', color: spec.color || '#e5395d' });
    const version = String(spec.version || '1.0.0').replace(/[^0-9A-Za-z_.-]/g, '-');
    const creativeTab = type === 'tool' ? 'CreativeModeTabs.COMBAT' : type === 'block' ? 'CreativeModeTabs.BUILDING_BLOCKS' : type === 'food' ? 'CreativeModeTabs.FOOD_AND_DRINKS' : 'CreativeModeTabs.INGREDIENTS';
    const imports = [
      'net.minecraft.world.item.CreativeModeTabs', 'net.minecraft.world.item.Item', 'net.minecraftforge.event.BuildCreativeModeTabContentsEvent',
      'net.minecraftforge.eventbus.api.IEventBus', 'net.minecraftforge.fml.common.Mod', 'net.minecraftforge.fml.javafmlmod.FMLJavaModLoadingContext',
      'net.minecraftforge.registries.DeferredRegister', 'net.minecraftforge.registries.ForgeRegistries', 'net.minecraftforge.registries.RegistryObject'
    ];
    let declarations = '';
    let registerLines = 'ITEMS.register(modBus);';
    let creativeAccept = '';
    if (type === 'tool') {
      imports.push('net.minecraft.world.item.SwordItem', 'net.minecraft.world.item.Tiers');
      // Diamond swords add 4 points in total (player base 1 + tier bonus 3).
      // Convert the simple UI's desired total damage into SwordItem's modifier.
      declarations = `public static final RegistryObject<Item> CONTENT = ITEMS.register("${registryId}", () -> new SwordItem(Tiers.DIAMOND, ${Math.max(0, Math.round(Number(spec.primaryStat) || 10) - 4)}, ${decimal(Number(spec.secondaryStat) || -2.4,'F')}, new Item.Properties().durability(${Math.max(1, Math.round(Number(spec.durability) || 1800))})));`;
      creativeAccept = 'event.accept(CONTENT);';
    } else if (type === 'food') {
      imports.push('net.minecraft.world.food.FoodProperties');
      declarations = `public static final RegistryObject<Item> CONTENT = ITEMS.register("${registryId}", () -> new Item(new Item.Properties().food(new FoodProperties.Builder().nutrition(${Math.max(1, Math.round(Number(spec.primaryStat) || 6))}).saturationMod(${decimal(Math.max(0, Number(spec.secondaryStat) || .6),'F')}).build())));`;
      creativeAccept = 'event.accept(CONTENT);';
    } else if (type === 'block') {
      imports.push('net.minecraft.world.item.BlockItem', 'net.minecraft.world.level.block.Block', 'net.minecraft.world.level.block.state.BlockBehaviour', 'net.minecraft.world.level.material.MapColor');
      declarations = `public static final DeferredRegister<Block> BLOCKS = DeferredRegister.create(ForgeRegistries.BLOCKS, MOD_ID);\n    public static final RegistryObject<Block> CONTENT_BLOCK = BLOCKS.register("${registryId}", () -> new Block(BlockBehaviour.Properties.of().mapColor(MapColor.COLOR_RED).strength(${decimal(Math.max(0, Number(spec.hardness) || 3),'F')}, ${decimal(Math.max(Number(spec.hardness) || 3, Number(spec.resistance) || 6),'F')}).requiresCorrectToolForDrops()));\n    public static final RegistryObject<Item> CONTENT = ITEMS.register("${registryId}", () -> new BlockItem(CONTENT_BLOCK.get(), new Item.Properties()));`;
      registerLines = 'BLOCKS.register(modBus);\n        ITEMS.register(modBus);';
      creativeAccept = 'event.accept(CONTENT);';
    } else {
      declarations = `public static final RegistryObject<Item> CONTENT = ITEMS.register("${registryId}", () -> new Item(new Item.Properties().stacksTo(${U.clamp(spec.durability || 64,1,64)})));`;
      creativeAccept = 'event.accept(CONTENT);';
    }
    const mainJava = `package ${packageName};

${U.unique(imports).sort().map((name) => `import ${name};`).join('\n')}

@Mod(${className}.MOD_ID)
public final class ${className} {
    public static final String MOD_ID = "${modId}";
    public static final DeferredRegister<Item> ITEMS = DeferredRegister.create(ForgeRegistries.ITEMS, MOD_ID);
    ${declarations}

    public ${className}() {
        IEventBus modBus = FMLJavaModLoadingContext.get().getModEventBus();
        ${registerLines}
        ${spec.creativeTab !== false ? 'modBus.addListener(this::addCreativeTabContents);' : ''}
    }

    private void addCreativeTabContents(BuildCreativeModeTabContentsEvent event) {
        if (event.getTabKey().equals(${creativeTab})) {
            ${creativeAccept}
        }
    }
}
`;
    const files = [
      file('settings.gradle', `pluginManagement {\n    repositories {\n        gradlePluginPortal()\n        maven { name = 'MinecraftForge'; url = 'https://maven.minecraftforge.net/' }\n        mavenCentral()\n    }\n}\nrootProject.name = '${modId}'\n`),
      file('gradle.properties', `org.gradle.jvmargs=-Xmx3G\norg.gradle.daemon=false\nminecraft_version=${MC_VERSION}\nforge_version=${FORGE_VERSION}\nmod_id=${modId}\nmod_name=${modName}\nmod_version=${version}\nmod_group_id=${packageName}\n`),
      file('build.gradle', `plugins {\n    id 'eclipse'\n    id 'idea'\n    id 'maven-publish'\n    id 'net.minecraftforge.gradle' version '[6.0,6.2)'\n}\n\nversion = mod_version\ngroup = mod_group_id\nbase { archivesName = mod_id }\njava.toolchain.languageVersion = JavaLanguageVersion.of(17)\n\nminecraft {\n    mappings channel: 'official', version: minecraft_version\n    copyIdeResources = true\n    runs {\n        configureEach {\n            workingDirectory project.file('run')\n            property 'forge.logging.console.level', 'info'\n            mods { \"${'$'}{mod_id}\" { source sourceSets.main } }\n        }\n        client {}\n        server { args '--nogui' }\n    }\n}\n\nrepositories { mavenCentral() }\ndependencies { minecraft \"net.minecraftforge:forge:${'$'}{minecraft_version}-${'$'}{forge_version}\" }\n\ntasks.named('processResources', ProcessResources).configure {\n    def replaceProperties = [minecraft_version: minecraft_version, forge_version: forge_version, mod_id: mod_id, mod_name: mod_name, mod_version: mod_version]\n    inputs.properties replaceProperties\n    filesMatching(['META-INF/mods.toml', 'pack.mcmeta']) { expand replaceProperties }\n}\ntasks.withType(JavaCompile).configureEach { options.encoding = 'UTF-8' }\n`),
      file(`src/main/java/${packagePath}/${className}.java`, mainJava),
      file('src/main/resources/META-INF/mods.toml', `modLoader=\"javafml\"\nloaderVersion=\"[47,)\"\nlicense=\"${javaString(spec.license || 'MIT')}\"\n\n[[mods]]\nmodId=\"${modId}\"\nversion=\"${version}\"\ndisplayName=\"${javaString(modName)}\"\nauthors=\"${javaString(spec.author || 'GameForge Creator')}\"\ndescription='''${String(spec.description || 'Generated with GameForge Lite').replace(/'''/g, "''")}'''\n\n[[dependencies.${modId}]]\nmodId=\"forge\"\nmandatory=true\nversionRange=\"[47.4.10,)\"\nordering=\"NONE\"\nside=\"BOTH\"\n\n[[dependencies.${modId}]]\nmodId=\"minecraft\"\nmandatory=true\nversionRange=\"[1.20.1,1.21)\"\nordering=\"NONE\"\nside=\"BOTH\"\n`),
      jsonFile('src/main/resources/pack.mcmeta', packMeta(`${modName} resources`)),
      jsonFile(`src/main/resources/assets/${modId}/lang/en_us.json`, { [`${type === 'block' ? 'block' : 'item'}.${modId}.${registryId}`]: displayName }),
      jsonFile(`src/main/resources/assets/${modId}/lang/zh_cn.json`, { [`${type === 'block' ? 'block' : 'item'}.${modId}.${registryId}`]: displayName }),
      file(`src/main/resources/assets/${modId}/textures/${type === 'block' ? 'block' : 'item'}/${registryId}.png`, texture, { encoding: 'base64' }),
      file('.gitignore', '.gradle/\nbuild/\nrun/\n.idea/\n*.iml\n'),
      file('setup-windows.ps1', `$ErrorActionPreference = \"Stop\"\n$Root = Split-Path -Parent $MyInvocation.MyCommand.Path\n$Mdk = Join-Path $Root \"forge-mdk.zip\"\n$Temp = Join-Path $Root \".mdk-temp\"\nif (!(Test-Path (Join-Path $Root \"gradlew.bat\"))) {\n  Invoke-WebRequest \"https://maven.minecraftforge.net/net/minecraftforge/forge/${MC_VERSION}-${FORGE_VERSION}/forge-${MC_VERSION}-${FORGE_VERSION}-mdk.zip\" -OutFile $Mdk\n  Expand-Archive $Mdk -DestinationPath $Temp -Force\n  Copy-Item (Join-Path $Temp \"gradlew\") $Root -Force\n  Copy-Item (Join-Path $Temp \"gradlew.bat\") $Root -Force\n  Copy-Item (Join-Path $Temp \"gradle\") $Root -Recurse -Force\n  Remove-Item $Temp -Recurse -Force\n  Remove-Item $Mdk -Force\n}\nPush-Location $Root\ntry { & .\\gradlew.bat genIntellijRuns } finally { Pop-Location }\nWrite-Host \"Forge workspace ready.\" -ForegroundColor Green\n`),
      file('build-mod.bat', '@echo off\r\npowershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup-windows.ps1"\r\ncall "%~dp0gradlew.bat" build\r\npause\r\n'),
      file('run-client.bat', '@echo off\r\npowershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup-windows.ps1"\r\ncall "%~dp0gradlew.bat" runClient\r\npause\r\n'),
      file('README_FIRST.md', `# ${modName}\n\nMinecraft Java ${MC_VERSION} · Forge ${FORGE_VERSION} · Java 17\n\n1. 安装 64 位 JDK 17。\n2. 双击 \`setup-windows.ps1\`（或在 PowerShell 中运行）。\n3. 双击 \`run-client.bat\` 启动开发客户端。\n4. 双击 \`build-mod.bat\` 构建 JAR。\n5. 成品位于 \`build/libs\`。\n\n请先在单独世界测试。\n`)
    ];
    if (type === 'block') {
      files.push(
        jsonFile(`src/main/resources/assets/${modId}/blockstates/${registryId}.json`, { variants: { '': { model: `${modId}:block/${registryId}` } } }),
        jsonFile(`src/main/resources/assets/${modId}/models/block/${registryId}.json`, { parent: 'minecraft:block/cube_all', textures: { all: `${modId}:block/${registryId}` } }),
        jsonFile(`src/main/resources/assets/${modId}/models/item/${registryId}.json`, { parent: `${modId}:block/${registryId}` }),
        jsonFile(`src/main/resources/data/${modId}/loot_tables/blocks/${registryId}.json`, { type: 'minecraft:block', pools: [{ rolls: 1, bonus_rolls: 0, entries: [{ type: 'minecraft:item', name: `${modId}:${registryId}` }], conditions: [{ condition: 'minecraft:survives_explosion' }] }] }),
        jsonFile('src/main/resources/data/minecraft/tags/blocks/mineable/pickaxe.json', { replace: false, values: [`${modId}:${registryId}`] })
      );
    } else {
      files.push(jsonFile(`src/main/resources/assets/${modId}/models/item/${registryId}.json`, { parent: type === 'tool' ? 'minecraft:item/handheld' : 'minecraft:item/generated', textures: { layer0: `${modId}:item/${registryId}` } }));
    }
    if (spec.recipeEnabled) {
      const recipe = type === 'block'
        ? { type: 'minecraft:crafting_shaped', pattern: ['AAA','ABA','AAA'], key: { A: { item: 'minecraft:stone' }, B: { item: 'minecraft:diamond' } }, result: { item: `${modId}:${registryId}`, count: 1 } }
        : type === 'tool'
          ? { type: 'minecraft:crafting_shaped', pattern: [' A ',' A ',' B '], key: { A: { item: 'minecraft:diamond' }, B: { item: 'minecraft:stick' } }, result: { item: `${modId}:${registryId}` } }
          : { type: 'minecraft:crafting_shapeless', ingredients: [{ item: 'minecraft:diamond' }, { item: 'minecraft:redstone' }], result: { item: `${modId}:${registryId}` } };
      files.push(jsonFile(`src/main/resources/data/${modId}/recipes/${registryId}.json`, recipe));
    }
    return { modId, files };
  }

  function generateForge(component) {
    return { datapack: [], resources: [], forge: forgeProject(component) };
  }

  function generateComponent(component, project) {
    const type = component.type;
    if (type === 'weapon') return generateWeapon(component, project);
    if (type === 'item') return generateItem(component, project);
    if (type === 'block') return generateBlock(component, project);
    if (type === 'mob') return generateMob(component, project);
    if (type === 'command') return generateCommand(component, project);
    if (type === 'recipe') return generateRecipe(component, project);
    if (type === 'loot') return generateLoot(component, project);
    if (type === 'function') return generateFunction(component, project);
    if (type === 'advancement') return generateAdvancement(component, project);
    if (type === 'resource') return generateResource(component, project);
    if (type === 'forge') return generateForge(component, project);
    return { datapack: [], resources: [] };
  }

  function mergeDatapack(project, generatedParts) {
    const namespace = U.cleanNamespace(project.namespace);
    const byPath = new Map();
    const tagValues = { load: new Set(), tick: new Set() };
    const collisions = [];
    for (const part of generatedParts) {
      for (const entry of part.datapack || []) {
        if (entry.mergeTag && /data\/minecraft\/tags\/functions\/(load|tick)\.json$/.test(entry.name)) {
          const type = entry.name.includes('/load.json') ? 'load' : 'tick';
          const parsed = U.safeJsonParse(entry.data, { values: [] });
          (parsed.values || []).forEach((value) => tagValues[type].add(value));
          continue;
        }
        if (byPath.has(entry.name)) collisions.push({ path: entry.name, previous: byPath.get(entry.name).sourceId, next: entry.sourceId });
        byPath.set(entry.name, entry);
      }
    }
    if (tagValues.load.size) byPath.set('data/minecraft/tags/functions/load.json', jsonFile('data/minecraft/tags/functions/load.json', { replace: false, values: Array.from(tagValues.load) }));
    if (tagValues.tick.size) byPath.set('data/minecraft/tags/functions/tick.json', jsonFile('data/minecraft/tags/functions/tick.json', { replace: false, values: Array.from(tagValues.tick) }));
    const files = [jsonFile('pack.mcmeta', packMeta(`${project.name} · GameForge Lite`))];
    files.push(...Array.from(byPath.values()).sort((a,b) => a.name.localeCompare(b.name)));
    files.push(file('README_GAMEFORGE.txt', `项目：${project.name}\nMinecraft Java：${MC_VERSION}\n命名空间：${namespace}\n\n安装：把此 ZIP 放入世界目录的 datapacks 文件夹，然后执行 /reload。\n\n可用函数会显示在 GameForge 工作区的文件列表中。\n`));
    return { files, collisions };
  }

  function mergeResourcepack(project, resourceEntries) {
    if (!resourceEntries.length) return { files: [], collisions: [] };
    const namespace = U.cleanNamespace(project.namespace);
    const byPath = new Map();
    const byBase = new Map();
    const collisions = [];
    const put = (entry) => {
      const previous = byPath.get(entry.name);
      if (previous) collisions.push({ path: entry.name, previous: previous.sourceId, next: entry.sourceId, message: `资源包文件 ${entry.name} 被多个组件生成，已保留最后一个版本。` });
      byPath.set(entry.name, entry);
    };

    put(jsonFile('pack.mcmeta', packMeta(`${project.name} · GameForge 资源包`)));
    for (const entry of resourceEntries) {
      const baseItem = U.ensureMinecraftId(entry.baseItem);
      const modelData = Math.max(1, Math.round(Number(entry.modelData) || 1));
      if (!byBase.has(baseItem)) byBase.set(baseItem, new Map());
      const models = byBase.get(baseItem);
      if (models.has(modelData)) collisions.push({ path: `${baseItem}:${modelData}`, previous: models.get(modelData).sourceId, next: entry.sourceId, message: '同一基础物品使用了重复的 CustomModelData；资源包已保留最后加入的模型。' });
      models.set(modelData, { ...entry, modelData });

      const id = U.cleanId(entry.id);
      if (entry.kind === 'block') {
        put(jsonFile(`assets/${namespace}/models/block/${id}.json`, { parent: 'minecraft:block/cube_all', textures: { all: `${namespace}:block/${id}` } }, { sourceId: entry.sourceId }));
        put(file(`assets/${namespace}/textures/block/${id}.png`, entry.textureBase64, { encoding: 'base64', sourceId: entry.sourceId }));
      } else {
        put(jsonFile(`assets/${namespace}/models/item/${id}.json`, { parent: modelParent(entry.style, baseItem), textures: { layer0: `${namespace}:item/${id}` } }, { sourceId: entry.sourceId }));
        put(file(`assets/${namespace}/textures/item/${id}.png`, entry.textureBase64, { encoding: 'base64', sourceId: entry.sourceId }));
      }
    }

    for (const [baseItem, modelMap] of byBase.entries()) {
      const base = stripNamespace(baseItem);
      const entries = Array.from(modelMap.values()).sort((a,b) => a.modelData - b.modelData);
      const overrides = entries.map((entry) => ({ predicate: { custom_model_data: entry.modelData }, model: `${namespace}:${entry.kind === 'block' ? 'block' : 'item'}/${U.cleanId(entry.id)}` }));
      put(jsonFile(`assets/minecraft/models/item/${base}.json`, { parent: vanillaBaseParent(baseItem), textures: { layer0: `minecraft:item/${base}` }, overrides }));
    }
    put(file('README_GAMEFORGE.txt', `项目：${project.name}\nMinecraft Java：${MC_VERSION}\n\n安装：把 ZIP 放入 .minecraft/resourcepacks，并在游戏设置中启用。\n如果其他资源包也修改了相同基础物品，请把此资源包放在更高优先级。\n`));
    return { files: Array.from(byPath.values()).sort((a,b) => a.name.localeCompare(b.name)), collisions };
  }

  function generateProject(projectInput) {
    const project = GF.project.normalize(projectInput);
    const parts = [];
    const forgeProjects = [];
    for (const component of project.components) {
      const generated = generateComponent(component, project);
      (generated.datapack || []).forEach((entry) => { entry.sourceId = component.id; entry.sourceType = component.type; });
      (generated.resources || []).forEach((entry) => { entry.sourceId = component.id; });
      if (generated.forge) forgeProjects.push({ ...generated.forge, componentId: component.id });
      parts.push(generated);
    }
    const datapackMerged = mergeDatapack(project, parts);
    const resourceMerged = mergeResourcepack(project, parts.flatMap((part) => part.resources || []));
    const collisions = [...datapackMerged.collisions, ...resourceMerged.collisions];
    const forgeByPath = new Map();
    const singleForge = forgeProjects.length === 1;
    for (const forge of forgeProjects) {
      for (const entry of forge.files) {
        const path = singleForge ? entry.name : `${forge.modId}/${entry.name}`;
        if (forgeByPath.has(path)) collisions.push({ path: `forge/${path}`, previous: forgeByPath.get(path).sourceId, next: forge.componentId, message: `Forge 文件 ${path} 被多个 Mod 组件生成，已保留最后一个版本。` });
        forgeByPath.set(path, file(path, entry.data, { ...entry, group: 'forge', sourceId: forge.componentId }));
      }
    }
    const forgeFiles = Array.from(forgeByPath.values()).sort((a,b) => a.name.localeCompare(b.name));

    const bundleByPath = new Map();
    const putBundle = (entry) => {
      if (bundleByPath.has(entry.name)) collisions.push({ path: entry.name, previous: bundleByPath.get(entry.name).sourceId, next: entry.sourceId, message: `完整项目中 ${entry.name} 路径重复，已保留最后一个版本。` });
      bundleByPath.set(entry.name, entry);
    };
    datapackMerged.files.forEach((entry) => putBundle(file(`datapack/${entry.name}`, entry.data, { ...entry, group: 'datapack' })));
    resourceMerged.files.forEach((entry) => putBundle(file(`resourcepack/${entry.name}`, entry.data, { ...entry, group: 'resourcepack' })));
    forgeFiles.forEach((entry) => putBundle(file(`forge/${entry.name}`, entry.data, { ...entry, group: 'forge' })));
    putBundle(jsonFile('project.json', project, { group: 'project' }));
    putBundle(jsonFile('manifest.json', {
      generator: 'GameForge Lite', version: GF.VERSION, minecraft: MC_VERSION, generatedAt: new Date().toISOString(),
      project: { id: project.id, name: project.name, namespace: project.namespace },
      components: project.components.map((component) => ({ id: component.id, type: component.type, name: component.name })),
      outputs: { datapack: datapackMerged.files.length, resourcepack: resourceMerged.files.length, forge: forgeFiles.length }
    }, { group: 'project' }));
    putBundle(file('README_FIRST.txt', `GameForge 完整项目：${project.name}\n\n- datapack：放入世界 datapacks\n- resourcepack：放入 .minecraft/resourcepacks\n- forge：源码项目，需要 Java 17 与 Forge 开发环境\n- project.json：可重新导入 GameForge\n\n请先在测试世界运行。\n`, { group: 'project' }));
    const allFiles = Array.from(bundleByPath.values());
    return {
      project,
      datapack: project.components.some((component) => component.type !== 'resource' && component.type !== 'forge') || parts.some((part) => (part.datapack || []).length) ? datapackMerged.files : [],
      resourcepack: resourceMerged.files,
      forge: forgeFiles,
      forgeProjects,
      bundle: allFiles,
      allFiles,
      collisions
    };
  }

  function componentSummary(component) {
    const spec = component.spec || {};
    if (component.type === 'weapon') return `${spec.damage || 0} 伤害 · ${EFFECT_META[spec.effect]?.label || '无技能'} · ${spec.cooldown || 0}s`;
    if (component.type === 'item') return `${spec.base || 'minecraft:stone'} · CMD ${spec.modelData || 0}`;
    if (component.type === 'block') return `${spec.collision || 'minecraft:barrier'} · 缩放 ${spec.scale || 1}`;
    if (component.type === 'mob') return `${spec.health || 20} 生命 · ${spec.damage || 0} 伤害${spec.boss ? ' · Boss' : ''}`;
    if (component.type === 'forge') return `${spec.modId || 'mod'} · ${spec.contentType || 'item'} · ${spec.version || '1.0.0'}`;
    if (component.type === 'recipe') return `${spec.recipeType || 'shaped'} → ${spec.result || 'minecraft:stone'}`;
    if (component.type === 'loot') return `${parseLootEntries(spec.entries).length} 个掉落条目`;
    if (component.type === 'function') return `${normalizeFunctionTrigger(spec.trigger)} · ${cleanFunctionCommands(spec.commands).split(/\n/).filter(Boolean).length} 行`;
    if (component.type === 'advancement') return `${spec.trigger || 'inventory_changed'} · ${spec.target || ''}`;
    if (component.type === 'resource') return `${spec.base || ''} · CMD ${spec.modelData || 0}`;
    if (component.type === 'command') return U.stripLeadingSlash(spec.command || buildCommand(spec)).slice(0, 72);
    return TYPE_META[component.type]?.label || component.type;
  }

  function diagnose(projectInput, generatedInput) {
    const project = GF.project.normalize(projectInput);
    const generated = generatedInput || generateProject(project);
    const issues = [];
    const add = (severity, title, message, sourceId = null) => issues.push({ severity, title, message, sourceId });
    if (!/^[a-z0-9_.-]+$/.test(project.namespace)) add('error', '命名空间不合法', '只能使用小写字母、数字、下划线、点和短横线。');
    if (!project.components.length) add('info', '项目还是空的', '从智能创建、模板或任意工作室加入一个组件。');
    const seen = new Set();
    for (const component of project.components) {
      const id = String(component.spec?.id || component.spec?.registryId || component.spec?.modId || '');
      const key = `${component.type}:${id}`;
      if (id && seen.has(key)) add('warning', '组件 ID 重复', `${component.type} 中的 ${id} 出现多次，可能覆盖文件。`, component.id);
      seen.add(key);
      if (id && !/^[a-z0-9_./-]+$/.test(id)) add('error', '组件 ID 不合法', `${component.name} 的 ID 只能包含小写英文、数字、下划线、斜杠和短横线。`, component.id);
      if (['weapon','item','block','resource'].includes(component.type) && !(Number(component.spec?.modelData) >= 1)) add('error', '模型编号无效', `${component.name} 的 CustomModelData 必须大于 0。`, component.id);
      if (component.type === 'weapon' && component.spec?.effect === 'explosion' && Number(component.spec?.power) > 6) add('warning', '爆炸强度较高', `${component.name} 可能快速破坏地形，请先在复制的世界测试。`, component.id);
      if (component.type === 'function' && normalizeFunctionTrigger(component.spec?.trigger) === 'tick' && cleanFunctionCommands(component.spec?.commands).split(/\n/).length > 20) add('warning', 'Tick 函数较长', `${component.name} 每秒运行 20 次，建议减少大范围选择器。`, component.id);
      if (component.type === 'forge') {
        if (!/^[a-z][a-z0-9_]{1,63}$/.test(String(component.spec?.modId || ''))) add('error', 'Forge Mod ID 不合法', 'Mod ID 必须以小写字母开头，只能包含小写字母、数字与下划线。', component.id);
        if (!/^[a-z_][a-z0-9_]*(\.[a-z_][a-z0-9_]*)+$/.test(String(component.spec?.packageName || ''))) add('error', 'Java 包名不合法', '示例：com.gameforge.mymod。', component.id);
      }
    }
    for (const collision of generated.collisions || []) add('error', '生成文件或模型冲突', collision.message || `${collision.path} 被多个组件生成。`);
    for (const entry of [...generated.datapack, ...generated.resourcepack, ...generated.forge]) {
      if (/\.(json|mcmeta)$/.test(entry.name) && typeof entry.data === 'string') {
        try { JSON.parse(entry.data); } catch (error) { add('error', 'JSON 无法解析', `${entry.name}: ${error.message}`); }
      }
      if (entry.name.includes('../') || entry.name.startsWith('/')) add('error', '不安全的文件路径', entry.name);
    }
    if (!issues.some((issue) => issue.severity === 'error')) add('success', '核心结构检查通过', `已检查 ${generated.datapack.length + generated.resourcepack.length + generated.forge.length} 个输出文件。`);
    return issues;
  }

  function analyzeLog(text) {
    const source = String(text || '').trim();
    if (!source) return [];
    const rules = [
      [/unknown function|couldn't parse function|unknown function/i, '找不到函数', '检查命名空间、路径和 .mcfunction 文件名；函数命令中不要写开头的斜杠。'],
      [/failed to parse|malformed json|json parse|expected .* at position/i, 'JSON 或指令格式错误', '在工作区打开对应 JSON；重点检查逗号、引号、NBT 与版本字段。'],
      [/unknown scoreboard objective|objective .* does not exist/i, '计分板目标未创建', '确认 load.json 已加载，并在世界中执行 /reload。'],
      [/already exists.*objective|objective .* already exists/i, '计分板目标已存在', '通常是 /reload 后的无害提示；若功能正常可忽略。'],
      [/missing mods|requires .* or above|mod .* is missing/i, 'Forge 依赖缺失', '安装报错中列出的依赖 Mod，并确保版本与 Minecraft 1.20.1 匹配。'],
      [/unsupported class file major version|requires java 17|java version/i, 'Java 版本不匹配', 'Forge 1.20.1 项目请使用 64 位 JDK 17，并让 JAVA_HOME 指向它。'],
      [/outofmemoryerror|java heap space/i, '内存不足', '减少同时加载的 Mod，或提高 Gradle/Minecraft 的最大内存。'],
      [/ticking entity|ticking player/i, '实体 Tick 崩溃', '先备份世界；移除最近生成的实体组件，再检查 crash-report 中的实体 ID。'],
      [/duplicate.*custom_model_data|overrides/i, '资源包模型冲突', '检查同一基础物品是否重复使用了 CustomModelData。'],
      [/could not resolve|connection timed out|maven/i, '依赖下载失败', '检查网络、防火墙和代理，然后重新运行 setup-windows.ps1。']
    ];
    const results = [];
    for (const [pattern, title, advice] of rules) if (pattern.test(source)) results.push({ title, advice });
    if (!results.length) results.push({ title: '没有匹配到已知错误', advice: '保留报错前后各 30 行，并检查第一个包含 Caused by 或 ERROR 的位置。' });
    return results;
  }

  async function selfTests() {
    const results = [];
    const test = async (name, fn) => {
      try { await fn(); results.push({ status: 'pass', name, message: '通过' }); }
      catch (error) { results.push({ status: 'fail', name, message: error.message || String(error) }); }
    };
    await test('项目模型与本地生成', () => {
      const project = GF.project.create({ name: 'Test', namespace: 'gf_test', components: templateComponents('starter_pack') });
      const generated = generateProject(project);
      if (!generated.datapack.some((entry) => entry.name === 'pack.mcmeta')) throw new Error('缺少数据包 pack.mcmeta');
      if (!generated.resourcepack.some((entry) => entry.name === 'pack.mcmeta')) throw new Error('缺少资源包 pack.mcmeta');
    });
    await test('智能解析保留作品名称', () => {
      const project = GF.project.create({ namespace: 'gf_prompt' });
      const plan = parsePrompt('做一把叫雷霆审判的钻石剑，右键召唤闪电，伤害18，冷却4秒', project);
      const spec = plan.components[0]?.spec;
      if (spec?.name !== '雷霆审判') throw new Error(`作品名解析成了 ${spec?.name || '空'}`);
      if (spec.effect !== 'lightning' || spec.damage !== 18 || spec.cooldown !== 4) throw new Error('技能参数解析不完整');
    });
    await test('所有 JSON 文件可解析', () => {
      const project = GF.project.create({ name: 'JSON Test', namespace: 'gf_json', components: [...templateComponents('starter_pack'), ...templateComponents('forge_ruby_sword')] });
      const generated = generateProject(project);
      for (const entry of [...generated.datapack, ...generated.resourcepack, ...generated.forge]) if (/\.(json|mcmeta)$/.test(entry.name) && typeof entry.data === 'string') JSON.parse(entry.data);
    });
    await test('完整试玩包使用当前命名空间', () => {
      const project = GF.project.create({ namespace: 'gf_namespace', components: templateComponents('starter_pack') });
      const generated = generateProject(project);
      const entry = generated.datapack.find((fileEntry) => fileEntry.name.endsWith('obtain_thunder_blade.json'));
      if (!entry) throw new Error('缺少试玩包进度文件');
      const parsed = JSON.parse(entry.data);
      const criterion = Object.values(parsed.criteria)[0];
      if (criterion.conditions?.recipe_id !== 'gf_namespace:weapon/thunder_blade') throw new Error('配方仍指向固定命名空间');
    });
    await test('recipe_crafted 使用 1.20.1 字段', () => {
      const project = GF.project.create({ namespace: 'gf_recipe', components: templateComponents('thunder_blade') });
      const generated = generateProject(project);
      const advancement = generated.datapack.find((entry) => entry.name.includes('_crafted.json'));
      const parsed = JSON.parse(advancement.data);
      const criterion = Object.values(parsed.criteria)[0];
      if (criterion.trigger !== 'minecraft:recipe_crafted' || !criterion.conditions.recipe_id) throw new Error('recipe_crafted 配置不正确');
    });
    await test('空配方自动生成安全占位内容', () => {
      const shaped = recipeFromGrid({ recipeType: 'shaped', grid: [], result: 'minecraft:diamond' });
      const shapeless = recipeFromGrid({ recipeType: 'shapeless', grid: [], result: 'minecraft:diamond' });
      if (!shaped.pattern?.length || !Object.keys(shaped.key || {}).length) throw new Error('有序配方为空');
      if (!shapeless.ingredients?.length) throw new Error('无序配方为空');
    });
    await test('输出路径唯一且安全', () => {
      const project = GF.project.create({ namespace: 'gf_paths', components: [...templateComponents('starter_pack'), ...templateComponents('forge_ruby_sword')] });
      const generated = generateProject(project);
      const paths = generated.bundle.map((entry) => entry.name);
      if (paths.some((path) => path.startsWith('/') || path.includes('../'))) throw new Error('发现不安全路径');
      if (new Set(paths).size !== paths.length) throw new Error('完整下载包存在重复路径');
    });
    await test('自动纹理为有效 PNG 数据', () => {
      const project = GF.project.create({ namespace: 'gf_texture', components: templateComponents('thunder_blade') });
      const generated = generateProject(project);
      const texture = generated.resourcepack.find((entry) => entry.encoding === 'base64' && entry.name.endsWith('.png'));
      if (!texture) throw new Error('缺少 PNG 纹理');
      const bytes = GF.binary.base64ToBytes(texture.data);
      const signature = Array.from(bytes.slice(0, 8)).join(',');
      if (signature !== '137,80,78,71,13,10,26,10') throw new Error('PNG 文件头错误');
    });
    await test('旧版掉落类型与定时函数可迁移', () => {
      const lootProject = GF.project.create({ namespace: 'gf_legacy', components: [makeComponent('loot', 'Legacy Loot', { id: 'legacy', tableType: 'entities', entries: 'minecraft:diamond,10,1,1' }), makeComponent('function', 'Legacy Timer', { id: 'timer', trigger: 'schedule', interval: 40, commands: 'say tick' })] });
      const generated = generateProject(lootProject);
      const loot = generated.datapack.find((entry) => entry.name === 'data/gf_legacy/loot_tables/entities/legacy.json');
      if (!loot || JSON.parse(loot.data).type !== 'minecraft:entity') throw new Error('旧版掉落类型未正确迁移');
      const timer = generated.datapack.find((entry) => entry.name === 'data/gf_legacy/functions/function/timer.mcfunction');
      if (!timer?.data.includes('schedule function gf_legacy:function/timer 40t replace')) throw new Error('旧版 schedule 未迁移为定时循环');
    });
    await test('智能解析掉落、配方与效果指令', () => {
      const project = GF.project.create({ namespace: 'gf_prompt' });
      const loot = parsePrompt('牛死亡时10%掉钻石，1到3个', project).components[0]?.spec;
      if (!loot || loot.tableType !== 'entity' || loot.entries !== 'minecraft:diamond,10,1,3') throw new Error(`掉落解析错误：${loot?.entries || '空'}`);
      const recipe = parsePrompt('9个钻石合成下界合金锭', project).components[0]?.spec;
      if (!recipe || recipe.result !== 'minecraft:netherite_ingot' || recipe.grid.filter(Boolean).length !== 9) throw new Error('配方解析错误');
      const command = parsePrompt('给玩家速度效果30秒', project).components[0]?.spec;
      if (!command?.command?.includes('/effect give @p minecraft:speed 30 0 true')) throw new Error(`效果指令解析错误：${command?.command || '空'}`);
    });
    await test('标题颜色与重复资源路径安全', () => {
      const title = buildCommand({ type: 'title', target: '@a', name: '测试', extra: '10' });
      if (!title.includes('"color":"aqua"')) throw new Error('非法标题颜色没有回退');
      const project = GF.project.create({ namespace: 'gf_duplicate', components: [...templateComponents('thunder_blade'), ...templateComponents('thunder_blade')] });
      const generated = generateProject(project);
      const paths = generated.bundle.map((entry) => entry.name);
      if (new Set(paths).size !== paths.length) throw new Error('重复组件仍生成重复 ZIP 路径');
      if (!generated.collisions.length) throw new Error('重复组件没有产生冲突提示');
    });
    await test('ZIP 写入器生成可识别文件', async () => {
      const blob = GF.zip.makeZip([{ name: 'hello.txt', data: 'GameForge' }]);
      const bytes = await GF.zip.blobToBytes(blob);
      if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) throw new Error('ZIP 文件头错误');
    });
    await test('Forge 项目包含构建入口', () => {
      const project = GF.project.create({ namespace: 'gf_forge', components: templateComponents('forge_ruby_sword') });
      const generated = generateProject(project);
      for (const required of ['build.gradle','src/main/resources/META-INF/mods.toml','setup-windows.ps1']) if (!generated.forge.some((entry) => entry.name.endsWith(required))) throw new Error(`缺少 ${required}`);
      const java = generated.forge.find((entry) => entry.name.endsWith('.java'))?.data || '';
      if (!java.includes('new SwordItem(Tiers.DIAMOND, 6,')) throw new Error('工具伤害换算不正确');
    });
    return results;
  }

  GF.generators = {
    TYPE_META, EFFECT_META, makeComponent, parsePrompt, templateComponents,
    parseLootEntries, lootTableFromEntries, recipeFromGrid, buildCommand, explainCommand,
    normalizeLootType, normalizeFunctionTrigger, cleanFunctionCommands, advancementJson, generateComponent, generateProject,
    componentSummary, diagnose, analyzeLog, selfTests
  };
})();
