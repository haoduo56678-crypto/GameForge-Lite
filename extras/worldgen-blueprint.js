'use strict';

(() => {
  const GF = window.GameForge;
  const Base = GF?.blueprint;
  const Worldgen = GF?.worldgen;
  if (!GF || !Base || !Worldgen || Base.__worldgenInstalled) return;

  const U = GF.utils;
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const TERRAIN_OPTIONS = [
    ['overworld', '主世界地形'], ['large_biomes', '大型群系'], ['amplified', '放大化'],
    ['caves', '洞穴世界'], ['nether', '下界地形'], ['end', '末地地形'],
    ['floating_islands', '浮空岛'], ['flat', '平坦世界'], ['void', '虚空世界']
  ];
  const FEATURE_OPTIONS = [
    ['lush', '完整主世界地物'], ['sparse', '稀疏地物'], ['nether', '下界地物'],
    ['end', '末地地物'], ['empty', '无地物']
  ];
  const SPAWN_OPTIONS = [
    ['mixed', '动物与怪物'], ['peaceful', '和平动物'], ['hostile', '敌对怪物'],
    ['nether', '下界生物'], ['end', '末地生物'], ['empty', '不生成生物']
  ];
  const BOOLEAN_OPTIONS = [['false', '否'], ['true', '是']];
  const BIOME_NODES = new Set([
    'event.biome_define', 'action.biome_climate', 'action.biome_colors',
    'action.biome_features', 'action.biome_spawns', 'action.biome_structures'
  ]);
  const DIMENSION_NODES = new Set([
    'event.dimension_define', 'action.dimension_terrain', 'action.dimension_biome',
    'action.dimension_type', 'action.dimension_time', 'action.dimension_travel'
  ]);

  const worldgenDefinitions = {
    'event.biome_define': {
      title: '定义自定义群系', category: '世界生成', color: '#68a8ff', icon: 'B',
      inputs: [], outputs: [{ id: 'flow', type: 'flow', label: '配置' }], fields: []
    },
    'action.biome_climate': {
      title: '群系气候', category: '世界生成', color: '#56b6c2', icon: '☁',
      inputs: [{ id: 'in', type: 'flow', label: '进入' }], outputs: [{ id: 'flow', type: 'flow', label: '继续' }],
      fields: [
        { id: 'temperature', type: 'number', label: '温度', default: 0.8, min: -2, max: 2, step: 0.05 },
        { id: 'downfall', type: 'number', label: '降水量', default: 0.4, min: 0, max: 1, step: 0.05 },
        { id: 'precipitation', type: 'select', label: '允许雨雪', default: 'true', options: BOOLEAN_OPTIONS }
      ]
    },
    'action.biome_colors': {
      title: '天空、水与植被颜色', category: '世界生成', color: '#98c379', icon: '▣',
      inputs: [{ id: 'in', type: 'flow', label: '进入' }], outputs: [{ id: 'flow', type: 'flow', label: '继续' }],
      fields: [
        { id: 'skyColor', type: 'text', label: '天空颜色', default: '#78a7ff' },
        { id: 'fogColor', type: 'text', label: '雾颜色', default: '#c0d8ff' },
        { id: 'waterColor', type: 'text', label: '水颜色', default: '#3f76e4' },
        { id: 'waterFogColor', type: 'text', label: '水下雾颜色', default: '#050533' },
        { id: 'grassColor', type: 'text', label: '草颜色', default: '#79c05a' },
        { id: 'foliageColor', type: 'text', label: '树叶颜色', default: '#59ae30' }
      ]
    },
    'action.biome_features': {
      title: '群系地物', category: '世界生成', color: '#98c379', icon: '♣',
      inputs: [{ id: 'in', type: 'flow', label: '进入' }], outputs: [{ id: 'flow', type: 'flow', label: '继续' }],
      fields: [{ id: 'preset', type: 'select', label: '地物预设', default: 'lush', options: FEATURE_OPTIONS }]
    },
    'action.biome_spawns': {
      title: '群系生物生成', category: '世界生成', color: '#d19a66', icon: 'M',
      inputs: [{ id: 'in', type: 'flow', label: '进入' }], outputs: [{ id: 'flow', type: 'flow', label: '继续' }],
      fields: [{ id: 'preset', type: 'select', label: '生成预设', default: 'mixed', options: SPAWN_OPTIONS }]
    },
    'action.biome_structures': {
      title: '原版结构兼容', category: '世界生成', color: '#d19a66', icon: '⌂',
      inputs: [{ id: 'in', type: 'flow', label: '进入' }], outputs: [{ id: 'flow', type: 'flow', label: '继续' }],
      fields: [{ id: 'structures', type: 'text', label: '结构（逗号分隔）', default: 'village,mineshaft,ruined_portal' }]
    },
    'event.dimension_define': {
      title: '定义可进入维度', category: '维度', color: '#7f8cff', icon: 'D',
      inputs: [], outputs: [{ id: 'flow', type: 'flow', label: '配置' }], fields: []
    },
    'action.dimension_terrain': {
      title: '维度地形预设', category: '维度', color: '#c678dd', icon: '≈',
      inputs: [{ id: 'in', type: 'flow', label: '进入' }], outputs: [{ id: 'flow', type: 'flow', label: '继续' }],
      fields: [{ id: 'preset', type: 'select', label: '地形', default: 'overworld', options: TERRAIN_OPTIONS }]
    },
    'action.dimension_biome': {
      title: '维度固定群系', category: '维度', color: '#56b6c2', icon: 'B',
      inputs: [{ id: 'in', type: 'flow', label: '进入' }], outputs: [{ id: 'flow', type: 'flow', label: '继续' }],
      fields: [{ id: 'biomeId', type: 'text', label: '群系 ID', default: 'minecraft:plains' }]
    },
    'action.dimension_type': {
      title: '维度物理属性', category: '维度', color: '#d19a66', icon: 'Φ',
      inputs: [{ id: 'in', type: 'flow', label: '进入' }], outputs: [{ id: 'flow', type: 'flow', label: '继续' }],
      fields: [
        { id: 'minY', type: 'number', label: '最低 Y', default: -64, min: -2032, max: 2016, step: 16 },
        { id: 'height', type: 'number', label: '总高度', default: 384, min: 16, max: 4064, step: 16 },
        { id: 'logicalHeight', type: 'number', label: '逻辑高度', default: 384, min: 16, max: 4064, step: 16 },
        { id: 'natural', type: 'select', label: '自然维度', default: 'true', options: BOOLEAN_OPTIONS },
        { id: 'skylight', type: 'select', label: '天空光', default: 'true', options: BOOLEAN_OPTIONS },
        { id: 'ceiling', type: 'select', label: '封闭顶部', default: 'false', options: BOOLEAN_OPTIONS },
        { id: 'ultrawarm', type: 'select', label: '超温暖', default: 'false', options: BOOLEAN_OPTIONS },
        { id: 'coordinateScale', type: 'number', label: '坐标比例', default: 1, min: 0.00001, max: 30000000, step: 0.1 }
      ]
    },
    'action.dimension_time': {
      title: '维度时间', category: '维度', color: '#d19a66', icon: '◷',
      inputs: [{ id: 'in', type: 'flow', label: '进入' }], outputs: [{ id: 'flow', type: 'flow', label: '继续' }],
      fields: [{ id: 'fixedTime', type: 'number', label: '固定时间（-1=正常昼夜）', default: -1, min: -1, max: 23999, step: 1 }]
    },
    'action.dimension_travel': {
      title: '维度入口钥匙', category: '维度', color: '#98c379', icon: '⌘',
      inputs: [{ id: 'in', type: 'flow', label: '进入' }], outputs: [{ id: 'flow', type: 'flow', label: '继续' }],
      fields: [
        { id: 'itemId', type: 'text', label: '钥匙物品 ID', default: 'dimension_key' },
        { id: 'itemName', type: 'text', label: '钥匙名称', default: '维度钥匙' },
        { id: 'spawnY', type: 'number', label: '进入高度', default: 80, min: -2032, max: 2031, step: 1 },
        { id: 'platformBlock', type: 'text', label: '安全平台方块', default: 'minecraft:stone' },
        { id: 'createPlatform', type: 'select', label: '创建安全平台', default: 'false', options: BOOLEAN_OPTIONS }
      ]
    }
  };

  const definitions = Object.freeze({ ...Base.nodeDefinitions, ...worldgenDefinitions });

  function isWorldgenType(type) {
    return BIOME_NODES.has(type) || DIMENSION_NODES.has(type);
  }

  function graphKind(graph) {
    if (graph.nodes.some((node) => BIOME_NODES.has(node.type))) return 'biome';
    if (graph.nodes.some((node) => DIMENSION_NODES.has(node.type))) return 'dimension';
    return '';
  }

  function defaults(definition) {
    return Object.fromEntries((definition?.fields || []).map((field) => [field.id, clone(field.default)]));
  }

  function normalizeNode(node, index = 0) {
    if (!isWorldgenType(node?.type)) return Base.normalizeNode(node, index);
    const definition = definitions[node.type];
    return {
      id: String(node.id || U.uid('node')),
      type: node.type,
      x: Number.isFinite(Number(node.x)) ? Number(node.x) : 120 + index * 30,
      y: Number.isFinite(Number(node.y)) ? Number(node.y) : 100 + index * 30,
      properties: { ...defaults(definition), ...(node.properties || {}) },
      title: String(node.title || ''),
      collapsed: Boolean(node.collapsed)
    };
  }

  function normalizeGraph(input) {
    const source = input && typeof input === 'object' ? clone(input) : {};
    const graph = Base.createGraph(source);
    graph.nodes = Array.isArray(source.nodes) ? source.nodes.map(normalizeNode) : [];
    graph.edges = Array.isArray(source.edges) ? source.edges.map(Base.normalizeEdge) : [];
    graph.updatedAt = source.updatedAt || graph.updatedAt;
    return graph;
  }

  function portDefinition(node, direction, portId) {
    return (definitions[node?.type]?.[direction] || []).find((port) => port.id === portId) || null;
  }

  function addNode(graphInput, type, position = {}, properties = {}) {
    if (!definitions[type]) throw new Error(`未知 Blueprint 节点：${type}`);
    if (!isWorldgenType(type)) return Base.addNode(graphInput, type, position, properties);
    const graph = normalizeGraph(graphInput);
    const node = normalizeNode({ type, x: position.x, y: position.y, properties });
    graph.nodes.push(node);
    graph.updatedAt = new Date().toISOString();
    return { graph, node };
  }

  function outgoing(graph, nodeId, portId = null) {
    return graph.edges.filter((edge) => edge.from.node === nodeId && (portId == null || edge.from.port === portId));
  }

  function incoming(graph, nodeId, portId = null) {
    return graph.edges.filter((edge) => edge.to.node === nodeId && (portId == null || edge.to.port === portId));
  }

  function hasCycle(graph) {
    const states = new Map();
    const visit = (id) => {
      if (states.get(id) === 1) return true;
      if (states.get(id) === 2) return false;
      states.set(id, 1);
      for (const edge of outgoing(graph, id)) if (visit(edge.to.node)) return true;
      states.set(id, 2);
      return false;
    };
    return graph.nodes.some((node) => visit(node.id));
  }

  function connect(graphInput, fromNodeId, fromPortId, toNodeId, toPortId) {
    const graph = normalizeGraph(graphInput);
    const from = graph.nodes.find((node) => node.id === fromNodeId);
    const to = graph.nodes.find((node) => node.id === toNodeId);
    if (!from || !to || fromNodeId === toNodeId) throw new Error('连接节点不存在或不能连接到自己。');
    const output = portDefinition(from, 'outputs', fromPortId);
    const input = portDefinition(to, 'inputs', toPortId);
    if (!output || !input || (output.type !== input.type && output.type !== 'any' && input.type !== 'any')) throw new Error('连接端口不存在或类型不兼容。');
    graph.edges = graph.edges.filter((edge) => !(edge.to.node === toNodeId && edge.to.port === toPortId));
    if (graph.edges.some((edge) => edge.from.node === fromNodeId && edge.from.port === fromPortId)) throw new Error('一个执行输出只能连接一个后续节点。');
    graph.edges.push(Base.normalizeEdge({ from: { node: fromNodeId, port: fromPortId }, to: { node: toNodeId, port: toPortId } }));
    if (hasCycle(graph)) throw new Error('Blueprint 不允许无界执行循环。');
    graph.updatedAt = new Date().toISOString();
    return graph;
  }

  function validateGraph(graphInput) {
    const graph = normalizeGraph(graphInput);
    const kind = graphKind(graph);
    if (!kind) return Base.validateGraph(graph);
    const issues = [];
    const add = (severity, code, message, path = '') => issues.push({ severity, code, message, path });
    const allowed = kind === 'biome' ? BIOME_NODES : DIMENSION_NODES;
    const eventType = kind === 'biome' ? 'event.biome_define' : 'event.dimension_define';
    const events = graph.nodes.filter((node) => node.type === eventType);
    if (events.length !== 1) add('error', 'worldgen.event.count', `${kind === 'biome' ? '群系' : '维度'} Blueprint 必须且只能有一个入口。`);
    for (const node of graph.nodes) {
      if (!allowed.has(node.type)) add('error', 'worldgen.node.mixed', '群系、维度和普通行为节点不能混在同一张世界生成 Blueprint。', node.id);
      for (const input of definitions[node.type]?.inputs || []) if (incoming(graph, node.id, input.id).length > 1) add('error', 'graph.input.multiple', `${definitions[node.type].title} 的输入只能连接一次。`, node.id);
      for (const output of definitions[node.type]?.outputs || []) if (outgoing(graph, node.id, output.id).length > 1) add('error', 'graph.output.multiple', `${definitions[node.type].title} 的输出只能连接一个节点。`, node.id);
    }
    if (hasCycle(graph)) add('error', 'graph.cycle', '世界生成 Blueprint 包含无界循环。');
    if (events.length === 1) {
      const reachable = new Set();
      const walk = (id) => {
        if (reachable.has(id)) return;
        reachable.add(id);
        outgoing(graph, id).forEach((edge) => walk(edge.to.node));
      };
      walk(events[0].id);
      graph.nodes.filter((node) => !reachable.has(node.id)).forEach((node) => add('warning', 'graph.node.unreachable', `${definitions[node.type].title} 不可达，不会写入 IR。`, node.id));
    }
    if (kind === 'biome') {
      if (!graph.nodes.some((node) => node.type === 'action.biome_climate')) add('warning', 'biome.climate.missing', '未添加气候节点，将使用默认气候。');
      if (!graph.nodes.some((node) => node.type === 'action.biome_colors')) add('warning', 'biome.colors.missing', '未添加颜色节点，将使用默认颜色。');
    } else {
      if (!graph.nodes.some((node) => node.type === 'action.dimension_terrain')) add('error', 'dimension.terrain.missing', '维度 Blueprint 缺少地形预设。');
      if (!graph.nodes.some((node) => node.type === 'action.dimension_biome')) add('error', 'dimension.biome.missing', '维度 Blueprint 缺少固定群系。');
    }
    if (!issues.some((item) => item.severity === 'error')) add('success', 'worldgen.graph.valid', '世界生成 Blueprint 可编译为 GameForge IR。');
    return issues;
  }

  function chain(graph, eventNode) {
    const result = [];
    let current = eventNode;
    const seen = new Set([eventNode.id]);
    while (true) {
      const edge = outgoing(graph, current.id)[0];
      if (!edge) break;
      const next = graph.nodes.find((node) => node.id === edge.to.node);
      if (!next || seen.has(next.id)) break;
      result.push(next);
      seen.add(next.id);
      current = next;
    }
    return result;
  }

  function compileGraph(graphInput) {
    const graph = normalizeGraph(graphInput);
    const kind = graphKind(graph);
    if (!kind) return Base.compileGraph(graph);
    const diagnostics = validateGraph(graph);
    if (diagnostics.some((item) => item.severity === 'error')) return { graph, behaviors: [], diagnostics, system: null };
    const event = graph.nodes.find((node) => node.type === (kind === 'biome' ? 'event.biome_define' : 'event.dimension_define'));
    const nodes = chain(graph, event);
    const config = {};
    for (const node of nodes) {
      const p = node.properties || {};
      if (node.type === 'action.biome_climate') Object.assign(config, { temperature: Number(p.temperature ?? 0.8), downfall: Number(p.downfall ?? 0.4), precipitation: String(p.precipitation) === 'true' });
      if (node.type === 'action.biome_colors') Object.assign(config, { skyColor: p.skyColor, fogColor: p.fogColor, waterColor: p.waterColor, waterFogColor: p.waterFogColor, grassColor: p.grassColor, foliageColor: p.foliageColor });
      if (node.type === 'action.biome_features') config.featurePreset = p.preset;
      if (node.type === 'action.biome_spawns') config.spawnPreset = p.preset;
      if (node.type === 'action.biome_structures') config.structures = Worldgen.normalizeStructures(p.structures);
      if (node.type === 'action.dimension_terrain') config.terrainPreset = p.preset;
      if (node.type === 'action.dimension_biome') config.biomeId = p.biomeId;
      if (node.type === 'action.dimension_type') Object.assign(config, {
        minY: Number(p.minY ?? -64), height: Number(p.height ?? 384), logicalHeight: Number(p.logicalHeight ?? 384),
        natural: String(p.natural) === 'true', skylight: String(p.skylight) === 'true', ceiling: String(p.ceiling) === 'true',
        ultrawarm: String(p.ultrawarm) === 'true', coordinateScale: Number(p.coordinateScale ?? 1)
      });
      if (node.type === 'action.dimension_time') config.fixedTime = Number(p.fixedTime) < 0 ? null : Number(p.fixedTime);
      if (node.type === 'action.dimension_travel') Object.assign(config, {
        travelItemId: p.itemId, travelItemName: p.itemName, spawnY: Number(p.spawnY ?? 80),
        platformBlock: p.platformBlock, createPlatform: String(p.createPlatform) === 'true'
      });
    }
    return { graph, behaviors: [], diagnostics, system: { type: kind, config } };
  }

  function buildLinearGraph(componentInput, descriptors, label) {
    let graph = Base.createGraph({ name: `${componentInput.name} ${label} Blueprint`, componentId: componentInput.id });
    let previous;
    descriptors.forEach(([type, properties], index) => {
      const node = normalizeNode({ type, x: 80 + index * 240, y: 120, properties });
      graph.nodes.push(node);
      if (previous) graph.edges.push(Base.normalizeEdge({ from: { node: previous.id, port: 'flow' }, to: { node: node.id, port: 'in' } }));
      previous = node;
    });
    return normalizeGraph(graph);
  }

  function graphFromComponent(componentInput) {
    if (Worldgen.isBiome(componentInput)) {
      const config = Worldgen.configOf(componentInput);
      return buildLinearGraph(componentInput, [
        ['event.biome_define', {}],
        ['action.biome_climate', { temperature: config.temperature, downfall: config.downfall, precipitation: String(config.precipitation !== false) }],
        ['action.biome_colors', { skyColor: config.skyColor, fogColor: config.fogColor, waterColor: config.waterColor, waterFogColor: config.waterFogColor, grassColor: config.grassColor, foliageColor: config.foliageColor }],
        ['action.biome_features', { preset: config.featurePreset || 'lush' }],
        ['action.biome_spawns', { preset: config.spawnPreset || 'mixed' }],
        ['action.biome_structures', { structures: (config.structures || []).join(',') }]
      ], '群系');
    }
    if (Worldgen.isDimension(componentInput)) {
      const config = Worldgen.configOf(componentInput);
      const terrain = Worldgen.normalizeTerrainPreset(config.terrainPreset);
      const defaults = Worldgen.defaultDimensionType(terrain);
      return buildLinearGraph(componentInput, [
        ['event.dimension_define', {}],
        ['action.dimension_terrain', { preset: terrain }],
        ['action.dimension_biome', { biomeId: config.biomeId || 'minecraft:plains' }],
        ['action.dimension_type', {
          minY: config.minY ?? defaults.minY, height: config.height ?? defaults.height,
          logicalHeight: config.logicalHeight ?? defaults.logicalHeight, natural: String(config.natural ?? defaults.natural),
          skylight: String(config.skylight ?? defaults.skylight), ceiling: String(config.ceiling ?? defaults.ceiling),
          ultrawarm: String(config.ultrawarm ?? defaults.ultrawarm), coordinateScale: config.coordinateScale ?? defaults.coordinateScale
        }],
        ['action.dimension_time', { fixedTime: config.fixedTime === null || config.fixedTime === undefined ? -1 : config.fixedTime }],
        ['action.dimension_travel', {
          itemId: config.travelItemId || `${config.id || 'dimension'}_key`, itemName: config.travelItemName || `${componentInput.name}钥匙`,
          spawnY: config.spawnY ?? 80, platformBlock: config.platformBlock || 'minecraft:stone', createPlatform: String(Boolean(config.createPlatform))
        }]
      ], '维度');
    }
    return Base.graphFromComponent(componentInput);
  }

  function applyGraphToComponent(componentInput, graphInput) {
    const kind = graphKind(normalizeGraph(graphInput));
    if (!kind) return Base.applyGraphToComponent(componentInput, graphInput);
    const compiled = compileGraph(graphInput);
    if (compiled.diagnostics.some((item) => item.severity === 'error')) return { component: componentInput, ...compiled };
    const component = clone(componentInput);
    const contentType = kind === 'biome' ? Worldgen.BIOME_TYPE : Worldgen.DIMENSION_TYPE;
    component.spec = { ...(component.spec || {}), ...(compiled.system?.config || {}), contentType };
    component.config = { ...(component.config || component.spec || {}), ...(compiled.system?.config || {}), contentType };
    component.blueprint = compiled.graph;
    component.behaviors = [];
    component.spec.blueprint = compiled.graph;
    component.config.blueprint = compiled.graph;
    return { component, ...compiled };
  }

  GF.blueprint = {
    ...Base,
    nodeDefinitions: definitions,
    normalizeNode,
    normalizeGraph,
    addNode,
    connect,
    portDefinition,
    outgoing,
    incoming,
    validateGraph,
    compileGraph,
    graphFromComponent,
    applyGraphToComponent,
    __worldgenInstalled: true
  };
})();
