#!/usr/bin/env node
/**
 * Scrape Ozwood flooring SKUs from the public WooCommerce site,
 * tag them for Demo-aligned personas, and write skill catalog files.
 *
 * Usage: node scripts/ozwood-scrape-products.mjs [--limit N] [--concurrency N]
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  retagProduct
} from "./lib/ozwood-product-tags.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SKILL_DATA = path.join(ROOT, ".cursor/skills/ozwood-product-recommender/data");
const SKILL_DIR = path.join(ROOT, ".cursor/skills/ozwood-product-recommender");

const SITEMAP = "https://ozwoodaustralia.com.au/product-sitemap.xml";
const UA = "OzwoodProductCatalogBot/1.0 (+local research; contact: local-dev)";
const DELAY_MS = 120;
const VERIFIED_AT = new Date().toISOString().slice(0, 10);

const args = process.argv.slice(2);
const limitIdx = args.indexOf("--limit");
const LIMIT = limitIdx >= 0 ? Number(args[limitIdx + 1]) : Infinity;
const concIdx = args.indexOf("--concurrency");
const CONCURRENCY = concIdx >= 0 ? Number(args[concIdx + 1]) : 4;

const EXCLUDE_CATS = new Set([
  "desk",
  "feature-wall",
  "flooring-acessories",
  "staircase",
  "engineer-timber-stair-case",
  "floating-timber-step",
  "laminate-stair-case",
  "solid-timber-stair-case",
  "vinyl-stair-case"
]);

const TYPE_RULES = [
  {
    type: "parquetry",
    cats: ["parquetry", "other-timber-surface"],
    title: /\b(parquetry|herringbone|chevron)\b/i
  },
  {
    type: "hybrid",
    cats: [
      "hybrid-floor",
      "hybridflooronsale",
      "hybrid-floor-on-sale",
      "5-5mm",
      "6-5mm",
      "8mm-7-series",
      "8mm-9-series"
    ],
    title: /\bhybrid\b/i
  },
  {
    type: "laminate",
    cats: [
      "laminate-floor",
      "barock-laminate",
      "oz-laminate",
      "waterproof-laminate",
      "laminate-floor-on-sale",
      "oak-12mm"
    ],
    title: /\blaminate\b/i
  },
  {
    type: "engineered",
    cats: [
      "engineered-floor",
      "engineer-floor-on-sale",
      "herringbone",
      "oak-2mm",
      "oak-3mm",
      "oak-4mm",
      "oak-6mm",
      "premium-native-exotic-hardwood-14mm",
      "american-walnut"
    ],
    title: /\b(engineered?|engineer)\b/i
  },
  {
    type: "solid",
    cats: [
      "solid-timber",
      "solid-timber-blackbutt",
      "solid-timber-other",
      "solid-timber-spotted-gum",
      "solid-timber-on-sale"
    ],
    title: /\bsolid\b/i
  }
];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function decodeEntities(s = "") {
  return s
    .replace(/&#36;/g, "$")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .trim();
}

function stripTags(html = "") {
  return decodeEntities(html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

function slugFromUrl(url) {
  const m = url.match(/\/product\/([^/]+)\/?$/);
  return m ? m[1] : url;
}

function normalizeKey(slug, code) {
  if (code) return code.toUpperCase().replace(/\s+/g, "");
  return slug
    .toLowerCase()
    .replace(/-on-sale.*$/, "")
    .replace(/-copy$/, "")
    .replace(/-\d+(\-\d+)?-m2$/, "")
    .replace(/-copy-\d+$/, "");
}

async function fetchText(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "text/html,application/xml" }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

async function listProductUrls() {
  const xml = await fetchText(SITEMAP);
  const urls = [...xml.matchAll(/<loc>(https:\/\/ozwoodaustralia\.com\.au\/product\/[^<]+)<\/loc>/g)].map(
    (m) => m[1]
  );
  return [...new Set(urls)];
}

function extractCats(html) {
  const fromClass = [...html.matchAll(/product_cat-([a-z0-9\-]+)/g)].map((m) => m[1]);
  return [...new Set(fromClass)];
}

function extractTitle(html) {
  const h1 = html.match(/<h1[^>]*class="[^"]*product_title[^"]*"[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1) return stripTags(h1[1]);
  const og = html.match(/property="og:title"\s+content="([^"]+)"/i);
  if (og) return decodeEntities(og[1]);
  const t = html.match(/<title>([^<]+)/i);
  return t ? decodeEntities(t[1].replace(/\s*-\s*Ozwood.*$/i, "")) : "";
}

function extractImage(html) {
  const og = html.match(/property="og:image"\s+content="([^"]+)"/i);
  return og ? decodeEntities(og[1]) : null;
}

function extractPrices(html) {
  const block = html.match(
    /<p class="price product-page-price[^"]*"[^>]*>([\s\S]*?)<\/p>/i
  );
  if (!block) return { price: null, originalPrice: null, onSale: false };
  const chunk = block[1];
  const amounts = [...chunk.matchAll(/woocommerce-Price-amount[\s\S]*?<bdi>[\s\S]*?<\/span>([\d,.]+)/gi)].map(
    (m) => Number(m[1].replace(/,/g, ""))
  );
  const onSale = /price-on-sale|<del/i.test(chunk);
  if (!amounts.length) return { price: null, originalPrice: null, onSale };
  if (onSale && amounts.length >= 2) {
    return { price: amounts[1], originalPrice: amounts[0], onSale: true };
  }
  return { price: amounts[0], originalPrice: null, onSale };
}

function extractAttrTable(html) {
  const attrs = {};
  for (const m of html.matchAll(
    /woocommerce-product-attributes-item--attribute_([a-z0-9\-]+)[\s\S]*?__label[^>]*>([\s\S]*?)<\/th>[\s\S]*?__value[^>]*>\s*(?:<p>)?([\s\S]*?)(?:<\/p>)?\s*<\/td>/gi
  )) {
    const key = stripTags(m[2]).toLowerCase().replace(/\s+/g, " ").trim();
    const val = stripTags(m[3]);
    if (key && val) attrs[key] = val;
  }
  // short-description strong table
  for (const m of html.matchAll(
    /<tr>\s*<td[^>]*>[\s\S]*?<strong>([^<]+)<\/strong>[\s\S]*?<\/td>\s*<td[^>]*>[\s\S]*?<strong>([^<]+)<\/strong>/gi
  )) {
    const key = decodeEntities(m[1]).toLowerCase().replace(/\s+/g, " ").trim();
    const val = decodeEntities(m[2]).trim();
    if (key && val && !attrs[key]) attrs[key] = val;
  }
  return attrs;
}

function pickAttr(attrs, names) {
  for (const n of names) {
    if (attrs[n]) return attrs[n];
  }
  // fuzzy
  for (const [k, v] of Object.entries(attrs)) {
    for (const n of names) {
      if (k.includes(n)) return v;
    }
  }
  return null;
}

function parseThickness(spec) {
  if (!spec) return null;
  // Prefer LxWxH style dims; thickness is the smallest axis
  const dims = spec.match(/(\d+(?:\.\d+)?)\s*[x×*]\s*(\d+(?:\.\d+)?)\s*[x×*]\s*(\d+(?:\.\d+)?)/i);
  if (dims) {
    const nums = [Number(dims[1]), Number(dims[2]), Number(dims[3])].sort((a, b) => a - b);
    return nums[0];
  }
  const m = spec.match(/(\d+(?:\.\d+)?)\s*mm/i);
  if (m) return Number(m[1]);
  return null;
}

function classifyType(cats, title, nameBlob) {
  if (cats.some((c) => EXCLUDE_CATS.has(c))) return null;
  const blob = `${title} ${nameBlob}`.toLowerCase();
  if (/\b(stair|tread|feature wall|skirting|accessory|accessories|desk)\b/.test(blob)) {
    // allow "stair" only if clearly flooring? usually exclude
    if (/\b(stair|tread|feature wall|skirting|desk)\b/.test(blob)) return null;
  }

  // Herringbone under engineered category → still engineered, style tagged later.
  // Parquetry category wins when present.
  for (const rule of TYPE_RULES) {
    if (cats.some((c) => rule.cats.includes(c))) return rule.type;
  }
  for (const rule of TYPE_RULES) {
    if (rule.title.test(title)) return rule.type;
  }
  // oak-12mm without laminate word
  if (cats.includes("oak-12mm")) return "laminate";
  return null;
}

function inferSeries(cats, title) {
  if (cats.includes("8mm-7-series") || /\bov7\d{2}\b/i.test(title)) return "Barock Hybrid 7-series";
  if (cats.includes("8mm-9-series") || /\bov9\d{2}\b/i.test(title)) return "Barock Hybrid 9-series";
  if (cats.includes("6-5mm")) return "Hybrid 6.5mm";
  if (cats.includes("5-5mm")) return "Hybrid 5.5mm";
  if (cats.includes("barock-laminate")) return "Barock Laminate";
  if (cats.includes("oz-laminate")) return "OZ Laminate";
  if (cats.includes("waterproof-laminate")) return "Waterproof Laminate";
  if (cats.includes("herringbone") || /herringbone/i.test(title)) return "Herringbone";
  if (cats.includes("premium-native-exotic-hardwood-14mm")) return "Premium Native & Exotic Hardwood 14mm";
  if (cats.some((c) => c.startsWith("oak-") && c.endsWith("mm"))) {
    const oak = cats.find((c) => /^oak-\dmm$/.test(c));
    if (oak) return `Engineered Oak ${oak.replace("oak-", "").toUpperCase()}`;
  }
  return null;
}

function parseProduct(url, html) {
  const id = slugFromUrl(url);
  const categories = extractCats(html);
  const title = extractTitle(html);
  const type = classifyType(categories, title, id);
  if (!type) return null;

  const attrs = extractAttrTable(html);
  const { price, originalPrice, onSale } = extractPrices(html);
  const code =
    pickAttr(attrs, ["product code", "code", "sku"]) ||
    (title.match(/\b(OV\d{3}|OZ\d{4}|BF\d{4}|BBT\d{2,4}(?:-\d+)?|OAK\s*\d{3,4}|12M\d{2})\b/i) ||
      [])[1] ||
    (title.match(/^([A-Z]?\d{2,5}[A-Z]?)\b/) || [])[1] ||
    (title.match(/\b([A-Z]{1,3}\d{2,5}(?:-\d+)?)\b/) || [])[1] ||
    null;

  const specification = pickAttr(attrs, ["specification", "spec"]);
  const wearLayer = pickAttr(attrs, ["wear layer"]);
  const perPackage = pickAttr(attrs, ["per package"]);
  const weight = pickAttr(attrs, ["weight"]);
  const emission = pickAttr(attrs, ["emission", "emission level"]);
  const abrasion = pickAttr(attrs, ["abrasion"]);
  const wetSwelling = pickAttr(attrs, ["wet swelling", "water"]);

  const product = {
    id,
    name: title,
    code: code ? String(code).replace(/\s+/g, " ").trim() : null,
    type,
    series: inferSeries(categories, title),
    source: url,
    image: extractImage(html),
    verifiedAt: VERIFIED_AT,
    specification,
    thickness: parseThickness(specification),
    wearLayer,
    perPackage,
    weight,
    emission,
    abrasion,
    wetSwelling,
    profile: null,
    price,
    originalPrice,
    onSale,
    priceNote: price != null ? "官网产品页参考价，需确认当前库存与活动" : "需向 Ozwood 获取当前报价",
    priceVolatile: true,
    shortDescription: Object.entries(attrs)
      .map(([k, v]) => `${k}: ${v}`)
      .join(" · ")
      .slice(0, 400),
    categories,
    dedupeKey: normalizeKey(id, code)
  };

  const tagged = retagProduct(product);
  return tagged;
}

async function mapPool(items, concurrency, fn) {
  const results = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await fn(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return results;
}

function dedupeProducts(products) {
  const map = new Map();
  for (const p of products) {
    const key = p.dedupeKey || p.id;
    const prev = map.get(key);
    if (!prev || p.completeness > prev.completeness) map.set(key, p);
  }
  return [...map.values()].sort((a, b) => {
    if (a.type !== b.type) return a.type.localeCompare(b.type);
    return a.name.localeCompare(b.name);
  });
}

function validateProducts(products) {
  const errors = [];
  const codes = new Map();
  const allowedTypes = new Set(["laminate", "hybrid", "engineered", "solid", "parquetry"]);
  const enums = {
    space: new Set(["house", "apartment", "commercial"]),
    room: new Set(["living", "bedroom", "study", "whole"]),
    lighting: new Set(["bright", "medium", "dim"]),
    style: new Set(["light", "warm", "australian", "herringbone", "cool"]),
    household: new Set(["kids", "pregnant", "elderly", "pets", "mixed", "none"]),
    lifestyle: new Set(["kids-pets", "heavy", "quiet", "rental"]),
    moisture: new Set(["waterproof", "occasional", "dry"]),
    budget: new Set(["under35", "35-55", "55plus", "quote"])
  };

  for (const p of products) {
    if (!p.source) errors.push(`${p.id}: missing source`);
    if (!allowedTypes.has(p.type)) errors.push(`${p.id}: bad type ${p.type}`);
    if (!p.fit) errors.push(`${p.id}: missing fit`);
    else {
      for (const [field, set] of Object.entries(enums)) {
        const val = p.fit[field];
        if (field === "moisture" || field === "budget") {
          if (!set.has(val)) errors.push(`${p.id}: bad fit.${field}=${val}`);
        } else if (!Array.isArray(val) || !val.length || val.some((v) => !set.has(v))) {
          errors.push(`${p.id}: bad fit.${field}=${JSON.stringify(val)}`);
        }
      }
    }
    if (p.code) {
      const k = p.code.toUpperCase();
      if (codes.has(k) && codes.get(k) !== p.id) {
        errors.push(`duplicate code ${p.code}: ${codes.get(k)} vs ${p.id}`);
      }
      codes.set(k, p.id);
    }
  }
  return errors;
}

function summarizeByType(products) {
  const by = {};
  for (const p of products) {
    by[p.type] ||= [];
    by[p.type].push(p);
  }
  return by;
}

function renderCatalogMarkdown(products) {
  const by = summarizeByType(products);
  const order = ["hybrid", "laminate", "engineered", "solid", "parquetry"];
  const lines = [
    "# Ozwood flooring catalog (by type)",
    "",
    `Verified against public product pages on ${VERIFIED_AT}. Prices are volatile — confirm before quoting.`,
    "",
    `Total SKUs after flooring filter + dedupe: **${products.length}**.`,
    ""
  ];
  for (const type of order) {
    const list = by[type] || [];
    lines.push(`## ${type} (${list.length})`, "");
    for (const p of list) {
      const price =
        p.price != null ? `AU$${p.price}/m²${p.onSale && p.originalPrice ? ` (was ${p.originalPrice})` : ""}` : "quote";
      lines.push(
        `### ${p.name}`,
        "",
        `- code: ${p.code || "—"}`,
        `- series: ${p.series || "—"}`,
        `- tone: ${p.tone}`,
        `- spec: ${p.specification || "—"}`,
        `- price: ${price} _(volatile)_`,
        `- moisture fit: ${p.fit.moisture}`,
        `- budget fit: ${p.fit.budget}`,
        `- styles: ${p.fit.style.join(", ")}`,
        `- personaHints: ${p.personaHints.join(" · ") || "—"}`,
        `- traits: ${p.traits.join(", ") || "—"}`,
        `- source: ${p.source}`,
        ""
      );
    }
  }
  return lines.join("\n");
}

async function main() {
  await fs.mkdir(SKILL_DATA, { recursive: true });
  console.log("Fetching sitemap…");
  let urls = await listProductUrls();
  console.log(`Sitemap products: ${urls.length}`);
  if (Number.isFinite(LIMIT)) urls = urls.slice(0, LIMIT);

  const raw = [];
  const skipped = [];
  let done = 0;

  await mapPool(urls, CONCURRENCY, async (url) => {
    try {
      await sleep(DELAY_MS);
      const html = await fetchText(url);
      const parsed = parseProduct(url, html);
      if (!parsed) {
        skipped.push({ url, reason: "excluded-or-unclassified" });
      } else {
        raw.push(parsed);
      }
    } catch (err) {
      skipped.push({ url, reason: String(err.message || err) });
    }
    done += 1;
    if (done % 20 === 0 || done === urls.length) {
      console.log(`Progress ${done}/${urls.length} (kept ${raw.length}, skipped ${skipped.length})`);
    }
  });

  const products = dedupeProducts(raw);
  const errors = validateProducts(products);
  const byType = Object.fromEntries(
    Object.entries(summarizeByType(products)).map(([k, v]) => [k, v.length])
  );

  const rawOut = {
    scrapedAt: new Date().toISOString(),
    sourceSitemap: SITEMAP,
    fetched: urls.length,
    parsed: raw.length,
    skipped: skipped.length,
    afterDedupe: products.length,
    byType,
    products: raw,
    skippedSamples: skipped.slice(0, 50)
  };

  const cleanOut = {
    verifiedAt: VERIFIED_AT,
    source: "https://ozwoodaustralia.com.au/",
    scope: ["laminate", "hybrid", "engineered", "solid", "parquetry"],
    count: products.length,
    byType,
    validationErrors: errors,
    products: products.map(({ completeness, dedupeKey, ...rest }) => rest)
  };

  await fs.writeFile(path.join(SKILL_DATA, "products.raw.json"), JSON.stringify(rawOut, null, 2));
  await fs.writeFile(path.join(SKILL_DATA, "products.json"), JSON.stringify(cleanOut, null, 2));
  await fs.writeFile(path.join(SKILL_DIR, "catalog-by-type.md"), renderCatalogMarkdown(products));

  const report = {
    verifiedAt: VERIFIED_AT,
    count: products.length,
    byType,
    withPrice: products.filter((p) => p.price != null).length,
    withoutPrice: products.filter((p) => p.price == null).length,
    moisture: products.reduce((acc, p) => {
      acc[p.fit.moisture] = (acc[p.fit.moisture] || 0) + 1;
      return acc;
    }, {}),
    budget: products.reduce((acc, p) => {
      acc[p.fit.budget] = (acc[p.fit.budget] || 0) + 1;
      return acc;
    }, {}),
    personaHintFreq: products
      .flatMap((p) => p.personaHints)
      .reduce((acc, h) => {
        acc[h] = (acc[h] || 0) + 1;
        return acc;
      }, {}),
    validationErrors: errors,
    skippedCount: skipped.length
  };
  await fs.writeFile(path.join(SKILL_DATA, "coverage-report.json"), JSON.stringify(report, null, 2));

  console.log(JSON.stringify(report, null, 2));
  if (errors.length) {
    console.error(`Validation warnings: ${errors.length}`);
    for (const e of errors.slice(0, 20)) console.error(" -", e);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
