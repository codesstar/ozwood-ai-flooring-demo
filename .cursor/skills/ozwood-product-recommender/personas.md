# Ozwood customer personas (profile slots)

Aligned with Demo `state.profile` in `ozwood-data.js` / `ozwood-app.js` so agent recommendations and the live demo speak the same language.

## Slot reference

| Slot | Allowed values | Product field | Notes |
|------|----------------|---------------|-------|
| space | `house` / `apartment` / `commercial` | `fit.space[]` | Apartments lean hybrid/laminate; solid/parquetry lean house |
| room | `living` / `bedroom` / `study` / `whole` | `fit.room[]` | Most boards suit all; herringbone often feature zones |
| area | number m² or unknown | — | Affects waste/labour talk, not SKU identity |
| lighting | `bright` / `medium` / `dim` | `fit.lighting[]` | Dim → prefer `light` / `cool` styles |
| style | `light` / `warm` / `australian` / `herringbone` / `cool` | `fit.style[]` | Match at least one; herringbone is strong filter |
| household | `kids` / `pregnant` / `elderly` / `pets` / `mixed` / `none` | `fit.household[]` | Pets/kids → waterproof + wear traits |
| lifestyle | `kids-pets` / `heavy` / `quiet` / `rental` | `fit.lifestyle[]` | Heavy/rental → hybrid/laminate, AC4 |
| moisture | `waterproof` / `occasional` / `dry` | `fit.moisture` | **Hard constraint** (single value on product) |
| subfloor | `concrete` / `tiles` / `timber` / `unknown` | — | Never invent install method; push site check |
| budget | `under35` / `35-55` / `55plus` / `quote` | `fit.budget` | AU$/m² material band; null price → `quote` |
| service | `supply-install` / `supply-only` / `sample` / `showroom` | — | Next-step CTA, not SKU filter |

## Readable personaHints

Products also carry short Chinese hints for retrieval and explanation, for example:

- 有孩宠物家庭
- 预算优先公寓
- 性价比家庭优选
- 品质真实木感
- 澳洲硬木个性
- 人字拼设计焦点
- 冷灰现代空间
- 暗厅提亮
- 出租投资房
- 低排放家庭关怀
- 商用耐磨

Use hints to explain *why*, not as the only filter — always cross-check `fit` and `traits`.

## Critical vs optional (Demo contract)

Treat as **critical** before naming a specific SKU (same spirit as the Demo):

`space`, `room`, `area` (or unknown with caveat), `lighting`, `style`, `household`, `lifestyle`, `moisture`, `budget`

Optional: `subfloor`, `service`.

## Matching priority (sales scoring)

For ranked SKU picks, use [ozwood-sales-recommender](../ozwood-sales-recommender/SKILL.md): hard gates then slot weights against product `fit` tags.

Tag dimensions on every SKU must match these slots 1:1 (`fit.space`, `fit.room`, …).

## Extraction reminder

Only fill slots the user actually stated. Asking about a product is not a preference. Questions about style are not automatic style locks until the user confirms.
