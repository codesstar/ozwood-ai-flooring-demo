#!/usr/bin/env node
/**
 * Build Demo catalog from the tagged Skill products.json.
 * Output: ozwood-catalog.js (window.OZWOOD_CATALOG)
 *
 * Usage: node scripts/ozwood-build-demo-catalog.mjs
 */
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const INPUT = path.join(
  ROOT,
  ".cursor/skills/ozwood-product-recommender/data/products.json"
);
const OUTPUT = path.join(ROOT, "ozwood-catalog.js");
const ROOMS_DIR = path.join(ROOT, "assets/ozwood/rooms");

function hasRoomSceneFiles(key) {
  // Treat as scene-ready if living exists (bedroom/study may still be generating)
  return existsSync(path.join(ROOMS_DIR, `living-${key}.jpg`));
}

const TYPE_ZH = {
  hybrid: "混合地板",
  laminate: "强化地板",
  engineered: "工程木地板",
  solid: "实木地板",
  parquetry: "拼花地板"
};

const TYPE_DEFAULTS = {
  hybrid: { installationRate: 30, waste: 0.08, install: "楼板需干燥、清洁、平整，并按产品要求保留伸缩缝、地垫与周边密封。", care: "定期吸尘与微湿拖地；避免磨蚀性清洁剂；遵循产品保养说明。" },
  laminate: { installationRate: 30, waste: 0.08, install: "检查基层平整度与含水率，使用指定地垫，正确错缝并保留伸缩缝。", care: "经常吸尘，微湿拖布清洁，避免蒸汽拖把，及时处理水渍。" },
  engineered: { installationRate: 45, waste: 0.10, install: "检测基层含水率与平整度后，由安装人员确定胶粘或悬浮方式、伸缩缝与材料适应时间。", care: "定期清除砂粒，使用微湿拖布与木地板清洁剂，避免地面积水。" },
  solid: { installationRate: 55, waste: 0.12, install: "实木对基层与含水率更敏感；安装前确认现场条件、批次色差与伸缩预留。", care: "入口用地垫，家具脚加保护垫，低水分清洁，并遵循表面工艺养护说明。" },
  parquetry: { installationRate: 75, waste: 0.15, install: "专业放线很关键；确认视觉中心轴、周边切割、过渡收口、胶粘系统与额外损耗后再报价。", care: "避免砂粒与家具拖动损伤；按工程木低水分方式日常养护。" }
};

/** Catalog id → Demo legacy key (keeps existing room renders). */
const LEGACY_BY_ID = {
  "oak-5106-france-78-m2": "european-oak",
  "hybrid-grey-oak": "hybrid-grey",
  "engineered-oak-herringbone-4301": "herringbone",
  "oz2618-bordeaux-oak": "white-oak",
  "bfl8002-white-oak": "white-oak",
  "sg1833-190-spotted-gum": "spotted-gum",
  "australian-spotted-gum-sg1443-185": "spotted-gum",
  "engineer-timber-new-spotted-gum": "spotted-gum"
};

const LEGACY_ENRICH = {
  "european-oak": {
    name: "欧洲橡木 5106",
    shortName: "欧洲橡木",
    code: "OAK 5106",
    type: "工程木地板",
    tone: "温暖原木",
    officialImage: "assets/ozwood/official/product-european-oak.jpg",
    hasRoomScene: true,
    price: 49,
    originalPrice: 68,
    story: "一款平衡度很高的木地板：表层保留真实橡木的天然质感，多层结构则帮助它更稳定地应对季节变化。",
    why: "它能带来真实橡木的温度，又不会让空间过黄或过暗。当需求是“自然、安静、耐看”时，它是很稳妥的综合选择。"
  },
  "hybrid-grey": {
    name: "灰橡混合地板",
    shortName: "冷灰橡木",
    code: "HYBRID GREY OAK",
    type: "6.5 mm 混合地板",
    tone: "冷灰现代",
    officialImage: "assets/ozwood/official/product-hybrid-grey.jpg",
    hasRoomScene: true,
    price: 19.8,
    originalPrice: 43,
    story: "混合地板将木纹表面与防水、耐磨结构结合起来。当生活便利性比天然木材的真实性更重要时，它非常实用。",
    why: "面对水渍、宠物、高频使用和较紧的材料预算，它是最稳妥的演示推荐；安静的冷灰色也适合现代空间。"
  },
  herringbone: {
    name: "工程橡木人字拼 4301",
    shortName: "橡木人字拼",
    code: "OAK 4301",
    type: "工程木拼花地板",
    tone: "烟熏建筑感",
    officialImage: "assets/ozwood/official/product-herringbone.jpg",
    hasRoomScene: true,
    story: "人字拼把传统欧洲拼花和现代澳洲室内设计连接起来，能够为空间增加方向、层次与手工铺装的焦点感。",
    why: "当地面需要成为建筑设计的一部分，而不是一块中性的背景时，就应该优先考虑它。"
  },
  "white-oak": {
    name: "OZ2628 白橡木",
    shortName: "白橡木",
    code: "OZ2628",
    type: "12 mm 强化地板",
    tone: "明亮通透",
    officialImage: "assets/ozwood/official/product-white-oak.jpg",
    hasRoomScene: true,
    price: 28.8,
    story: "OZ 强化地板系列希望用快速锁扣安装和日常耐用性，以更实际的成本实现接近木材的视觉效果。",
    why: "它能让较暗或较小的空间显得更开阔，同时控制材料预算，又不会完全失去温暖的木质表达。"
  },
  "spotted-gum": {
    name: "澳洲斑纹桉 SG1443-185",
    shortName: "澳洲斑纹桉",
    code: "SG1443-185",
    type: "澳洲硬木工程地板",
    tone: "浓郁澳洲木色",
    officialImage: "assets/ozwood/official/product-spotted-gum.jpg",
    hasRoomScene: true,
    story: "Ozwood 的官网故事讲述了他们如何通过澳洲住宅重新认识 Spotted Gum：绿色、灰色与蜂蜜色的变化，加上本土性格、硬度和稳定性，让它成为长期受欢迎的选择。",
    why: "如果客户希望地板一眼就有澳洲木材的辨识度，接受明显木纹与颜色变化，而不是追求完全均一的表面，它会是最有说服力的推荐。"
  }
};

function shortNameFrom(name) {
  const cleaned = String(name || "")
    .replace(/\s*[–—-]\s*.*$/, "")
    .replace(/\bFlooring\b/gi, "")
    .replace(/\bHybrid\b/gi, "")
    .replace(/\bLaminate\b/gi, "")
    .replace(/\bEngineered?\b/gi, "")
    .replace(/\bSolid Timber\b/gi, "")
    .replace(/\bBarock\b/gi, "")
    .trim();
  return cleaned.slice(0, 28) || name.slice(0, 28);
}

function tagsFrom(p) {
  const tags = [];
  if (p.traits?.includes("waterproof")) tags.push("防水");
  if (p.traits?.includes("ac4")) tags.push("AC4 耐磨");
  if (p.traits?.includes("e0")) tags.push("E0");
  if (p.traits?.includes("real-timber-surface")) tags.push("真实木质感");
  if (p.traits?.includes("click-lock")) tags.push("锁扣快装");
  if (p.fit?.style?.includes("australian")) tags.push("澳洲木材个性");
  if (p.fit?.style?.includes("herringbone")) tags.push("人字拼");
  if (p.fit?.budget === "under35") tags.push("价格友好");
  return [...new Set(tags)].slice(0, 4);
}

function mapProduct(raw) {
  const legacyKey = LEGACY_BY_ID[raw.id];
  const key = legacyKey || raw.id;
  const defaults = TYPE_DEFAULTS[raw.type] || TYPE_DEFAULTS.engineered;
  const enrich = legacyKey ? LEGACY_ENRICH[legacyKey] : null;

  const product = {
    key,
    catalogId: raw.id,
    code: enrich?.code || raw.code || raw.id.toUpperCase().slice(0, 16),
    name: enrich?.name || raw.name,
    shortName: enrich?.shortName || shortNameFrom(raw.name),
    type: enrich?.type || TYPE_ZH[raw.type] || raw.type,
    typeKey: raw.type,
    tone: enrich?.tone || raw.tone || "自然木色",
    price: enrich?.price !== undefined ? enrich.price : raw.price,
    originalPrice: enrich?.originalPrice !== undefined ? enrich.originalPrice : raw.originalPrice,
    priceNote: raw.priceNote || (raw.price != null ? "官网产品页参考，需确认当前价格" : "需向 Ozwood 获取当前报价"),
    specification: raw.specification || "以官网产品页为准",
    pack: raw.perPackage || "需确认包装规格",
    profile: [raw.emission, raw.abrasion, raw.wetSwelling].filter(Boolean).join(" · ") || TYPE_ZH[raw.type],
    installationRate: defaults.installationRate,
    waste: defaults.waste,
    tags: tagsFrom(raw),
    bestFor: raw.bestFor?.length ? raw.bestFor : ["与生活方式匹配的家庭空间"],
    avoid: raw.avoid || "安装前应确认现场条件与产品技术资料。",
    story: enrich?.story || `${raw.name} 来自 Ozwood 官网目录（${TYPE_ZH[raw.type]}）。色调与性能标签由公开规格与品类特征归纳，具体以产品页为准。`,
    why: enrich?.why || (raw.personaHints?.length
      ? `更契合「${raw.personaHints.slice(0, 3).join("、")}」这类需求；选择前建议结合样板与现场条件确认。`
      : "请结合空间、防潮、预算与风格综合比较，并以官网资料与展厅实物为准。"),
    install: defaults.install,
    care: defaults.care,
    officialImage: enrich?.officialImage || raw.image || "assets/ozwood/official/ozwood-logo.png",
    source: raw.source,
    hasRoomScene: Boolean(enrich?.hasRoomScene) || hasRoomSceneFiles(key),
    fit: raw.fit,
    traits: raw.traits || [],
    personaHints: raw.personaHints || [],
    series: raw.series || null,
    styleSource: raw.styleSource || null,
    tagQuality: raw.tagQuality || null,
    verifiedAt: raw.verifiedAt || null
  };
  return product;
}

const data = JSON.parse(await fs.readFile(INPUT, "utf8"));
const mapped = data.products.map(mapProduct);

// Dedupe by Demo key — prefer legacy-enriched / higher completeness (has price, hasRoomScene)
const byKey = new Map();
for (const p of mapped) {
  const prev = byKey.get(p.key);
  if (!prev) {
    byKey.set(p.key, p);
    continue;
  }
  const score = (x) => (x.hasRoomScene ? 10 : 0) + (x.price != null ? 2 : 0) + (x.code ? 1 : 0);
  if (score(p) > score(prev)) byKey.set(p.key, p);
}

const products = [...byKey.values()].sort((a, b) => {
  const order = ["hybrid", "laminate", "engineered", "solid", "parquetry"];
  const ta = order.indexOf(a.typeKey);
  const tb = order.indexOf(b.typeKey);
  if (ta !== tb) return ta - tb;
  return a.name.localeCompare(b.name);
});

const byType = products.reduce((acc, p) => {
  acc[p.typeKey] = (acc[p.typeKey] || 0) + 1;
  return acc;
}, {});

const payload = {
  verifiedAt: data.verifiedAt,
  source: data.source,
  count: products.length,
  byType,
  typeLabels: {
    all: "全部",
    hybrid: "混合",
    laminate: "强化",
    engineered: "工程木",
    solid: "实木",
    parquetry: "拼花"
  },
  products
};

const file = `/* Auto-generated by scripts/ozwood-build-demo-catalog.mjs — do not edit by hand */
window.OZWOOD_CATALOG = ${JSON.stringify(payload, null, 2)};
`;

await fs.writeFile(OUTPUT, file);
console.log(JSON.stringify({ out: OUTPUT, count: products.length, byType, roomScenes: products.filter((p) => p.hasRoomScene).map((p) => p.key) }, null, 2));
