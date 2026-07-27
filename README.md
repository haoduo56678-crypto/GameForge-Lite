# GameForge Lite 2.1.1

GameForge Lite 是一个完全在浏览器本地运行的 Minecraft Java 1.20.1 创作工作室。它让普通玩家通过一句话、表单和模板生成可下载的数据包、资源包、指令函数与 Forge Mod 内容，不需要服务器、数据库、API Key 或付费 AI。

## 主要功能

- 一句话本地解析：武器、Boss、装饰方块、配方、掉落表、效果指令与 Forge Mod 想法
- 自定义武器、物品、装饰方块、生物与 Boss
- 指令、配方、掉落表、函数与进度生成器
- 资源包物品生成器与像素纹理编辑
- Forge 1.20.1 工具、物品、食物和方块源码生成
- 项目保存、复制、导入、导出、文件预览与完整 ZIP 下载
- 将 GameForge 完整 ZIP 在浏览器本地转换为 Forge 1.20.1 低代码 JAR
- 自动诊断、13 项浏览器自测、日志错误分析与 PWA 离线缓存
- 重复 ID、CustomModelData 和 ZIP 路径自动避让

## ZIP → JAR

工作室右下角有 `ZIP → JAR` 入口。上传“下载作品”得到的完整 ZIP 后，转换器会：

1. 识别 `datapack/data`、`resourcepack/assets` 和 `project.json`。
2. 把数据包与资源包内容合并到同一个 JAR 的 `data/` 与 `assets/` 根目录。
3. 自动补全 JAR 根目录 `pack.mcmeta`、`META-INF/mods.toml` 与 `META-INF/MANIFEST.MF`。
4. 使用 Forge 1.20.1 的 `lowcodefml` 加载方式，不编译任意 Java 源码。
5. 重新打开生成的 JAR，检查必要文件、目录结构、JSON、PNG、Mod ID 和 `pack_format: 15`。
6. 验证通过后才开始下载；作品始终留在浏览器本地，不上传服务器。

生成的 JAR 放进 PCL 对应 Forge 1.20.1 实例的 `mods` 文件夹。多人游戏时，服务端需要安装 JAR；需要贴图和模型的客户端也需要安装。

## 在电脑上运行

先同步最新版本：

```powershell
cd C:\Users\dell\GameForge-Lite
git pull
npm start
```

然后打开：

```text
http://localhost:4173
```

`npm start` 会先把经过验证的发布包构建到 `dist`，再启动本地预览服务器。按 `Ctrl + C` 可以停止服务器。

## Vercel 部署

Vercel 会运行 `npm run build`，并把 `dist` 目录发布为静态网站。向 `main` 分支 push 后会自动重新部署。

## 兼容边界

- 原版生成器和 ZIP → JAR 转换器面向 Minecraft Java 1.20.1、Forge 47.x 和 Java 17 及以上版本。
- ZIP → JAR 会把现有数据包与资源包封装为低代码 Mod；它不是简单改后缀，但也不会编译任意 Java 源码或注册真正的新物品 ID。
- Forge 源码导出仍是可编辑源码工程；需要真实 Java 逻辑时，最终仍需构建并进入测试客户端验证。
- 爆炸、循环函数、大范围指令和自定义实体应先在复制的测试世界运行。

## 测试状态

JavaScript、页面、移动端布局、JSON、ZIP、项目导入导出、Forge 源码结构和 JAR 目录生成已完成自动检查。ZIP → JAR 还会在浏览器中对最终 JAR 进行二次结构验证；真实 Minecraft 加载与游戏行为继续由本地 Forge 1.20.1 环境验证。

## License

MIT，详见 `LICENSE.txt`。
