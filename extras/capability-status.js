'use strict';

(() => {
  const GF = window.GameForge;
  if (!GF || GF.capabilities?.__installed) return;

  const Gen = GF.generators;
  const VERSION = 1;
  const STORAGE_KEY = 'gameforge.capability.reports.v1';
  const STATUS = Object.freeze({
    READY: 'ready',
    PARTIAL: 'partial',
    SAVED: 'saved',
    UNSUPPORTED: 'unsupported'
  });
  const STATUS_META = Object.freeze({
    ready: { label: '会生成', formal: '可直接运行', color: 'green', rank: 1 },
    partial: { label: '只能做一部分', formal: '部分实现', color: 'yellow', rank: 2 },
    saved: { label: '只会记下来', formal: '仅保存结构', color: 'gray', rank: 3 },
    unsupported: { label: '现在做不了', formal: '当前不支持', color: 'red', rank: 4 }
  });

  const clone = (value) => JSON.parse(JSON.stringify(value));
  const text = (value) => String(value ?? '').normalize('NFKC').trim();
  const test = (pattern, value) => pattern.test(value);
  const configOf = (component) => component?.config || component?.spec || {};
  const kindOf = (component) => String(component?.kind || component?.type || '').toLowerCase();
  const contentTypeOf = (component) => String(configOf(component).contentType || '').toLowerCase();
  const reportKey = (report) => `${report.prompt || ''}\u0000${report.surface || ''}`;

  function surfaceFromLocation() {
    const path = String(globalThis.location?.pathname || '').toLowerCase();
    if (path.includes('native-systems')) return 'native-systems';
    if (path.includes('worldgen')) return 'worldgen';
    if (path.includes('native-forge')) return 'native-forge';
    if (path.includes('blueprint')) return 'blueprint';
    return 'home';
  }

  function item(id, name, status, detail, output = '', missing = '', route = '') {
    return { id, name, status, detail, output, missing, route };
  }

  function addItem(map, next) {
    const current = map.get(next.id);
    if (!current || STATUS_META[next.status].rank > STATUS_META[current.status].rank) {
      map.set(next.id, next);
      return;
    }
    if (current.status === next.status) {
      current.detail = current.detail || next.detail;
      current.output = current.output || next.output;
      current.missing = current.missing || next.missing;
      current.route = current.route || next.route;
    }
  }

  function inferBaseItems(source, map) {
    const weapon = /(?:剑|劍|刀|武器|法杖|魔杖|匕首|锤|錘|战斧|戰斧|sword|weapon|staff|wand|dagger|hammer|axe)/i;
    const boss = /(?:boss|首领|首領|头目|頭目)/i;
    const entity = /(?:自定义生物|自定義生物|自定义怪物|自定義怪物|新生物|新怪物|entitytype|custom\s+(?:mob|entity))/i;
    const machine = /(?:机器|機器|处理机|處理機|加工机|加工機|熔炼机|熔煉機|machine|processor)/i;
    const world = /(?:世界|维度|維度|群系|地形|天空岛|天空島|浮空岛|浮空島|虚空世界|虛空世界|world|dimension|biome|terrain|sky\s*island|floating\s*island|void\s*world)/i;
    const itemRequest = /(?:物品|道具|item)/i;
    const blockRequest = /(?:方块|方塊|block)/i;
    const recipe = /(?:配方|合成|recipe|craft)/i;

    if (test(world, source)) {
      addItem(map, item('worldgen.playable', '新世界和可进入维度', STATUS.READY,
        '会生成自定义群系、维度类型、维度文件和进入钥匙。',
        '一个能进入、能返回主世界的新维度', '', '世界与维度'));
      addItem(map, item('worldgen.terrain', '地形预设', STATUS.READY,
        '主世界、放大化、洞穴、下界、末地、浮空岛、平坦和虚空等预设可以直接生成。',
        '所选的可加载地形预设', '', '世界与维度'));
    }
    if (test(machine, source)) {
      addItem(map, item('machine.native', '真正的机器方块', STATUS.READY,
        '会生成新方块 ID、BlockEntity、物品栏、存档、处理进度和掉落。',
        '一个能放置、能保存内容并能处理物品的机器', '', '原生机器与实体'));
      addItem(map, item('machine.gui', '机器界面', STATUS.READY,
        '会生成输入槽、燃料槽、输出槽、进度条和开始／停止按钮。',
        '一个能打开和操作的机器界面', '', '原生机器与实体'));
    }
    if (test(entity, source)) {
      addItem(map, item('entity.native', '真正的新生物 ID', STATUS.READY,
        '会注册新的 EntityType、属性、刷怪蛋、渲染器和基础 AI。',
        '一个真正的新生物 ID', '', '原生机器与实体'));
    } else if (test(boss, source)) {
      addItem(map, item('boss.basic', '基础 Boss', STATUS.READY,
        '会生成名称、血量、攻击、护甲、掉落和基础追击。',
        '一个有基础属性和基础行为的 Boss'));
    }
    if (test(weapon, source)) {
      addItem(map, item('weapon.basic', '基础武器', STATUS.READY,
        '会生成名称、伤害、攻击速度、纹理、给予方式和可选配方。',
        '一件能获得和使用的武器'));
    }
    if (test(itemRequest, source) && !test(weapon, source)) {
      const native = /(?:真正|独立|新\s*id|item\s*id|forge|java)/i.test(source);
      addItem(map, item(native ? 'item.native' : 'item.lowcode', native ? '真正的新物品 ID' : '自定义物品', STATUS.READY,
        native ? '原生 Forge 工程会注册真正的新 Item ID。' : '低代码路线会用原版物品、名称、模型和 NBT 做成可用物品。',
        native ? '一个真正注册的新物品' : '一个可使用的低代码自定义物品', '', native ? '原生 Forge 工程' : '智能创建'));
    }
    if (test(blockRequest, source) && !test(machine, source)) {
      const native = /(?:真正|独立|新\s*id|block\s*id|forge|java)/i.test(source);
      addItem(map, item(native ? 'block.native' : 'block.lowcode', native ? '真正的新方块 ID' : '装饰方块', STATUS.READY,
        native ? '原生 Forge 工程会注册真正的新 Block ID。' : '低代码路线会生成可放置和回收的装饰方块。',
        native ? '一个真正注册的新方块' : '一个可放置的装饰方块', '', native ? '原生 Forge 工程' : '智能创建'));
    }
    if (test(recipe, source)) {
      addItem(map, item('recipe.crafting', '普通工作台配方', STATUS.READY,
        '有序和无序 3×3 工作台配方可以直接生成。', '一个可用的工作台配方'));
    }
  }

  function inferAdvancedItems(source, map) {
    if (/(?:秒杀|一击必杀|斩杀|斬殺|倍率伤害|倍率傷害|额外伤害|額外傷害|吸血|击退|擊退|凋零|中毒|冻结|凍結|闪电|閃電|安全爆炸|instant\s*kill|execute|lifesteal|knockback)/i.test(source)) {
      addItem(map, item('weapon.precise_hit', '基础武器技能', STATUS.READY,
        '右键、命中、目标分类、秒杀、斩杀、倍率伤害、吸血、击退、状态、闪电和安全爆炸可以生成。',
        '你写出的基础武器技能'));
    }
    if (/(?:近战|近戰|游荡|遊蕩|反击|反擊|寻找最近玩家|尋找最近玩家|跳跃攻击|跳躍攻擊|melee|wander|retaliate|nearest\s*player|leap)/i.test(source)) {
      addItem(map, item('entity.goal_ai', '基础生物 AI', STATUS.READY,
        '近战、游荡、观察、反击、寻找玩家、跳跃攻击和靠近目标可以组合。',
        '基础追击、反击和游荡行为', '', '原生机器与实体'));
    }
    if (/(?:永夜|永昼|永晝|黄昏|黃昏|eternal\s*(?:night|day|dusk))/i.test(source)) {
      addItem(map, item('worldgen.fixed_time', '固定昼夜时间', STATUS.READY,
        '永夜、永昼或固定黄昏会写入维度类型。', '固定的天空时间', '', '世界与维度'));
    }
    if (/(?:村庄|村莊|矿井|礦井|废弃传送门|廢棄傳送門|village|mineshaft|ruined\s*portal)/i.test(source)) {
      addItem(map, item('worldgen.vanilla_structures', '原版结构生成', STATUS.READY,
        '可以把自定义群系加入村庄、矿井和废弃传送门的生成标签。',
        '所选原版结构在群系中的生成资格', '', '世界与维度'));
    }
    if (/(?:像素纹理|像素贴图|像素貼圖|pixel\s*(?:texture|art))/i.test(source)) {
      addItem(map, item('resource.pixel_texture', '像素纹理', STATUS.READY,
        '可以在浏览器里生成或编辑基础像素纹理。', '基础像素纹理'));
    }

    if (/(?:自定义\s*gui|自定義\s*gui|gui\s*designer|拖拽界面|拖曳界面|任意布局|hud|技能面板|任务面板|任務面板|商店界面|对话界面|對話界面|科技树界面|科技樹界面)/i.test(source)) {
      addItem(map, item('gui.designer', '任意布局的界面', STATUS.PARTIAL,
        '固定的机器界面可以生成，但还不能像界面设计软件一样随意拖按钮、图片和面板。',
        '固定机器界面', '任意布局、动态控件和专用 HUD'));
    }
    if (/(?:自定义投射物|自定義投射物|剑气|劍氣|弹道|彈道|projectile|missile|bullet)/i.test(source)) {
      addItem(map, item('combat.projectile', '自定义投射物', STATUS.PARTIAL,
        '可以召唤原版实体或执行基础远程效果，但不会注册新的投射物类和完整弹道。',
        '基础远程效果', '真正的新投射物、碰撞逻辑和弹道'));
    }
    if (/(?:红石|紅石|漏斗|hopper|自动化|自動化|automation)/i.test(source)) {
      addItem(map, item('machine.automation', '自动化交互', STATUS.PARTIAL,
        '机器有物品能力和基础存取，但复杂红石条件、管道规则和跨机器调度还不完整。',
        '基础物品栏和漏斗接入', '复杂自动化网络'));
    }
    if (/(?:自定义传送门|自定義傳送門|portal\s*block|传送门方块|傳送門方塊)/i.test(source)) {
      addItem(map, item('worldgen.portal', '自定义传送门', STATUS.PARTIAL,
        '会生成可靠的维度钥匙来回传送，但不会生成新的传送门方块和点火规则。',
        '维度入口钥匙', '自定义传送门方块'));
    }
    if (/(?:自定义结构|自定義結構|城市|地牢|神殿|城堡|迷宫|迷宮|custom\s*structure|city|dungeon|temple|castle|maze|jigsaw)/i.test(source)) {
      addItem(map, item('worldgen.custom_structures', '自定义建筑和结构', STATUS.PARTIAL,
        '原版村庄、矿井和废弃传送门可以接入；全新建筑 NBT 和 Jigsaw 拼装还不能自动生成。',
        '原版结构标签', '你描述的全新城市、地牢或神殿'));
    }
    if (/(?:魔法|法术|法術|spell|magic)/i.test(source)) {
      addItem(map, item('magic.basic', '魔法效果', STATUS.PARTIAL,
        '右键、命中、状态、闪电、爆炸和召唤等基础法术效果可以做；完整魔法体系还没有。',
        '基础法术效果', '法力值、法术书、符文和法术升级'));
    }
    if (/(?:科技|工业|工業|technology|industrial)/i.test(source)) {
      addItem(map, item('technology.basic', '科技和工业内容', STATUS.PARTIAL,
        '单台机器、界面和处理配方可以生成；完整电力、管道和科技树不会一起生成。',
        '单台可工作的机器', '完整工业网络和科技树'));
    }
    if (/(?:机器配方|機器配方|machine\s*recipe)/i.test(source)) {
      addItem(map, item('recipe.machine', '机器处理配方', STATUS.PARTIAL,
        '当前机器支持固定输入、可选燃料、固定输出和处理时间，但不是通用多配方系统。',
        '一组机器处理规则', '可无限扩展的多配方注册系统'));
    }
    if (/(?:盔甲|护甲套装|護甲套裝|armor|armour|套装效果|套裝效果)/i.test(source)) {
      addItem(map, item('equipment.armor', '盔甲和套装', STATUS.PARTIAL,
        '基础物品和部分属性可以保存或生成，但自定义盔甲模型、套装联动和宝石系统还不完整。',
        '基础装备数据', '完整盔甲模型和套装系统'));
    }

    const saved = [
      ['boss.phases', /(?:多阶段|多階段|二阶段|二階段|三阶段|三階段|阶段切换|階段切換|phase\s*\d|multi[- ]?phase)/i, '多阶段 Boss', '会记住阶段需求，但不会生成血量阈值、阶段切换和每阶段技能表。', '阶段切换'],
      ['boss.skill_loop', /(?:技能循环|技能循環|技能轮换|技能輪換|boss\s*rotation|skill\s*loop)/i, 'Boss 技能循环', '会记住技能顺序，但不会自动生成完整冷却、选招和循环状态机。', 'Boss 技能循环'],
      ['boss.arena', /(?:boss战场|boss戰場|竞技场机制|競技場機制|arena\s*mechanic)/i, 'Boss 战场机制', '会记住战场要求，但不会自动生成边界、机关和阶段联动。', 'Boss 战场机制'],
      ['weapon.combo', /(?:连击|連擊|连段|連段|招式组合|招式組合|combo|moveset)/i, '连击和招式组合', '会记住连击描述，但不会生成连段计数、输入窗口和招式状态机。', '连击系统'],
      ['weapon.charge', /(?:蓄力|蓄能|charge\s*attack)/i, '蓄力攻击', '会记住蓄力需求，但不会生成按住、蓄力阶段和松手结算。', '蓄力攻击'],
      ['weapon.lock_on', /(?:锁定目标|鎖定目標|目标锁定|目標鎖定|lock[- ]?on)/i, '锁定目标', '会记住锁定需求，但不会生成目标选择、镜头和切换逻辑。', '锁定系统'],
      ['weapon.transform', /(?:武器变形|武器變形|形态切换|形態切換|transforming\s*weapon)/i, '武器变形', '会记住形态需求，但不会生成多形态物品、动画和状态切换。', '武器变形'],
      ['weapon.progression', /(?:技能等级|技能等級|天赋分支|天賦分支|能量槽|武器升级|武器升級|强化|強化|随机词条|隨機詞條|双持|雙持|skill\s*level|talent|energy\s*bar|upgrade|affix|dual\s*wield)/i, '武器成长系统', '会保存成长方向，但不会自动生成完整等级、天赋、能量、强化、词条或双持系统。', '武器成长系统'],
      ['trigger.more', /(?:击杀时|擊殺時|受到攻击时|受到攻擊時|格挡时|格擋時|跳跃时|跳躍時|潜行时|潛行時|冲刺时|衝刺時|副手|血量变化|血量變化|整套装备|整套裝備|进入指定区域|進入指定區域|特定时间|特定時間|特定天气|特定天氣|连续命中|連續命中|on\s*kill|on\s*hurt|on\s*block|on\s*jump|on\s*sneak|on\s*sprint|offhand|health\s*change|full\s*set|enter\s*area)/i, '更多技能触发条件', '会记住触发条件，但当前自动生成主要覆盖右键、命中、持续 Tick 和玩家加入。', '这些额外触发条件'],
      ['quest.system', /(?:任务|任務|剧情|劇情|npc对话|npc對話|对话树|對話樹|分支结局|分支結局|每日任务|每日任務|quest|story|dialogue|branching\s*ending|daily\s*quest)/i, '任务和剧情系统', '会保存任务、对话和剧情方向，但不会生成完整任务追踪、分支、失败条件和界面。', '完整任务和剧情系统'],
      ['economy.system', /(?:经济|經濟|商店|货币|貨幣|拍卖行|拍賣行|动态价格|動態價格|economy|shop|currency|auction|dynamic\s*price)/i, '经济和商店系统', '会保存经济需求，但不会生成账户、货币、动态价格、商店库存和防刷钱规则。', '完整经济和商店系统'],
      ['rpg.system', /(?:rpg|职业|職業|阵营|陣營|声望|聲望|技能树|技能樹|等级系统|等級系統|class\s*system|faction|reputation|skill\s*tree)/i, 'RPG 大型系统', '会保存职业、阵营、声望和技能树结构，但不会生成完整持久化玩法。', '完整 RPG 系统'],
      ['magic.framework', /(?:法力值|法术书|法術書|符文|元素克制|施法前摇|施法前搖|引导施法|引導施法|mana|spellbook|rune|elemental|channeling)/i, '完整魔法框架', '会保存魔法规则，但不会生成法力、符文、施法流程和元素克制框架。', '完整魔法框架'],
      ['technology.network', /(?:能量网络|能量網絡|电力网络|電力網絡|发电|發電|耗电|耗電|物品管道|流体系统|流體系統|多方块|多方塊|forge\s*energy|energy\s*network|power\s*grid|item\s*pipe|fluid|multiblock)/i, '能源、管道和多方块系统', '会保存机器网络结构，但不会生成完整能源、流体、管道和多方块验证。', '完整工业网络'],
      ['world.weather_events', /(?:酸雨|流星雨|沙尘暴|沙塵暴|灰烬雨|灰燼雨|毒雾|毒霧|acid\s*rain|meteor\s*storm|sandstorm|ash\s*rain|toxic\s*fog)/i, '特殊天气事件', '会保存天气主题，但不会生成持续伤害、粒子、天空变化和事件调度。', '特殊天气玩法'],
      ['world.hordes', /(?:尸潮|屍潮|波次|塔防|缩圈|縮圈|每\s*\d+\s*天|每七天|horde|wave|tower\s*defense|shrinking\s*zone)/i, '尸潮、波次或塔防', '会保存玩法结构，但不会生成刷怪轮次、难度增长、胜负和奖励循环。', '尸潮或波次玩法'],
      ['world.gravity', /(?:低重力|高重力|重力变化|重力變化|low\s*gravity|high\s*gravity|custom\s*gravity)/i, '自定义重力', '会保存重力要求，但不会改变玩家和实体的完整物理行为。', '自定义重力'],
      ['recipe.more', /(?:熔炉配方|烟熏炉|煙燻爐|高炉配方|高爐配方|锻造台|鍛造台|切石机|切石機|营火配方|營火配方|酿造配方|釀造配方|条件配方|條件配方|动态配方|動態配方|nbt\s*(?:保留|继承|繼承)|smelting|smoking|blasting|smithing|stonecutting|campfire|brewing|conditional\s*recipe|dynamic\s*recipe)/i, '更多配方类型', '会保存配方需求，但当前自动生成最稳定的是普通工作台和固定机器处理规则。', '这些特殊配方类型'],
      ['debug.advanced', /(?:逐步执行|逐步執行|断点|斷點|性能分析|命令耗时|命令耗時|事件日志|事件日誌|实体监控|實體監控|step\s*debug|breakpoint|profiler)/i, '高级调试器', '会保存调试需求，但不会生成断点、逐步执行和性能分析器。', '高级调试器'],
      ['migration.system', /(?:版本历史|版本歷史|差异比较|差異比較|回滚|回滾|冲突解决|衝突解決|自动迁移|自動遷移|version\s*history|diff|rollback|merge\s*conflict|migration)/i, '版本历史和迁移', '会保存迁移目标，但不会自动完成项目合并、冲突解决和跨版本升级。', '成熟的版本迁移系统']
    ];
    for (const [id, pattern, name, detail, missing] of saved) {
      if (test(pattern, source)) addItem(map, item(id, name, STATUS.SAVED, detail, '', missing));
    }

    const unsupported = [
      ['entity.flight', /(?:飞行\s*(?:boss|生物|怪物|ai)|会飞|飛行尋路|飞行寻路|flying\s*(?:boss|mob|ai)|flight\s*navigation)/i, '飞行 AI 和飞行寻路', '当前不会生成会飞、会绕障碍和会空中追击的 AI。', '飞行寻路'],
      ['entity.special_navigation', /(?:钻地|鑽地|攀爬|爬墙|爬牆|特殊寻路|特殊尋路|burrow|climb|wall\s*climb|special\s*navigation)/i, '钻地、攀爬和特殊移动', '当前不会生成钻地、攀墙或专用导航控制器。', '特殊移动和寻路'],
      ['entity.animation', /(?:geckolib|骨骼动画|骨骼動畫|自定义动画|自定義動畫|动画时间轴|動畫時間軸|bone\s*animation|custom\s*animation)/i, '自定义骨骼动画', '当前不会生成 GeckoLib 模型、骨骼动画和动画控制器。', '自定义骨骼动画'],
      ['resource.model3d', /(?:3d模型|3d\s*model|blockbench|实体模型|實體模型|方块模型编辑|方塊模型編輯)/i, '3D 模型和 Blockbench', '当前不会自动制作或导入完整 3D／Blockbench 模型。', '3D 模型'],
      ['resource.audio', /(?:自定义声音|自定義聲音|音乐生成|音樂生成|配音|custom\s*sound|generate\s*music|voice)/i, '自定义声音和音乐生成', '当前不会生成新的音频文件。', '自定义音频'],
      ['resource.visual_fx', /(?:shader|着色器|著色器|天空盒|光照效果|相机震动|相機震動|屏幕效果|screen\s*effect|camera\s*shake|skybox)/i, 'Shader、天空盒和相机效果', '当前不会生成 Shader、天空盒、自定义光照或相机效果。', '高级画面效果'],
      ['world.noise_editor', /(?:noiserouter|density\s*function|密度函数|密度函數|样条曲线|樣條曲線|spline|3d噪声|3d噪聲|3d\s*noise)/i, '任意噪声和密度函数', '当前只使用验证过的地形预设，不会自动拼任意 NoiseRouter 或密度函数树。', '任意噪声地形'],
      ['equipment.slots', /(?:饰品栏|飾品欄|curios|自定义装备槽|自定義裝備槽|custom\s*equipment\s*slot)/i, '自定义装备槽', '当前不会注册 Curios 或新的装备槽。', '自定义装备槽'],
      ['multiplayer.framework', /(?:匹配系统|匹配系統|房间|房間|大厅|大廳|队伍系统|隊伍系統|投票系统|投票系統|排行榜|管理员面板|管理員面板|matchmaking|lobby|party\s*system|voting|leaderboard|admin\s*panel)/i, '通用多人玩法框架', '当前不会生成匹配、房间、大厅、队伍、投票、排行榜或管理后台。', '通用多人框架'],
      ['backend.fabric', /(?:fabric)/i, 'Fabric 工程', '当前只生成 Forge 1.20.1 工程，不会生成 Fabric 工程。', 'Fabric 工程'],
      ['backend.neoforge', /(?:neoforge|neo\s*forge)/i, 'NeoForge 工程', '当前只生成 Forge 1.20.1 工程，不会生成 NeoForge 工程。', 'NeoForge 工程'],
      ['version.other', /(?:minecraft\s*(?:1\.(?:21|19|18|17|16)|2\.)|mc\s*1\.(?:21|19|18|17|16))/i, '其他 Minecraft 版本', '当前正式生成和验证目标是 Minecraft 1.20.1。', '其他 Minecraft 版本']
    ];
    for (const [id, pattern, name, detail, missing] of unsupported) {
      if (test(pattern, source)) addItem(map, item(id, name, STATUS.UNSUPPORTED, detail, '', missing));
    }
  }

  function componentItems(component, map) {
    const kind = kindOf(component);
    const config = configOf(component);
    const contentType = contentTypeOf(component);
    const type = String(component?.type || component?.kind || '').toLowerCase();
    const name = String(component?.name || config.name || '组件');

    if (type === 'weapon') addItem(map, item(`component:${component.id}:weapon`, name, STATUS.READY, '这件武器会生成数据包、资源包、给予方式和当前已配置的技能。', name));
    else if (type === 'mob') addItem(map, item(`component:${component.id}:mob`, name, STATUS.READY, '这个生物会基于原版实体生成名称、属性、装备和掉落。', name));
    else if (type === 'item' || type === 'resource') addItem(map, item(`component:${component.id}:item`, name, STATUS.READY, '这个低代码物品会生成名称、模型和给予方式。', name));
    else if (type === 'block') addItem(map, item(`component:${component.id}:block`, name, STATUS.READY, '这个装饰方块会生成放置、回收、模型和纹理。', name));
    else if (['recipe', 'loot', 'function', 'command', 'advancement'].includes(type)) addItem(map, item(`component:${component.id}:${type}`, name, STATUS.READY, '这个组件有对应的可运行数据文件或函数输出。', name));

    if (kind === 'forge' || type === 'forge') {
      if (['tool', 'item', 'food'].includes(contentType)) addItem(map, item(`component:${component.id}:native-item`, name, STATUS.READY, '会在原生 Forge 工程中注册真正的新物品 ID。', name, '', '原生 Forge 工程'));
      else if (contentType === 'block') addItem(map, item(`component:${component.id}:native-block`, name, STATUS.READY, '会在原生 Forge 工程中注册真正的新方块 ID。', name, '', '原生 Forge 工程'));
      else if (contentType === 'machine') addItem(map, item(`component:${component.id}:machine`, name, STATUS.READY, '会生成机器方块、BlockEntity、界面、存档和处理逻辑。', name, '', '原生 Forge 工程'));
      else if (contentType === 'entity' || contentType === 'custom_entity') addItem(map, item(`component:${component.id}:entity`, name, STATUS.READY, '会注册真正的新 EntityType、属性、刷怪蛋、渲染器和基础 Goal AI。', name, '', '原生 Forge 工程'));
      else if (contentType === 'worldgen_biome') addItem(map, item(`component:${component.id}:biome`, name, STATUS.READY, '会生成可加载的自定义群系 JSON。', name, '', '原生 Forge 工程'));
      else if (contentType === 'worldgen_dimension') addItem(map, item(`component:${component.id}:dimension`, name, STATUS.READY, '会生成可进入的维度、维度类型和入口钥匙。', name, '', '原生 Forge 工程'));
    }

    const embedded = config.gameforgeCapabilityReport || config.capabilityReport || component?.capabilityReport;
    if (embedded?.items) for (const embeddedItem of embedded.items) addItem(map, clone(embeddedItem));
  }

  function summarize(items) {
    const counts = { ready: 0, partial: 0, saved: 0, unsupported: 0 };
    for (const entry of items) counts[entry.status] += 1;
    const readyOutputs = items.filter((entry) => entry.status === STATUS.READY && entry.output).map((entry) => entry.output);
    const partialOutputs = items.filter((entry) => entry.status === STATUS.PARTIAL && entry.output).map((entry) => entry.output);
    const missing = items.filter((entry) => entry.status !== STATUS.READY).map((entry) => entry.missing || entry.name);
    const unique = (values) => Array.from(new Set(values.filter(Boolean)));
    const will = unique([...readyOutputs, ...partialOutputs]);
    const wont = unique(missing);
    let headline;
    if (counts.ready === 0 && counts.partial === 0 && (counts.saved || counts.unsupported)) headline = counts.unsupported ? '这句话现在做不了。' : '这句话现在只会被记下来。';
    else if (counts.partial || counts.saved || counts.unsupported) headline = '能做一部分，但不是全部。';
    else headline = '这句话可以直接做。';
    const willText = will.length ? `最终会生成：${will.slice(0, 5).join('、')}。` : '最终不会生成可玩的内容。';
    const wontText = wont.length ? `不会生成：${wont.slice(0, 7).join('、')}。` : '';
    return {
      counts,
      headline,
      summary: `${headline} ${willText}${wontText}`.trim(),
      finalText: `${willText}${wontText}`.trim(),
      canProceed: counts.ready + counts.partial > 0,
      needsConfirmation: counts.partial + counts.saved + counts.unsupported > 0
    };
  }

  function analyzePrompt(input, options = {}) {
    const source = text(input);
    const map = new Map();
    inferBaseItems(source, map);
    inferAdvancedItems(source, map);
    if (!map.size) addItem(map, item('request.unclear', '没有看懂要生成什么', STATUS.UNSUPPORTED, '请明确写出要做武器、物品、方块、机器、生物、Boss、群系或维度。', '', '可运行内容'));
    const items = Array.from(map.values()).sort((a, b) => STATUS_META[a.status].rank - STATUS_META[b.status].rank || a.name.localeCompare(b.name, 'zh-CN'));
    return {
      schema: 'gameforge.capability-report',
      version: VERSION,
      createdAt: new Date().toISOString(),
      surface: options.surface || surfaceFromLocation(),
      prompt: source,
      items,
      ...summarize(items)
    };
  }

  function loadStored() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (_) {
      return {};
    }
  }

  function saveStored(value) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(value)); } catch (_) {}
  }

  function rememberReport(projectId, report) {
    if (!projectId || !report?.items?.length) return;
    const stored = loadStored();
    const reports = Array.isArray(stored[projectId]) ? stored[projectId] : [];
    const key = reportKey(report);
    stored[projectId] = [clone(report), ...reports.filter((entry) => reportKey(entry) !== key)].slice(0, 30);
    saveStored(stored);
  }

  function reportsForProject(projectId) {
    const stored = loadStored();
    return Array.isArray(stored[projectId]) ? clone(stored[projectId]) : [];
  }

  function analyzeProject(projectInput, options = {}) {
    const project = projectInput || {};
    const map = new Map();
    const components = Array.isArray(project.components) ? project.components : [];
    for (const component of components) componentItems(component, map);
    const projectId = project.id || project.meta?.id || options.projectId || '';
    for (const request of reportsForProject(projectId)) for (const entry of request.items || []) addItem(map, clone(entry));
    if (!map.size) addItem(map, item('project.empty', '项目还是空的', STATUS.UNSUPPORTED, '先创建至少一个组件，再下载作品。', '', '可运行内容'));
    const items = Array.from(map.values()).sort((a, b) => STATUS_META[a.status].rank - STATUS_META[b.status].rank || a.name.localeCompare(b.name, 'zh-CN'));
    return {
      schema: 'gameforge.capability-report',
      version: VERSION,
      createdAt: new Date().toISOString(),
      surface: options.surface || surfaceFromLocation(),
      projectId,
      projectName: project.name || project.meta?.name || 'GameForge 项目',
      items,
      ...summarize(items)
    };
  }

  function toPlainText(report) {
    const lines = ['GameForge 能力说明', '==================', '', '下面只说最终会得到什么，不使用开发术语。', '', report.finalText, ''];
    for (const status of [STATUS.READY, STATUS.PARTIAL, STATUS.SAVED, STATUS.UNSUPPORTED]) {
      const entries = report.items.filter((entry) => entry.status === status);
      if (!entries.length) continue;
      lines.push(`${STATUS_META[status].label}（${STATUS_META[status].formal}）`, '-'.repeat(20));
      for (const entry of entries) {
        lines.push(`- ${entry.name}：${entry.detail}`);
        if (entry.route) lines.push(`  使用位置：${entry.route}`);
      }
      lines.push('');
    }
    return `${lines.join('\n').trim()}\n`;
  }

  function reportFiles(report) {
    return [
      { name: 'gameforge-capability-report.json', data: `${JSON.stringify(report, null, 2)}\n` },
      { name: 'README_CAPABILITY_STATUS.txt', data: toPlainText(report) }
    ];
  }

  function appendUnique(files, additions) {
    const list = Array.isArray(files) ? files.map((entry) => ({ ...entry })) : [];
    const byName = new Map(list.map((entry, index) => [entry.name, index]));
    for (const addition of additions) {
      if (byName.has(addition.name)) list[byName.get(addition.name)] = addition;
      else { byName.set(addition.name, list.length); list.push(addition); }
    }
    return list;
  }

  function attachReportToComponent(component, report, prompt) {
    if (!component || typeof component !== 'object') return component;
    const target = component.spec || component.config || (component.spec = {});
    target.sourcePrompt = target.sourcePrompt || prompt;
    target.gameforgeCapabilityReport = clone(report);
    return component;
  }

  function nativeSystemPlan(input) {
    if (!GF.nativeSystems?.parsePrompt) return null;
    const source = text(input);
    if (!/(?:机器|機器|处理机|處理機|加工机|加工機|熔炼机|熔煉機|machine|processor|自定义生物|自定義生物|自定义怪物|自定義怪物|新生物|新怪物|entitytype|custom\s+(?:mob|entity))/i.test(source)) return null;
    try {
      return { type: 'forge', confidence: 94, components: [GF.nativeSystems.parsePrompt(source)], note: '已选择原生 Forge 生成路线。' };
    } catch (_) {
      return null;
    }
  }

  function worldgenPlan(input, project) {
    if (!GF.worldgen?.parsePrompt) return null;
    const source = text(input);
    const worldLike = /(?:世界|维度|維度|群系|地形|天空岛|天空島|浮空岛|浮空島|虚空世界|虛空世界|world|dimension|biome|terrain|sky\s*island|floating\s*island|void\s*world)/i.test(source);
    const weaponLike = /(?:剑|劍|刀|武器|法杖|魔杖|sword|weapon|staff|wand)/i.test(source);
    if (!worldLike || weaponLike) return null;
    try {
      const parsed = GF.worldgen.parsePrompt(source, { namespace: project?.namespace || 'gameforge_world' });
      return { type: 'forge', confidence: 95, components: [parsed.biome, parsed.dimension], note: '已选择世界与维度生成路线。' };
    } catch (_) {
      return null;
    }
  }

  function installGeneratorHooks() {
    if (!Gen || Gen.__capabilityStatusInstalled) return;
    const originalParsePrompt = Gen.parsePrompt.bind(Gen);
    const originalGenerateProject = Gen.generateProject.bind(Gen);

    Gen.parsePrompt = function parsePromptWithCapability(input, project) {
      const prompt = text(input);
      const plan = worldgenPlan(prompt, project) || nativeSystemPlan(prompt) || originalParsePrompt(prompt, project);
      const report = analyzePrompt(prompt, { surface: 'home', plan, project });
      plan.capabilityReport = report;
      plan.note = `${report.summary}${plan.note ? ` ${plan.note}` : ''}`;
      plan.components = (plan.components || []).map((component) => attachReportToComponent(component, report, prompt));
      return plan;
    };

    Gen.generateProject = function generateProjectWithCapability(project) {
      const output = originalGenerateProject(project);
      const report = analyzeProject(project, { surface: 'download' });
      const additions = reportFiles(report);
      const result = { ...output, capabilityReport: report };
      result.bundle = appendUnique(output.bundle, additions);
      result.allFiles = appendUnique(output.allFiles, additions);
      if ((project?.components || []).some((component) => kindOf(component) === 'forge' || String(component.type).toLowerCase() === 'forge')) result.forge = appendUnique(output.forge, additions);
      return result;
    };

    Gen.__capabilityStatusInstalled = true;
  }

  function installNativeForgeHook() {
    const base = GF.nativeForge;
    if (!base || base.__capabilityStatusInstalled) return;
    const originalGenerate = base.generate?.bind(base);
    const originalGenerateFromIR = base.generateFromIR?.bind(base);
    const enhance = (output, source) => {
      if (!output?.files) return output;
      const report = analyzeProject(source, { surface: 'native-forge' });
      const files = appendUnique(output.files, reportFiles(report));
      const readme = files.find((entry) => entry.name === 'README.md' && entry.encoding !== 'base64');
      if (readme && !String(readme.data).includes('## 最终会生成什么')) readme.data = `${String(readme.data).trim()}\n\n## 最终会生成什么\n\n${report.finalText}\n\n完整说明见 \`README_CAPABILITY_STATUS.txt\`。\n`;
      return { ...output, files, capabilityReport: report, report: { ...(output.report || {}), capabilityStatus: report } };
    };
    GF.nativeForge = {
      ...base,
      generate: originalGenerate ? (source, options = {}) => enhance(originalGenerate(source, options), source) : undefined,
      generateFromIR: originalGenerateFromIR ? (source, options = {}) => enhance(originalGenerateFromIR(source, options), source) : undefined,
      __capabilityStatusInstalled: true
    };
  }

  GF.capabilities = {
    VERSION, STATUS, STATUS_META, analyzePrompt, analyzeProject, rememberReport, reportsForProject,
    toPlainText, reportFiles, surfaceFromLocation, __installed: true
  };
  installGeneratorHooks();
  installNativeForgeHook();
})();
