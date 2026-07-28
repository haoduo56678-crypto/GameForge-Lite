# GameForge IR、Blueprint 与原生 Forge 后端

GameForge Lite 的架构把“听懂玩家”“表示作品”和“生成目标格式”分成独立层。

```text
自然语言 / 表单 / Blueprint / 系统工作室
                    │
                    ▼
             GameForge IR v1
                    │
      ┌─────────────┼────────────────────┐
      ▼             ▼                    ▼
 legacy-pack   native-forge       后续 NeoForge / Fabric
 数据包/资源包   Java 工程
```

## 1. GameForge IR v1

`gameforge-ir.js` 定义稳定的中间格式：

- 项目元数据与 Minecraft 目标版本
- 组件类型、显示名和注册 ID
- 事件、条件、动作与冷却
- 玩家、驯服宠物和队友安全设置
- Blueprint 图与来源信息
- 原生机器、实体、群系和维度配置
- 校验、迁移、解析器注册和生成后端注册

原来的本地解析器通过 `legacy-rules` 适配器输出 IR；原来的数据包／资源包生成器通过 `legacy-pack` 后端消费 IR。旧页面仍可继续调用 `parsePrompt` 和 `generateProject`，但公开调用链已经经过 IR，因此解析器不再直接依赖某一种输出格式。

## 2. Blueprint 可视化逻辑

`blueprint.html` 提供节点式编辑器。

普通行为节点：

- 事件：命中、右键使用、持续 Tick、玩家加入
- 条件：目标分类、具体实体、生命比例、随机概率
- 安全：允许玩家、允许驯服宠物
- 动作：秒杀、斩杀、倍率／额外伤害、吸血、击退、状态、闪电、爆炸、治疗、给予物品、召唤实体、执行指令与冷却

原生系统节点：

- 机器处理入口、输入、燃料、输出、时间和自动启动
- 自定义实体出生、属性、Goal AI、玩家目标和外观
- 群系气候、环境颜色、地物、生物生成和原版结构标签
- 维度地形、固定群系、物理属性、时间和入口钥匙

编辑器支持拖拽、平移、缩放、自动适应、撤销／重做、导入／导出和诊断，并执行端口类型检查、单输入／单执行输出限制、不可达节点检查和无界循环阻止。

Blueprint 编译为 IR，而不是直接拼接 Java 或 mcfunction。保存后，同一张图可以交给低代码后端或原生 Forge 后端。

## 3. 原生 Forge Java 工程

`native-forge.html` 与 `native-forge-generator.js` 输出 Minecraft Java 1.20.1、Forge 47.4.21、Java 17 工程：

- `build.gradle`、`settings.gradle`、`gradle.properties`
- GitHub Actions 自动构建工作流
- `DeferredRegister` 注册
- 真正的 `SwordItem`、普通 Item、Food、Block 与 BlockItem
- `LivingDamageEvent` 精确命中处理
- 右键、持续 Tick 和玩家加入事件
- 目标组、条件、安全设置、冷却与多动作规则
- 模型、贴图、语言、配方、方块状态和掉落表
- 数据包组件继续作为 Mod 内置数据资源
- `gameforge-ir.json` 和生成报告，便于继续开发

## 4. 原生机器系统

`native-systems.html` 提供机器工作室；`native-systems.js` 作为 `native-forge` 后端扩展，生成：

- 机器方块与 `BlockItem`
- `BlockEntityType`
- 三槽 `ItemStackHandler`
- NBT 库存、进度和启停状态保存
- 服务端处理 Tick
- `MenuType` 与 `AbstractContainerMenu`
- `AbstractContainerScreen`、按钮和进度条
- 机器 GUI 所需的 `SimpleChannel`
- 固定方向的 C2S 操作包和 S2C 状态包
- 菜单、位置、距离、动作白名单和真实 BlockEntity 验证
- Forge item capability
- 模型、贴图、语言、配方和掉落表

多个机器可以共享通用实现，但各自拥有独立定义、方块 ID、配方、处理时间和输入输出。无燃料机器不会错误接受任意物品作为燃料。处理进度按节流间隔同步，不会每 Tick 向附近所有客户端广播。这里的网络层只服务于生成的机器 GUI，不等于通用多人玩法框架。

## 5. 自定义 EntityType 与基础 Goal AI

原生实体组件现在生成真正的新实体 ID，而不是只生成召唤原版实体的物品：

- `DeferredRegister<EntityType<?>>`
- 自定义 `Monster` 子类
- 属性注册事件
- 自定义碰撞箱、生命、攻击、速度、护甲、索敌距离和击退抗性
- Forge 刷怪蛋
- 客户端渲染器和可配置纹理资源
- `goalSelector` 与 `targetSelector`
- `MobType` 分类：普通、亡灵、节肢、灾厄村民和水生

当前 Goal 集合：

```text
float
melee_attack
random_stroll
look_at_player
random_look
hurt_by_target
nearest_player
leap_at_target
move_towards_target
```

普通自定义实体不会因为自动命名而永久存在；只有明确标记为 Boss 的实体会显示自定义名称并设置为持久实体。

## 6. 世界与维度生成

`worldgen.html`、`worldgen-core.js`、`worldgen-blueprint.js` 与 `worldgen-native.js` 组成世界生成模块。

群系组件生成：

- Minecraft 1.20.1 `worldgen/biome` JSON
- 温度、降水和雨雪规则
- 天空、雾、水、水下雾、草和树叶颜色
- 主世界、稀疏、下界、末地和空白地物预设
- 和平、敌对、混合、下界、末地和空白生物生成预设
- 村庄、矿井和废弃传送门结构标签

维度组件生成：

- `dimension_type` 与 `dimension` 注册表 JSON
- 主世界、大型群系、放大化、洞穴、下界、末地、浮空岛、平坦和虚空地形
- 固定自定义群系、维度高度、坐标比例、光照、床、重生锚和固定时间
- 原生维度钥匙物品、合成配方和双向传送
- 浮空或虚空维度的安全出生平台

首版使用 Minecraft 已有且经过验证的噪声设置。它不会把自然语言直接转换成未经验证的任意 `NoiseRouter`。详细能力与边界见 [`WORLDGEN.md`](WORLDGEN.md)。

## 当前原生边界

当前版本已经真正注册武器、物品、食物、普通方块、机器 BlockEntity、基础自定义 EntityType、自定义群系和可进入维度，并可生成容器 GUI、机器同步包、Goal AI 与世界数据注册表。

仍需后续模块覆盖：

- 任意布局和动态控件的 GUI 设计器
- Forge Energy、流体和跨方块网络
- 自定义模型、GeckoLib 动画与骨骼编辑
- `Brain`、Memory、Sensor 和特殊导航级高级 AI
- 任意 `NoiseRouter`、密度函数曲线和 3D 地形预览
- 自定义结构 NBT、Jigsaw 模板池和处理器列表
- 科技树、经济、任务、剧情、RPG 等大型持久化系统
- NeoForge、Fabric 和第三方 Mod 深度后端
- 队伍、匹配、房间、排行榜等通用多人玩法框架

这些边界会保留为明确的 IR 能力缺口，而不会被伪装成已经自动生成。

## 验证

仓库的 `Verify IR Blueprint and Native Forge` 工作流会：

1. 执行网站正式构建与全部历史回归测试。
2. 导出并编译基础原生 Forge fixture。
3. 导出并编译机器、GUI、BlockEntity、自定义实体和 Goal AI fixture。
4. 导出包含主世界、浮空岛与虚空维度的世界生成 fixture。
5. 使用 Java 17、Gradle 8.8 和 Forge 47.4.21 执行完整构建与 `reobfJar`。
6. 检查菜单、Screen、机器包、BlockEntity、EntityType、Goal AI、群系、维度类型、维度和入口钥匙。
7. 启动生成的 Forge 专用服务器，验证动态注册表和内置数据包能够加载。
8. 上传源码 fixture、JAR、网站构建日志、Java 构建日志和服务器日志。

自动验证不能完全代替玩家在复制世界中的体验测试。GUI 操作、机器存档、实体渲染、AI、维度地形观感和长时间世界稳定性仍应在真实 Forge 1.20.1 客户端与专用服务端中验收。
