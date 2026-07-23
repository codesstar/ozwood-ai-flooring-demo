# Ozwood Flooring Catalog & Persona Skill — Overview

**Verified:** 2026-07-21  
**Source of truth:** [ozwoodaustralia.com.au](https://ozwoodaustralia.com.au/)  
**Deliverable:** project Cursor skill `ozwood-product-recommender`

This document summarises what was built: a scraped flooring catalog, persona tagging aligned with the live Demo, and an LLM skill for better product recommendations.

Chinese version: [OVERVIEW.zh.md](OVERVIEW.zh.md)

---

## 1. Purpose

Help Cursor agents (and later runtime LLMs) recommend Ozwood boards using:

1. A structured catalog of real website SKUs (with source URLs)
2. Customer persona slots that match the Demo chat profile
3. Clear hard rules (moisture, budget, evidence) and soft ranking preferences

It does **not** replace showroom advice, site inspection, or live price confirmation.

---

## 2. Scope

| In scope | Out of scope (this phase) |
|----------|---------------------------|
| Laminate | Stairs / treads |
| Hybrid | Flooring accessories |
| Engineered | Feature walls |
| Solid timber | Desks / non-floor SKUs |
| Parquetry / herringbone | Dumping 100+ SKUs into the Demo UI |

The public sitemap lists ~314 product URLs; after flooring-only filter and sale-page dedupe, the skill catalog holds **120** boards.

The Demo still uses its existing **5** showcase products. Full-catalog rules live in the skill for now.

---

## 3. Catalog snapshot

| Type | Count |
|------|------:|
| Laminate | 37 |
| Hybrid | 29 |
| Engineered | 33 |
| Solid | 12 |
| Parquetry | 9 |
| **Total** | **120** |

| Metric | Value |
|--------|------:|
| SKUs with a listed site price | 20 |
| SKUs needing quote (`budget: quote`) | 100 |
| Tagged waterproof | 41 |
| Tagged occasional moisture | 25 |
| Tagged dry-area | 54 |

Prices in the catalog are **volatile**. Always treat them as reference-only and confirm on the product page before quoting a customer.

---

## 4. File map

```
.cursor/skills/ozwood-product-recommender/
├── SKILL.md                    # When/how the agent should recommend
├── personas.md                 # Profile slot definitions
├── recommendation-rules.md     # Hard vs soft rules
├── examples.md                 # End-to-end recommendation examples
├── catalog-by-type.md          # Human-readable catalog by type
└── data/
    ├── products.json           # Authoritative tagged catalog
    ├── products.raw.json       # Pre-dedupe scrape output
    └── coverage-report.json    # Counts & tag distribution

scripts/
├── ozwood-scrape-products.mjs  # Scrape + tag pipeline
└── ozwood-validate-products.mjs
```

Related skill: `ozwood-flooring-advisor` (brand voice & evidence boundaries). The two skills are meant to be used together.

---

## 5. Product schema (each SKU)

**Identity:** `id`, `name`, `code`, `type`, `series`, `source`, `image`, `verifiedAt`  
**Specs:** `specification`, `thickness`, `wearLayer`, `perPackage`, `weight`, `emission`, `abrasion`, `wetSwelling`  
**Commerce:** `price`, `originalPrice`, `onSale`, `priceNote`, `priceVolatile`  
**Copy / inference:** `tone` (marked as inference), `shortDescription`, `categories[]`  
**Persona tags:**

| Field | Role |
|-------|------|
| `fit.*` | Machine filters aligned to Demo profile slots |
| `traits[]` | Capability flags (`waterproof`, `ac4`, `e0`, `real-timber-surface`, …) |
| `personaHints[]` | Short readable labels for explanation / retrieval |
| `bestFor[]` / `avoid` | Short advisory sentences |

---

## 6. Persona model (aligned with Demo)

Same vocabulary as `ozwood-data.js` / `ozwood-app.js` profile slots:

| Slot | Values | Product side |
|------|--------|--------------|
| space | house / apartment / commercial | `fit.space[]` |
| room | living / bedroom / study / whole | `fit.room[]` |
| lighting | bright / medium / dim | `fit.lighting[]` |
| style | light / warm / australian / herringbone / cool | `fit.style[]` |
| household | kids / pregnant / elderly / pets / mixed / none | `fit.household[]` |
| lifestyle | kids-pets / heavy / quiet / rental | `fit.lifestyle[]` |
| moisture | waterproof / occasional / dry | `fit.moisture` (hard) |
| budget | under35 / 35-55 / 55plus / quote | `fit.budget` |

**Matching priority:** moisture → budget band → style → household/lifestyle → lighting → space.

Agents must not invent missing critical slots. If evidence is thin, recommend a *product type* and ask one clarifying question instead of forcing a SKU.

---

## 7. How the LLM is expected to recommend

1. Read / collect the persona  
2. Apply hard constraints (especially moisture & herringbone feasibility)  
3. Filter `data/products.json` (or a type section of `catalog-by-type.md`)  
4. Rank soft preferences  
5. Return **1 primary + up to 2 alternates**, each with fit reasons, trade-offs, source URL, and next step (sample / showroom / site quote)  
6. Never invent stock, warranty, lead time, or unconfirmed price  

Full detail: `recommendation-rules.md` and `examples.md`.

---

## 8. Walkthrough results (spot checks)

| Persona scenario | Top direction from tagged catalog |
|------------------|-----------------------------------|
| Pets + waterproof + under AU$35 + cool tone | Hybrid Grey Oak and similar cool hybrids |
| Dim room + light / brighten | Pearl Oak / Champagne Oak / light greys |
| Australian hardwood character + dry + quote | Blackbutt / Spotted Gum engineered (and solid where listed) |
| Herringbone living feature | Parquetry herringbone range (e.g. Oak 4301 family) |

Validation: `npm run validate:ozwood-products` passes on the current catalog.

---

## 9. Maintenance

Refresh after website changes:

```bash
npm run scrape:ozwood-products
npm run validate:ozwood-products
```

Re-check `verifiedAt`, sale prices, and a few SKUs per type after each scrape.

---

## 10. Explicit non-goals (current phase) — updated 2026-07-21

**Done in Demo:** the full tagged flooring catalog (~118 SKUs) is loaded via `ozwood-catalog.js`, with type filter chips and fit-based scoring across the whole pool.

Still out of scope for now:

- Generating full room concept renders for every SKU (only the original 5 keep living/bedroom/study scenes; others fall back to official product photos)
- Scraping stairs, accessories, or feature walls
- Dumping all 120 SKU texts into the DeepSeek system prompt (client ranks locally; knowledge stays type-level)

Refresh pipeline:

```bash
npm run scrape:ozwood-products
npm run validate:ozwood-products
npm run build:ozwood-demo-catalog
```

---

## 11. Quick links

- Homepage: https://ozwoodaustralia.com.au/  
- Skill entry: `.cursor/skills/ozwood-product-recommender/SKILL.md`  
- Catalog JSON: `.cursor/skills/ozwood-product-recommender/data/products.json`  
- Brand / evidence skill: `.cursor/skills/ozwood-flooring-advisor/`
