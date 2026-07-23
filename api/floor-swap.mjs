import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const TEXTURES_DIR = join(__dirname, '..', 'assets', 'ozwood', 'textures');

const API_BASE = (process.env.IMAGE_BASE_URL || 'https://dashscope.aliyuncs.com').replace(/\/$/, '');
const MODEL = process.env.IMAGE_MODEL || 'qwen-image-2.0-pro-2026-06-22';
const API_URL = `${API_BASE}/api/v1/services/aigc/multimodal-generation/generation`;
const MAX_IMAGE_SIZE = 2048;

// 加载产品目录，标记图片已退化到 logo 的产品
const catalogRaw = readFileSync(join(__dirname, '..', 'ozwood-catalog.js'), 'utf8');
const catalog = JSON.parse(catalogRaw.slice(catalogRaw.indexOf('{'), catalogRaw.lastIndexOf('}') + 1));
const LOGO_FALLBACK_KEYS = new Set(
  catalog.products.filter(p => p.officialImage?.includes('logo')).map(p => p.key)
);

function resolveTexturePath(floorKey) {
  if (LOGO_FALLBACK_KEYS.has(floorKey)) return null;
  const candidates = [`${floorKey}.jpg`, `product-${floorKey}.jpg`, `${floorKey}.png`, `product-${floorKey}.png`];
  for (const name of candidates) {
    const p = join(TEXTURES_DIR, name);
    if (existsSync(p)) return p;
  }
  return null;
}

const PROMPT = `Completely remove the original floor from the first image and replace it with the floor texture and color from the second reference image (regardless of whether the original floor is wood, tile, cement, or any other material, forcibly replace it with the reference flooring material).

Key Material Constraints:

1.The replaced floor must have the authentic surface quality of real wood: a natural, finely-grained texture with a gentle, soft luster. It should respond naturally to the scene's lighting, showing subtle, warm specular highlights on the wood grain in lit areas, without turning into a perfectly flat, dead-matte surface.

2.The overall brightness, contrast, and color tone must strictly match the reference floor image, blending naturally into the scene's lighting. Preserve the original image's real lighting highlights and shadow structure, but adapt their material expression to that of natural wood. Specifically suppress any harsh, mirror-like reflections, waxy gloss, or polished-tile shine that is unnatural to wood.

Strict Rules:

3.Identify all floor areas in the original image (flat floors + stair/step treads that are also covered with flooring), and replace all of them with the reference floor.

4.If stairs or steps are also covered with flooring, replace them as well; if they are bare wood, stone, or other non-flooring materials, keep them as they are.

5.Walls, doors, baseboards, handrails, and furniture must remain completely unchanged, with clean, non-bleeding edges.

Floor Planking Method:

6.If the reference texture has a distinct parquet pattern (such as herringbone or chevron), strictly follow that pattern. The parquet across the entire floor must remain continuous and uniform, with no pattern breaks, sudden direction changes, or localized disarray.

7.If the reference image is just a texture sample without visible plank seams, you must generate a realistic wood plank assembly. Individual plank width should be approximately 12–19 cm (proportional to the original image), laid in a staggered running bond pattern. A single, seamless giant wood sheet is strictly forbidden. The seams between planks must be extremely subtle, suggested only by a very thin shadow line slightly darker than the wood; absolutely no thick black lines, deep grooves, or large gaps are allowed.

8.The grain direction, laying angle, and perspective distortion of the floor must be perfectly consistent with the original ground plane.

Lighting and Output:

9.Preserve the overall lighting direction and atmosphere of the original image. Keep the real highlights and shadows from the original light sources, and only modify how these highlights appear: they should feel like light interacting with oiled or natural wood, not with reflective tile or wax. The seam shadows remain extremely shallow and thin, blending naturally.

10.The wood floor surface shows a natural, organic sheen where the light hits, with gentle highlights. It avoids both the extreme dullness of a totally matte surface and the artificial shine of a polished tile.

11.Output a complete, high-resolution final edited image, with the floor seamlessly integrated into the scene, as if captured in a real photograph.`;


async function compressImage(base64Input) {
  const buffer = Buffer.from(base64Input, 'base64');
  const metadata = await sharp(buffer).metadata();
  let w = metadata.width || 0;
  let h = metadata.height || 0;
  if (Math.max(w, h) > MAX_IMAGE_SIZE) {
    const ratio = MAX_IMAGE_SIZE / Math.max(w, h);
    w = Math.round(w * ratio);
    h = Math.round(h * ratio);
    const resized = await sharp(buffer).resize(w, h, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer();
    return resized.toString('base64');
  }
  return base64Input;
}


function readTextureBytes(floorKey) {
  const filepath = resolveTexturePath(floorKey);
  if (!filepath) return null;
  return readFileSync(filepath);
}


export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: '仅支持 POST 请求。' });

  const apiKey = process.env.IMAGE_API_KEY || '';
  if (!apiKey) return res.status(200).json({ error: 'IMAGE_API_KEY 未配置', fallback: true });

  const { image, floorKey } = req.body || {};
  if (!image || typeof image !== 'string') return res.status(400).json({ error: '请提供 base64 图片' });

  // 读取地板参考图
  const textureBytes = readTextureBytes(floorKey);
  if (!textureBytes) return res.status(400).json({ error: '该产品暂不支持 AI 换地板' });

  const textureBase64 = textureBytes.toString('base64');
  const textureMime = floorKey === 'herringbone' ? 'image/jpeg' : 'image/jpeg';

  try {
    // 压缩用户上传图（长边最大 2048px）
    const compressedImage = await compressImage(image);

    // 调用通义万相
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        input: {
          messages: [{
            role: 'user',
            content: [
              { image: `data:image/jpeg;base64,${compressedImage}` },
              { image: `data:image/jpeg;base64,${textureBase64}` },
              { text: PROMPT },
            ],
          }],
        },
        parameters: { n: 1, watermark: false },
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      return res.status(200).json({ error: `AI 服务返回 ${response.status}`, detail: text.slice(0, 300), fallback: true });
    }

    const data = await response.json();
    if (!data.output || !data.output.choices || !data.output.choices[0]) {
      return res.status(200).json({ error: 'AI 返回异常', detail: JSON.stringify(data).slice(0, 300), fallback: true });
    }

    const imgUrl = data.output.choices[0].message?.content?.[0]?.image;
    if (!imgUrl) {
      return res.status(200).json({ error: 'AI 返回无图片', detail: JSON.stringify(data).slice(0, 300), fallback: true });
    }

    return res.status(200).json({ url: imgUrl });

  } catch (err) {
    return res.status(200).json({ error: err.message || '生成失败', fallback: true });
  }
}
