'use strict';

(() => {
  const GF = window.GameForge;
  const Pipeline = GF?.pipeline;
  const BaseNative = GF?.nativeForge;
  if (!GF || !Pipeline || !BaseNative || GF.nativeSystems?.__installed) return;

  const U = GF.utils;
  const Gen = GF.generators;
  const originalGenerate = BaseNative.generateFromIR.bind(BaseNative);
  const originalValidate = Pipeline.validate.bind(Pipeline);
  const VERSION = 1;
  const MACHINE_TYPE = 'machine';
  const ENTITY_TYPE = 'entity';
  const SUPPORTED_GOALS = new Set([
    'float', 'melee_attack', 'random_stroll', 'look_at_player', 'random_look',
    'hurt_by_target', 'nearest_player', 'leap_at_target', 'move_towards_target'
  ]);
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const file = (name, data, extra = {}) => ({ ...extra, name: String(name).replace(/^\/+/, ''), data });
  const jsonFile = (name, value, extra = {}) => file(name, `${JSON.stringify(value, null, 2)}\n`, extra);

  function cleanId(value, fallback = 'content') {
    return U.cleanId(String(value || fallback), fallback).replace(/[.-]/g, '_');
  }

  function javaString(value) {
    return String(value ?? '').replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\r?\n/g, '\\n');
  }

  function javaFloat(value, fallback = 0) {
    const parsed = Number.isFinite(Number(value)) ? Number(value) : fallback;
    return `${Number(parsed.toFixed(4))}F`;
  }

  function javaDouble(value, fallback = 0) {
    const parsed = Number.isFinite(Number(value)) ? Number(value) : fallback;
    return `${Number(parsed.toFixed(6))}D`;
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

  function normalizeResourceId(value, modId, fallback = 'minecraft:air') {
    const raw = String(value || '').trim();
    if (!raw) return fallback;
    if (/^[a-z0-9_.-]+:[a-z0-9_./-]+$/.test(raw)) return raw;
    return `${modId}:${cleanId(raw, 'content')}`;
  }

  function hexColor(value, fallback) {
    const raw = String(value || '').trim();
    const match = raw.match(/^#?([0-9a-f]{6})$/i);
    return Number.parseInt(match ? match[1] : fallback.replace('#', ''), 16);
  }

  function isMachine(component) {
    return component?.kind === 'forge' && String(component.config?.contentType || '').toLowerCase() === MACHINE_TYPE;
  }

  function isCustomEntity(component) {
    const contentType = String(component?.config?.contentType || '').toLowerCase();
    return component?.kind === 'forge' && (contentType === ENTITY_TYPE || contentType === 'custom_entity');
  }

  function machineDescriptor(component, modId) {
    const config = component.config || {};
    const id = cleanId(component.registryId || config.id || component.name, 'machine');
    const inputItem = normalizeResourceId(config.inputItem || 'minecraft:iron_ingot', modId, 'minecraft:iron_ingot');
    const fuelItem = normalizeResourceId(config.fuelItem || 'minecraft:coal', modId, 'minecraft:coal');
    const outputItem = normalizeResourceId(config.outputItem || 'minecraft:gold_ingot', modId, 'minecraft:gold_ingot');
    return {
      componentId: component.id,
      id,
      name: String(config.name || component.name || id),
      color: String(config.color || '#6a8dff'),
      hardness: number(config.hardness, 3, 0, 100),
      resistance: number(config.resistance, 8, 0, 3600000),
      inputItem,
      inputCount: integer(config.inputCount, 1, 1, 64),
      fuelItem,
      fuelCount: integer(config.fuelCount, 1, 0, 64),
      outputItem,
      outputCount: integer(config.outputCount, 1, 1, 64),
      processTicks: integer(config.processTicks ?? number(config.processSeconds, 5) * 20, 100, 1, 72000),
      autoStart: bool(config.autoStart, false),
      recipeGrid: Array.isArray(config.recipeGrid) ? config.recipeGrid.slice(0, 9) : [],
      description: String(config.description || `将 ${inputItem} 处理为 ${outputItem}`)
    };
  }

  function normalizeGoals(value) {
    const source = Array.isArray(value) ? value : String(value || '').split(/[，,;；\s]+/);
    const goals = source.map((item) => String(item).trim().toLowerCase()).filter((item) => SUPPORTED_GOALS.has(item));
    return Array.from(new Set(goals.length ? goals : ['float', 'melee_attack', 'random_stroll', 'look_at_player', 'random_look', 'hurt_by_target', 'nearest_player']));
  }

  function entityDescriptor(component) {
    const config = component.config || {};
    const id = cleanId(component.registryId || config.id || component.name, 'custom_mob');
    const boss = bool(config.boss, false);
    return {
      componentId: component.id,
      id,
      name: String(config.name || component.name || id),
      health: number(config.health, boss ? 160 : 30, 1, 2048),
      attackDamage: number(config.damage ?? config.attackDamage, boss ? 12 : 6, 0, 2048),
      movementSpeed: number(config.speed ?? config.movementSpeed, 0.28, 0.01, 2),
      armor: number(config.armor, boss ? 8 : 2, 0, 100),
      followRange: number(config.followRange, boss ? 48 : 32, 1, 256),
      knockbackResistance: number(config.knockbackResistance, boss ? 0.5 : 0, 0, 1),
      width: number(config.width, 0.6, 0.1, 8),
      height: number(config.height, 1.95, 0.1, 16),
      experience: integer(config.experience, boss ? 100 : 10, 0, 100000),
      fireImmune: bool(config.fireImmune, false),
      goals: normalizeGoals(config.goals),
      targetPlayers: bool(config.targetPlayers, true),
      texture: String(config.texture || 'minecraft:textures/entity/zombie/zombie.png'),
      eggPrimary: hexColor(config.eggPrimary || '#3b6338', '#3b6338'),
      eggSecondary: hexColor(config.eggSecondary || '#799c65', '#799c65'),
      boss
    };
  }

  function createMachineComponent(options = {}) {
    const name = String(options.name || '自定义机器');
    const id = cleanId(options.id || name, 'custom_machine');
    return Gen.makeComponent('forge', name, {
      id,
      name,
      contentType: MACHINE_TYPE,
      description: String(options.description || ''),
      color: String(options.color || '#6a8dff'),
      hardness: number(options.hardness, 3, 0, 100),
      resistance: number(options.resistance, 8, 0, 3600000),
      inputItem: String(options.inputItem || 'minecraft:iron_ingot'),
      inputCount: integer(options.inputCount, 1, 1, 64),
      fuelItem: String(options.fuelItem || 'minecraft:coal'),
      fuelCount: integer(options.fuelCount, 1, 0, 64),
      outputItem: String(options.outputItem || 'minecraft:gold_ingot'),
      outputCount: integer(options.outputCount, 1, 1, 64),
      processTicks: integer(options.processTicks ?? number(options.processSeconds, 5) * 20, 100, 1, 72000),
      autoStart: bool(options.autoStart, false),
      recipeGrid: Array.isArray(options.recipeGrid) ? clone(options.recipeGrid) : []
    });
  }

  function createEntityComponent(options = {}) {
    const name = String(options.name || '自定义生物');
    const id = cleanId(options.id || name, 'custom_mob');
    return Gen.makeComponent('forge', name, {
      id,
      name,
      contentType: ENTITY_TYPE,
      nativeEntity: true,
      health: number(options.health, 30, 1, 2048),
      damage: number(options.damage ?? options.attackDamage, 6, 0, 2048),
      speed: number(options.speed ?? options.movementSpeed, 0.28, 0.01, 2),
      armor: number(options.armor, 2, 0, 100),
      followRange: number(options.followRange, 32, 1, 256),
      knockbackResistance: number(options.knockbackResistance, 0, 0, 1),
      width: number(options.width, 0.6, 0.1, 8),
      height: number(options.height, 1.95, 0.1, 16),
      experience: integer(options.experience, 10, 0, 100000),
      fireImmune: bool(options.fireImmune, false),
      goals: normalizeGoals(options.goals),
      targetPlayers: bool(options.targetPlayers, true),
      texture: String(options.texture || 'minecraft:textures/entity/zombie/zombie.png'),
      eggPrimary: String(options.eggPrimary || '#3b6338'),
      eggSecondary: String(options.eggSecondary || '#799c65'),
      boss: bool(options.boss, false)
    });
  }

  function parseNumber(text, patterns, fallback) {
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const value = Number(match[1]);
        if (Number.isFinite(value)) return value;
      }
    }
    return fallback;
  }

  function extractName(text, fallback) {
    const match = text.match(/(?:叫|名为|名為|named|called)\s*([^，,。.;；]{1,24})/i);
    if (match) return match[1].replace(/(?:的)?(?:机器|機器|生物|怪物|实体|實體)$/i, '').trim() || fallback;
    const direct = text.match(/(?:做|创建|創建|生成|造)\s*(?:一个|一個|一台|一只|一隻)?\s*([^，,。.;；]{1,20}?)(?:机器|機器|生物|怪物|实体|實體)/i);
    return direct?.[1]?.trim() || fallback;
  }

  function parsePrompt(input) {
    const text = String(input || '').normalize('NFKC');
    const machine = /(?:机器|機器|处理机|處理機|熔炼机|熔煉機|加工机|加工機|machine|processor)/i.test(text);
    const entity = /(?:自定义生物|自定義生物|自定义怪物|自定義怪物|新生物|新怪物|实体|實體|custom\s+(?:mob|entity)|monster)/i.test(text);
    if (machine && !entity) {
      const name = extractName(text, '自定义机器');
      const items = Array.from(text.matchAll(/(?:minecraft:)?[a-z0-9_]+:[a-z0-9_./-]+/gi)).map((match) => match[0]);
      return createMachineComponent({
        name,
        inputItem: items[0] || 'minecraft:iron_ingot',
        fuelItem: items[1] || 'minecraft:coal',
        outputItem: items[2] || 'minecraft:gold_ingot',
        processSeconds: parseNumber(text, [/(\d+(?:\.\d+)?)\s*(?:秒|seconds?|s)\s*(?:完成|处理|處理|加工)/i, /(?:耗时|耗時|时间|時間|time)\s*(\d+(?:\.\d+)?)/i], 5),
        autoStart: /(?:自动启动|自動啟動|自动运行|自動運行|auto\s*start)/i.test(text)
      });
    }
    if (entity) {
      const name = extractName(text, '自定义生物');
      const goals = ['float', 'random_stroll', 'look_at_player', 'random_look'];
      if (/(?:近战|近戰|攻击玩家|攻擊玩家|melee)/i.test(text)) goals.push('melee_attack', 'nearest_player');
      if (/(?:反击|反擊|还手|還手|retaliate)/i.test(text)) goals.push('hurt_by_target');
      if (/(?:跳跃攻击|跳躍攻擊|leap)/i.test(text)) goals.push('leap_at_target');
      return createEntityComponent({
        name,
        health: parseNumber(text, [/(?:生命|血量|health|hp)\s*[:：=]?\s*(\d+(?:\.\d+)?)/i], 30),
        damage: parseNumber(text, [/(?:攻击|攻擊|伤害|傷害|damage)\s*[:：=]?\s*(\d+(?:\.\d+)?)/i], 6),
        speed: parseNumber(text, [/(?:速度|speed)\s*[:：=]?\s*(\d+(?:\.\d+)?)/i], 0.28),
        armor: parseNumber(text, [/(?:护甲|護甲|armor)\s*[:：=]?\s*(\d+(?:\.\d+)?)/i], 2),
        goals,
        targetPlayers: /(?:攻击玩家|攻擊玩家|敌对玩家|敵對玩家|hostile\s*to\s*players?)/i.test(text),
        boss: /(?:Boss|首领|首領|头目|頭目)/i.test(text)
      });
    }
    throw new Error('没有识别到机器或自定义生物。请明确写“机器”“自定义生物”或“自定义怪物”。');
  }

  function validateSystems(irInput) {
    const ir = Pipeline.migrate(irInput);
    const issues = [];
    const add = (severity, code, message, path = '') => issues.push({ severity, code, message, path });
    ir.components.forEach((component, index) => {
      const path = `components[${index}]`;
      if (isMachine(component)) {
        const machine = machineDescriptor(component, ir.meta.namespace);
        if (!machine.inputItem || !machine.outputItem) add('error', 'machine.item.missing', `${machine.name} 必须设置输入与输出物品。`, `${path}.config`);
        if (machine.processTicks < 1) add('error', 'machine.time.invalid', `${machine.name} 的处理时间必须大于 0 Tick。`, `${path}.config.processTicks`);
        if (machine.inputItem === machine.outputItem) add('warning', 'machine.recipe.identity', `${machine.name} 的输入与输出相同，可能没有实际处理意义。`, `${path}.config.outputItem`);
      }
      if (isCustomEntity(component)) {
        const entity = entityDescriptor(component);
        if (!entity.goals.length) add('warning', 'entity.goals.empty', `${entity.name} 没有 AI Goal，将几乎不会自主行动。`, `${path}.config.goals`);
        const unknown = (component.config?.goals || []).filter((goal) => !SUPPORTED_GOALS.has(String(goal).toLowerCase()));
        if (unknown.length) add('warning', 'entity.goals.unsupported', `${entity.name} 包含暂不支持的 Goal：${unknown.join('、')}`, `${path}.config.goals`);
        if (entity.targetPlayers && !entity.goals.includes('nearest_player')) add('warning', 'entity.target.missing_goal', `${entity.name} 被设置为敌对玩家，但没有 nearest_player Goal。`, `${path}.config.goals`);
      }
    });
    return issues;
  }

  Pipeline.validate = function validateWithNativeSystems(irInput) {
    const base = originalValidate(irInput).filter((issue) => issue.code !== 'ir.valid');
    const extra = validateSystems(irInput);
    const issues = [...base, ...extra];
    if (!issues.some((issue) => issue.severity === 'error')) {
      const ir = Pipeline.migrate(irInput);
      const systems = ir.components.filter((component) => isMachine(component) || isCustomEntity(component)).length;
      issues.push({ severity: 'success', code: 'ir.valid', message: `IR ${Pipeline.IR_VERSION} 结构检查通过，共 ${ir.components.length} 个组件，其中 ${systems} 个原生系统组件。`, path: '' });
    }
    return issues;
  };

  function recipeJson(machine, modId) {
    const grid = Array.isArray(machine.recipeGrid) ? machine.recipeGrid.slice(0, 9) : [];
    while (grid.length < 9) grid.push('');
    if (!grid.some(Boolean)) return null;
    const ingredients = Array.from(new Set(grid.filter(Boolean)));
    const letters = 'ABCDEFGHI';
    const keys = Object.fromEntries(ingredients.map((item, index) => [item, letters[index]]));
    return {
      type: 'minecraft:crafting_shaped',
      pattern: [0, 1, 2].map((row) => grid.slice(row * 3, row * 3 + 3).map((item) => item ? keys[item] : ' ').join('')),
      key: Object.fromEntries(Object.entries(keys).map(([item, key]) => [key, item.startsWith('#') ? { tag: item.slice(1) } : { item: normalizeResourceId(item, modId) }])),
      result: { item: `${modId}:${machine.id}`, count: 1 }
    };
  }

  function patchMain(files, config) {
    const className = `${U.toClassName(config.modId)}Mod`;
    const path = `src/main/java/${config.packageName.replace(/\./g, '/')}/${className}.java`;
    const entry = files.find((item) => item.name === path);
    if (!entry || entry.encoding === 'base64') throw new Error(`无法找到原生 Mod 主类：${path}`);
    if (!entry.data.includes('NativeSystemsBootstrap')) {
      entry.data = entry.data
        .replace(`import ${config.packageName}.registry.ModItems;`, `import ${config.packageName}.registry.ModItems;\nimport ${config.packageName}.systems.NativeSystemsBootstrap;`)
        .replace('        ModItems.register(modBus);', '        ModItems.register(modBus);\n        NativeSystemsBootstrap.register(modBus);');
    }
  }

  function bootstrapJava(packageName, modId, machines, entities) {
    const className = U.toClassName(modId);
    const attributes = entities.map((entity) => `        event.put(SystemEntities.${entity.id.toUpperCase()}.get(), GameForgeCustomMob.createAttributes(EntityDefinitions.get("${javaString(entity.id)}")).build());`).join('\n');
    const machineTabs = machines.map((machine) => `            event.accept(SystemItems.${machine.id.toUpperCase()});`).join('\n');
    const eggTabs = entities.map((entity) => `            event.accept(SystemItems.${entity.id.toUpperCase()}_SPAWN_EGG);`).join('\n');
    return `package ${packageName}.systems;

${machines.length ? `import ${packageName}.systems.network.MachineNetwork;\n` : ''}${entities.length ? `import ${packageName}.systems.entity.EntityDefinitions;\nimport ${packageName}.systems.entity.GameForgeCustomMob;\n` : ''}import ${packageName}.systems.registry.SystemBlockEntities;
import ${packageName}.systems.registry.SystemBlocks;
import ${packageName}.systems.registry.SystemEntities;
import ${packageName}.systems.registry.SystemItems;
import ${packageName}.systems.registry.SystemMenus;
import net.minecraft.world.item.CreativeModeTabs;
import net.minecraftforge.event.BuildCreativeModeTabContentsEvent;
import net.minecraftforge.event.entity.EntityAttributeCreationEvent;
import net.minecraftforge.eventbus.api.IEventBus;

public final class NativeSystemsBootstrap {
    private static boolean registered;

    private NativeSystemsBootstrap() {}

    public static void register(IEventBus modBus) {
        if (registered) return;
        registered = true;
        SystemBlocks.register(modBus);
        SystemItems.register(modBus);
        SystemBlockEntities.register(modBus);
        SystemMenus.register(modBus);
        SystemEntities.register(modBus);
        ${machines.length ? 'MachineNetwork.register();' : ''}
        modBus.addListener(NativeSystemsBootstrap::registerAttributes);
        modBus.addListener(NativeSystemsBootstrap::addCreativeTabContents);
    }

    private static void registerAttributes(EntityAttributeCreationEvent event) {
${attributes || '        // No custom entities in this project.'}
    }

    private static void addCreativeTabContents(BuildCreativeModeTabContentsEvent event) {
        if (event.getTabKey().equals(CreativeModeTabs.REDSTONE_BLOCKS)) {
${machineTabs || '            // No machines.'}
        }
        if (event.getTabKey().equals(CreativeModeTabs.SPAWN_EGGS)) {
${eggTabs || '            // No custom entities.'}
        }
    }
}
`;
  }

  function systemBlocksJava(packageName, modId, machines) {
    const className = U.toClassName(modId);
    const declarations = machines.map((machine) => `    public static final RegistryObject<Block> ${machine.id.toUpperCase()} = BLOCKS.register("${machine.id}", () -> new GameForgeMachineBlock("${javaString(machine.id)}", BlockBehaviour.Properties.of().mapColor(MapColor.METAL).strength(${javaFloat(machine.hardness, 3)}, ${javaFloat(machine.resistance, 8)}).requiresCorrectToolForDrops()));`).join('\n');
    return `package ${packageName}.systems.registry;

import ${packageName}.${className}Mod;
${machines.length ? `import ${packageName}.systems.machine.GameForgeMachineBlock;\n` : ''}import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.state.BlockBehaviour;
import net.minecraft.world.level.material.MapColor;
import net.minecraftforge.eventbus.api.IEventBus;
import net.minecraftforge.registries.DeferredRegister;
import net.minecraftforge.registries.ForgeRegistries;
import net.minecraftforge.registries.RegistryObject;

public final class SystemBlocks {
    public static final DeferredRegister<Block> BLOCKS = DeferredRegister.create(ForgeRegistries.BLOCKS, ${className}Mod.MOD_ID);
${declarations || '    // No generated machine blocks.'}

    private SystemBlocks() {}
    public static void register(IEventBus bus) { BLOCKS.register(bus); }
}
`;
  }

  function systemEntitiesJava(packageName, modId, entities) {
    const className = U.toClassName(modId);
    const declarations = entities.map((entity) => {
      const fire = entity.fireImmune ? '.fireImmune()' : '';
      return `    public static final RegistryObject<EntityType<GameForgeCustomMob>> ${entity.id.toUpperCase()} = ENTITIES.register("${entity.id}", () -> EntityType.Builder.of(GameForgeCustomMob::new, MobCategory.MONSTER).sized(${javaFloat(entity.width, 0.6)}, ${javaFloat(entity.height, 1.95)})${fire}.clientTrackingRange(8).updateInterval(3).build(new ResourceLocation(${className}Mod.MOD_ID, "${entity.id}").toString()));`;
    }).join('\n');
    return `package ${packageName}.systems.registry;

import ${packageName}.${className}Mod;
${entities.length ? `import ${packageName}.systems.entity.GameForgeCustomMob;\n` : ''}import net.minecraft.resources.ResourceLocation;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.MobCategory;
import net.minecraftforge.eventbus.api.IEventBus;
import net.minecraftforge.registries.DeferredRegister;
import net.minecraftforge.registries.ForgeRegistries;
import net.minecraftforge.registries.RegistryObject;

public final class SystemEntities {
    public static final DeferredRegister<EntityType<?>> ENTITIES = DeferredRegister.create(ForgeRegistries.ENTITY_TYPES, ${className}Mod.MOD_ID);
${declarations || '    // No custom entities.'}

    private SystemEntities() {}
    public static void register(IEventBus bus) { ENTITIES.register(bus); }
}
`;
  }

  function systemItemsJava(packageName, modId, machines, entities) {
    const className = U.toClassName(modId);
    const machineItems = machines.map((machine) => `    public static final RegistryObject<Item> ${machine.id.toUpperCase()} = ITEMS.register("${machine.id}", () -> new BlockItem(SystemBlocks.${machine.id.toUpperCase()}.get(), new Item.Properties()));`).join('\n');
    const eggs = entities.map((entity) => `    public static final RegistryObject<Item> ${entity.id.toUpperCase()}_SPAWN_EGG = ITEMS.register("${entity.id}_spawn_egg", () -> new ForgeSpawnEggItem(SystemEntities.${entity.id.toUpperCase()}, 0x${entity.eggPrimary.toString(16).padStart(6, '0')}, 0x${entity.eggSecondary.toString(16).padStart(6, '0')}, new Item.Properties()));`).join('\n');
    return `package ${packageName}.systems.registry;

import ${packageName}.${className}Mod;
import net.minecraft.world.item.BlockItem;
import net.minecraft.world.item.Item;
import net.minecraftforge.common.ForgeSpawnEggItem;
import net.minecraftforge.eventbus.api.IEventBus;
import net.minecraftforge.registries.DeferredRegister;
import net.minecraftforge.registries.ForgeRegistries;
import net.minecraftforge.registries.RegistryObject;

public final class SystemItems {
    public static final DeferredRegister<Item> ITEMS = DeferredRegister.create(ForgeRegistries.ITEMS, ${className}Mod.MOD_ID);
${machineItems}${machineItems && eggs ? '\n' : ''}${eggs || (!machineItems ? '    // No generated system items.' : '')}

    private SystemItems() {}
    public static void register(IEventBus bus) { ITEMS.register(bus); }
}
`;
  }

  function systemBlockEntitiesJava(packageName, modId, machines) {
    const className = U.toClassName(modId);
    const blocks = machines.map((machine) => `SystemBlocks.${machine.id.toUpperCase()}.get()`).join(', ');
    return `package ${packageName}.systems.registry;

import ${packageName}.${className}Mod;
${machines.length ? `import ${packageName}.systems.machine.GameForgeMachineBlockEntity;\n` : ''}import net.minecraft.world.level.block.entity.BlockEntityType;
import net.minecraftforge.eventbus.api.IEventBus;
import net.minecraftforge.registries.DeferredRegister;
import net.minecraftforge.registries.ForgeRegistries;
import net.minecraftforge.registries.RegistryObject;

public final class SystemBlockEntities {
    public static final DeferredRegister<BlockEntityType<?>> BLOCK_ENTITIES = DeferredRegister.create(ForgeRegistries.BLOCK_ENTITY_TYPES, ${className}Mod.MOD_ID);
${machines.length ? `    public static final RegistryObject<BlockEntityType<GameForgeMachineBlockEntity>> MACHINE = BLOCK_ENTITIES.register("gameforge_machine", () -> BlockEntityType.Builder.of(GameForgeMachineBlockEntity::new, ${blocks}).build(null));` : '    // No generated BlockEntity types.'}

    private SystemBlockEntities() {}
    public static void register(IEventBus bus) { BLOCK_ENTITIES.register(bus); }
}
`;
  }

  function systemMenusJava(packageName, modId, machines) {
    const className = U.toClassName(modId);
    return `package ${packageName}.systems.registry;

import ${packageName}.${className}Mod;
${machines.length ? `import ${packageName}.systems.machine.GameForgeMachineMenu;\nimport net.minecraftforge.common.extensions.IForgeMenuType;\n` : ''}import net.minecraft.world.inventory.MenuType;
import net.minecraftforge.eventbus.api.IEventBus;
import net.minecraftforge.registries.DeferredRegister;
import net.minecraftforge.registries.ForgeRegistries;
import net.minecraftforge.registries.RegistryObject;

public final class SystemMenus {
    public static final DeferredRegister<MenuType<?>> MENUS = DeferredRegister.create(ForgeRegistries.MENU_TYPES, ${className}Mod.MOD_ID);
${machines.length ? '    public static final RegistryObject<MenuType<GameForgeMachineMenu>> MACHINE = MENUS.register("gameforge_machine", () -> IForgeMenuType.create(GameForgeMachineMenu::new));' : '    // No generated MenuType.'}

    private SystemMenus() {}
    public static void register(IEventBus bus) { MENUS.register(bus); }
}
`;
  }

  function machineDefinitionJava(packageName) {
    return `package ${packageName}.systems.machine;

import net.minecraft.resources.ResourceLocation;

public record MachineDefinition(
    String id,
    String name,
    String inputItem,
    int inputCount,
    String fuelItem,
    int fuelCount,
    String outputItem,
    int outputCount,
    int processTicks,
    boolean autoStart
) {
    public ResourceLocation inputId() { return new ResourceLocation(inputItem); }
    public ResourceLocation fuelId() { return new ResourceLocation(fuelItem); }
    public ResourceLocation outputId() { return new ResourceLocation(outputItem); }
    public boolean needsFuel() { return fuelCount > 0 && !fuelItem.equals("minecraft:air"); }
}
`;
  }

  function machineDefinitionsJava(packageName, machines) {
    const entries = machines.map((machine) => `        Map.entry("${machine.id}", new MachineDefinition("${machine.id}", "${javaString(machine.name)}", "${machine.inputItem}", ${machine.inputCount}, "${machine.fuelItem}", ${machine.fuelCount}, "${machine.outputItem}", ${machine.outputCount}, ${machine.processTicks}, ${machine.autoStart}))`).join(',\n');
    return `package ${packageName}.systems.machine;

import java.util.Map;

public final class MachineDefinitions {
    private static final Map<String, MachineDefinition> BY_ID = Map.ofEntries(
${entries}
    );

    private MachineDefinitions() {}
    public static MachineDefinition get(String id) {
        MachineDefinition definition = BY_ID.get(id);
        if (definition == null) throw new IllegalArgumentException("Unknown GameForge machine: " + id);
        return definition;
    }
    public static Map<String, MachineDefinition> all() { return BY_ID; }
}
`;
  }

  function machineBlockJava(packageName) {
    return `package ${packageName}.systems.machine;

import ${packageName}.systems.registry.SystemBlockEntities;
import net.minecraft.core.BlockPos;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.InteractionResult;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.level.Level;
import net.minecraft.world.level.block.BaseEntityBlock;
import net.minecraft.world.level.block.RenderShape;
import net.minecraft.world.level.block.entity.BlockEntity;
import net.minecraft.world.level.block.entity.BlockEntityTicker;
import net.minecraft.world.level.block.entity.BlockEntityType;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.level.block.state.StateDefinition;
import net.minecraft.world.level.block.state.properties.BlockStateProperties;
import net.minecraft.world.level.block.state.properties.BooleanProperty;
import net.minecraft.world.phys.BlockHitResult;
import net.minecraftforge.network.NetworkHooks;
import org.jetbrains.annotations.Nullable;

public final class GameForgeMachineBlock extends BaseEntityBlock {
    public static final BooleanProperty LIT = BlockStateProperties.LIT;
    private final String definitionId;

    public GameForgeMachineBlock(String definitionId, Properties properties) {
        super(properties);
        this.definitionId = definitionId;
        registerDefaultState(stateDefinition.any().setValue(LIT, false));
    }

    public String definitionId() { return definitionId; }

    @Override public RenderShape getRenderShape(BlockState state) { return RenderShape.MODEL; }
    @Override public BlockEntity newBlockEntity(BlockPos pos, BlockState state) { return new GameForgeMachineBlockEntity(pos, state); }

    @Nullable
    @Override public <T extends BlockEntity> BlockEntityTicker<T> getTicker(Level level, BlockState state, BlockEntityType<T> type) {
        if (level.isClientSide) return null;
        return createTickerHelper(type, SystemBlockEntities.MACHINE.get(), GameForgeMachineBlockEntity::serverTick);
    }

    @Override public InteractionResult use(BlockState state, Level level, BlockPos pos, Player player, InteractionHand hand, BlockHitResult hit) {
        if (!level.isClientSide && player instanceof ServerPlayer serverPlayer) {
            BlockEntity blockEntity = level.getBlockEntity(pos);
            if (blockEntity instanceof GameForgeMachineBlockEntity machine) NetworkHooks.openScreen(serverPlayer, machine, pos);
        }
        return InteractionResult.sidedSuccess(level.isClientSide);
    }

    @Override public void onRemove(BlockState state, Level level, BlockPos pos, BlockState nextState, boolean moving) {
        if (state.getBlock() != nextState.getBlock()) {
            BlockEntity blockEntity = level.getBlockEntity(pos);
            if (blockEntity instanceof GameForgeMachineBlockEntity machine) machine.dropContents();
        }
        super.onRemove(state, level, pos, nextState, moving);
    }

    @Override protected void createBlockStateDefinition(StateDefinition.Builder<net.minecraft.world.level.block.Block, BlockState> builder) { builder.add(LIT); }
}
`;
  }

  function machineBlockEntityJava(packageName) {
    return `package ${packageName}.systems.machine;

import ${packageName}.systems.network.MachineNetwork;
import ${packageName}.systems.registry.SystemBlockEntities;
import net.minecraft.core.BlockPos;
import net.minecraft.core.Direction;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.nbt.CompoundTag;
import net.minecraft.network.chat.Component;
import net.minecraft.network.protocol.game.ClientboundBlockEntityDataPacket;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.Containers;
import net.minecraft.world.MenuProvider;
import net.minecraft.world.entity.player.Inventory;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.inventory.AbstractContainerMenu;
import net.minecraft.world.inventory.ContainerData;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.Items;
import net.minecraft.world.level.Level;
import net.minecraft.world.level.block.entity.BlockEntity;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraftforge.common.capabilities.Capability;
import net.minecraftforge.common.capabilities.ForgeCapabilities;
import net.minecraftforge.common.util.LazyOptional;
import net.minecraftforge.items.IItemHandler;
import net.minecraftforge.items.ItemStackHandler;
import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

public final class GameForgeMachineBlockEntity extends BlockEntity implements MenuProvider {
    private final ItemStackHandler items = new ItemStackHandler(3) {
        @Override protected void onContentsChanged(int slot) { setChanged(); sync(); }
        @Override public boolean isItemValid(int slot, @NotNull ItemStack stack) { return slot == 0 ? isInput(stack) : slot == 1 && isFuel(stack); }
    };
    private LazyOptional<IItemHandler> itemCapability = LazyOptional.of(() -> items);
    private int progress;
    private boolean active;
    private final ContainerData data = new ContainerData() {
        @Override public int get(int index) { return switch (index) { case 0 -> progress; case 1 -> definition().processTicks(); case 2 -> active ? 1 : 0; default -> 0; }; }
        @Override public void set(int index, int value) { if (index == 0) progress = value; else if (index == 2) active = value != 0; }
        @Override public int getCount() { return 3; }
    };

    public GameForgeMachineBlockEntity(BlockPos pos, BlockState state) {
        super(SystemBlockEntities.MACHINE.get(), pos, state);
        active = definition().autoStart();
    }

    public static void serverTick(Level level, BlockPos pos, BlockState state, GameForgeMachineBlockEntity machine) {
        if (level.isClientSide) return;
        boolean changed = false;
        if (machine.active && machine.canProcess()) {
            machine.progress++;
            changed = true;
            if (machine.progress >= machine.definition().processTicks()) { machine.completeOperation(); machine.progress = 0; }
        } else if (!machine.canProcess() && machine.progress != 0) {
            machine.progress = 0;
            changed = true;
        }
        if (state.hasProperty(GameForgeMachineBlock.LIT) && state.getValue(GameForgeMachineBlock.LIT) != machine.active) {
            level.setBlock(pos, state.setValue(GameForgeMachineBlock.LIT, machine.active), 3);
            changed = true;
        }
        if (changed || level.getGameTime() % 20L == 0L) machine.sync();
    }

    public MachineDefinition definition() {
        if (getBlockState().getBlock() instanceof GameForgeMachineBlock block) return MachineDefinitions.get(block.definitionId());
        return MachineDefinitions.all().values().stream().findFirst().orElseThrow();
    }

    private Item resolve(String id) { return BuiltInRegistries.ITEM.getOptional(new net.minecraft.resources.ResourceLocation(id)).orElse(Items.AIR); }
    private boolean matches(ItemStack stack, String id) { return !stack.isEmpty() && stack.is(resolve(id)); }
    public boolean isInput(ItemStack stack) { return matches(stack, definition().inputItem()); }
    public boolean isFuel(ItemStack stack) { return !definition().needsFuel() || matches(stack, definition().fuelItem()); }

    private boolean canProcess() {
        MachineDefinition def = definition();
        ItemStack input = items.getStackInSlot(0);
        ItemStack fuel = items.getStackInSlot(1);
        ItemStack output = items.getStackInSlot(2);
        if (!matches(input, def.inputItem()) || input.getCount() < def.inputCount()) return false;
        if (def.needsFuel() && (!matches(fuel, def.fuelItem()) || fuel.getCount() < def.fuelCount())) return false;
        Item resultItem = resolve(def.outputItem());
        if (resultItem == Items.AIR) return false;
        if (output.isEmpty()) return def.outputCount() <= resultItem.getMaxStackSize();
        return output.is(resultItem) && output.getCount() + def.outputCount() <= output.getMaxStackSize();
    }

    private void completeOperation() {
        MachineDefinition def = definition();
        items.extractItem(0, def.inputCount(), false);
        if (def.needsFuel()) items.extractItem(1, def.fuelCount(), false);
        ItemStack output = items.getStackInSlot(2);
        if (output.isEmpty()) items.setStackInSlot(2, new ItemStack(resolve(def.outputItem()), def.outputCount()));
        else output.grow(def.outputCount());
        setChanged();
    }

    public void handleAction(int action, ServerPlayer player) {
        if (!stillValid(player)) return;
        if (action == 0) active = false;
        else if (action == 1) active = true;
        else if (action == 2) active = !active;
        sync();
    }

    public void setClientState(int progress, boolean active) { this.progress = Math.max(0, progress); this.active = active; }
    public ItemStackHandler items() { return items; }
    public ContainerData data() { return data; }
    public BlockPos position() { return worldPosition; }
    public boolean active() { return active; }
    public int progress() { return progress; }

    public boolean stillValid(Player player) { return level != null && level.getBlockEntity(worldPosition) == this && player.distanceToSqr(worldPosition.getX() + 0.5D, worldPosition.getY() + 0.5D, worldPosition.getZ() + 0.5D) <= 64.0D; }

    public void dropContents() {
        if (level == null || level.isClientSide) return;
        for (int slot = 0; slot < items.getSlots(); slot++) {
            ItemStack stack = items.getStackInSlot(slot);
            if (!stack.isEmpty()) Containers.dropItemStack(level, worldPosition.getX(), worldPosition.getY(), worldPosition.getZ(), stack.copy());
        }
        items.setStackInSlot(0, ItemStack.EMPTY);
        items.setStackInSlot(1, ItemStack.EMPTY);
        items.setStackInSlot(2, ItemStack.EMPTY);
    }

    private void sync() {
        setChanged();
        if (level instanceof ServerLevel serverLevel) {
            level.sendBlockUpdated(worldPosition, getBlockState(), getBlockState(), 3);
            MachineNetwork.sendStateNearby(serverLevel, worldPosition, progress, definition().processTicks(), active);
        }
    }

    @Override protected void saveAdditional(CompoundTag tag) { super.saveAdditional(tag); tag.put("Inventory", items.serializeNBT()); tag.putInt("Progress", progress); tag.putBoolean("Active", active); }
    @Override public void load(CompoundTag tag) { super.load(tag); if (tag.contains("Inventory")) items.deserializeNBT(tag.getCompound("Inventory")); progress = Math.max(0, tag.getInt("Progress")); active = tag.getBoolean("Active"); }
    @Override public CompoundTag getUpdateTag() { return saveWithoutMetadata(); }
    @Nullable @Override public ClientboundBlockEntityDataPacket getUpdatePacket() { return ClientboundBlockEntityDataPacket.create(this); }
    @Override public <T> LazyOptional<T> getCapability(Capability<T> capability, @Nullable Direction side) { if (capability == ForgeCapabilities.ITEM_HANDLER) return itemCapability.cast(); return super.getCapability(capability, side); }
    @Override public void invalidateCaps() { super.invalidateCaps(); itemCapability.invalidate(); }
    @Override public void reviveCaps() { super.reviveCaps(); itemCapability = LazyOptional.of(() -> items); }
    @Override public Component getDisplayName() { return Component.literal(definition().name()); }
    @Nullable @Override public AbstractContainerMenu createMenu(int id, Inventory inventory, Player player) { return new GameForgeMachineMenu(id, inventory, this, data); }
}
`;
  }

  function machineMenuJava(packageName) {
    return `package ${packageName}.systems.machine;

import ${packageName}.systems.registry.SystemMenus;
import net.minecraft.network.FriendlyByteBuf;
import net.minecraft.world.entity.player.Inventory;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.inventory.AbstractContainerMenu;
import net.minecraft.world.inventory.ContainerData;
import net.minecraft.world.inventory.SimpleContainerData;
import net.minecraft.world.inventory.Slot;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.level.block.entity.BlockEntity;
import net.minecraftforge.items.SlotItemHandler;

public final class GameForgeMachineMenu extends AbstractContainerMenu {
    private final GameForgeMachineBlockEntity machine;
    private final ContainerData data;

    public GameForgeMachineMenu(int id, Inventory inventory, FriendlyByteBuf buffer) { this(id, inventory, requireMachine(inventory, buffer), new SimpleContainerData(3)); }
    public GameForgeMachineMenu(int id, Inventory inventory, GameForgeMachineBlockEntity machine, ContainerData data) {
        super(SystemMenus.MACHINE.get(), id);
        checkContainerDataCount(data, 3);
        this.machine = machine;
        this.data = data;
        addSlot(new SlotItemHandler(machine.items(), 0, 44, 35));
        addSlot(new SlotItemHandler(machine.items(), 1, 44, 57));
        addSlot(new SlotItemHandler(machine.items(), 2, 116, 46) { @Override public boolean mayPlace(ItemStack stack) { return false; } });
        for (int row = 0; row < 3; row++) for (int column = 0; column < 9; column++) addSlot(new Slot(inventory, column + row * 9 + 9, 8 + column * 18, 84 + row * 18));
        for (int column = 0; column < 9; column++) addSlot(new Slot(inventory, column, 8 + column * 18, 142));
        addDataSlots(data);
    }

    private static GameForgeMachineBlockEntity requireMachine(Inventory inventory, FriendlyByteBuf buffer) {
        BlockEntity blockEntity = inventory.player.level().getBlockEntity(buffer.readBlockPos());
        if (!(blockEntity instanceof GameForgeMachineBlockEntity machine)) throw new IllegalStateException("GameForge machine BlockEntity not found");
        return machine;
    }

    public GameForgeMachineBlockEntity machine() { return machine; }
    public net.minecraft.core.BlockPos position() { return machine.position(); }
    public int progress() { return data.get(0); }
    public int maxProgress() { return Math.max(1, data.get(1)); }
    public boolean active() { return data.get(2) != 0; }
    public int scaledProgress(int width) { return Math.min(width, Math.max(0, progress() * width / maxProgress())); }
    @Override public boolean stillValid(Player player) { return machine.stillValid(player); }

    @Override public ItemStack quickMoveStack(Player player, int index) {
        ItemStack result = ItemStack.EMPTY;
        Slot slot = slots.get(index);
        if (!slot.hasItem()) return result;
        ItemStack stack = slot.getItem();
        result = stack.copy();
        if (index < 3) {
            if (!moveItemStackTo(stack, 3, 39, true)) return ItemStack.EMPTY;
        } else if (machine.isFuel(stack)) {
            if (!moveItemStackTo(stack, 1, 2, false)) return ItemStack.EMPTY;
        } else if (machine.isInput(stack)) {
            if (!moveItemStackTo(stack, 0, 1, false)) return ItemStack.EMPTY;
        } else if (index < 30) {
            if (!moveItemStackTo(stack, 30, 39, false)) return ItemStack.EMPTY;
        } else if (!moveItemStackTo(stack, 3, 30, false)) return ItemStack.EMPTY;
        if (stack.isEmpty()) slot.set(ItemStack.EMPTY); else slot.setChanged();
        return result;
    }
}
`;
  }

  function machineScreenJava(packageName) {
    return `package ${packageName}.systems.machine.client;

import ${packageName}.systems.machine.GameForgeMachineMenu;
import ${packageName}.systems.network.MachineNetwork;
import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.client.gui.components.Button;
import net.minecraft.client.gui.screens.inventory.AbstractContainerScreen;
import net.minecraft.network.chat.Component;
import net.minecraft.world.entity.player.Inventory;

public final class GameForgeMachineScreen extends AbstractContainerScreen<GameForgeMachineMenu> {
    private Button start;
    private Button stop;

    public GameForgeMachineScreen(GameForgeMachineMenu menu, Inventory inventory, Component title) { super(menu, inventory, title); imageWidth = 176; imageHeight = 166; }
    @Override protected void init() {
        super.init();
        start = addRenderableWidget(Button.builder(Component.literal("启动"), button -> MachineNetwork.sendAction(menu.position(), 1)).bounds(leftPos + 72, topPos + 58, 46, 18).build());
        stop = addRenderableWidget(Button.builder(Component.literal("停止"), button -> MachineNetwork.sendAction(menu.position(), 0)).bounds(leftPos + 122, topPos + 58, 46, 18).build());
    }
    @Override protected void containerTick() { super.containerTick(); if (start != null) start.active = !menu.active(); if (stop != null) stop.active = menu.active(); }
    @Override protected void renderBg(GuiGraphics graphics, float partialTick, int mouseX, int mouseY) {
        graphics.fill(leftPos, topPos, leftPos + imageWidth, topPos + imageHeight, 0xF012192B);
        graphics.fill(leftPos, topPos, leftPos + imageWidth, topPos + 3, menu.active() ? 0xFF77E2AC : 0xFF80A9FF);
        graphics.fill(leftPos + 66, topPos + 35, leftPos + 106, topPos + 49, 0xFF263650);
        graphics.fill(leftPos + 68, topPos + 37, leftPos + 68 + menu.scaledProgress(36), topPos + 47, menu.active() ? 0xFF77E2AC : 0xFF80A9FF);
        graphics.drawString(font, menu.active() ? "运行中" : "已停止", leftPos + 72, topPos + 22, menu.active() ? 0xFF77E2AC : 0xFFB9C5D9, false);
    }
    @Override protected void renderLabels(GuiGraphics graphics, int mouseX, int mouseY) { graphics.drawString(font, title, 8, 7, 0xFFEEF4FF, false); graphics.drawString(font, playerInventoryTitle, 8, 72, 0xFF9FACBF, false); }
    @Override public void render(GuiGraphics graphics, int mouseX, int mouseY, float partialTick) { renderBackground(graphics); super.render(graphics, mouseX, mouseY, partialTick); renderTooltip(graphics, mouseX, mouseY); }
}
`;
  }

  function machineNetworkJava(packageName, modId) {
    const className = U.toClassName(modId);
    return `package ${packageName}.systems.network;

import ${packageName}.${className}Mod;
import net.minecraft.core.BlockPos;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.server.level.ServerPlayer;
import net.minecraftforge.network.NetworkDirection;
import net.minecraftforge.network.NetworkRegistry;
import net.minecraftforge.network.PacketDistributor;
import net.minecraftforge.network.simple.SimpleChannel;

import java.util.Optional;

public final class MachineNetwork {
    private static final String PROTOCOL = "1";
    public static final SimpleChannel CHANNEL = NetworkRegistry.newSimpleChannel(new ResourceLocation(${className}Mod.MOD_ID, "machine"), () -> PROTOCOL, PROTOCOL::equals, PROTOCOL::equals);
    private static boolean registered;
    private MachineNetwork() {}
    public static void register() {
        if (registered) return;
        registered = true;
        int id = 0;
        CHANNEL.registerMessage(id++, MachineActionPacket.class, MachineActionPacket::encode, MachineActionPacket::decode, MachineActionPacket::handle, Optional.of(NetworkDirection.PLAY_TO_SERVER));
        CHANNEL.registerMessage(id, MachineStatePacket.class, MachineStatePacket::encode, MachineStatePacket::decode, MachineStatePacket::handle, Optional.of(NetworkDirection.PLAY_TO_CLIENT));
    }
    public static void sendAction(BlockPos pos, int action) { CHANNEL.sendToServer(new MachineActionPacket(pos, action)); }
    public static void sendToPlayer(ServerPlayer player, MachineStatePacket packet) { CHANNEL.send(PacketDistributor.PLAYER.with(() -> player), packet); }
    public static void sendStateNearby(ServerLevel level, BlockPos pos, int progress, int maxProgress, boolean active) {
        MachineStatePacket packet = new MachineStatePacket(pos, progress, maxProgress, active);
        for (ServerPlayer player : level.players()) if (player.distanceToSqr(pos.getX() + 0.5D, pos.getY() + 0.5D, pos.getZ() + 0.5D) <= 4096.0D) sendToPlayer(player, packet);
    }
}
`;
  }

  function machineActionPacketJava(packageName) {
    return `package ${packageName}.systems.network;

import ${packageName}.systems.machine.GameForgeMachineBlockEntity;
import ${packageName}.systems.machine.GameForgeMachineMenu;
import net.minecraft.core.BlockPos;
import net.minecraft.network.FriendlyByteBuf;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.level.block.entity.BlockEntity;
import net.minecraftforge.network.NetworkEvent;

import java.util.function.Supplier;

public record MachineActionPacket(BlockPos pos, int action) {
    public static void encode(MachineActionPacket packet, FriendlyByteBuf buffer) { buffer.writeBlockPos(packet.pos); buffer.writeVarInt(packet.action); }
    public static MachineActionPacket decode(FriendlyByteBuf buffer) { return new MachineActionPacket(buffer.readBlockPos(), buffer.readVarInt()); }
    public static void handle(MachineActionPacket packet, Supplier<NetworkEvent.Context> supplier) {
        NetworkEvent.Context context = supplier.get();
        context.enqueueWork(() -> {
            ServerPlayer sender = context.getSender();
            if (sender == null || packet.action < 0 || packet.action > 2) return;
            if (!(sender.containerMenu instanceof GameForgeMachineMenu menu) || !menu.position().equals(packet.pos)) return;
            if (sender.distanceToSqr(packet.pos.getX() + 0.5D, packet.pos.getY() + 0.5D, packet.pos.getZ() + 0.5D) > 64.0D) return;
            BlockEntity blockEntity = sender.level().getBlockEntity(packet.pos);
            if (blockEntity instanceof GameForgeMachineBlockEntity machine && machine.stillValid(sender)) machine.handleAction(packet.action, sender);
        });
        context.setPacketHandled(true);
    }
}
`;
  }

  function machineStatePacketJava(packageName) {
    return `package ${packageName}.systems.network;

import net.minecraft.core.BlockPos;
import net.minecraft.network.FriendlyByteBuf;
import net.minecraftforge.api.distmarker.Dist;
import net.minecraftforge.fml.DistExecutor;
import net.minecraftforge.network.NetworkEvent;

import java.util.function.Supplier;

public record MachineStatePacket(BlockPos pos, int progress, int maxProgress, boolean active) {
    public static void encode(MachineStatePacket packet, FriendlyByteBuf buffer) { buffer.writeBlockPos(packet.pos); buffer.writeVarInt(packet.progress); buffer.writeVarInt(packet.maxProgress); buffer.writeBoolean(packet.active); }
    public static MachineStatePacket decode(FriendlyByteBuf buffer) { return new MachineStatePacket(buffer.readBlockPos(), buffer.readVarInt(), buffer.readVarInt(), buffer.readBoolean()); }
    public static void handle(MachineStatePacket packet, Supplier<NetworkEvent.Context> supplier) {
        NetworkEvent.Context context = supplier.get();
        context.enqueueWork(() -> DistExecutor.unsafeRunWhenOn(Dist.CLIENT, () -> () -> ClientPacketHandlers.handleMachineState(packet)));
        context.setPacketHandled(true);
    }
}
`;
  }

  function clientPacketHandlersJava(packageName) {
    return `package ${packageName}.systems.network;

import ${packageName}.systems.machine.GameForgeMachineBlockEntity;
import net.minecraft.client.Minecraft;
import net.minecraft.world.level.block.entity.BlockEntity;

public final class ClientPacketHandlers {
    private ClientPacketHandlers() {}
    public static void handleMachineState(MachineStatePacket packet) {
        Minecraft minecraft = Minecraft.getInstance();
        if (minecraft.level == null) return;
        BlockEntity blockEntity = minecraft.level.getBlockEntity(packet.pos());
        if (blockEntity instanceof GameForgeMachineBlockEntity machine) machine.setClientState(packet.progress(), packet.active());
    }
}
`;
  }

  function entityDefinitionJava(packageName) {
    return `package ${packageName}.systems.entity;

import java.util.Set;

public record EntityDefinition(String id, String name, double health, double attackDamage, double movementSpeed, double armor, double followRange, double knockbackResistance, int experience, String texture, Set<String> goals, boolean targetPlayers, boolean boss) {}
`;
  }

  function entityDefinitionsJava(packageName, entities) {
    const entries = entities.map((entity) => `        Map.entry("${entity.id}", new EntityDefinition("${entity.id}", "${javaString(entity.name)}", ${javaDouble(entity.health, 30)}, ${javaDouble(entity.attackDamage, 6)}, ${javaDouble(entity.movementSpeed, 0.28)}, ${javaDouble(entity.armor, 2)}, ${javaDouble(entity.followRange, 32)}, ${javaDouble(entity.knockbackResistance, 0)}, ${entity.experience}, "${javaString(entity.texture)}", Set.of(${entity.goals.map((goal) => `"${goal}"`).join(', ')}), ${entity.targetPlayers}, ${entity.boss}))`).join(',\n');
    return `package ${packageName}.systems.entity;

import java.util.Map;
import java.util.Set;

public final class EntityDefinitions {
    private static final Map<String, EntityDefinition> BY_ID = Map.ofEntries(
${entries}
    );
    private EntityDefinitions() {}
    public static EntityDefinition get(String id) { EntityDefinition definition = BY_ID.get(id); if (definition == null) throw new IllegalArgumentException("Unknown GameForge entity: " + id); return definition; }
    public static Map<String, EntityDefinition> all() { return BY_ID; }
}
`;
  }

  function customMobJava(packageName) {
    return `package ${packageName}.systems.entity;

import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.network.chat.Component;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.ai.attributes.AttributeSupplier;
import net.minecraft.world.entity.ai.attributes.Attributes;
import net.minecraft.world.entity.ai.goal.FloatGoal;
import net.minecraft.world.entity.ai.goal.LeapAtTargetGoal;
import net.minecraft.world.entity.ai.goal.LookAtPlayerGoal;
import net.minecraft.world.entity.ai.goal.MeleeAttackGoal;
import net.minecraft.world.entity.ai.goal.MoveTowardsTargetGoal;
import net.minecraft.world.entity.ai.goal.RandomLookAroundGoal;
import net.minecraft.world.entity.ai.goal.WaterAvoidingRandomStrollGoal;
import net.minecraft.world.entity.ai.goal.target.HurtByTargetGoal;
import net.minecraft.world.entity.ai.goal.target.NearestAttackableTargetGoal;
import net.minecraft.world.entity.monster.Monster;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.level.Level;

public final class GameForgeCustomMob extends Monster {
    public GameForgeCustomMob(EntityType<? extends Monster> type, Level level) {
        super(type, level);
        EntityDefinition definition = definition();
        xpReward = definition.experience();
        setCustomName(Component.literal(definition.name()));
        setCustomNameVisible(definition.boss());
    }
    public String definitionId() { return BuiltInRegistries.ENTITY_TYPE.getKey(getType()).getPath(); }
    public EntityDefinition definition() { return EntityDefinitions.get(definitionId()); }
    @Override protected void registerGoals() {
        EntityDefinition definition = definition();
        if (definition.goals().contains("float")) goalSelector.addGoal(0, new FloatGoal(this));
        if (definition.goals().contains("leap_at_target")) goalSelector.addGoal(2, new LeapAtTargetGoal(this, 0.4F));
        if (definition.goals().contains("melee_attack")) goalSelector.addGoal(3, new MeleeAttackGoal(this, 1.0D, true));
        if (definition.goals().contains("move_towards_target")) goalSelector.addGoal(4, new MoveTowardsTargetGoal(this, 1.0D, (float) definition.followRange()));
        if (definition.goals().contains("random_stroll")) goalSelector.addGoal(5, new WaterAvoidingRandomStrollGoal(this, 0.8D));
        if (definition.goals().contains("look_at_player")) goalSelector.addGoal(6, new LookAtPlayerGoal(this, Player.class, 8.0F));
        if (definition.goals().contains("random_look")) goalSelector.addGoal(7, new RandomLookAroundGoal(this));
        if (definition.goals().contains("hurt_by_target")) targetSelector.addGoal(1, new HurtByTargetGoal(this));
        if (definition.targetPlayers() && definition.goals().contains("nearest_player")) targetSelector.addGoal(2, new NearestAttackableTargetGoal<>(this, Player.class, true));
    }
    public static AttributeSupplier.Builder createAttributes(EntityDefinition definition) {
        return Monster.createMonsterAttributes().add(Attributes.MAX_HEALTH, definition.health()).add(Attributes.ATTACK_DAMAGE, definition.attackDamage()).add(Attributes.MOVEMENT_SPEED, definition.movementSpeed()).add(Attributes.ARMOR, definition.armor()).add(Attributes.FOLLOW_RANGE, definition.followRange()).add(Attributes.KNOCKBACK_RESISTANCE, definition.knockbackResistance());
    }
}
`;
  }

  function customMobRendererJava(packageName) {
    return `package ${packageName}.systems.entity.client;

import ${packageName}.systems.entity.GameForgeCustomMob;
import net.minecraft.client.model.HumanoidModel;
import net.minecraft.client.model.geom.ModelLayers;
import net.minecraft.client.renderer.entity.EntityRendererProvider;
import net.minecraft.client.renderer.entity.HumanoidMobRenderer;
import net.minecraft.resources.ResourceLocation;

public final class GameForgeCustomMobRenderer extends HumanoidMobRenderer<GameForgeCustomMob, HumanoidModel<GameForgeCustomMob>> {
    public GameForgeCustomMobRenderer(EntityRendererProvider.Context context) { super(context, new HumanoidModel<>(context.bakeLayer(ModelLayers.ZOMBIE)), 0.5F); }
    @Override public ResourceLocation getTextureLocation(GameForgeCustomMob entity) { ResourceLocation configured = ResourceLocation.tryParse(entity.definition().texture()); return configured != null ? configured : new ResourceLocation("minecraft", "textures/entity/zombie/zombie.png"); }
}
`;
  }

  function clientEventsJava(packageName, modId, machines, entities) {
    const className = U.toClassName(modId);
    const renderers = entities.map((entity) => `        event.registerEntityRenderer(SystemEntities.${entity.id.toUpperCase()}.get(), GameForgeCustomMobRenderer::new);`).join('\n');
    return `package ${packageName}.systems.client;

import ${packageName}.${className}Mod;
${machines.length ? `import ${packageName}.systems.machine.client.GameForgeMachineScreen;\n` : ''}${entities.length ? `import ${packageName}.systems.entity.client.GameForgeCustomMobRenderer;\n` : ''}import ${packageName}.systems.registry.SystemEntities;
import ${packageName}.systems.registry.SystemMenus;
import net.minecraft.client.gui.screens.MenuScreens;
import net.minecraftforge.api.distmarker.Dist;
import net.minecraftforge.client.event.EntityRenderersEvent;
import net.minecraftforge.eventbus.api.SubscribeEvent;
import net.minecraftforge.fml.common.Mod;
import net.minecraftforge.fml.event.lifecycle.FMLClientSetupEvent;

@Mod.EventBusSubscriber(modid = ${className}Mod.MOD_ID, bus = Mod.EventBusSubscriber.Bus.MOD, value = Dist.CLIENT)
public final class NativeSystemsClient {
    private NativeSystemsClient() {}
    @SubscribeEvent public static void onClientSetup(FMLClientSetupEvent event) { ${machines.length ? 'event.enqueueWork(() -> MenuScreens.register(SystemMenus.MACHINE.get(), GameForgeMachineScreen::new));' : '// No generated machine screens.'} }
    @SubscribeEvent public static void registerRenderers(EntityRenderersEvent.RegisterRenderers event) {
${renderers || '        // No generated custom entity renderers.'}
    }
}
`;
  }

  function systemReport(machines, entities) {
    return {
      schema: 'gameforge.native-systems-report',
      version: VERSION,
      machines: machines.map((machine) => ({ id: machine.id, name: machine.name, input: machine.inputItem, fuel: machine.fuelItem, output: machine.outputItem, processTicks: machine.processTicks })),
      entities: entities.map((entity) => ({ id: entity.id, name: entity.name, health: entity.health, damage: entity.attackDamage, goals: entity.goals, targetPlayers: entity.targetPlayers })),
      capabilities: { customGui: machines.length > 0, simpleChannel: machines.length > 0, blockEntity: machines.length > 0, customEntityType: entities.length > 0, basicGoalAi: entities.length > 0 }
    };
  }

  function generateNativeSystems(irInput, options = {}) {
    const ir = Pipeline.migrate(irInput);
    const modId = BaseNative.cleanModId(options.modId || ir.meta.namespace || ir.meta.name);
    const machines = ir.components.filter(isMachine).map((component) => machineDescriptor(component, modId));
    const entities = ir.components.filter(isCustomEntity).map(entityDescriptor);
    if (!machines.length && !entities.length) return originalGenerate(ir, options);

    const baseIr = Pipeline.normalize({ ...clone(ir), components: ir.components.filter((component) => !isMachine(component) && !isCustomEntity(component)) });
    const output = originalGenerate(baseIr, options);
    const config = output.config;
    const packagePath = config.packageName.replace(/\./g, '/');
    const files = output.files.map((entry) => ({ ...entry }));
    patchMain(files, config);

    files.push(
      file(`src/main/java/${packagePath}/systems/NativeSystemsBootstrap.java`, bootstrapJava(config.packageName, config.modId, machines, entities)),
      file(`src/main/java/${packagePath}/systems/registry/SystemBlocks.java`, systemBlocksJava(config.packageName, config.modId, machines)),
      file(`src/main/java/${packagePath}/systems/registry/SystemItems.java`, systemItemsJava(config.packageName, config.modId, machines, entities)),
      file(`src/main/java/${packagePath}/systems/registry/SystemBlockEntities.java`, systemBlockEntitiesJava(config.packageName, config.modId, machines)),
      file(`src/main/java/${packagePath}/systems/registry/SystemMenus.java`, systemMenusJava(config.packageName, config.modId, machines)),
      file(`src/main/java/${packagePath}/systems/registry/SystemEntities.java`, systemEntitiesJava(config.packageName, config.modId, entities)),
      file(`src/main/java/${packagePath}/systems/client/NativeSystemsClient.java`, clientEventsJava(config.packageName, config.modId, machines, entities))
    );

    if (machines.length) {
      files.push(
        file(`src/main/java/${packagePath}/systems/machine/MachineDefinition.java`, machineDefinitionJava(config.packageName)),
        file(`src/main/java/${packagePath}/systems/machine/MachineDefinitions.java`, machineDefinitionsJava(config.packageName, machines)),
        file(`src/main/java/${packagePath}/systems/machine/GameForgeMachineBlock.java`, machineBlockJava(config.packageName)),
        file(`src/main/java/${packagePath}/systems/machine/GameForgeMachineBlockEntity.java`, machineBlockEntityJava(config.packageName)),
        file(`src/main/java/${packagePath}/systems/machine/GameForgeMachineMenu.java`, machineMenuJava(config.packageName)),
        file(`src/main/java/${packagePath}/systems/machine/client/GameForgeMachineScreen.java`, machineScreenJava(config.packageName)),
        file(`src/main/java/${packagePath}/systems/network/MachineNetwork.java`, machineNetworkJava(config.packageName, config.modId)),
        file(`src/main/java/${packagePath}/systems/network/MachineActionPacket.java`, machineActionPacketJava(config.packageName)),
        file(`src/main/java/${packagePath}/systems/network/MachineStatePacket.java`, machineStatePacketJava(config.packageName)),
        file(`src/main/java/${packagePath}/systems/network/ClientPacketHandlers.java`, clientPacketHandlersJava(config.packageName))
      );
    }

    if (entities.length) {
      files.push(
        file(`src/main/java/${packagePath}/systems/entity/EntityDefinition.java`, entityDefinitionJava(config.packageName)),
        file(`src/main/java/${packagePath}/systems/entity/EntityDefinitions.java`, entityDefinitionsJava(config.packageName, entities)),
        file(`src/main/java/${packagePath}/systems/entity/GameForgeCustomMob.java`, customMobJava(config.packageName)),
        file(`src/main/java/${packagePath}/systems/entity/client/GameForgeCustomMobRenderer.java`, customMobRendererJava(config.packageName))
      );
    }

    const en = {}, zh = {};
    for (const machine of machines) {
      en[`block.${config.modId}.${machine.id}`] = machine.name;
      zh[`block.${config.modId}.${machine.id}`] = machine.name;
      const model = `${config.modId}:block/${machine.id}`;
      files.push(
        jsonFile(`src/main/resources/assets/${config.modId}/blockstates/${machine.id}.json`, { variants: { 'lit=false': { model }, 'lit=true': { model } } }),
        jsonFile(`src/main/resources/assets/${config.modId}/models/block/${machine.id}.json`, { parent: 'minecraft:block/cube_all', textures: { all: `${config.modId}:block/${machine.id}` } }),
        jsonFile(`src/main/resources/assets/${config.modId}/models/item/${machine.id}.json`, { parent: model }),
        file(`src/main/resources/assets/${config.modId}/textures/block/${machine.id}.png`, GF.texture.generateTextureBase64({ kind: 'block', color: machine.color }), { encoding: 'base64' }),
        jsonFile(`src/main/resources/data/${config.modId}/loot_tables/blocks/${machine.id}.json`, { type: 'minecraft:block', pools: [{ rolls: 1, entries: [{ type: 'minecraft:item', name: `${config.modId}:${machine.id}` }], conditions: [{ condition: 'minecraft:survives_explosion' }] }] })
      );
      const recipe = recipeJson(machine, config.modId);
      if (recipe) files.push(jsonFile(`src/main/resources/data/${config.modId}/recipes/${machine.id}.json`, recipe));
    }
    for (const entity of entities) {
      en[`entity.${config.modId}.${entity.id}`] = entity.name;
      zh[`entity.${config.modId}.${entity.id}`] = entity.name;
      en[`item.${config.modId}.${entity.id}_spawn_egg`] = `${entity.name} Spawn Egg`;
      zh[`item.${config.modId}.${entity.id}_spawn_egg`] = `${entity.name}刷怪蛋`;
      files.push(jsonFile(`src/main/resources/assets/${config.modId}/models/item/${entity.id}_spawn_egg.json`, { parent: 'minecraft:item/template_spawn_egg' }));
    }

    const mergeLang = (path, values) => {
      const existing = files.find((entry) => entry.name === path);
      let parsed = {};
      if (existing && existing.encoding !== 'base64') {
        try { parsed = JSON.parse(existing.data); } catch (_) {}
        existing.data = `${JSON.stringify({ ...parsed, ...values }, null, 2)}\n`;
      } else files.push(jsonFile(path, values));
    };
    mergeLang(`src/main/resources/assets/${config.modId}/lang/en_us.json`, en);
    mergeLang(`src/main/resources/assets/${config.modId}/lang/zh_cn.json`, zh);

    const report = {
      ...output.report,
      supported: [
        ...output.report.supported,
        ...machines.map((machine) => ({ id: machine.id, name: machine.name, kind: 'machine' })),
        ...entities.map((entity) => ({ id: entity.id, name: entity.name, kind: 'entity' }))
      ],
      warnings: [...output.report.warnings],
      nativeSystems: systemReport(machines, entities)
    };
    files.push(jsonFile('gameforge-native-systems-report.json', report.nativeSystems));

    const irEntry = files.find((entry) => entry.name === 'gameforge-ir.json');
    if (irEntry) irEntry.data = `${JSON.stringify(ir, null, 2)}\n`;
    const reportEntry = files.find((entry) => entry.name === 'gameforge-native-report.json');
    if (reportEntry) reportEntry.data = `${JSON.stringify(report, null, 2)}\n`;
    const readme = files.find((entry) => entry.name === 'README.md');
    if (readme) readme.data += `\n\n## 原生机器与生物系统\n\n- 自定义 GUI：${machines.length ? '已生成 AbstractContainerMenu 与 Screen' : '当前项目未使用'}\n- 网络同步：${machines.length ? '已生成 SimpleChannel、C2S 操作包与 S2C 状态包' : '当前项目未使用'}\n- BlockEntity：${machines.length ? `${machines.length} 个机器方块共用安全持久化与处理框架` : '当前项目未使用'}\n- 自定义 EntityType：${entities.length ? `${entities.length} 个真正的新实体 ID` : '当前项目未使用'}\n- 基础 Goal AI：${entities.length ? '按每个实体的 goals 配置生成' : '当前项目未使用'}\n`;

    const byPath = new Map();
    for (const entry of files) {
      if (byPath.has(entry.name)) throw new Error(`原生系统生成出现重复路径：${entry.name}`);
      byPath.set(entry.name, entry);
    }
    return { ...output, ir, files: Array.from(byPath.values()).sort((a, b) => a.name.localeCompare(b.name)), report };
  }

  Pipeline.registerBackend('native-forge', generateNativeSystems, {
    label: '原生 Forge Java 工程（GUI、网络、BlockEntity、EntityType、Goal AI）',
    target: 'minecraft-1.20.1-forge-47.4.21',
    sourceProject: true,
    blueprint: true,
    nativeSystems: true
  });

  GF.nativeForge.generateFromIR = generateNativeSystems;
  GF.nativeForge.generate = (projectOrIr, options = {}) => {
    const ir = projectOrIr?.schema === Pipeline.IR_SCHEMA ? Pipeline.migrate(projectOrIr) : Pipeline.fromLegacyProject(projectOrIr);
    return generateNativeSystems(ir, options);
  };

  GF.nativeSystems = {
    VERSION,
    MACHINE_TYPE,
    ENTITY_TYPE,
    SUPPORTED_GOALS: Array.from(SUPPORTED_GOALS),
    createMachineComponent,
    createEntityComponent,
    parsePrompt,
    isMachine,
    isCustomEntity,
    machineDescriptor,
    entityDescriptor,
    validate: validateSystems,
    generateFromIR: generateNativeSystems,
    __installed: true
  };
})();
