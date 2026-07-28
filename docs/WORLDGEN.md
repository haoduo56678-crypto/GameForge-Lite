# GameForge 世界与维度生成 v1

GameForge Lite 的世界生成模块把自然语言、表单和 Blueprint 编译成同一份 GameForge IR，再由原生 Forge 后端生成 Minecraft Java 1.20.1 的数据驱动世界注册表与必要的 Java 入口逻辑。

```text
一句话 / 表单 / Blueprint
            ↓
      GameForge IR v1
            ↓
   Native Forge Worldgen
            ↓
Biome + DimensionType + Dimension + Travel Item
```

## 当前真正可以生成的内容

### 自定义群系

每个群系会生成：

- `data/<modid>/worldgen/biome/<id>.json`
- 温度、降水量与是否允许雨雪
- 天空、雾、水、水下雾、草和树叶颜色
- 主世界、稀疏、下界、末地或空白地物预设
- 动物与怪物、和平、敌对、下界、末地或空白生物生成预设
- 村庄、矿井和废弃传送门的原版结构群系标签

### 可进入维度

每个维度会生成：

- `data/<modid>/dimension_type/<id>.json`
- `data/<modid>/dimension/<id>.json`
- 自定义维度类型：高度、最低 Y、天空光、顶部、超温暖、坐标比例、床与重生锚规则
- 正常昼夜或固定时间
- 固定使用项目内的自定义群系
- 维度入口钥匙、物品模型、贴图和合成配方
- 返回主世界的双向传送
- 空白或浮空世界的安全出生平台

## 地形预设

首版提供经过 Minecraft 1.20.1 验证的地形目标：

- `overworld`：主世界噪声
- `large_biomes`：大型群系
- `amplified`：放大化地形
- `caves`：洞穴世界
- `nether`：下界噪声
- `end`：末地噪声
- `floating_islands`：浮空岛噪声
- `flat`：平坦世界
- `void`：空白平坦世界，并可创建出生平台

GameForge 不会把一句模糊描述直接拼成未经验证的任意 `NoiseRouter`。首版先使用 Minecraft 自带、可加载的噪声设置，再逐步开放密度函数和曲线编辑。

## 一句话示例

```text
做一个叫灰烬荒原的永夜末日废土维度，有村庄、矿井和废弃传送门
做一个叫云海群岛的浮空岛世界，永昼并创建安全平台
做一个叫寂静虚空的虚空维度，不生成生物并创建出生平台
create a frozen dimension with hostile mobs and eternal night
```

解析器会创建一对组件：

```text
自定义群系
+
使用该群系的可进入维度
```

## Blueprint 节点

### 群系节点

- 定义自定义群系
- 群系气候
- 天空、水与植被颜色
- 群系地物
- 群系生物生成
- 原版结构兼容

### 维度节点

- 定义可进入维度
- 维度地形预设
- 维度固定群系
- 维度物理属性
- 维度时间
- 维度入口钥匙

群系和维度 Blueprint 会回写到同一份 IR，之后可以继续用表单编辑或交给原生 Forge 后端生成。

## 原生 Forge 工程

生成工程包含：

```text
src/main/resources/data/<modid>/worldgen/biome/
src/main/resources/data/<modid>/dimension_type/
src/main/resources/data/<modid>/dimension/
src/main/resources/data/minecraft/tags/worldgen/biome/
src/main/java/<package>/worldgen/WorldgenBootstrap.java
src/main/java/<package>/worldgen/registry/WorldgenItems.java
src/main/java/<package>/worldgen/item/DimensionTravelItem.java
gameforge-worldgen-report.json
```

入口钥匙在服务端查找生成的维度，计算安全位置并传送玩家。浮空或虚空预设可以创建 5×5 平台并清空玩家周围的出生空间。

## 校验规则

生成前会检查：

- 注册 ID 与命名空间
- 群系引用是否存在
- `min_y` 与高度是否为 16 的倍数
- 逻辑高度不能超过总高度
- 噪声预设与高度范围是否匹配
- 地物、生物生成和地形预设是否受支持
- Blueprint 入口、连接、不可达节点和循环
- Java 文件与数据资源路径是否重复

## 当前边界

世界生成 v1 已经能够生成可注册、可编译、可进入的自定义维度，但仍明确保留以下边界：

- 暂不生成任意自定义 `NoiseRouter`、密度函数树和样条曲线
- 暂不提供 3D 噪声预览与可视化地形雕刻
- 暂不生成自定义结构 NBT、Jigsaw 模板池和处理器列表
- 暂不生成自定义传送门方块；首版使用可靠的入口钥匙
- 暂不提供跨维度大型服务器匹配、队伍或大厅系统
- 世界运行时事件、酸雨、流星雨和尸潮属于后续玩法系统，不等同于地形注册

这些能力会继续作为新的 IR 节点和独立生成后端增加，而不是重新耦合自然语言解析器与 Java 模板。

## 验证流程

仓库的世界生成 CI 会：

1. 执行网站构建和世界生成回归测试。
2. 生成包含主世界、浮空岛和虚空维度的真实 Forge 工程。
3. 使用 Java 17、Gradle 8.8 和 Forge 47.4.21 编译并重混淆 JAR。
4. 检查群系、维度类型、维度、结构标签和入口钥匙类。
5. 启动生成的专用服务器，确认动态注册表和数据包能够加载。
6. 上传源码、JAR、构建日志和服务器日志供检查。
