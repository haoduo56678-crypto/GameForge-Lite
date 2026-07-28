'use strict';

(() => {
  const ROOT = typeof window !== 'undefined' ? window : globalThis;
  const VERSION = '1.0.0';
  const MARKER = '[GF_LOCAL_VOCAB';
  const RAW_CONCEPTS = [{"id":"intent_create","canonical":"创建","category":"intent","priority":5,"aliases":["创建","做","制作","造","打造","生成","新建","建立","创造","设计","开发","搭建","弄","搞","整","来一个","给我来个","帮我做","帮我弄","帮我生成","搓一个","捏一个","整一个","create","make","build","generate","design","craft","spawn","做一个","做个","做一把","做一柄","做一套","做一件","做一块","做一扇","做一只","做一座","来个","来一把","来一套","搞一个","搞个","弄一个","弄个","整套"],"tags":[]},{"id":"intent_modify","canonical":"修改","category":"intent","priority":4,"aliases":["修改","改","更改","调整","编辑","重做","改造","替换","优化","增强","削弱","升级","降级","重构","重制","翻新","modify","edit","change","tweak","revise","remake","upgrade","nerf","buff","强化","加强","改强","调强","改弱","调整一下"],"tags":[]},{"id":"intent_remove","canonical":"移除","category":"intent","priority":4,"aliases":["移除","删除","去掉","取消","禁用","关掉","清除","销毁","移除掉","不要","别要","不需要","remove","delete","disable","clear","destroy","without","no"],"tags":[]},{"id":"intent_random","canonical":"随机","category":"intent","priority":3,"aliases":["随机","随机生成","随便","任意","自动搭配","随机化","抽取","盲盒","random","randomize","procedural","shuffle"],"tags":[]},{"id":"intent_combine","canonical":"组合","category":"intent","priority":3,"aliases":["组合","合并","融合","混合","拼接","搭配","组合起来","缝合","combine","merge","mix","fuse","hybrid"],"tags":[]},{"id":"intent_clone","canonical":"复制","category":"intent","priority":3,"aliases":["复制","克隆","仿制","照着做","类似于","基于","复刻","copy","clone","duplicate","inspired by","based on"],"tags":[]},{"id":"intent_test","canonical":"测试","category":"intent","priority":2,"aliases":["测试","试玩","预览","验证","检查","诊断","试运行","debug","test","preview","validate","diagnose","try"],"tags":[]},{"id":"polarity_only","canonical":"仅限","category":"logic","priority":4,"aliases":["仅限","只有","只允许","仅有","只能","唯有","排他","only","exclusively","just"],"tags":[]},{"id":"polarity_except","canonical":"排除","category":"logic","priority":4,"aliases":["排除","除了","除外","不包括","禁止","屏蔽","except","exclude","ban","disallow"],"tags":[]},{"id":"frequency_always","canonical":"始终","category":"frequency","priority":4,"aliases":["始终","一直","永远","永久","全程","始终保持","锁定","常驻","always","forever","permanent","locked"],"tags":[]},{"id":"frequency_never","canonical":"从不","category":"frequency","priority":4,"aliases":["从不","永不","完全不","绝不","不会","禁止发生","never","never ever"],"tags":[]},{"id":"frequency_often","canonical":"频繁","category":"frequency","priority":2,"aliases":["频繁","经常","高频","大量","密集","常常","频繁出现","often","frequent","frequently"],"tags":[]},{"id":"frequency_rare","canonical":"稀有","category":"frequency","priority":2,"aliases":["稀有","偶尔","罕见","极少","低概率","小概率","rare","rarely","seldom","low chance"],"tags":[]},{"id":"frequency_periodic","canonical":"周期","category":"frequency","priority":3,"aliases":["周期","每隔","定时","周期性","每几天","每晚","每天","每周","每月","periodic","every","interval","scheduled"],"tags":[]},{"id":"intensity_tiny","canonical":"极低","category":"intensity","priority":2,"aliases":["极低","微弱","一点点","很少","极小","最低","几乎没有","tiny","minimal","very low","slight"],"tags":[]},{"id":"intensity_low","canonical":"较低","category":"intensity","priority":2,"aliases":["较低","低","弱","小","轻微","不强","low","weak","small","minor"],"tags":[]},{"id":"intensity_normal","canonical":"普通","category":"intensity","priority":2,"aliases":["普通","正常","标准","默认","中等","一般","普通级","normal","standard","default","medium"],"tags":[]},{"id":"intensity_high","canonical":"强力","category":"intensity","priority":3,"aliases":["强力","强","高","厉害","很强","强大","猛","凶","暴力","牛","牛逼","牛掰","给力","高强度","high","strong","powerful","hard"],"tags":[]},{"id":"intensity_extreme","canonical":"极强","category":"intensity","priority":4,"aliases":["极强","超强","变态","逆天","无敌","神级","毁天灭地","秒杀","炸裂","离谱","夸张","顶级","终极","极致","very strong","extreme","overpowered","op","godlike","insane"],"tags":[]},{"id":"intensity_weak","canonical":"脆弱","category":"intensity","priority":3,"aliases":["脆弱","刮痧","拉胯","很弱","菜","不堪一击","纸糊","脆皮","underpowered","fragile","squishy"],"tags":[]},{"id":"size_tiny","canonical":"微型","category":"size","priority":2,"aliases":["微型","迷你","袖珍","小不点","微小","tiny","mini","micro","dwarf"],"tags":[]},{"id":"size_small","canonical":"小型","category":"size","priority":2,"aliases":["小型","小","小号","小规模","small","compact"],"tags":[]},{"id":"size_large","canonical":"大型","category":"size","priority":2,"aliases":["大型","大","巨大","庞大","大型化","large","big","huge"],"tags":[]},{"id":"size_giant","canonical":"巨型","category":"size","priority":3,"aliases":["巨型","超级大","超巨大","泰坦级","山一样大","巨无霸","giant","colossal","titanic","massive"],"tags":[]},{"id":"size_infinite","canonical":"无限","category":"size","priority":3,"aliases":["无限","无穷","无边","无尽","无限大","infinite","endless","boundless"],"tags":[]},{"id":"speed_slow","canonical":"缓慢","category":"speed","priority":2,"aliases":["缓慢","慢","迟缓","龟速","减速","slow","sluggish"],"tags":[]},{"id":"speed_fast","canonical":"快速","category":"speed","priority":2,"aliases":["快速","快","飞快","迅速","高速","疾速","跑得快","fast","quick","rapid","swift"],"tags":[]},{"id":"speed_extreme","canonical":"极速","category":"speed","priority":3,"aliases":["极速","瞬间","闪现般","光速","超高速","极速移动","instant","supersonic","light speed"],"tags":[]},{"id":"duration_short","canonical":"短暂","category":"duration","priority":2,"aliases":["短暂","一会儿","瞬时","很短","短时间","brief","short","temporary"],"tags":[]},{"id":"duration_long","canonical":"持久","category":"duration","priority":2,"aliases":["持久","很久","长时间","持续","长期","长效","long","lasting","persistent"],"tags":[]},{"id":"duration_permanent","canonical":"永久","category":"duration","priority":3,"aliases":["永久","永久生效","不会消失","永续","permanent","infinite duration"],"tags":[]},{"id":"domain_item","canonical":"物品","category":"domain","priority":5,"aliases":["物品","道具","东西","装备物","可拿物","item","object","gear","loot"],"tags":[]},{"id":"domain_weapon","canonical":"武器","category":"domain","priority":6,"aliases":["武器","兵器","杀器","战斗装备","weapon","armament","arms"],"tags":[]},{"id":"weapon_sword","canonical":"剑","category":"weapon","priority":6,"aliases":["剑","长剑","短剑","大剑","巨剑","阔剑","重剑","细剑","刺剑","西洋剑","双手剑","单手剑","光剑","能量剑","魔剑","圣剑","神剑","妖剑","灵剑","仙剑","宝剑","利剑","blade","sword","longsword","greatsword","broadsword","claymore","rapier","lightsaber"],"tags":[]},{"id":"weapon_katana","canonical":"太刀","category":"weapon","priority":6,"aliases":["太刀","武士刀","唐刀","苗刀","野太刀","打刀","居合刀","日本刀","katana","odachi","nodachi"],"tags":[]},{"id":"weapon_dagger","canonical":"匕首","category":"weapon","priority":5,"aliases":["匕首","短刀","小刀","飞刀","刺刀","暗杀刀","dagger","knife","stiletto"],"tags":[]},{"id":"weapon_axe","canonical":"斧","category":"weapon","priority":5,"aliases":["斧","战斧","巨斧","双刃斧","手斧","投掷斧","axe","battle axe","greataxe","hatchet"],"tags":[]},{"id":"weapon_hammer","canonical":"锤","category":"weapon","priority":5,"aliases":["锤","战锤","巨锤","雷神锤","钉头锤","流星锤","锤子","hammer","warhammer","maul","mace"],"tags":[]},{"id":"weapon_spear","canonical":"长枪","category":"weapon","priority":5,"aliases":["长枪","枪矛","长矛","短矛","骑枪","三叉戟","戟","方天画戟","槊","spear","lance","pike","halberd","trident","glaive"],"tags":[]},{"id":"weapon_bow","canonical":"弓","category":"weapon","priority":5,"aliases":["弓","长弓","短弓","复合弓","魔法弓","弩","连弩","十字弩","bow","longbow","shortbow","crossbow"],"tags":[]},{"id":"weapon_gun","canonical":"枪械","category":"weapon","priority":5,"aliases":["枪械","枪","手枪","步枪","狙击枪","霰弹枪","机关枪","冲锋枪","火枪","大炮","炮","激光枪","gun","pistol","rifle","sniper","shotgun","machine gun","cannon","blaster"],"tags":[]},{"id":"weapon_staff","canonical":"法杖","category":"weapon","priority":5,"aliases":["法杖","魔杖","权杖","手杖","元素杖","巫师杖","staff","wand","rod","scepter"],"tags":[]},{"id":"weapon_scythe","canonical":"镰刀","category":"weapon","priority":5,"aliases":["镰刀","死神镰刀","战镰","月牙镰","scythe","war scythe"],"tags":[]},{"id":"weapon_whip","canonical":"鞭","category":"weapon","priority":4,"aliases":["鞭","长鞭","锁链","链刃","鞭刃","whip","chain blade"],"tags":[]},{"id":"weapon_shield","canonical":"盾牌","category":"weapon","priority":5,"aliases":["盾牌","盾","圆盾","塔盾","巨盾","魔法盾","shield","buckler","tower shield"],"tags":[]},{"id":"domain_armor","canonical":"盔甲","category":"domain","priority":6,"aliases":["盔甲","护甲","防具","套装","战甲","铠甲","armor","armour","protective gear"],"tags":[]},{"id":"armor_helmet","canonical":"头盔","category":"armor","priority":4,"aliases":["头盔","帽子","头饰","面甲","王冠","helmet","hat","crown"],"tags":[]},{"id":"armor_chest","canonical":"胸甲","category":"armor","priority":4,"aliases":["胸甲","上衣","战衣","护胸","胸铠","chestplate","chest armor"],"tags":[]},{"id":"armor_legs","canonical":"护腿","category":"armor","priority":4,"aliases":["护腿","裤子","腿甲","下装","leggings","leg armor"],"tags":[]},{"id":"armor_boots","canonical":"靴子","category":"armor","priority":4,"aliases":["靴子","鞋","战靴","鞋子","boots","shoes"],"tags":[]},{"id":"accessory_ring","canonical":"戒指","category":"accessory","priority":4,"aliases":["戒指","指环","魔戒","ring"],"tags":[]},{"id":"accessory_amulet","canonical":"项链","category":"accessory","priority":4,"aliases":["项链","护符","吊坠","项坠","项圈","amulet","necklace","pendant","talisman"],"tags":[]},{"id":"domain_tool","canonical":"工具","category":"domain","priority":5,"aliases":["工具","生产工具","采集工具","tool","utility item"],"tags":[]},{"id":"tool_pickaxe","canonical":"镐","category":"tool","priority":5,"aliases":["镐","镐子","矿镐","钻头","pickaxe","drill"],"tags":[]},{"id":"tool_shovel","canonical":"铲","category":"tool","priority":4,"aliases":["铲","铲子","铁锹","锹","shovel","spade"],"tags":[]},{"id":"tool_hoe","canonical":"锄","category":"tool","priority":4,"aliases":["锄","锄头","农具","hoe"],"tags":[]},{"id":"tool_fishing","canonical":"钓鱼竿","category":"tool","priority":4,"aliases":["钓鱼竿","鱼竿","钓竿","fishing rod"],"tags":[]},{"id":"tool_shears","canonical":"剪刀","category":"tool","priority":3,"aliases":["剪刀","园艺剪","shears","scissors"],"tags":[]},{"id":"domain_food","canonical":"食物","category":"domain","priority":5,"aliases":["食物","食品","吃的","料理","菜","餐点","food","meal","dish"],"tags":[]},{"id":"domain_drink","canonical":"饮料","category":"domain","priority":4,"aliases":["饮料","喝的","饮品","酒水","drink","beverage"],"tags":[]},{"id":"food_meat","canonical":"肉类","category":"food","priority":3,"aliases":["肉类","肉","牛排","猪排","鸡肉","羊肉","鱼肉","meat","steak"],"tags":[]},{"id":"food_fruit","canonical":"水果","category":"food","priority":3,"aliases":["水果","果实","苹果","浆果","fruit","berry"],"tags":[]},{"id":"food_dessert","canonical":"甜点","category":"food","priority":3,"aliases":["甜点","蛋糕","饼干","糖果","冰淇淋","dessert","cake","cookie","candy"],"tags":[]},{"id":"domain_potion","canonical":"药水","category":"domain","priority":5,"aliases":["药水","药剂","魔药","灵药","丹药","potion","elixir","brew"],"tags":[]},{"id":"domain_material","canonical":"材料","category":"domain","priority":4,"aliases":["材料","素材","原料","资源","零件","部件","material","ingredient","resource","part"],"tags":[]},{"id":"material_ore","canonical":"矿石","category":"material","priority":5,"aliases":["矿石","矿物","矿脉","原矿","ore","mineral","vein"],"tags":[]},{"id":"material_ingot","canonical":"锭","category":"material","priority":4,"aliases":["锭","金属锭","合金锭","ingot","bar"],"tags":[]},{"id":"material_gem","canonical":"宝石","category":"material","priority":4,"aliases":["宝石","晶石","晶体","水晶","魔晶","gem","crystal","jewel"],"tags":[]},{"id":"domain_block","canonical":"方块","category":"domain","priority":6,"aliases":["方块","块","砖块","建筑块","block","tile"],"tags":[]},{"id":"block_decor","canonical":"装饰方块","category":"block","priority":5,"aliases":["装饰方块","装饰块","摆件","饰品方块","decorative block","decoration"],"tags":[]},{"id":"block_furniture","canonical":"家具","category":"block","priority":5,"aliases":["家具","桌子","椅子","沙发","床柜","柜子","书架","灯具","furniture","table","chair","sofa","cabinet"],"tags":[]},{"id":"block_machine","canonical":"机器","category":"block","priority":5,"aliases":["机器","机械","设备","装置","工作站","加工机","machine","device","apparatus"],"tags":[]},{"id":"block_container","canonical":"容器","category":"block","priority":4,"aliases":["容器","箱子","储物箱","仓库","背包箱","罐子","container","chest","storage","crate","barrel"],"tags":[]},{"id":"block_door","canonical":"门","category":"block","priority":4,"aliases":["门","大门","闸门","舱门","传送门框","door","gate","hatch","一扇门","传送门门扇","木门","铁门","自动门","密室门"],"tags":[]},{"id":"block_trap","canonical":"陷阱","category":"block","priority":4,"aliases":["陷阱","机关","地刺","捕兽夹","炸弹陷阱","trap","snare","mine"],"tags":[]},{"id":"block_light","canonical":"光源","category":"block","priority":4,"aliases":["光源","灯","灯笼","火把","发光块","照明","light","lamp","lantern","torch"],"tags":[]},{"id":"domain_plant","canonical":"植物","category":"domain","priority":5,"aliases":["植物","植被","花草","花","草","灌木","plant","vegetation","flora"],"tags":[]},{"id":"domain_crop","canonical":"农作物","category":"domain","priority":4,"aliases":["农作物","作物","庄稼","粮食","crop","farm plant"],"tags":[]},{"id":"domain_tree","canonical":"树木","category":"domain","priority":4,"aliases":["树木","树","巨树","神树","古树","tree","woodland"],"tags":[]},{"id":"domain_fluid","canonical":"液体","category":"domain","priority":5,"aliases":["液体","流体","水","岩浆","熔液","酸液","油","fluid","liquid","water","lava","oil"],"tags":[]},{"id":"domain_portal","canonical":"传送门","category":"domain","priority":5,"aliases":["传送门","门户","门扉","次元门","虫洞","portal","gateway","wormhole"],"tags":[]},{"id":"domain_entity","canonical":"生物","category":"domain","priority":6,"aliases":["生物","实体","生命体","角色","怪物","动物","mob","entity","creature"],"tags":[]},{"id":"entity_animal","canonical":"动物","category":"entity","priority":5,"aliases":["动物","野兽","牲畜","兽类","animal","beast","wildlife"],"tags":[]},{"id":"entity_monster","canonical":"怪物","category":"entity","priority":5,"aliases":["怪物","魔物","妖怪","敌怪","敌人","monster","enemy","hostile mob"],"tags":[]},{"id":"entity_undead","canonical":"亡灵","category":"entity","priority":5,"aliases":["亡灵","不死族","死灵","骷髅系","undead","unholy"],"tags":[]},{"id":"entity_zombie","canonical":"僵尸","category":"entity","priority":5,"aliases":["僵尸","尸群","活尸","丧尸","感染者","zombie","walker"],"tags":[]},{"id":"entity_skeleton","canonical":"骷髅","category":"entity","priority":5,"aliases":["骷髅","骨头怪","骸骨","弓箭骷髅","skeleton","bone warrior"],"tags":[]},{"id":"entity_creeper","canonical":"苦力怕","category":"entity","priority":5,"aliases":["苦力怕","爬行者","JJ怪","creeper"],"tags":[]},{"id":"entity_spider","canonical":"蜘蛛","category":"entity","priority":4,"aliases":["蜘蛛","洞穴蜘蛛","巨蛛","spider","arachnid"],"tags":[]},{"id":"entity_dragon","canonical":"龙","category":"entity","priority":5,"aliases":["龙","巨龙","飞龙","神龙","魔龙","冰龙","火龙","雷龙","末影龙","dragon","wyrm","wyvern"],"tags":[]},{"id":"entity_golem","canonical":"傀儡","category":"entity","priority":4,"aliases":["傀儡","魔像","石像鬼","机器人守卫","golem","construct"],"tags":[]},{"id":"entity_villager","canonical":"村民","category":"entity","priority":4,"aliases":["村民","村人","商人","居民","villager","merchant","resident"],"tags":[]},{"id":"domain_npc","canonical":"NPC","category":"domain","priority":6,"aliases":["NPC","非玩家角色","人物","角色","路人","任务人物","npc","non-player character"],"tags":[]},{"id":"entity_pet","canonical":"宠物","category":"entity","priority":5,"aliases":["宠物","伙伴","随从","跟宠","召唤兽","pet","companion","familiar"],"tags":[]},{"id":"entity_mount","canonical":"坐骑","category":"entity","priority":5,"aliases":["坐骑","骑宠","交通生物","马匹","mount","rideable"],"tags":[]},{"id":"domain_boss","canonical":"Boss","category":"domain","priority":7,"aliases":["Boss","boss","BOSS","首领","头目","大怪","关底","世界首领","最终Boss","终极Boss","领主","魔王","boss mob","raid boss"],"tags":[]},{"id":"entity_minion","canonical":"小怪","category":"entity","priority":4,"aliases":["小怪","杂兵","喽啰","随从怪","仆从","minion","grunt","add"],"tags":[]},{"id":"domain_world","canonical":"世界","category":"domain","priority":8,"aliases":["世界","新世界","世界观","地图世界","游戏世界","天地","world","realm","universe"],"tags":[]},{"id":"domain_dimension","canonical":"维度","category":"domain","priority":8,"aliases":["维度","次元","异世界","异次元","位面","空间","平行世界","另一个宇宙","dimension","plane","realm","alternate world"],"tags":[]},{"id":"domain_biome","canonical":"群系","category":"domain","priority":7,"aliases":["群系","生物群系","生态区","地貌区","区域环境","biome","ecoregion"],"tags":[]},{"id":"domain_terrain","canonical":"地形","category":"domain","priority":7,"aliases":["地形","地貌","地图地形","地势","世界生成","terrain","landscape","worldgen"],"tags":[]},{"id":"terrain_surface","canonical":"地表","category":"terrain","priority":4,"aliases":["地表","表面","地面层","surface","ground layer"],"tags":[]},{"id":"terrain_underground","canonical":"地下","category":"terrain","priority":4,"aliases":["地下","地底","深层","地下世界","underground","subterranean"],"tags":[]},{"id":"terrain_cave","canonical":"洞穴","category":"terrain","priority":5,"aliases":["洞穴","山洞","溶洞","洞窟","地下洞穴","cave","cavern","grotto"],"tags":[]},{"id":"terrain_mountain","canonical":"山脉","category":"terrain","priority":5,"aliases":["山脉","高山","雪山","山峰","峡谷","悬崖","mountain","peak","cliff","canyon"],"tags":[]},{"id":"terrain_island","canonical":"岛屿","category":"terrain","priority":5,"aliases":["岛屿","小岛","大陆岛","海岛","island","archipelago"],"tags":[]},{"id":"terrain_floating_island","canonical":"浮空岛","category":"terrain","priority":6,"aliases":["浮空岛","天空岛","空岛","漂浮岛","悬空岛","floating island","sky island","skyblock"],"tags":[]},{"id":"terrain_ocean","canonical":"海洋","category":"terrain","priority":5,"aliases":["海洋","大海","深海","海底","水世界","ocean","sea","underwater"],"tags":[]},{"id":"terrain_desert","canonical":"沙漠","category":"terrain","priority":5,"aliases":["沙漠","荒漠","沙海","戈壁","desert","dunes","badlands"],"tags":[]},{"id":"terrain_forest","canonical":"森林","category":"terrain","priority":5,"aliases":["森林","树林","林地","密林","forest","woods","woodland"],"tags":[]},{"id":"terrain_jungle","canonical":"丛林","category":"terrain","priority":5,"aliases":["丛林","雨林","热带雨林","jungle","rainforest"],"tags":[]},{"id":"terrain_swamp","canonical":"沼泽","category":"terrain","priority":5,"aliases":["沼泽","湿地","泥潭","毒沼","swamp","marsh","bog"],"tags":[]},{"id":"terrain_snow","canonical":"雪原","category":"terrain","priority":5,"aliases":["雪原","冰原","冻土","冰川","极地","snowfield","tundra","glacier","arctic"],"tags":[]},{"id":"terrain_volcano","canonical":"火山","category":"terrain","priority":5,"aliases":["火山","熔岩地带","火山口","岩浆海","volcano","volcanic","lava land"],"tags":[]},{"id":"terrain_wasteland","canonical":"废土","category":"terrain","priority":5,"aliases":["废土","荒原","荒地","末日荒野","不毛之地","wasteland","wilderness","barren land"],"tags":[]},{"id":"terrain_city","canonical":"城市","category":"terrain","priority":5,"aliases":["城市","都市","城镇","大都会","city","metropolis","urban"],"tags":[]},{"id":"terrain_village","canonical":"村庄","category":"terrain","priority":5,"aliases":["村庄","村落","聚落","小镇","village","settlement","town"],"tags":[]},{"id":"terrain_flat","canonical":"超平坦","category":"terrain","priority":4,"aliases":["超平坦","平坦世界","平原地图","flat world","superflat"],"tags":[]},{"id":"terrain_maze","canonical":"迷宫地形","category":"terrain","priority":4,"aliases":["迷宫地形","迷宫世界","错综地形","labyrinth terrain","maze world"],"tags":[]},{"id":"domain_environment","canonical":"环境","category":"domain","priority":6,"aliases":["环境","氛围","自然环境","世界环境","environment","ambience","atmosphere"],"tags":[]},{"id":"environment_sky","canonical":"天空","category":"environment","priority":5,"aliases":["天空","天色","苍穹","天空盒","sky","skybox","firmament"],"tags":[]},{"id":"environment_fog","canonical":"迷雾","category":"environment","priority":5,"aliases":["迷雾","雾","浓雾","薄雾","烟霾","fog","mist","haze"],"tags":[]},{"id":"domain_weather","canonical":"天气","category":"domain","priority":7,"aliases":["天气","气候","天候","weather","climate"],"tags":[]},{"id":"weather_clear","canonical":"晴天","category":"weather","priority":4,"aliases":["晴天","晴朗","无云","阳光明媚","clear","sunny"],"tags":[]},{"id":"weather_rain","canonical":"下雨","category":"weather","priority":5,"aliases":["下雨","雨天","降雨","暴雨","倾盆大雨","梅雨","阴雨","rain","rainy","downpour"],"tags":[]},{"id":"weather_storm","canonical":"风暴","category":"weather","priority":5,"aliases":["风暴","暴风","暴风雨","飓风","台风","龙卷风","storm","hurricane","tornado","tempest"],"tags":[]},{"id":"weather_thunder","canonical":"雷暴","category":"weather","priority":5,"aliases":["雷暴","打雷","雷雨","闪电天气","thunderstorm","thunder","lightning storm"],"tags":[]},{"id":"weather_snow","canonical":"下雪","category":"weather","priority":5,"aliases":["下雪","雪天","暴雪","冰雹","降雪","snow","snowfall","blizzard","hail"],"tags":[]},{"id":"weather_ash","canonical":"灰烬雨","category":"weather","priority":5,"aliases":["灰烬雨","下灰","火山灰","灰尘雨","ashfall","ash storm"],"tags":[]},{"id":"weather_acid","canonical":"酸雨","category":"weather","priority":6,"aliases":["酸雨","腐蚀雨","毒雨","acid rain","toxic rain"],"tags":[]},{"id":"weather_sandstorm","canonical":"沙尘暴","category":"weather","priority":5,"aliases":["沙尘暴","风沙","沙暴","dust storm","sandstorm"],"tags":[]},{"id":"weather_meteor","canonical":"流星雨","category":"weather","priority":5,"aliases":["流星雨","陨石雨","天降陨石","meteor shower","meteor storm"],"tags":[]},{"id":"environment_temperature_hot","canonical":"炎热","category":"environment","priority":4,"aliases":["炎热","高温","酷热","灼热","热浪","hot","scorching","heatwave"],"tags":[]},{"id":"environment_temperature_cold","canonical":"寒冷","category":"environment","priority":4,"aliases":["寒冷","低温","冰冷","严寒","极寒","cold","freezing","frigid"],"tags":[]},{"id":"environment_gravity_low","canonical":"低重力","category":"environment","priority":6,"aliases":["低重力","轻重力","月球重力","漂浮重力","low gravity","moon gravity"],"tags":[]},{"id":"environment_gravity_high","canonical":"高重力","category":"environment","priority":6,"aliases":["高重力","重力增强","沉重世界","high gravity","heavy gravity"],"tags":[]},{"id":"domain_time","canonical":"时间","category":"domain","priority":6,"aliases":["时间","昼夜","时刻","时间系统","time","day cycle"],"tags":[]},{"id":"time_day","canonical":"白天","category":"time","priority":5,"aliases":["白天","永昼","常昼","日间","day","daytime","eternal day"],"tags":[]},{"id":"time_night","canonical":"夜晚","category":"time","priority":6,"aliases":["夜晚","永夜","常夜","黑夜","夜间","night","nighttime","eternal night"],"tags":[]},{"id":"time_dusk","canonical":"黄昏","category":"time","priority":5,"aliases":["黄昏","傍晚","暮色","夕阳","日落","dusk","twilight","sunset"],"tags":[]},{"id":"time_dawn","canonical":"黎明","category":"time","priority":5,"aliases":["黎明","清晨","破晓","日出","dawn","sunrise"],"tags":[]},{"id":"environment_moon","canonical":"月亮","category":"environment","priority":4,"aliases":["月亮","月球","血月","红月","双月","moon","blood moon"],"tags":[]},{"id":"environment_sun","canonical":"太阳","category":"environment","priority":4,"aliases":["太阳","烈日","黑日","双太阳","sun","black sun"],"tags":[]},{"id":"domain_structure","canonical":"结构","category":"domain","priority":7,"aliases":["结构","建筑结构","生成建筑","遗迹","structure","building","generated structure"],"tags":[]},{"id":"structure_house","canonical":"房屋","category":"structure","priority":4,"aliases":["房屋","住宅","房子","木屋","豪宅","house","home","mansion"],"tags":[]},{"id":"structure_castle","canonical":"城堡","category":"structure","priority":5,"aliases":["城堡","要塞","堡垒","宫殿","王宫","castle","fortress","palace","citadel"],"tags":[]},{"id":"structure_tower","canonical":"高塔","category":"structure","priority":5,"aliases":["高塔","塔","法师塔","瞭望塔","尖塔","tower","spire"],"tags":[]},{"id":"structure_temple","canonical":"神殿","category":"structure","priority":5,"aliases":["神殿","寺庙","祭坛","圣殿","庙宇","temple","shrine","sanctuary"],"tags":[]},{"id":"structure_dungeon","canonical":"地牢","category":"structure","priority":6,"aliases":["地牢","地下城","副本","牢房","迷宫地牢","dungeon","instance","crypt"],"tags":[]},{"id":"structure_ruins","canonical":"遗迹","category":"structure","priority":5,"aliases":["遗迹","废墟","古迹","残骸","ruins","ancient ruins"],"tags":[]},{"id":"structure_city","canonical":"城市结构","category":"structure","priority":5,"aliases":["城市结构","废弃城市","未来都市","古城","city structure","generated city"],"tags":[]},{"id":"structure_maze","canonical":"迷宫","category":"structure","priority":5,"aliases":["迷宫","谜宫","地下迷宫","maze","labyrinth"],"tags":[]},{"id":"structure_arena","canonical":"竞技场","category":"structure","priority":5,"aliases":["竞技场","斗兽场","擂台","战场","arena","colosseum","battlefield"],"tags":[]},{"id":"structure_boss_room","canonical":"Boss房","category":"structure","priority":6,"aliases":["Boss房","首领房","关底房","Boss房间","boss room","boss chamber"],"tags":[]},{"id":"structure_ship","canonical":"船","category":"structure","priority":4,"aliases":["船","帆船","海盗船","战舰","沉船","ship","boat","pirate ship","wreck"],"tags":[]},{"id":"structure_spaceship","canonical":"飞船","category":"structure","priority":5,"aliases":["飞船","宇宙飞船","太空船","星舰","spaceship","starship"],"tags":[]},{"id":"structure_station","canonical":"车站","category":"structure","priority":4,"aliases":["车站","火车站","空间站","基地","前哨站","station","space station","outpost","base"],"tags":[]},{"id":"structure_bridge","canonical":"桥梁","category":"structure","priority":3,"aliases":["桥梁","桥","吊桥","天桥","bridge"],"tags":[]},{"id":"structure_road","canonical":"道路","category":"structure","priority":3,"aliases":["道路","路","公路","铁路","轨道","road","highway","railway"],"tags":[]},{"id":"domain_rule","canonical":"规则","category":"domain","priority":7,"aliases":["规则","游戏规则","世界规则","机制","限制","rule","gamerule","mechanic"],"tags":[]},{"id":"rule_keep_inventory","canonical":"死亡不掉落","category":"rule","priority":6,"aliases":["死亡不掉落","保留物品","保留背包","keep inventory","keepinventory"],"tags":[]},{"id":"rule_no_regen","canonical":"禁止自然回血","category":"rule","priority":6,"aliases":["禁止自然回血","不能回血","无自然恢复","关闭回血","no regeneration","disable regen"],"tags":[]},{"id":"rule_hardcore","canonical":"极限模式","category":"rule","priority":6,"aliases":["极限模式","硬核","一命模式","死亡删档","hardcore","permadeath"],"tags":[]},{"id":"rule_peaceful","canonical":"和平模式","category":"rule","priority":5,"aliases":["和平模式","无敌怪","不刷怪","peaceful","no hostile mobs"],"tags":[]},{"id":"rule_mob_griefing","canonical":"生物破坏","category":"rule","priority":4,"aliases":["生物破坏","怪物破坏方块","苦力怕破坏","mob griefing","mobgriefing"],"tags":[]},{"id":"rule_no_break","canonical":"禁止破坏方块","category":"rule","priority":5,"aliases":["禁止破坏方块","不能挖掘","不能拆家","锁定方块","no block breaking","adventure restrictions"],"tags":[]},{"id":"rule_no_place","canonical":"禁止放置方块","category":"rule","priority":5,"aliases":["禁止放置方块","不能放方块","禁止建造","no block placing"],"tags":[]},{"id":"rule_no_sleep","canonical":"禁止睡觉","category":"rule","priority":5,"aliases":["禁止睡觉","不能睡觉","床会爆炸","no sleeping","disable sleep"],"tags":[]},{"id":"rule_pvp","canonical":"玩家对战","category":"rule","priority":5,"aliases":["玩家对战","PVP","pvp","玩家互打","友军伤害","friendly fire"],"tags":[]},{"id":"rule_border","canonical":"世界边界","category":"rule","priority":5,"aliases":["世界边界","缩圈","毒圈","安全区","world border","shrinking border","battle royale circle"],"tags":[]},{"id":"rule_spectator_death","canonical":"死亡变旁观","category":"rule","priority":4,"aliases":["死亡变旁观","死后旁观","死亡进入观察者","spectator on death"],"tags":[]},{"id":"domain_game_mode","canonical":"玩法模式","category":"domain","priority":7,"aliases":["玩法模式","游戏模式","模式","玩法","game mode","mode","gameplay"],"tags":[]},{"id":"mode_survival","canonical":"生存","category":"mode","priority":5,"aliases":["生存","生存模式","荒野求生","survival"],"tags":[]},{"id":"mode_adventure","canonical":"冒险","category":"mode","priority":5,"aliases":["冒险","冒险模式","探索","adventure","exploration"],"tags":[]},{"id":"mode_rpg","canonical":"RPG","category":"mode","priority":6,"aliases":["RPG","角色扮演","升级打怪","职业养成","rpg","role-playing"],"tags":[]},{"id":"mode_roguelike","canonical":"肉鸽","category":"mode","priority":6,"aliases":["肉鸽","Roguelike","roguelite","随机地牢","一命闯关","rogue-like","rogue-lite"],"tags":[]},{"id":"mode_tower_defense","canonical":"塔防","category":"mode","priority":5,"aliases":["塔防","守塔","防守波次","tower defense","td"],"tags":[]},{"id":"mode_wave_survival","canonical":"波次生存","category":"mode","priority":6,"aliases":["波次生存","尸潮生存","守城","一波波怪","wave survival","horde mode"],"tags":[]},{"id":"mode_pvp","canonical":"PVP模式","category":"mode","priority":5,"aliases":["PVP模式","竞技对战","玩家战斗","pvp mode","versus"],"tags":[]},{"id":"mode_parkour","canonical":"跑酷","category":"mode","priority":5,"aliases":["跑酷","跳跳乐","障碍赛","parkour","obby","obstacle course"],"tags":[]},{"id":"mode_puzzle","canonical":"解谜","category":"mode","priority":5,"aliases":["解谜","谜题","机关解谜","puzzle","riddle"],"tags":[]},{"id":"mode_battle_royale","canonical":"大逃杀","category":"mode","priority":5,"aliases":["大逃杀","吃鸡","百人对战","battle royale","br"],"tags":[]},{"id":"mode_skyblock","canonical":"空岛生存","category":"mode","priority":5,"aliases":["空岛生存","空岛","skyblock","sky block"],"tags":[]},{"id":"mode_oneblock","canonical":"单方块生存","category":"mode","priority":5,"aliases":["单方块生存","一格空岛","one block","oneblock"],"tags":[]},{"id":"mode_capture_flag","canonical":"夺旗","category":"mode","priority":4,"aliases":["夺旗","抢旗","capture the flag","ctf"],"tags":[]},{"id":"mode_hide_seek","canonical":"躲猫猫","category":"mode","priority":4,"aliases":["躲猫猫","捉迷藏","hide and seek","prop hunt"],"tags":[]},{"id":"domain_event","canonical":"事件","category":"domain","priority":7,"aliases":["事件","随机事件","世界事件","活动","event","world event"],"tags":[]},{"id":"event_wave","canonical":"波次","category":"event","priority":5,"aliases":["波次","一波怪","怪物波","轮次","wave","round"],"tags":[]},{"id":"event_horde","canonical":"尸潮","category":"event","priority":6,"aliases":["尸潮","僵尸潮","怪潮","兽潮","大军入侵","horde","swarm","mob invasion"],"tags":[]},{"id":"event_invasion","canonical":"入侵","category":"event","priority":5,"aliases":["入侵","侵略","袭击","突袭","攻城","invasion","raid","siege"],"tags":[]},{"id":"event_blood_moon","canonical":"血月","category":"event","priority":6,"aliases":["血月","红月之夜","血色月亮","blood moon"],"tags":[]},{"id":"event_eclipse","canonical":"日食","category":"event","priority":5,"aliases":["日食","月食","天狗食日","eclipse","solar eclipse","lunar eclipse"],"tags":[]},{"id":"event_meteor","canonical":"陨石事件","category":"event","priority":5,"aliases":["陨石事件","陨石坠落","流星撞击","meteor impact","meteor event"],"tags":[]},{"id":"event_earthquake","canonical":"地震","category":"event","priority":5,"aliases":["地震","震动","地裂","earthquake","tremor"],"tags":[]},{"id":"event_flood","canonical":"洪水","category":"event","priority":5,"aliases":["洪水","海啸","水灾","flood","tsunami"],"tags":[]},{"id":"event_plague","canonical":"瘟疫","category":"event","priority":5,"aliases":["瘟疫","病毒","感染","疫病","plague","pandemic","infection"],"tags":[]},{"id":"event_supply_drop","canonical":"空投","category":"event","priority":4,"aliases":["空投","补给箱","补给投放","supply drop","airdrop"],"tags":[]},{"id":"domain_quest","canonical":"任务","category":"domain","priority":7,"aliases":["任务","委托","目标","使命","主线","支线","quest","mission","objective"],"tags":[]},{"id":"quest_main","canonical":"主线任务","category":"quest","priority":5,"aliases":["主线任务","主任务","剧情任务","main quest","main mission"],"tags":[]},{"id":"quest_side","canonical":"支线任务","category":"quest","priority":5,"aliases":["支线任务","支线","可选任务","side quest","optional quest"],"tags":[]},{"id":"domain_story","canonical":"剧情","category":"domain","priority":6,"aliases":["剧情","故事","世界观","叙事","章节","story","plot","narrative","lore"],"tags":[]},{"id":"domain_dialogue","canonical":"对话","category":"domain","priority":5,"aliases":["对话","台词","聊天","交谈","对白","dialogue","conversation"],"tags":[]},{"id":"domain_faction","canonical":"阵营","category":"domain","priority":5,"aliases":["阵营","势力","派系","公会","国家","faction","guild","clan","宗门","门派","帮派","教派","联盟","氏族","sect"],"tags":[]},{"id":"domain_reputation","canonical":"声望","category":"domain","priority":5,"aliases":["声望","好感度","关系值","信誉","reputation","affinity","standing"],"tags":[]},{"id":"domain_economy","canonical":"经济","category":"domain","priority":6,"aliases":["经济","货币系统","市场","交易经济","economy","market"],"tags":[]},{"id":"domain_currency","canonical":"货币","category":"domain","priority":5,"aliases":["货币","金币","银币","钱","点券","代币","currency","coin","token","money"],"tags":[]},{"id":"domain_shop","canonical":"商店","category":"domain","priority":5,"aliases":["商店","商城","店铺","商人菜单","shop","store","vendor"],"tags":[]},{"id":"domain_trade","canonical":"交易","category":"domain","priority":5,"aliases":["交易","买卖","交换","贸易","trade","barter","exchange"],"tags":[]},{"id":"domain_auction","canonical":"拍卖行","category":"domain","priority":5,"aliases":["拍卖行","市场挂单","交易所","auction","auction house","marketplace"],"tags":[]},{"id":"domain_class","canonical":"职业","category":"domain","priority":6,"aliases":["职业","角色职业","兵种","流派","class","job","profession"],"tags":[]},{"id":"domain_skill","canonical":"技能","category":"domain","priority":7,"aliases":["技能","能力","招式","技艺","天赋技能","skill","ability","technique"],"tags":[]},{"id":"domain_talent","canonical":"天赋","category":"domain","priority":6,"aliases":["天赋","天赋树","技能树","专精","talent","skill tree","perk"],"tags":[]},{"id":"domain_level","canonical":"等级","category":"domain","priority":5,"aliases":["等级","级别","经验等级","升级系统","level","rank","xp level"],"tags":[]},{"id":"domain_experience","canonical":"经验","category":"domain","priority":5,"aliases":["经验","经验值","XP","熟练度","experience","xp","mastery"],"tags":[]},{"id":"domain_magic","canonical":"魔法","category":"domain","priority":7,"aliases":["魔法","法术","术法","魔力","奥术","magic","spell","sorcery","arcane"],"tags":[]},{"id":"domain_mana","canonical":"法力","category":"domain","priority":5,"aliases":["法力","魔力值","蓝量","mana","mp"],"tags":[]},{"id":"domain_spell","canonical":"法术","category":"domain","priority":6,"aliases":["法术","咒语","魔法技能","spell","incantation"],"tags":[]},{"id":"domain_alchemy","canonical":"炼金","category":"domain","priority":5,"aliases":["炼金","炼金术","合成药剂","alchemy","transmutation"],"tags":[]},{"id":"domain_enchant","canonical":"附魔","category":"domain","priority":6,"aliases":["附魔","魔咒","强化词条","enchantment","enchant"],"tags":[]},{"id":"domain_ritual","canonical":"仪式","category":"domain","priority":5,"aliases":["仪式","祭祀","法阵","召唤仪式","ritual","ceremony","summoning circle"],"tags":[]},{"id":"domain_technology","canonical":"科技","category":"domain","priority":7,"aliases":["科技","工业","技术","高科技","tech","technology","industrial"],"tags":[]},{"id":"tech_electric","canonical":"电力","category":"technology","priority":5,"aliases":["电力","电能","电网","电气","electricity","power grid","rf","fe"],"tags":[]},{"id":"tech_steam","canonical":"蒸汽","category":"technology","priority":5,"aliases":["蒸汽","蒸汽动力","锅炉","steam","boiler"],"tags":[]},{"id":"tech_nuclear","canonical":"核能","category":"technology","priority":5,"aliases":["核能","核电","反应堆","辐射","nuclear","reactor","radiation"],"tags":[]},{"id":"tech_solar","canonical":"太阳能","category":"technology","priority":4,"aliases":["太阳能","光伏","太阳能板","solar","solar power"],"tags":[]},{"id":"tech_wind","canonical":"风能","category":"technology","priority":4,"aliases":["风能","风力发电","风车","wind power","wind turbine"],"tags":[]},{"id":"tech_machine","canonical":"工业机器","category":"technology","priority":5,"aliases":["工业机器","加工机","粉碎机","熔炉机","压缩机","industrial machine","processor"],"tags":[]},{"id":"tech_pipe","canonical":"管道","category":"technology","priority":4,"aliases":["管道","物流管","液体管","物品管","pipe","tube","duct"],"tags":[]},{"id":"tech_cable","canonical":"电缆","category":"technology","priority":4,"aliases":["电缆","导线","电线","线缆","cable","wire"],"tags":[]},{"id":"tech_generator","canonical":"发电机","category":"technology","priority":5,"aliases":["发电机","能源发生器","generator","power generator"],"tags":[]},{"id":"tech_battery","canonical":"电池","category":"technology","priority":4,"aliases":["电池","蓄电池","储能块","battery","energy cell"],"tags":[]},{"id":"tech_robot","canonical":"机器人","category":"technology","priority":5,"aliases":["机器人","机械人","无人机","自动机","robot","drone","automaton"],"tags":[]},{"id":"tech_automation","canonical":"自动化","category":"technology","priority":5,"aliases":["自动化","全自动","流水线","自动生产","automation","factory line"],"tags":[]},{"id":"element_fire","canonical":"火焰","category":"element","priority":6,"aliases":["火焰","火","烈焰","燃烧","炎","熔岩","fire","flame","burn","inferno"],"tags":[]},{"id":"element_water","canonical":"水系","category":"element","priority":5,"aliases":["水系","水","潮汐","海洋之力","water","aqua","tidal"],"tags":[]},{"id":"element_ice","canonical":"寒冰","category":"element","priority":6,"aliases":["寒冰","冰","冰霜","冻结","霜冻","寒气","ice","frost","freeze","cryo"],"tags":[]},{"id":"element_lightning","canonical":"闪电","category":"element","priority":7,"aliases":["闪电","雷电","雷霆","天雷","电击","落雷","雷击","天上有动静","打雷劈人","lightning","thunderbolt","electric","shock"],"tags":[]},{"id":"element_wind","canonical":"风系","category":"element","priority":5,"aliases":["风系","风","暴风","气流","wind","air","gale"],"tags":[]},{"id":"element_earth","canonical":"土系","category":"element","priority":5,"aliases":["土系","大地","岩石","地震之力","earth","stone","geo"],"tags":[]},{"id":"element_light","canonical":"光明","category":"element","priority":5,"aliases":["光明","圣光","光系","神圣","light","holy","radiant"],"tags":[]},{"id":"element_dark","canonical":"黑暗","category":"element","priority":5,"aliases":["黑暗","暗影","暗黑","阴影","dark","shadow","void shadow"],"tags":[]},{"id":"element_poison","canonical":"毒素","category":"element","priority":6,"aliases":["毒素","毒","中毒","剧毒","毒液","poison","toxic","venom"],"tags":[]},{"id":"element_wither","canonical":"凋零","category":"element","priority":5,"aliases":["凋零","枯萎","腐败","wither","decay"],"tags":[]},{"id":"element_void","canonical":"虚空","category":"element","priority":5,"aliases":["虚空","空无","深渊","空间裂隙","void","abyss"],"tags":[]},{"id":"element_space","canonical":"空间","category":"element","priority":5,"aliases":["空间","次元力","空间系","space","spatial"],"tags":[]},{"id":"element_time","canonical":"时间系","category":"element","priority":5,"aliases":["时间系","时间魔法","时停","时间倒流","time magic","chronomancy"],"tags":[]},{"id":"element_blood","canonical":"鲜血","category":"element","priority":5,"aliases":["鲜血","血魔法","血系","blood","hemomancy"],"tags":[]},{"id":"element_soul","canonical":"灵魂","category":"element","priority":5,"aliases":["灵魂","魂","魂魄","精神","soul","spirit"],"tags":[]},{"id":"element_nature","canonical":"自然","category":"element","priority":5,"aliases":["自然","生命","木系","森林之力","nature","life","druidic"],"tags":[]},{"id":"effect_damage","canonical":"伤害","category":"effect","priority":7,"aliases":["伤害","攻击力","造成伤害","打疼","输出","damage","attack damage","dmg"],"tags":[]},{"id":"effect_heal","canonical":"治疗","category":"effect","priority":7,"aliases":["治疗","回血","恢复生命","加血","奶","治愈","heal","healing","restore health","regeneration"],"tags":[]},{"id":"effect_shield","canonical":"护盾","category":"effect","priority":6,"aliases":["护盾","防护罩","吸收盾","屏障","shield","barrier","absorption"],"tags":[]},{"id":"effect_knockback","canonical":"击退","category":"effect","priority":5,"aliases":["击退","弹开","推开","震飞","knockback","push"],"tags":[]},{"id":"effect_slow","canonical":"减速","category":"effect","priority":5,"aliases":["减速","迟缓","变慢","slow","slowness"],"tags":[]},{"id":"effect_freeze","canonical":"冻结","category":"effect","priority":6,"aliases":["冻结","冰冻","定住","冻住","freeze","frozen"],"tags":[]},{"id":"effect_burn","canonical":"燃烧","category":"effect","priority":6,"aliases":["燃烧","点燃","着火","烧起来","ignite","burning","set on fire"],"tags":[]},{"id":"effect_poison","canonical":"中毒","category":"effect","priority":6,"aliases":["中毒","施毒","毒伤","poisoned","poison effect"],"tags":[]},{"id":"effect_blind","canonical":"失明","category":"effect","priority":5,"aliases":["失明","致盲","黑屏","blindness","blind"],"tags":[]},{"id":"effect_levitate","canonical":"漂浮","category":"effect","priority":5,"aliases":["漂浮","升空","悬浮","浮空","levitation","float"],"tags":[]},{"id":"effect_teleport","canonical":"传送","category":"effect","priority":7,"aliases":["传送","瞬移","闪现","位移","移形换影","teleport","blink","warp","dash"],"tags":[]},{"id":"effect_summon","canonical":"召唤","category":"effect","priority":7,"aliases":["召唤","呼唤","生成生物","叫出","招来","summon","call","spawn creature"],"tags":[]},{"id":"effect_explode","canonical":"爆炸","category":"effect","priority":7,"aliases":["爆炸","炸开","引爆","爆破","核爆","explode","explosion","detonate","blast"],"tags":[]},{"id":"effect_lightning","canonical":"召唤闪电","category":"effect","priority":7,"aliases":["召唤闪电","落雷","雷击目标","天雷劈下","call lightning","strike lightning"],"tags":[]},{"id":"effect_projectile","canonical":"投射物","category":"effect","priority":6,"aliases":["投射物","子弹","箭矢","火球","能量弹","projectile","bullet","missile","fireball"],"tags":[]},{"id":"effect_area","canonical":"范围效果","category":"effect","priority":6,"aliases":["范围效果","AOE","群体","范围攻击","圆形范围","area of effect","aoe","splash"],"tags":[]},{"id":"effect_chain","canonical":"连锁","category":"effect","priority":5,"aliases":["连锁","弹射","链式","传导","chain","chain reaction","ricochet"],"tags":[]},{"id":"effect_lifesteal","canonical":"吸血","category":"effect","priority":6,"aliases":["吸血","生命偷取","吸取生命","lifesteal","life steal","vampiric"],"tags":[]},{"id":"effect_invincible","canonical":"无敌","category":"effect","priority":6,"aliases":["无敌","免疫伤害","不可伤害","invincible","invulnerable","god mode"],"tags":[]},{"id":"effect_invisible","canonical":"隐身","category":"effect","priority":6,"aliases":["隐身","透明","潜行","invisible","invisibility","stealth"],"tags":[]},{"id":"effect_speed","canonical":"速度提升","category":"effect","priority":6,"aliases":["速度提升","加速","迅捷","跑得更快","speed boost","haste","swiftness"],"tags":[]},{"id":"effect_jump","canonical":"跳跃提升","category":"effect","priority":5,"aliases":["跳跃提升","高跳","超级跳","jump boost","high jump"],"tags":[]},{"id":"effect_flight","canonical":"飞行","category":"effect","priority":6,"aliases":["飞行","会飞","自由飞","滑翔","flight","fly","glide"],"tags":[]},{"id":"effect_pull","canonical":"拉取","category":"effect","priority":5,"aliases":["拉取","吸引","聚怪","牵引","pull","attract","vacuum"],"tags":[]},{"id":"effect_stun","canonical":"眩晕","category":"effect","priority":5,"aliases":["眩晕","定身","麻痹","不能动","stun","paralyze","root"],"tags":[]},{"id":"effect_dispel","canonical":"驱散","category":"effect","priority":5,"aliases":["驱散","清除效果","净化","解除负面","dispel","cleanse","purify"],"tags":[]},{"id":"trigger_right_click","canonical":"右键","category":"trigger","priority":7,"aliases":["右键","右击","使用时","按使用键","use","right click","right-click","on use"],"tags":[]},{"id":"trigger_left_click","canonical":"左键","category":"trigger","priority":5,"aliases":["左键","左击","挥动时","攻击键","left click","left-click"],"tags":[]},{"id":"trigger_hit","canonical":"命中","category":"trigger","priority":7,"aliases":["命中","击中","打到敌人","攻击敌人时","on hit","when hitting","hit"],"tags":[]},{"id":"trigger_kill","canonical":"击杀","category":"trigger","priority":6,"aliases":["击杀","杀死","干掉","斩杀","击败敌人时","on kill","when killed"],"tags":[]},{"id":"trigger_hurt","canonical":"受伤","category":"trigger","priority":6,"aliases":["受伤","挨打","被攻击","掉血时","on hurt","when damaged"],"tags":[]},{"id":"trigger_low_health","canonical":"低血量","category":"trigger","priority":6,"aliases":["低血量","残血","濒死","生命低于","low health","critical health"],"tags":[]},{"id":"trigger_hold","canonical":"手持","category":"trigger","priority":6,"aliases":["手持","拿着","握住","持有时","while held","holding"],"tags":[]},{"id":"trigger_wear","canonical":"穿戴","category":"trigger","priority":6,"aliases":["穿戴","装备时","戴上时","穿上时","while equipped","wearing"],"tags":[]},{"id":"trigger_consume","canonical":"食用","category":"trigger","priority":6,"aliases":["食用","吃下","喝下","使用食物时","consume","eat","drink"],"tags":[]},{"id":"trigger_break","canonical":"破坏方块","category":"trigger","priority":5,"aliases":["破坏方块","挖方块时","采矿时","on block break","mining"],"tags":[]},{"id":"trigger_place","canonical":"放置方块","category":"trigger","priority":5,"aliases":["放置方块","摆放时","建造时","on block place"],"tags":[]},{"id":"trigger_enter_biome","canonical":"进入群系","category":"trigger","priority":5,"aliases":["进入群系","走进某地","进入区域","enter biome","on enter area"],"tags":[]},{"id":"trigger_time","canonical":"定时触发","category":"trigger","priority":5,"aliases":["定时触发","每隔一段时间","周期触发","timer","on interval","scheduled trigger"],"tags":[]},{"id":"trigger_weather","canonical":"天气触发","category":"trigger","priority":5,"aliases":["天气触发","下雨时","雷暴时","when raining","weather trigger"],"tags":[]},{"id":"domain_visual","canonical":"视觉","category":"domain","priority":5,"aliases":["视觉","外观","美术","画面","visual","appearance","art"],"tags":[]},{"id":"domain_texture","canonical":"贴图","category":"domain","priority":6,"aliases":["贴图","纹理","材质","皮肤","texture","skin"],"tags":[]},{"id":"domain_model","canonical":"模型","category":"domain","priority":6,"aliases":["模型","3D模型","物品模型","方块模型","model","3d model"],"tags":[]},{"id":"domain_animation","canonical":"动画","category":"domain","priority":5,"aliases":["动画","动作","动效","运动","animation","motion"],"tags":[]},{"id":"domain_particle","canonical":"粒子","category":"domain","priority":6,"aliases":["粒子","粒子效果","特效","光效","particle","vfx","visual effect"],"tags":[]},{"id":"domain_sound","canonical":"音效","category":"domain","priority":5,"aliases":["音效","声音","声效","sound","sfx","audio effect"],"tags":[]},{"id":"domain_music","canonical":"音乐","category":"domain","priority":5,"aliases":["音乐","背景音乐","BGM","配乐","music","bgm","soundtrack"],"tags":[]},{"id":"domain_gui","canonical":"GUI","category":"domain","priority":6,"aliases":["GUI","界面","菜单","窗口","面板","hud","ui","gui","interface"],"tags":[]},{"id":"color_red","canonical":"红色","category":"color","priority":3,"aliases":["红色","红","赤色","血红","猩红","暗红","red","crimson","scarlet"],"tags":[]},{"id":"color_orange","canonical":"橙色","category":"color","priority":3,"aliases":["橙色","橙","橘色","orange"],"tags":[]},{"id":"color_yellow","canonical":"黄色","category":"color","priority":3,"aliases":["黄色","黄","金黄","yellow"],"tags":[]},{"id":"color_green","canonical":"绿色","category":"color","priority":3,"aliases":["绿色","绿","翠绿","青绿","green","emerald"],"tags":[]},{"id":"color_blue","canonical":"蓝色","category":"color","priority":3,"aliases":["蓝色","蓝","深蓝","天蓝","湛蓝","blue","azure","cyan"],"tags":[]},{"id":"color_purple","canonical":"紫色","category":"color","priority":3,"aliases":["紫色","紫","深紫","violet","purple","magenta"],"tags":[]},{"id":"color_pink","canonical":"粉色","category":"color","priority":3,"aliases":["粉色","粉红","桃红","pink"],"tags":[]},{"id":"color_black","canonical":"黑色","category":"color","priority":3,"aliases":["黑色","黑","漆黑","墨黑","black","dark"],"tags":[]},{"id":"color_white","canonical":"白色","category":"color","priority":3,"aliases":["白色","白","雪白","纯白","white"],"tags":[]},{"id":"color_gray","canonical":"灰色","category":"color","priority":3,"aliases":["灰色","灰","银灰","gray","grey"],"tags":[]},{"id":"color_gold","canonical":"金色","category":"color","priority":3,"aliases":["金色","黄金色","鎏金","gold","golden"],"tags":[]},{"id":"color_silver","canonical":"银色","category":"color","priority":3,"aliases":["银色","银白","silver"],"tags":[]},{"id":"color_rainbow","canonical":"彩虹色","category":"color","priority":3,"aliases":["彩虹色","七彩","五彩","炫彩","rainbow","multicolor","prismatic"],"tags":[]},{"id":"color_transparent","canonical":"透明","category":"color","priority":3,"aliases":["透明","半透明","玻璃质感","transparent","translucent"],"tags":[]},{"id":"style_medieval","canonical":"中世纪","category":"style","priority":4,"aliases":["中世纪","中古","骑士风","城堡风","medieval","knight"],"tags":[]},{"id":"style_chinese","canonical":"中国风","category":"style","priority":4,"aliases":["中国风","中式","国风","华夏风","古风","Chinese style","oriental"],"tags":[]},{"id":"style_japanese","canonical":"日式","category":"style","priority":4,"aliases":["日式","和风","日本风","Japanese style"],"tags":[]},{"id":"style_fantasy","canonical":"奇幻","category":"style","priority":4,"aliases":["奇幻","魔幻","幻想","西幻","fantasy"],"tags":[]},{"id":"style_dark_fantasy","canonical":"黑暗奇幻","category":"style","priority":4,"aliases":["黑暗奇幻","暗黑幻想","dark fantasy","grimdark"],"tags":[]},{"id":"style_scifi","canonical":"科幻","category":"style","priority":4,"aliases":["科幻","未来科技","太空风","science fiction","sci-fi","scifi"],"tags":[]},{"id":"style_cyberpunk","canonical":"赛博朋克","category":"style","priority":4,"aliases":["赛博朋克","赛博","霓虹未来","cyberpunk"],"tags":[]},{"id":"style_steampunk","canonical":"蒸汽朋克","category":"style","priority":4,"aliases":["蒸汽朋克","蒸汽机械风","steampunk"],"tags":[]},{"id":"style_apocalypse","canonical":"末日","category":"style","priority":4,"aliases":["末日","末世","灾后","废土末日","apocalypse","post-apocalyptic"],"tags":[]},{"id":"style_horror","canonical":"恐怖","category":"style","priority":4,"aliases":["恐怖","惊悚","阴森","诡异","horror","scary","creepy"],"tags":[]},{"id":"style_cute","canonical":"可爱","category":"style","priority":4,"aliases":["可爱","萌","卡通","Q版","cute","kawaii","cartoon"],"tags":[]},{"id":"style_minimal","canonical":"简约","category":"style","priority":4,"aliases":["简约","极简","干净","minimal","minimalist"],"tags":[]},{"id":"style_realistic","canonical":"写实","category":"style","priority":4,"aliases":["写实","真实","现实风","realistic"],"tags":[]},{"id":"style_pixel","canonical":"像素风","category":"style","priority":4,"aliases":["像素风","复古像素","pixel art","pixelated"],"tags":[]},{"id":"style_martial","canonical":"武侠","category":"style","priority":4,"aliases":["武侠","江湖","侠客","wuxia","martial arts"],"tags":[]},{"id":"style_xianxia","canonical":"修仙","category":"style","priority":4,"aliases":["修仙","仙侠","玄幻修真","cultivation","xianxia"],"tags":[]},{"id":"style_cthulhu","canonical":"克苏鲁","category":"style","priority":4,"aliases":["克苏鲁","不可名状","旧日支配者","cthulhu","lovecraftian"],"tags":[]},{"id":"style_ancient","canonical":"远古","category":"style","priority":4,"aliases":["远古","史前","太古","ancient","prehistoric"],"tags":[]},{"id":"style_modern","canonical":"现代","category":"style","priority":4,"aliases":["现代","都市现代","modern","contemporary"],"tags":[]},{"id":"domain_recipe","canonical":"配方","category":"domain","priority":7,"aliases":["配方","合成表","合成配方","制作表","recipe","crafting recipe"],"tags":[]},{"id":"domain_loot","canonical":"掉落表","category":"domain","priority":7,"aliases":["掉落表","战利品表","掉落","爆率","loot table","drops","loot"],"tags":[]},{"id":"domain_command","canonical":"指令","category":"domain","priority":6,"aliases":["指令","命令","命令方块指令","command","minecraft command"],"tags":[]},{"id":"domain_function","canonical":"函数","category":"domain","priority":6,"aliases":["函数","mcfunction","功能函数","function","function file"],"tags":[]},{"id":"domain_advancement","canonical":"进度","category":"domain","priority":6,"aliases":["进度","成就","挑战进度","advancement","achievement"],"tags":[]},{"id":"domain_predicate","canonical":"谓词","category":"domain","priority":5,"aliases":["谓词","条件文件","predicate","condition"],"tags":[]},{"id":"domain_tag","canonical":"标签","category":"domain","priority":5,"aliases":["标签","tag","物品标签","方块标签","function tag"],"tags":[]},{"id":"domain_datapack","canonical":"数据包","category":"domain","priority":7,"aliases":["数据包","原版数据包","datapack","data pack"],"tags":[]},{"id":"domain_resourcepack","canonical":"资源包","category":"domain","priority":7,"aliases":["资源包","材质包","纹理包","resource pack","texture pack"],"tags":[]},{"id":"domain_mod","canonical":"模组","category":"domain","priority":8,"aliases":["模组","MOD","mod","模组包","插件模组","forge mod","fabric mod"],"tags":[]},{"id":"loader_forge","canonical":"Forge","category":"loader","priority":6,"aliases":["Forge","forge","Minecraft Forge","锻造加载器"],"tags":[]},{"id":"loader_fabric","canonical":"Fabric","category":"loader","priority":5,"aliases":["Fabric","fabric","织物加载器"],"tags":[]},{"id":"loader_neoforge","canonical":"NeoForge","category":"loader","priority":5,"aliases":["NeoForge","neoforge","新forge"],"tags":[]},{"id":"domain_nbt","canonical":"NBT","category":"domain","priority":5,"aliases":["NBT","nbt","数据标签","物品数据","compound tag"],"tags":[]},{"id":"domain_worldgen","canonical":"世界生成","category":"domain","priority":7,"aliases":["世界生成","worldgen","地形生成","维度生成","地图生成"],"tags":[]},{"id":"domain_spawn","canonical":"生成规则","category":"domain","priority":6,"aliases":["生成规则","出生规则","刷怪规则","spawn rule","spawning"],"tags":[]},{"id":"domain_behavior","canonical":"行为","category":"domain","priority":6,"aliases":["行为","AI行为","行为树","动作逻辑","behavior","behaviour","ai behavior"],"tags":[]},{"id":"domain_ai","canonical":"生物AI","category":"domain","priority":6,"aliases":["生物AI","人工智能","怪物AI","寻路","ai","pathfinding","behavior tree"],"tags":[]},{"id":"domain_network","canonical":"联机同步","category":"domain","priority":5,"aliases":["联机同步","网络同步","多人同步","客户端服务端","network sync","multiplayer sync"],"tags":[]},{"id":"domain_config","canonical":"配置","category":"domain","priority":5,"aliases":["配置","设置文件","配置项","config","configuration","settings"],"tags":[]},{"id":"domain_localization","canonical":"语言文件","category":"domain","priority":5,"aliases":["语言文件","翻译","本地化","lang","localization","translation"],"tags":[]},{"id":"material_wood","canonical":"木头","category":"material","priority":3,"aliases":["木头","木","木材","原木","wood","wooden"],"tags":[]},{"id":"material_stone","canonical":"石头","category":"material","priority":3,"aliases":["石头","石","岩石","stone","rock"],"tags":[]},{"id":"material_iron","canonical":"铁","category":"material","priority":3,"aliases":["铁","铁质","钢铁","iron","steel"],"tags":[]},{"id":"material_gold","canonical":"黄金","category":"material","priority":3,"aliases":["黄金","金","金质","gold","golden"],"tags":[]},{"id":"material_diamond","canonical":"钻石","category":"material","priority":3,"aliases":["钻石","钻石质","diamond"],"tags":[]},{"id":"material_netherite","canonical":"下界合金","category":"material","priority":3,"aliases":["下界合金","合金","远古合金","netherite"],"tags":[]},{"id":"material_obsidian","canonical":"黑曜石","category":"material","priority":3,"aliases":["黑曜石","曜石","obsidian"],"tags":[]},{"id":"material_amethyst","canonical":"紫水晶","category":"material","priority":3,"aliases":["紫水晶","水晶","amethyst"],"tags":[]},{"id":"material_copper","canonical":"铜","category":"material","priority":3,"aliases":["铜","铜质","copper"],"tags":[]},{"id":"material_quartz","canonical":"石英","category":"material","priority":3,"aliases":["石英","下界石英","quartz"],"tags":[]},{"id":"material_crystal","canonical":"晶体","category":"material","priority":3,"aliases":["晶体","魔晶","能量晶体","crystal"],"tags":[]},{"id":"material_bone","canonical":"骨头","category":"material","priority":3,"aliases":["骨头","白骨","bone"],"tags":[]},{"id":"material_flesh","canonical":"血肉","category":"material","priority":3,"aliases":["血肉","肉块","flesh"],"tags":[]},{"id":"material_slime","canonical":"史莱姆","category":"material","priority":3,"aliases":["史莱姆","黏液","slime","goo"],"tags":[]},{"id":"parameter_health","canonical":"生命值","category":"parameter","priority":6,"aliases":["生命值","血量","HP","hp","health","max health"],"tags":[]},{"id":"parameter_damage","canonical":"攻击伤害","category":"parameter","priority":6,"aliases":["攻击伤害","伤害值","攻击力","damage","attack damage"],"tags":[]},{"id":"parameter_speed","canonical":"速度","category":"parameter","priority":5,"aliases":["速度","移动速度","攻击速度","speed","movement speed","attack speed"],"tags":[]},{"id":"parameter_cooldown","canonical":"冷却","category":"parameter","priority":6,"aliases":["冷却","CD","cd","冷却时间","间隔","cooldown","recharge"],"tags":[]},{"id":"parameter_range","canonical":"范围","category":"parameter","priority":5,"aliases":["范围","距离","射程","半径","range","radius","reach"],"tags":[]},{"id":"parameter_power","canonical":"威力","category":"parameter","priority":5,"aliases":["威力","强度","等级","power","strength"],"tags":[]},{"id":"parameter_probability","canonical":"概率","category":"parameter","priority":5,"aliases":["概率","几率","爆率","机率","chance","probability","rate"],"tags":[]},{"id":"parameter_duration","canonical":"持续时间","category":"parameter","priority":5,"aliases":["持续时间","时长","持续多久","duration","lasting time"],"tags":[]},{"id":"parameter_count","canonical":"数量","category":"parameter","priority":5,"aliases":["数量","个数","多少个","数量上限","count","amount","number"],"tags":[]},{"id":"parameter_durability","canonical":"耐久","category":"parameter","priority":5,"aliases":["耐久","耐久度","使用次数","durability","uses"],"tags":[]},{"id":"parameter_rarity","canonical":"稀有度","category":"parameter","priority":5,"aliases":["稀有度","品质","品级","rarity","quality","tier"],"tags":[]},{"id":"theme_heaven","canonical":"天堂","category":"theme","priority":4,"aliases":["天堂","天界","神界","圣域","heaven","celestial realm"],"tags":[]},{"id":"theme_hell","canonical":"地狱","category":"theme","priority":4,"aliases":["地狱","炼狱","魔界","inferno","hell","underworld"],"tags":[]},{"id":"theme_space","canonical":"太空","category":"theme","priority":4,"aliases":["太空","宇宙","星际","外星","space","cosmos","galaxy","interstellar"],"tags":[]},{"id":"theme_ocean","canonical":"海洋主题","category":"theme","priority":4,"aliases":["海洋主题","海底世界","亚特兰蒂斯","ocean theme","underwater world","atlantis"],"tags":[]},{"id":"theme_dream","canonical":"梦境","category":"theme","priority":4,"aliases":["梦境","幻境","梦世界","dream","dreamscape"],"tags":[]},{"id":"theme_nightmare","canonical":"噩梦","category":"theme","priority":4,"aliases":["噩梦","梦魇","恐怖梦境","nightmare"],"tags":[]},{"id":"theme_corruption","canonical":"腐化","category":"theme","priority":4,"aliases":["腐化","污染","侵蚀","感染蔓延","corruption","taint","blight"],"tags":[]},{"id":"theme_crystal","canonical":"水晶主题","category":"theme","priority":4,"aliases":["水晶主题","晶洞世界","宝石世界","crystal world","gem realm"],"tags":[]},{"id":"theme_candy","canonical":"糖果世界","category":"theme","priority":4,"aliases":["糖果世界","甜品世界","糖果岛","candy land","candy world"],"tags":[]},{"id":"theme_mushroom","canonical":"蘑菇世界","category":"theme","priority":4,"aliases":["蘑菇世界","菌类世界","巨型蘑菇","mushroom world","fungal realm"],"tags":[]}];

  const TRADITIONAL_MAP = new Map(Object.entries({
    '后':'後','里':'裡','只':'隻','发':'發','云':'雲','龙':'龍','灵':'靈','剑':'劍','枪':'槍',
    '铠':'鎧','甲':'甲','锤':'錘','镐':'鎬','锄':'鋤','铲':'鏟','铁':'鐵','铜':'銅','银':'銀',
    '矿':'礦','块':'塊','树':'樹','风':'風','电':'電','闪':'閃','击':'擊','伤':'傷','复':'復',
    '体':'體','图':'圖','画':'畫','声':'聲','乐':'樂','门':'門','传':'傳','输':'輸','术':'術',
    '阵':'陣','国':'國','华':'華','战':'戰','斗':'鬥','级':'級','属':'屬','务':'務','线':'線',
    '时':'時','间':'間','长':'長','东':'東','极':'極','岛':'島','陆':'陸','海':'海','冻':'凍',
    '温':'溫','热':'熱','气':'氣','压':'壓','灭':'滅','无':'無','尽':'盡','边':'邊','际':'際',
    '机':'機','器':'器','网':'網','络':'絡','储':'儲','动':'動','态':'態','开':'開','关':'關',
    '闭':'閉','删':'刪','创':'創','设':'設','计':'計','制':'製','造':'造','优':'優','质':'質',
    '简':'簡','现':'現','实':'實','写':'寫','乡':'鄉','镇':'鎮','村':'村','废':'廢','墟':'墟',
    '宫':'宮','庙':'廟','坛':'壇','层':'層','阶':'階','币':'幣','钱':'錢','买':'買','卖':'賣',
    '换':'換','奖':'獎','励':'勵','验':'驗','职':'職','业':'業','会':'會','话':'話','对':'對',
    '话':'話','剧':'劇','节':'節','恶':'惡','兽':'獸','鸡':'雞','马':'馬','鱼':'魚','鸟':'鳥',
    '虫':'蟲','尸':'屍','丧':'喪','骷':'骷','髅':'髏','宠':'寵','骑':'騎','随':'隨','从':'從',
    '护':'護','药':'藥','炼':'煉','饮':'飲','食':'食','农':'農','获':'獲','触':'觸','锁':'鎖',
    '定':'定','启':'啟','显':'顯','隐':'隱','颜':'顏','色':'色','蓝':'藍','绿':'綠','红':'紅',
    '黄':'黃','乌':'烏','梦':'夢','魇':'魘','圣':'聖','神':'神','魔':'魔','净':'淨','驱':'驅',
    '缩':'縮','圈':'圈','点':'點','数':'數','量':'量','值':'值','强':'強','弱':'弱','飞':'飛',
    '骑':'騎','舰':'艦','轨':'軌','车':'車','桥':'橋','厅':'廳','馆':'館','库':'庫','仓':'倉'
  }));

  const NEGATION_RE = /(?:不要|别(?:给|做|用|加)?|不想|无需|不需要|禁止|取消|关闭|移除|去掉|排除|没有|无|never|without|disable|remove|exclude|no\s+)$/i;
  const ACTION_RE = /(?:创建|生成|开始|解析|制作|设计|构建|智能|快速|create|generate|build|make|craft|start)/i;
  const EXCLUDED_ACTION_RE = /(?:下载|导出|保存|删除|复制|关闭|返回|download|export|save|delete|copy|close|back)/i;
  const FIELD_RE = /(?:prompt|idea|describe|description|request|natural|smart|create|需求|描述|想法|一句话|创造|创作|你想|要做什么)/i;
  const PARSER_FUNCTION_RE = /(?:prompt|smart|natural|language|idea|description|interpret|semantic|intent|nlp|parse(?:text|prompt|idea|description)|fromtext|textto|quickcreate|createfrom)/i;

  function normalizeForMatch(value) {
    return String(value ?? '')
      .normalize('NFKC')
      .toLowerCase()
      .replace(/[，。！？；：、（）【】《》“”‘’]/g, ' ')
      .replace(/[|/\\]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function compact(value) {
    return normalizeForMatch(value).replace(/[\s_.\-—–]+/g, '');
  }

  function toTraditional(value) {
    let output = '';
    for (const character of String(value ?? '')) {
      output += TRADITIONAL_MAP.get(character) || character;
    }
    return output;
  }

  function variantsFor(alias, concept) {
    const variants = new Set();
    const normalized = normalizeForMatch(alias);
    if (!normalized) return variants;
    variants.add(normalized);

    const noSpace = normalized.replace(/\s+/g, '');
    if (noSpace && noSpace !== normalized) variants.add(noSpace);
    if (/[a-z]/.test(normalized)) {
      variants.add(normalized.replace(/\s+/g, '-'));
      variants.add(normalized.replace(/\s+/g, '_'));
      if (/^[a-z][a-z -]{2,}$/.test(normalized) && !/(?:s|x|z|ch|sh)$/.test(normalized)) {
        variants.add(`${normalized}s`);
      }
    }

    const traditional = normalizeForMatch(toTraditional(alias));
    if (traditional && traditional !== normalized) variants.add(traditional);

    if (/^[\u3400-\u9fff]$/.test(normalized)) {
      if (['weapon', 'tool'].includes(concept.category)) {
        variants.add(normalizeForMatch(`一把${concept.canonical}`));
        variants.add(normalizeForMatch(`一柄${concept.canonical}`));
        variants.add(normalizeForMatch(`${concept.canonical}类武器`));
      } else if (concept.category === 'block') {
        variants.add(normalizeForMatch(`一个${concept.canonical}`));
        variants.add(normalizeForMatch(`一块${concept.canonical}`));
        variants.add(normalizeForMatch(`一扇${concept.canonical}`));
      }
    }
    if (concept.category === 'element') {
      variants.add(normalizeForMatch(`${concept.canonical}系`));
      variants.add(normalizeForMatch(`${concept.canonical}属性`));
      variants.add(normalizeForMatch(`${concept.canonical}魔法`));
    }
    if (concept.category === 'style') {
      variants.add(normalizeForMatch(`${concept.canonical}风`));
      variants.add(normalizeForMatch(`${concept.canonical}主题`));
    }
    if (concept.category === 'domain') {
      variants.add(normalizeForMatch(`${concept.canonical}系统`));
      variants.add(normalizeForMatch(`${concept.canonical}生成器`));
    }
    if (concept.category === 'weather') variants.add(normalizeForMatch(`${concept.canonical}天气`));
    if (concept.category === 'mode') variants.add(normalizeForMatch(`${concept.canonical}模式`));
    if (concept.category === 'terrain') variants.add(normalizeForMatch(`${concept.canonical}地形`));
    return variants;
  }

  const concepts = new Map();
  const aliasMap = new Map();

  for (const raw of RAW_CONCEPTS) {
    const concept = Object.freeze({
      id: raw.id,
      canonical: raw.canonical,
      category: raw.category,
      priority: Number(raw.priority || 1),
      tags: Object.freeze([...(raw.tags || [])]),
      aliases: Object.freeze([...(raw.aliases || [])])
    });
    concepts.set(concept.id, concept);

    for (const alias of concept.aliases) {
      for (const variant of variantsFor(alias, concept)) {
        if (!variant) continue;
        const key = compact(variant);
        if (!key) continue;
        const records = aliasMap.get(key) || [];
        if (!records.some((record) => record.id === concept.id)) {
          records.push({
            id: concept.id,
            canonical: concept.canonical,
            category: concept.category,
            priority: concept.priority,
            alias: variant,
            key
          });
          aliasMap.set(key, records);
        }
      }
    }
  }

  const aliasRecords = [...aliasMap.values()]
    .flat()
    .sort((a, b) => (b.key.length - a.key.length) || (b.priority - a.priority));

  function locateAlias(normalizedText, compactText, record) {
    const alias = record.alias;
    const key = record.key;
    if (/^[a-z0-9]{1,3}$/.test(alias)) {
      const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const match = normalizedText.match(new RegExp(`(?:^|[^a-z0-9])(${escaped})(?=$|[^a-z0-9])`, 'i'));
      return match ? normalizedText.indexOf(match[1], match.index) : -1;
    }
    if (/^[\u3400-\u9fff]$/.test(alias)) {
      const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const boundaryMatch = normalizedText.match(new RegExp(`(?:^|[^\\u3400-\\u9fff])(${escaped})(?=$|[^\\u3400-\\u9fff])`));
      if (boundaryMatch) return compactText.indexOf(key);
      let cursor = normalizedText.indexOf(alias);
      while (cursor >= 0) {
        const before = normalizedText.slice(Math.max(0, cursor - 14), cursor);
        if (/(?:一把|一柄|一扇|一道|一个|一座|一块|一件|一只|这把|那把|这扇|那扇|的|做|造|创建|生成)$/.test(before)) {
          return compactText.indexOf(key);
        }
        cursor = normalizedText.indexOf(alias, cursor + 1);
      }
      return -1;
    }
    return compactText.indexOf(key);
  }

  function isNegated(normalizedText, compactIndex, matchedLength) {
    if (compactIndex < 0) return false;
    const compactText = compact(normalizedText);
    const beforeCompact = compactText.slice(Math.max(0, compactIndex - 8), compactIndex);
    if (NEGATION_RE.test(beforeCompact)) return true;

    const rawIndex = Math.max(0, normalizedText.indexOf(compactText.slice(compactIndex, compactIndex + Math.max(1, matchedLength))));
    const beforeRaw = normalizedText.slice(Math.max(0, rawIndex - 14), rawIndex);
    return NEGATION_RE.test(beforeRaw);
  }

  function analyze(text, options = {}) {
    const normalized = normalizeForMatch(text);
    const compactText = compact(normalized);
    const maxHits = Number.isFinite(options.maxHits) ? Math.max(1, options.maxHits) : 80;
    const byConcept = new Map();

    for (const record of aliasRecords) {
      const index = locateAlias(normalized, compactText, record);
      if (index < 0) continue;
      const negated = isNegated(normalized, index, record.key.length);
      const score = record.priority * 100 + Math.min(record.key.length, 40) * 3 + (negated ? -5 : 0);
      const previous = byConcept.get(record.id);
      if (!previous || score > previous.score) {
        byConcept.set(record.id, {
          id: record.id,
          canonical: record.canonical,
          category: record.category,
          alias: record.alias,
          priority: record.priority,
          score,
          negated
        });
      }
    }

    const hits = [...byConcept.values()]
      .sort((a, b) => (b.score - a.score) || (b.alias.length - a.alias.length))
      .slice(0, maxHits);

    const groups = {};
    for (const hit of hits) {
      (groups[hit.category] ||= []).push(hit);
    }

    const primaryDomain = (groups.domain || []).find((hit) => !hit.negated) || null;
    return {
      original: String(text ?? ''),
      normalized,
      hits,
      groups,
      primaryDomain,
      recognized: hits.length > 0
    };
  }

  const CATEGORY_LABELS = {
    domain: '领域',
    intent: '意图',
    logic: '限制',
    frequency: '频率',
    intensity: '强度',
    size: '尺寸',
    speed: '速度',
    duration: '时长',
    weapon: '武器',
    armor: '防具',
    accessory: '饰品',
    tool: '工具',
    food: '食物',
    block: '方块',
    entity: '生物',
    terrain: '地形',
    environment: '环境',
    weather: '天气',
    time: '时间',
    structure: '结构',
    rule: '规则',
    mode: '玩法',
    event: '事件',
    quest: '任务',
    technology: '科技',
    element: '元素',
    effect: '效果',
    trigger: '触发',
    color: '颜色',
    style: '风格',
    material: '材料',
    parameter: '参数',
    theme: '主题',
    loader: '加载器'
  };

  function semanticSummary(text, options = {}) {
    const result = analyze(text, { maxHits: options.maxHits || 32 });
    if (!result.recognized) return '';
    const maxPerGroup = options.maxPerGroup || 5;
    const orderedCategories = [
      'intent','domain','weapon','armor','tool','block','entity','terrain','environment','weather','time',
      'structure','rule','mode','event','quest','technology','element','effect','trigger','style','theme',
      'color','material','parameter','frequency','intensity','size','speed','duration','logic','loader'
    ];
    const sections = [];

    for (const category of orderedCategories) {
      const group = result.groups[category];
      if (!group?.length) continue;
      const values = [];
      for (const hit of group) {
        const label = `${hit.negated ? '排除' : ''}${hit.canonical}`;
        if (!values.includes(label)) values.push(label);
        if (values.length >= maxPerGroup) break;
      }
      if (values.length) sections.push(`${CATEGORY_LABELS[category] || category}=${values.join('、')}`);
    }
    return sections.join('；');
  }

  function augment(text) {
    const original = String(text ?? '');
    if (!original.trim() || original.includes(MARKER)) return original;
    const summary = semanticSummary(original);
    if (!summary) return original;
    return `${original}\n${MARKER} ${summary}]`;
  }

  function extractTextCandidate(value) {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed.length < 2 || trimmed.length > 5000) return null;
      if (/^[{[]/.test(trimmed) || /^\/[a-z]/i.test(trimmed)) return null;
      return value;
    }
    return null;
  }

  function transformArguments(args) {
    const next = [...args];
    for (let index = 0; index < Math.min(next.length, 3); index += 1) {
      const candidate = extractTextCandidate(next[index]);
      if (candidate !== null) {
        next[index] = augment(candidate);
        return next;
      }
      const value = next[index];
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        for (const key of ['prompt','idea','description','text','request','query']) {
          const nested = extractTextCandidate(value[key]);
          if (nested !== null) {
            next[index] = { ...value, [key]: augment(nested) };
            return next;
          }
        }
      }
    }
    return next;
  }

  let patchedFunctions = 0;
  const patchedObjects = new WeakSet();

  function patchParserFunctions(target, path = 'GameForge', depth = 0) {
    if (!target || (typeof target !== 'object' && typeof target !== 'function') || depth > 3) return;
    if (patchedObjects.has(target)) return;
    patchedObjects.add(target);

    for (const key of Object.keys(target)) {
      let value;
      try {
        value = target[key];
      } catch {
        continue;
      }
      const fullName = `${path}.${key}`;
      if (typeof value === 'function' && PARSER_FUNCTION_RE.test(key) && !value.__gfVocabularyWrapped) {
        const original = value;
        const wrapped = function gameForgeVocabularyWrapped(...args) {
          return original.apply(this, transformArguments(args));
        };
        try {
          Object.defineProperty(wrapped, 'name', { value: original.name || key, configurable: true });
        } catch {
          // Function names are cosmetic.
        }
        Object.defineProperties(wrapped, {
          __gfVocabularyWrapped: { value: true },
          __gfVocabularyOriginal: { value: original },
          __gfVocabularyPath: { value: fullName }
        });
        try {
          target[key] = wrapped;
          patchedFunctions += 1;
        } catch {
          // Frozen objects are skipped.
        }
      } else if (value && typeof value === 'object' && depth < 3) {
        patchParserFunctions(value, fullName, depth + 1);
      }
    }
  }

  function patchKnownRoots() {
    const gameForge = ROOT.GameForge;
    if (!gameForge) return;
    for (const target of [
      gameForge.Generators,
      gameForge.Parser,
      gameForge.NLP,
      gameForge.SmartCreate,
      gameForge
    ]) {
      patchParserFunctions(target);
    }
    if (!gameForge.Vocabulary) gameForge.Vocabulary = API;
  }

  function fieldScore(field) {
    if (!field || field.disabled || field.readOnly) return -100;
    const tag = field.tagName?.toLowerCase();
    const type = String(field.type || '').toLowerCase();
    if (tag !== 'textarea' && !(tag === 'input' && (!type || ['text','search'].includes(type)))) return -100;

    const metadata = [
      field.id, field.name, field.placeholder, field.getAttribute?.('aria-label'),
      field.getAttribute?.('data-role'), field.className
    ].filter(Boolean).join(' ');
    let score = FIELD_RE.test(metadata) ? 8 : 0;
    if (tag === 'textarea') score += 4;
    if (String(field.value || '').trim().length >= 4) score += 2;
    const nearby = field.closest?.('form, section, article, .card, .panel, .workspace');
    if (nearby && FIELD_RE.test(nearby.textContent || '')) score += 3;
    if (/(?:name|title|modid|version|namespace|名称|标题|版本|命名空间)/i.test(metadata)) score -= 10;
    return score;
  }

  function findPromptField(actionTarget) {
    const containers = [];
    let current = actionTarget;
    for (let depth = 0; current && depth < 5; depth += 1, current = current.parentElement) {
      containers.push(current);
    }
    containers.push(document);

    let best = null;
    let bestScore = -100;
    for (const container of containers) {
      for (const field of container.querySelectorAll?.('textarea, input[type="text"], input[type="search"]') || []) {
        const score = fieldScore(field);
        if (score > bestScore) {
          best = field;
          bestScore = score;
        }
      }
      if (bestScore >= 10) break;
    }
    return bestScore >= 6 ? best : null;
  }

  function setFieldValue(field, value) {
    const prototype = field.tagName?.toLowerCase() === 'textarea'
      ? ROOT.HTMLTextAreaElement?.prototype
      : ROOT.HTMLInputElement?.prototype;
    const setter = prototype && Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
    if (setter) setter.call(field, value);
    else field.value = value;
    field.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function temporarilyAugmentField(field) {
    const original = String(field?.value || '');
    const augmented = augment(original);
    if (!field || augmented === original) return;
    setFieldValue(field, augmented);
    field.dataset.gfVocabularyAugmented = 'true';
    ROOT.setTimeout(() => {
      if (field.dataset.gfVocabularyAugmented === 'true' && field.value === augmented) {
        setFieldValue(field, original);
      }
      delete field.dataset.gfVocabularyAugmented;
    }, 40);
  }

  function installDomBridge() {
    if (typeof document === 'undefined') return;

    document.addEventListener('click', (event) => {
      const action = event.target?.closest?.('button, [role="button"], input[type="submit"], a');
      if (!action) return;
      const label = [
        action.textContent, action.value, action.getAttribute?.('aria-label'), action.title
      ].filter(Boolean).join(' ');
      if (!ACTION_RE.test(label) || EXCLUDED_ACTION_RE.test(label)) return;
      if (patchedFunctions > 0) return;
      const field = findPromptField(action);
      if (field) temporarilyAugmentField(field);
    }, true);

    document.addEventListener('submit', (event) => {
      if (patchedFunctions > 0) return;
      const field = findPromptField(event.target);
      if (field) temporarilyAugmentField(field);
    }, true);

    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' || event.shiftKey || patchedFunctions > 0) return;
      const field = event.target;
      if (fieldScore(field) >= 6) temporarilyAugmentField(field);
    }, true);

    let inputTimer = 0;
    document.addEventListener('input', (event) => {
      const field = event.target;
      if (fieldScore(field) < 6 || field.dataset.gfVocabularyAugmented === 'true') return;
      ROOT.clearTimeout(inputTimer);
      inputTimer = ROOT.setTimeout(() => {
        const result = analyze(field.value, { maxHits: 40 });
        field.dataset.gfConcepts = result.hits.map((hit) => hit.id).join(',');
        field.dispatchEvent(new CustomEvent('gameforge:vocabulary', {
          bubbles: true,
          detail: result
        }));
      }, 180);
    }, true);
  }

  const API = Object.freeze({
    version: VERSION,
    conceptCount: concepts.size,
    aliasCount: aliasMap.size,
    productivePhraseEstimate: aliasMap.size * 18,
    concepts,
    normalize: normalizeForMatch,
    analyze,
    semanticSummary,
    augment,
    get patchedFunctions() {
      return patchedFunctions;
    }
  });

  ROOT.GameForgeVocabulary = API;
  if (ROOT.GameForge && !ROOT.GameForge.Vocabulary) ROOT.GameForge.Vocabulary = API;

  patchKnownRoots();
  installDomBridge();

  let patchAttempts = 0;
  const patchTimer = ROOT.setInterval?.(() => {
    patchKnownRoots();
    patchAttempts += 1;
    if (patchAttempts >= 20) ROOT.clearInterval?.(patchTimer);
  }, 250);

  ROOT.console?.info?.(
    `[GameForge Vocabulary] ${concepts.size} concepts, ${aliasMap.size} direct aliases, ` +
    `~${API.productivePhraseEstimate} composable local phrases; patched ${patchedFunctions} parser function(s).`
  );
})();
