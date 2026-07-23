---
name: ozwood-sales-recommender
description: Scores every Ozwood flooring SKU against a customer persona using catalog fit tags, then ranks and recommends 1 primary + up to 2 alternates. Use when selling, shortlisting boards for a filled profile, explaining why a SKU fits, or running persona-based recommendation ranking.
---

# Ozwood Sales Recommender

## Role

Sales-facing recommendation: given a **customer persona** (same slots as the Demo questions), score **each tagged SKU** for fit, rank, and present a primary pick plus alternates.

Catalog tags and persona slots are defined in [ozwood-product-recommender](../ozwood-product-recommender/SKILL.md). Brand voice and evidence boundaries: [ozwood-flooring-advisor](../ozwood-flooring-advisor/SKILL.md).

## When to use

- Profile is mostly complete and the user wants a concrete board recommendation
- Comparing which SKUs best match a stated lifestyle / moisture / budget / style
- Explaining fit scores or “why this board for this home”
- Demo / eval walkthroughs that must match deterministic ranking

## Authoritative inputs

| Input | Source |
|-------|--------|
| Persona slots | [../ozwood-product-recommender/personas.md](../ozwood-product-recommender/personas.md) — same as Demo `state.profile` |
| Product tags | [../ozwood-product-recommender/data/products.json](../ozwood-product-recommender/data/products.json) `fit.*` / `traits` / `personaHints` |
| Scoring table | [scoring.md](scoring.md) |
| Examples | [examples.md](examples.md) |

Do **not** invent SKUs. Do **not** treat volatile prices as firm quotes.

## Recommendation steps

1. Read the persona. Critical slots: `space`, `room`, `area`, `lighting`, `style`, `household`, `lifestyle`, `moisture`, `budget`. If too few critical slots are known, ask one high-value question or mark confidence low — do not force a SKU.
2. Load the tagged catalog (`products.json`).
3. Apply **hard gates** in [scoring.md](scoring.md) (waterproof, herringbone, budget ceiling).
4. Score every remaining SKU with the slot weights in [scoring.md](scoring.md).
5. Rank by `fitScore` descending. Pick **1 primary + up to 2 alternates** (prefer diversity of type or style).
6. For each pick: name, code, type, top matching tags, main trade-off, `source` URL, next step (sample / showroom / site quote).

## Runtime parity

Deterministic scoring lives in `scripts/lib/ozwood-product-tags.mjs` (`scoreProductAgainstProfile` / `rankProductsForProfile`). The Demo `scoreProducts()` in `ozwood-app.js` follows the same weights. Prefer that logic over ad-hoc LLM ranking when shortlisting SKUs.

```bash
npm run retag:ozwood-products    # refresh narrow tags
npm run validate:ozwood-products
npm run score:ozwood-walkthrough # fixed persona Top3 checks
npm run build:ozwood-demo-catalog
```

## Quality check

- Named SKUs exist in `products.json` with matching `source`
- Hard gates not violated (especially waterproof)
- Reasons cite **matched tags / persona slots**, not invented features
- Price framed as needing confirmation
- Trade-off stated for the primary pick
