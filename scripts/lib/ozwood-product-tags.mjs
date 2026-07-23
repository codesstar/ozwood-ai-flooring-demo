/**
 * Shared Ozwood product tagging + persona fit scoring.
 * Tag dimensions align 1:1 with Demo / personas.md profile slots.
 */

export const AUSTRALIAN_SPECIES =
  /\b(spotted\s*gum|blackbutt|jarrah|marri|sydney\s*blue\s*gum|ironbark|tallowwood|brushbox|stringybark|grey\s*ironbark|red\s*ironbark|tasmanian\s*oak|blue\s*gum)\b/i;

export const COOL_LIGHT =
  /\b(grey|gray|white|champagne|pearl|smoke|ash|silver|pebble|cool|lime\s*wash|moonlight|heritage\s*grey|light\s*grey|finer\s*light)\b/i;

export const WARM =
  /\b(oak|natural|honey|walnut|hickory|cherry|teak|padauk|bordeaux|warm|brown|chardonnay|cardamon|toffee|chestnut|mahogany|jarrah|rosewood)\b/i;

export const PERSONA_SLOTS = {
  space: ["house", "apartment", "commercial"],
  room: ["living", "bedroom", "study", "whole"],
  lighting: ["bright", "medium", "dim"],
  style: ["light", "warm", "australian", "herringbone", "cool"],
  household: ["kids", "pregnant", "elderly", "pets", "mixed", "none"],
  lifestyle: ["kids-pets", "heavy", "quiet", "rental"],
  moisture: ["waterproof", "occasional", "dry"],
  budget: ["under35", "35-55", "55plus", "quote"]
};

/** Budget band when catalog has no price — guided by Ozwood type positioning. */
export function mapBudget(price, type) {
  if (price != null && !Number.isNaN(Number(price))) {
    const p = Number(price);
    if (p < 35) return "under35";
    if (p <= 55) return "35-55";
    return "55plus";
  }
  if (type === "laminate") return "under35";
  if (type === "hybrid") return "35-55";
  if (type === "engineered") return "55plus";
  return "quote"; // solid / parquetry
}

export function mapMoisture(type, wetSwelling, cats = []) {
  const wet = (wetSwelling || "").toLowerCase();
  if (/waterproof|100%\s*water/.test(wet) || type === "hybrid") return "waterproof";
  if (cats.includes("waterproof-laminate") || /water\s*proof/.test(wet)) return "waterproof";
  if (type === "laminate" || /resist|water/.test(wet)) return "occasional";
  return "dry";
}

/**
 * @returns {{ styles: string[], styleSource: "name"|"series"|"inferred" }}
 */
export function inferStyles(title, type, cats = []) {
  const styles = new Set();
  let styleSource = "inferred";

  if (type === "parquetry" || cats.includes("herringbone") || /herringbone|parquetry|chevron/i.test(title)) {
    styles.add("herringbone");
    styleSource = "name";
  }
  if (AUSTRALIAN_SPECIES.test(title)) {
    styles.add("australian");
    styleSource = "name";
  }
  if (COOL_LIGHT.test(title)) {
    styleSource = "name";
    if (/\b(grey|gray|smoke|ash|silver|cool|heritage\s*grey|moonlight|ironstone)\b/i.test(title)) {
      styles.add("cool");
    }
    if (/\b(white|champagne|pearl|light|lime\s*wash|pebble)\b/i.test(title)) {
      styles.add("light");
    }
    // grey-only names still count as cool; chalky greys may also brighten
    if (styles.has("cool") && !styles.has("light") && /\b(light|pearl|champagne|white)\b/i.test(title)) {
      styles.add("light");
    }
  }
  if (WARM.test(title) && !styles.has("cool") && !styles.has("light")) {
    styles.add("warm");
    if (styleSource !== "name") styleSource = "name";
  }

  if (!styles.size) {
    if (type === "hybrid" && /grey|gray/i.test(title)) {
      styles.add("cool");
      styleSource = "name";
    } else if (/\boak\b/i.test(title)) {
      styles.add("warm");
      styleSource = "inferred";
    } else if (type === "parquetry") {
      styles.add("herringbone");
      styleSource = "series";
    } else {
      styles.add("warm");
      styleSource = "inferred";
    }
  }

  return { styles: [...styles], styleSource };
}

export function inferTone(title, type) {
  if (AUSTRALIAN_SPECIES.test(title)) return "浓郁澳洲木色";
  if (/\b(herringbone|parquetry|chevron)\b/i.test(title)) return "拼花建筑感";
  if (/\b(grey|gray|smoke|ash|silver)\b/i.test(title)) return "冷灰现代";
  if (/\b(white|champagne|pearl|light)\b/i.test(title)) return "明亮通透";
  if (/\b(walnut|jarrah|padauk|dark|brown)\b/i.test(title)) return "深沉温暖";
  if (/\boak\b/i.test(title)) return "温暖原木";
  if (type === "solid" || type === "engineered") return "自然木色";
  return "中性木色";
}

export function buildTraits(product) {
  const traits = new Set();
  const { type, wetSwelling, abrasion, emission, categories = [], name } = product;
  if (type === "engineered" || type === "solid" || type === "parquetry") {
    traits.add("real-timber-surface");
  }
  if (type === "hybrid" || type === "laminate") traits.add("click-lock");
  if (/ac4/i.test(abrasion || "")) traits.add("ac4");
  if (/ac5/i.test(abrasion || "")) traits.add("ac5");
  if (/e0/i.test(emission || "")) traits.add("e0");
  const wet = (wetSwelling || "").toLowerCase();
  if (/waterproof/.test(wet) || type === "hybrid") traits.add("waterproof");
  else if (/water|resist/.test(wet) || type === "laminate") traits.add("water-resistant");
  if (type === "parquetry" || /herringbone|parquetry/i.test(name || "")) {
    traits.add("high-waste-pattern");
  }
  if (
    AUSTRALIAN_SPECIES.test(name || "") ||
    /colour variation|color variation|natural variation/i.test(name || "")
  ) {
    traits.add("strong-colour-variation");
  }
  if (categories.includes("waterproof-laminate")) {
    traits.add("waterproof");
    traits.delete("water-resistant");
  }
  return [...traits];
}

/**
 * Narrow persona-aligned fit tags (not "match everything").
 */
export function buildFit(product) {
  const { type, name, price, wetSwelling, categories = [], traits = [] } = product;
  const moisture = mapMoisture(type, wetSwelling, categories);
  const budget = mapBudget(price, type);
  const { styles, styleSource } = inferStyles(name, type, categories);

  const space = ["house"];
  if (type === "hybrid" || type === "laminate") space.push("apartment");
  if ((type === "hybrid" || type === "laminate") && (traits.includes("ac4") || traits.includes("ac5"))) {
    space.push("commercial");
  }

  let room;
  if (type === "parquetry" || styles.includes("herringbone")) {
    room = ["living"];
  } else if (moisture === "waterproof") {
    room = ["living", "whole"];
    if (type === "hybrid" || type === "laminate") room.push("bedroom");
  } else if (type === "solid") {
    room = ["living", "bedroom", "whole"];
  } else if (type === "engineered") {
    room = ["living", "bedroom", "study", "whole"];
  } else {
    // laminate occasional
    room = ["living", "bedroom", "whole"];
  }

  const lighting = [];
  if (styles.includes("light") || styles.includes("cool")) {
    lighting.push("dim", "medium");
    if (styles.includes("light")) lighting.push("bright");
  }
  if (styles.includes("warm") || styles.includes("australian")) {
    lighting.push("bright", "medium");
  }
  if (styles.includes("herringbone")) lighting.push("bright", "medium");
  if (!lighting.length) lighting.push("medium");

  // Narrow household / lifestyle
  let household = ["none"];
  let lifestyle = ["quiet"];

  if (moisture === "waterproof") {
    household = ["pets", "kids", "none"];
    lifestyle = ["kids-pets"];
    if (traits.includes("ac4") || traits.includes("ac5") || type === "hybrid") {
      lifestyle.push("heavy");
    }
    if (type === "hybrid" || type === "laminate") {
      if (budget === "under35" || budget === "35-55") lifestyle.push("rental");
    }
  } else if (type === "laminate") {
    household = ["kids", "none", "elderly"];
    lifestyle = ["heavy", "rental"];
  } else if (type === "parquetry") {
    household = ["none", "elderly"];
    lifestyle = ["quiet"];
  } else {
    // engineered / solid dry
    household = ["none", "elderly"];
    lifestyle = ["quiet"];
  }

  if (traits.includes("e0")) {
    if (!household.includes("pregnant")) household.push("pregnant");
    if (!household.includes("kids")) household.push("kids");
  }

  // mixed only when product clearly covers both kids and pets paths
  if (household.includes("kids") && household.includes("pets") && !household.includes("mixed")) {
    household.push("mixed");
  }

  return {
    space: [...new Set(space)],
    room: [...new Set(room)],
    lighting: [...new Set(lighting)],
    style: styles,
    household: [...new Set(household)],
    lifestyle: [...new Set(lifestyle)],
    moisture,
    budget,
    styleSource
  };
}

export function buildPersonaHints(fit, traits, type) {
  const hints = [];
  if (fit.style.includes("australian")) hints.push("澳洲硬木个性");
  if (fit.style.includes("herringbone")) hints.push("人字拼设计焦点");
  if (fit.style.includes("cool")) hints.push("冷灰现代空间");
  if (fit.style.includes("light")) hints.push("暗厅提亮");
  if (fit.moisture === "waterproof" && fit.household.some((h) => ["kids", "pets", "mixed"].includes(h))) {
    hints.push("有孩宠物家庭");
  }
  if (fit.budget === "under35") hints.push("预算优先公寓");
  if (fit.budget === "35-55") hints.push("性价比家庭优选");
  if ((fit.budget === "55plus" || fit.budget === "quote") && (type === "solid" || type === "engineered")) {
    hints.push("品质真实木感");
  }
  if (
    (type === "hybrid" || type === "laminate") &&
    (fit.budget === "under35" || (fit.budget === "35-55" && fit.moisture === "waterproof"))
  ) {
    hints.push("出租投资房");
  }
  if (traits.includes("e0") && (fit.household.includes("pregnant") || fit.household.includes("kids"))) {
    hints.push("低排放家庭关怀");
  }
  if (fit.space.includes("commercial") && (traits.includes("ac4") || traits.includes("ac5"))) {
    hints.push("商用耐磨");
  }
  return [...new Set(hints)].slice(0, 5);
}

export function buildBestForAvoid(fit, traits, type) {
  const bestFor = [];
  const avoid = [];

  if (fit.style.includes("light") || fit.style.includes("cool")) bestFor.push("采光一般或偏暗的空间");
  if (fit.style.includes("warm")) bestFor.push("温暖现代家庭客厅");
  if (fit.style.includes("australian")) bestFor.push("强调澳洲木材个性的住宅");
  if (fit.style.includes("herringbone")) bestFor.push("需要地面成为设计焦点的区域");
  if (fit.moisture === "waterproof") bestFor.push("孩子宠物高频、靠近厨房的干湿过渡区");
  if (fit.budget === "under35") bestFor.push("预算优先的公寓或出租房");
  if (type === "engineered") bestFor.push("希望真实木皮又要结构更稳定的全屋铺装");
  if (type === "solid") bestFor.push("独立屋干区、追求实木厚度与可翻新潜力的项目");
  if (!bestFor.length) bestFor.push("与色调和生活方式匹配的家庭干区");

  if (fit.moisture === "dry") {
    avoid.push("不建议把它直接理解为湿区地板；安装前应确认现场含水率与使用区域。");
  } else if (traits.includes("waterproof")) {
    avoid.push("防水不等于可长期积水；仍需确认湿区许可、周边密封与基层要求。");
  } else {
    avoid.push("防潮耐水不等于完全防水；持续积水区域需选择明确防水系列。");
  }
  if (traits.includes("high-waste-pattern")) {
    avoid.push("相比直铺会增加切割损耗与人工；中心线、边框和收口需要提前规划。");
  }
  if (traits.includes("strong-colour-variation")) {
    avoid.push("天然色差是特点而非缺陷；决定前应同时查看多块实物板。");
  }
  return { bestFor: bestFor.slice(0, 4), avoid: avoid[0] };
}

export function scoreCompleteness(p) {
  let s = 0;
  if (p.code) s += 3;
  if (p.specification) s += 2;
  if (p.price != null) s += 1;
  if (p.image) s += 1;
  if (p.emission) s += 1;
  if (p.abrasion) s += 1;
  if (p.wetSwelling) s += 1;
  if (!/on-sale|copy/i.test(p.id || "")) s += 2;
  if (p.fit?.styleSource === "name") s += 1;
  return s;
}

/** Recompute all persona tags on an existing catalog product. */
export function retagProduct(product) {
  const traits = buildTraits(product);
  const withTraits = { ...product, traits };
  const fitFull = buildFit(withTraits);
  const { styleSource, ...fit } = fitFull;
  const personaHints = buildPersonaHints(fit, traits, product.type);
  const { bestFor, avoid } = buildBestForAvoid(fit, traits, product.type);
  const tone = inferTone(product.name, product.type);
  const tagQuality =
    styleSource === "inferred" && fit.style.length === 1 && fit.style[0] === "warm"
      ? "needs-review"
      : "complete";

  return {
    ...product,
    traits,
    fit,
    styleSource,
    tagQuality,
    tone,
    toneInference: true,
    personaHints,
    bestFor,
    avoid,
    completeness: scoreCompleteness({ ...product, fit: { ...fit, styleSource } })
  };
}

// —— Scoring (sales recommender) ——

const BUDGET_ORDER = ["under35", "35-55", "55plus", "quote"];

function budgetDistance(userBudget, productBudget) {
  const normalize = (b) => (b === "quote" ? "55plus" : b);
  const a = BUDGET_ORDER.indexOf(normalize(userBudget));
  const b = BUDGET_ORDER.indexOf(normalize(productBudget));
  if (a < 0 || b < 0) return 99;
  return Math.abs(a - b);
}

function intersects(arr, value) {
  return Array.isArray(arr) && value != null && arr.includes(value);
}

/**
 * Score one product against a persona profile.
 * @returns {{ score: number, hardFail: boolean, hardReason: string|null, breakdown: object }}
 */
export function scoreProductAgainstProfile(product, profile = {}) {
  const fit = product.fit || {};
  const traits = product.traits || [];
  const type = product.type || product.typeKey;
  const breakdown = {};
  let score = 0;
  let hardFail = false;
  let hardReason = null;

  const needWaterproof = profile.moisture === "waterproof";
  if (needWaterproof && fit.moisture !== "waterproof" && !traits.includes("waterproof")) {
    hardFail = true;
    hardReason = "moisture";
    score -= 100;
  }

  if (profile.style === "herringbone") {
    const isHerring =
      intersects(fit.style, "herringbone") || type === "parquetry" || traits.includes("high-waste-pattern");
    if (!isHerring) {
      hardFail = true;
      hardReason = hardReason || "herringbone";
      score -= 40;
    }
  }

  if (
    profile.budget === "under35" &&
    product.price != null &&
    Number(product.price) >= 55
  ) {
    hardFail = true;
    hardReason = hardReason || "budget";
    score -= 30;
  }

  // moisture
  if (profile.moisture) {
    if (fit.moisture === profile.moisture) {
      breakdown.moisture = 20;
      score += 20;
    } else if (profile.moisture === "occasional" && fit.moisture === "waterproof") {
      breakdown.moisture = 12;
      score += 12;
    } else if (profile.moisture === "dry" && fit.moisture === "occasional") {
      breakdown.moisture = 4;
      score += 4;
    } else if (profile.moisture === "dry" && fit.moisture === "waterproof") {
      breakdown.moisture = 0;
    } else if (!hardFail) {
      breakdown.moisture = -8;
      score -= 8;
    }
  }

  // budget
  if (profile.budget && fit.budget) {
    if (fit.budget === profile.budget) {
      breakdown.budget = 15;
      score += 15;
    } else {
      const dist = budgetDistance(profile.budget, fit.budget);
      if (dist === 1) {
        breakdown.budget = 6;
        score += 6;
      } else if (dist === 2) {
        breakdown.budget = -8;
        score -= 8;
      } else if (profile.budget === "quote" && (fit.budget === "55plus" || fit.budget === "quote")) {
        breakdown.budget = 10;
        score += 10;
      } else if (profile.budget === "55plus" && fit.budget === "quote") {
        breakdown.budget = 12;
        score += 12;
      } else {
        breakdown.budget = 0;
      }
    }
  }

  // style
  if (profile.style) {
    if (intersects(fit.style, profile.style)) {
      const pts = profile.style === "herringbone" ? 18 : 15;
      // inferred warm-only gets half credit
      if (
        product.styleSource === "inferred" &&
        profile.style === "warm" &&
        fit.style.length === 1 &&
        fit.style[0] === "warm"
      ) {
        breakdown.style = Math.round(pts / 2);
        score += breakdown.style;
      } else {
        breakdown.style = pts;
        score += pts;
      }
    } else if (profile.style === "light" && intersects(fit.style, "cool")) {
      breakdown.style = 8;
      score += 8;
    } else if (profile.style === "cool" && intersects(fit.style, "light")) {
      breakdown.style = 8;
      score += 8;
    } else if (
      profile.style === "light" &&
      intersects(fit.style, "australian") &&
      !intersects(fit.style, "light") &&
      !intersects(fit.style, "cool")
    ) {
      breakdown.style = -5;
      score -= 5;
    } else {
      breakdown.style = 0;
    }
  }

  // household
  if (profile.household) {
    if (intersects(fit.household, profile.household)) {
      breakdown.household = 10;
      score += 10;
    } else if (["kids", "pets", "mixed"].includes(profile.household)) {
      if (!traits.includes("waterproof") && fit.moisture !== "waterproof") {
        breakdown.household = -10;
        score -= 10;
      } else {
        breakdown.household = 0;
      }
    } else {
      breakdown.household = 0;
    }
  }

  // lifestyle
  if (profile.lifestyle) {
    if (intersects(fit.lifestyle, profile.lifestyle)) {
      breakdown.lifestyle = 10;
      score += 10;
    } else {
      breakdown.lifestyle = 0;
    }
  }

  // lighting
  if (profile.lighting) {
    if (intersects(fit.lighting, profile.lighting)) {
      breakdown.lighting = 8;
      score += 8;
    } else {
      breakdown.lighting = 0;
    }
    if (
      profile.lighting === "dim" &&
      (intersects(fit.style, "light") || intersects(fit.style, "cool"))
    ) {
      breakdown.lightingDimBoost = 4;
      score += 4;
    }
  }

  // space
  if (profile.space) {
    if (intersects(fit.space, profile.space)) {
      breakdown.space = 6;
      score += 6;
    } else if (profile.space === "apartment" && (type === "solid" || type === "parquetry")) {
      breakdown.space = -6;
      score -= 6;
    } else {
      breakdown.space = 0;
    }
  }

  // room
  if (profile.room) {
    if (intersects(fit.room, profile.room)) {
      breakdown.room = 5;
      score += 5;
    } else if (profile.room === "whole" && intersects(fit.room, "living")) {
      breakdown.room = 2;
      score += 2;
    } else {
      breakdown.room = 0;
    }
  }

  // traits bonuses (capped)
  let traitBonus = 0;
  if (
    (traits.includes("waterproof") || fit.moisture === "waterproof") &&
    (needWaterproof || ["kids", "pets", "mixed"].includes(profile.household) || profile.lifestyle === "kids-pets")
  ) {
    traitBonus += 5;
  }
  if (
    (traits.includes("ac4") || traits.includes("ac5")) &&
    (profile.lifestyle === "heavy" || profile.space === "commercial" || profile.household === "pets" || profile.lifestyle === "rental")
  ) {
    traitBonus += 4;
  }
  if (traits.includes("e0") && ["pregnant", "kids", "mixed"].includes(profile.household)) {
    traitBonus += 3;
  }
  if (
    traits.includes("real-timber-surface") &&
    (profile.lifestyle === "quiet" || profile.moisture === "dry" || profile.budget === "55plus" || profile.budget === "quote")
  ) {
    traitBonus += 4;
  }
  if (traits.includes("high-waste-pattern")) {
    traitBonus += profile.style === "herringbone" ? 5 : -6;
  }
  traitBonus = Math.max(-8, Math.min(12, traitBonus));
  if (traitBonus) {
    breakdown.traits = traitBonus;
    score += traitBonus;
  }

  // personaHints light boost
  const hints = product.personaHints || [];
  let hintPts = 0;
  if (hints.includes("有孩宠物家庭") && ["kids", "pets", "mixed"].includes(profile.household)) hintPts += 2;
  if (hints.includes("暗厅提亮") && (profile.lighting === "dim" || profile.style === "light")) hintPts += 2;
  if (hints.includes("冷灰现代空间") && profile.style === "cool") hintPts += 2;
  if (hints.includes("澳洲硬木个性") && profile.style === "australian") hintPts += 2;
  if (hints.includes("人字拼设计焦点") && profile.style === "herringbone") hintPts += 2;
  if (hints.includes("预算优先公寓") && profile.budget === "under35") hintPts += 2;
  if (hints.includes("出租投资房") && profile.lifestyle === "rental") hintPts += 2;
  if (hintPts) {
    breakdown.personaHints = Math.min(6, hintPts);
    score += breakdown.personaHints;
  }

  // Ozwood type nudge when waterproof lifestyle is the story (still requires matching tags)
  if (
    (needWaterproof || profile.lifestyle === "kids-pets" || ["pets", "kids", "mixed"].includes(profile.household)) &&
    fit.moisture === "waterproof"
  ) {
    if (type === "hybrid") {
      breakdown.typeNudge = 4;
      score += 4;
    }
  }

  return { score, hardFail, hardReason, breakdown };
}

/**
 * Rank catalog for a profile. Returns sorted list with diversity pick helpers.
 */
export function rankProductsForProfile(products, profile, { limit = 3 } = {}) {
  const ranked = products.map((product) => {
    const result = scoreProductAgainstProfile(product, profile);
    return { product, ...result };
  });
  ranked.sort((a, b) => b.score - a.score);

  let pool = ranked.filter((item) => !item.hardFail);
  if (!pool.length) {
    // Do not silently fall back to hard-failed SKUs for waterproof / herringbone
    return { ranked, picked: [], poolEmpty: true };
  }

  const picked = [];
  for (const item of pool) {
    if (picked.length >= limit) break;
    if (!picked.length) {
      picked.push(item);
      continue;
    }
    const types = new Set(picked.map((p) => p.product.type || p.product.typeKey));
    const styles0 = (picked[0].product.fit?.style || [])[0];
    const candStyle = (item.product.fit?.style || [])[0];
    const typeKey = item.product.type || item.product.typeKey;
    const tooSimilar =
      types.has(typeKey) &&
      candStyle === styles0 &&
      Math.abs((item.product.price ?? 999) - (picked[0].product.price ?? 999)) < 3;
    if (picked.length === 1) {
      if (!tooSimilar || typeKey !== (picked[0].product.type || picked[0].product.typeKey)) {
        picked.push(item);
      }
      continue;
    }
    if (!types.has(typeKey) || candStyle !== styles0) picked.push(item);
  }
  while (picked.length < limit && picked.length < pool.length) {
    const next = pool.find((item) => !picked.includes(item));
    if (!next) break;
    picked.push(next);
  }

  return { ranked, picked, poolEmpty: false };
}
