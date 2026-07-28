'use strict';

(() => {
  const GF = window.GameForge;
  const Base = GF?.blueprint;
  const Systems = GF?.nativeSystems;
  if (!GF || !Base || !Systems || Base.__nativeSystemsInstalled) return;

  const U = GF.utils;
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const MACHINE_NODES = new Set([
    'event.machine_process', 'condition.machine_input', 'condition.machine_fuel',
    'action.machine_output', 'action.machine_timing', 'action.machine_auto_start'
  ]);
  const ENTITY_NODES = new Set([
    'event.entity_spawn', 'action.entity_attributes', 'action.entity_goal',
    'action.entity_target_players', 'action.entity_appearance'
  ]);
  const systemDefinitions = {
    'event.machine_process': {
      title: '机器处理循环', category: '原生机器', color: '#7f8cff', icon: '⚙',
      inputs: [], outputs: [{ id: 'flow', type: 'flow', label: '配置' }], fields: []
    },
    'condition.machine_input': {
      title: '输入槽配方', category: '原生机器', color: '#d19a66', icon: 'IN',
      inputs: [{ id: 'in', type: 'flow', label: '进入' }], outputs: [{ id: 'flow', type: 'flow', label: '继续' }],
      fields: [
        { id: 'item', type: 'text', label: '输入物品 ID', default: 'minecraft:iron_ingot' },
        { id: 'count', type: 'number', label: '数量', default: 1, min: 1, max: 64, step: 1 }
      ]
    },
    'condition.machine_fuel': {
      title: '燃料槽', category: '原生机器', color: '#d19a66', icon: 'F',
      inputs: [{ id: 'in', type: 'flow', label: '进入' }], outputs: [{ id: 'flow', type: 'flow', label: '继续' }],
      fields: [
        { id: 'item', type: 'text', label: '燃料物品 ID', default: 'minecraft:coal' },
        { id: 'count', type: 'number', label: '数量（0=不需要）', default: 1, min: 0, max: 64, step: 1 }
      ]
    },
    'action.machine_output': {
      title: '输出物品', category: '原生机器', color: '#98c379', icon: 'OUT',
      inputs: [{ id: 'in', type: 'flow', label: '进入' }], outputs: [{ id: 'flow', type: 'flow', label: '继续' }],
      fields: [
        { id: 'item', type: 'text', label: '输出物品 ID', default: 'minecraft:gold_ingot' },
        { id: 'count', type: 'number', label: '数量', default: 1, min: 1, max: 64, step: 1 }
      ]
    },
    'action.machine_timing': {
      title: '处理时间', category: '原生机器', color: '#c678dd', icon: '⌛',
      inputs: [{ id: 'in', type: 'flow', label: '进入' }], outputs: [{ id: 'flow', type: 'flow', label: '继续' }],
      fields: [{ id: 'seconds', type: 'number', label: '秒', default: 5, min: 0.05, max: 3600, step: 0.05 }]
    },
    'action.machine_auto_start': {
      title: '自动启动', category: '原生机器', color: '#53b68c', icon: '▶',
      inputs: [{ id: 'in', type: 'flow', label: '进入' }], outputs: [{ id: 'flow', type: 'flow', label: '继续' }],
      fields: [{ id: 'enabled', type: 'select', label: '新放置时', default: 'false', options: [['false', '等待玩家启动'], ['true', '自动启动']] }]
    },
    'event.entity_spawn': {
      title: '自定义实体出生', category: '原生实体', color: '#7f8cff', icon: 'E',
      inputs: [], outputs: [{ id: 'flow', type: 'flow', label: '配置' }], fields: []
    },
    'action.entity_attributes': {
      title: '实体属性', category: '原生实体', color: '#e06c75', icon: '♥',
      inputs: [{ id: 'in', type: 'flow', label: '进入' }], outputs: [{ id: 'flow', type: 'flow', label: '继续' }],
      fields: [
        { id: 'health', type: 'number', label: '生命', default: 30, min: 1, max: 2048, step: 1 },
        { id: 'damage', type: 'number', label: '攻击', default: 6, min: 0, max: 2048, step: 0.5 },
        { id: 'speed', type: 'number', label: '速度', default: 0.28, min: 0.01, max: 2, step: 0.01 },
        { id: 'armor', type: 'number', label: '护甲', default: 2, min: 0, max: 100, step: 0.5 }
      ]
    },
    'action.entity_goal': {
      title: '添加 Goal AI', category: '原生实体', color: '#56b6c2', icon: 'AI',
      inputs: [{ id: 'in', type: 'flow', label: '进入' }], outputs: [{ id: 'flow', type: 'flow', label: '继续' }],
      fields: [{ id: 'goal', type: 'select', label: 'Goal', default: 'melee_attack', options: Systems.SUPPORTED_GOALS.map((goal) => [goal, goal]) }]
    },
    'action.entity_target_players': {
      title: '玩家目标选择', category: '原生实体', color: '#d19a66', icon: 'P',
      inputs: [{ id: 'in', type: 'flow', label: '进入' }], outputs: [{ id: 'flow', type: 'flow', label: '继续' }],
      fields: [{ id: 'enabled', type: 'select', label: '主动攻击玩家', default: 'true', options: [['true', '是'], ['false', '否']] }]
    },
    'action.entity_appearance': {
      title: '实体外观与碰撞箱', category: '原生实体', color: '#98c379', icon: '▣',
      inputs: [{ id: 'in', type: 'flow', label: '进入' }], outputs: [{ id: 'flow', type: 'flow', label: '继续' }],
      fields: [
        { id: 'texture', type: 'text', label: '纹理资源', default: 'minecraft:textures/entity/zombie/zombie.png' },
        { id: 'width', type: 'number', label: '宽度', default: 0.6, min: 0.1, max: 8, step: 0.05 },
        { id: 'height', type: 'number', label: '高度', default: 1.95, min: 0.1, max: 16, step: 0.05 }
      ]
    }
  };
  const definitions = Object.freeze({ ...Base.nodeDefinitions, ...systemDefinitions });

  function isSystemType(type) { return MACHINE_NODES.has(type) || ENTITY_NODES.has(type); }
  function graphKind(graph) {
    if (graph.nodes.some((node) => MACHINE_NODES.has(node.type))) return 'machine';
    if (graph.nodes.some((node) => ENTITY_NODES.has(node.type))) return 'entity';
    return '';
  }
  function defaults(definition) { return Object.fromEntries((definition?.fields || []).map((field) => [field.id, clone(field.default)])); }
  function normalizeNode(node, index = 0) {
    if (!isSystemType(node?.type)) return Base.normalizeNode(node, index);
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
  function portDefinition(node, direction, portId) { return (definitions[node?.type]?.[direction] || []).find((port) => port.id === portId) || null; }
  function addNode(graphInput, type, position = {}, properties = {}) {
    if (!definitions[type]) throw new Error(`未知 Blueprint 节点：${type}`);
    if (!isSystemType(type)) return Base.addNode(graphInput, type, position, properties);
    const graph = normalizeGraph(graphInput);
    const node = normalizeNode({ type, x: position.x, y: position.y, properties });
    graph.nodes.push(node); graph.updatedAt = new Date().toISOString();
    return { graph, node };
  }
  function outgoing(graph, nodeId, portId = null) { return graph.edges.filter((edge) => edge.from.node === nodeId && (portId == null || edge.from.port === portId)); }
  function incoming(graph, nodeId, portId = null) { return graph.edges.filter((edge) => edge.to.node === nodeId && (portId == null || edge.to.port === portId)); }
  function hasCycle(graph) {
    const states = new Map();
    const visit = (id) => {
      if (states.get(id) === 1) return true;
      if (states.get(id) === 2) return false;
      states.set(id, 1);
      for (const edge of outgoing(graph, id)) if (visit(edge.to.node)) return true;
      states.set(id, 2); return false;
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
    const allowed = kind === 'machine' ? MACHINE_NODES : ENTITY_NODES;
    const eventType = kind === 'machine' ? 'event.machine_process' : 'event.entity_spawn';
    const events = graph.nodes.filter((node) => node.type === eventType);
    if (events.length !== 1) add('error', 'system.event.count', `${kind === 'machine' ? '机器' : '实体'} Blueprint 必须且只能有一个入口节点。`);
    for (const node of graph.nodes) {
      if (!allowed.has(node.type)) add('error', 'system.node.mixed', '机器与实体节点不能和普通行为节点混在同一张系统 Blueprint 中。', node.id);
      for (const input of definitions[node.type]?.inputs || []) if (incoming(graph, node.id, input.id).length > 1) add('error', 'graph.input.multiple', `${definitions[node.type].title} 的输入只能连接一次。`, node.id);
      for (const output of definitions[node.type]?.outputs || []) if (outgoing(graph, node.id, output.id).length > 1) add('error', 'graph.output.multiple', `${definitions[node.type].title} 的输出只能连接一个节点。`, node.id);
    }
    if (hasCycle(graph)) add('error', 'graph.cycle', '系统 Blueprint 包含循环。');
    if (events.length === 1) {
      const reachable = new Set();
      const walk = (id) => { if (reachable.has(id)) return; reachable.add(id); outgoing(graph, id).forEach((edge) => walk(edge.to.node)); };
      walk(events[0].id);
      graph.nodes.filter((node) => !reachable.has(node.id)).forEach((node) => add('warning', 'graph.node.unreachable', `${definitions[node.type].title} 不可达，不会写入 IR。`, node.id));
    }
    if (kind === 'machine') {
      if (!graph.nodes.some((node) => node.type === 'condition.machine_input')) add('error', 'machine.input.missing', '机器 Blueprint 缺少输入槽配方。');
      if (!graph.nodes.some((node) => node.type === 'action.machine_output')) add('error', 'machine.output.missing', '机器 Blueprint 缺少输出物品。');
    } else {
      if (!graph.nodes.some((node) => node.type === 'action.entity_attributes')) add('error', 'entity.attributes.missing', '实体 Blueprint 缺少属性节点。');
      if (!graph.nodes.some((node) => node.type === 'action.entity_goal')) add('warning', 'entity.goals.missing', '实体没有 Goal AI 节点，将仅保留默认站立行为。');
    }
    if (!issues.some((item) => item.severity === 'error')) add('success', 'system.graph.valid', '系统 Blueprint 可编译为 GameForge IR。');
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
      result.push(next); seen.add(next.id); current = next;
    }
    return result;
  }
  function compileGraph(graphInput) {
    const graph = normalizeGraph(graphInput);
    const kind = graphKind(graph);
    if (!kind) return Base.compileGraph(graph);
    const diagnostics = validateGraph(graph);
    if (diagnostics.some((item) => item.severity === 'error')) return { graph, behaviors: [], diagnostics, system: null };
    const event = graph.nodes.find((node) => node.type === (kind === 'machine' ? 'event.machine_process' : 'event.entity_spawn'));
    const nodes = chain(graph, event);
    const config = {};
    if (kind === 'machine') {
      for (const node of nodes) {
        const p = node.properties || {};
        if (node.type === 'condition.machine_input') { config.inputItem = p.item; config.inputCount = Number(p.count || 1); }
        if (node.type === 'condition.machine_fuel') { config.fuelItem = p.item; config.fuelCount = Number(p.count || 0); }
        if (node.type === 'action.machine_output') { config.outputItem = p.item; config.outputCount = Number(p.count || 1); }
        if (node.type === 'action.machine_timing') config.processTicks = Math.max(1, Math.round(Number(p.seconds || 5) * 20));
        if (node.type === 'action.machine_auto_start') config.autoStart = String(p.enabled) === 'true';
      }
    } else {
      const goals = [];
      for (const node of nodes) {
        const p = node.properties || {};
        if (node.type === 'action.entity_attributes') Object.assign(config, { health: Number(p.health || 30), damage: Number(p.damage || 6), speed: Number(p.speed || 0.28), armor: Number(p.armor || 2) });
        if (node.type === 'action.entity_goal' && p.goal && !goals.includes(p.goal)) goals.push(p.goal);
        if (node.type === 'action.entity_target_players') config.targetPlayers = String(p.enabled) === 'true';
        if (node.type === 'action.entity_appearance') Object.assign(config, { texture: p.texture, width: Number(p.width || 0.6), height: Number(p.height || 1.95) });
      }
      config.goals = goals;
    }
    return { graph, behaviors: [], diagnostics, system: { type: kind, config } };
  }
  function graphFromComponent(componentInput) {
    if (Systems.isMachine(componentInput)) {
      const config = componentInput.spec || {};
      let graph = Base.createGraph({ name: `${componentInput.name} 机器 Blueprint`, componentId: componentInput.id });
      const descriptors = [
        ['event.machine_process', {}],
        ['condition.machine_input', { item: config.inputItem, count: config.inputCount }],
        ['condition.machine_fuel', { item: config.fuelItem, count: config.fuelCount }],
        ['action.machine_output', { item: config.outputItem, count: config.outputCount }],
        ['action.machine_timing', { seconds: Number(config.processTicks || 100) / 20 }],
        ['action.machine_auto_start', { enabled: String(Boolean(config.autoStart)) }]
      ];
      let previous;
      descriptors.forEach(([type, properties], index) => {
        const node = normalizeNode({ type, x: 80 + index * 240, y: 120, properties });
        graph.nodes.push(node);
        if (previous) graph.edges.push(Base.normalizeEdge({ from: { node: previous.id, port: 'flow' }, to: { node: node.id, port: 'in' } }));
        previous = node;
      });
      return normalizeGraph(graph);
    }
    if (Systems.isCustomEntity(componentInput)) {
      const config = componentInput.spec || {};
      let graph = Base.createGraph({ name: `${componentInput.name} 实体 Blueprint`, componentId: componentInput.id });
      const descriptors = [
        ['event.entity_spawn', {}],
        ['action.entity_attributes', { health: config.health, damage: config.damage, speed: config.speed, armor: config.armor }],
        ...Systems.entityDescriptor(componentInput).goals.map((goal) => ['action.entity_goal', { goal }]),
        ['action.entity_target_players', { enabled: String(config.targetPlayers !== false) }],
        ['action.entity_appearance', { texture: config.texture, width: config.width, height: config.height }]
      ];
      let previous;
      descriptors.forEach(([type, properties], index) => {
        const node = normalizeNode({ type, x: 80 + index * 240, y: 120, properties });
        graph.nodes.push(node);
        if (previous) graph.edges.push(Base.normalizeEdge({ from: { node: previous.id, port: 'flow' }, to: { node: node.id, port: 'in' } }));
        previous = node;
      });
      return normalizeGraph(graph);
    }
    return Base.graphFromComponent(componentInput);
  }
  function applyGraphToComponent(componentInput, graphInput) {
    const kind = graphKind(normalizeGraph(graphInput));
    if (!kind) return Base.applyGraphToComponent(componentInput, graphInput);
    const compiled = compileGraph(graphInput);
    if (compiled.diagnostics.some((item) => item.severity === 'error')) return { component: componentInput, ...compiled };
    const component = clone(componentInput);
    component.spec = { ...(component.spec || {}), ...(compiled.system?.config || {}), contentType: kind };
    component.blueprint = compiled.graph;
    component.behaviors = [];
    component.spec.blueprint = compiled.graph;
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
    __nativeSystemsInstalled: true
  };
})();
