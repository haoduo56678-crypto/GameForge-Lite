# GameForge 原生机器与自定义实体系统

本模块把五项原本需要手写大量 Java 的 Forge 能力接入同一条 GameForge IR → Blueprint → Native Forge 生成链路：

1. 自定义容器 GUI（`AbstractContainerMenu` + `AbstractContainerScreen`）
2. 网络同步（`SimpleChannel`、C2S 与 S2C 数据包）
3. `BlockEntity`、库存、NBT 存档与服务端 Tick
4. 真正注册的新 `EntityType`
5. 可配置的基础 Goal AI

## 使用入口

网站部署后可从以下入口使用：

```text
/native-systems.html
/blueprint.html
/native-forge.html
```

`native-systems.html` 提供机器和自定义实体表单，也支持一句话创建。保存后的组件会写入当前项目，并自动生成对应 Blueprint；同一个项目随后可以在 Blueprint 中继续修改，或在 Native Forge 页面导出完整 Java 工程。

## 机器 IR

机器在兼容项目结构中保存为 `forge` 组件，并通过 `contentType: machine` 进入原生系统后端。典型配置：

```json
{
  "type": "forge",
  "name": "星核熔炼机",
  "spec": {
    "id": "star_forge",
    "contentType": "machine",
    "inputItem": "minecraft:iron_ingot",
    "inputCount": 1,
    "fuelItem": "minecraft:coal",
    "fuelCount": 1,
    "outputItem": "minecraft:gold_ingot",
    "outputCount": 2,
    "processTicks": 80,
    "autoStart": false
  }
}
```

IR 适配层会把它规范化为 `gameforge.ir` v1；后端不读取自然语言，只读取经过验证的机器配置。

### 生成的机器代码

一个含机器的原生 Forge 工程会生成：

```text
systems/
├── NativeSystemsBootstrap.java
├── client/NativeSystemsClient.java
├── registry/
│   ├── SystemBlocks.java
│   ├── SystemItems.java
│   ├── SystemBlockEntities.java
│   └── SystemMenus.java
├── machine/
│   ├── MachineDefinition.java
│   ├── MachineDefinitions.java
│   ├── GameForgeMachineBlock.java
│   ├── GameForgeMachineBlockEntity.java
│   ├── GameForgeMachineMenu.java
│   └── client/GameForgeMachineScreen.java
└── network/
    ├── MachineNetwork.java
    ├── MachineActionPacket.java
    ├── MachineStatePacket.java
    └── ClientPacketHandlers.java
```

当前机器框架包含：

- 真正注册的机器方块与 `BlockItem`
- 可同时支持多个机器方块的共享 `BlockEntityType`
- 输入、燃料、输出三个槽位
- `ItemStackHandler` 和 Forge item capability
- NBT 库存、进度与开关状态持久化
- 仅在服务端运行的处理 Tick
- 输出堆叠与最大堆叠数检查
- 方块移除时掉落库存
- 打开菜单前验证实际 `BlockEntity`
- GUI 启动／停止按钮和进度条
- 原版 `ContainerData` 菜单同步
- 额外 S2C 状态同步
- 机器模型、贴图、方块状态、语言、配方与掉落表

### 网络安全

生成的 C2S 按钮包不会直接信任客户端。服务端会验证：

- 发送者是否存在
- 操作编号是否在白名单范围内
- 玩家当前是否打开了对应机器菜单
- 数据包位置是否等于菜单位置
- 玩家是否在机器 8 格以内
- 该位置是否仍然是正确的机器 `BlockEntity`

只有全部通过后才会改变机器状态。

S2C 包在注册时固定为 `PLAY_TO_CLIENT`，C2S 包固定为 `PLAY_TO_SERVER`。处理进度不再每 Tick 广播；运行时按节流间隔同步，在完成、停止、库存改变等关键状态发生时立即同步。

### 无燃料机器

将 `fuelCount` 设为 `0` 或把燃料设为 `minecraft:air`，即可生成不需要燃料的机器。无燃料机器的燃料槽不会接受任意物品，Shift 点击也不会把普通物品错误塞入该槽位。

## 自定义实体 IR

真正的新实体使用 `contentType: entity`：

```json
{
  "type": "forge",
  "name": "亡灵守卫",
  "spec": {
    "id": "undead_guard",
    "contentType": "entity",
    "nativeEntity": true,
    "health": 40,
    "damage": 7,
    "speed": 0.28,
    "armor": 3,
    "followRange": 36,
    "goals": [
      "float",
      "melee_attack",
      "random_stroll",
      "look_at_player",
      "hurt_by_target",
      "nearest_player"
    ],
    "targetPlayers": true,
    "texture": "minecraft:textures/entity/zombie/zombie.png"
  }
}
```

### 生成的实体代码

```text
systems/
├── registry/SystemEntities.java
└── entity/
    ├── EntityDefinition.java
    ├── EntityDefinitions.java
    ├── GameForgeCustomMob.java
    └── client/GameForgeCustomMobRenderer.java
```

生成结果包括：

- 真正的新注册 ID，例如 `your_mod:undead_guard`
- `DeferredRegister<EntityType<?>>`
- 自定义 `Monster` 子类
- 每种实体独立的生命、攻击、速度、护甲、索敌距离和击退抗性
- 属性创建事件
- Forge 刷怪蛋
- 客户端实体渲染器
- 实体名称语言条目
- 自定义碰撞箱尺寸和火焰免疫选项
- 普通实体按原版规则自然消失；只有 Boss 标记实体会被设为持久并显示名称

### 当前 Goal AI

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

Blueprint 可以为同一实体连续添加多个 Goal 节点。后端会去重并生成固定优先级的 `goalSelector` 与 `targetSelector`。

## Blueprint 节点

机器节点：

```text
机器处理循环
输入槽配方
燃料槽
输出物品
处理时间
自动启动
```

实体节点：

```text
自定义实体出生
实体属性
添加 Goal AI
玩家目标选择
实体外观与碰撞箱
```

系统 Blueprint 会执行：

- 端口类型检查
- 单输入、单执行输出限制
- 不可达节点提示
- 无界循环阻止
- 机器入口、输入和输出完整性检查
- 实体入口与属性完整性检查

编译结果回写同一个项目组件，再由 IR 交给原生 Forge 后端。

## 自动验证

仓库 CI 会执行：

1. 完整网站生产构建和全部旧回归测试。
2. Blueprint → IR → Forge 输出回归测试。
3. 导出只包含两台机器和一个自定义实体的原生系统 fixture。
4. 使用 Java 17、Gradle 8.8 与 Forge 47.4.21 执行 `clean build`。
5. 运行 `compileJava`、`processResources`、`jar`、`reobfJar`、`assemble`、`check` 和 `build`。
6. 检查菜单、Screen、网络包、BlockEntity、EntityType、Goal AI 类及相关资源是否进入最终 JAR。
7. 上传源码工程、可安装 JAR 与构建日志。

## 当前边界

本版本完成的是可生成、可编译的第一版通用框架。以下能力仍属于后续模块：

- 任意拖拽布局的 GUI 控件设计器
- 多种菜单布局和动态 Widget
- Forge Energy、流体槽、物品管道和跨方块网络
- GeckoLib 骨骼模型与动画
- 自定义模型制作与导入
- `Brain`、`MemoryModuleType`、`SensorType` 级高级 AI
- 飞行、攀爬、钻地和自定义导航
- 自然群系生成规则和刷怪权重编辑器
- 大规模多人压力测试
- 第三方 Mod capability/API 深度兼容

编译成功不等于所有交互都已经在真实客户端和独立服务端中验证。发布前仍应在复制的单人世界和专用服务端中测试 GUI 操作、存档恢复、自动化输入输出、实体生成、AI 行为和多人同步。
