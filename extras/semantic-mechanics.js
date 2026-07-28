'use strict';

(() => {
  const root = globalThis;
  const GF = root.GameForge;
  const Gen = GF?.generators;
  if (!GF || !Gen || Gen.__semanticMechanicsInstalled) return;

  const VERSION = '1.0.0';
  const FORMAT_VERSION = 3;
  const BUILD_METHODS = [
    'buildFiles',
    'generateFiles',
    'generateProjectFiles',
    'buildProjectFiles',
    'compileProject'
  ];

  const TARGET_GROUPS = [
    {
      id: 'undead',
      zh: '亡灵生物',
      en: 'undead mobs',
      aliases: [
        /亡灵(?:生物|怪物)?/i,
        /不死(?:族|生物|怪物)?/i,
        /undead(?:\s+(?:mob|mobs|creature|creatures))?/i
      ],
      values: [
        'minecraft:zombie',
        'minecraft:zombie_villager',
        'minecraft:husk',
        'minecraft:drowned',
        'minecraft:skeleton',
        'minecraft:stray',
        'minecraft:wither_skeleton',
        'minecraft:zombified_piglin',
        'minecraft:phantom',
        'minecraft:wither',
        'minecraft:zoglin',
        'minecraft:zombie_horse',
        'minecraft:skeleton_horse',
        'minecraft:giant'
      ]
    },
    {
      id: 'zombies',
      zh: '僵尸类生物',
      en: 'zombie-type mobs',
      aliases: [
        /僵尸(?:类|系|生物|怪物)?/i,
        /zombies?/i
      ],
      values: [
        'minecraft:zombie',
        'minecraft:zombie_villager',
        'minecraft:husk',
        'minecraft:drowned',
        'minecraft:zombified_piglin',
        'minecraft:giant'
      ]
    },
    {
      id: 'skeletons',
      zh: '骷髅类生物',
      en: 'skeleton-type mobs',
      aliases: [
        /骷髅(?:类|系|生物|怪物)?/i,
        /skeletons?/i
      ],
      values: [
        'minecraft:skeleton',
        'minecraft:stray',
        'minecraft:wither_skeleton',
        'minecraft:skeleton_horse'
      ]
    },
    {
      id: 'arthropods',
      zh: '节肢生物',
      en: 'arthropods',
      aliases: [
        /节肢(?:动物|生物)?/i,
        /蜘蛛(?:类|系)?/i,
        /arthropods?/i,
        /spiders?/i
      ],
      values: [
        'minecraft:spider',
        'minecraft:cave_spider',
        'minecraft:silverfish',
        'minecraft:endermite',
        'minecraft:bee'
      ]
    },
    {
      id: 'aquatic',
      zh: '水生生物',
      en: 'aquatic mobs',
      aliases: [
        /水生(?:生物|怪物)?/i,
        /海洋(?:生物|怪物)?/i,
        /aquatic(?:\s+(?:mob|mobs|creature|creatures))?/i,
        /sea creatures?/i
      ],
      values: [
        'minecraft:cod',
        'minecraft:salmon',
        'minecraft:pufferfish',
        'minecraft:tropical_fish',
        'minecraft:squid',
        'minecraft:glow_squid',
        'minecraft:dolphin',
        'minecraft:turtle',
        'minecraft:axolotl',
        'minecraft:guardian',
        'minecraft:elder_guardian',
        'minecraft:tadpole'
      ]
    },
    {
      id: 'raiders',
      zh: '灾厄与袭击生物',
      en: 'raiders',
      aliases: [
        /灾厄(?:村民|生物)?/i,
        /袭击(?:者|生物)?/i,
        /掠夺者(?:类|系)?/i,
        /illagers?/i,
        /raiders?/i
      ],
      values: [
        'minecraft:pillager',
        'minecraft:vindicator',
        'minecraft:evoker',
        'minecraft:illusioner',
        'minecraft:ravager',
        'minecraft:witch'
      ]
    },
    {
      id: 'hostile',
      zh: '敌对生物',
      en: 'hostile mobs',
      aliases: [
        /敌对(?:生物|怪物)?/i,
        /怪物(?:类|群)?/i,
        /hostile(?:\s+(?:mob|mobs|creature|creatures))?/i,
        /monsters?/i
      ],
      values: [
        'minecraft:blaze',
        'minecraft:cave_spider',
        'minecraft:creeper',
        'minecraft:drowned',
        'minecraft:elder_guardian',
        'minecraft:endermite',
        'minecraft:evoker',
        'minecraft:ghast',
        'minecraft:guardian',
        'minecraft:hoglin',
        'minecraft:husk',
        'minecraft:magma_cube',
        'minecraft:phantom',
        'minecraft:piglin_brute',
        'minecraft:pillager',
        'minecraft:ravager',
        'minecraft:shulker',
        'minecraft:silverfish',
        'minecraft:skeleton',
        'minecraft:slime',
        'minecraft:spider',
        'minecraft:stray',
        'minecraft:vex',
        'minecraft:vindicator',
        'minecraft:warden',
        'minecraft:witch',
        'minecraft:wither',
        'minecraft:wither_skeleton',
        'minecraft:zoglin',
        'minecraft:zombie',
        'minecraft:zombie_villager',
        'minecraft:zombified_piglin'
      ]
    },
    {
      id: 'animals',
      zh: '动物',
      en: 'animals',
      aliases: [
        /动物(?:类|生物)?/i,
        /被动(?:生物|动物)?/i,
        /animals?/i,
        /passive mobs?/i
      ],
      values: [
        'minecraft:allay',
        'minecraft:axolotl',
        'minecraft:bat',
        'minecraft:bee',
        'minecraft:camel',
        'minecraft:cat',
        'minecraft:chicken',
        'minecraft:cow',
        'minecraft:donkey',
        'minecraft:fox',
        'minecraft:frog',
        'minecraft:goat',
        'minecraft:horse',
        'minecraft:llama',
        'minecraft:mooshroom',
        'minecraft:mule',
        'minecraft:ocelot',
        'minecraft:panda',
        'minecraft:parrot',
        'minecraft:pig',
        'minecraft:polar_bear',
        'minecraft:rabbit',
        'minecraft:sheep',
        'minecraft:sniffer',
        'minecraft:snow_golem',
        'minecraft:squid',
        'minecraft:strider',
        'minecraft:tadpole',
        'minecraft:turtle',
        'minecraft:wolf'
      ]
    },
    {
      id: 'all',
      zh: '所有非玩家生物',
      en: 'all non-player mobs',
      aliases: [
        /所有(?:非玩家)?(?:生物|怪物|实体)/i,
        /任何(?:生物|怪物)/i,
        /全部(?:生物|怪物)/i,
        /all\s+(?:non-player\s+)?(?:mobs|creatures|entities)/i,
        /every(?:thing|\s+mob|\s+creature)/i
      ],
      values: []
    }
  ];

  const ACTION_PATTERNS = [
    {
      id: 'instant_kill',
      aliases: [
        /秒杀/i,
        /一击必杀/i,
        /一刀(?:秒|杀)/i,
        /直接杀死/i,
        /立即杀死/i,
        /立刻杀死/i,
        /瞬间杀死/i,
        /即死/i,
        /处决/i,
        /斩杀/i,
        /必杀/i,
        /one[\s-]?shots?/i,
        /insta(?:nt)?[\s-]?kills?/i,
        /execute(?:s|d)?\s+(?:the\s+)?(?:target|mob|mobs|creature|creatures)?/i
      ]
    },
    {
      id: 'lightning',
      aliases: [
        /命中[^，。,.]{0,12}(?:召唤|产生|引发)?(?:闪电|雷击|落雷)/i,
        /攻击[^，。,.]{0,12}(?:闪电|雷击|落雷)/i,
        /(?:lightning|thunderbolt)[^,.]{0,18}(?:on hit|when hit|when attacking)/i,
        /(?:on hit|when hit|when attacking)[^,.]{0,18}(?:lightning|thunderbolt)/i
      ]
    },
    {
      id: 'ignite',
      aliases: [
        /命中[^，。,.]{0,12}(?:点燃|燃烧|着火)/i,
        /攻击[^，。,.]{0,12}(?:点燃|燃烧|着火)/i,
        /(?:ignite|set on fire|burn)[^,.]{0,18}(?:on hit|when hit|when attacking)?/i
      ]
    },
    {
      id: 'freeze',
      aliases: [
        /命中[^，。,.]{0,12}(?:冻结|冰冻|冻住)/i,
        /攻击[^，。,.]{0,12}(?:冻结|冰冻|冻住)/i,
        /(?:freeze|frozen)[^,.]{0,18}(?:on hit|when hit|when attacking)?/i
      ]
    },
    {
      id: 'poison',
      aliases: [
        /命中[^，。,.]{0,12}(?:中毒|施加毒素)/i,
        /攻击[^，。,.]{0,12}(?:中毒|施加毒素)/i,
        /(?:poison)[^,.]{0,18}(?:on hit|when hit|when attacking)?/i
      ]
    },
    {
      id: 'wither',
      aliases: [
        /命中[^，。,.]{0,12}(?:凋零|施加凋零)/i,
        /攻击[^，。,.]{0,12}(?:凋零|施加凋零)/i,
        /(?:wither)[^,.]{0,18}(?:on hit|when hit|when attacking)?/i
      ]
    },
    {
      id: 'slow',
      aliases: [
        /命中[^，。,.]{0,12}(?:减速|缓慢)/i,
        /攻击[^，。,.]{0,12}(?:减速|缓慢)/i,
        /(?:slow|slowness)[^,.]{0,18}(?:on hit|when hit|when attacking)?/i
      ]
    }
  ];

  function text(value) {
    return typeof value === 'string' ? value.trim() : '';
  }

  function normalizePrompt(value) {
    return text(value)
      .normalize('NFKC')
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
  }

  function hasCjk(value) {
    return /[\u3400-\u9fff]/.test(value);
  }

  function fnv1a(value) {
    let hash = 0x811c9dc5;
    const source = String(value || '');
    for (let index = 0; index < source.length; index += 1) {
      hash ^= source.charCodeAt(index);
      hash = Math.imul(hash, 0x01000193);
    }
    return (hash >>> 0).toString(36);
  }

  function resourceId(value, fallback = 'content') {
    let id = String(value || '')
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9_./-]+/g, '_')
      .replace(/^[_./-]+|[_./-]+$/g, '')
      .replace(/[_-]{2,}/g, '_');
    if (!id) id = `${fallback}_${fnv1a(value || fallback)}`;
    return id.slice(0, 80).replace(/[_./-]+$/g, '') || fallback;
  }

  function namespaceId(value, seed) {
    let id = resourceId(value, 'project').replace(/[./-]+/g, '_');
    if (!/^[a-z]/.test(id)) id = `gf_${id}`;
    if (id === 'gameforge' || id === 'minecraft' || id === 'forge') {
      id = `gf_${id}_${fnv1a(seed).slice(0, 7)}`;
    }
    return id.slice(0, 48).replace(/_+$/g, '');
  }

  function numberValue(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function firstText(...values) {
    return values.map(text).find(Boolean) || '';
  }

  function componentSpec(component) {
    if (!component || typeof component !== 'object') return null;
    if (!component.spec || typeof component.spec !== 'object' || Array.isArray(component.spec)) {
      component.spec = {};
    }
    return component.spec;
  }

  function componentType(component) {
    return firstText(component?.type, component?.kind, component?.spec?.type).toLowerCase();
  }

  function componentName(component) {
    return firstText(
      component?.name,
      component?.displayName,
      component?.title,
      component?.spec?.name,
      component?.spec?.displayName,
      component?.spec?.id,
      component?.id
    ) || '自定义武器';
  }

  function componentId(component) {
    return resourceId(firstText(
      component?.id,
      component?.logicalId,
      component?.spec?.id,
      component?.spec?.logicalId,
      componentName(component)
    ), 'weapon');
  }

  function projectComponents(project) {
    return Array.isArray(project?.components) ? project.components : [];
  }

  function projectName(project) {
    return firstText(
      project?.name,
      project?.projectName,
      project?.title,
      project?.meta?.name,
      project?.project?.name,
      'GameForge Project'
    );
  }

  function projectNamespace(project) {
    return firstText(
      project?.namespace,
      project?.meta?.namespace,
      project?.project?.namespace,
      'gameforge'
    ).toLowerCase();
  }

  function detectTarget(prompt) {
    for (const group of TARGET_GROUPS) {
      if (group.aliases.some((pattern) => pattern.test(prompt))) return group;
    }
    return null;
  }

  function detectBonusDamage(prompt) {
    const patterns = [
      /(?:额外|追加|再造成)\s*(\d+(?:\.\d+)?)\s*(?:点)?伤害/i,
      /(?:bonus|extra|additional)\s*(\d+(?:\.\d+)?)\s*damage/i
    ];
    for (const pattern of patterns) {
      const match = prompt.match(pattern);
      if (match) return Math.max(0, Math.min(2048, Number(match[1])));
    }
    if (/(?:双倍|两倍|2倍)伤害/i.test(prompt) || /double\s+damage/i.test(prompt)) return 'base';
    return null;
  }

  function detectAction(prompt, target) {
    for (const action of ACTION_PATTERNS) {
      if (action.aliases.some((pattern) => pattern.test(prompt))) return { id: action.id };
    }
    const bonus = detectBonusDamage(prompt);
    if (target && bonus !== null) return { id: 'bonus_damage', amount: bonus };
    return null;
  }

  function actionLabels(action, target, prompt, baseDamage) {
    const zh = hasCjk(prompt);
    const targetLabel = zh ? target.zh : target.en;
    const labels = {
      instant_kill: zh ? `秒杀${targetLabel}` : `Instantly kills ${targetLabel}`,
      lightning: zh ? `命中${targetLabel}时召唤闪电` : `Calls lightning when hitting ${targetLabel}`,
      ignite: zh ? `命中${targetLabel}时点燃目标` : `Ignites ${targetLabel} on hit`,
      freeze: zh ? `命中${targetLabel}时冻结目标` : `Freezes ${targetLabel} on hit`,
      poison: zh ? `命中${targetLabel}时使目标中毒` : `Poisons ${targetLabel} on hit`,
      wither: zh ? `命中${targetLabel}时施加凋零` : `Withers ${targetLabel} on hit`,
      slow: zh ? `命中${targetLabel}时施加强力缓慢` : `Strongly slows ${targetLabel} on hit`,
      bonus_damage: zh
        ? `对${targetLabel}额外造成${action.amount === 'base' ? `${baseDamage || 0}（基础伤害）` : action.amount}点伤害`
        : `Deals ${action.amount === 'base' ? `${baseDamage || 0} base` : action.amount} bonus damage to ${targetLabel}`
    };
    return {
      summary: labels[action.id] || (zh ? `命中${targetLabel}时触发特殊效果` : `Triggers a special effect on ${targetLabel}`),
      targetLabel,
      language: zh ? 'zh-CN' : 'en-US'
    };
  }

  function analyzePrompt(prompt) {
    const normalized = normalizePrompt(prompt);
    if (!normalized) return null;
    let target = detectTarget(normalized);
    const explicitLethal = ACTION_PATTERNS[0].aliases.some((pattern) => pattern.test(normalized));
    if (!target && explicitLethal) {
      target = TARGET_GROUPS.find((group) => group.id === 'all');
    }
    if (!target) return null;
    const action = detectAction(normalized, target);
    if (!action) return null;
    return {
      version: 1,
      trigger: 'on_hit',
      action: action.id,
      amount: action.amount ?? null,
      targetGroup: target.id,
      targetLabelZh: target.zh,
      targetLabelEn: target.en,
      targetValues: [...target.values],
      sourceText: normalized
    };
  }

  function appendLore(current, line) {
    const clean = text(current);
    if (!clean) return line;
    if (clean.includes(line)) return clean;
    return `${clean}\n${line}`;
  }

  function applyMechanic(component, mechanic, prompt) {
    const spec = componentSpec(component);
    if (!spec || componentType(component) !== 'weapon') return component;
    const baseDamage = numberValue(spec.damage ?? component.damage, 0);
    const labels = actionLabels(mechanic, {
      id: mechanic.targetGroup,
      zh: mechanic.targetLabelZh,
      en: mechanic.targetLabelEn
    }, prompt, baseDamage);

    spec.trigger = 'on_hit';
    spec.specialAction = mechanic.action;
    spec.targetGroup = mechanic.targetGroup;
    spec.targetLabel = labels.targetLabel;
    spec.targetLabelZh = mechanic.targetLabelZh;
    spec.targetLabelEn = mechanic.targetLabelEn;
    spec.mechanicSummary = labels.summary;
    spec.mechanicVersion = mechanic.version;
    spec.effect = labels.summary;
    spec.effectCode = `${mechanic.action}_${mechanic.targetGroup}`;
    if (mechanic.amount !== null) spec.bonusDamage = mechanic.amount;
    spec.sourcePrompt = mechanic.sourceText;

    const loreLine = labels.language === 'zh-CN'
      ? `特殊机制：${labels.summary}`
      : `Special mechanic: ${labels.summary}`;
    component.lore = appendLore(component.lore ?? spec.lore, loreLine);
    spec.lore = component.lore;
    component.spec = spec;
    return component;
  }

  function addWarning(plan, message) {
    if (!plan || !message) return;
    if (!Array.isArray(plan.warnings)) plan.warnings = [];
    if (!plan.warnings.includes(message)) plan.warnings.push(message);
  }

  function applyToPlan(plan, prompt) {
    if (!plan || typeof plan !== 'object') return plan;
    const mechanic = analyzePrompt(prompt);
    if (!mechanic) return plan;
    const components = Array.isArray(plan.components) ? plan.components : [];
    const weapons = components.filter((component) => componentType(component) === 'weapon');
    if (!weapons.length) return plan;
    for (const weapon of weapons) applyMechanic(weapon, mechanic, prompt);
    if (mechanic.targetGroup === 'all' && mechanic.action === 'instant_kill') {
      addWarning(plan, hasCjk(prompt)
        ? '该武器会秒杀所有非玩家生物；请先在复制的测试世界中验证。'
        : 'This weapon instantly kills every non-player mob; test it in a copied world first.');
    }
    return plan;
  }

  function prepareProject(project) {
    if (!project || typeof project !== 'object') return project;
    const components = projectComponents(project);
    const seed = `${projectName(project)}:${firstText(project.id, project.createdAt, components.map(componentName).join('|'))}`;
    const currentNamespace = projectNamespace(project);
    if (!/^[a-z][a-z0-9_.-]{1,63}$/.test(currentNamespace)
      || currentNamespace === 'gameforge'
      || currentNamespace === 'minecraft'
      || currentNamespace === 'forge') {
      const preferred = firstText(projectName(project), components[0] && componentName(components[0]), 'project');
      project.previousNamespace = currentNamespace;
      project.namespace = namespaceId(preferred, seed);
    }

    project.gameforgeFormat = Math.max(FORMAT_VERSION, numberValue(project.gameforgeFormat, 0));
    project.compatibility = {
      ...(project.compatibility && typeof project.compatibility === 'object' ? project.compatibility : {}),
      minecraft: '1.20.1',
      loader: 'forge',
      loaderVersion: '47.x',
      java: 17,
      runtimeRecommended: '1.20.1-0.2.1',
      semanticMechanics: VERSION
    };
    return project;
  }

  function targetGroup(id) {
    return TARGET_GROUPS.find((group) => group.id === id) || TARGET_GROUPS.find((group) => group.id === 'all');
  }

  function selectorFor(group, range) {
    const radius = Math.max(3, Math.min(32, Math.round(numberValue(range, 8))));
    const common = `distance=..${radius},sort=nearest,limit=1,nbt={HurtTime:10s}`;
    if (group.id === 'all') return `@e[type=!minecraft:player,${common}]`;
    return `@e[type=#__TARGET_TAG__,${common}]`;
  }

  function actionCommands(action, selector, amount, baseDamage) {
    switch (action) {
      case 'instant_kill':
        return [`kill ${selector}`];
      case 'lightning':
        return [`execute at ${selector} run summon minecraft:lightning_bolt ~ ~ ~`];
      case 'ignite':
        return [`data merge entity ${selector} {Fire:160s}`];
      case 'freeze':
        return [`data merge entity ${selector} {TicksFrozen:300}`];
      case 'poison':
        return [`effect give ${selector} minecraft:poison 5 1 true`];
      case 'wither':
        return [`effect give ${selector} minecraft:wither 5 1 true`];
      case 'slow':
        return [`effect give ${selector} minecraft:slowness 5 2 true`];
      case 'bonus_damage': {
        const resolved = amount === 'base' ? Math.max(1, numberValue(baseDamage, 1)) : Math.max(0, numberValue(amount, 0));
        return [`damage ${selector} ${Math.min(2048, resolved)} minecraft:generic`];
      }
      default:
        return [];
    }
  }

  function mechanicFromComponent(component) {
    const spec = componentSpec(component);
    if (!spec || componentType(component) !== 'weapon') return null;
    const action = firstText(spec.specialAction, spec.effectCode?.split('_')[0]);
    const groupId = firstText(spec.targetGroup);
    if (!action || !groupId) return null;
    return {
      action,
      targetGroup: groupId,
      amount: spec.bonusDamage ?? null,
      range: spec.range,
      baseDamage: spec.damage,
      summary: firstText(spec.mechanicSummary, spec.effect),
      targetLabel: firstText(spec.targetLabel, spec.targetLabelZh, groupId)
    };
  }

  function buildSpecialFiles(project) {
    prepareProject(project);
    const namespace = projectNamespace(project);
    const files = [];
    const tagFiles = new Map();

    for (const component of projectComponents(project)) {
      const mechanic = mechanicFromComponent(component);
      if (!mechanic) continue;
      const group = targetGroup(mechanic.targetGroup);
      const id = componentId(component);
      const tagId = `gameforge/targets/${resourceId(group.id, 'targets')}`;
      const tagResource = `${namespace}:${tagId}`;
      let selector = selectorFor(group, mechanic.range);
      if (group.id !== 'all') selector = selector.replace('__TARGET_TAG__', tagResource);
      const advancementId = `gameforge/weapon/${id}/hit_special`;
      const functionId = `weapon/${id}/special_hit`;
      const itemNbt = `{gameforge:{id:'${namespace}:weapon:${id}'}}`;
      const criteria = {
        trigger: 'minecraft:player_hurt_entity',
        conditions: {
          player: {
            equipment: {
              mainhand: {
                nbt: itemNbt
              }
            }
          }
        }
      };
      if (group.id !== 'all') criteria.conditions.entity = { type: `#${tagResource}` };

      files.push({
        path: `datapack/data/${namespace}/advancements/${advancementId}.json`,
        content: `${JSON.stringify({
          criteria: { hit: criteria },
          rewards: { function: `${namespace}:${functionId}` }
        }, null, 2)}\n`
      });

      const commands = [
        `# GameForge conditional weapon mechanic: ${mechanic.summary || `${mechanic.action} ${group.id}`}`,
        `advancement revoke @s only ${namespace}:${advancementId}`,
        ...actionCommands(mechanic.action, selector, mechanic.amount, mechanic.baseDamage)
      ];
      files.push({
        path: `datapack/data/${namespace}/functions/${functionId}.mcfunction`,
        content: `${commands.join('\n')}\n`
      });

      if (group.id !== 'all' && !tagFiles.has(tagId)) {
        tagFiles.set(tagId, {
          path: `datapack/data/${namespace}/tags/entity_types/${tagId}.json`,
          content: `${JSON.stringify({ replace: false, values: group.values }, null, 2)}\n`
        });
      }
    }

    return [...tagFiles.values(), ...files];
  }

  function pathOf(entry) {
    if (!entry || typeof entry !== 'object') return '';
    return firstText(entry.path, entry.name, entry.fileName, entry.filename, entry.file);
  }

  function setEntryContent(entry, content) {
    if ('content' in entry || (!('text' in entry) && !('data' in entry))) entry.content = content;
    else if ('text' in entry) entry.text = content;
    else entry.data = content;
  }

  function createEntryLike(sample, path, content) {
    if (sample && typeof sample === 'object') {
      if ('name' in sample && !('path' in sample)) return { name: path, content };
      if ('fileName' in sample && !('path' in sample)) return { fileName: path, content };
      if ('filename' in sample && !('path' in sample)) return { filename: path, content };
    }
    return { path, content };
  }

  function arrayContainer(result) {
    if (Array.isArray(result)) return result;
    for (const key of ['files', 'generatedFiles', 'outputFiles', 'entries']) {
      if (Array.isArray(result?.[key])) return result[key];
    }
    return null;
  }

  function upsertArrayFile(files, path, content) {
    const existing = files.find((entry) => pathOf(entry) === path);
    if (existing) {
      setEntryContent(existing, content);
      return;
    }
    files.push(createEntryLike(files[0], path, content));
  }

  function readEntryText(entry) {
    if (!entry || typeof entry !== 'object') return '';
    const value = entry.content ?? entry.text ?? entry.data;
    return typeof value === 'string' ? value : '';
  }

  function diagnosticsFor(project) {
    const warnings = [];
    const errors = [];
    const seen = new Set();
    for (const component of projectComponents(project)) {
      const id = componentId(component);
      if (seen.has(id)) errors.push(`重复组件 ID：${id}`);
      seen.add(id);
      const spec = componentSpec(component) || {};
      const damage = numberValue(spec.damage, 0);
      const range = numberValue(spec.range, 0);
      const cooldown = numberValue(spec.cooldown, 0);
      const power = numberValue(spec.power, 0);
      if (damage > 2048) warnings.push(`${componentName(component)} 的伤害超过 2048，可能导致兼容或显示问题。`);
      if (range > 32) warnings.push(`${componentName(component)} 的范围超过 32 格，可能影响性能。`);
      if (cooldown <= 0 && ['right_click', 'passive', 'tick'].includes(firstText(spec.trigger).toLowerCase())) {
        warnings.push(`${componentName(component)} 没有冷却，持续触发时可能影响性能。`);
      }
      if (power > 16) warnings.push(`${componentName(component)} 的强度超过 16，建议先在测试世界验证。`);
      if (spec.specialAction === 'instant_kill' && spec.targetGroup === 'all') {
        warnings.push(`${componentName(component)} 会秒杀所有非玩家生物。`);
      }
    }
    return {
      generatedAt: new Date().toISOString(),
      formatVersion: FORMAT_VERSION,
      target: {
        minecraft: '1.20.1',
        forge: '47.x',
        java: 17
      },
      errors,
      warnings,
      compatible: errors.length === 0
    };
  }

  function patchProjectJsonInArray(files, project, diagnostics) {
    const entry = files.find((candidate) => /(^|\/)project\.json$/i.test(pathOf(candidate)));
    if (!entry) return;
    try {
      const parsed = JSON.parse(readEntryText(entry));
      parsed.gameforgeFormat = project.gameforgeFormat;
      parsed.compatibility = project.compatibility;
      parsed.diagnostics = diagnostics;
      if (Array.isArray(project.components)) parsed.components = project.components;
      if (project.namespace) parsed.namespace = project.namespace;
      setEntryContent(entry, `${JSON.stringify(parsed, null, 2)}\n`);
    } catch (error) {
      console.warn('GameForge semantic mechanics could not patch project.json.', error);
    }
  }

  function patchReadmeInArray(files, project) {
    const mechanics = projectComponents(project)
      .map((component) => ({ name: componentName(component), mechanic: mechanicFromComponent(component) }))
      .filter((entry) => entry.mechanic);
    if (!mechanics.length) return;
    const block = [
      '',
      '=== 条件武器机制 / Conditional weapon mechanics ===',
      ...mechanics.map((entry) => `- ${entry.name}: ${entry.mechanic.summary || `${entry.mechanic.action} -> ${entry.mechanic.targetGroup}`}`),
      '',
      '这些机制由 player_hurt_entity 进度触发，并只作用于配置的目标类别。',
      'Conditional mechanics use a player_hurt_entity advancement and only affect the configured target group.',
      ''
    ].join('\n');
    const entry = files.find((candidate) => /README_GAMEFORGE\.txt$/i.test(pathOf(candidate)));
    if (entry) {
      const original = readEntryText(entry);
      if (!original.includes('条件武器机制 / Conditional weapon mechanics')) setEntryContent(entry, `${original.trimEnd()}\n${block}`);
    } else {
      upsertArrayFile(files, 'datapack/README_GAMEFORGE_MECHANICS.txt', block.trimStart());
    }
  }

  function patchGeneratedResult(result, project) {
    if (!result || !project) return result;
    prepareProject(project);
    const extraFiles = buildSpecialFiles(project);
    const diagnostics = diagnosticsFor(project);
    project.diagnostics = diagnostics;

    const files = arrayContainer(result);
    if (files) {
      for (const file of extraFiles) upsertArrayFile(files, file.path, file.content);
      upsertArrayFile(files, 'GAMEFORGE_PREFLIGHT.json', `${JSON.stringify(diagnostics, null, 2)}\n`);
      patchProjectJsonInArray(files, project, diagnostics);
      patchReadmeInArray(files, project);
      return result;
    }

    if (result instanceof Map) {
      for (const file of extraFiles) result.set(file.path, file.content);
      result.set('GAMEFORGE_PREFLIGHT.json', `${JSON.stringify(diagnostics, null, 2)}\n`);
      return result;
    }

    if (result.files && typeof result.files === 'object' && !Array.isArray(result.files)) {
      for (const file of extraFiles) result.files[file.path] = file.content;
      result.files['GAMEFORGE_PREFLIGHT.json'] = `${JSON.stringify(diagnostics, null, 2)}\n`;
    }
    return result;
  }

  function findProjectArgument(args) {
    return args.find((value) => value && typeof value === 'object' && Array.isArray(value.components)) || null;
  }

  function wrapBuildMethod(name) {
    const original = Gen[name];
    if (typeof original !== 'function' || original.__semanticMechanicsWrapped) return false;
    function wrapped(...args) {
      const project = findProjectArgument(args);
      if (project) prepareProject(project);
      const output = original.apply(this, args);
      if (output && typeof output.then === 'function') {
        return output.then((value) => patchGeneratedResult(value, project));
      }
      return patchGeneratedResult(output, project);
    }
    wrapped.__semanticMechanicsWrapped = true;
    wrapped.__original = original;
    Gen[name] = wrapped;
    return true;
  }

  const originalParsePrompt = typeof Gen.parsePrompt === 'function' ? Gen.parsePrompt : null;
  if (originalParsePrompt) {
    Gen.parsePrompt = function parsePromptWithMechanics(prompt, project, ...rest) {
      const result = originalParsePrompt.call(this, prompt, project, ...rest);
      if (result && typeof result.then === 'function') {
        return result.then((plan) => applyToPlan(plan, prompt));
      }
      return applyToPlan(result, prompt);
    };
  }

  const wrappedBuildMethods = BUILD_METHODS.filter(wrapBuildMethod);
  Gen.__semanticMechanicsInstalled = true;
  GF.semanticMechanics = Object.freeze({
    version: VERSION,
    formatVersion: FORMAT_VERSION,
    targetGroups: TARGET_GROUPS.map((group) => ({
      id: group.id,
      zh: group.zh,
      en: group.en,
      values: [...group.values]
    })),
    analyzePrompt,
    applyToPlan,
    prepareProject,
    buildSpecialFiles,
    patchGeneratedResult,
    diagnosticsFor,
    wrappedBuildMethods
  });
})();
