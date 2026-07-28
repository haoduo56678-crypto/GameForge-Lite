# GameForge IR、Blueprint 与原生 Forge 后端

GameForge Lite 的新架构把“听懂玩家”“表示作品”和“生成目标格式”分成三个独立层。

```text
自然语言 / 表单 / Blueprint
           │
           ▼
    GameForge IR v1
           │
     ┌─────┼──────────────┐
     ▼     ▼              ▼
legacy-pack  native-forge  后续 NeoForge / Fabric
数据包/资源包 Java 工程
```

## 1. GameForge IR v1

`gameforge-ir.js` 定义稳定的中间格式：

- 项目元数据与 Minecraft 目标版本
- 组件类型、显示名和注册 ID
- 事件、条件、动作与冷却
- 玩家、驯服宠物和队友安全设置
- Blueprint 图与来源信息
- 校验、迁移、解析器注册和生成后端注册

原来的本地解析器现在通过 `legacy-rules` 适配器输出 IR；原来的数据包／资源包生成器通过 `legacy-pack` 后端消费 IR。旧页面仍可继续调用 `parsePrompt` 和 `generateProject`，但公开调用链已经经过 IR，因此解析器不再直接依赖某一种输出格式。

## 2. Blueprint 可视化逻辑

`blueprint.html` 提供节点式编辑器：

- 事件：命中、右键使用、持续 Tick、玩家加入
- 条件：目标分类、具体实体、生命比例、随机概率
- 安全：允许玩家、允许驯服宠物
- 动作：秒杀、斩杀、倍率／额外伤害、吸血、击退、状态、闪电、爆炸、治疗、给予物品、召唤实体、执行指令与冷却
- 拖拽、平移、缩放、自动适应、撤销／重做、导入／导出和诊断
- 端口类型检查、单输入限制、不可达节点检查和无界循环阻止

Blueprint 编译为 IR 行为，而不是直接拼接 Java 或 mcfunction。保存后，同一张图可以交给低代码后端或原生 Forge 后端。

## 3. 原生 Forge Java 工程

`native-forge.html` 与 `native-forge-generator.js` 输出 Minecraft Java 1.20.1、Forge 47.4.21、Java 17 工程：

- `build.gradle`、`settings.gradle`、`gradle.properties`
- GitHub Actions 自动构建工作流
- `DeferredRegister` 物品和方块注册
- 真正的 `SwordItem`、普通 Item、Food、Block 与 BlockItem
- 原生召唤物品，用于创建和配置原版实体／Boss
- `LivingDamageEvent` 精确命中处理
- 右键、持续 Tick 和玩家加入事件
- 目标组、条件、安全设置、冷却与多动作规则
- 模型、贴图、语言、配方、方块状态和掉落表
- 数据包组件继续作为 Mod 内置数据资源
- `gameforge-ir.json` 和生成报告，便于继续开发

## 当前原生边界

当前版本真正注册武器、物品、食物和方块。生物与 Boss 会生成原生召唤物品，并创建／配置已有的原版 `EntityType`；注册全新的实体类型、渲染器、动画和复杂 AI 仍属于下一阶段。世界与维度也需要独立的世界生成后端，而不是伪装成已完成的 Java 能力。

## 验证

仓库的 `Verify IR Blueprint and Native Forge` 工作流会：

1. 执行网站正式构建与全部回归测试。
2. 从实际 GameForge 项目导出原生 Forge fixture。
3. 使用 Java 17、Gradle 8.8 和 Forge 47.4.21 编译工程。
4. 检查生成 JAR、核心类和资源结构。
5. 上传源码 fixture、JAR 和构建日志。
