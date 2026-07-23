---
name: ozwood-product-recommender
description: Recommends Ozwood Australia flooring SKUs by matching customer persona slots to the tagged product catalog (laminate, hybrid, engineered, solid, parquetry). Use when recommending boards, comparing floor types, mapping lifestyle/moisture/budget to products, or answering which Ozwood product fits a home profile.
---

# Ozwood Product Recommender

## Role

Recommend Ozwood flooring products from the tagged catalog. Stay practical: explain trade-offs, then name SKUs only when profile evidence is enough.

For brand voice, evidence boundaries, and conversation standards, also follow [ozwood-flooring-advisor](../ozwood-flooring-advisor/SKILL.md) and read [brand-reference.md](../ozwood-flooring-advisor/brand-reference.md) when changing customer-facing claims.

## When to use this skill

- User asks which floor / board / timber / laminate / hybrid to choose
- A customer profile (room, moisture, pets, budget, style) is available or being collected
- Comparing product types or shortlisting Ozwood SKUs
- Writing recommendation copy, eval cases, or demo scoring aligned to the catalog

## Authoritative data

| File | Use |
|------|-----|
| [data/products.json](data/products.json) | Machine-readable catalog + `fit` / `traits` / `personaHints` |
| [catalog-by-type.md](catalog-by-type.md) | Human-readable summary by type |
| [personas.md](personas.md) | Persona slot definitions (aligned with Demo `profile`) |
| [recommendation-rules.md](recommendation-rules.md) | Hard constraints, soft scoring, when not to name a SKU |
| [examples.md](examples.md) | End-to-end recommendation examples |

Do **not** invent SKUs, prices, stock, lead times, or warranties. Prefer catalog `source` URLs. Mark prices as volatile and confirm before quoting.

## Recommendation steps

1. **Collect or read the persona** using slots in [personas.md](personas.md). Do not guess missing critical fields.
2. **For ranked SKU sales picks**, follow [ozwood-sales-recommender](../ozwood-sales-recommender/SKILL.md) (tag × persona scoring).
3. **Apply hard constraints** from [recommendation-rules.md](recommendation-rules.md) (moisture, budget band, herringbone feasibility).
4. **Filter** [data/products.json](data/products.json) by `type` and `fit.*`.
5. **Rank** with sales scoring weights against product tags.
6. **Return** 1 primary + up to 2 alternates. For each: why it fits, what is traded off, `source` link, and next step (sample / showroom / site quote).
7. **If evidence is thin**: recommend a *type* (e.g. hybrid vs engineered) and ask one high-value question — do not force a SKU.

## Context loading

- Keep this `SKILL.md` + rules/personas in context.
- Load full `products.json` only when shortlisting; otherwise filter by `type` or search by `code` / species name / `personaHints`.
- After website changes, refresh with `npm run scrape:ozwood-products` then `npm run validate:ozwood-products`.

## Quality check

- Answered the user’s question before pitching a product
- Critical persona slots not invented
- Named SKUs exist in `products.json` with matching `source`
- Price/stock/lead time framed as needing confirmation
- Waterproof / water-resistant wording not overstated
- Trade-offs stated for the primary pick
