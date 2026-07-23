#!/usr/bin/env node
/**
 * Validate Ozwood product catalog used by ozwood-product-recommender skill.
 * Usage: node scripts/ozwood-validate-products.mjs
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CATALOG = path.join(
  ROOT,
  ".cursor/skills/ozwood-product-recommender/data/products.json"
);

const ALLOWED_TYPES = new Set(["laminate", "hybrid", "engineered", "solid", "parquetry"]);
const ENUMS = {
  space: new Set(["house", "apartment", "commercial"]),
  room: new Set(["living", "bedroom", "study", "whole"]),
  lighting: new Set(["bright", "medium", "dim"]),
  style: new Set(["light", "warm", "australian", "herringbone", "cool"]),
  household: new Set(["kids", "pregnant", "elderly", "pets", "mixed", "none"]),
  lifestyle: new Set(["kids-pets", "heavy", "quiet", "rental"]),
  moisture: new Set(["waterproof", "occasional", "dry"]),
  budget: new Set(["under35", "35-55", "55plus", "quote"])
};

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  process.exitCode = 1;
}

const data = JSON.parse(await fs.readFile(CATALOG, "utf8"));
const products = data.products || [];

if (!products.length) fail("catalog is empty");
if (!data.verifiedAt) fail("missing verifiedAt");

const byType = {};
const codes = new Map();
const hintFreq = {};
let allFourRooms = 0;

for (const p of products) {
  if (!p.id) fail("product missing id");
  if (!p.source || !/^https:\/\/ozwoodaustralia\.com\.au\/product\//.test(p.source)) {
    fail(`${p.id}: invalid source`);
  }
  if (!ALLOWED_TYPES.has(p.type)) fail(`${p.id}: invalid type ${p.type}`);
  byType[p.type] = (byType[p.type] || 0) + 1;

  if (!p.fit) fail(`${p.id}: missing fit`);
  else {
    for (const [field, set] of Object.entries(ENUMS)) {
      const val = p.fit[field];
      if (field === "moisture" || field === "budget") {
        if (!set.has(val)) fail(`${p.id}: bad fit.${field}=${val}`);
      } else if (!Array.isArray(val) || !val.length || val.some((v) => !set.has(v))) {
        fail(`${p.id}: bad fit.${field}`);
      }
    }
    // Narrow-tag checks: waterproof boards should not dump every lifestyle
    if (p.fit.moisture === "waterproof" && (p.fit.lifestyle || []).length >= 4) {
      fail(`${p.id}: waterproof lifestyle tags too wide (${p.fit.lifestyle.join(",")})`);
    }
    if ((p.fit.room || []).length >= 4) allFourRooms += 1;
  }

  if (!Array.isArray(p.traits)) fail(`${p.id}: traits must be array`);
  if (!Array.isArray(p.personaHints)) fail(`${p.id}: personaHints must be array`);
  if (!Array.isArray(p.bestFor) || !p.bestFor.length) fail(`${p.id}: bestFor required`);
  if (!p.avoid) fail(`${p.id}: avoid required`);

  for (const h of p.personaHints || []) hintFreq[h] = (hintFreq[h] || 0) + 1;

  if (p.code) {
    const k = String(p.code).toUpperCase().replace(/\s+/g, "");
    if (codes.has(k) && codes.get(k) !== p.id) {
      fail(`duplicate code ${p.code}: ${codes.get(k)} vs ${p.id}`);
    }
    codes.set(k, p.id);
  }
}

// Too many "all rooms" tags means room slot cannot differentiate
if (allFourRooms > products.length * 0.55) {
  fail(`too many products tagged with all four rooms (${allFourRooms}/${products.length})`);
}

for (const t of ALLOWED_TYPES) {
  if (!byType[t]) fail(`missing coverage for type ${t}`);
}

// Persona distribution should not collapse to a single hint
const hintValues = Object.values(hintFreq);
if (hintValues.length && Math.max(...hintValues) === products.length) {
  fail("every product shares the same personaHint — tagging too uniform");
}

console.log(
  JSON.stringify(
    {
      ok: process.exitCode !== 1,
      count: products.length,
      byType,
      withPrice: products.filter((p) => p.price != null).length,
      budgetBands: products.reduce((acc, p) => {
        acc[p.fit.budget] = (acc[p.fit.budget] || 0) + 1;
        return acc;
      }, {}),
      allFourRooms,
      hintFreq,
      verifiedAt: data.verifiedAt
    },
    null,
    2
  )
);

if (process.exitCode === 1) process.exit(1);
