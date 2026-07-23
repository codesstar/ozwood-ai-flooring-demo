# Ozwood 木板目录与用户画像 Skill — 总览

**核验日期：** 2026-07-21  
**数据来源：** [ozwoodaustralia.com.au](https://ozwoodaustralia.com.au/)  
**交付物：** 项目级 Cursor Skill `ozwood-product-recommender`

本文说明已完成内容：从官网采集的地板目录、与线上 Demo 对齐的用户画像标签，以及用于提升推荐质量的 LLM Skill。

英文版见：[OVERVIEW.md](OVERVIEW.md)

---

## 1. 目的

帮助 Cursor Agent（以及后续运行时 LLM）基于以下信息推荐 Ozwood 木板：

1. 结构化的官网真实 SKU 目录（含 source 链接）
2. 与 Demo 对话画像一致的客户槽位
3. 明确的硬约束（防潮、预算、证据边界）与软排序偏好

**不能替代**展厅咨询、现场勘测，或实时报价确认。

---

## 2. 范围

| 本阶段包含 | 本阶段不包含 |
|------------|--------------|
| Laminate（强化） | 楼梯 / 踏步 |
| Hybrid（混合） | 地板配件 |
| Engineered（工程木） | 特征墙 |
| Solid timber（实木） | 桌子等非地板 SKU |
| Parquetry / 人字拼 | 把 100+ SKU 全塞进 Demo UI |

官网 sitemap 约有 314 个商品 URL；经「仅地板」过滤与促销页去重后，Skill 目录保留 **120** 款。

Demo 仍使用现有 **5** 款展示产品。全量目录与推荐规则目前放在 Skill 中。

---

## 3. 目录快照

| 类型 | 数量 |
|------|------:|
| Laminate | 37 |
| Hybrid | 29 |
| Engineered | 33 |
| Solid | 12 |
| Parquetry | 9 |
| **合计** | **120** |

| 指标 | 数值 |
|------|------:|
| 官网上有标价的 SKU | 20 |
| 需询价（`budget: quote`） | 100 |
| 标注防水 waterproof | 41 |
| 标注偶尔潮湿 occasional | 25 |
| 标注干区 dry | 54 |

目录中的价格均为 **易变信息（volatile）**。只能作参考，向客户报价前务必再核产品页。

---

## 4. 文件结构

```
.cursor/skills/ozwood-product-recommender/
├── SKILL.md                    # Agent 何时/如何推荐
├── OVERVIEW.md                 # 英文总览
├── OVERVIEW.zh.md              # 中文总览（本文）
├── personas.md                 # 画像槽位定义
├── recommendation-rules.md     # 硬约束 / 软偏好
├── examples.md                 # 端到端推荐示例
├── catalog-by-type.md          # 按类型可读目录
└── data/
    ├── products.json           # 权威标注目录
    ├── products.raw.json       # 去重前原始抓取
    └── coverage-report.json    # 覆盖率与标签分布

scripts/
├── ozwood-scrape-products.mjs  # 采集 + 打标流水线
└── ozwood-validate-products.mjs
```

关联 Skill：`ozwood-flooring-advisor`（品牌语气与证据边界）。两者应配合使用。

---

## 5. 单品数据结构（每个 SKU）

**身份：** `id`, `name`, `code`, `type`, `series`, `source`, `image`, `verifiedAt`  
**规格：** `specification`, `thickness`, `wearLayer`, `perPackage`, `weight`, `emission`, `abrasion`, `wetSwelling`  
**商业：** `price`, `originalPrice`, `onSale`, `priceNote`, `priceVolatile`  
**文案 / 推断：** `tone`（标记为 inference）, `shortDescription`, `categories[]`  
**画像标签：**

| 字段 | 作用 |
|------|------|
| `fit.*` | 与 Demo 画像槽位对齐的机器过滤字段 |
| `traits[]` | 能力标签（`waterproof`, `ac4`, `e0`, `real-timber-surface` 等） |
| `personaHints[]` | 可读短标签，便于解释与检索 |
| `bestFor[]` / `avoid` | 简短适用 / 慎用说明 |

---

## 6. 用户画像模型（与 Demo 对齐）

与 `ozwood-data.js` / `ozwood-app.js` 的 `profile` 槽位使用同一套取值：

| 槽位 | 取值 | 产品侧字段 |
|------|------|------------|
| space | house / apartment / commercial | `fit.space[]` |
| room | living / bedroom / study / whole | `fit.room[]` |
| lighting | bright / medium / dim | `fit.lighting[]` |
| style | light / warm / australian / herringbone / cool | `fit.style[]` |
| household | kids / pregnant / elderly / pets / mixed / none | `fit.household[]` |
| lifestyle | kids-pets / heavy / quiet / rental | `fit.lifestyle[]` |
| moisture | waterproof / occasional / dry | `fit.moisture`（硬约束） |
| budget | under35 / 35-55 / 55plus / quote | `fit.budget` |

**匹配优先级：** 防潮 → 预算档 → 风格 → 家庭/生活方式 → 采光 → 空间类型。

Agent **不得编造**缺失的关键槽位。证据不足时，先推荐「产品类型」并追问一个高价值问题，不要强行点名 SKU。

---

## 7. LLM 推荐流程

1. 读取 / 收集用户画像  
2. 应用硬约束（尤其防潮、人字拼可行性）  
3. 在 `data/products.json`（或 `catalog-by-type.md` 对应类型章节）中筛选  
4. 按软偏好排序  
5. 返回 **1 个主推 + 最多 2 个备选**，各自说明匹配理由、取舍、`source` 链接，以及下一步（样板 / 展厅 / 现场报价）  
6. 不得编造库存、保修、交期或未确认价格  

细节见：`recommendation-rules.md`、`examples.md`。

---

## 8. 画像走查结果（抽检）

| 画像场景 | 标注目录中的主推方向 |
|----------|----------------------|
| 宠物 + 防水 + AU$35 以下 + 冷色 | Hybrid Grey Oak 等冷灰混合地板 |
| 暗厅 + 浅色提亮 | Pearl Oak / Champagne Oak / 浅灰系列 |
| 澳洲硬木个性 + 干区 + 询价 | Blackbutt / Spotted Gum 工程木（及目录中的实木） |
| 客厅人字拼焦点 | Parquetry 人字拼系列（如 Oak 4301 家族） |

校验：当前目录下 `npm run validate:ozwood-products` 通过。

---

## 9. 维护方式

官网变更后重新刷新：

```bash
npm run scrape:ozwood-products
npm run validate:ozwood-products
```

每次抓取后请核对 `verifiedAt`、促销价，并在每类抽查若干 SKU。

---

## 10. 本阶段明确不做（2026-07-21 已更新）

**Demo 已完成：** 通过 `ozwood-catalog.js` 接入全量标注目录，支持五大类筛选；推荐按与用户画像一致的 `fit` 标签打分（见 `ozwood-sales-recommender`）。

销售推荐：独立 Skill [ozwood-sales-recommender](../ozwood-sales-recommender/OVERVIEW.zh.md)，权重与 `scripts/lib/ozwood-product-tags.mjs` / Demo `scoreProducts` 对齐。

```bash
npm run retag:ozwood-products
npm run validate:ozwood-products
npm run score:ozwood-walkthrough
npm run build:ozwood-demo-catalog
```

暂仍不做：

- 不为每一款生成客厅/卧室/书房全套 AI 铺装图（仅原 5 款保留概念效果；其余回退官网产品图）
- 不采集楼梯、配件、特征墙
- 不把 120 款全文塞进 DeepSeek system prompt（排序在浏览器本地完成；知识库保持类型级）

刷新流程：

```bash
npm run scrape:ozwood-products
npm run validate:ozwood-products
npm run build:ozwood-demo-catalog
```

---

## 11. 快捷链接

- 官网首页：https://ozwoodaustralia.com.au/  
- Skill 入口：`.cursor/skills/ozwood-product-recommender/SKILL.md`  
- 目录 JSON：`.cursor/skills/ozwood-product-recommender/data/products.json`  
- 品牌 / 证据 Skill：`.cursor/skills/ozwood-flooring-advisor/`
