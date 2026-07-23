# Sales recommender examples

Scores follow [scoring.md](scoring.md). Catalog: `ozwood-product-recommender/data/products.json`.

---

## 1. Pets + waterproof + under35 + cool

**Persona:** apartment · living · bright · cool · pets · kids-pets · waterproof · under35

**Hard gate:** waterproof only.

**Expect:** Top type = **hybrid**, preferably cool/grey; laminate waterproof only if tagged; never solid/dry engineered as primary.

---

## 2. Dim room + light

**Persona:** house · bedroom · dim · light · none · quiet · occasional · 35-55

**Expect:** Primary `fit.style` includes **light** or **cool**; inferred warm-only boards should not rank first.

---

## 3. Australian hardwood + dry + quote

**Persona:** house · living · bright · australian · none · quiet · dry · quote

**Expect:** Primary type **engineered** or **solid** with australian style / species; hybrid look-alike only as alternate with explicit trade-off.

---

## 4. Herringbone living

**Persona:** house · living · bright · herringbone · none · quiet · dry · quote

**Expect:** Primary type **parquetry** (or herringbone-tagged); warn labour/waste.

---

## 5. Thin evidence

**User:** “What floor is best?”

**Do not** name a SKU. Contrast hybrid vs engineered at type level; ask moisture or household next.
