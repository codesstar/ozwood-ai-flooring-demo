#!/usr/bin/env node
/**
 * Batch-generate room concept scenes for every Demo catalog SKU.
 * Uses DashScope image edit (same stack as /api/floor-swap):
 *   base room photo + product texture → living/bedroom/study-{key}.jpg
 *
 * Usage:
 *   node scripts/ozwood-render-room-scenes.mjs
 *   node scripts/ozwood-render-room-scenes.mjs --limit 3 --concurrency 1
 *   node scripts/ozwood-render-room-scenes.mjs --only 6505,ov704-blackbutt
 *
 * Resume-safe: skips outputs that already exist unless --force.
 */
import fs from "node:fs/promises";
import { existsSync, readFileSync, createWriteStream } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ROOMS_DIR = path.join(ROOT, "assets/ozwood/rooms");
const TEXTURE_CACHE = path.join(ROOT, "assets/ozwood/textures");
const CATALOG_JS = path.join(ROOT, "ozwood-catalog.js");
const PROGRESS_PATH = path.join(ROOT, "assets/ozwood/rooms/.render-progress.json");

function loadEnv() {
  for (const name of [".env.local", ".env"]) {
    const p = path.join(ROOT, name);
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, "utf8").split("\n")) {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (!m) continue;
      const key = m[1].trim();
      let val = m[2].trim().replace(/^["']|["']$/g, "");
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

loadEnv();

const API_BASE = (process.env.IMAGE_BASE_URL || "https://dashscope.aliyuncs.com").replace(/\/$/, "");
const MODEL = process.env.IMAGE_MODEL || "qwen-image-2.0-pro-2026-06-22";
const API_URL = `${API_BASE}/api/v1/services/aigc/multimodal-generation/generation`;
const API_KEY = process.env.IMAGE_API_KEY || "";
const MAX_IMAGE_SIZE = 1536;

const BASE_ROOMS = {
  living: path.join(ROOMS_DIR, "living-european-oak.jpg"),
  bedroom: path.join(ROOMS_DIR, "bedroom-european-oak.jpg"),
  study: path.join(ROOMS_DIR, "study-european-oak.jpg")
};

const PROMPT = `Completely remove the original floor from the first image and replace it with the floor texture and color from the second reference image (regardless of whether the original floor is wood, tile, cement, or any other material, forcibly replace it with the reference flooring material).

Key Material Constraints:
1.The replaced floor must have the authentic surface quality of real wood: a natural, finely-grained texture with a gentle, soft luster.
2.The overall brightness, contrast, and color tone must strictly match the reference floor image, blending naturally into the scene's lighting.
3.Identify all floor areas and replace them with the reference floor.
4.Walls, doors, baseboards, handrails, and furniture must remain completely unchanged.
5.If the reference has herringbone/parquet, keep that pattern continuous; otherwise use staggered planks ~12–19 cm with very subtle seams.
6.Output a complete high-resolution edited image.`;

const args = process.argv.slice(2);
function argVal(flag, fallback = null) {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : fallback;
}
const LIMIT = Number(argVal("--limit", Infinity));
const CONCURRENCY = Math.max(1, Number(argVal("--concurrency", "1")));
const FORCE = args.includes("--force");
const DELAY_MS = Math.max(0, Number(argVal("--delay", "2500")));
const RETRIES = Math.max(0, Number(argVal("--retries", "4")));
const ONLY = (argVal("--only", "") || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const ROOM_LIST = (argVal("--rooms", "living,bedroom,study") || "")
  .split(",")
  .map((s) => s.trim())
  .filter((r) => BASE_ROOMS[r]);

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function loadCatalog() {
  const raw = readFileSync(CATALOG_JS, "utf8");
  return JSON.parse(raw.replace(/^[\s\S]*?window\.OZWOOD_CATALOG = /, "").replace(/;\s*$/, ""));
}

async function ensureDirs() {
  await fs.mkdir(ROOMS_DIR, { recursive: true });
  await fs.mkdir(TEXTURE_CACHE, { recursive: true });
}

async function downloadTexture(product) {
  const cachePath = path.join(TEXTURE_CACHE, `${product.key}.jpg`);
  if (existsSync(cachePath) && !FORCE) return cachePath;

  // Prefer local official asset if already present
  if (product.officialImage && !product.officialImage.startsWith("http")) {
    const local = path.join(ROOT, product.officialImage);
    if (existsSync(local)) {
      await sharp(local).jpeg({ quality: 90 }).toFile(cachePath);
      return cachePath;
    }
  }

  const url = product.officialImage;
  if (!url || !url.startsWith("http")) throw new Error(`No texture URL for ${product.key}`);

  const res = await fetch(url, {
    headers: {
      "User-Agent": "OzwoodRoomRenderer/1.0",
      Accept: "image/*",
      Referer: "https://ozwoodaustralia.com.au/"
    }
  });
  if (!res.ok) throw new Error(`Texture download ${res.status} for ${product.key}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await sharp(buf).rotate().jpeg({ quality: 90 }).toFile(cachePath);
  return cachePath;
}

async function toDataUriJpeg(filePath) {
  let pipelineImg = sharp(filePath).rotate();
  const meta = await pipelineImg.metadata();
  const w = meta.width || 0;
  const h = meta.height || 0;
  if (Math.max(w, h) > MAX_IMAGE_SIZE) {
    pipelineImg = sharp(filePath)
      .rotate()
      .resize({
        width: w >= h ? MAX_IMAGE_SIZE : undefined,
        height: h > w ? MAX_IMAGE_SIZE : undefined,
        fit: "inside",
        withoutEnlargement: true
      });
  }
  const buf = await pipelineImg.jpeg({ quality: 85 }).toBuffer();
  return `data:image/jpeg;base64,${buf.toString("base64")}`;
}

async function callImageEdit(roomDataUri, textureDataUri, attempt = 1) {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`
    },
    body: JSON.stringify({
      model: MODEL,
      input: {
        messages: [
          {
            role: "user",
            content: [
              { image: roomDataUri },
              { image: textureDataUri },
              { text: PROMPT }
            ]
          }
        ]
      },
      parameters: { n: 1, watermark: false }
    })
  });

  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Non-JSON response ${response.status}: ${text.slice(0, 200)}`);
  }
  if (response.status === 429 || data?.code === "Throttling.RateQuota") {
    if (attempt <= RETRIES) {
      const wait = DELAY_MS * attempt * 2;
      console.warn(`Rate limited, retry ${attempt}/${RETRIES} after ${wait}ms`);
      await sleep(wait);
      return callImageEdit(roomDataUri, textureDataUri, attempt + 1);
    }
  }
  if (data?.code === "Arrearage" || /arrearage|good standing/i.test(text)) {
    throw new Error(`ACCOUNT_ARREARAGE: 阿里云百炼/通义账号欠费或不可用，请先充值后再跑。${text.slice(0, 160)}`);
  }
  if (!response.ok) {
    throw new Error(`API ${response.status}: ${text.slice(0, 300)}`);
  }
  const imgUrl = data.output?.choices?.[0]?.message?.content?.[0]?.image;
  if (!imgUrl) throw new Error(`No image in response: ${text.slice(0, 300)}`);
  return imgUrl;
}

async function downloadResult(url, outPath) {
  const res = await fetch(url, { headers: { "User-Agent": "OzwoodRoomRenderer/1.0" } });
  if (!res.ok) throw new Error(`Result download ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  // Normalize to reasonably sized jpeg
  await sharp(buf).jpeg({ quality: 86 }).toFile(outPath);
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

async function main() {
  if (!API_KEY || API_KEY.includes("your-")) {
    console.error("IMAGE_API_KEY missing in .env.local");
    process.exit(1);
  }
  for (const room of ROOM_LIST) {
    if (!existsSync(BASE_ROOMS[room])) {
      console.error(`Missing base room: ${BASE_ROOMS[room]}`);
      process.exit(1);
    }
  }

  await ensureDirs();
  const catalog = loadCatalog();
  let products = catalog.products.filter((p) => p.key && p.key !== "european-oak"); // keep european-oak bases as-is
  // Still generate for european-oak? Skip — already perfect.
  // Generate for spotted-gum etc. too if --force, else skip existing.

  if (ONLY.length) products = products.filter((p) => ONLY.includes(p.key));
  if (Number.isFinite(LIMIT)) products = products.slice(0, LIMIT);

  const jobs = [];
  for (const product of products) {
    for (const room of ROOM_LIST) {
      const outPath = path.join(ROOMS_DIR, `${room}-${product.key}.jpg`);
      if (!FORCE && existsSync(outPath)) continue;
      jobs.push({ product, room, outPath });
    }
  }

  console.log(
    JSON.stringify(
      {
        products: products.length,
        rooms: ROOM_LIST,
        jobs: jobs.length,
        concurrency: CONCURRENCY,
        delayMs: DELAY_MS,
        model: MODEL
      },
      null,
      2
    )
  );

  if (!jobs.length) {
    console.log("Nothing to render (all scenes already exist).");
    return;
  }

  // Preload base room data URIs once
  const roomDataUris = {};
  for (const room of ROOM_LIST) {
    roomDataUris[room] = await toDataUriJpeg(BASE_ROOMS[room]);
  }

  const progress = { ok: 0, fail: 0, errors: [], startedAt: new Date().toISOString() };

  await mapPool(jobs, CONCURRENCY, async (job, idx) => {
    const label = `${job.room}-${job.product.key}`;
    try {
      const texturePath = await downloadTexture(job.product);
      const textureUri = await toDataUriJpeg(texturePath);
      await sleep(DELAY_MS);
      const url = await callImageEdit(roomDataUris[job.room], textureUri);
      await downloadResult(url, job.outPath);
      progress.ok += 1;
      console.log(`[${progress.ok + progress.fail}/${jobs.length}] OK ${label}`);
    } catch (err) {
      progress.fail += 1;
      const msg = String(err.message || err);
      progress.errors.push({ label, error: msg.slice(0, 240) });
      console.error(`[${progress.ok + progress.fail}/${jobs.length}] FAIL ${label}: ${msg.slice(0, 160)}`);
      if (msg.includes("ACCOUNT_ARREARAGE")) {
        console.error("\n检测到账号欠费 (Arrearage)，停止后续任务以免空转。充值后重新运行: npm run render:ozwood-rooms\n");
        await fs.writeFile(PROGRESS_PATH, JSON.stringify({ ...progress, stoppedForArrearage: true, finishedAt: new Date().toISOString() }, null, 2));
        process.exit(2);
      }
      await sleep(1200);
    }
    if ((idx + 1) % 10 === 0) {
      await fs.writeFile(PROGRESS_PATH, JSON.stringify(progress, null, 2));
    }
  });

  progress.finishedAt = new Date().toISOString();
  await fs.writeFile(PROGRESS_PATH, JSON.stringify(progress, null, 2));
  console.log(JSON.stringify({ done: true, ok: progress.ok, fail: progress.fail }, null, 2));
  if (progress.fail) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
