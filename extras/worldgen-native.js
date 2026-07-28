'use strict';

(() => {
  const GF = window.GameForge;
  const Pipeline = GF?.pipeline;
  const BaseNative = GF?.nativeForge;
  const Worldgen = GF?.worldgen;
  if (!GF || !Pipeline || !BaseNative || !Worldgen || GF.worldgenNative?.__installed) return;

  const U = GF.utils;
  const originalGenerate = BaseNative.generateFromIR.bind(BaseNative);
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const file = (name, data, extra = {}) => ({ ...extra, name: String(name).replace(/^\/+/, ''), data });
  const jsonFile = (name, value, extra = {}) => file(name, `${JSON.stringify(value, null, 2)}\n`, extra);

  const OVERWORLD_ORES = [
    'minecraft:ore_dirt', 'minecraft:ore_gravel', 'minecraft:ore_granite_upper', 'minecraft:ore_granite_lower',
    'minecraft:ore_diorite_upper', 'minecraft:ore_diorite_lower', 'minecraft:ore_andesite_upper',
    'minecraft:ore_andesite_lower', 'minecraft:ore_tuff', 'minecraft:ore_coal_upper', 'minecraft:ore_coal_lower',
    'minecraft:ore_iron_upper', 'minecraft:ore_iron_middle', 'minecraft:ore_iron_small', 'minecraft:ore_gold',
    'minecraft:ore_gold_lower', 'minecraft:ore_redstone', 'minecraft:ore_redstone_lower', 'minecraft:ore_diamond',
    'minecraft:ore_diamond_large', 'minecraft:ore_diamond_buried', 'minecraft:ore_lapis',
    'minecraft:ore_lapis_buried', 'minecraft:ore_copper', 'minecraft:underwater_magma',
    'minecraft:disk_sand', 'minecraft:disk_clay', 'minecraft:disk_gravel'
  ];
  const OVERWORLD_VEGETATION = [
    'minecraft:glow_lichen', 'minecraft:patch_tall_grass_2', 'minecraft:trees_plains', 'minecraft:flower_plains',
    'minecraft:patch_grass_plain', 'minecraft:brown_mushroom_normal', 'minecraft:red_mushroom_normal',
    'minecraft:patch_sugar_cane', 'minecraft:patch_pumpkin'
  ];
  const NETHER_DECORATION = [
    'minecraft:spring_open', 'minecraft:patch_fire', 'minecraft:patch_soul_fire', 'minecraft:glowstone_extra',
    'minecraft:glowstone', 'minecraft:brown_mushroom_nether', 'minecraft:red_mushroom_nether',
    'minecraft:ore_magma', 'minecraft:spring_closed', 'minecraft:ore_gravel_nether', 'minecraft:ore_blackstone',
    'minecraft:ore_gold_nether', 'minecraft:ore_quartz_nether', 'minecraft:ore_ancient_debris_large',
    'minecraft:ore_debris_small'
  ];

  function javaString(value) {
    return String(value ?? '').replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\r?\n/g, '\\n');
  }

  function javaConstant(value, fallback = 'WORLDGEN_CONTENT') {
    const raw = Worldgen.cleanId(value, String(fallback || 'worldgen_content').toLowerCase())
      .toUpperCase().replace(/[^A-Z0-9_]/g, '_');
    if (!raw) return fallback;
    return /^[0-9]/.test(raw) ? `_${raw}` : raw;
  }

  function colorInt(value, fallback = '#000000') {
    const raw = String(value || fallback).replace('#', '');
    return Number.parseInt(/^[0-9a-f]{6}$/i.test(raw) ? raw : String(fallback).replace('#', ''), 16);
  }

  function emptySpawners() {
    return { ambient: [], axolotls: [], creature: [], misc: [], monster: [], underground_water_creature: [], water_ambient: [], water_creature: [] };
  }

  function overworldSpawners(preset) {
    const spawners = emptySpawners();
    if (preset === 'empty') return spawners;
    spawners.ambient = [{ type: 'minecraft:bat', minCount: 8, maxCount: 8, weight: 10 }];
    if (preset === 'mixed' || preset === 'peaceful') {
      spawners.creature = [
        { type: 'minecraft:sheep', minCount: 4, maxCount: 4, weight: 12 },
        { type: 'minecraft:pig', minCount: 4, maxCount: 4, weight: 10 },
        { type: 'minecraft:chicken', minCount: 4, maxCount: 4, weight: 10 },
        { type: 'minecraft:cow', minCount: 4, maxCount: 4, weight: 8 },
        { type: 'minecraft:horse', minCount: 2, maxCount: 6, weight: 5 }
      ];
    }
    if (preset === 'mixed' || preset === 'hostile') {
      spawners.monster = [
        { type: 'minecraft:spider', minCount: 4, maxCount: 4, weight: 100 },
        { type: 'minecraft:zombie', minCount: 4, maxCount: 4, weight: 95 },
        { type: 'minecraft:skeleton', minCount: 4, maxCount: 4, weight: 100 },
        { type: 'minecraft:creeper', minCount: 4, maxCount: 4, weight: 100 },
        { type: 'minecraft:slime', minCount: 4, maxCount: 4, weight: 100 },
        { type: 'minecraft:enderman', minCount: 1, maxCount: 4, weight: 10 },
        { type: 'minecraft:witch', minCount: 1, maxCount: 1, weight: 5 }
      ];
    }
    spawners.underground_water_creature = [{ type: 'minecraft:glow_squid', minCount: 4, maxCount: 6, weight: 10 }];
    return spawners;
  }

  function netherSpawners() {
    const spawners = emptySpawners();
    spawners.creature = [{ type: 'minecraft:strider', minCount: 1, maxCount: 2, weight: 60 }];
    spawners.monster = [
      { type: 'minecraft:ghast', minCount: 4, maxCount: 4, weight: 50 },
      { type: 'minecraft:zombified_piglin', minCount: 4, maxCount: 4, weight: 100 },
      { type: 'minecraft:magma_cube', minCount: 4, maxCount: 4, weight: 2 },
      { type: 'minecraft:enderman', minCount: 4, maxCount: 4, weight: 1 },
      { type: 'minecraft:piglin', minCount: 4, maxCount: 4, weight: 15 }
    ];
    return spawners;
  }

  function endSpawners() {
    const spawners = emptySpawners();
    spawners.monster = [{ type: 'minecraft:enderman', minCount: 4, maxCount: 4, weight: 10 }];
    return spawners;
  }

  function featuresFor(preset) {
    if (preset === 'empty') return [];
    if (preset === 'end') return [[], [], [], [], []];
    if (preset === 'nether') return [[], [], [], [], [], [], [], NETHER_DECORATION, [], ['minecraft:spring_lava', 'minecraft:brown_mushroom_normal', 'minecraft:red_mushroom_normal']];
    const vegetation = preset === 'sparse' ? ['minecraft:glow_lichen', 'minecraft:patch_grass_plain'] : OVERWORLD_VEGETATION;
    return [
      [],
      preset === 'sparse' ? [] : ['minecraft:lake_lava_underground', 'minecraft:lake_lava_surface'],
      ['minecraft:amethyst_geode'],
      ['minecraft:monster_room', 'minecraft:monster_room_deep'],
      [],
      [],
      OVERWORLD_ORES,
      [],
      ['minecraft:spring_water', 'minecraft:spring_lava'],
      vegetation,
      ['minecraft:freeze_top_layer']
    ];
  }

  function carversFor(preset) {
    if (preset === 'nether') return { air: 'minecraft:nether_cave' };
    if (preset === 'end' || preset === 'empty') return {};
    return { air: ['minecraft:cave', 'minecraft:cave_extra_underground', 'minecraft:canyon'] };
  }

  function biomeJson(biome) {
    const effects = {
      fog_color: colorInt(biome.fogColor, '#c0d8ff'),
      sky_color: colorInt(biome.skyColor, '#78a7ff'),
      water_color: colorInt(biome.waterColor, '#3f76e4'),
      water_fog_color: colorInt(biome.waterFogColor, '#050533'),
      grass_color: colorInt(biome.grassColor, '#79c05a'),
      foliage_color: colorInt(biome.foliageColor, '#59ae30'),
      mood_sound: { sound: 'minecraft:ambient.cave', tick_delay: 6000, block_search_extent: 8, offset: 2 }
    };
    if (biome.ambientSound) effects.ambient_sound = biome.ambientSound;
    if (biome.music) effects.music = { sound: biome.music, min_delay: 12000, max_delay: 24000, replace_current_music: false };
    const spawners = biome.spawnPreset === 'nether' ? netherSpawners()
      : biome.spawnPreset === 'end' ? endSpawners()
        : overworldSpawners(biome.spawnPreset);
    return {
      carvers: carversFor(biome.featurePreset),
      downfall: biome.downfall,
      effects,
      features: featuresFor(biome.featurePreset),
      has_precipitation: biome.precipitation,
      spawn_costs: {},
      spawners,
      temperature: biome.temperature
    };
  }

  function dimensionTypeJson(dimension) {
    const value = {
      ambient_light: dimension.ambientLight,
      bed_works: dimension.bedWorks,
      coordinate_scale: dimension.coordinateScale,
      effects: dimension.effects,
      has_ceiling: dimension.ceiling,
      has_raids: dimension.hasRaids,
      has_skylight: dimension.skylight,
      height: dimension.height,
      infiniburn: dimension.infiniburn,
      logical_height: dimension.logicalHeight,
      min_y: dimension.minY,
      monster_spawn_block_light_limit: dimension.monsterSpawnBlockLightLimit,
      monster_spawn_light_level: dimension.terrainPreset === 'nether'
        ? dimension.monsterSpawnLightLevel
        : { type: 'minecraft:uniform', value: { min_inclusive: 0, max_inclusive: dimension.monsterSpawnLightLevel } },
      natural: dimension.natural,
      piglin_safe: dimension.piglinSafe,
      respawn_anchor_works: dimension.respawnAnchorWorks,
      ultrawarm: dimension.ultrawarm
    };
    if (dimension.fixedTime !== null && dimension.fixedTime !== undefined) value.fixed_time = dimension.fixedTime;
    return value;
  }

  function defaultFlatLayers(voidWorld) {
    if (voidWorld) return [{ block: 'minecraft:air', height: 1 }];
    return [
      { block: 'minecraft:bedrock', height: 1 },
      { block: 'minecraft:dirt', height: 2 },
      { block: 'minecraft:grass_block', height: 1 }
    ];
  }

  function dimensionJson(dimension) {
    if (dimension.terrainPreset === 'flat' || dimension.terrainPreset === 'void') {
      const layers = dimension.flatLayers.length ? dimension.flatLayers.map((layer) => ({
        block: String(layer.block || 'minecraft:air'),
        height: Math.max(1, Math.round(Number(layer.height) || 1))
      })) : defaultFlatLayers(dimension.terrainPreset === 'void');
      return {
        type: dimension.resourceId,
        generator: {
          type: 'minecraft:flat',
          settings: {
            biome: dimension.biomeId,
            features: dimension.terrainPreset !== 'void',
            lakes: false,
            layers,
            structure_overrides: dimension.flatStructures.includes('village') ? 'minecraft:villages' : []
          }
        }
      };
    }
    const settings = {
      overworld: 'minecraft:overworld',
      large_biomes: 'minecraft:large_biomes',
      amplified: 'minecraft:amplified',
      caves: 'minecraft:caves',
      nether: 'minecraft:nether',
      end: 'minecraft:end',
      floating_islands: 'minecraft:floating_islands'
    }[dimension.terrainPreset] || 'minecraft:overworld';
    return {
      type: dimension.resourceId,
      generator: {
        type: 'minecraft:noise',
        biome_source: { type: 'minecraft:fixed', biome: dimension.biomeId },
        settings
      }
    };
  }

  function patchMain(files, config) {
    const className = `${U.toClassName(config.modId)}Mod`;
    const path = `src/main/java/${config.packageName.replace(/\./g, '/')}/${className}.java`;
    const entry = files.find((item) => item.name === path);
    if (!entry || entry.encoding === 'base64') throw new Error(`无法找到原生 Mod 主类：${path}`);
    if (!entry.data.includes('WorldgenBootstrap')) {
      entry.data = entry.data
        .replace(`import ${config.packageName}.registry.ModItems;`, `import ${config.packageName}.registry.ModItems;\nimport ${config.packageName}.worldgen.WorldgenBootstrap;`)
        .replace('        ModItems.register(modBus);', '        ModItems.register(modBus);\n        WorldgenBootstrap.register(modBus);');
    }
  }

  function worldgenBootstrapJava(packageName, modId, dimensions) {
    const className = U.toClassName(modId);
    const accepts = dimensions.map((dimension) => `            event.accept(WorldgenItems.${javaConstant(dimension.travelItemId)});`).join('\n');
    return `package ${packageName}.worldgen;

import ${packageName}.${className}Mod;
import ${packageName}.worldgen.registry.WorldgenItems;
import net.minecraft.world.item.CreativeModeTabs;
import net.minecraftforge.event.BuildCreativeModeTabContentsEvent;
import net.minecraftforge.eventbus.api.IEventBus;

public final class WorldgenBootstrap {
    private static boolean registered;
    private WorldgenBootstrap() {}

    public static void register(IEventBus modBus) {
        if (registered) return;
        registered = true;
        WorldgenItems.register(modBus);
        modBus.addListener(WorldgenBootstrap::addCreativeTabContents);
    }

    private static void addCreativeTabContents(BuildCreativeModeTabContentsEvent event) {
        if (event.getTabKey().equals(CreativeModeTabs.TOOLS_AND_UTILITIES)) {
${accepts || '            // No generated dimension travel items.'}
        }
    }
}
`;
  }

  function worldgenItemsJava(packageName, modId, dimensions) {
    const className = U.toClassName(modId);
    const entries = dimensions.map((dimension) => `    public static final RegistryObject<Item> ${javaConstant(dimension.travelItemId)} = ITEMS.register("${dimension.travelItemId}", () -> new DimensionTravelItem("${javaString(dimension.id)}", ${dimension.spawnY}, "${javaString(dimension.platformBlock)}", ${dimension.createPlatform}, new Item.Properties().stacksTo(1)));`).join('\n');
    return `package ${packageName}.worldgen.registry;

import ${packageName}.${className}Mod;
import ${packageName}.worldgen.item.DimensionTravelItem;
import net.minecraft.world.item.Item;
import net.minecraftforge.eventbus.api.IEventBus;
import net.minecraftforge.registries.DeferredRegister;
import net.minecraftforge.registries.ForgeRegistries;
import net.minecraftforge.registries.RegistryObject;

public final class WorldgenItems {
    public static final DeferredRegister<Item> ITEMS = DeferredRegister.create(ForgeRegistries.ITEMS, ${className}Mod.MOD_ID);
${entries}

    private WorldgenItems() {}
    public static void register(IEventBus bus) { ITEMS.register(bus); }
}
`;
  }

  function dimensionTravelItemJava(packageName, modId) {
    const className = U.toClassName(modId);
    return `package ${packageName}.worldgen.item;

import ${packageName}.${className}Mod;
import net.minecraft.core.BlockPos;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.core.registries.Registries;
import net.minecraft.resources.ResourceKey;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.util.Mth;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.InteractionResultHolder;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.level.Level;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.Blocks;
import net.minecraft.world.level.levelgen.Heightmap;

public final class DimensionTravelItem extends Item {
    private final String dimensionId;
    private final int spawnY;
    private final String platformBlock;
    private final boolean createPlatform;

    public DimensionTravelItem(String dimensionId, int spawnY, String platformBlock, boolean createPlatform, Properties properties) {
        super(properties);
        this.dimensionId = dimensionId;
        this.spawnY = spawnY;
        this.platformBlock = platformBlock;
        this.createPlatform = createPlatform;
    }

    @Override
    public InteractionResultHolder<ItemStack> use(Level level, Player player, InteractionHand hand) {
        ItemStack stack = player.getItemInHand(hand);
        if (level.isClientSide || !(player instanceof ServerPlayer serverPlayer)) return InteractionResultHolder.sidedSuccess(stack, level.isClientSide);
        MinecraftServer server = serverPlayer.getServer();
        if (server == null) return InteractionResultHolder.fail(stack);
        ResourceLocation location = ResourceLocation.tryParse(${className}Mod.MOD_ID + ":" + dimensionId);
        if (location == null) return InteractionResultHolder.fail(stack);
        ResourceKey<Level> custom = ResourceKey.create(Registries.DIMENSION, location);
        ResourceKey<Level> destination = serverPlayer.level().dimension().equals(custom) ? Level.OVERWORLD : custom;
        ServerLevel target = server.getLevel(destination);
        if (target == null) return InteractionResultHolder.fail(stack);
        BlockPos safe = safePosition(target, serverPlayer.getX(), serverPlayer.getZ(), destination.equals(custom));
        serverPlayer.teleportTo(target, safe.getX() + 0.5D, safe.getY(), safe.getZ() + 0.5D, serverPlayer.getYRot(), serverPlayer.getXRot());
        serverPlayer.setDeltaMovement(0, 0, 0);
        serverPlayer.fallDistance = 0;
        serverPlayer.getCooldowns().addCooldown(this, 40);
        return InteractionResultHolder.success(stack);
    }

    private BlockPos safePosition(ServerLevel target, double sourceX, double sourceZ, boolean enteringCustom) {
        int x = Mth.floor(Mth.clamp(sourceX, -2.99998E7D, 2.99998E7D));
        int z = Mth.floor(Mth.clamp(sourceZ, -2.99998E7D, 2.99998E7D));
        BlockPos column = new BlockPos(x, Mth.clamp(spawnY, target.getMinBuildHeight() + 2, target.getMaxBuildHeight() - 3), z);
        BlockPos top = target.getHeightmapPos(Heightmap.Types.MOTION_BLOCKING_NO_LEAVES, column).above();
        boolean invalid = top.getY() <= target.getMinBuildHeight() + 1 || top.getY() >= target.getMaxBuildHeight() - 2
            || !target.getBlockState(top.below()).isSolidRender(target, top.below());
        if ((enteringCustom && createPlatform) || invalid) {
            BlockPos platform = new BlockPos(x, Mth.clamp(spawnY, target.getMinBuildHeight() + 2, target.getMaxBuildHeight() - 3), z);
            buildPlatform(target, platform);
            return platform.above();
        }
        target.setBlock(top, Blocks.AIR.defaultBlockState(), 3);
        target.setBlock(top.above(), Blocks.AIR.defaultBlockState(), 3);
        return top;
    }

    private void buildPlatform(ServerLevel target, BlockPos center) {
        ResourceLocation blockId = ResourceLocation.tryParse(platformBlock);
        Block block = blockId == null ? Blocks.STONE : BuiltInRegistries.BLOCK.getOptional(blockId).orElse(Blocks.STONE);
        for (int dx = -2; dx <= 2; dx++) for (int dz = -2; dz <= 2; dz++) {
            target.setBlock(center.offset(dx, 0, dz), block.defaultBlockState(), 3);
        }
        for (int dy = 1; dy <= 3; dy++) for (int dx = -1; dx <= 1; dx++) for (int dz = -1; dz <= 1; dz++) {
            target.setBlock(center.offset(dx, dy, dz), Blocks.AIR.defaultBlockState(), 3);
        }
    }
}
`;
  }

  function mergeJsonObject(files, path, values) {
    const existing = files.find((entry) => entry.name === path);
    if (existing && existing.encoding !== 'base64') {
      let parsed = {};
      try { parsed = JSON.parse(existing.data); } catch (_) {}
      existing.data = `${JSON.stringify({ ...parsed, ...values }, null, 2)}\n`;
    } else files.push(jsonFile(path, values));
  }

  function mergeTag(files, path, values) {
    const existing = files.find((entry) => entry.name === path);
    let parsed = { replace: false, values: [] };
    if (existing && existing.encoding !== 'base64') {
      try { parsed = JSON.parse(existing.data); } catch (_) {}
    }
    parsed.replace = Boolean(parsed.replace);
    parsed.values = Array.from(new Set([...(Array.isArray(parsed.values) ? parsed.values : []), ...values]));
    if (existing) existing.data = `${JSON.stringify(parsed, null, 2)}\n`;
    else files.push(jsonFile(path, parsed));
  }

  function appendReadme(files, dimensions, biomes) {
    const entry = files.find((item) => item.name === 'README.md');
    if (!entry || entry.encoding === 'base64') return;
    entry.data += `\n\n## 世界与维度生成\n\n${dimensions.map((dimension) => `- ${dimension.name}: \`${dimension.resourceId}\`，地形 \`${dimension.terrainPreset}\`，群系 \`${dimension.biomeId}\`，入口物品 \`${dimension.travelItemId}\``).join('\n')}\n\n自定义群系：\n${biomes.map((biome) => `- ${biome.name}: \`${biome.resourceId}\`，地物 \`${biome.featurePreset}\`，生成 \`${biome.spawnPreset}\``).join('\n')}\n\n进入维度可使用生成的钥匙，也可执行：\n\n\`/execute in ${dimensions[0]?.resourceId || 'modid:dimension'} run tp @s ~ ~ ~\`\n`;
  }

  function generateWorldgen(irInput, options = {}) {
    const ir = Pipeline.migrate(irInput);
    const namespace = BaseNative.cleanModId(options.modId || ir.meta.namespace || ir.meta.name);
    const biomeComponents = ir.components.filter(Worldgen.isBiome);
    const dimensionComponents = ir.components.filter(Worldgen.isDimension);
    if (!biomeComponents.length && !dimensionComponents.length) return originalGenerate(ir, options);

    const biomes = biomeComponents.map((component) => Worldgen.biomeDescriptor(component, namespace));
    const dimensions = dimensionComponents.map((component) => Worldgen.dimensionDescriptor(component, namespace));
    const baseIr = Pipeline.normalize({ ...clone(ir), components: ir.components.filter((component) => !Worldgen.isBiome(component) && !Worldgen.isDimension(component)) });
    const output = originalGenerate(baseIr, options);
    const config = output.config;
    const packagePath = config.packageName.replace(/\./g, '/');
    const files = output.files.map((entry) => ({ ...entry }));
    patchMain(files, config);

    if (dimensions.length) {
      files.push(
        file(`src/main/java/${packagePath}/worldgen/WorldgenBootstrap.java`, worldgenBootstrapJava(config.packageName, config.modId, dimensions)),
        file(`src/main/java/${packagePath}/worldgen/registry/WorldgenItems.java`, worldgenItemsJava(config.packageName, config.modId, dimensions)),
        file(`src/main/java/${packagePath}/worldgen/item/DimensionTravelItem.java`, dimensionTravelItemJava(config.packageName, config.modId))
      );
    }

    const biomeById = new Map(biomes.map((biome) => [biome.resourceId, biome]));
    for (const biome of biomes) {
      files.push(jsonFile(`src/main/resources/data/${config.modId}/worldgen/biome/${biome.id}.json`, biomeJson(biome)));
      const typeTag = biome.terrainPreset === 'nether' ? 'is_nether'
        : biome.terrainPreset === 'end' || biome.terrainPreset === 'floating_islands' ? 'is_end' : 'is_overworld';
      mergeTag(files, `src/main/resources/data/minecraft/tags/worldgen/biome/${typeTag}.json`, [biome.resourceId]);
      for (const structure of biome.structures) {
        const tag = { village: 'village_plains', mineshaft: 'mineshaft', ruined_portal: 'ruined_portal_standard' }[structure];
        if (tag) mergeTag(files, `src/main/resources/data/minecraft/tags/worldgen/biome/has_structure/${tag}.json`, [biome.resourceId]);
      }
    }

    for (const dimension of dimensions) {
      files.push(
        jsonFile(`src/main/resources/data/${config.modId}/dimension_type/${dimension.id}.json`, dimensionTypeJson(dimension)),
        jsonFile(`src/main/resources/data/${config.modId}/dimension/${dimension.id}.json`, dimensionJson(dimension)),
        jsonFile(`src/main/resources/assets/${config.modId}/models/item/${dimension.travelItemId}.json`, { parent: 'minecraft:item/generated', textures: { layer0: `${config.modId}:item/${dimension.travelItemId}` } }),
        file(`src/main/resources/assets/${config.modId}/textures/item/${dimension.travelItemId}.png`, GF.texture.generateTextureBase64({ kind: 'item', color: biomeById.get(dimension.biomeId)?.skyColor || '#7657d8' }), { encoding: 'base64' }),
        jsonFile(`src/main/resources/data/${config.modId}/recipes/${dimension.travelItemId}.json`, {
          type: 'minecraft:crafting_shaped',
          pattern: [' A ', 'AEA', ' A '],
          key: { A: { item: 'minecraft:amethyst_shard' }, E: { item: 'minecraft:ender_pearl' } },
          result: { item: `${config.modId}:${dimension.travelItemId}`, count: 1 }
        })
      );
    }

    const en = {}, zh = {};
    for (const dimension of dimensions) {
      en[`item.${config.modId}.${dimension.travelItemId}`] = dimension.travelItemName;
      zh[`item.${config.modId}.${dimension.travelItemId}`] = dimension.travelItemName;
    }
    mergeJsonObject(files, `src/main/resources/assets/${config.modId}/lang/en_us.json`, en);
    mergeJsonObject(files, `src/main/resources/assets/${config.modId}/lang/zh_cn.json`, zh);

    const worldgenReport = {
      schema: 'gameforge.worldgen-report',
      version: Worldgen.VERSION,
      biomes: biomes.map((biome) => ({ id: biome.id, name: biome.name, resourceId: biome.resourceId, featurePreset: biome.featurePreset, spawnPreset: biome.spawnPreset, structures: biome.structures })),
      dimensions: dimensions.map((dimension) => ({ id: dimension.id, name: dimension.name, resourceId: dimension.resourceId, terrainPreset: dimension.terrainPreset, biomeId: dimension.biomeId, travelItemId: dimension.travelItemId, createPlatform: dimension.createPlatform })),
      capabilities: {
        customBiome: biomes.length > 0,
        playableDimension: dimensions.length > 0,
        dataDrivenTerrain: dimensions.length > 0,
        travelItem: dimensions.length > 0,
        structureBiomeTags: biomes.some((biome) => biome.structures.length > 0)
      },
      boundaries: [
        '首版使用经过验证的原版噪声设置与平坦生成器，不生成任意自定义 NoiseRouter。',
        '自定义结构 NBT、Jigsaw 模板池和完整可视化噪声曲线属于后续模块。'
      ]
    };
    files.push(jsonFile('gameforge-worldgen-report.json', worldgenReport));
    output.report.worldgen = worldgenReport;
    const nativeReport = files.find((entry) => entry.name === 'gameforge-native-report.json');
    if (nativeReport && nativeReport.encoding !== 'base64') nativeReport.data = `${JSON.stringify(output.report, null, 2)}\n`;
    const irFile = files.find((entry) => entry.name === 'gameforge-ir.json');
    if (irFile && irFile.encoding !== 'base64') irFile.data = `${JSON.stringify(ir, null, 2)}\n`;
    appendReadme(files, dimensions, biomes);

    const byPath = new Map();
    for (const entry of files) {
      if (byPath.has(entry.name)) throw new Error(`世界生成工程出现重复路径：${entry.name}`);
      byPath.set(entry.name, entry);
    }
    return {
      ...output,
      ir,
      files: Array.from(byPath.values()).sort((a, b) => a.name.localeCompare(b.name)),
      report: output.report
    };
  }

  Pipeline.registerBackend('native-forge-worldgen', generateWorldgen, {
    label: '原生 Forge + 世界与维度',
    target: 'minecraft-1.20.1-forge-47.4.21',
    sourceProject: true,
    blueprint: true,
    dimensions: true
  });

  GF.nativeForge = {
    ...BaseNative,
    generate: (projectOrIr, options = {}) => {
      const ir = projectOrIr?.schema === Pipeline.IR_SCHEMA ? Pipeline.migrate(projectOrIr) : Pipeline.fromLegacyProject(projectOrIr);
      return generateWorldgen(ir, options);
    },
    generateFromIR: generateWorldgen
  };
  GF.worldgenNative = Object.freeze({
    generate: generateWorldgen,
    biomeJson,
    dimensionTypeJson,
    dimensionJson,
    featuresFor,
    javaConstant,
    __installed: true
  });
})();
