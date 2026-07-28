'use strict';

(() => {
  const GF = window.GameForge;
  const Pipeline = GF?.pipeline;
  const Gen = GF?.generators;
  if (!GF || !Pipeline || !Gen || GF.worldgen?.__installed) return;

  const U = GF.utils;
  const originalValidate = Pipeline.validate.bind(Pipeline);
  const VERSION = 1;
  const BIOME_TYPE = 'worldgen_biome';
  const DIMENSION_TYPE = 'worldgen_dimension';
  const TERRAIN_PRESETS = Object.freeze(['overworld', 'large_biomes', 'amplified', 'caves', 'nether', 'end', 'floating_islands', 'flat', 'void']);
  const FEATURE_PRESETS = Object.freeze(['lush', 'sparse', 'nether', 'end', 'empty']);
  const SPAWN_PRESETS = Object.freeze(['mixed', 'peaceful', 'hostile', 'nether', 'end', 'empty']);
  const STRUCTURE_PRESETS = Object.freeze(['village', 'mineshaft', 'ruined_portal']);
  const clone = (value) => JSON.parse(JSON.stringify(value));

  function configOf(component) {
    return component?.config || component?.spec || {};
  }

  function kindOf(component) {
    return String(component?.kind || component?.type || '').toLowerCase();
  }

  function contentTypeOf(component) {
    return String(configOf(component).contentType || '').toLowerCase();
  }

  function isBiome(component) {
    return kindOf(component) === 'forge' && contentTypeOf(component) === BIOME_TYPE;
  }

  function isDimension(component) {
    return kindOf(component) === 'forge' && contentTypeOf(component) === DIMENSION_TYPE;
  }

  function number(value, fallback, min = -Infinity, max = Infinity) {
    const parsed = Number(value);
    const safe = Number.isFinite(parsed) ? parsed : fallback;
    return Math.min(max, Math.max(min, safe));
  }

  function integer(value, fallback, min = -2147483648, max = 2147483647) {
    return Math.round(number(value, fallback, min, max));
  }

  function bool(value, fallback = false) {
    return value === undefined || value === null ? fallback : Boolean(value);
  }

  function cleanId(value, fallback = 'worldgen_content') {
    return U.cleanId(String(value || fallback), fallback).replace(/[.-]/g, '_');
  }

  function normalizeResourceId(value, namespace, fallback = 'minecraft:plains') {
    const raw = String(value || '').trim().toLowerCase();
    if (/^[a-z0-9_.-]+:[a-z0-9_./-]+$/.test(raw)) return raw;
    if (/^[a-z0-9_./-]+$/.test(raw)) return `${namespace}:${raw}`;
    return fallback;
  }

  function hashText(value) {
    let hash = 2166136261;
    for (const char of String(value || '')) {
      hash ^= char.codePointAt(0);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36);
  }

  function promptId(text, fallback = 'custom_realm') {
    const source = String(text || '');
    const themed = [
      [/(?:废土|廢土|wasteland)/i, 'wasteland_realm'],
      [/(?:冰雪|寒冰|永冻|永凍|frozen|ice)/i, 'frozen_realm'],
      [/(?:火山|熔岩|volcanic|lava)/i, 'volcanic_realm'],
      [/(?:天空岛|天空島|浮空|sky\s*island)/i, 'sky_island_realm'],
      [/(?:虚空|虛空|void)/i, 'void_realm'],
      [/(?:海洋|深海|ocean)/i, 'ocean_realm'],
      [/(?:赛博|賽博|cyber)/i, 'cyber_realm'],
      [/(?:修仙|仙界|cultivation)/i, 'cultivation_realm'],
      [/(?:克苏鲁|克蘇魯|cthulhu)/i, 'eldritch_realm']
    ].find(([pattern]) => pattern.test(source));
    return themed?.[1] || `${fallback}_${hashText(source).slice(0, 6)}`;
  }

  function normalizeTerrainPreset(value) {
    const raw = String(value || '').trim().toLowerCase().replace(/[ -]+/g, '_');
    const aliases = {
      overworld: 'overworld', normal: 'overworld', vanilla: 'overworld',
      large: 'large_biomes', large_biomes: 'large_biomes',
      amplified: 'amplified', mountains: 'amplified',
      cave: 'caves', caves: 'caves', underground: 'caves',
      nether: 'nether', hell: 'nether',
      end: 'end', the_end: 'end',
      floating: 'floating_islands', floating_islands: 'floating_islands', sky_islands: 'floating_islands',
      flat: 'flat', superflat: 'flat',
      void: 'void'
    };
    return TERRAIN_PRESETS.includes(aliases[raw]) ? aliases[raw] : 'overworld';
  }

  function inferTerrainPreset(text) {
    if (/(?:虚空|虛空|void)/i.test(text)) return 'void';
    if (/(?:天空岛|天空島|浮空岛|浮空島|浮空世界|sky\s*islands?|floating\s*islands?)/i.test(text)) return 'floating_islands';
    if (/(?:超平坦|平坦世界|superflat|flat\s*world)/i.test(text)) return 'flat';
    if (/(?:放大化|巨型山脉|巨型山脈|amplified)/i.test(text)) return 'amplified';
    if (/(?:大型群系|大群系|large\s*biomes?)/i.test(text)) return 'large_biomes';
    if (/(?:洞穴世界|地下世界|cave\s*world|underground\s*world)/i.test(text)) return 'caves';
    if (/(?:下界|地狱|地獄|nether)/i.test(text)) return 'nether';
    if (/(?:末地|终界|終界|the\s*end|end\s*world)/i.test(text)) return 'end';
    return 'overworld';
  }

  function normalizeFeaturePreset(value, terrain = 'overworld') {
    const raw = String(value || '').trim().toLowerCase().replace(/[ -]+/g, '_');
    if (FEATURE_PRESETS.includes(raw)) return raw;
    if (terrain === 'nether') return 'nether';
    if (terrain === 'end' || terrain === 'floating_islands') return 'end';
    if (terrain === 'void') return 'empty';
    return 'lush';
  }

  function normalizeSpawnPreset(value, terrain = 'overworld') {
    const raw = String(value || '').trim().toLowerCase();
    if (SPAWN_PRESETS.includes(raw)) return raw;
    if (terrain === 'nether') return 'nether';
    if (terrain === 'end' || terrain === 'floating_islands') return 'end';
    if (terrain === 'void') return 'empty';
    return 'mixed';
  }

  function normalizeStructures(value) {
    const source = Array.isArray(value) ? value : String(value || '').split(/[，,;；\s]+/);
    return Array.from(new Set(source.map((item) => String(item).trim().toLowerCase()).filter((item) => STRUCTURE_PRESETS.includes(item))));
  }

  function hex(value, fallback) {
    const raw = String(value || '').trim();
    const match = raw.match(/^#?([0-9a-f]{6})$/i);
    return `#${(match ? match[1] : String(fallback).replace('#', '')).toLowerCase()}`;
  }

  function themeFromPrompt(text, terrain) {
    const source = String(text || '');
    if (/(?:冰雪|寒冰|永冻|永凍|frozen|ice)/i.test(source)) {
      return { name: '冰雪荒原', temperature: -0.5, downfall: 0.8, precipitation: true, skyColor: '#a8c8ff', fogColor: '#c7dcff', waterColor: '#3f76e4', waterFogColor: '#294b9b', grassColor: '#a8c6d8', foliageColor: '#b8d4df', featurePreset: 'sparse', spawnPreset: 'hostile' };
    }
    if (/(?:废土|廢土|末日|wasteland|apocalypse)/i.test(source)) {
      return { name: '末日废土', temperature: 1.3, downfall: 0.0, precipitation: false, skyColor: '#8d765f', fogColor: '#6f6256', waterColor: '#5e6f56', waterFogColor: '#303b2c', grassColor: '#7c7352', foliageColor: '#71694d', featurePreset: 'sparse', spawnPreset: 'hostile' };
    }
    if (/(?:火山|熔岩|灰烬|灰燼|volcanic|lava|ash)/i.test(source) || terrain === 'nether') {
      return { name: '熔火荒原', temperature: 2.0, downfall: 0.0, precipitation: false, skyColor: '#6e251d', fogColor: '#33100d', waterColor: '#5a271f', waterFogColor: '#250b08', grassColor: '#5b4337', foliageColor: '#4f382f', featurePreset: 'nether', spawnPreset: 'nether' };
    }
    if (/(?:海洋|深海|ocean|abyss)/i.test(source)) {
      return { name: '无尽海域', temperature: 0.5, downfall: 0.9, precipitation: true, skyColor: '#5b8fd8', fogColor: '#557ca8', waterColor: '#1f5fbd', waterFogColor: '#082c63', grassColor: '#4f8f76', foliageColor: '#3b7f68', featurePreset: 'sparse', spawnPreset: 'mixed' };
    }
    if (/(?:赛博|賽博|cyber)/i.test(source)) {
      return { name: '霓虹荒境', temperature: 0.8, downfall: 0.1, precipitation: false, skyColor: '#5a2f9e', fogColor: '#271b45', waterColor: '#00a7c4', waterFogColor: '#003b58', grassColor: '#3b7f78', foliageColor: '#4a6998', featurePreset: 'sparse', spawnPreset: 'hostile' };
    }
    if (terrain === 'end' || terrain === 'floating_islands' || terrain === 'void') {
      return { name: '虚空群岛', temperature: 0.5, downfall: 0.0, precipitation: false, skyColor: '#000000', fogColor: '#a080a0', waterColor: '#3f76e4', waterFogColor: '#050533', grassColor: '#827a92', foliageColor: '#777088', featurePreset: terrain === 'void' ? 'empty' : 'end', spawnPreset: terrain === 'void' ? 'empty' : 'end' };
    }
    return { name: '自定义原野', temperature: 0.8, downfall: 0.4, precipitation: true, skyColor: '#78a7ff', fogColor: '#c0d8ff', waterColor: '#3f76e4', waterFogColor: '#050533', grassColor: '#79c05a', foliageColor: '#59ae30', featurePreset: 'lush', spawnPreset: 'mixed' };
  }

  function defaultDimensionType(terrain) {
    if (terrain === 'nether') return { minY: 0, height: 256, logicalHeight: 128, natural: false, skylight: false, ceiling: true, ultrawarm: true, coordinateScale: 8, ambientLight: 0.1, piglinSafe: true, bedWorks: false, respawnAnchorWorks: true, hasRaids: false, effects: 'minecraft:the_nether', infiniburn: '#minecraft:infiniburn_nether', fixedTime: 18000 };
    if (terrain === 'end' || terrain === 'floating_islands' || terrain === 'void') return { minY: 0, height: 256, logicalHeight: 256, natural: false, skylight: false, ceiling: false, ultrawarm: false, coordinateScale: 1, ambientLight: 0, piglinSafe: false, bedWorks: false, respawnAnchorWorks: false, hasRaids: true, effects: 'minecraft:the_end', infiniburn: '#minecraft:infiniburn_end', fixedTime: 6000 };
    return { minY: -64, height: 384, logicalHeight: 384, natural: true, skylight: true, ceiling: false, ultrawarm: false, coordinateScale: 1, ambientLight: 0, piglinSafe: false, bedWorks: true, respawnAnchorWorks: false, hasRaids: true, effects: 'minecraft:overworld', infiniburn: '#minecraft:infiniburn_overworld', fixedTime: null };
  }

  function biomeDescriptor(component, namespace = 'gameforge') {
    const config = configOf(component);
    const id = cleanId(component.registryId || config.id || component.name, 'custom_biome');
    const terrain = normalizeTerrainPreset(config.terrainPreset || 'overworld');
    return {
      componentId: component.id,
      id,
      resourceId: `${namespace}:${id}`,
      name: String(config.name || component.name || id),
      terrainPreset: terrain,
      temperature: number(config.temperature, 0.8, -2, 2),
      downfall: number(config.downfall, 0.4, 0, 1),
      precipitation: bool(config.precipitation, true),
      skyColor: hex(config.skyColor, '#78a7ff'),
      fogColor: hex(config.fogColor, '#c0d8ff'),
      waterColor: hex(config.waterColor, '#3f76e4'),
      waterFogColor: hex(config.waterFogColor, '#050533'),
      grassColor: hex(config.grassColor, '#79c05a'),
      foliageColor: hex(config.foliageColor, '#59ae30'),
      featurePreset: normalizeFeaturePreset(config.featurePreset, terrain),
      spawnPreset: normalizeSpawnPreset(config.spawnPreset, terrain),
      ambientSound: String(config.ambientSound || ''),
      music: String(config.music || ''),
      structures: normalizeStructures(config.structures)
    };
  }

  function dimensionDescriptor(component, namespace = 'gameforge') {
    const config = configOf(component);
    const id = cleanId(component.registryId || config.id || component.name, 'custom_dimension');
    const terrain = normalizeTerrainPreset(config.terrainPreset);
    const defaults = defaultDimensionType(terrain);
    const expected = terrain === 'nether' || terrain === 'end' || terrain === 'floating_islands' || terrain === 'void'
      ? { minY: 0, height: 256 }
      : { minY: -64, height: 384 };
    const minY = integer(config.minY, expected.minY);
    const height = integer(config.height, expected.height, 16, 4064);
    return {
      componentId: component.id,
      id,
      resourceId: `${namespace}:${id}`,
      name: String(config.name || component.name || id),
      terrainPreset: terrain,
      biomeId: normalizeResourceId(config.biomeId || `${id}_biome`, namespace, 'minecraft:plains'),
      minY,
      height,
      logicalHeight: integer(config.logicalHeight, Math.min(defaults.logicalHeight, height), 16, height),
      natural: bool(config.natural, defaults.natural),
      skylight: bool(config.skylight, defaults.skylight),
      ceiling: bool(config.ceiling, defaults.ceiling),
      ultrawarm: bool(config.ultrawarm, defaults.ultrawarm),
      coordinateScale: number(config.coordinateScale, defaults.coordinateScale, 0.00001, 30000000),
      ambientLight: number(config.ambientLight, defaults.ambientLight, 0, 1),
      piglinSafe: bool(config.piglinSafe, defaults.piglinSafe),
      bedWorks: bool(config.bedWorks, defaults.bedWorks),
      respawnAnchorWorks: bool(config.respawnAnchorWorks, defaults.respawnAnchorWorks),
      hasRaids: bool(config.hasRaids, defaults.hasRaids),
      effects: String(config.effects || defaults.effects),
      infiniburn: String(config.infiniburn || defaults.infiniburn),
      fixedTime: config.fixedTime === null || config.fixedTime === '' || config.fixedTime === undefined ? defaults.fixedTime : integer(config.fixedTime, defaults.fixedTime ?? 6000, 0, 23999),
      monsterSpawnBlockLightLimit: integer(config.monsterSpawnBlockLightLimit, terrain === 'nether' ? 15 : 0, 0, 15),
      monsterSpawnLightLevel: integer(config.monsterSpawnLightLevel, terrain === 'nether' ? 7 : 7, 0, 15),
      flatLayers: Array.isArray(config.flatLayers) ? clone(config.flatLayers) : [],
      flatStructures: normalizeStructures(config.flatStructures || config.structures),
      travelItemId: cleanId(config.travelItemId || `${id}_key`, `${id}_key`),
      travelItemName: String(config.travelItemName || `${config.name || component.name || id}钥匙`),
      spawnY: integer(config.spawnY, terrain === 'void' || terrain === 'floating_islands' ? 96 : 80, -2032, 2031),
      platformBlock: normalizeResourceId(config.platformBlock || 'minecraft:stone', namespace, 'minecraft:stone'),
      createPlatform: bool(config.createPlatform, terrain === 'void' || terrain === 'floating_islands')
    };
  }

  function createBiomeComponent(options = {}) {
    const terrain = normalizeTerrainPreset(options.terrainPreset || 'overworld');
    const name = String(options.name || '自定义群系');
    const id = cleanId(options.id || promptId(name, 'custom_biome'), 'custom_biome');
    return Gen.makeComponent('forge', name, {
      id,
      name,
      contentType: BIOME_TYPE,
      terrainPreset: terrain,
      temperature: number(options.temperature, 0.8, -2, 2),
      downfall: number(options.downfall, 0.4, 0, 1),
      precipitation: bool(options.precipitation, true),
      skyColor: hex(options.skyColor, '#78a7ff'),
      fogColor: hex(options.fogColor, '#c0d8ff'),
      waterColor: hex(options.waterColor, '#3f76e4'),
      waterFogColor: hex(options.waterFogColor, '#050533'),
      grassColor: hex(options.grassColor, '#79c05a'),
      foliageColor: hex(options.foliageColor, '#59ae30'),
      featurePreset: normalizeFeaturePreset(options.featurePreset, terrain),
      spawnPreset: normalizeSpawnPreset(options.spawnPreset, terrain),
      ambientSound: String(options.ambientSound || ''),
      music: String(options.music || ''),
      structures: normalizeStructures(options.structures)
    });
  }

  function createDimensionComponent(options = {}) {
    const terrain = normalizeTerrainPreset(options.terrainPreset || 'overworld');
    const defaults = defaultDimensionType(terrain);
    const name = String(options.name || '自定义维度');
    const id = cleanId(options.id || promptId(name, 'custom_dimension'), 'custom_dimension');
    return Gen.makeComponent('forge', name, {
      id,
      name,
      contentType: DIMENSION_TYPE,
      terrainPreset: terrain,
      biomeId: String(options.biomeId || `${id}_biome`),
      minY: integer(options.minY, defaults.minY),
      height: integer(options.height, defaults.height),
      logicalHeight: integer(options.logicalHeight, defaults.logicalHeight),
      natural: bool(options.natural, defaults.natural),
      skylight: bool(options.skylight, defaults.skylight),
      ceiling: bool(options.ceiling, defaults.ceiling),
      ultrawarm: bool(options.ultrawarm, defaults.ultrawarm),
      coordinateScale: number(options.coordinateScale, defaults.coordinateScale),
      ambientLight: number(options.ambientLight, defaults.ambientLight, 0, 1),
      piglinSafe: bool(options.piglinSafe, defaults.piglinSafe),
      bedWorks: bool(options.bedWorks, defaults.bedWorks),
      respawnAnchorWorks: bool(options.respawnAnchorWorks, defaults.respawnAnchorWorks),
      hasRaids: bool(options.hasRaids, defaults.hasRaids),
      effects: String(options.effects || defaults.effects),
      infiniburn: String(options.infiniburn || defaults.infiniburn),
      fixedTime: options.fixedTime === undefined ? defaults.fixedTime : options.fixedTime,
      monsterSpawnBlockLightLimit: integer(options.monsterSpawnBlockLightLimit, terrain === 'nether' ? 15 : 0),
      monsterSpawnLightLevel: integer(options.monsterSpawnLightLevel, 7),
      flatLayers: Array.isArray(options.flatLayers) ? clone(options.flatLayers) : [],
      flatStructures: normalizeStructures(options.flatStructures || options.structures),
      travelItemId: cleanId(options.travelItemId || `${id}_key`, `${id}_key`),
      travelItemName: String(options.travelItemName || `${name}钥匙`),
      spawnY: integer(options.spawnY, terrain === 'void' || terrain === 'floating_islands' ? 96 : 80),
      platformBlock: String(options.platformBlock || 'minecraft:stone'),
      createPlatform: bool(options.createPlatform, terrain === 'void' || terrain === 'floating_islands')
    });
  }

  function extractWorldName(text, fallback) {
    const named = String(text).match(/(?:叫|名为|名為|named|called)\s*([^，,。.;；]{1,32}?)(?=(?:的)?(?:世界|维度|維度|群系|biome|dimension|world)|[，,。.;；]|$)/i);
    if (named?.[1]) return named[1].trim();
    const direct = String(text).match(/(?:做|创建|創建|生成|来一个|來一個|create|make)\s*(?:一个|一個|a|an)?\s*([^，,。.;；]{1,24}?)(?:世界|维度|維度|dimension|world)/i);
    return direct?.[1]?.trim() || fallback;
  }

  function parsePrompt(input, context = {}) {
    const text = String(input || '').normalize('NFKC').trim();
    if (!/(?:世界|维度|維度|群系|地形|天空岛|天空島|浮空|虚空|虛空|dimension|biome|world|terrain)/i.test(text)) {
      throw new Error('没有识别到世界、维度或群系需求。');
    }
    const terrain = inferTerrainPreset(text);
    const theme = themeFromPrompt(text, terrain);
    const name = extractWorldName(text, theme.name.replace(/群系|原野|荒原|荒境|海域|群岛|群島/g, '') || '自定义世界');
    const dimensionId = cleanId(context.id || promptId(`${name}:${text}`, 'custom_realm'), 'custom_realm');
    const biomeId = cleanId(context.biomeId || `${dimensionId}_biome`, `${dimensionId}_biome`);
    const fixedTime = /(?:永夜|永遠黑夜|永远黑夜|eternal\s*night)/i.test(text) ? 18000
      : /(?:永昼|永晝|永远白天|eternal\s*day)/i.test(text) ? 6000
        : /(?:黄昏|黃昏|eternal\s*dusk)/i.test(text) ? 12000 : undefined;
    const structures = [];
    if (/(?:村庄|村莊|village)/i.test(text)) structures.push('village');
    if (/(?:矿井|礦井|mineshaft)/i.test(text)) structures.push('mineshaft');
    if (/(?:废弃传送门|廢棄傳送門|ruined\s*portal)/i.test(text)) structures.push('ruined_portal');
    const biome = createBiomeComponent({
      ...theme,
      id: biomeId,
      name: `${name}群系`,
      terrainPreset: terrain,
      precipitation: /(?:无雨|無雨|不下雨|干燥|乾燥|no\s*rain)/i.test(text) ? false : theme.precipitation,
      structures
    });
    const dimension = createDimensionComponent({
      id: dimensionId,
      name: `${name}维度`,
      terrainPreset: terrain,
      biomeId,
      fixedTime,
      travelItemName: `${name}钥匙`,
      createPlatform: /(?:安全平台|出生平台|spawn\s*platform)/i.test(text) || terrain === 'void' || terrain === 'floating_islands'
    });
    return { biome, dimension, terrainPreset: terrain, theme, prompt: text };
  }

  function validateWorldgen(irInput) {
    const ir = Pipeline.migrate(irInput);
    const issues = [];
    const add = (severity, code, message, path = '') => issues.push({ severity, code, message, path });
    const localBiomes = new Set(ir.components.filter(isBiome).map((component) => `${ir.meta.namespace}:${biomeDescriptor(component, ir.meta.namespace).id}`));
    ir.components.forEach((component, index) => {
      const path = `components[${index}]`;
      if (isBiome(component)) {
        const biome = biomeDescriptor(component, ir.meta.namespace);
        if (!FEATURE_PRESETS.includes(biome.featurePreset)) add('error', 'worldgen.biome.features.invalid', `${biome.name} 使用未知地物预设。`, `${path}.config.featurePreset`);
        if (!SPAWN_PRESETS.includes(biome.spawnPreset)) add('error', 'worldgen.biome.spawns.invalid', `${biome.name} 使用未知生成预设。`, `${path}.config.spawnPreset`);
      }
      if (isDimension(component)) {
        const dimension = dimensionDescriptor(component, ir.meta.namespace);
        if (!TERRAIN_PRESETS.includes(dimension.terrainPreset)) add('error', 'worldgen.dimension.terrain.invalid', `${dimension.name} 使用未知地形预设。`, `${path}.config.terrainPreset`);
        if (dimension.minY % 16 !== 0) add('error', 'worldgen.dimension.min_y.multiple', `${dimension.name} 的 minY 必须是 16 的倍数。`, `${path}.config.minY`);
        if (dimension.height % 16 !== 0) add('error', 'worldgen.dimension.height.multiple', `${dimension.name} 的高度必须是 16 的倍数。`, `${path}.config.height`);
        if (dimension.logicalHeight > dimension.height) add('error', 'worldgen.dimension.logical_height', `${dimension.name} 的逻辑高度不能超过总高度。`, `${path}.config.logicalHeight`);
        const expected = ['nether', 'end', 'floating_islands', 'void'].includes(dimension.terrainPreset) ? { minY: 0, height: 256 } : { minY: -64, height: 384 };
        if (!['flat', 'void'].includes(dimension.terrainPreset) && (dimension.minY !== expected.minY || dimension.height !== expected.height)) {
          add('error', 'worldgen.dimension.noise_height', `${dimension.name} 的 ${dimension.terrainPreset} 噪声预设要求 minY=${expected.minY}、height=${expected.height}。`, `${path}.config`);
        }
        if (!localBiomes.has(dimension.biomeId) && !dimension.biomeId.startsWith('minecraft:')) add('warning', 'worldgen.dimension.biome.external', `${dimension.name} 引用了当前项目中不存在的群系 ${dimension.biomeId}。`, `${path}.config.biomeId`);
      }
    });
    return issues;
  }

  Pipeline.validate = function validateWithWorldgen(irInput) {
    const base = originalValidate(irInput).filter((issue) => issue.code !== 'ir.valid');
    const extra = validateWorldgen(irInput);
    const issues = [...base, ...extra];
    if (!issues.some((issue) => issue.severity === 'error')) {
      const ir = Pipeline.migrate(irInput);
      const count = ir.components.filter((component) => isBiome(component) || isDimension(component)).length;
      issues.push({ severity: 'success', code: 'ir.valid', message: `IR ${Pipeline.IR_VERSION} 结构检查通过，共 ${ir.components.length} 个组件，其中 ${count} 个世界生成组件。`, path: '' });
    }
    return issues;
  };

  Pipeline.registerParser('worldgen-rules', (input, context = {}) => {
    const parsed = parsePrompt(input, context);
    const project = GF.project.create({
      name: context.name || parsed.dimension.name,
      namespace: context.namespace || 'gameforge_world',
      components: [parsed.biome, parsed.dimension]
    });
    return Pipeline.fromLegacyProject(project);
  }, {
    label: '世界与维度本地解析器',
    produces: Pipeline.IR_SCHEMA,
    online: false
  });

  GF.worldgen = Object.freeze({
    VERSION,
    BIOME_TYPE,
    DIMENSION_TYPE,
    TERRAIN_PRESETS,
    FEATURE_PRESETS,
    SPAWN_PRESETS,
    STRUCTURE_PRESETS,
    isBiome,
    isDimension,
    configOf,
    cleanId,
    normalizeResourceId,
    normalizeTerrainPreset,
    inferTerrainPreset,
    normalizeFeaturePreset,
    normalizeSpawnPreset,
    normalizeStructures,
    defaultDimensionType,
    biomeDescriptor,
    dimensionDescriptor,
    createBiomeComponent,
    createDimensionComponent,
    parsePrompt,
    validate: validateWorldgen,
    __installed: true
  });
  Gen.parseWorldPromptIR = (input, context = {}) => Pipeline.parse(input, context, 'worldgen-rules');
})();
