# 智慧地板 AI Demo

## 在线演示

[打开 Ozwood AI 地板顾问演示](https://codesstar.github.io/ozwood-ai-flooring-demo/)

GitHub Pages 版本包含 3 个空间、5 款地板、A/B 双侧独立切换、产品与品牌故事，以及稳定的 9 步推荐和自由问答。自由输入通过 Vercel 服务端安全调用 DeepSeek，支持中途插问、一次描述多个需求、跳过、撤销和修改后重新推荐；接口中断时自动使用浏览器本地知识库，流程不会报错或丢失进度。

## 启动

1. 将 `.env.example` 复制为 `.env.local`，填写 DeepSeek API Key。
2. 在本目录运行：

   ```bash
   npm start
   ```

3. 浏览器打开：<http://127.0.0.1:8787/>

服务根页面默认打开带 Ozwood 官方 Logo 的独立品牌版。旧方案 A/B 仍保留，可分别访问 `/layout-bottom.html` 和 `/layout-left.html`。

API Key 只由本地 Node 服务读取，不会发送到浏览器。修改 `.env.local` 后需要重启服务。

## Ozwood 独立桌面版

浏览器打开：<http://127.0.0.1:8787/ozwood-demo.html>

这个页面独立使用 `ozwood-demo.html`、`ozwood.css`、`ozwood-data.js` 和 `ozwood-app.js`，不会覆盖方案 A/B。它包含 3 个概念空间 × 5 个 Ozwood 产品方向、A/B 两侧都能更换的拖动对比、产品故事与安装养护详情、官网故事/展厅内容，以及完全本地运行的 9 步 AI 推荐流程。输入框同时支持自由需求描述和产品问答：服务正常时由受约束的 Ozwood AI 知识接口回答，API 中断时自动使用浏览器本地知识库，推荐流程不会中断。

详细内容与数据规则见 `OZWOOD_DEMO_PLAN.md`。
