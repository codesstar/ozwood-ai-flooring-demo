#!/usr/bin/env node
/**
 * Walkthrough: score catalog against fixed personas; print Top3.
 * Usage: node scripts/ozwood-score-walkthrough.mjs
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { rankProductsForProfile } from "./lib/ozwood-product-tags.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CATALOG = path.join(
  ROOT,
  ".cursor/skills/ozwood-product-recommender/data/products.json"
);

const FIXTURES = [
  {
    id: "pets-waterproof-budget-cool",
    profile: {
      space: "apartment",
      room: "living",
      lighting: "bright",
      style: "cool",
      household: "pets",
      lifestyle: "kids-pets",
      moisture: "waterproof",
      budget: "under35"
    },
    expectTypeIn: ["hybrid", "laminate"],
    expectMoisture: "waterproof"
  },
  {
    id: "dim-light",
    profile: {
      space: "house",
      room: "bedroom",
      lighting: "dim",
      style: "light",
      household: "none",
      lifestyle: "quiet",
      moisture: "occasional",
      budget: "35-55"
    },
    expectStyle: ["light", "cool"]
  },
  {
    id: "australian-dry-quote",
    profile: {
      space: "house",
      room: "living",
      lighting: "bright",
      style: "australian",
      household: "none",
      lifestyle: "quiet",
      moisture: "dry",
      budget: "quote"
    },
    expectTypeIn: ["engineered", "solid"]
  },
  {
    id: "herringbone",
    profile: {
      space: "house",
      room: "living",
      lighting: "bright",
      style: "herringbone",
      household: "none",
      lifestyle: "quiet",
      moisture: "dry",
      budget: "quote"
    },
    expectType: "parquetry"
  }
];

const data = JSON.parse(await fs.readFile(CATALOG, "utf8"));
const products = data.products || [];
let failed = 0;

for (const fixture of FIXTURES) {
  const { picked, poolEmpty } = rankProductsForProfile(products, fixture.profile, { limit: 3 });
  const top = picked.map((item) => ({
    id: item.product.id,
    name: item.product.name,
    type: item.product.type,
    score: Number(item.score.toFixed(1)),
    style: item.product.fit?.style,
    moisture: item.product.fit?.moisture,
    budget: item.product.fit?.budget
  }));
  console.log(`\n=== ${fixture.id} ===`);
  if (poolEmpty) {
    console.log("POOL EMPTY");
    failed += 1;
    continue;
  }
  console.log(JSON.stringify(top, null, 2));
  const winner = picked[0]?.product;
  if (fixture.expectType && winner?.type !== fixture.expectType) {
    console.error(`FAIL: expected type ${fixture.expectType}, got ${winner?.type}`);
    failed += 1;
  }
  if (fixture.expectTypeIn && !fixture.expectTypeIn.includes(winner?.type)) {
    console.error(`FAIL: expected type in ${fixture.expectTypeIn}, got ${winner?.type}`);
    failed += 1;
  }
  if (fixture.expectMoisture && winner?.fit?.moisture !== fixture.expectMoisture) {
    console.error(`FAIL: expected moisture ${fixture.expectMoisture}, got ${winner?.fit?.moisture}`);
    failed += 1;
  }
  if (fixture.expectStyle) {
    const styles = winner?.fit?.style || [];
    if (!fixture.expectStyle.some((s) => styles.includes(s))) {
      console.error(`FAIL: expected style in ${fixture.expectStyle}, got ${styles}`);
      failed += 1;
    }
  }
}

if (failed) {
  console.error(`\n${failed} assertion(s) failed`);
  process.exitCode = 1;
} else {
  console.log("\nAll walkthrough assertions passed");
}
