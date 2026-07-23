# Ozwood 销售推荐 Skill — 总览

**核验日期：** 2026-07-22

独立销售推荐 Skill：用与 Demo 用户画像 **完全一致** 的产品标签，对每款木板打适配分，再按排名推荐。

## 分工

| Skill | 职责 |
|-------|------|
| `ozwood-flooring-advisor` | 品牌语气与证据边界 |
| `ozwood-product-recommender` | 目录采集、标签 schema、权威 `products.json` |
| **`ozwood-sales-recommender`** | **画像 × 标签评分 → 排名 → 主推话术** |

## 标签 = 画像槽位

与 [`ozwood-data.js`](../../../ozwood-data.js) 提问一致：

`space` · `room` · `lighting` · `style` · `household` · `lifestyle` · `moisture` · `budget`

（`area` / `subfloor` / `service` 不进 SKU 过滤，只影响说明与 CTA。）

## 流程

1. 读画像  
2. 硬门禁  
3. 逐款 `fitScore`  
4. 排序 → 1 主推 + ≤2 备选  
5. 用匹配标签解释原因  

权重见 [scoring.md](scoring.md)。运行时实现：`scripts/lib/ozwood-product-tags.mjs`。

## 维护

```bash
npm run retag:ozwood-products
npm run validate:ozwood-products
npm run score:ozwood-walkthrough
npm run build:ozwood-demo-catalog
```
