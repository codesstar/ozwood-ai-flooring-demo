# 智慧地板 AI Demo

## 在线演示

[打开 Ozwood AI 地板顾问演示](https://codesstar.github.io/ozwood-ai-flooring-demo/)

GitHub Pages 版本包含空间场景、地板切换、产品与品牌故事，以及推荐对话与自由问答。自由输入通过 Vercel 服务端安全调用 DeepSeek；接口中断时自动使用浏览器本地知识库。

## 快速启动

1. 将 `.env.example` 复制为 `.env.local`，填写 DeepSeek API Key。
2. 在本目录运行：

   ```bash
   npm start
   ```

3. 浏览器打开：
   - 品牌首页：<http://127.0.0.1:8787/>
   - Ozwood 独立桌面版：<http://127.0.0.1:8787/ozwood-demo.html>

API Key 只由本地 Node 服务读取，不会发送到浏览器。修改 `.env.local` 后需要重启服务。

旧方案 A/B 仍保留：`/layout-bottom.html`、`/layout-left.html`。

---

## 推荐系统在做什么（设计理念）

系统不是「凭感觉猜一款地板」，而是两步：

1. **给每款木板打上与用户问卷一致的标签**
2. **用用户画像去对照这些标签打分，按分数排序推荐**

一句话：**用户怎么答，木板怎么标，分怎么打。**

```text
官网产品页
    ↓ 采集 / 打标
products.json（每款都有 fit 标签）
    ↓ 构建
ozwood-catalog.js（Demo 用）
    ↓
用户回答问卷（画像）
    ↓ 硬条件过滤 + 逐款打分
主推 1 款 + 备选最多 2 款
```

相关 Cursor Skill（给 AI 顾问用，也给人看规则）：

| Skill | 作用 |
|-------|------|
| `ozwood-flooring-advisor` | 品牌语气、证据边界、客服标准 |
| `ozwood-product-recommender` | 目录权威数据、标签定义 |
| `ozwood-sales-recommender` | 销售场景：画像 × 标签打分与推荐话术 |

---

## 标签机制（每款木板必须有）

问卷问题定义在 `ozwood-data.js`。产品侧用同名槽位写在每款板的 `fit` 字段里。

| 用户会被问到 | 产品标签字段 | 含义（通俗） |
|--------------|--------------|--------------|
| 项目类型 | `fit.space` | 独立屋 / 公寓 / 商用 |
| 改造区域 | `fit.room` | 客厅 / 卧室 / 书房 / 全屋 |
| 采光 | `fit.lighting` | 亮 / 一般 / 暗 |
| 色调风格 | `fit.style` | 浅色 / 温暖 / 澳材 / 人字拼 / 冷灰 |
| 家庭情况 | `fit.household` | 小孩 / 孕妇 / 老人 / 宠物等 |
| 使用强度 | `fit.lifestyle` | 孩宠高频 / 耐磨 / 安静 / 出租 |
| 防潮要求 | `fit.moisture` | 防水 / 偶尔潮湿 / 干区（**硬条件**） |
| 材料预算 | `fit.budget` | AU$35 以下 / 35–55 / 55+ / 先询价 |

另外还有：

- **`traits`**：能力标签，如防水、AC4、E0、真实木皮等（来自规格与品类）
- **`personaHints`**：中文短标签，方便解释「为什么推荐你」

### 打标原则（为什么要「打准、不要打太宽」）

以前容易把防水款标成「适合所有家庭、所有生活方式」，结果推荐分不开好坏。现在约定：

- **只标真正适合的**，不要默认「全匹配」
- **人字拼**主要标客厅焦点，不要随便标全屋四室
- **风格**尽量来自品名（Grey、Champagne、Spotted Gum 等），没有依据时不强行当「温暖」满分
- **没官网价**时，按品类给合理预算档：强化偏入门、混合中档、工程木偏高、实木/拼花多为询价

权威目录文件：

`.cursor/skills/ozwood-product-recommender/data/products.json`

---

## 打分机制（画像怎么变成推荐）

实现位置：

- 规则说明：`.cursor/skills/ozwood-sales-recommender/scoring.md`
- 代码：`scripts/lib/ozwood-product-tags.mjs`
- Demo 运行时：`ozwood-app.js` 里的 `scoreProducts()`（与上面权重对齐）

### 1. 硬门禁（不满足就直接淘汰）

- 用户要 **防水** → 只保留标了防水的板；不会偷偷推干区实木
- 用户要 **人字拼** → 只保留拼花 / 人字拼标签
- 用户预算 **AU$35 以下**，但板子标价 ≥ 55 → 淘汰

硬门禁后如果一款都没有：Demo 会说明「当前硬条件没有可安全点名的型号」，并引导放宽条件。

### 2. 适配分（标签对上就加分）

大致权重（完整表见 `scoring.md`）：

| 对齐项 | 大约分值 |
|--------|----------|
| 防潮完全一致 | +20 |
| 预算档一致 | +15 |
| 风格一致 | +15（人字拼更高） |
| 家庭 / 使用强度 | 各 +10 |
| 采光 / 空间 / 房间 | +5～+8 |
| 能力 traits、中文 hints | 小幅加分 |

### 3. 排名与展示

- 按总分从高到低排序
- 输出 **1 个主推 + 最多 2 个备选**（尽量拉开类型或色调，避免三款几乎一样）
- 推荐理由优先说「匹配了哪些标签」，而不是编造功能

---

## 可针对左侧当前木板提问

左侧场景里正在展示哪一款，右侧顾问就可以围绕**这一款**回答。

**怎么用**

1. 在下方产品条点选一款（或等推荐卡应用到左侧）。
2. 聊天输入区上方会显示「正在查看：{短名}」，并有三个快捷追问（防水、价位、宠物/高频等）。
3. 也可直接输入：「这款防水吗」「多少钱」「适合有猫吗」。

**背后怎么做的**

```text
左侧当前 productKey
    ↓ 组装 focusedProduct 卡片（名称、标签、价格说明、source…）
POST /api/ozwood-question（与画像、历史一起发送）
    ↓
LLM：指代「这款」时优先用卡片；通用问题不强行推销
    ↓
回答 + 官网 source；API 不可用时用本地标签拼短答
```

注意：问当前板**不会**自动改成主推结果；若要换推荐，需明确说修改需求或重新推荐。

---

## 日常维护命令（分别是什么意思）

在项目根目录执行：

```bash
npm run scrape:ozwood-products      # ① 从官网抓取最新地板页
npm run retag:ozwood-products       # ② 按当前规则给已有目录重新打标签（不重新爬网）
npm run validate:ozwood-products    # ③ 检查标签是否完整、取值是否合法
npm run score:ozwood-walkthrough    # ④ 用几组固定用户画像测 Top3 是否合理
npm run build:ozwood-demo-catalog   # ⑤ 生成网页用的 ozwood-catalog.js
```

| 命令 | 什么时候用 | 一句话 |
|------|------------|--------|
| `scrape:ozwood-products` | 官网新增/改了产品，要同步目录 | 从官网拉数据并打标 |
| `retag:ozwood-products` | 只改了打标规则，不想重爬 | 离线重算全部 `fit` 标签 |
| `validate:ozwood-products` | 改完数据后必跑 | 不合格就报错，避免脏数据进 Demo |
| `score:ozwood-walkthrough` | 改完打分或标签后 | 用固定场景回归，防止推荐跑偏 |
| `build:ozwood-demo-catalog` | 要让网页生效时 | 把 `products.json` 编进 Demo |

**常见顺序：**

- 官网有更新：`scrape` → `validate` → `score` → `build`
- 只调标签规则：`retag` → `validate` → `score` → `build`
- 只调打分权重：改代码后跑 `score`；网页侧改了 `ozwood-app.js` 后刷新浏览器即可（不必 rebuild 目录，除非也改了标签）

---

## 以后怎么加新地板

### 方式 A：官网已上架（推荐）

1. 确认产品页在 [ozwoodaustralia.com.au](https://ozwoodaustralia.com.au/) 可访问，且属于五大类之一：强化 / 混合 / 工程木 / 实木 / 拼花（楼梯、配件、特征墙不进推荐目录）。
2. 运行：

   ```bash
   npm run scrape:ozwood-products
   npm run validate:ozwood-products
   npm run score:ozwood-walkthrough
   npm run build:ozwood-demo-catalog
   ```

3. 刷新 `ozwood-demo.html`，在筛选里应能看到新板；用对应画像走一遍推荐。

### 方式 B：先手工改目录（临时）

1. 在 `products.json` 的 `products` 数组里增加一款，至少包含：`id`、`name`、`type`、`source`（官网链接）、规格相关字段（可先空）。
2. 运行 `npm run retag:ozwood-products`，让脚本自动补齐 `fit` / `traits` / `personaHints`。
3. 再 `validate` → `score` → `build`。

> 手工条目的 `id` 建议用官网 URL 末段 slug，避免与抓取结果重复。

---

## 以后怎么改某一款的标签

### 1. 改自动规则（影响很多款）

编辑打标与打分核心库：

`scripts/lib/ozwood-product-tags.mjs`

然后：

```bash
npm run retag:ozwood-products
npm run validate:ozwood-products
npm run score:ozwood-walkthrough
npm run build:ozwood-demo-catalog
```

官网抓取脚本 `scripts/ozwood-scrape-products.mjs` 也会调用同一套打标逻辑，保证「新抓」和「重标」一致。

### 2. 只改某几款（覆盖表，推荐）

打开：

`.cursor/skills/ozwood-product-recommender/data/tag-overrides.json`

按产品 `id` 覆盖个别字段，例如：

```json
{
  "byId": {
    "hybrid-grey-oak": {
      "fit": {
        "style": ["cool"],
        "budget": "under35"
      },
      "tagQuality": "complete"
    }
  }
}
```

再跑 `retag`（会应用覆盖）→ `validate` → `build`。

这样不用为了一款板去改全局规则。

### 3. 直接改 `products.json`（慎用）

可以，但下次 `retag` / `scrape` 可能被规则覆盖。**长期修正请用 overrides 或改规则。**

---

## 关键文件地图

| 路径 | 说明 |
|------|------|
| `ozwood-demo.html` | Ozwood 独立演示页 |
| `ozwood-data.js` | 问卷（用户画像槽位） |
| `ozwood-app.js` | 对话、打分推荐、当前木板问答、换地板 UI |
| `api/ozwood-question.mjs` | 顾问 API：画像 + focusedProduct 上下文 |
| `ozwood-catalog.js` | **生成物**：Demo 运行时目录（勿手改） |
| `.cursor/skills/ozwood-product-recommender/data/products.json` | **权威目录** |
| `.cursor/skills/ozwood-product-recommender/data/tag-overrides.json` | 单品标签覆盖 |
| `scripts/lib/ozwood-product-tags.mjs` | 打标 + 打分共用逻辑 |
| `.cursor/skills/ozwood-sales-recommender/` | 销售推荐规则与示例 |

更细的产品目录说明见：`.cursor/skills/ozwood-product-recommender/OVERVIEW.zh.md`。
