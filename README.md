# GameForge Lite

一个零后端、零 API、零数据库的 Minecraft Java 1.20.1 创作工具。

## 已完成功能

- 常用指令生成器
- 有序 / 无序配方生成器
- 实体掉落表生成器
- 多指令函数数据包生成器
- CustomModelData 资源包骨架生成器
- 浏览器本地 ZIP 打包下载

## 使用方法

直接双击 `index.html` 即可打开。

也可以在项目目录运行一个本地服务器：

```bash
python -m http.server 8000
```

然后打开 `http://localhost:8000`。

## 部署

这是纯静态网站，可以免费部署到 GitHub Pages、Cloudflare Pages、Netlify 或 Vercel。

## 设计原则

所有文件都在浏览器本地生成，不上传用户内容，也不需要付费 AI。
