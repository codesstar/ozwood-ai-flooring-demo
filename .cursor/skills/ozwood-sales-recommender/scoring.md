# Ozwood sales fit scoring

Tag dimensions match Demo persona slots exactly. Score = sum of slot points after hard gates.

Implementation: `scripts/lib/ozwood-product-tags.mjs` → `scoreProductAgainstProfile`.

## Hard gates (exclude or hard-fail)

| Condition | Rule |
|-----------|------|
| User `moisture = waterproof` | Keep only `fit.moisture = waterproof` (or `traits` includes `waterproof`). **No fallback** to dry/occasional SKUs. If pool empty → recommend hybrid / waterproof laminate as a *type* and ask to confirm. |
| User `style = herringbone` | Keep parquetry / `fit.style` herringbone / `high-waste-pattern`. Others hard-fail. |
| User `budget = under35` and product `price >= 55` | Hard-fail. |

## Slot weights (adaptability)

| Persona slot | Match rule | Points |
|--------------|------------|-------:|
| moisture | Exact `fit.moisture` | **+20** |
| moisture | User occasional + product waterproof | +12 |
| moisture | User dry + product occasional | +4 |
| moisture | Conflict (non-hard) | −8 |
| budget | Same band | **+15** |
| budget | Adjacent band | +6 |
| budget | Two bands apart | −8 |
| budget | User quote/55plus ↔ product quote/55plus | +10〜12 |
| style | `fit.style` contains user style | **+15** (herringbone **+18**) |
| style | Inferred warm-only vs user warm | half credit |
| style | light↔cool near miss | +8 |
| style | light vs deep australian only | −5 |
| household | Intersection | **+10** |
| household | kids/pets/mixed but product not waterproof-capable | −10 |
| lifestyle | Intersection | **+10** |
| lighting | Intersection | **+8** |
| lighting | dim + product light/cool | +4 |
| space | Intersection | **+6** |
| space | apartment vs solid/parquetry only-house | −6 |
| room | Intersection | **+5** |
| room | whole vs living-only feature floor | +2 |
| traits | waterproof / ac4 / e0 / real-timber / pattern as relevant | −8〜+12 capped |
| personaHints | Semantic align (pets, dim, cool, …) | +2 each, max +6 |
| type nudge | waterproof lifestyle story + type hybrid | +4 |

## Ranking

1. Drop hard-fails.
2. Sort by `fitScore` descending.
3. Primary = #1.
4. Alternates = next SKUs with different `type` or lead `style` when possible (max 2).

## Output shape

1. One sentence answering the need  
2. Primary: name, code, type, score drivers (top tags), trade-off, `source`  
3. Two alternates with different trade-offs  
4. Next step: sample / Auburn or Castle Hill showroom / on-site quote  
