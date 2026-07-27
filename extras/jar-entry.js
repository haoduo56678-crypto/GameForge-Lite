'use strict';

/*
 * GameForge Lite supplemental local vocabulary.
 *
 * This intentionally augments the existing semantic engine instead of
 * replacing it. The main vocabulary remains the source of truth; these
 * aliases broaden the ways players can describe worlds, dimensions,
 * structures, systems, creatures, styles and gameplay ideas without AI.
 */
(() => {
  const groups = [
    ['domain_world', '世界', [
      '世界','新世界','全新世界','另一个世界','异世界','主世界','大世界','开放世界','沙盒世界','生存世界','冒险世界','幻想世界','魔幻世界','奇幻世界','玄幻世界','修仙世界','武侠世界','仙侠世界','神话世界','远古世界','史前世界','未来世界','末日世界','废土世界','灾变世界','灾后世界','荒芜世界','破碎世界','黑暗世界','光明世界','梦境世界','镜像世界','平行世界','里世界','表世界','虚拟世界','数字世界','像素世界','童话世界','糖果世界','玩具世界','微缩世界','巨人世界','天空世界','云端世界','海洋世界','水下世界','地下世界','洞穴世界','地心世界','熔岩世界','火焰世界','冰雪世界','寒冬世界','沙漠世界','森林世界','丛林世界','沼泽世界','蘑菇世界','花海世界','荒原世界','草原世界','山地世界','群岛世界','浮岛世界','群星世界','太空世界','月球世界','火星世界','外星世界','机械世界','工业世界','蒸汽世界','赛博世界','朋克世界','末影世界','虚空世界','深渊世界','地狱世界','天堂世界','神域','魔域','仙界','冥界','灵界','妖界','龙界','world','new world','open world','sandbox world','fantasy world','dark world','apocalypse world','underwater world','underground world','sky world','floating island world','alien world','mechanical world','digital world'
    ]],
    ['domain_dimension', '维度', [
      '维度','新维度','自定义维度','异维度','异次元','次元','空间','独立空间','口袋空间','口袋维度','秘境','小世界','位面','界域','领域空间','副世界','平行维度','镜像维度','梦境维度','虚空维度','深渊维度','末日维度','天空维度','海洋维度','地下维度','地狱维度','天堂维度','机械维度','魔法维度','dimension','custom dimension','alternate dimension','pocket dimension','parallel dimension','dream dimension','void dimension'
    ]],
    ['domain_biome', '群系', [
      '群系','生物群系','生态区','生态带','地貌区','区域生态','自定义群系','新群系','森林群系','黑森林','魔法森林','幽暗森林','迷雾森林','腐化森林','樱花林','竹林','雨林','热带雨林','针叶林','红树林','沼泽','泥沼','毒沼','酸液沼泽','湿地','草原','花海','薰衣草田','向日葵田','荒原','荒地','废土','焦土','盐碱地','沙漠','红沙漠','黑沙漠','水晶沙漠','冰原','雪原','冻土','冰川','高山','雪山','火山','峡谷','盆地','丘陵','悬崖','海岸','珊瑚海','深海','海沟','浮岛','云海','地下丛林','蘑菇地','水晶洞穴','熔岩洞穴','钟乳石洞穴','biome','custom biome','forest biome','swamp biome','desert biome','tundra biome','volcanic biome','crystal biome','mushroom biome'
    ]],
    ['terrain_wasteland', '废土地形', [
      '废土','荒废','荒芜','荒凉','寸草不生','焦土','焦黑大地','烧毁的大地','末日荒原','核爆废土','辐射废土','污染区','无人区','死亡之地','破碎大地','龟裂地面','干裂土地','盐碱荒地','风化荒地','残破平原','灰烬平原','黑色荒原','wasteland','badlands','scorched earth','ruined land','desolate land','radioactive wasteland'
    ]],
    ['terrain_city', '城市地形', [
      '城市','都市','城镇','小镇','村镇','村庄','首都','王城','皇城','古城','山城','水城','港口城','天空城','地下城','机械城','工业城','未来城','赛博城市','霓虹都市','末日城市','废弃城市','城市废墟','被淹没的城市','空中都市','巨型都市','都市圈','街区','社区','贫民窟','商业区','工业区','住宅区','老城区','新城区','city','town','village','metropolis','cyber city','neon city','ruined city','abandoned city','floating city','underground city'
    ]],
    ['terrain_mountain', '山地', [
      '山','大山','高山','山峰','群山','山脉','雪山','冰山','火山','死火山','活火山','山谷','峡谷','悬崖','断崖','峭壁','丘陵','高原','台地','盆地','天坑','巨型山峰','环形山','浮空山','水晶山','黑曜石山','熔岩山','mountain','mountains','mountain range','peak','valley','canyon','cliff','plateau','volcano'
    ]],
    ['terrain_ocean', '海洋', [
      '海','海洋','大海','深海','浅海','内海','外海','海湾','海峡','海沟','海底','水下','海床','珊瑚海','冰封海洋','熔岩海','酸液海','毒海','血海','云海','星海','无尽海洋','群岛海洋','海岛世界','ocean','sea','deep ocean','underwater','seabed','coral sea','frozen ocean','endless ocean','archipelago'
    ]],
    ['terrain_island', '岛屿', [
      '岛','岛屿','小岛','大岛','孤岛','荒岛','海岛','群岛','列岛','浮岛','空岛','天空岛','漂浮岛','移动岛','火山岛','冰岛','蘑菇岛','水晶岛','机械岛','监狱岛','神秘岛','主岛','出生岛','资源岛','boss岛','island','islands','archipelago','floating island','sky island','volcanic island','mystery island'
    ]],
    ['time_night', '夜晚', [
      '夜晚','黑夜','夜间','深夜','午夜','永夜','永久黑夜','永远是晚上','没有白天','天不会亮','长夜','极夜','暗夜','血夜','红月之夜','月夜','星夜','漆黑','一片漆黑','night','nighttime','eternal night','permanent night','endless night','midnight','darkness','blood moon night'
    ]],
    ['time_day', '白天', [
      '白天','日间','正午','中午','永昼','永久白天','永远是白天','没有夜晚','天不会黑','极昼','长昼','阳光明媚','晴朗白昼','day','daytime','eternal day','permanent day','endless day','noon'
    ]],
    ['time_dusk', '黄昏', [
      '黄昏','傍晚','日落','夕阳','暮色','薄暮','永恒黄昏','永远黄昏','血色黄昏','红色夕阳','暮光','黎明','清晨','拂晓','破晓','晨曦','dusk','sunset','twilight','eternal dusk','dawn','sunrise'
    ]],
    ['weather_rain', '降雨', [
      '雨','下雨','降雨','小雨','中雨','大雨','暴雨','骤雨','雷雨','阵雨','连绵细雨','倾盆大雨','瓢泼大雨','阴雨','梅雨','雨季','永不停歇的雨','一直下雨','永久降雨','rain','rainy','rainfall','heavy rain','storm rain','endless rain','permanent rain'
    ]],
    ['weather_snow', '降雪', [
      '雪','下雪','降雪','小雪','大雪','暴雪','风雪','冰雪','鹅毛大雪','漫天飞雪','雪暴','雪崩天气','永不停雪','一直下雪','永久降雪','snow','snowfall','snowy','heavy snow','blizzard','endless snow','permanent snow'
    ]],
    ['weather_acid', '酸雨', [
      '酸雨','腐蚀雨','腐化雨','毒雨','毒液雨','绿色雨水','有毒降雨','会掉血的雨','伤害玩家的雨','腐蚀性天气','acid rain','toxic rain','poison rain','corrosive rain','deadly rain'
    ]],
    ['weather_meteor', '流星天气', [
      '流星','流星雨','陨石','陨石雨','陨石风暴','陨石坠落','天降陨石','星落','星陨','彗星雨','天空掉火球','meteor','meteor shower','meteor storm','falling stars','comet rain','asteroid rain'
    ]],
    ['weather_fog', '迷雾', [
      '雾','大雾','浓雾','薄雾','迷雾','毒雾','瘴气','灰雾','黑雾','红雾','永恒迷雾','能见度低','看不清远处','fog','foggy','mist','heavy fog','toxic fog','eternal fog','low visibility'
    ]],
    ['weather_storm', '风暴', [
      '风暴','暴风','狂风','飓风','龙卷风','沙尘暴','雷暴','电闪雷鸣','超级风暴','魔法风暴','虚空风暴','混沌风暴','太阳风暴','冰风暴','火焰风暴','storm','thunderstorm','hurricane','tornado','sandstorm','magic storm','void storm','firestorm','ice storm'
    ]],
    ['environment_gravity_low', '低重力', [
      '低重力','微重力','弱重力','重力很小','像月球一样','跳得更高','缓慢下落','漂浮感','失重','近乎失重','无重力','零重力','反重力','low gravity','weak gravity','microgravity','zero gravity','no gravity','anti gravity','weightless'
    ]],
    ['domain_structure', '结构', [
      '结构','建筑结构','自然结构','生成建筑','遗迹','废墟','遗址','古迹','地牢','迷宫','城堡','宫殿','神殿','寺庙','教堂','修道院','祭坛','高塔','法师塔','钟楼','灯塔','哨塔','城墙','堡垒','要塞','营地','村庄','城市','矿井','矿洞','地下城','墓穴','陵墓','金字塔','竞技场','斗兽场','监狱','实验室','工厂','空间站','飞船残骸','沉船','海底遗迹','天空神殿','浮空城','传送门遗迹','structure','ruin','dungeon','maze','castle','palace','temple','tower','fortress','stronghold','camp','village','city','mine','tomb','pyramid','arena','laboratory','factory','space station','shipwreck'
    ]],
    ['domain_quest', '任务', [
      '任务','主线任务','支线任务','日常任务','周常任务','循环任务','隐藏任务','秘密任务','世界任务','阵营任务','职业任务','新手任务','教程任务','护送任务','收集任务','讨伐任务','狩猎任务','探索任务','解谜任务','生存任务','建造任务','悬赏任务','赏金任务','挑战任务','成就任务','连续任务','任务链','任务线','委托','委托单','订单','quest','mission','main quest','side quest','daily quest','weekly quest','hidden quest','world quest','bounty','escort mission','collection quest'
    ]],
    ['domain_story', '剧情', [
      '剧情','故事','故事线','主线剧情','支线剧情','背景故事','世界观','设定','历史','传说','神话','寓言','章节','序章','终章','结局','多结局','隐藏结局','好结局','坏结局','真结局','分支剧情','剧情选择','对话剧情','过场剧情','叙事','旁白','story','plot','storyline','lore','backstory','chapter','prologue','ending','multiple endings','branching story','narrative'
    ]],
    ['domain_npc', 'NPC', [
      'npc','NPC','非玩家角色','村民角色','商人','店主','铁匠','炼金术士','药剂师','法师','导师','教官','守卫','士兵','队长','国王','女王','王子','公主','领主','村长','长老','祭司','牧师','医生','猎人','渔夫','农民','矿工','厨师','旅店老板','酒馆老板','任务发布者','向导','伙伴','随从','雇佣兵','敌对角色','中立角色','友善角色','merchant','shopkeeper','blacksmith','wizard','teacher','guard','king','queen','prince','princess','village chief','priest','doctor','hunter','fisherman','farmer','miner','guide','companion'
    ]],
    ['domain_faction', '阵营', [
      '阵营','势力','派系','组织','公会','协会','联盟','部落','王国','帝国','共和国','联邦','教会','教团','宗门','门派','帮派','军团','骑士团','佣兵团','盗贼团','商会','议会','反抗军','抵抗组织','邪教','秘密组织','地下组织','敌对阵营','友方阵营','中立阵营','faction','guild','clan','tribe','kingdom','empire','republic','federation','church','cult','sect','order','legion','rebels','resistance','alliance'
    ]],
    ['domain_reputation', '声望', [
      '声望','名望','威望','信誉','好感度','关系值','阵营声望','宗门声望','地区声望','世界声望','荣誉','荣誉值','罪恶值','善恶值','通缉度','仇恨值','友好度','忠诚度','reputation','fame','prestige','honor','relationship','favor','friendship','loyalty','wanted level','karma'
    ]],
    ['domain_shop', '商店', [
      '商店','店铺','商城','市场','集市','交易所','拍卖行','黑市','杂货店','武器店','装备店','盔甲店','药水店','魔法商店','材料商店','家具店','宠物店','坐骑店','任务商店','声望商店','积分商店','货币商店','售货机','自动贩卖机','shop','store','market','marketplace','auction house','black market','weapon shop','armor shop','magic shop','potion shop','vendor','vending machine'
    ]],
    ['domain_economy', '经济系统', [
      '经济','经济系统','货币','金币','银币','铜币','钻石币','代币','积分','点券','票券','交易','买卖','价格','物价','税收','利息','工资','报酬','奖励金','赏金','银行','贷款','存款','汇率','通货膨胀','供需','市场经济','玩家交易','摆摊','拍卖','economy','currency','coin','gold','silver','token','credit','trade','price','tax','bank','loan','auction','player trading'
    ]],
    ['domain_class', '职业', [
      '职业','角色职业','战斗职业','生活职业','转职','进阶职业','隐藏职业','战士','剑士','骑士','圣骑士','狂战士','弓箭手','游侠','猎人','刺客','盗贼','忍者','武士','法师','巫师','术士','召唤师','死灵法师','牧师','祭司','德鲁伊','炼金术士','工程师','机械师','矿工','农夫','渔夫','厨师','商人','驯兽师','龙骑士','魔剑士','class','job','warrior','knight','paladin','berserker','archer','ranger','hunter','assassin','rogue','ninja','samurai','mage','wizard','warlock','summoner','necromancer','priest','druid','alchemist','engineer'
    ]],
    ['domain_skill', '技能', [
      '技能','主动技能','被动技能','终极技能','大招','小技能','战斗技能','生活技能','职业技能','武器技能','组合技','连招','连击','蓄力技能','范围技能','单体技能','位移技能','控制技能','治疗技能','召唤技能','变身技能','觉醒技能','必杀技','绝招','招式','法术','能力','skill','ability','active skill','passive skill','ultimate','combo','charged skill','area skill','movement skill','healing skill','summon skill','transformation skill'
    ]],
    ['domain_magic', '魔法系统', [
      '魔法','法术','法力','魔力','魔法系统','元素魔法','火魔法','水魔法','冰魔法','雷魔法','风魔法','土魔法','光魔法','暗魔法','空间魔法','时间魔法','自然魔法','生命魔法','死亡魔法','亡灵魔法','召唤魔法','幻术','诅咒','祝福','符文','法阵','魔法阵','咒语','魔杖','法杖','魔导书','magic','spell','mana','elemental magic','fire magic','ice magic','lightning magic','dark magic','summoning magic','rune','curse','blessing'
    ]],
    ['domain_technology', '科技系统', [
      '科技','科技树','科技系统','研究','研究系统','科研','技术','工业','工业系统','机械','机器','设备','装置','自动化','流水线','工厂','发电机','电力','能源','燃料','蒸汽动力','核能','太阳能','风能','红石科技','量子科技','纳米科技','赛博科技','生物科技','太空科技','机器人','无人机','计算机','终端','服务器','technology','tech tree','research','industry','machine','automation','factory','generator','electricity','energy','steam power','nuclear power','solar power','robot','drone','computer'
    ]],
    ['domain_agriculture', '农业系统', [
      '农业','农场','种田','耕种','种植','收割','灌溉','施肥','育种','作物','农作物','庄稼','小麦','水稻','玉米','土豆','胡萝卜','甜菜','番茄','辣椒','葡萄','果树','温室','牧场','畜牧','养殖','养鸡','养牛','养羊','养猪','养蜂','蜂场','渔业','钓鱼','捕鱼','aquaculture','agriculture','farming','farm','crop','harvest','irrigation','greenhouse','ranch','livestock','beekeeping','fishing'
    ]],
    ['domain_alchemy', '炼金系统', [
      '炼金','炼金术','炼药','制药','药剂','药水','合剂','灵药','丹药','炼丹','配药','蒸馏','萃取','融合材料','炼金台','炼药锅','坩埚','实验瓶','配方研究','药剂效果','alchemy','potion making','brewing','elixir','medicine','distillation','cauldron','alchemist table'
    ]],
    ['domain_enchanting', '附魔系统', [
      '附魔','附魔系统','魔咒','强化','装备强化','武器强化','升级装备','镶嵌','宝石镶嵌','符文镶嵌','洗练','重铸','锻造','精炼','升星','品质提升','随机词条','属性词条','套装效果','enchant','enchantment','upgrade','enhance','socket','gem socket','reforge','forge','refine','item affix','set bonus'
    ]],
    ['domain_companion', '伙伴系统', [
      '伙伴','同伴','队友','随从','追随者','助手','帮手','宠物','战宠','坐骑','召唤兽','精灵','仙灵','守护灵','机械伙伴','机器人伙伴','佣兵','护卫','伙伴系统','好感系统','companion','follower','ally','pet','battle pet','mount','summoned creature','guardian spirit','mercenary'
    ]],
    ['domain_survival', '生存玩法', [
      '生存','生存模式','硬核生存','极限生存','荒岛生存','末日生存','野外生存','寒冷生存','炎热生存','饥荒生存','口渴','饥饿','体温','寒冷值','炎热值','理智值','疲劳值','睡眠值','氧气','感染','疾病','受伤','骨折','流血','求生','survival','hardcore survival','island survival','apocalypse survival','hunger','thirst','temperature','sanity','fatigue','oxygen','infection','disease','bleeding'
    ]],
    ['mode_rpg', 'RPG玩法', [
      'rpg','RPG','角色扮演','角色扮演游戏','等级系统','经验系统','升级','属性点','技能点','职业系统','装备系统','任务系统','副本系统','声望系统','天赋系统','成长系统','数值成长','打怪升级','刷装备','冒险者','冒险等级','role playing','role-playing game','level system','experience system','skill points','attribute points','character progression'
    ]],
    ['mode_tower_defense', '塔防玩法', [
      '塔防','防守','守城','守家','保卫基地','防御波次','怪物波次','建塔','防御塔','箭塔','炮塔','魔法塔','减速塔','毒塔','召唤塔','升级防御塔','基地生命','漏怪','tower defense','base defense','defend the city','defense wave','turret','defense tower'
    ]],
    ['mode_roguelike', '肉鸽玩法', [
      '肉鸽','肉鸽游戏','roguelike','roguelite','随机地牢','随机房间','随机奖励','随机技能','随机装备','永久死亡','死亡重来','局外成长','每局不同','程序生成','随机事件','爬塔','无尽地牢','随机冒险','permadeath','random dungeon','random rooms','procedural generation','endless dungeon'
    ]],
    ['mode_pvp', 'PVP玩法', [
      'pvp','PVP','玩家对战','玩家互打','竞技','竞技场','决斗','单挑','团队对战','阵营战','公会战','领地战','夺旗','占点','吃鸡','大逃杀','缩圈','排位赛','天梯','匹配','红队蓝队','player versus player','duel','arena','team battle','battle royale','capture the flag','ranked match'
    ]],
    ['mode_puzzle', '解谜玩法', [
      '解谜','谜题','机关','机关谜题','密码','密码门','隐藏开关','压力板谜题','红石谜题','迷宫谜题','逻辑谜题','数字谜题','图案谜题','音乐谜题','光线谜题','推箱子','密室逃脱','寻找线索','破解机关','puzzle','riddle','escape room','logic puzzle','secret switch','code lock','maze puzzle'
    ]],
    ['style_cyberpunk', '赛博朋克风格', [
      '赛博朋克','赛博','霓虹','霓虹灯','未来都市','高科技低生活','义体','机械义肢','脑机接口','黑客世界','数据空间','虚拟现实','企业统治','雨夜霓虹','蓝紫色灯光','全息广告','电子街区','cyberpunk','cyber','neon','neon city','high tech low life','cybernetic','hologram','virtual reality','megacorp'
    ]],
    ['style_steampunk', '蒸汽朋克风格', [
      '蒸汽朋克','蒸汽时代','齿轮','黄铜机械','蒸汽机器','蒸汽动力','机械钟表','飞艇','飞空艇','维多利亚风','工业革命风格','铜管','锅炉','机械义肢','steampunk','steam age','gear','brass machine','airship','victorian','boiler','clockwork'
    ]],
    ['style_xianxia', '仙侠风格', [
      '仙侠','修仙','修真','仙道','修炼','灵气','灵根','境界','筑基','金丹','元婴','渡劫','飞升','宗门','洞府','秘境','仙山','灵石','法宝','飞剑','御剑','炼丹','符箓','阵法','妖兽','天劫','xianxia','cultivation','immortal cultivation','spiritual energy','sect','flying sword','tribulation'
    ]],
    ['style_wuxia', '武侠风格', [
      '武侠','江湖','武林','侠客','大侠','门派','武功','内功','轻功','秘籍','剑法','刀法','拳法','掌法','暗器','穴位','经脉','真气','擂台','客栈','镖局','朝廷','魔教','wuxia','martial arts','jianghu','kung fu','swordsmanship','inner power','qigong'
    ]],
    ['style_horror', '恐怖风格', [
      '恐怖','惊悚','诡异','阴森','毛骨悚然','压抑','黑暗恐怖','心理恐怖','生存恐怖','血腥恐怖','怪谈','都市怪谈','鬼故事','闹鬼','幽灵','鬼魂','怨灵','恶灵','诅咒','异常','不可名状','克苏鲁','古神','san值','horror','scary','creepy','haunted','ghost story','psychological horror','survival horror','cosmic horror','lovecraftian','cthulhu'
    ]],
    ['style_fantasy', '奇幻风格', [
      '奇幻','幻想','魔幻','高魔','低魔','剑与魔法','中世纪奇幻','黑暗奇幻','史诗奇幻','童话奇幻','龙与地下城风格','精灵','矮人','兽人','巨龙','魔王','勇者','王国','魔法学院','fantasy','high fantasy','dark fantasy','epic fantasy','sword and sorcery','medieval fantasy','fairy tale'
    ]],
    ['style_scifi', '科幻风格', [
      '科幻','科学幻想','未来科技','太空时代','星际','宇宙','外星文明','宇宙飞船','空间站','星球','殖民地','激光武器','能量护盾','机器人','人工智能','量子','时间旅行','虫洞','science fiction','sci-fi','scifi','space age','interstellar','alien civilization','spaceship','space station','laser weapon','time travel','wormhole'
    ]],
    ['event_horde', '怪物潮', [
      '尸潮','怪物潮','兽潮','虫潮','敌人浪潮','敌军波次','进攻波次','夜间袭击','怪物入侵','僵尸入侵','亡灵入侵','哥布林入侵','海盗袭击','强盗袭击','每晚来怪','定期刷怪','一波又一波','无尽波次','horde','monster horde','zombie horde','enemy wave','invasion','raid wave','endless waves'
    ]],
    ['domain_boss', 'Boss', [
      'boss','Boss','BOSS','首领','头目','大怪','精英首领','区域首领','世界首领','最终首领','最终boss','隐藏boss','秘密boss','副本boss','关底boss','小boss','中boss','大boss','魔王','龙王','尸王','虫王','哥布林王','骷髅王','巫妖王','巨人王','守护者','泰坦','古神','邪神','领主怪','boss rush','world boss','final boss','secret boss','dungeon boss','raid boss','mini boss'
    ]],
    ['domain_entity', '生物', [
      '生物','实体','怪物','动物','敌人','敌对生物','友好生物','中立生物','自定义生物','新生物','幻想生物','魔法生物','机械生物','元素生物','亡灵','恶魔','天使','精灵','矮人','兽人','哥布林','巨魔','食人魔','史莱姆','龙','飞龙','九头蛇','凤凰','独角兽','狮鹫','狼人','吸血鬼','幽灵','僵尸','骷髅','木乃伊','虫族','外星人','机器人','entity','creature','mob','monster','animal','hostile mob','friendly mob','custom mob','undead','demon','angel','elf','orc','goblin','slime','dragon','phoenix','unicorn','werewolf','vampire','ghost','alien','robot'
    ]],
    ['domain_vehicle', '载具', [
      '载具','交通工具','车辆','汽车','卡车','摩托车','自行车','坦克','装甲车','火车','地铁','缆车','矿车','船','帆船','快艇','潜艇','飞机','直升机','飞艇','热气球','飞船','宇宙飞船','飞行坐骑','机械坐骑','机甲','vehicle','car','truck','motorcycle','bike','tank','train','subway','boat','ship','submarine','airplane','helicopter','airship','spaceship','mech'
    ]],
    ['domain_gui', '界面', [
      'gui','GUI','界面','用户界面','菜单','主菜单','游戏菜单','物品菜单','任务菜单','技能菜单','职业菜单','商店菜单','传送菜单','地图界面','背包界面','合成界面','机器界面','对话框','按钮','进度条','血条','蓝条','经验条','小地图','快捷栏','hud','HUD','user interface','menu','inventory screen','quest menu','skill menu','shop menu','dialog box','button','progress bar','health bar','minimap'
    ]],
    ['domain_music', '音乐音效', [
      '音乐','背景音乐','战斗音乐','boss音乐','环境音乐','主题曲','配乐','音效','环境音','脚步声','雷声','风声','雨声','怪物叫声','攻击音效','爆炸声','魔法音效','机械音效','提示音','语音','旁白语音','music','background music','battle music','boss music','ambient music','sound effect','ambient sound','voice acting'
    ]],
    ['domain_particle', '粒子效果', [
      '粒子','粒子效果','特效','视觉特效','光效','火花','火焰粒子','烟雾粒子','闪电粒子','冰晶粒子','雪花粒子','爱心粒子','魔法粒子','符文粒子','灵气','光环','拖尾','剑气','冲击波','爆炸特效','传送特效','particle','particle effect','visual effect','spark','smoke','aura','trail','shockwave','teleport effect'
    ]],
    ['domain_animation', '动画', [
      '动画','动作','待机动画','行走动画','奔跑动画','跳跃动画','攻击动画','受伤动画','死亡动画','施法动画','使用动画','挥砍动画','射击动画','装填动画','变身动画','开门动画','机器运转动画','过场动画','animation','idle animation','walk animation','run animation','attack animation','death animation','casting animation','transformation animation','cutscene'
    ]],
    ['domain_rule', '世界规则', [
      '规则','世界规则','游戏规则','玩法规则','禁止规则','限制规则','死亡不掉落','死亡掉落','禁止睡觉','不能睡觉','禁止自然回血','不能回血','禁止破坏方块','禁止放置方块','禁止合成','禁止传送','友军伤害','关闭友伤','永久死亡','死亡变旁观者','死亡重置','时间锁定','天气锁定','难度锁定','怪物增强','玩家削弱','rule','world rule','game rule','keep inventory','permadeath','friendly fire','time lock','weather lock','no regeneration','no sleeping','no building'
    ]],
    ['domain_event', '事件', [
      '事件','随机事件','世界事件','周期事件','定时事件','触发事件','隐藏事件','特殊事件','节日事件','灾难事件','入侵事件','boss事件','天气事件','剧情事件','区域事件','全服事件','突发事件','倒计时事件','每日事件','每周事件','月度事件','event','random event','world event','timed event','special event','invasion event','disaster event','global event'
    ]],
    ['domain_progression', '成长进程', [
      '成长','进度','发展','发展路线','成长路线','升级路线','科技路线','时代进程','阶段','游戏阶段','前期','中期','后期','终局','毕业装备','解锁','逐步解锁','进阶','突破','转生','重生','声望等级','世界等级','难度等级','progression','progress','advancement','unlock','upgrade path','tech progression','world level','prestige','rebirth'
    ]]
  ];

  function normalize(value) {
    return String(value ?? '')
      .normalize('NFKC')
      .toLocaleLowerCase('zh-CN')
      .replace(/[\s_\-—–·•,，。.!！?？:：;；'"“”‘’()（）\[\]【】{}<>《》\/\\|]+/g, '');
  }

  function installVocabularyPatch() {
    const vocabulary = globalThis.GameForgeVocabulary;
    if (!vocabulary || typeof vocabulary.analyze !== 'function' || vocabulary.__massAliasesInstalled) return false;

    const aliasIndex = [];
    const seen = new Set();
    for (const [id, label, aliases] of groups) {
      for (const alias of aliases) {
        const normalized = normalize(alias);
        const key = `${id}\u0000${normalized}`;
        if (!normalized || seen.has(key)) continue;
        seen.add(key);
        aliasIndex.push({ id, label, alias, normalized });
      }
    }
    aliasIndex.sort((a, b) => b.normalized.length - a.normalized.length);

    const originalAnalyze = vocabulary.analyze.bind(vocabulary);
    vocabulary.analyze = function analyzeWithMassAliases(text, ...args) {
      const result = originalAnalyze(text, ...args) || {};
      const hits = Array.isArray(result.hits) ? result.hits : [];
      const foundIds = new Set(hits.map((hit) => hit && hit.id).filter(Boolean));
      const normalizedText = normalize(text);

      for (const entry of aliasIndex) {
        if (foundIds.has(entry.id)) continue;
        const matched = entry.normalized.length === 1
          ? normalizedText === entry.normalized
          : normalizedText.includes(entry.normalized);
        if (!matched) continue;
        hits.push({
          id: entry.id,
          label: entry.label,
          alias: entry.alias,
          matched: entry.alias,
          source: 'gameforge-mass-local-aliases',
          confidence: 0.86
        });
        foundIds.add(entry.id);
      }

      result.hits = hits;
      result.extraAliasCount = aliasIndex.length;
      result.totalAliasCount = Number(vocabulary.aliasCount || 0) + aliasIndex.length;
      return result;
    };

    Object.defineProperties(vocabulary, {
      massAliasCount: { value: aliasIndex.length, enumerable: true },
      massAliasGroups: { value: groups.length, enumerable: true },
      __massAliasesInstalled: { value: true }
    });

    console.info(`[GameForge] Added ${aliasIndex.length} supplemental local aliases across ${groups.length} semantic groups.`);
    return true;
  }

  if (!installVocabularyPatch()) {
    let attempts = 0;
    const timer = setInterval(() => {
      attempts += 1;
      if (installVocabularyPatch() || attempts >= 40) clearInterval(timer);
    }, 50);
  }
})();

(() => {
  function installEntry() {
    if (document.getElementById('gameforge-zip-to-jar-entry')) return;

    const button = document.createElement('a');
    button.id = 'gameforge-zip-to-jar-entry';
    button.href = 'jar.html';
    button.textContent = 'ZIP → JAR';
    button.setAttribute('aria-label', '把 GameForge ZIP 转换成 Forge JAR');
    Object.assign(button.style, {
      position: 'fixed',
      right: '20px',
      bottom: '20px',
      zIndex: '9999',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '44px',
      padding: '0 18px',
      border: '1px solid rgba(138, 180, 255, 0.55)',
      borderRadius: '999px',
      background: 'rgba(23, 31, 51, 0.94)',
      color: '#f5f8ff',
      boxShadow: '0 12px 30px rgba(0, 0, 0, 0.28)',
      textDecoration: 'none',
      font: '700 14px/1 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      backdropFilter: 'blur(12px)'
    });

    button.addEventListener('mouseenter', () => {
      button.style.transform = 'translateY(-2px)';
      button.style.borderColor = 'rgba(138, 180, 255, 0.95)';
    });
    button.addEventListener('mouseleave', () => {
      button.style.transform = '';
      button.style.borderColor = 'rgba(138, 180, 255, 0.55)';
    });

    document.body.appendChild(button);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', installEntry, { once: true });
  } else {
    installEntry();
  }
})();
