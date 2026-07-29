'use strict';

(() => {
  const GF = window.GameForge;
  const Gen = GF?.generators;
  const Cap = GF?.capabilities;
  if (!GF || !Gen || !Cap || GF.contentCatalog?.__installed) return;

  const U = GF.utils;
  const STATUS = Cap.STATUS;
  const STATUS_META = Cap.STATUS_META;
  const VERSION = 1;
  const entries = [];
  const byId = new Map();
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const normalize = (value) => String(value ?? '').normalize('NFKC').trim();
  const lower = (value) => normalize(value).toLowerCase();

  function splitAliases(value) {
    const values = Array.isArray(value) ? value : String(value || '').split('|');
    return Array.from(new Set(values.map((item) => normalize(item)).filter(Boolean)));
  }

  function add(definition) {
    const id = String(definition.id || '').trim();
    if (!id || byId.has(id)) return;
    const aliases = splitAliases([definition.name, definition.minecraftId, ...(definition.aliases || [])]);
    const entry = Object.freeze({
      id,
      name: String(definition.name || id),
      kind: definition.kind || 'item',
      strategy: definition.strategy || 'vanilla',
      minecraftId: definition.minecraftId || '',
      aliases,
      tags: Object.freeze(Array.from(new Set(definition.tags || []))),
      route: definition.route || '智能创建',
      status: definition.status || 'ready',
      base: definition.base || definition.minecraftId || '',
      hostile: Boolean(definition.hostile),
      boss: Boolean(definition.boss),
      note: String(definition.note || ''),
      priority: Number(definition.priority || 0)
    });
    entries.push(entry);
    byId.set(id, entry);
  }

  function addVanilla(id, minecraftId, name, aliases, kind = 'item', tags = []) {
    add({ id, minecraftId, name, aliases: splitAliases(aliases), kind, strategy: kind === 'mob' ? 'mob' : 'vanilla', tags });
  }

  function addAdvanced(id, name, aliases, strategy, options = {}) {
    add({ id, name, aliases: splitAliases(aliases), kind: options.kind || 'advanced', strategy, minecraftId: options.minecraftId || '', base: options.base || '', tags: options.tags || [], route: options.route || '智能创建', status: options.status || 'partial', hostile: options.hostile, boss: options.boss, note: options.note, priority: options.priority || 20 });
  }

  const WOODS = [
    ['oak', '橡木', '橡树|橡樹|oak'], ['spruce', '云杉木', '云杉|雲杉|spruce'], ['birch', '白桦木', '白桦|白樺|birch'],
    ['jungle', '丛林木', '丛林|叢林|jungle'], ['acacia', '金合欢木', '金合欢|金合歡|acacia'], ['dark_oak', '深色橡木', '黑橡木|dark oak'],
    ['mangrove', '红树木', '红树|紅樹|mangrove'], ['cherry', '樱花木', '樱花|櫻花|cherry'], ['bamboo', '竹木', '竹子|bamboo']
  ];
  const WOOD_PARTS = [
    ['planks', '木板', '木板|planks'], ['log', '原木', '原木|木头|木頭|log'], ['stairs', '楼梯', '楼梯|樓梯|stairs'],
    ['slab', '台阶', '台阶|臺階|半砖|半磚|slab'], ['door', '门', '门|門|door'], ['trapdoor', '活板门', '活板门|活板門|trapdoor'],
    ['fence', '栅栏', '栅栏|柵欄|fence'], ['fence_gate', '栅栏门', '栅栏门|柵欄門|fence gate'],
    ['pressure_plate', '压力板', '压力板|壓力板|pressure plate'], ['button', '按钮', '按钮|按鈕|button'],
    ['sign', '告示牌', '告示牌|牌子|sign'], ['hanging_sign', '悬挂式告示牌', '悬挂告示牌|懸掛告示牌|hanging sign']
  ];
  for (const [woodId, woodName, woodAliases] of WOODS) {
    const woodNames = splitAliases(woodAliases);
    for (const [partId, partName, partAliases] of WOOD_PARTS) {
      const mcPart = woodId === 'bamboo' && partId === 'log' ? 'block' : partId;
      const minecraftId = `minecraft:${woodId}_${mcPart}`;
      const aliases = [];
      for (const woodAlias of [woodName, ...woodNames]) for (const partAlias of splitAliases(partAliases)) aliases.push(`${woodAlias}${partAlias}`, `${woodAlias} ${partAlias}`);
      addVanilla(`wood.${woodId}.${partId}`, minecraftId, `${woodName}${partName}`, aliases, 'block', ['building', 'wood', 'placeable']);
    }
    if (woodId !== 'bamboo') {
      addVanilla(`wood.${woodId}.leaves`, `minecraft:${woodId}_leaves`, `${woodName}树叶`, [`${woodName}树叶`, `${woodName}樹葉`, `${woodNames[0]} leaves`], 'block', ['natural', 'placeable']);
      const saplingId = woodId === 'mangrove' ? 'mangrove_propagule' : `${woodId}_sapling`;
      addVanilla(`wood.${woodId}.sapling`, `minecraft:${saplingId}`, `${woodName}树苗`, [`${woodName}树苗`, `${woodName}樹苗`, `${woodNames[0]} sapling`], 'block', ['natural', 'plant']);
      addVanilla(`transport.${woodId}.boat`, `minecraft:${woodId}_boat`, `${woodName}船`, [`${woodName}船`, `${woodNames[0]} boat`], 'item', ['transport']);
      addVanilla(`transport.${woodId}.chest_boat`, `minecraft:${woodId}_chest_boat`, `${woodName}运输船`, [`${woodName}运输船`, `${woodName}箱船`, `${woodNames[0]} chest boat`], 'item', ['transport', 'storage']);
    }
  }

  const COLORS = [
    ['white', '白色', '白|白色|white'], ['orange', '橙色', '橙|橙色|orange'], ['magenta', '品红色', '品红|品紅|洋红|洋紅|magenta'],
    ['light_blue', '淡蓝色', '淡蓝|淡藍|浅蓝|淺藍|light blue'], ['yellow', '黄色', '黄|黃|黄色|黃色|yellow'], ['lime', '黄绿色', '黄绿|黃綠|酸橙|lime'],
    ['pink', '粉色', '粉|粉红|粉紅|pink'], ['gray', '灰色', '灰|灰色|gray|grey'], ['light_gray', '淡灰色', '淡灰|浅灰|淺灰|light gray|light grey'],
    ['cyan', '青色', '青|青色|cyan'], ['purple', '紫色', '紫|紫色|purple'], ['blue', '蓝色', '蓝|藍|蓝色|藍色|blue'],
    ['brown', '棕色', '棕|棕色|褐色|brown'], ['green', '绿色', '绿|綠|绿色|綠色|green'], ['red', '红色', '红|紅|红色|紅色|red'],
    ['black', '黑色', '黑|黑色|black']
  ];
  const COLOR_PARTS = [
    ['wool', '羊毛', '羊毛|wool', 'block'], ['carpet', '地毯', '地毯|carpet', 'block'], ['concrete', '混凝土', '混凝土|concrete', 'block'],
    ['concrete_powder', '混凝土粉末', '混凝土粉末|concrete powder', 'block'], ['terracotta', '陶瓦', '陶瓦|terracotta', 'block'],
    ['glazed_terracotta', '带釉陶瓦', '带釉陶瓦|帶釉陶瓦|glazed terracotta', 'block'], ['stained_glass', '染色玻璃', '染色玻璃|stained glass', 'block'],
    ['stained_glass_pane', '染色玻璃板', '染色玻璃板|stained glass pane', 'block'], ['bed', '床', '床|bed', 'block'],
    ['candle', '蜡烛', '蜡烛|蠟燭|candle', 'block'], ['banner', '旗帜', '旗帜|旗幟|banner', 'item'], ['shulker_box', '潜影盒', '潜影盒|潛影盒|shulker box', 'block']
  ];
  for (const [colorId, colorName, colorAliases] of COLORS) {
    const colorNames = splitAliases(colorAliases);
    for (const [partId, partName, partAliases, kind] of COLOR_PARTS) {
      const aliases = [];
      for (const colorAlias of [colorName, ...colorNames]) for (const partAlias of splitAliases(partAliases)) aliases.push(`${colorAlias}${partAlias}`, `${colorAlias} ${partAlias}`);
      addVanilla(`color.${colorId}.${partId}`, `minecraft:${colorId}_${partId}`, `${colorName}${partName}`, aliases, kind, ['colored', kind === 'block' ? 'placeable' : 'item']);
    }
  }

  const BLOCKS = [
    ['chest', 'minecraft:chest', '箱子', '箱子|木箱|储物箱|儲物箱|chest', ['storage','container']],
    ['trapped_chest', 'minecraft:trapped_chest', '陷阱箱', '陷阱箱|陷阱箱子|trapped chest', ['storage','redstone']],
    ['ender_chest', 'minecraft:ender_chest', '末影箱', '末影箱|末影箱子|ender chest', ['storage','container']],
    ['barrel', 'minecraft:barrel', '木桶', '木桶|储物桶|儲物桶|barrel', ['storage','container']],
    ['crafting_table', 'minecraft:crafting_table', '工作台', '工作台|合成台|crafting table|workbench', ['workstation']],
    ['furnace', 'minecraft:furnace', '熔炉', '熔炉|熔爐|火炉|火爐|furnace', ['workstation','machine']],
    ['blast_furnace', 'minecraft:blast_furnace', '高炉', '高炉|高爐|blast furnace', ['workstation','machine']],
    ['smoker', 'minecraft:smoker', '烟熏炉', '烟熏炉|煙燻爐|smoker', ['workstation','machine']],
    ['stonecutter', 'minecraft:stonecutter', '切石机', '切石机|切石機|stonecutter', ['workstation']],
    ['smithing_table', 'minecraft:smithing_table', '锻造台', '锻造台|鍛造台|smithing table', ['workstation']],
    ['cartography_table', 'minecraft:cartography_table', '制图台', '制图台|製圖台|cartography table', ['workstation']],
    ['fletching_table', 'minecraft:fletching_table', '制箭台', '制箭台|fletching table', ['workstation']],
    ['loom', 'minecraft:loom', '织布机', '织布机|織布機|loom', ['workstation']],
    ['grindstone', 'minecraft:grindstone', '砂轮', '砂轮|砂輪|grindstone', ['workstation']],
    ['anvil', 'minecraft:anvil', '铁砧', '铁砧|鐵砧|anvil', ['workstation']],
    ['enchanting_table', 'minecraft:enchanting_table', '附魔台', '附魔台|enchanting table', ['workstation','magic']],
    ['brewing_stand', 'minecraft:brewing_stand', '酿造台', '酿造台|釀造台|brewing stand', ['workstation','magic']],
    ['cauldron', 'minecraft:cauldron', '炼药锅', '炼药锅|煉藥鍋|锅釜|cauldron', ['workstation']],
    ['beacon', 'minecraft:beacon', '信标', '信标|信標|beacon', ['magic']],
    ['conduit', 'minecraft:conduit', '潮涌核心', '潮涌核心|海洋核心|conduit', ['magic']],
    ['respawn_anchor', 'minecraft:respawn_anchor', '重生锚', '重生锚|重生錨|respawn anchor', ['utility']],
    ['lodestone', 'minecraft:lodestone', '磁石', '磁石|lodestone', ['utility']],
    ['jukebox', 'minecraft:jukebox', '唱片机', '唱片机|唱片機|jukebox', ['music']],
    ['note_block', 'minecraft:note_block', '音符盒', '音符盒|note block', ['music','redstone']],
    ['lectern', 'minecraft:lectern', '讲台', '讲台|講台|lectern', ['workstation']],
    ['composter', 'minecraft:composter', '堆肥桶', '堆肥桶|composter', ['workstation']],
    ['beehive', 'minecraft:beehive', '蜂箱', '蜂箱|beehive', ['utility']],
    ['bee_nest', 'minecraft:bee_nest', '蜂巢', '蜂巢|bee nest', ['natural']],
    ['campfire', 'minecraft:campfire', '营火', '营火|營火|篝火|campfire', ['utility']],
    ['soul_campfire', 'minecraft:soul_campfire', '灵魂营火', '灵魂营火|靈魂營火|soul campfire', ['utility']],
    ['bookshelf', 'minecraft:bookshelf', '书架', '书架|書架|bookshelf|bookcase', ['decoration']],
    ['chiseled_bookshelf', 'minecraft:chiseled_bookshelf', '雕纹书架', '雕纹书架|雕紋書架|chiseled bookshelf', ['storage','decoration']],
    ['decorated_pot', 'minecraft:decorated_pot', '饰纹陶罐', '饰纹陶罐|飾紋陶罐|decorated pot', ['decoration']],
    ['flower_pot', 'minecraft:flower_pot', '花盆', '花盆|flower pot', ['decoration']],
    ['bell', 'minecraft:bell', '钟', '钟|鐘|村庄钟|村莊鐘|bell', ['utility']],
    ['dragon_egg', 'minecraft:dragon_egg', '龙蛋', '龙蛋|龍蛋|dragon egg', ['special']],
    ['tnt', 'minecraft:tnt', 'TNT', 'tnt|炸药|炸藥', ['redstone']],
    ['hopper', 'minecraft:hopper', '漏斗', '漏斗|hopper', ['redstone','automation','storage']],
    ['dispenser', 'minecraft:dispenser', '发射器', '发射器|發射器|dispenser', ['redstone']],
    ['dropper', 'minecraft:dropper', '投掷器', '投掷器|投擲器|dropper', ['redstone']],
    ['observer', 'minecraft:observer', '侦测器', '侦测器|偵測器|observer', ['redstone']],
    ['piston', 'minecraft:piston', '活塞', '活塞|piston', ['redstone']],
    ['sticky_piston', 'minecraft:sticky_piston', '黏性活塞', '黏性活塞|粘性活塞|sticky piston', ['redstone']],
    ['redstone_lamp', 'minecraft:redstone_lamp', '红石灯', '红石灯|紅石燈|redstone lamp', ['redstone','decoration']],
    ['daylight_detector', 'minecraft:daylight_detector', '阳光探测器', '阳光探测器|陽光探測器|daylight detector', ['redstone']],
    ['target', 'minecraft:target', '标靶', '标靶|標靶|target block', ['redstone']],
    ['lever', 'minecraft:lever', '拉杆', '拉杆|拉桿|lever', ['redstone']],
    ['repeater', 'minecraft:repeater', '红石中继器', '红石中继器|紅石中繼器|repeater', ['redstone']],
    ['comparator', 'minecraft:comparator', '红石比较器', '红石比较器|紅石比較器|comparator', ['redstone']],
    ['tripwire_hook', 'minecraft:tripwire_hook', '绊线钩', '绊线钩|絆線鉤|tripwire hook', ['redstone']],
    ['rail', 'minecraft:rail', '铁轨', '铁轨|鐵軌|rail', ['transport']],
    ['powered_rail', 'minecraft:powered_rail', '动力铁轨', '动力铁轨|動力鐵軌|powered rail', ['transport','redstone']],
    ['detector_rail', 'minecraft:detector_rail', '探测铁轨', '探测铁轨|探測鐵軌|detector rail', ['transport','redstone']],
    ['activator_rail', 'minecraft:activator_rail', '激活铁轨', '激活铁轨|啟動鐵軌|activator rail', ['transport','redstone']]
  ];
  for (const [id, minecraftId, name, aliases, tags] of BLOCKS) addVanilla(`block.${id}`, minecraftId, name, aliases, 'block', ['placeable', ...tags]);

  const GENERIC_BASICS = [
    ['generic_bed','minecraft:white_bed','床','床|普通床|bed','block',['placeable','sleep']],
    ['generic_shulker_box','minecraft:shulker_box','潜影盒','潜影盒|潛影盒|shulker box','block',['placeable','storage']],
    ['generic_door','minecraft:oak_door','门','门|門|木门|木門|door','block',['placeable','door']],
    ['generic_trapdoor','minecraft:oak_trapdoor','活板门','活板门|活板門|trapdoor','block',['placeable','door']],
    ['generic_fence','minecraft:oak_fence','栅栏','栅栏|柵欄|fence','block',['placeable']],
    ['generic_fence_gate','minecraft:oak_fence_gate','栅栏门','栅栏门|柵欄門|fence gate','block',['placeable']],
    ['generic_stairs','minecraft:stone_stairs','楼梯','楼梯|樓梯|stairs','block',['placeable','building']],
    ['generic_slab','minecraft:stone_slab','台阶','台阶|臺階|半砖|半磚|slab','block',['placeable','building']],
    ['generic_wall','minecraft:cobblestone_wall','墙','墙|牆|矮墙|矮牆|wall','block',['placeable','building']],
    ['torch','minecraft:torch','火把','火把|torch','block',['placeable','light']],
    ['soul_torch','minecraft:soul_torch','灵魂火把','灵魂火把|靈魂火把|soul torch','block',['placeable','light']],
    ['lantern','minecraft:lantern','灯笼','灯笼|燈籠|lantern','block',['placeable','light']],
    ['soul_lantern','minecraft:soul_lantern','灵魂灯笼','灵魂灯笼|靈魂燈籠|soul lantern','block',['placeable','light']],
    ['glowstone','minecraft:glowstone','萤石','萤石|螢石|glowstone','block',['placeable','light']],
    ['sea_lantern','minecraft:sea_lantern','海晶灯','海晶灯|海晶燈|sea lantern','block',['placeable','light']],
    ['end_rod','minecraft:end_rod','末地烛','末地烛|末地燭|end rod','block',['placeable','light']],
    ['jack_o_lantern','minecraft:jack_o_lantern','南瓜灯','南瓜灯|南瓜燈|jack o lantern','block',['placeable','light']],
    ['ladder','minecraft:ladder','梯子','梯子|ladder','block',['placeable']],
    ['scaffolding','minecraft:scaffolding','脚手架','脚手架|腳手架|scaffolding','block',['placeable']],
    ['chain','minecraft:chain','锁链','锁链|鎖鏈|chain','block',['placeable','decoration']],
    ['cobweb','minecraft:cobweb','蜘蛛网','蜘蛛网|蜘蛛網|cobweb','block',['placeable']],
    ['sponge','minecraft:sponge','海绵','海绵|海綿|sponge','block',['placeable']],
    ['wet_sponge','minecraft:wet_sponge','湿海绵','湿海绵|濕海綿|wet sponge','block',['placeable']],
    ['slime_block','minecraft:slime_block','黏液块','黏液块|黏液塊|slime block','block',['placeable','redstone']],
    ['honey_block','minecraft:honey_block','蜂蜜块','蜂蜜块|蜂蜜塊|honey block','block',['placeable','redstone']],
    ['potion','minecraft:potion','药水','药水|藥水|potion','item',['potion']],
    ['splash_potion','minecraft:splash_potion','喷溅药水','喷溅药水|噴濺藥水|splash potion','item',['potion']],
    ['lingering_potion','minecraft:lingering_potion','滞留药水','滞留药水|滯留藥水|lingering potion','item',['potion']],
    ['arrow','minecraft:arrow','箭','箭|箭矢|arrow','item',['ammo']],
    ['spectral_arrow','minecraft:spectral_arrow','光灵箭','光灵箭|光靈箭|spectral arrow','item',['ammo']],
    ['tipped_arrow','minecraft:tipped_arrow','药箭','药箭|藥箭|tipped arrow','item',['ammo','potion']],
    ['snowball','minecraft:snowball','雪球','雪球|snowball','item',['projectile']],
    ['egg','minecraft:egg','鸡蛋','鸡蛋|雞蛋|egg','item',['projectile','food']],
    ['fire_charge','minecraft:fire_charge','火焰弹','火焰弹|火焰彈|fire charge','item',['projectile']],
    ['oak_sapling_generic','minecraft:oak_sapling','树苗','树苗|樹苗|sapling','block',['plant','natural']],
    ['short_grass','minecraft:grass','草','草|草丛|草叢|grass','block',['plant','natural']],
    ['fern','minecraft:fern','蕨','蕨|蕨类|蕨類|fern','block',['plant','natural']],
    ['dandelion','minecraft:dandelion','蒲公英','蒲公英|dandelion','block',['plant','flower']],
    ['poppy','minecraft:poppy','虞美人','虞美人|红花|紅花|poppy','block',['plant','flower']],
    ['sunflower','minecraft:sunflower','向日葵','向日葵|sunflower','block',['plant','flower']],
    ['rose_bush','minecraft:rose_bush','玫瑰丛','玫瑰丛|玫瑰叢|rose bush','block',['plant','flower']],
    ['cactus','minecraft:cactus','仙人掌','仙人掌|cactus','block',['plant','natural']],
    ['sugar_cane','minecraft:sugar_cane','甘蔗','甘蔗|sugar cane','block',['plant','crop']],
    ['bamboo','minecraft:bamboo','竹子','竹子|bamboo','block',['plant','crop']],
    ['kelp','minecraft:kelp','海带','海带|海帶|kelp','block',['plant','aquatic']],
    ['lily_pad','minecraft:lily_pad','睡莲','睡莲|睡蓮|lily pad','block',['plant','aquatic']],
    ['vine','minecraft:vine','藤蔓','藤蔓|vine','block',['plant']],
    ['glow_lichen','minecraft:glow_lichen','发光地衣','发光地衣|發光地衣|glow lichen','block',['plant','light']],
    ['moss_block','minecraft:moss_block','苔藓块','苔藓块|苔蘚塊|moss block','block',['natural']],
    ['azalea','minecraft:azalea','杜鹃花丛','杜鹃花丛|杜鵑花叢|azalea','block',['plant']],
    ['flowering_azalea','minecraft:flowering_azalea','盛开的杜鹃花丛','盛开的杜鹃花丛|盛開的杜鵑花叢|flowering azalea','block',['plant','flower']],
    ['spore_blossom','minecraft:spore_blossom','孢子花','孢子花|spore blossom','block',['plant','flower']]
  ];
  for (const [id,minecraftId,name,aliases,kind,tags] of GENERIC_BASICS) addVanilla(`basic.${id}`,minecraftId,name,aliases,kind,tags);

  const BUILDING = [
    ['stone','minecraft:stone','石头','石头|石頭|stone'], ['cobblestone','minecraft:cobblestone','圆石','圆石|圓石|cobblestone'],
    ['mossy_cobblestone','minecraft:mossy_cobblestone','苔石','苔石|mossy cobblestone'], ['stone_bricks','minecraft:stone_bricks','石砖','石砖|石磚|stone bricks'],
    ['deepslate','minecraft:deepslate','深板岩','深板岩|deepslate'], ['cobbled_deepslate','minecraft:cobbled_deepslate','深板岩圆石','深板岩圆石|cobbled deepslate'],
    ['granite','minecraft:granite','花岗岩','花岗岩|花崗岩|granite'], ['diorite','minecraft:diorite','闪长岩','闪长岩|閃長岩|diorite'],
    ['andesite','minecraft:andesite','安山岩','安山岩|andesite'], ['tuff','minecraft:tuff','凝灰岩','凝灰岩|tuff'],
    ['calcite','minecraft:calcite','方解石','方解石|calcite'], ['dripstone_block','minecraft:dripstone_block','滴水石块','滴水石块|滴水石塊|dripstone block'],
    ['bricks','minecraft:bricks','红砖块','红砖块|紅磚塊|bricks'], ['mud_bricks','minecraft:mud_bricks','泥砖','泥砖|泥磚|mud bricks'],
    ['sandstone','minecraft:sandstone','砂岩','砂岩|sandstone'], ['red_sandstone','minecraft:red_sandstone','红砂岩','红砂岩|紅砂岩|red sandstone'],
    ['quartz_block','minecraft:quartz_block','石英块','石英块|石英塊|quartz block'], ['prismarine','minecraft:prismarine','海晶石','海晶石|prismarine'],
    ['dark_prismarine','minecraft:dark_prismarine','暗海晶石','暗海晶石|dark prismarine'], ['blackstone','minecraft:blackstone','黑石','黑石|blackstone'],
    ['basalt','minecraft:basalt','玄武岩','玄武岩|basalt'], ['end_stone','minecraft:end_stone','末地石','末地石|end stone'],
    ['purpur_block','minecraft:purpur_block','紫珀块','紫珀块|紫珀塊|purpur block'], ['obsidian','minecraft:obsidian','黑曜石','黑曜石|obsidian'],
    ['crying_obsidian','minecraft:crying_obsidian','哭泣的黑曜石','哭泣黑曜石|crying obsidian'], ['glass','minecraft:glass','玻璃','玻璃|glass'],
    ['ice','minecraft:ice','冰','冰块|冰塊|ice'], ['packed_ice','minecraft:packed_ice','浮冰','浮冰|packed ice'], ['blue_ice','minecraft:blue_ice','蓝冰','蓝冰|藍冰|blue ice'],
    ['snow_block','minecraft:snow_block','雪块','雪块|雪塊|snow block'], ['clay','minecraft:clay','黏土块','黏土块|黏土塊|clay block'],
    ['dirt','minecraft:dirt','泥土','泥土|dirt'], ['grass_block','minecraft:grass_block','草方块','草方块|草方塊|grass block'],
    ['sand','minecraft:sand','沙子','沙子|sand'], ['gravel','minecraft:gravel','沙砾','沙砾|沙礫|gravel'], ['netherrack','minecraft:netherrack','下界岩','下界岩|netherrack'],
    ['soul_sand','minecraft:soul_sand','灵魂沙','灵魂沙|靈魂沙|soul sand'], ['magma_block','minecraft:magma_block','岩浆块','岩浆块|岩漿塊|magma block']
  ];
  for (const [id, minecraftId, name, aliases] of BUILDING) addVanilla(`building.${id}`, minecraftId, name, aliases, 'block', ['building','placeable']);

  const ORES = [
    ['coal_ore','minecraft:coal_ore','煤矿石','煤矿石|煤礦石|coal ore'], ['iron_ore','minecraft:iron_ore','铁矿石','铁矿石|鐵礦石|iron ore'],
    ['copper_ore','minecraft:copper_ore','铜矿石','铜矿石|銅礦石|copper ore'], ['gold_ore','minecraft:gold_ore','金矿石','金矿石|金礦石|gold ore'],
    ['redstone_ore','minecraft:redstone_ore','红石矿石','红石矿石|紅石礦石|redstone ore'], ['lapis_ore','minecraft:lapis_ore','青金石矿石','青金石矿石|青金石礦石|lapis ore'],
    ['diamond_ore','minecraft:diamond_ore','钻石矿石','钻石矿石|鑽石礦石|diamond ore'], ['emerald_ore','minecraft:emerald_ore','绿宝石矿石','绿宝石矿石|綠寶石礦石|emerald ore'],
    ['nether_gold_ore','minecraft:nether_gold_ore','下界金矿石','下界金矿石|下界金礦石|nether gold ore'], ['nether_quartz_ore','minecraft:nether_quartz_ore','下界石英矿石','下界石英矿石|下界石英礦石|nether quartz ore'],
    ['ancient_debris','minecraft:ancient_debris','远古残骸','远古残骸|遠古遺骸|ancient debris'], ['raw_iron','minecraft:raw_iron','粗铁','粗铁|粗鐵|raw iron'],
    ['raw_copper','minecraft:raw_copper','粗铜','粗铜|粗銅|raw copper'], ['raw_gold','minecraft:raw_gold','粗金','粗金|raw gold']
  ];
  for (const [id,minecraftId,name,aliases] of ORES) addVanilla(`ore.${id}`,minecraftId,name,aliases,id.startsWith('raw_')?'item':'block',['ore','resource']);

  const ITEMS = [
    ['stick','minecraft:stick','木棍','木棍|棍子|stick'], ['coal','minecraft:coal','煤炭','煤炭|煤|coal'], ['charcoal','minecraft:charcoal','木炭','木炭|charcoal'],
    ['iron_ingot','minecraft:iron_ingot','铁锭','铁锭|鐵錠|iron ingot'], ['gold_ingot','minecraft:gold_ingot','金锭','金锭|金錠|gold ingot'],
    ['copper_ingot','minecraft:copper_ingot','铜锭','铜锭|銅錠|copper ingot'], ['netherite_ingot','minecraft:netherite_ingot','下界合金锭','下界合金锭|下界合金錠|netherite ingot'],
    ['diamond','minecraft:diamond','钻石','钻石|鑽石|diamond'], ['emerald','minecraft:emerald','绿宝石','绿宝石|綠寶石|emerald'],
    ['lapis_lazuli','minecraft:lapis_lazuli','青金石','青金石|lapis lazuli|lapis'], ['redstone','minecraft:redstone','红石粉','红石粉|紅石粉|redstone dust|redstone'],
    ['quartz','minecraft:quartz','下界石英','下界石英|quartz'], ['amethyst_shard','minecraft:amethyst_shard','紫水晶碎片','紫水晶碎片|amethyst shard'],
    ['echo_shard','minecraft:echo_shard','回响碎片','回响碎片|回響碎片|echo shard'], ['nether_star','minecraft:nether_star','下界之星','下界之星|nether star'],
    ['ender_pearl','minecraft:ender_pearl','末影珍珠','末影珍珠|ender pearl'], ['ender_eye','minecraft:ender_eye','末影之眼','末影之眼|eye of ender|ender eye'],
    ['blaze_rod','minecraft:blaze_rod','烈焰棒','烈焰棒|blaze rod'], ['blaze_powder','minecraft:blaze_powder','烈焰粉','烈焰粉|blaze powder'],
    ['ghast_tear','minecraft:ghast_tear','恶魂之泪','恶魂之泪|惡魂之淚|ghast tear'], ['slime_ball','minecraft:slime_ball','黏液球','黏液球|slimeball|slime ball'],
    ['magma_cream','minecraft:magma_cream','岩浆膏','岩浆膏|岩漿膏|magma cream'], ['phantom_membrane','minecraft:phantom_membrane','幻翼膜','幻翼膜|phantom membrane'],
    ['prismarine_shard','minecraft:prismarine_shard','海晶碎片','海晶碎片|prismarine shard'], ['nautilus_shell','minecraft:nautilus_shell','鹦鹉螺壳','鹦鹉螺壳|鸚鵡螺殼|nautilus shell'],
    ['heart_of_the_sea','minecraft:heart_of_the_sea','海洋之心','海洋之心|heart of the sea'], ['scute','minecraft:scute','鳞甲','鳞甲|鱗甲|scute'],
    ['leather','minecraft:leather','皮革','皮革|leather'], ['rabbit_hide','minecraft:rabbit_hide','兔子皮','兔子皮|rabbit hide'],
    ['feather','minecraft:feather','羽毛','羽毛|feather'], ['string','minecraft:string','线','线|線|string'], ['bone','minecraft:bone','骨头','骨头|骨頭|bone'],
    ['gunpowder','minecraft:gunpowder','火药','火药|火藥|gunpowder'], ['paper','minecraft:paper','纸','纸|紙|paper'], ['book','minecraft:book','书','书本|書本|book'],
    ['written_book','minecraft:written_book','成书','成书|成書|written book'], ['name_tag','minecraft:name_tag','命名牌','命名牌|name tag'],
    ['lead','minecraft:lead','拴绳','拴绳|拴繩|lead'], ['saddle','minecraft:saddle','鞍','马鞍|馬鞍|saddle'], ['bucket','minecraft:bucket','桶','铁桶|鐵桶|bucket'],
    ['water_bucket','minecraft:water_bucket','水桶','水桶|water bucket'], ['lava_bucket','minecraft:lava_bucket','岩浆桶','岩浆桶|岩漿桶|lava bucket'],
    ['milk_bucket','minecraft:milk_bucket','奶桶','奶桶|milk bucket'], ['powder_snow_bucket','minecraft:powder_snow_bucket','细雪桶','细雪桶|細雪桶|powder snow bucket'],
    ['glass_bottle','minecraft:glass_bottle','玻璃瓶','玻璃瓶|glass bottle'], ['experience_bottle','minecraft:experience_bottle','附魔之瓶','附魔之瓶|经验瓶|經驗瓶|experience bottle'],
    ['firework_rocket','minecraft:firework_rocket','烟花火箭','烟花火箭|煙火火箭|firework rocket'], ['firework_star','minecraft:firework_star','烟火之星','烟火之星|煙火之星|firework star'],
    ['totem_of_undying','minecraft:totem_of_undying','不死图腾','不死图腾|不死圖騰|totem of undying'], ['elytra','minecraft:elytra','鞘翅','鞘翅|elytra'],
    ['spyglass','minecraft:spyglass','望远镜','望远镜|望遠鏡|spyglass'], ['compass','minecraft:compass','指南针','指南针|指南針|compass'],
    ['recovery_compass','minecraft:recovery_compass','追溯指针','追溯指针|追溯指針|recovery compass'], ['clock','minecraft:clock','时钟','时钟|時鐘|clock'],
    ['map','minecraft:map','地图','地图|地圖|map'], ['filled_map','minecraft:filled_map','已填充地图','已填充地图|已填充地圖|filled map'],
    ['music_disc_13','minecraft:music_disc_13','音乐唱片','音乐唱片|音樂唱片|music disc'], ['goat_horn','minecraft:goat_horn','山羊角','山羊角|goat horn'],
    ['brush','minecraft:brush','刷子','刷子|brush'], ['shears','minecraft:shears','剪刀','剪刀|shears'], ['flint_and_steel','minecraft:flint_and_steel','打火石','打火石|flint and steel'],
    ['fishing_rod','minecraft:fishing_rod','钓鱼竿','钓鱼竿|釣魚竿|fishing rod'], ['carrot_on_a_stick','minecraft:carrot_on_a_stick','胡萝卜钓竿','胡萝卜钓竿|胡蘿蔔釣竿|carrot on a stick'],
    ['warped_fungus_on_a_stick','minecraft:warped_fungus_on_a_stick','诡异菌钓竿','诡异菌钓竿|詭異菌釣竿|warped fungus on a stick'],
    ['armor_stand','minecraft:armor_stand','盔甲架','盔甲架|armor stand'], ['item_frame','minecraft:item_frame','物品展示框','物品展示框|item frame'],
    ['glow_item_frame','minecraft:glow_item_frame','荧光物品展示框','荧光物品展示框|螢光物品展示框|glow item frame'], ['painting','minecraft:painting','画','画|畫|painting']
  ];
  for (const [id, minecraftId, name, aliases] of ITEMS) addVanilla(`item.${id}`, minecraftId, name, aliases, 'item', ['item']);

  const MATERIALS = [
    ['wooden','木','木质|木質|木制|wooden'], ['stone','石','石质|石質|石制|stone'], ['iron','铁','铁质|鐵質|铁制|鐵製|iron'],
    ['golden','金','金质|金質|金制|golden|gold'], ['diamond','钻石','钻石|鑽石|diamond'], ['netherite','下界合金','下界合金|netherite']
  ];
  const TOOLS = [
    ['sword','剑','剑|劍|长剑|長劍|sword'], ['pickaxe','镐','镐子|鎬子|pickaxe'], ['axe','斧','斧头|斧頭|axe'],
    ['shovel','锹','铲子|鏟子|锹|鍬|shovel'], ['hoe','锄','锄头|鋤頭|hoe']
  ];
  for (const [materialId, materialName, materialAliases] of MATERIALS) {
    for (const [toolId, toolName, toolAliases] of TOOLS) {
      const aliases = [];
      for (const materialAlias of [materialName, ...splitAliases(materialAliases)]) for (const toolAlias of splitAliases(toolAliases)) aliases.push(`${materialAlias}${toolAlias}`, `${materialAlias} ${toolAlias}`);
      addVanilla(`tool.${materialId}.${toolId}`, `minecraft:${materialId}_${toolId}`, `${materialName}${toolName}`, aliases, 'item', ['tool', toolId === 'sword' || toolId === 'axe' ? 'weapon' : 'utility']);
    }
  }
  const SPECIAL_WEAPONS = [
    ['bow','minecraft:bow','弓','弓|长弓|長弓|bow'], ['crossbow','minecraft:crossbow','弩','弩|弩弓|crossbow'], ['trident','minecraft:trident','三叉戟','三叉戟|trident'],
    ['shield','minecraft:shield','盾牌','盾牌|盾|shield'], ['mace','minecraft:mace','重锤','重锤|重錘|mace']
  ];
  for (const [id, minecraftId, name, aliases] of SPECIAL_WEAPONS) addVanilla(`weapon.${id}`, minecraftId, name, aliases, 'item', ['weapon']);

  const ARMOR_MATERIALS = [
    ['leather','皮革','皮革|leather'], ['chainmail','锁链','锁链|鎖鏈|chainmail'], ['iron','铁','铁|鐵|iron'], ['golden','金','金|golden|gold'],
    ['diamond','钻石','钻石|鑽石|diamond'], ['netherite','下界合金','下界合金|netherite']
  ];
  const ARMOR_PARTS = [
    ['helmet','头盔','头盔|頭盔|helmet'], ['chestplate','胸甲','胸甲|chestplate'], ['leggings','护腿','护腿|護腿|leggings'], ['boots','靴子','靴子|boots']
  ];
  for (const [materialId, materialName, materialAliases] of ARMOR_MATERIALS) {
    for (const [partId, partName, partAliases] of ARMOR_PARTS) {
      const aliases = [];
      for (const materialAlias of [materialName, ...splitAliases(materialAliases)]) for (const partAlias of splitAliases(partAliases)) aliases.push(`${materialAlias}${partAlias}`, `${materialAlias} ${partAlias}`);
      addVanilla(`armor.${materialId}.${partId}`, `minecraft:${materialId}_${partId}`, `${materialName}${partName}`, aliases, 'item', ['armor','equipment']);
    }
  }
  addVanilla('armor.turtle_helmet','minecraft:turtle_helmet','海龟壳','海龟壳|海龜殼|turtle helmet','item',['armor']);

  const FOOD = [
    ['apple','minecraft:apple','苹果','苹果|蘋果|apple'], ['golden_apple','minecraft:golden_apple','金苹果','金苹果|金蘋果|golden apple'],
    ['enchanted_golden_apple','minecraft:enchanted_golden_apple','附魔金苹果','附魔金苹果|附魔金蘋果|enchanted golden apple|god apple'],
    ['bread','minecraft:bread','面包','面包|麵包|bread'], ['cookie','minecraft:cookie','曲奇','曲奇|饼干|餅乾|cookie'], ['cake','minecraft:cake','蛋糕','蛋糕|cake'],
    ['pumpkin_pie','minecraft:pumpkin_pie','南瓜派','南瓜派|pumpkin pie'], ['carrot','minecraft:carrot','胡萝卜','胡萝卜|胡蘿蔔|carrot'],
    ['golden_carrot','minecraft:golden_carrot','金胡萝卜','金胡萝卜|金胡蘿蔔|golden carrot'], ['potato','minecraft:potato','马铃薯','马铃薯|馬鈴薯|土豆|potato'],
    ['baked_potato','minecraft:baked_potato','烤马铃薯','烤马铃薯|烤馬鈴薯|baked potato'], ['poisonous_potato','minecraft:poisonous_potato','毒马铃薯','毒马铃薯|毒馬鈴薯|poisonous potato'],
    ['beetroot','minecraft:beetroot','甜菜根','甜菜根|beetroot'], ['beetroot_soup','minecraft:beetroot_soup','甜菜汤','甜菜汤|甜菜湯|beetroot soup'],
    ['melon_slice','minecraft:melon_slice','西瓜片','西瓜片|melon slice'], ['sweet_berries','minecraft:sweet_berries','甜浆果','甜浆果|甜漿果|sweet berries'],
    ['glow_berries','minecraft:glow_berries','发光浆果','发光浆果|發光漿果|glow berries'], ['chorus_fruit','minecraft:chorus_fruit','紫颂果','紫颂果|紫頌果|chorus fruit'],
    ['beef','minecraft:beef','生牛肉','生牛肉|raw beef'], ['cooked_beef','minecraft:cooked_beef','牛排','牛排|steak|cooked beef'],
    ['porkchop','minecraft:porkchop','生猪排','生猪排|生豬排|raw porkchop'], ['cooked_porkchop','minecraft:cooked_porkchop','熟猪排','熟猪排|熟豬排|cooked porkchop'],
    ['chicken','minecraft:chicken','生鸡肉','生鸡肉|生雞肉|raw chicken'], ['cooked_chicken','minecraft:cooked_chicken','熟鸡肉','熟鸡肉|熟雞肉|cooked chicken'],
    ['mutton','minecraft:mutton','生羊肉','生羊肉|raw mutton'], ['cooked_mutton','minecraft:cooked_mutton','熟羊肉','熟羊肉|cooked mutton'],
    ['rabbit','minecraft:rabbit','生兔肉','生兔肉|raw rabbit'], ['cooked_rabbit','minecraft:cooked_rabbit','熟兔肉','熟兔肉|cooked rabbit'],
    ['rabbit_stew','minecraft:rabbit_stew','兔肉煲','兔肉煲|rabbit stew'], ['cod','minecraft:cod','生鳕鱼','生鳕鱼|生鱈魚|raw cod'],
    ['cooked_cod','minecraft:cooked_cod','熟鳕鱼','熟鳕鱼|熟鱈魚|cooked cod'], ['salmon','minecraft:salmon','生鲑鱼','生鲑鱼|生鮭魚|raw salmon'],
    ['cooked_salmon','minecraft:cooked_salmon','熟鲑鱼','熟鲑鱼|熟鮭魚|cooked salmon'], ['tropical_fish','minecraft:tropical_fish','热带鱼','热带鱼|熱帶魚|tropical fish'],
    ['pufferfish','minecraft:pufferfish','河豚','河豚|pufferfish'], ['dried_kelp','minecraft:dried_kelp','干海带','干海带|乾海帶|dried kelp'],
    ['mushroom_stew','minecraft:mushroom_stew','蘑菇煲','蘑菇煲|mushroom stew'], ['suspicious_stew','minecraft:suspicious_stew','迷之炖菜','迷之炖菜|迷之燉菜|suspicious stew'],
    ['honey_bottle','minecraft:honey_bottle','蜂蜜瓶','蜂蜜瓶|honey bottle'], ['rotten_flesh','minecraft:rotten_flesh','腐肉','腐肉|rotten flesh'],
    ['spider_eye','minecraft:spider_eye','蜘蛛眼','蜘蛛眼|spider eye']
  ];
  for (const [id, minecraftId, name, aliases] of FOOD) addVanilla(`food.${id}`, minecraftId, name, aliases, 'item', ['food']);

  const TRANSPORT = [
    ['minecart','minecraft:minecart','矿车','矿车|礦車|minecart'], ['chest_minecart','minecraft:chest_minecart','运输矿车','运输矿车|運輸礦車|chest minecart'],
    ['furnace_minecart','minecraft:furnace_minecart','动力矿车','动力矿车|動力礦車|furnace minecart'], ['hopper_minecart','minecraft:hopper_minecart','漏斗矿车','漏斗矿车|漏斗礦車|hopper minecart'],
    ['tnt_minecart','minecraft:tnt_minecart','TNT矿车','tnt矿车|tnt礦車|tnt minecart']
  ];
  for (const [id, minecraftId, name, aliases] of TRANSPORT) addVanilla(`transport.${id}`, minecraftId, name, aliases, 'item', ['transport']);

  const MOBS = [
    ['allay','minecraft:allay','悦灵','悦灵|悅靈|allay',false], ['axolotl','minecraft:axolotl','美西螈','美西螈|六角恐龙|六角恐龍|axolotl',false],
    ['bat','minecraft:bat','蝙蝠','蝙蝠|bat',false], ['bee','minecraft:bee','蜜蜂','蜜蜂|bee',false], ['camel','minecraft:camel','骆驼','骆驼|駱駝|camel',false],
    ['cat','minecraft:cat','猫','猫|貓|cat',false], ['chicken','minecraft:chicken','鸡','鸡|雞|chicken',false], ['cod','minecraft:cod','鳕鱼','鳕鱼|鱈魚|cod',false],
    ['cow','minecraft:cow','牛','牛|奶牛|cow',false], ['dolphin','minecraft:dolphin','海豚','海豚|dolphin',false], ['donkey','minecraft:donkey','驴','驴|驢|donkey',false],
    ['fox','minecraft:fox','狐狸','狐狸|fox',false], ['frog','minecraft:frog','青蛙','青蛙|frog',false], ['glow_squid','minecraft:glow_squid','发光鱿鱼','发光鱿鱼|發光魷魚|glow squid',false],
    ['goat','minecraft:goat','山羊','山羊|goat',false], ['horse','minecraft:horse','马','马|馬|horse',false], ['llama','minecraft:llama','羊驼','羊驼|羊駝|llama',false],
    ['mooshroom','minecraft:mooshroom','哞菇','哞菇|蘑菇牛|mooshroom',false], ['mule','minecraft:mule','骡','骡|騾|mule',false], ['ocelot','minecraft:ocelot','豹猫','豹猫|豹貓|ocelot',false],
    ['panda','minecraft:panda','熊猫','熊猫|熊貓|panda',false], ['parrot','minecraft:parrot','鹦鹉','鹦鹉|鸚鵡|parrot',false], ['pig','minecraft:pig','猪','猪|豬|pig',false],
    ['polar_bear','minecraft:polar_bear','北极熊','北极熊|北極熊|polar bear',false], ['pufferfish','minecraft:pufferfish','河豚','河豚|pufferfish',false],
    ['rabbit','minecraft:rabbit','兔子','兔子|rabbit',false], ['salmon','minecraft:salmon','鲑鱼','鲑鱼|鮭魚|salmon',false], ['sheep','minecraft:sheep','羊','羊|绵羊|綿羊|sheep',false],
    ['sniffer','minecraft:sniffer','嗅探兽','嗅探兽|嗅探獸|sniffer',false], ['snow_golem','minecraft:snow_golem','雪傀儡','雪傀儡|snow golem',false],
    ['squid','minecraft:squid','鱿鱼','鱿鱼|魷魚|squid',false], ['strider','minecraft:strider','炽足兽','炽足兽|熾足獸|strider',false], ['tadpole','minecraft:tadpole','蝌蚪','蝌蚪|tadpole',false],
    ['tropical_fish','minecraft:tropical_fish','热带鱼','热带鱼|熱帶魚|tropical fish',false], ['turtle','minecraft:turtle','海龟','海龟|海龜|turtle',false],
    ['villager','minecraft:villager','村民','村民|villager',false], ['wandering_trader','minecraft:wandering_trader','流浪商人','流浪商人|wandering trader',false],
    ['wolf','minecraft:wolf','狼','狼|wolf',false], ['zombie','minecraft:zombie','僵尸','僵尸|殭屍|zombie',true], ['husk','minecraft:husk','尸壳','尸壳|屍殼|husk',true],
    ['drowned','minecraft:drowned','溺尸','溺尸|溺屍|drowned',true], ['skeleton','minecraft:skeleton','骷髅','骷髅|骷髏|skeleton',true],
    ['stray','minecraft:stray','流浪者','流浪者|stray',true], ['wither_skeleton','minecraft:wither_skeleton','凋灵骷髅','凋灵骷髅|凋靈骷髏|wither skeleton',true],
    ['creeper','minecraft:creeper','苦力怕','苦力怕|爬行者|creeper',true], ['spider','minecraft:spider','蜘蛛','蜘蛛|spider',true],
    ['cave_spider','minecraft:cave_spider','洞穴蜘蛛','洞穴蜘蛛|cave spider',true], ['enderman','minecraft:enderman','末影人','末影人|enderman',true],
    ['endermite','minecraft:endermite','末影螨','末影螨|末影蟎|endermite',true], ['silverfish','minecraft:silverfish','蠹虫','蠹虫|蠹蟲|silverfish',true],
    ['witch','minecraft:witch','女巫','女巫|witch',true], ['slime','minecraft:slime','史莱姆','史莱姆|史萊姆|slime',true], ['magma_cube','minecraft:magma_cube','岩浆怪','岩浆怪|岩漿怪|magma cube',true],
    ['blaze','minecraft:blaze','烈焰人','烈焰人|blaze',true], ['ghast','minecraft:ghast','恶魂','恶魂|惡魂|ghast',true], ['guardian','minecraft:guardian','守卫者','守卫者|守衛者|guardian',true],
    ['elder_guardian','minecraft:elder_guardian','远古守卫者','远古守卫者|遠古守衛者|elder guardian',true,true], ['shulker','minecraft:shulker','潜影贝','潜影贝|潛影貝|shulker',true],
    ['phantom','minecraft:phantom','幻翼','幻翼|phantom',true], ['pillager','minecraft:pillager','掠夺者','掠夺者|掠奪者|pillager',true], ['vindicator','minecraft:vindicator','卫道士','卫道士|衛道士|vindicator',true],
    ['evoker','minecraft:evoker','唤魔者','唤魔者|喚魔者|evoker',true], ['ravager','minecraft:ravager','劫掠兽','劫掠兽|劫掠獸|ravager',true], ['vex','minecraft:vex','恼鬼','恼鬼|惱鬼|vex',true],
    ['hoglin','minecraft:hoglin','疣猪兽','疣猪兽|疣豬獸|hoglin',true], ['zoglin','minecraft:zoglin','僵尸疣猪兽','僵尸疣猪兽|殭屍疣豬獸|zoglin',true],
    ['piglin','minecraft:piglin','猪灵','猪灵|豬靈|piglin',true], ['piglin_brute','minecraft:piglin_brute','猪灵蛮兵','猪灵蛮兵|豬靈蠻兵|piglin brute',true],
    ['warden','minecraft:warden','监守者','监守者|監守者|warden',true,true], ['wither','minecraft:wither','凋灵','凋灵|凋靈|wither',true,true],
    ['ender_dragon','minecraft:ender_dragon','末影龙','末影龙|末影龍|ender dragon',true,true], ['iron_golem','minecraft:iron_golem','铁傀儡','铁傀儡|鐵傀儡|iron golem',false]
  ];
  for (const [id, minecraftId, name, aliases, hostile, boss] of MOBS) add({ id:`mob.${id}`, minecraftId, name, aliases:splitAliases(aliases), kind:'mob', strategy:'mob', tags:['entity', hostile ? 'hostile' : 'passive'], hostile, boss });

  const FURNITURE = [
    ['chair','椅子','椅子|座椅|chair'], ['table','桌子','桌子|餐桌|书桌|書桌|table|desk'], ['sofa','沙发','沙发|沙發|sofa|couch'],
    ['cabinet','柜子','柜子|櫃子|橱柜|櫥櫃|cabinet'], ['wardrobe','衣柜','衣柜|衣櫃|wardrobe'], ['shelf','置物架','置物架|货架|貨架|shelf'],
    ['lamp','台灯','台灯|臺燈|落地灯|落地燈|lamp'], ['fridge','冰箱','冰箱|fridge|refrigerator'], ['television','电视','电视|電視|电视机|電視機|tv|television'],
    ['computer','电脑','电脑|電腦|计算机|計算機|computer|pc'], ['toilet','马桶','马桶|馬桶|toilet'], ['bathtub','浴缸','浴缸|bathtub'],
    ['sink','水槽','水槽|洗手池|sink'], ['piano','钢琴','钢琴|鋼琴|piano'], ['statue','雕像','雕像|塑像|statue'], ['streetlight','路灯','路灯|路燈|streetlight']
  ];
  for (const [id,name,aliases] of FURNITURE) addAdvanced(`furniture.${id}`,name,aliases,'decorative',{kind:'decorative',tags:['furniture','decoration'],status:'ready'});

  const ADVANCED_STORAGE = [
    ['safe','保险箱','保险箱|保險箱|金库|金庫|safe|vault'], ['backpack','背包','背包|行囊|backpack'], ['bag','储物袋','储物袋|儲物袋|袋子|bag'],
    ['mailbox','邮箱','邮箱|郵箱|mailbox'], ['warehouse','仓库','仓库|倉庫|warehouse']
  ];
  for (const [id,name,aliases] of ADVANCED_STORAGE) addAdvanced(`storage.${id}`,name,aliases,'container',{kind:'advanced',base:'minecraft:chest',tags:['storage','container']});

  const MACHINES = [
    ['crusher','粉碎机','粉碎机|粉碎機|破碎机|破碎機|crusher'], ['grinder','研磨机','研磨机|研磨機|grinder'], ['compressor','压缩机','压缩机|壓縮機|compressor'],
    ['generator','发电机','发电机|發電機|generator'], ['reactor','核反应堆','核反应堆|核反應爐|反应堆|反應爐|nuclear reactor|reactor'],
    ['turbine','涡轮机','涡轮机|渦輪機|turbine'], ['assembler','组装机','组装机|組裝機|assembler'], ['refinery','精炼厂','精炼厂|精煉廠|refinery'],
    ['pump','泵','水泵|液体泵|液體泵|pump'], ['solar_panel','太阳能板','太阳能板|太陽能板|solar panel'], ['battery','电池箱','电池箱|電池箱|蓄电池|蓄電池|battery'],
    ['teleporter','传送机','传送机|傳送機|teleporter'], ['elevator','电梯','电梯|電梯|elevator'], ['printer','3D打印机','3d打印机|3d打印機|3d printer'],
    ['computer_machine','计算终端','计算终端|計算終端|控制台|console|terminal']
  ];
  for (const [id,name,aliases] of MACHINES) addAdvanced(`machine.${id}`,name,aliases,'machine',{kind:'advanced',tags:['machine','technology'],route:'原生机器与实体'});

  const FIREARMS = [
    ['pistol','手枪','手枪|手槍|pistol'], ['rifle','步枪','步枪|步槍|rifle'], ['shotgun','霰弹枪','霰弹枪|霰彈槍|shotgun'],
    ['sniper','狙击枪','狙击枪|狙擊槍|sniper rifle'], ['machine_gun','机枪','机枪|機槍|machine gun'], ['laser_gun','激光枪','激光枪|激光槍|镭射枪|鐳射槍|laser gun'],
    ['cannon','大炮','大炮|火炮|cannon'], ['rocket_launcher','火箭筒','火箭筒|rocket launcher'], ['flamethrower','喷火器','喷火器|噴火器|flamethrower']
  ];
  for (const [id,name,aliases] of FIREARMS) addAdvanced(`weapon.${id}`,name,aliases,'firearm',{kind:'advanced',base:'minecraft:crossbow',tags:['weapon','ranged']});

  const MAGIC = [
    ['spellbook','法术书','法术书|法術書|魔法书|魔法書|spellbook'], ['rune','符文','符文|rune'], ['altar','魔法祭坛','魔法祭坛|魔法祭壇|altar'],
    ['crystal','魔力水晶','魔力水晶|法力水晶|magic crystal|mana crystal'], ['amulet','护符','护符|護符|amulet'], ['ring','魔法戒指','魔法戒指|戒指|magic ring'],
    ['portal_core','传送核心','传送核心|傳送核心|portal core'], ['summoning_staff','召唤法杖','召唤法杖|召喚法杖|summoning staff']
  ];
  for (const [id,name,aliases] of MAGIC) addAdvanced(`magic.${id}`,name,aliases,'magic',{kind:'advanced',base:id.includes('book')?'minecraft:book':'minecraft:amethyst_shard',tags:['magic']});

  const VEHICLES = [
    ['car','汽车','汽车|汽車|轿车|轎車|car'], ['truck','卡车','卡车|卡車|truck'], ['motorcycle','摩托车','摩托车|摩托車|motorcycle'],
    ['tank','坦克','坦克|tank'], ['airplane','飞机','飞机|飛機|airplane|plane'], ['helicopter','直升机','直升机|直升機|helicopter'],
    ['rocket','火箭','火箭|rocket'], ['spaceship','宇宙飞船','宇宙飞船|宇宙飛船|太空船|spaceship'], ['train','火车','火车|火車|train'],
    ['submarine','潜艇','潜艇|潛艇|submarine'], ['mech','机甲','机甲|機甲|mech']
  ];
  for (const [id,name,aliases] of VEHICLES) addAdvanced(`vehicle.${id}`,name,aliases,'vehicle',{kind:'advanced',tags:['vehicle','decorative']});

  const FANTASY_ENTITIES = [
    ['dragon','巨龙','巨龙|巨龍|龙|龍|dragon'], ['phoenix','凤凰','凤凰|鳳凰|phoenix'], ['griffin','狮鹫','狮鹫|獅鷲|griffin'],
    ['dinosaur','恐龙','恐龙|恐龍|dinosaur'], ['alien','外星生物','外星生物|外星人|alien'], ['robot','机器人','机器人|機器人|robot'],
    ['pet','宠物','宠物|寵物|pet'], ['npc','NPC','npc|非玩家角色|任务角色|任務角色']
  ];
  for (const [id,name,aliases] of FANTASY_ENTITIES) addAdvanced(`entity.${id}`,name,aliases,'entity',{kind:'advanced',tags:['entity'],hostile:id!=='pet'&&id!=='npc'});

  const SYSTEM_CONCEPTS = [
    ['quest','任务系统','任务系统|任務系統|任务线|任務線|quest system','saved'], ['dialogue','对话系统','对话系统|對話系統|对话树|對話樹|dialogue system','saved'],
    ['economy','经济系统','经济系统|經濟系統|货币系统|貨幣系統|economy system','saved'], ['shop','商店系统','商店系统|商店系統|shop system','saved'],
    ['skill_tree','技能树','技能树|技能樹|skill tree','saved'], ['class_system','职业系统','职业系统|職業系統|class system','saved'],
    ['faction','阵营系统','阵营系统|陣營系統|faction system','saved'], ['reputation','声望系统','声望系统|聲望系統|reputation system','saved'],
    ['energy_network','能量网络','能量网络|能量網絡|电力网络|電力網絡|energy network|power grid','saved'],
    ['fluid_network','流体网络','流体网络|流體網絡|fluid network','saved'], ['pipe_network','管道网络','管道网络|管道網絡|pipe network','saved'],
    ['multiblock','多方块结构','多方块结构|多方塊結構|multiblock','saved'], ['matchmaking','匹配系统','匹配系统|匹配系統|matchmaking','unsupported'],
    ['lobby','大厅系统','大厅系统|大廳系統|lobby system','unsupported'], ['leaderboard','排行榜','排行榜|leaderboard','unsupported']
  ];
  for (const [id,name,aliases,status] of SYSTEM_CONCEPTS) addAdvanced(`system.${id}`,name,aliases,'system',{kind:'system',status,tags:['system']});

  function coreText(value) {
    return lower(value)
      .replace(/[“”"'`]/g, '')
      .replace(/^(?:请|請|麻烦|麻煩|帮我|幫我|给我|給我|我想要|我需要|please)\s*/i, '')
      .replace(/^(?:生成|创建|創建|做|制作|製作|造|添加|来|來|给|給|create|make|add)\s*/i, '')
      .replace(/^(?:一个|一個|一只|一隻|一台|一把|一件|一辆|一輛|一艘|一架|一座|一本|一张|一張|一块|一塊|一组|一組|一些|个|個|a|an)\s*/i, '')
      .replace(/[。.!！?？,，;；]+$/g, '')
      .trim();
  }

  function englishAlias(alias) {
    return /^[a-z0-9_: ./+'-]+$/i.test(alias);
  }

  function aliasMatches(source, alias) {
    const haystack = lower(source);
    const needle = lower(alias);
    if (!needle) return false;
    if (needle.startsWith('minecraft:')) return haystack.includes(needle);
    if (englishAlias(needle)) {
      const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
      return new RegExp(`(^|[^a-z0-9_])${escaped}($|[^a-z0-9_])`, 'i').test(haystack);
    }
    if ([...needle].length === 1) return coreText(haystack) === needle;
    return haystack.includes(needle);
  }

  function scoreMatch(source, entry, alias) {
    const core = coreText(source);
    const normalizedAlias = lower(alias);
    let score = [...normalizedAlias].length * 10 + entry.priority;
    if (core === normalizedAlias) score += 1000;
    else if (core.endsWith(normalizedAlias)) score += 180;
    if (normalizedAlias.startsWith('minecraft:')) score += 500;
    if (entry.kind === 'mob' && /(?:一只|一隻|生物|怪物|mob|entity)/i.test(source)) score += 80;
    if (entry.tags.includes('weapon') && /(?:一把|武器|weapon)/i.test(source)) score += 60;
    return score;
  }

  function dynamicMinecraftEntry(source) {
    const match = lower(source).match(/minecraft:([a-z0-9_./-]+)/);
    if (!match || byId.has(`dynamic.${match[1]}`)) return null;
    return Object.freeze({
      id: `dynamic.${match[1]}`,
      name: match[1].replace(/_/g, ' '),
      kind: 'item', strategy: 'vanilla', minecraftId: `minecraft:${match[1]}`,
      aliases: [`minecraft:${match[1]}`], tags: Object.freeze(['item']), route: '智能创建', status: 'ready', base: `minecraft:${match[1]}`,
      hostile: false, boss: false, note: '', priority: 100
    });
  }

  function matchAll(input, options = {}) {
    const source = normalize(input);
    if (!source) return [];
    const matches = [];
    for (const entry of entries) {
      let bestAlias = '';
      let bestScore = -1;
      for (const alias of entry.aliases) {
        if (!aliasMatches(source, alias)) continue;
        const score = scoreMatch(source, entry, alias);
        if (score > bestScore) { bestScore = score; bestAlias = alias; }
      }
      if (bestScore >= 0) matches.push({ entry, alias: bestAlias, score: bestScore });
    }
    const dynamic = dynamicMinecraftEntry(source);
    if (dynamic) matches.push({ entry: dynamic, alias: dynamic.minecraftId, score: 2000 });
    matches.sort((a, b) => b.score - a.score || b.alias.length - a.alias.length);
    const selected = [];
    const seen = new Set();
    for (const match of matches) {
      if (seen.has(match.entry.id)) continue;
      if (selected.some((item) => item.alias.includes(match.alias) || match.alias.includes(item.alias))) {
        if (!/[和与及、,，]/.test(source)) continue;
      }
      selected.push(match);
      seen.add(match.entry.id);
      if (selected.length >= (options.limit || 8)) break;
    }
    return selected;
  }

  function shouldDeferToExisting(input, matches) {
    const source = normalize(input);
    if (/(?:掉落|掉率|loot|drops?|死亡后|击杀后|擊殺後)/i.test(source)) return true;
    if (/(?:配方|合成|制作成|製作成|\bcraft(?:ing|ed)?\b|\brecipe\b)/i.test(source)) return true;
    if (/(?:指令|命令|command|^\s*\/)/i.test(source)) return true;
    if (/(?:世界|维度|維度|群系|地形|world|dimension|biome|terrain)/i.test(source)) return true;
    if (/(?:boss|首领|首領|怪物|生物|实体|實體)/i.test(source) && !matches.some((match) => match.entry.kind === 'mob' || match.entry.strategy === 'entity')) return true;
    if (/(?:机器|機器|处理机|處理機|加工机|加工機|machine|processor)/i.test(source) && !matches.some((match) => match.entry.strategy === 'machine')) return true;
    return false;
  }

  function hash(value) {
    let result = 2166136261;
    for (const char of String(value || '')) { result ^= char.codePointAt(0); result = Math.imul(result, 16777619); }
    return result >>> 0;
  }

  function requestedName(input, entry) {
    const source = normalize(input);
    const quoted = source.match(/[“"']([^”"']{1,48})[”"']/);
    if (quoted) return quoted[1].trim();
    const called = source.match(/(?:叫做?|名为|名為|名字(?:叫|是)?|called|named)\s*[:：]?\s*([^，,。.!！？\n]{1,48})/i);
    if (called) return called[1].split(/(?:带|帶|有|可以|能够|能夠|并且|並且|而且|with|that)/i,1)[0].trim() || entry.name;
    return entry.name;
  }

  function nativeRequested(source) {
    return /(?:真正|原生|独立|獨立|新\s*(?:item|block|id|物品|方块|方塊)|forge|java)/i.test(source);
  }

  function makeNativeComponent(entry, name, source) {
    const contentType = entry.kind === 'block' ? 'block' : entry.tags.includes('food') ? 'food' : entry.tags.includes('weapon') || entry.tags.includes('tool') ? 'tool' : 'item';
    const id = U.cleanId(entry.id.replace(/[.]/g,'_'), contentType === 'block' ? 'custom_block' : 'custom_item');
    const modId = U.cleanId(`${id}_mod`, 'gameforge_mod').replace(/[.-]/g, '_');
    return Gen.makeComponent('forge', name, {
      modId, modName: name, packageName: `com.gameforge.${modId}`, author: 'GameForge Creator', version: '1.0.0', license: 'MIT',
      description: `Generated from catalog request: ${source}`, contentType, registryId: id, displayName: name,
      primaryStat: contentType === 'food' ? 6 : contentType === 'tool' ? 8 : 1, secondaryStat: contentType === 'food' ? 0.6 : contentType === 'tool' ? -2.4 : 0,
      durability: contentType === 'item' ? 64 : 600, hardness: 3, resistance: 6, color: '#70d6a5', recipeEnabled: false, creativeTab: true,
      catalogEntryId: entry.id, catalogMinecraftId: entry.minecraftId, sourcePrompt: source
    });
  }

  function makeVanillaComponent(entry, name, source) {
    if (entry.kind === 'mob') {
      return Gen.makeComponent('mob', name, {
        id: U.cleanId(entry.id.replace(/[.]/g,'_'), 'catalog_mob'), name, base: entry.minecraftId,
        health: entry.boss ? 200 : entry.hostile ? 30 : 20, damage: entry.hostile ? 6 : 0, speed: 0.25, armor: entry.boss ? 8 : 0,
        followRange: entry.hostile ? 40 : 24, mainHand: '', head: '', boss: entry.boss, glow: entry.boss, persistent: true, silent: false,
        drops: '', catalogEntryId: entry.id, catalogMinecraftId: entry.minecraftId, sourcePrompt: source
      });
    }
    return Gen.makeComponent('item', name, {
      id: U.cleanId(entry.id.replace(/[.]/g,'_'), 'catalog_item'), name, base: entry.minecraftId || entry.base || 'minecraft:stone', count: 1,
      lore: `基于 ${entry.name} 创建；保留原版物品的基本使用方式。`, style: 'generated', modelData: 2000 + (hash(entry.id) % 700000),
      color: entry.tags.includes('food') ? '#e7b86a' : entry.tags.includes('weapon') ? '#9fc7ff' : entry.kind === 'block' ? '#82c995' : '#b798e6',
      glow: false, unbreakable: false, recipeEnabled: false, recipeGrid: [], catalogEntryId: entry.id, catalogMinecraftId: entry.minecraftId, sourcePrompt: source
    });
  }

  function makeDecorativeComponent(entry, name, source) {
    return Gen.makeComponent('block', name, {
      id: U.cleanId(entry.id.replace(/[.]/g,'_'), 'catalog_decoration'), name, carrier: 'minecraft:warped_fungus_on_a_stick', collision: 'minecraft:barrier',
      modelData: 710000 + (hash(entry.id) % 200000), distance: 3, scale: 1, color: '#58c9b9', glow: false, gravity: false,
      catalogEntryId: entry.id, sourcePrompt: source, catalogStrategy: entry.strategy
    });
  }

  function makeMachineComponent(entry, name, source) {
    if (GF.nativeSystems?.createMachineComponent) {
      const component = GF.nativeSystems.createMachineComponent({
        name, id: U.cleanId(entry.id.replace(/[.]/g,'_'), 'catalog_machine'), inputItem: 'minecraft:iron_ingot', inputCount: 1,
        fuelItem: 'minecraft:coal', fuelCount: 1, outputItem: 'minecraft:gold_ingot', outputCount: 1, processTicks: 100,
        description: `通用机器框架：${name}。专用系统需要继续编辑。`
      });
      const config = component.spec || component.config || {};
      config.catalogEntryId = entry.id; config.sourcePrompt = source; config.catalogStrategy = 'machine';
      return component;
    }
    return makeDecorativeComponent(entry, name, source);
  }

  function makeEntityComponent(entry, name, source) {
    if (GF.nativeSystems?.createEntityComponent) {
      const component = GF.nativeSystems.createEntityComponent({
        name, id: U.cleanId(entry.id.replace(/[.]/g,'_'), 'catalog_entity'), health: entry.boss ? 160 : 40, damage: entry.hostile ? 8 : 2,
        speed: 0.28, armor: entry.boss ? 8 : 2, goals: ['float','melee_attack','random_stroll','look_at_player','random_look','hurt_by_target','nearest_player'],
        targetPlayers: entry.hostile, boss: entry.boss, texture: 'minecraft:textures/entity/zombie/zombie.png'
      });
      const config = component.spec || component.config || {};
      config.catalogEntryId = entry.id; config.sourcePrompt = source; config.catalogStrategy = 'entity';
      return component;
    }
    return Gen.makeComponent('mob', name, { id: U.cleanId(entry.id.replace(/[.]/g,'_'),'catalog_entity'), name, base:'minecraft:zombie', health:40, damage:6, speed:.28, armor:2, followRange:32, mainHand:'', head:'', boss:false, glow:false, persistent:true, silent:false, drops:'', catalogEntryId:entry.id, sourcePrompt:source });
  }

  function makeFirearmComponent(entry, name, source) {
    const component = makeVanillaComponent({ ...entry, kind:'item', minecraftId:entry.base || 'minecraft:crossbow', tags:[...entry.tags,'weapon'] }, name, source);
    component.spec.lore = '会得到可使用的弩类载体；自定义弹药、后坐力和新投射物不会自动生成。';
    return component;
  }

  function makeMagicComponent(entry, name, source) {
    const component = makeVanillaComponent({ ...entry, kind:'item', minecraftId:entry.base || 'minecraft:amethyst_shard' }, name, source);
    component.spec.glow = true;
    component.spec.lore = '会得到基础魔法物品外壳；完整法力与法术体系需要后续模块。';
    return component;
  }

  function componentFor(entry, name, source) {
    if (entry.strategy === 'vanilla' || entry.strategy === 'mob') return nativeRequested(source) && entry.kind !== 'mob' ? makeNativeComponent(entry, name, source) : makeVanillaComponent(entry, name, source);
    if (entry.strategy === 'decorative' || entry.strategy === 'vehicle') return makeDecorativeComponent(entry, name, source);
    if (entry.strategy === 'container') return makeVanillaComponent({ ...entry, kind:'block', minecraftId:entry.base || 'minecraft:chest' }, name, source);
    if (entry.strategy === 'machine') return makeMachineComponent(entry, name, source);
    if (entry.strategy === 'firearm') return makeFirearmComponent(entry, name, source);
    if (entry.strategy === 'magic') return makeMagicComponent(entry, name, source);
    if (entry.strategy === 'entity') return makeEntityComponent(entry, name, source);
    return null;
  }

  function planFromPrompt(input, project = null) {
    const source = normalize(input);
    const matches = matchAll(source);
    if (!matches.length || shouldDeferToExisting(source, matches)) return null;
    const components = [];
    for (const match of matches) {
      const entry = match.entry;
      if (entry.strategy === 'system') continue;
      const name = matches.length === 1 ? requestedName(source, entry) : entry.name;
      const component = componentFor(entry, name, source);
      if (component) components.push(component);
    }
    const type = components[0]?.type || components[0]?.kind || 'concept';
    return {
      type,
      confidence: matches[0]?.score > 900 ? 97 : 90,
      components,
      catalogMatches: matches.map((match) => ({ id:match.entry.id, name:match.entry.name, alias:match.alias, strategy:match.entry.strategy })),
      note: components.length ? `本地内容目录识别到 ${matches.map((match) => match.entry.name).join('、')}。` : '系统认识这些概念，但当前没有可运行生成器。'
    };
  }

  function capabilityItem(id, name, status, detail, output = '', missing = '', route = '') {
    return { id, name, status, detail, output, missing, route };
  }

  function catalogCapabilityItems(input, matches = matchAll(input)) {
    const source = normalize(input);
    const result = [];
    const addResult = (next) => {
      const current = result.find((item) => item.id === next.id);
      if (!current) result.push(next);
      else if (STATUS_META[next.status].rank > STATUS_META[current.status].rank) Object.assign(current, next);
    };
    for (const { entry } of matches) {
      if (entry.strategy === 'vanilla') {
        const native = nativeRequested(source);
        const subject = entry.kind === 'block' ? '方块' : '物品';
        addResult(capabilityItem(`catalog:${entry.id}`, entry.name, STATUS.READY,
          native ? `会在原生 Forge 工程里注册一个真正的新${subject} ID；外观和基础属性可以继续改。` : `会生成可获得的${entry.name}，并保留它在原版中的基本使用方式。`,
          native ? `一个真正注册的新${subject}` : `一个可以获得和使用的${entry.name}`, '', native ? '原生 Forge 工程' : '智能创建'));
      } else if (entry.strategy === 'mob') {
        addResult(capabilityItem(`catalog:${entry.id}`, entry.name, STATUS.READY,
          `会生成基于原版${entry.name}的生物，名称、血量、攻击、装备和掉落可以继续修改。`, `一个可以召唤的${entry.name}`, '', '生物与 Boss'));
      } else if (entry.strategy === 'decorative') {
        addResult(capabilityItem(`catalog:${entry.id}`, entry.name, STATUS.READY,
          `会生成一个可放置和回收的${entry.name}装饰物。`, `一个可放置的${entry.name}装饰物`, '', '装饰方块'));
      } else if (entry.strategy === 'container') {
        addResult(capabilityItem(`catalog:${entry.id}`, entry.name, STATUS.PARTIAL,
          `会生成一个可获得的箱子类物品或装饰外壳，但不会自动生成独立容量、密码和专用存档逻辑。`, `一个箱子类外壳`, '自定义容量、密码和完整存储逻辑', '智能创建'));
      } else if (entry.strategy === 'machine') {
        addResult(capabilityItem(`catalog:${entry.id}:base`, `${entry.name}机器外壳`, STATUS.READY,
          `会生成真正的机器方块、三个槽位、存档、进度条、开始／停止按钮和基础处理流程。`, `一台可放置和操作的通用${entry.name}`, '', '原生机器与实体'));
        addResult(capabilityItem(`catalog:${entry.id}:special`, `${entry.name}专用功能`, STATUS.PARTIAL,
          `不会因为名字叫${entry.name}就自动拥有完整专用原理；能源、流体、辐射或复杂配方需要继续设计。`, '通用机器流程', `${entry.name}的完整专用系统`, '原生机器与实体'));
      } else if (entry.strategy === 'firearm') {
        addResult(capabilityItem(`catalog:${entry.id}:base`, `${entry.name}基础载体`, STATUS.READY,
          '会生成一个可以使用的弓／弩类载体、名称、模型和获取方式。', `一个可使用的${entry.name}基础载体`, '', '智能创建'));
        addResult(capabilityItem(`catalog:${entry.id}:advanced`, `${entry.name}完整枪械机制`, STATUS.PARTIAL,
          '自定义子弹实体、弹匣、换弹、后坐力、散布和命中判定不会一次全部生成。', '基础远程攻击', '完整弹药、换弹、后坐力和新投射物'));
      } else if (entry.strategy === 'magic') {
        addResult(capabilityItem(`catalog:${entry.id}:base`, `${entry.name}基础物品`, STATUS.READY,
          '会生成可获得的魔法物品外壳，并能继续添加右键、命中、状态、闪电或召唤等基础效果。', `一个可使用的${entry.name}`, '', '智能创建'));
        addResult(capabilityItem(`catalog:${entry.id}:system`, '完整魔法体系', STATUS.PARTIAL,
          '法力值、法术组合、符文、施法前摇、引导和升级树不会自动全部生成。', '基础魔法效果', '完整法力和法术成长体系'));
      } else if (entry.strategy === 'vehicle') {
        addResult(capabilityItem(`catalog:${entry.id}:shape`, `${entry.name}外观`, STATUS.PARTIAL,
          `会生成一个可放置的${entry.name}装饰外观，但不是能驾驶的载具。`, `一个${entry.name}装饰模型`, '驾驶、乘坐、碰撞和载具物理'));
        if (/(?:驾驶|駕駛|能开|能開|可开|可開|飞行|飛行|drive|ride|fly)/i.test(source)) addResult(capabilityItem(`catalog:${entry.id}:drive`, `${entry.name}驾驶系统`, STATUS.UNSUPPORTED,
          '当前不会生成方向控制、加速、转向、碰撞、燃料和多人乘坐同步。', '', '完整驾驶系统'));
      } else if (entry.strategy === 'entity') {
        addResult(capabilityItem(`catalog:${entry.id}:base`, `${entry.name}基础实体`, STATUS.READY,
          '会注册真正的新实体 ID、基础属性、刷怪蛋、渲染器和地面 Goal AI。', `一个地面活动的${entry.name}`, '', '原生机器与实体'));
        addResult(capabilityItem(`catalog:${entry.id}:advanced`, `${entry.name}高级行为`, STATUS.PARTIAL,
          '专用模型、骨骼动画、复杂技能和特殊移动不会仅靠名称自动完成。', '基础地面 AI', '专用模型、动画和复杂技能'));
      } else if (entry.strategy === 'system') {
        const status = entry.status === 'unsupported' ? STATUS.UNSUPPORTED : STATUS.SAVED;
        addResult(capabilityItem(`catalog:${entry.id}`, entry.name, status,
          status === STATUS.SAVED ? `会保存“${entry.name}”的需求，方便以后继续编辑，但当前不会生成完整可玩的系统。` : `当前不会生成${entry.name}。`,
          '', entry.name));
      }

      if (entry.tags.includes('storage') && /(?:容量|格|槽位|存储|存儲|密码|密碼|锁|鎖|共享|share|slot|capacity|password)/i.test(source)) {
        addResult(capabilityItem('catalog:storage.custom', '自定义存储逻辑', STATUS.PARTIAL,
          '基础箱子或机器物品栏可以生成，但任意容量、密码、共享仓库和复杂权限不会自动完成。', '基础容器外壳', '任意容量、密码和权限系统'));
      }
      if (entry.tags.includes('furniture') && /(?:能坐|可以坐|坐下|打开|打開|互动|互動|sit|open|interactive)/i.test(source)) {
        addResult(capabilityItem('catalog:furniture.interaction', '家具互动', STATUS.PARTIAL,
          '家具外观可以生成，但坐下、开关门、动画和多人交互不会全部自动生成。', '家具外观', '完整家具互动'));
      }
    }
    return result;
  }

  function summarize(items) {
    const counts = { ready:0, partial:0, saved:0, unsupported:0 };
    for (const entry of items) if (counts[entry.status] !== undefined) counts[entry.status] += 1;
    const unique = (values) => Array.from(new Set(values.filter(Boolean)));
    const will = unique(items.filter((entry) => entry.status === STATUS.READY || entry.status === STATUS.PARTIAL).map((entry) => entry.output));
    const wont = unique(items.filter((entry) => entry.status !== STATUS.READY).map((entry) => entry.missing || entry.name));
    const headline = counts.ready === 0 && counts.partial === 0
      ? (counts.unsupported ? '这句话现在做不了。' : '这句话现在只会被记下来。')
      : (counts.partial || counts.saved || counts.unsupported ? '能做一部分，但不是全部。' : '这句话可以直接做。');
    const willText = will.length ? `最终会生成：${will.slice(0,7).join('、')}。` : '最终不会生成可玩的内容。';
    const wontText = wont.length ? `不会生成：${wont.slice(0,9).join('、')}。` : '';
    return { counts, headline, summary:`${headline} ${willText}${wontText}`.trim(), finalText:`${willText}${wontText}`.trim(), canProceed:counts.ready+counts.partial>0, needsConfirmation:counts.partial+counts.saved+counts.unsupported>0 };
  }

  function mergeReport(baseReport, additions, input) {
    if (!additions.length) return baseReport;
    const map = new Map();
    for (const entry of baseReport.items || []) {
      if (entry.id === 'request.unclear') continue;
      map.set(entry.id, clone(entry));
    }
    for (const entry of additions) {
      const current = map.get(entry.id);
      if (!current || STATUS_META[entry.status].rank > STATUS_META[current.status].rank) map.set(entry.id, clone(entry));
    }
    const items = Array.from(map.values()).sort((a,b) => STATUS_META[a.status].rank - STATUS_META[b.status].rank || a.name.localeCompare(b.name,'zh-CN'));
    return { ...baseReport, prompt:normalize(input), items, ...summarize(items) };
  }

  const baseAnalyzePrompt = Cap.analyzePrompt.bind(Cap);
  const baseAnalyzeProject = Cap.analyzeProject.bind(Cap);
  const catalogAnalyzePrompt = (input, options = {}) => {
    const matches = matchAll(input);
    const base = baseAnalyzePrompt(input, options);
    return mergeReport(base, catalogCapabilityItems(input, matches), input);
  };
  const catalogAnalyzeProject = (project, options = {}) => baseAnalyzeProject(project, options);
  GF.capabilities = { ...Cap, analyzePrompt:catalogAnalyzePrompt, analyzeProject:catalogAnalyzeProject, __contentCatalogInstalled:true };

  const originalParsePrompt = Gen.parsePrompt.bind(Gen);
  Gen.parsePrompt = function parsePromptWithContentCatalog(input, project) {
    const source = normalize(input);
    const catalogPlan = planFromPrompt(source, project);
    if (!catalogPlan) return originalParsePrompt(source, project);
    const report = catalogAnalyzePrompt(source, { surface:'home', plan:catalogPlan, project });
    catalogPlan.capabilityReport = report;
    catalogPlan.note = `${report.summary} ${catalogPlan.note}`.trim();
    catalogPlan.components = (catalogPlan.components || []).map((component) => {
      const target = component.spec || component.config || (component.spec = {});
      target.sourcePrompt = target.sourcePrompt || source;
      target.gameforgeCapabilityReport = clone(report);
      return component;
    });
    return catalogPlan;
  };
  Gen.__contentCatalogInstalled = true;

  const stats = Object.freeze({
    entries: entries.length,
    aliases: entries.reduce((sum, entry) => sum + entry.aliases.length, 0),
    vanilla: entries.filter((entry) => entry.strategy === 'vanilla' || entry.strategy === 'mob').length,
    advanced: entries.filter((entry) => !['vanilla','mob'].includes(entry.strategy)).length
  });

  GF.contentCatalog = Object.freeze({
    VERSION,
    entries:Object.freeze(entries.slice()),
    stats,
    get:(id) => byId.get(id) || null,
    matchAll,
    planFromPrompt,
    capabilityItems:catalogCapabilityItems,
    analyzePrompt:catalogAnalyzePrompt,
    __installed:true
  });
})();
