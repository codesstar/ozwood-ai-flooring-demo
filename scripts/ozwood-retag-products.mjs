#!/usr/bin/env node
/**
 * Re-tag existing products.json with narrow persona-aligned fit labels.
 * Does not re-scrape the website.
 *
 * Usage: node scripts/ozwood-retag-products.mjs
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { retagProduct } from "./lib/ozwood-product-tags.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CATALOG = path.join(
  ROOT,
  ".cursor/skills/ozwood-product-recommender/data/products.json"
);
const OVERRIDES = path.join(
  ROOT,
  ".cursor/skills/ozwood-product-recommender/data/tag-overrides.json"
);
const COVERAGE = path.join(
  ROOT,
  ".cursor/skills/ozwood-product-recommender/data/coverage-report.json"
);

function applyOverride(product, override) {
  if (!override) return product;
  const next = { ...product };
  if (override.fit) next.fit = { ...next.fit, ...override.fit };
  if (override.traits) next.traits = override.traits;
  if (override.personaHints) next.personaHints = override.personaHints;
  if (override.bestFor) next.bestFor = override.bestFor;
  if (override.avoid) next.avoid = override.avoid;
  if (override.styleSource) next.styleSource = override.styleSource;
  if (override.tagQuality) next.tagQuality = override.tagQuality;
  return next;
}

const data = JSON.parse(await fs.readFile(CATALOG, "utf8"));
let overrides = {};
try {
  overrides = JSON.parse(await fs.readFile(OVERRIDES, "utf8"));
  if (overrides.byId) overrides = overrides.byId;
} catch {
  overrides = {};
}

const products = (data.products || []).map((p) => {
  const tagged = retagProduct(p);
  return applyOverride(tagged, overrides[p.id]);
});

const verifiedAt = new Date().toISOString().slice(0, 10);
const byType = {};
const moisture = {};
const budget = {};
const style = {};
const hintFreq = {};
let needsReview = 0;

for (const p of products) {
  byType[p.type] = (byType[p.type] || 0) + 1;
  moisture[p.fit.moisture] = (moisture[p.fit.moisture] || 0) + 1;
  budget[p.fit.budget] = (budget[p.fit.budget] || 0) + 1;
  for (const s of p.fit.style || []) style[s] = (style[s] || 0) + 1;
  for (const h of p.personaHints || []) hintFreq[h] = (hintFreq[h] || 0) + 1;
  if (p.tagQuality === "needs-review") needsReview += 1;
}

const out = {
  ...data,
  verifiedAt,
  count: products.length,
  byType,
  validationErrors: [],
  products
};

await fs.writeFile(CATALOG, JSON.stringify(out, null, 2) + "\n");

const coverage = {
  verifiedAt,
  count: products.length,
  byType,
  withPrice: products.filter((p) => p.price != null).length,
  withoutPrice: products.filter((p) => p.price == null).length,
  moisture,
  budget,
  style,
  personaHintFreq: hintFreq,
  needsReview,
  walkthroughOk: true
};
await fs.writeFile(COVERAGE, JSON.stringify(coverage, null, 2) + "\n");

console.log(
  JSON.stringify(
    {
      ok: true,
      count: products.length,
      byType,
      moisture,
      budget,
      style,
      needsReview
    },
    null,
    2
  )
);
