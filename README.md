# GameForge Lite 2.1.1

GameForge Lite 是一个完全在浏览器本地运行的 Minecraft Java 1.20.1 创作工作室。它让普通玩家通过一句话、表单和模板生成可下载的数据包、资源包、指令函数与 Forge Mod 源码，不需要服务器、数据库、API Key 或付费 AI。

## 主要功能

- 一句话本地解析：武器、Boss、装饰方块、配方、掉落表、效果指令与 Forge Mod 想法
- 自定义武器、物品、装饰方块、生物与 Boss
- 指令、配方、掉落表、函数与进度生成器
- 资源包物品生成器与像素纹理编辑
- Forge 1.20.1 工具、物品、食物和方块源码生成
- 项目保存、复制、导入、导出、文件预览与完整 ZIP 下载
- 自动诊断、13 项浏览器自测、日志错误分析与 PWA 离线缓存
- 重复 ID、CustomModelData 和 ZIP 路径自动避让

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

- 原版生成器面向 Minecraft Java 1.20.1。
- 数据包方案使用原版物品、CustomModelData 与显示实体组合实现，不会注册真正的新物品 ID。
- Forge 导出是可编辑源码工程，不是预编译 JAR；最终仍需使用 Java 17 构建并进入测试客户端验证。
- 爆炸、循环函数、大范围指令和自定义实体应先在复制的测试世界运行。

## 测试状态

JavaScript、页面、移动端布局、JSON、ZIP、项目导入导出和 Forge 源码结构已完成自动测试；真实 Minecraft 游戏行为与 Forge JAR 编译由本地游戏环境继续验证。

## License

MIT，详见 `LICENSE.txt`。
