# Ozwood recommendation rules

## Hard constraints (do not violate)

1. **Moisture**
   - User needs `waterproof` → only products with `fit.moisture === "waterproof"` (typically hybrid; some waterproof laminate).
   - Never tell the user that “moisture resistant” equals unlimited standing water.
   - `dry` products (engineered / solid / most parquetry) stay out of wet-zone recommendations.

2. **Evidence**
   - Do not invent price, stock, lead time, warranty, certification, or installer availability.
   - Catalog `price` is **volatile** (`priceVolatile: true`). Say it needs confirmation and keep `source`.
   - Remote advice does not replace subfloor / moisture / acoustic / strata inspection.

3. **SKU identity**
   - Only name products that exist in `data/products.json`.
   - Preserve official `source` URL when citing a board.

4. **Herringbone / parquetry**
   - Requires clear design intent (`style: herringbone` or explicit request).
   - Call out higher labour, waste (`traits` includes `high-waste-pattern`), and setting-out risk.

5. **When not to name a SKU**
   - Critical persona slots still unknown
   - User only asked a general materials question
   - Moisture or budget constraints leave zero safe matches → say so and ask one clarifying question or recommend a *type*

## Soft preferences (ranking)

**Authoritative sales ranking:** use [ozwood-sales-recommender/scoring.md](../ozwood-sales-recommender/scoring.md) and `scripts/lib/ozwood-product-tags.mjs`.

Summary: score candidates that passed hard filters by persona-slot overlap with product `fit` tags (moisture +20, budget +15, style +15, household/lifestyle +10, …). Prefer diversity in the top 3.

## Type cheat sheet

| Type | Typical strengths | Typical cautions |
|------|-------------------|------------------|
| hybrid | Waterproof living, pets/kids, rental, AC wear | Real timber purity lower than engineered/solid |
| laminate | Budget, wear, bright looks | Usually occasional moisture, not full waterproof unless tagged |
| engineered | Real veneer + stability | Dry-area care; confirm install system |
| solid | Character, thickness, house dry zones | Movement/moisture sensitivity; often quote pricing |
| parquetry | Design focal floor | Labour, waste, planning |

## Output shape

For a firm recommendation:

1. One sentence answering the need
2. Primary SKU: name, code if any, type, 2–3 fit reasons, main trade-off, `source`
3. Two alternates with different trade-offs (e.g. more timber authenticity vs more waterproof)
4. Next step: sample / Auburn or Castle Hill showroom / on-site quote

## Refresh process

```bash
npm run scrape:ozwood-products
npm run validate:ozwood-products
```

Scope: laminate / hybrid / engineered / solid / parquetry only (stairs, accessories, feature walls excluded).
