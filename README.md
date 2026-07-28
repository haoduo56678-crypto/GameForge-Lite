# GameForge Lite

[![Minecraft 1.20.1](https://img.shields.io/badge/Minecraft-1.20.1-62B47A?style=flat-square)](https://www.minecraft.net/)
[![Forge 47.4.21](https://img.shields.io/badge/Forge-47.4.21-E04E39?style=flat-square)](https://files.minecraftforge.net/)
[![Java 17](https://img.shields.io/badge/Java-17-ED8B00?style=flat-square)](https://adoptium.net/)
[![Verify](https://github.com/haoduo56678-crypto/GameForge-Lite/actions/workflows/architecture-build.yml/badge.svg)](https://github.com/haoduo56678-crypto/GameForge-Lite/actions/workflows/architecture-build.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](LICENSE.txt)

**GameForge Lite** 是一个完全在浏览器本地运行的 Minecraft Java 1.20.1 创作工作室。  
它让普通玩家通过一句话、表单、模板和 Blueprint 节点创建低代码作品，也能导出真正可编译的 Forge Java 工程。

- 不需要服务器、数据库、API Key 或付费 AI
- 提示词、项目和文件默认留在浏览器本地
- 同一份作品可进入低代码、Blueprint 和原生 Forge 流程
- 当前发布版本：`2.1.1`
- 官方验证环境：Minecraft `1.20.1`、Forge `47.4.21`、Java `17`

<p>
  <a href="https://game-forge-lite.vercel.app"><strong>打开在线工作室</strong></a>
  ·
  <a href="https://game-forge-lite.vercel.app/blueprint">Blueprint</a>
  ·
  <a href="https://game-forge-lite.vercel.app/native-forge">原生 Forge 工程</a>
  ·
  <a href="https://game-forge-lite.vercel.app/native-systems">机器与自定义实体</a>
  ·
  <a href="https://game-forge-lite.vercel.app/worldgen">世界与维度</a>
</p>

---

## 项目定位

GameForge Lite 不是单一的“生成一个 JAR”页面，而是一套逐步扩展的 Minecraft 创作流水线：

```text
自然语言 / 表单 / 模板 / Blueprint
                  │
                  ▼
            GameForge IR v1
                  │
      ┌───────────┼───────────────┐
      ▼           ▼               ▼
  低代码作品   原生 Forge 工程   后续其他后端
  ZIP / JAR    Java / Gradle     NeoForge / Fabric
```

解析层只负责把玩家的表达转换成统一 IR；生成层只负责读取 IR 并输出目标格式。  
因此提示词、表单和 Blueprint 可以复用同一套生成器，而不需要为每种输入方式重新写一套逻辑。

---

## 三种使用方式

| 路线 | 输出 | 是否注册真正的新 ID | 适合场景 |
|---|---|---:|---|
| **低代码作品** | 数据包、资源包、完整 ZIP、`lowcodefml` JAR | 否 | 快速制作武器、物品、函数、配方和基础玩法 |
| **原生 Forge 工程** | 完整 Java 17 / Gradle 工程与可编译 JAR | 是 | 真正的 Item、Block、BlockEntity、EntityType、GUI、世界生成 |
| **GameForge Runtime** | 配套 Forge Mod | 不适用 | 精确高级武器事件、作品浏览器、配方与内容管理 |

低代码和原生 Forge 并不是互相替代的两套产品：

- 低代码路线强调零安装、快速生成和浏览器本地转换。
- 原生 Forge 路线强调真正注册内容、可继续开发和更高自由度。
- 同一项目可以同时包含低代码内容和原生内容。

---

## 当前能力

### 1. 本地提示词解析

本地词库不调用在线 AI，也不会上传玩家输入。

当前包含：

- 386 个基础语义概念
- 4,500 多个中英文直接表达
- 约 80,000 种可组合表达
- 4,017 条额外高优先级词语与短语
- 6,402 个运行时有效匹配形式
- 中文、英文、口语、繁体变体和常见同义表达
- 物品、生物、Boss、颜色、数值、时间和目标条件解析

能够识别的方向包括：

- 武器、物品、工具、食物、盔甲和方块
- 生物、Boss、机器和自定义实体
- 世界、维度、群系、地形、洞穴、海洋、浮空岛和虚空
- 天气、时间、结构、事件、任务、魔法、科技和玩法系统
- Forge、Fabric、NeoForge、NBT、CustomModelData、配方、函数和世界生成术语

识别到一个概念不等于对应生成器已经全部实现。未实现的大型系统会保留为结构化草案，不会被错误生成成普通武器或方块。

### 2. 低代码内容生成

当前低代码路线支持：

- 武器、物品、食物和装饰方块
- 原版实体载体的生物与 Boss
- 指令、函数、配方、掉落表和进度
- 资源包物品、模型引用和像素纹理
- 项目保存、复制、导入、导出和完整 ZIP 下载
- ZIP → Forge 1.20.1 `lowcodefml` JAR
- 游戏内初始化、普通玩家 `/trigger` 菜单、获取全部、召唤全部、诊断、清理和卸载函数
- 重复 ID、CustomModelData 和 ZIP 路径自动避让

低代码 JAR 使用原版物品作为载体，并通过名称、NBT、CustomModelData、函数和配方实现自定义内容；它不会注册真正的新 Item ID。

### 3. 精确高级武器

高级武器支持：

- 目标组：亡灵、敌对、水生、节肢、灾厄村民、动物、Boss、玩家和任意生物
- 具体实体：僵尸、骷髅、尸壳、溺尸、蜘蛛、苦力怕等
- 一击必杀
- 低生命百分比斩杀
- 倍率伤害
- 额外固定伤害
- 吸血
- 击退
- 凋零、燃烧、中毒、冻结、闪电和安全爆炸
- 玩家和驯服宠物安全排除
- 每位玩家、每件武器独立冷却

需要精确命中事件的低代码作品会在元数据中标记 `runtimeRequired: true`，ZIP → JAR 转换器会自动声明 GameForge Runtime 依赖。

### 4. Blueprint 可视化逻辑编辑器

Blueprint 页面提供真正的节点、端口和连线，而不是只显示流程图。

当前节点覆盖：

- 命中、右键使用、持续 Tick、玩家加入
- 目标分类、具体实体、生命比例和随机概率
- 秒杀、斩杀、伤害、吸血、击退、状态、闪电、爆炸、治疗、给予物品、召唤实体、执行指令和冷却
- 机器输入、燃料、输出、处理时间和自动启动
- 自定义实体属性、Goal AI、目标选择和外观
- 群系气候、颜色、地物、生物生成和结构兼容
- 维度地形、群系、物理属性、时间和入口钥匙

编辑器支持：

- 节点拖拽、画布平移和缩放
- 自动适应
- 撤销和重做
- 导入和导出
- 端口类型检查
- 单输入与单执行输出限制
- 不可达节点诊断
- 无界循环阻止
- Blueprint → IR → Blueprint 回环

### 5. 原生 Forge Java 工程

原生 Forge 后端会生成完整工程，而不是把 ZIP 改名为 JAR。

典型目录：

```text
MyMod/
├── build.gradle
├── settings.gradle
├── gradle.properties
├── gameforge-ir.json
├── gameforge-native-report.json
├── src/main/java/
├── src/main/resources/
└── .github/workflows/build.yml
```

当前可以真正注册：

- `SwordItem`
- 普通 `Item`
- `FoodProperties`
- `Block`
- `BlockItem`
- `BlockEntityType`
- `MenuType`
- `EntityType`
- Forge 刷怪蛋
- 维度入口钥匙

并生成：

- `DeferredRegister`
- Forge 事件处理
- 模型、贴图、语言、配方、方块状态和掉落表
- 内置数据包资源
- GitHub Actions 构建流程
- IR 与能力报告

### 6. 原生机器、GUI 与必要网络同步

机器系统会生成：

```text
Block
→ BlockEntity
→ ItemStackHandler
→ NBT
→ Menu
→ Screen
→ C2S / S2C
```

当前包括：

- 三槽物品栏：输入、燃料、输出
- 服务器 Tick 加工
- 处理进度、启停状态和库存持久化
- `AbstractContainerMenu`
- `AbstractContainerScreen`
- 开始、停止按钮和进度条
- Shift 点击物品移动
- Forge Item Capability
- 拆除时掉落库存
- 有燃料和免燃料机器
- 模型、贴图、配方和掉落表

机器 GUI 使用 `SimpleChannel` 进行必要的权威同步。C2S 操作会检查菜单、位置、距离、动作白名单、真实 BlockEntity 和每位玩家的发送频率。

这不是通用多人游戏框架；网络层当前只服务于生成内容所必需的客户端／服务端同步。

### 7. 真正的自定义 EntityType 与基础 Goal AI

自定义实体会注册真正的新 ID，例如：

```text
your_mod:undead_guard
```

当前支持：

- 自定义 `Monster` 子类
- 生命、攻击、速度、护甲、索敌距离、击退抗性和经验
- 碰撞箱大小
- 火焰免疫
- 客户端渲染器和纹理资源
- 刷怪蛋
- Boss 持久名称
- Minecraft `MobType`：普通、亡灵、节肢、灾厄村民和水生

基础 Goal AI：

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

普通生成实体不会因为自动命名而永久存在；只有明确标记为 Boss 的实体会保持持久化名称。

### 8. 世界与维度生成 v1

世界生成页面能够把一句话转换为配套的自定义群系和可进入维度，而不是只保存概念草案。

自定义群系支持：

- 温度、降水和雨雪
- 天空、雾、水、水下雾、草和树叶颜色
- 主世界、稀疏、下界、末地和空白地物预设
- 动物、怪物、和平、敌对、下界、末地和空白生成预设
- 村庄、矿井和废弃传送门的群系标签

可进入维度支持：

- `dimension_type`
- `dimension`
- 最低 Y、高度和逻辑高度
- 天空光、顶部、超温暖、坐标比例
- 床和重生锚规则
- 正常昼夜或固定时间
- 固定使用项目内自定义群系
- 双向维度入口钥匙
- 浮空岛与虚空维度的安全平台

地形预设：

```text
overworld
large_biomes
amplified
caves
nether
end
floating_islands
flat
void
```

v1 使用 Minecraft 1.20.1 已验证的噪声设置，不会把模糊描述直接拼成未经验证的任意 NoiseRouter。

### 9. GameForge Runtime 0.3.0

Runtime 是与低代码作品配套的独立 Forge Mod。安装后按 `G` 打开内容浏览器。

主要功能：

- 扫描已安装的 GameForge 作品 JAR
- 以响应式图标网格浏览内容
- 搜索名称、作品、命名空间、ID、载体、触发方式和技能效果
- 显示真实 ItemStack 与 CustomModelData 模型
- 查看属性、技能、冷却和 3×3 配方
- 一键获取物品或召唤实体
- 打开项目菜单、获取全部、召唤全部、诊断和清理
- 检测重复作品命名空间
- 精确处理高级武器 `LivingDamageEvent`
- 简体中文和英文界面
- 紧凑与完整双栏布局

Runtime 只负责 GameForge 作品内容，不会代替 JEI 对原版和所有第三方 Mod 的完整索引。

---

## 快速开始

### 在线使用

1. 打开 [在线工作室](https://game-forge-lite.vercel.app)。
2. 创建或选择项目。
3. 使用一句话、表单或模板添加内容。
4. 根据目标选择：
   - **下载作品**：得到完整低代码 ZIP。
   - **ZIP → JAR**：在浏览器本地转换为低代码 Forge JAR。
   - **Blueprint**：编辑事件、条件、动作和系统节点。
   - **原生 Forge 工程**：下载真正的 Java / Gradle 工程。
   - **机器与自定义实体**：创建 BlockEntity、GUI、EntityType 和 Goal AI。
   - **世界与维度**：创建群系、维度和入口钥匙。

### 示例提示词

```text
做一把叫亡灵剑的剑，命中时秒杀亡灵生物，不伤害玩家
```

```text
做一个叫星核熔炼机的机器，用 minecraft:iron_ingot 和 minecraft:coal，
输出 minecraft:gold_ingot，5 秒完成
```

```text
做一个叫亡灵守卫的自定义怪物，生命 40，攻击 7，
近战攻击玩家并且会反击
```

```text
做一个叫云海群岛的浮空岛世界，永昼并创建安全平台
```

```text
做一个叫灰烬荒原的永夜末日废土维度，
有村庄、矿井和废弃传送门
```

---

## 生成原生 Forge 工程

在网站中完成项目后：

1. 打开 **原生 Forge 工程** 页面。
2. 设置 Mod ID、包名、版本、作者和许可证。
3. 查看生成报告、文件树和诊断。
4. 下载工程 ZIP。
5. 解压后在 Java 17 与 Gradle 8.8 环境中构建：

```bash
gradle clean build
```

生成的 JAR 位于：

```text
build/libs/
```

单人游戏把 JAR 放入对应 Forge 1.20.1 实例的 `mods` 文件夹。  
专用服务器需要在服务端安装；包含自定义界面、模型、实体或物品的客户端也需要安装相同 JAR。

---

## 低代码 ZIP → JAR

`ZIP → JAR` 页面会：

1. 识别 `datapack/data`、`resourcepack/assets` 和 `project.json`。
2. 合并数据包与资源包到 JAR 根目录的 `data/` 与 `assets/`。
3. 自动补全 `pack.mcmeta`、`META-INF/mods.toml` 和 `META-INF/MANIFEST.MF`。
4. 使用 Forge 1.20.1 `lowcodefml`，不执行任意 Java 编译。
5. 检查目录结构、JSON、PNG、Mod ID 和 `pack_format: 15`。
6. 仅在验证通过后下载结果。

有高级命中技能时，转换器会自动声明 Runtime 0.3.0 或更高版本为必要依赖；普通作品不会被错误标记。

更新同一作品时，请删除旧 JAR，只保留最新版本，避免重复 Mod ID 和命名空间冲突。

---

## 本地运行网站

要求：

- Node.js 18 或更高版本

```bash
git clone https://github.com/haoduo56678-crypto/GameForge-Lite.git
cd GameForge-Lite
npm start
```

然后打开：

```text
http://localhost:4173
```

`npm start` 会先执行完整构建与检查，再启动本地预览服务器。按 `Ctrl + C` 停止。

只构建：

```bash
npm run build
```

`dist/` 是生成结果，不是源码真相；不要直接在 `dist/` 中维护功能。

---

## 仓库结构

```text
GameForge-Lite/
├── architecture-v1/       # IR、Blueprint 与原生 Forge 架构包
├── extensions-v2/         # 后续扩展模块包
├── extras/                # 构建时安装到网站的浏览器模块与页面
├── scripts/               # 构建、补丁、回归测试和 fixture 导出
├── docs/                  # 架构、原生系统与世界生成文档
├── release-v4/            # 已验证的网站基础发布包
├── .github/workflows/     # 网站、Forge 工程和服务器验证
└── dist/                  # npm run build 生成的静态站点
```

---

## 测试与 CI

仓库的 GitHub Actions 会自动：

- 构建正式网站并运行历史回归测试
- 检查 JavaScript、页面、JSON、ZIP、词库、Runtime 和 JAR 转换
- 生成并编译基础原生 Forge fixture
- 生成并编译 GUI、网络、BlockEntity、EntityType 和 Goal AI fixture
- 生成并验证群系、维度类型、维度和入口钥匙
- 使用 Java 17、Gradle 8.8 和 Forge 47.4.21 执行 `build`
- 检查重混淆 JAR 中的类与资源
- 启动生成的 Forge 专用服务器，验证动态注册表和内置数据包能够加载
- 上传源码、JAR、构建日志和服务器日志

自动编译和专用服务器启动不能完全代替真实游戏行为测试。正式作品仍应先在复制的单人世界中验证，再放入长期存档或服务器。

---

## 兼容性

| 项目 | 状态 |
|---|---|
| Minecraft Java 1.20.1 | 官方目标 |
| Forge 47.4.21 | CI 完整验证 |
| Forge 47.x | 可能兼容，但仅保证已验证版本 |
| Java 17 | 原生工程必需 |
| 低代码 Runtime | 0.3.0 或更高版本 |
| Fabric | 仅能识别相关术语，暂不生成完整工程 |
| NeoForge | 仅能识别相关术语，暂不生成完整工程 |

多人安装说明：

- 低代码作品需要服务端安装作品 JAR。
- 使用模型和贴图的客户端也需要安装作品 JAR。
- 需要 Runtime 的作品，客户端与服务端应安装相同 Runtime 版本。
- 原生 Forge Mod 通常需要客户端和服务端安装同一 JAR。
- 当前没有队伍、匹配、大厅、排行榜等通用多人玩法框架。

---

## 当前边界

GameForge Lite 已经覆盖基础内容、原生注册、机器、GUI、自定义实体和可进入维度，但仍明确保留以下能力边界：

- 任意 `NoiseRouter`、密度函数树、样条曲线和 3D 噪声编辑器
- 自定义结构 NBT、Jigsaw 模板池、处理器列表和可视化结构编辑器
- 自定义传送门方块
- 任意布局与动态控件的完整 GUI Designer
- Forge Energy、流体、物品管道、多方块结构和跨方块网络
- GeckoLib、自定义骨骼模型、动画和时间轴
- `Brain`、Memory、Sensor、飞行、钻地、攀爬等高级 AI
- 完整多阶段 Boss、技能循环和战场机制
- 完整任务、剧情、经济、商店、职业、阵营、声望和技能树框架
- 通用多人队伍、匹配、房间、投票、排行榜和管理面板
- Fabric、NeoForge 和第三方大型 Mod 的深度生成后端
- 对所有 Minecraft 新版本的自动迁移

识别到这些概念时，系统会尽量保存为结构化信息，但不会把未完成的能力伪装成已可运行功能。

---

## 文档

- [架构：IR、Blueprint 与原生 Forge](docs/ARCHITECTURE.md)
- [原生机器、GUI、网络、BlockEntity 与 EntityType](docs/NATIVE_SYSTEMS.md)
- [世界与维度生成 v1](docs/WORLDGEN.md)

---

## 部署

Vercel 执行：

```bash
npm run build
```

并发布：

```text
dist/
```

向 `main` 分支提交后会触发正式部署。开发分支默认不会消耗 Vercel 预览构建额度。

---

## 安全提示

- 爆炸、循环函数、大范围命令和高频 Tick 逻辑应先在复制世界中测试。
- 自定义维度首次测试前请备份存档。
- 不要同时保留具有相同 Mod ID 的旧版和新版 JAR。
- 不要把未验证的原生工程直接放入长期服务器。
- 从不可信来源获得的 Forge 源码应先审查再编译。

---

## License

MIT，详见 [LICENSE.txt](LICENSE.txt)。
