// ===================== 产品数据 =====================
const FULL_PRODUCTS = [
  { id: "SM-001", name: "橡木原生大板", category: "实木", wood: "橡木", surface: "手刮仿古", thickness: "18mm", size: "1210×165mm", price: 498, origPrice: 598, location: "A区-展架01", tags: ["热销","进口原木","E0级环保"], hot: true, color: "#A0785A", desc: "精选欧洲A级橡木，天然纹理清晰自然，手刮仿古工艺赋予独特触感。适合中式、新中式风格。" },
  { id: "SM-002", name: "黑胡桃静雅", category: "实木", wood: "黑胡桃木", surface: "哑光漆面", thickness: "18mm", size: "910×125mm", price: 688, origPrice: 798, location: "A区-展架02", tags: ["高端","北美黑胡桃","静音"], hot: false, color: "#5C3D2E", desc: "北美FAS级黑胡桃，色泽深邃优雅，哑光漆面触感温润。适合现代轻奢、极简风格。" },
  { id: "SM-003", name: "柚木暖阳", category: "实木", wood: "柚木", surface: "自然油面", thickness: "18mm", size: "910×125mm", price: 888, origPrice: 1080, location: "A区-展架03", tags: ["防潮","东南亚柚木","地暖可用"], hot: true, color: "#B8924A", desc: "缅甸天然柚木，富含油脂，天然防潮防虫。自然油面工艺保留木材呼吸感，适合地暖环境。" },
  { id: "DC-001", name: "三层橡木·云杉芯", category: "多层实木", wood: "橡木面层", surface: "拉丝工艺", thickness: "15mm", size: "1210×165mm", price: 328, origPrice: 398, location: "B区-展架01", tags: ["性价比","地暖专用","锁扣"], hot: true, color: "#C4A06A", desc: "表层2mm橡木+云杉芯材，纵横交错结构稳定性极佳。拉丝工艺凸显木纹立体感，地暖环境首选。" },
  { id: "DC-002", name: "多层白蜡木·经典", category: "多层实木", wood: "白蜡木面层", surface: "UV漆面", thickness: "15mm", size: "1210×148mm", price: 288, origPrice: 358, location: "B区-展架02", tags: ["耐磨","北欧风","易打理"], hot: false, color: "#D4BC8A", desc: "白蜡木面层纹理通透，UV漆面耐磨易清洁。9层纵横交错结构，稳定不变形。适合北欧、日式风格。" },
  { id: "DC-003", name: "人字拼·胡桃色", category: "多层实木", wood: "橡木面层", surface: "平面UV漆", thickness: "12mm", size: "600×120mm", price: 358, origPrice: 428, location: "B区-展架03", tags: ["设计感","人字拼","网红款"], hot: true, color: "#8B6F4E", pattern: "herringbone", desc: "经典人字拼花设计，深胡桃色染色工艺，空间感更强。免龙骨锁扣安装，省工省料。" },
  { id: "QH-001", name: "强化耐磨·浅橡", category: "强化", wood: "高密度板", surface: "同步对花", thickness: "12mm", size: "1215×195mm", price: 138, origPrice: 168, location: "C区-展架01", tags: ["超耐磨","AC5级","高性价比"], hot: true, color: "#D8C4A0", desc: "AC5级超耐磨表层，同步对花纹理逼真。12mm加厚基材脚感扎实，适合人流量大的客厅、商用空间。" },
  { id: "QH-002", name: "强化复合·深胡桃", category: "强化", wood: "高密度板", surface: "浮雕面", thickness: "8mm", size: "1215×195mm", price: 98, origPrice: 128, location: "C区-展架02", tags: ["经济实惠","防水基材","快装"], hot: false, color: "#7A5C3E", desc: "高密度防水基材，浮雕面工艺增强质感。锁扣快装设计，DIY友好。预算有限的租房装修优选。" },
  { id: "QH-003", name: "强化复合·北欧灰橡", category: "强化", wood: "高密度板", surface: "同步对花", thickness: "12mm", size: "1215×195mm", price: 158, origPrice: 188, location: "C区-展架03", tags: ["新品","灰色系","INS风"], hot: false, color: "#B0A898", desc: "高级灰色调，同步对花还原真实木纹。适合现代简约、INS风格装修，百搭不过时。" },
  { id: "SPC-001", name: "SPC石晶·奶油原木", category: "SPC", wood: "石粉基材", surface: "EIR同步纹", thickness: "4+1mm", size: "1220×183mm", price: 108, origPrice: 138, location: "D区-展架01", tags: ["零甲醛","防水100%","超薄"], hot: true, color: "#E8D8B8", desc: "石粉+PVC零甲醛配方，100%防水不怕泡。4mm超薄设计，直接铺贴在旧地面上。厨卫阳台均可使用。" },
  { id: "SPC-002", name: "SPC石晶·烟熏橡木", category: "SPC", wood: "石粉基材", surface: "哑光对花", thickness: "5+1.5mm", size: "1220×183mm", price: 148, origPrice: 178, location: "D区-展架02", tags: ["静音垫","商用级","B1防火"], hot: false, color: "#8E7A62", desc: "加厚1.5mmIXPE静音垫，踩踏噪音降低70%。B1级防火认证，商用家用两相宜。" },
  { id: "SPC-003", name: "SPC石晶·鱼骨拼", category: "SPC", wood: "石粉基材", surface: "3D同步纹", thickness: "4+1mm", size: "600×120mm", price: 128, origPrice: 158, location: "D区-展架03", tags: ["鱼骨拼","高颜值","免胶安装"], hot: false, color: "#C4AA80", pattern: "chevron", desc: "时尚鱼骨拼花造型，3D同步纹触感真实。免胶锁扣设计，可拆可移，适合追求格调的年轻用户。" },
];

const USE_VISUALIZER_CATALOG = document.body.dataset.visualCatalog === 'true' && Boolean(window.VISUALIZER);
const MANUAL_DETAIL = document.body.dataset.manualDetail === 'true';
const LIVE_AI = USE_VISUALIZER_CATALOG && document.body.dataset.liveAi === 'true';
const PRODUCTS = USE_VISUALIZER_CATALOG
  ? window.VISUALIZER.floors.map(floor => ({
      ...floor,
      category: floor.appCategory || floor.category,
      surface: floor.surface || floor.finish,
      origPrice: floor.origPrice || floor.price,
      location: floor.location || 'A区-实景样板',
      hot: floor.hot !== false,
      color: floor.color || '#b69a76',
      desc: floor.desc || `${floor.name}，真实材质比例与空间光影效果可在上方场景中查看。`
    }))
  : FULL_PRODUCTS;

// ===================== 状态 =====================
let userProfile = {};
let currentQuestionIdx = 0;
let lastInteractionTime = Date.now();
let idleTimer = null;
let idlePromptIdx = 0;
let selectedProduct = null;
let currentRoom = 'living';
let lastRecommended = [];
let lastArea = null;
let voiceOn = false;
let liveAIProfile = {};
let liveAIHistory = [];
let liveAIRequestPending = false;

const ROOM_NAMES = { living: '客厅', bedroom: '卧室', study: '书房', hallway: '走廊' };
const INSTALL_FEE = p => p.category === '实木' ? 70 : 35;
const INSTALL_NAME = p => p.category === '实木' ? '龙骨铺装' : '锁扣安装';

// ===================== 工具 =====================
function hexToRgb(hex) {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  };
}
function clamp255(v) { return Math.max(0, Math.min(255, Math.round(v))); }
function shade(rgb, d) { return `rgb(${clamp255(rgb.r+d)},${clamp255(rgb.g+d)},${clamp255(rgb.b+d)})`; }
function prand(seed) {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}
function money(n) { return Math.round(n).toLocaleString('zh-CN'); }
function escapeHTML(value) {
  return String(value).replace(/[&<>'"]/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  })[char]);
}
function findProduct(id) {
  const exact = PRODUCTS.find(product => product.id === id);
  if (exact || !USE_VISUALIZER_CATALOG) return exact;
  const floorKey = window.VISUALIZER?.productMap[id];
  return PRODUCTS.find(product => product.key === floorKey) || null;
}

// ===================== 木纹图案绘制 =====================
// k = 尺寸系数（缩略图用小值，地面用 1）
function paintStraight(ctx, w, h, rgb, k) {
  const plankW = 120 * k, plankH = 32 * k;
  const rows = Math.ceil(h / plankH) + 1;
  for (let r = 0; r < rows; r++) {
    const offset = (r % 2) * (plankW / 2);
    let ci = 0;
    for (let x = offset - plankW; x < w + plankW; x += plankW) {
      const v = (prand(r * 31 + ci * 7) - 0.5) * 26;
      ctx.fillStyle = shade(rgb, v);
      ctx.fillRect(x, r * plankH, plankW - 1.6 * k, plankH - 1.2 * k);
      ctx.strokeStyle = 'rgba(40,24,10,0.09)';
      ctx.lineWidth = 0.8 * k;
      const lines = Math.max(2, Math.floor(plankH / (9 * k)));
      for (let l = 0; l < lines; l++) {
        const ly = r * plankH + 4 * k + l * 8 * k + prand(r + ci + l) * 3 * k;
        ctx.beginPath();
        ctx.moveTo(x + 3 * k, ly);
        ctx.bezierCurveTo(x + plankW * 0.3, ly - 2 * k, x + plankW * 0.7, ly + 2 * k, x + plankW - 4 * k, ly);
        ctx.stroke();
      }
      ci++;
    }
  }
}

// 人字拼：A/B 两块矩形板成 90° 咬合，沿对角晶格平移平铺
// A 板：角点 P，长边方向 u=(1,1)/√2，宽边方向 -v；B 板：角点 P+L·u，长边方向 -v=(−1,1)/√2
function plankPath(ctx, x, y, dx, dy, wx, wy, L, W) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + dx * L, y + dy * L);
  ctx.lineTo(x + dx * L + wx * W, y + dy * L + wy * W);
  ctx.lineTo(x + wx * W, y + wy * W);
  ctx.closePath();
}

function paintHerringbone(ctx, w, h, rgb, k) {
  const W = 18 * k;
  const L = W * 3;
  const R2 = Math.SQRT1_2;
  const ux = R2, uy = R2;      // u 方向
  const vx = R2, vy = -R2;     // v 方向
  const stepX = W * Math.SQRT2;  // 晶格横向周期
  const stepY = L * Math.SQRT2;  // 晶格纵向周期
  const seam = 'rgba(40,24,10,0.35)';
  const mMin = Math.floor(-L / stepX) - 1;
  const mMax = Math.ceil((w + L) / stepX) + 1;
  const n0 = Math.floor(-2 * L / stepY) - 1;
  const n1 = Math.ceil((h + L) / stepY) + 1;

  function grain(x, y, dx, dy, wx, wy, seed) {
    ctx.strokeStyle = 'rgba(40,24,10,0.09)';
    ctx.lineWidth = 0.8 * k;
    for (let l = 1; l <= 2; l++) {
      const f = l / 3;
      ctx.beginPath();
      ctx.moveTo(x + wx * W * f + dx * 2 * k, y + wy * W * f + dy * 2 * k);
      ctx.lineTo(x + wx * W * f + dx * (L - 2 * k) + (prand(seed + l) - 0.5) * 1.5 * k,
                 y + wy * W * f + dy * (L - 2 * k));
      ctx.stroke();
    }
  }

  for (let m = mMin; m <= mMax; m++) {
    for (let n = n0; n <= n1; n++) {
      const x = m * stepX, y = n * stepY;
      // A 板
      const vA = (prand(m * 31 + n * 17) - 0.5) * 26;
      plankPath(ctx, x, y, ux, uy, -vx, -vy, L, W);
      ctx.fillStyle = shade(rgb, vA);
      ctx.fill();
      ctx.strokeStyle = seam;
      ctx.lineWidth = 1.2 * k;
      ctx.stroke();
      grain(x, y, ux, uy, -vx, -vy, m * 7 + n * 3);
      // B 板（接在 A 板末端，垂直咬合）
      const vB = (prand(m * 47 + n * 13) - 0.5) * 26;
      const px2 = x + L * ux, py2 = y + L * uy;
      plankPath(ctx, px2, py2, -vx, -vy, ux, uy, L, W);
      ctx.fillStyle = shade(rgb, vB);
      ctx.fill();
      ctx.strokeStyle = seam;
      ctx.lineWidth = 1.2 * k;
      ctx.stroke();
      grain(px2, py2, -vx, -vy, ux, uy, m * 11 + n * 5);
    }
  }
}

// 鱼骨拼：斜切平行四边形，列间成 V 字
function paintChevron(ctx, w, h, rgb, k) {
  const runW = 76 * k;  // 单列水平跨度
  const t = 22 * k;     // 板条纵向厚度
  const gap = 1.4 * k;
  const cols = Math.ceil(w / runW) + 2;
  for (let c = -1; c < cols; c++) {
    const even = ((c % 2) + 2) % 2 === 0;
    const dir = even ? 1 : -1;
    const phase = even ? 0 : runW;
    const x0 = c * runW, x1 = x0 + runW;
    let ri = 0;
    for (let y = -2 * runW; y < h + 2 * runW; y += t) {
      const yA = y + phase;
      const v = (prand(c * 41 + ri * 13) - 0.5) * 26;
      ctx.fillStyle = shade(rgb, v);
      ctx.beginPath();
      ctx.moveTo(x0, yA);
      ctx.lineTo(x1, yA + dir * runW);
      ctx.lineTo(x1, yA + dir * runW + t - gap);
      ctx.lineTo(x0, yA + t - gap);
      ctx.closePath();
      ctx.fill();
      // 顺纹线
      ctx.strokeStyle = 'rgba(40,24,10,0.09)';
      ctx.lineWidth = 0.8 * k;
      for (let l = 1; l <= 2; l++) {
        const off = (t / 3) * l;
        ctx.beginPath();
        ctx.moveTo(x0 + 2 * k, yA + off);
        ctx.lineTo(x1 - 2 * k, yA + dir * runW + off);
        ctx.stroke();
      }
      ri++;
    }
  }
}

function paintPattern(ctx, w, h, color, pattern, k) {
  const rgb = hexToRgb(color);
  ctx.fillStyle = shade(rgb, -60);
  ctx.fillRect(0, 0, w, h);
  if (pattern === 'herringbone') paintHerringbone(ctx, w, h, rgb, k);
  else if (pattern === 'chevron') paintChevron(ctx, w, h, rgb, k);
  else paintStraight(ctx, w, h, rgb, k);
}

// 缩略图（列表卡片 / 详情色板 / 对比表）
const thumbCache = {};
function woodTexture(color, pattern) {
  const key = color + '|' + (pattern || 's');
  if (thumbCache[key]) return thumbCache[key];
  const c = document.createElement('canvas');
  c.width = 340; c.height = 150;
  paintPattern(c.getContext('2d'), 340, 150, color, pattern, 0.62);
  return (thumbCache[key] = c.toDataURL());
}

// 地面大图案（供透视投影采样）
const floorPatCache = {};
function getFloorPattern(product, viewW) {
  const color = product ? product.color : '#D5C3A2';
  const pattern = product ? product.pattern : null;
  const key = color + '|' + (pattern || 's') + '|' + Math.round(viewW / 80);
  if (floorPatCache[key]) return floorPatCache[key];
  const c = document.createElement('canvas');
  c.width = Math.ceil(viewW * 3.2);
  c.height = 640;
  paintPattern(c.getContext('2d'), c.width, c.height, color, pattern, 1);
  return (floorPatCache[key] = c);
}

// ===================== 场景渲染 =====================
function renderScene(ctx, w, h, product) {
  const color = product ? product.color : '#D5C3A2';
  const rgb = hexToRgb(color);
  const horizon = h * 0.42;

  // 背景墙
  const wallGrad = ctx.createLinearGradient(0, 0, 0, horizon);
  wallGrad.addColorStop(0, '#F2EDE4');
  wallGrad.addColorStop(1, '#E7E0D2');
  ctx.fillStyle = wallGrad;
  ctx.fillRect(0, 0, w, horizon);

  // 窗户
  const winW = w * 0.16, winH = horizon * 0.62;
  const winX = w * 0.76, winY = horizon * 0.14;
  // 窗帘
  ctx.fillStyle = 'rgba(196,178,148,0.55)';
  ctx.fillRect(winX - w * 0.035, winY - 8, w * 0.025, winH + 24);
  ctx.fillRect(winX + winW + w * 0.01, winY - 8, w * 0.025, winH + 24);
  ctx.fillStyle = '#CBBFA8';
  ctx.fillRect(winX - 5, winY - 5, winW + 10, winH + 10);
  const skyGrad = ctx.createLinearGradient(winX, winY, winX, winY + winH);
  skyGrad.addColorStop(0, '#DCE8EC');
  skyGrad.addColorStop(1, '#F0EBD8');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(winX, winY, winW, winH);
  ctx.strokeStyle = '#CBBFA8';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(winX + winW / 2, winY); ctx.lineTo(winX + winW / 2, winY + winH);
  ctx.moveTo(winX, winY + winH / 2); ctx.lineTo(winX + winW, winY + winH / 2);
  ctx.stroke();
  const glow = ctx.createRadialGradient(winX + winW/2, winY + winH/2, 10, winX + winW/2, winY + winH/2, w * 0.3);
  glow.addColorStop(0, 'rgba(255,250,230,0.35)');
  glow.addColorStop(1, 'rgba(255,250,230,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, horizon);

  // 墙面挂画（跟随地板色）
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(w * 0.12 - 4, horizon * 0.22 - 4, w * 0.11 + 8, horizon * 0.4 + 8);
  ctx.fillStyle = shade(rgb, 25);
  ctx.fillRect(w * 0.12, horizon * 0.22, w * 0.11, horizon * 0.4);
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.beginPath();
  ctx.moveTo(w * 0.12, horizon * 0.62);
  ctx.lineTo(w * 0.12 + w * 0.055, horizon * 0.38);
  ctx.lineTo(w * 0.12 + w * 0.11, horizon * 0.62);
  ctx.closePath();
  ctx.fill();

  // 踢脚线
  ctx.fillStyle = '#D8CDB8';
  ctx.fillRect(0, horizon - 7, w, 7);

  // --- 地板：透视切片投影 ---
  const floorH = h - horizon;
  const pat = getFloorPattern(product, w);
  const slices = 64;
  for (let i = 0; i < slices; i++) {
    const lin0 = i / slices, lin1 = (i + 1) / slices;
    const t0 = Math.pow(lin0, 1.45), t1 = Math.pow(lin1, 1.45);
    const y0 = horizon + floorH * t0, y1 = horizon + floorH * t1;
    const s = 0.34 + 1.4 * Math.sqrt(lin0);      // 近大远小
    const srcW = Math.min(pat.width, w / s * (pat.width / (w * 3.2)) * 3.2); // = w/s，防越界
    const srcX = (pat.width - srcW) / 2;
    const srcY0 = lin0 * pat.height;
    const srcH = pat.height / slices;
    ctx.drawImage(pat, srcX, srcY0, srcW, srcH, 0, y0, w, (y1 - y0) + 0.6);
  }

  // 墙脚接触阴影
  const contactShadow = ctx.createLinearGradient(0, horizon, 0, horizon + 26);
  contactShadow.addColorStop(0, 'rgba(50,35,18,0.22)');
  contactShadow.addColorStop(1, 'rgba(50,35,18,0)');
  ctx.fillStyle = contactShadow;
  ctx.fillRect(0, horizon, w, 26);

  // 窗光洒落
  ctx.fillStyle = 'rgba(255,248,225,0.13)';
  ctx.beginPath();
  ctx.moveTo(winX - 10, horizon);
  ctx.lineTo(winX + winW + 10, horizon);
  ctx.lineTo(winX + winW + w * 0.14, h);
  ctx.lineTo(winX - w * 0.1, h);
  ctx.closePath();
  ctx.fill();

  drawFurniture(ctx, w, h, horizon, floorH);

  // 暗角
  const vig = ctx.createRadialGradient(w/2, h/2, Math.min(w,h)*0.4, w/2, h/2, Math.max(w,h)*0.75);
  vig.addColorStop(0, 'rgba(40,25,10,0)');
  vig.addColorStop(1, 'rgba(40,25,10,0.14)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);
}

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawFurniture(ctx, w, h, horizon, floorH) {
  const ink = 'rgba(52,38,24,';

  function softRect(x, y, rw, rh, r, alpha, blur) {
    ctx.save();
    ctx.shadowColor = 'rgba(40,25,10,0.35)';
    ctx.shadowBlur = blur || 14;
    ctx.shadowOffsetY = 5;
    ctx.fillStyle = ink + alpha + ')';
    roundRectPath(ctx, x, y, rw, rh, r);
    ctx.fill();
    ctx.restore();
  }
  function seam(x1, y1, x2, y2) {
    ctx.strokeStyle = 'rgba(255,255,255,0.14)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  }

  if (currentRoom === 'living') {
    // 地毯（双层）
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    ctx.beginPath();
    ctx.ellipse(w * 0.42, horizon + floorH * 0.58, w * 0.21, floorH * 0.21, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(w * 0.42, horizon + floorH * 0.58, w * 0.17, floorH * 0.17, 0, 0, Math.PI * 2);
    ctx.stroke();
    // 沙发：靠背 + 座 + 扶手 + 坐垫缝
    softRect(w * 0.6, horizon + floorH * 0.05, w * 0.3, floorH * 0.16, 10, '0.20', 6);
    softRect(w * 0.6, horizon + floorH * 0.18, w * 0.3, floorH * 0.3, 14, '0.30');
    softRect(w * 0.585, horizon + floorH * 0.1, w * 0.035, floorH * 0.36, 10, '0.26', 8);
    softRect(w * 0.885, horizon + floorH * 0.1, w * 0.035, floorH * 0.36, 10, '0.26', 8);
    seam(w * 0.7, horizon + floorH * 0.2, w * 0.7, horizon + floorH * 0.46);
    seam(w * 0.8, horizon + floorH * 0.2, w * 0.8, horizon + floorH * 0.46);
    // 茶几
    softRect(w * 0.36, horizon + floorH * 0.5, w * 0.15, floorH * 0.14, 10, '0.24');
    seam(w * 0.37, horizon + floorH * 0.52, w * 0.5, horizon + floorH * 0.52);
    // 绿植
    ctx.save();
    ctx.fillStyle = 'rgba(74,104,72,0.55)';
    ctx.beginPath(); ctx.ellipse(w * 0.07, horizon + floorH * 0.14, w * 0.032, floorH * 0.14, -0.25, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(74,104,72,0.42)';
    ctx.beginPath(); ctx.ellipse(w * 0.085, horizon + floorH * 0.17, w * 0.028, floorH * 0.12, 0.35, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = ink + '0.28)';
    roundRectPath(ctx, w * 0.052, horizon + floorH * 0.28, w * 0.036, floorH * 0.12, 5);
    ctx.fill();
    ctx.restore();
    // 落地灯
    softRect(w * 0.535, horizon + floorH * 0.02, w * 0.005, floorH * 0.3, 2, '0.22', 4);
    ctx.fillStyle = ink + '0.24)';
    ctx.beginPath();
    ctx.moveTo(w * 0.52, horizon + floorH * 0.02);
    ctx.lineTo(w * 0.555, horizon + floorH * 0.02);
    ctx.lineTo(w * 0.548, horizon - floorH * 0.06);
    ctx.lineTo(w * 0.527, horizon - floorH * 0.06);
    ctx.closePath();
    ctx.fill();
  } else if (currentRoom === 'bedroom') {
    // 床头板
    softRect(w * 0.3, horizon - floorH * 0.06, w * 0.4, floorH * 0.18, 8, '0.24', 8);
    // 床体
    softRect(w * 0.3, horizon + floorH * 0.12, w * 0.4, floorH * 0.52, 16, '0.26');
    // 被子横带
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    roundRectPath(ctx, w * 0.3, horizon + floorH * 0.38, w * 0.4, floorH * 0.26, 14);
    ctx.fill();
    // 枕头
    ctx.fillStyle = 'rgba(255,255,255,0.32)';
    roundRectPath(ctx, w * 0.335, horizon + floorH * 0.16, w * 0.13, floorH * 0.1, 8); ctx.fill();
    roundRectPath(ctx, w * 0.535, horizon + floorH * 0.16, w * 0.13, floorH * 0.1, 8); ctx.fill();
    // 床头柜 + 台灯
    softRect(w * 0.18, horizon + floorH * 0.16, w * 0.08, floorH * 0.15, 8, '0.2', 8);
    softRect(w * 0.74, horizon + floorH * 0.16, w * 0.08, floorH * 0.15, 8, '0.2', 8);
    ctx.fillStyle = 'rgba(255,244,214,0.5)';
    ctx.beginPath(); ctx.ellipse(w * 0.22, horizon + floorH * 0.12, w * 0.016, floorH * 0.045, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(w * 0.78, horizon + floorH * 0.12, w * 0.016, floorH * 0.045, 0, 0, Math.PI * 2); ctx.fill();
    // 床前地毯
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    roundRectPath(ctx, w * 0.32, horizon + floorH * 0.7, w * 0.36, floorH * 0.16, 10);
    ctx.fill();
  } else if (currentRoom === 'study') {
    // 书桌 + 屏幕
    softRect(w * 0.14, horizon + floorH * 0.12, w * 0.34, floorH * 0.2, 10, '0.26');
    softRect(w * 0.24, horizon - floorH * 0.02, w * 0.13, floorH * 0.12, 4, '0.22', 6);
    ctx.fillStyle = 'rgba(220,232,236,0.35)';
    roundRectPath(ctx, w * 0.248, horizon - floorH * 0.012, w * 0.114, floorH * 0.1, 3);
    ctx.fill();
    // 椅子
    softRect(w * 0.24, horizon + floorH * 0.4, w * 0.11, floorH * 0.18, 10, '0.2', 10);
    // 书架 + 层板
    softRect(w * 0.62, horizon - floorH * 0.02, w * 0.26, floorH * 0.5, 8, '0.18');
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    for (let s = 1; s <= 3; s++) {
      ctx.fillRect(w * 0.635, horizon - floorH * 0.02 + floorH * 0.12 * s, w * 0.23, 3);
    }
    // 小地毯
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    roundRectPath(ctx, w * 0.16, horizon + floorH * 0.64, w * 0.3, floorH * 0.18, 10);
    ctx.fill();
  } else {
    // 走廊：长条地毯 + 边柜 + 圆镜
    ctx.fillStyle = 'rgba(255,255,255,0.13)';
    roundRectPath(ctx, w * 0.3, horizon + floorH * 0.2, w * 0.4, floorH * 0.68, 14);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.16)';
    ctx.lineWidth = 2;
    roundRectPath(ctx, w * 0.325, horizon + floorH * 0.26, w * 0.35, floorH * 0.56, 10);
    ctx.stroke();
    softRect(w * 0.05, horizon + floorH * 0.1, w * 0.13, floorH * 0.24, 8, '0.22', 10);
    ctx.strokeStyle = 'rgba(120,100,75,0.45)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(w * 0.115, horizon * 0.5, horizon * 0.22, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(230,238,240,0.3)';
    ctx.beginPath();
    ctx.arc(w * 0.115, horizon * 0.5, horizon * 0.2, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ===================== 渲染入口（含淡入过渡） =====================
let fadeRAF = null;
let realRenderToken = 0;

function visualFloorKey(product) {
  if (!window.VISUALIZER) return null;
  if (product?.key && window.VISUALIZER.floors.some(floor => floor.key === product.key)) return product.key;
  return product ? (window.VISUALIZER.productMap[product.id] || 'oak-natural') : 'oak-natural';
}

function visualFloor(product) {
  const key = visualFloorKey(product);
  return window.VISUALIZER?.floors.find(f => f.key === key) || null;
}

function visualRoomPath(product, room = currentRoom) {
  if (!window.VISUALIZER) return null;
  const scene = window.VISUALIZER.matrix[room] ? room : 'living';
  return window.VISUALIZER.matrix[scene][visualFloorKey(product)];
}

function productSwatch(product) {
  const floor = visualFloor(product);
  return floor ? floor.thumb : woodTexture(product.color, product.pattern);
}

let realCompareMode = false;
let compareProductA = null;
let compareProductB = null;
let compareEditSide = 'b';

function compareSideFor(product) {
  if (!realCompareMode) return '';
  if (compareProductA?.id === product.id) return 'A';
  if (compareProductB?.id === product.id) return 'B';
  return '';
}

function updateRealCompare(value = 50) {
  const hero = document.querySelector('.hero');
  const layer = document.getElementById('realCompareLayer');
  const line = document.getElementById('realCompareLine');
  const image = document.getElementById('realCompareImage');
  if (!hero || !layer || !line || !image) return;
  const pct = `${value}%`;
  layer.style.width = pct;
  line.style.left = pct;
  image.style.width = `${hero.clientWidth}px`;
  image.style.height = `${hero.clientHeight}px`;
}

function renderComparePair() {
  const pair = document.getElementById('realComparePair');
  if (!pair) return;
  pair.classList.toggle('show', realCompareMode);
  document.getElementById('compareSlotA')?.classList.toggle('active', compareEditSide === 'a');
  document.getElementById('compareSlotB')?.classList.toggle('active', compareEditSide === 'b');
  const nameA = document.getElementById('compareNameA');
  const nameB = document.getElementById('compareNameB');
  if (nameA) nameA.textContent = compareProductA?.name || '选择左侧地板';
  if (nameB) nameB.textContent = compareProductB?.name || '选择右侧地板';
  const labelA = document.getElementById('realCompareLabelA');
  const labelB = document.getElementById('realCompareLabelB');
  if (labelA) labelA.textContent = 'A · 左侧';
  if (labelB) labelB.textContent = 'B · 右侧';
}

function refreshCompareImages(resetSlider = false) {
  if (!realCompareMode || !compareProductA || !compareProductB) return;
  const current = document.getElementById('realCurrent');
  const compareImage = document.getElementById('realCompareImage');
  if (!current || !compareImage) return;
  realRenderToken++;
  document.getElementById('realIncoming')?.classList.remove('show');
  document.getElementById('realScene')?.classList.remove('processing');
  current.src = visualRoomPath(compareProductB);
  current.dataset.path = visualRoomPath(compareProductB);
  compareImage.src = visualRoomPath(compareProductA);
  const input = document.getElementById('realCompareInput');
  if (resetSlider && input) input.value = 50;
  requestAnimationFrame(() => updateRealCompare(input?.value || 50));
  document.getElementById('realStatus').textContent = `双款对比 · ${ROOM_NAMES[currentRoom]}`;
  renderComparePair();
  renderStrip('all');
}

function setCompareEditSide(side) {
  compareEditSide = side === 'a' ? 'a' : 'b';
  renderComparePair();
}

function chooseCompareProduct(product) {
  if (compareEditSide === 'a') {
    if (compareProductB?.id === product.id) [compareProductA, compareProductB] = [compareProductB, compareProductA];
    else compareProductA = product;
  } else {
    if (compareProductA?.id === product.id) [compareProductA, compareProductB] = [compareProductB, compareProductA];
    else compareProductB = product;
  }
  refreshCompareImages();
}

function swapCompareProducts() {
  [compareProductA, compareProductB] = [compareProductB, compareProductA];
  refreshCompareImages();
}

function setRealCompare(enabled) {
  const hero = document.querySelector('.hero');
  const current = document.getElementById('realCurrent');
  const compareImage = document.getElementById('realCompareImage');
  if (!hero || !current || !compareImage || !window.VISUALIZER) return;
  if (enabled) {
    if (!selectedProduct) selectProduct(PRODUCTS[0].id);
    compareProductA = selectedProduct;
    const currentIndex = Math.max(0, PRODUCTS.findIndex(product => product.id === selectedProduct.id));
    compareProductB = PRODUCTS[(currentIndex + 1) % PRODUCTS.length] || selectedProduct;
    compareEditSide = 'b';
    realCompareMode = true;
    hero.classList.add('real-compare');
    const compareButton = document.getElementById('realCompareBtn');
    compareButton?.classList.add('active');
    const compareButtonLabel = compareButton?.querySelector('span');
    if (compareButtonLabel) compareButtonLabel.textContent = '退出对比';
    refreshCompareImages(true);
  } else {
    const returnProduct = compareProductA || selectedProduct;
    realCompareMode = false;
    hero.classList.remove('real-compare');
    const compareButton = document.getElementById('realCompareBtn');
    compareButton?.classList.remove('active');
    const compareButtonLabel = compareButton?.querySelector('span');
    if (compareButtonLabel) compareButtonLabel.textContent = '地板对比';
    renderComparePair();
    if (returnProduct && selectedProduct?.id !== returnProduct.id) selectProduct(returnProduct.id);
    else {
      current.src = visualRoomPath(returnProduct);
      current.dataset.path = visualRoomPath(returnProduct);
      document.getElementById('realStatus').textContent = `AI 已识别地面 · ${returnProduct?.name || '真实材质'}`;
      renderStrip('all');
    }
  }
}

function toggleRealCompare() {
  setRealCompare(!realCompareMode);
}

async function toggleRealFullscreen() {
  const hero = document.querySelector('.hero');
  if (!hero) return;
  try {
    if (!document.fullscreenElement) await hero.requestFullscreen();
    else await document.exitFullscreen();
  } catch (_) {}
}

function downloadRealPreview() {
  if (!selectedProduct) selectProduct(PRODUCTS[0].id);
  const link = document.createElement('a');
  link.href = visualRoomPath(selectedProduct);
  link.download = `${currentRoom}-${selectedProduct.id}-preview.jpg`;
  link.click();
}

async function renderRealRoom(product, animate = true) {
  const shell = document.getElementById('realScene');
  const current = document.getElementById('realCurrent');
  const incoming = document.getElementById('realIncoming');
  const status = document.getElementById('realStatus');
  const path = visualRoomPath(product);
  const floor = visualFloor(product);
  if (!shell || !current || !incoming || !path) return;

  const token = ++realRenderToken;
  status.textContent = `AI 已识别地面 · ${floor?.name || '真实材质'}`;
  if (!animate || current.dataset.path === path || current.getAttribute('src') === path) {
    current.src = path;
    current.dataset.path = path;
    incoming.classList.remove('show');
    shell.classList.remove('processing');
    return;
  }

  shell.classList.add('processing');
  incoming.classList.remove('show');
  incoming.src = path;
  try { await incoming.decode(); } catch (_) {}
  if (token !== realRenderToken) return;
  await new Promise(resolve => setTimeout(resolve, 430));
  if (token !== realRenderToken) return;
  incoming.classList.add('show');
  await new Promise(resolve => setTimeout(resolve, 540));
  if (token !== realRenderToken) return;
  current.src = path;
  current.dataset.path = path;
  incoming.classList.remove('show');
  shell.classList.remove('processing');
}

function renderRoom(product, animate = true) {
  if (document.getElementById('realScene') && window.VISUALIZER) {
    renderRealRoom(product, animate);
    return;
  }
  const canvas = document.getElementById('roomCanvas');
  const rect = canvas.parentElement.getBoundingClientRect();
  if (rect.width < 10 || rect.height < 10) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const pw = Math.round(rect.width * dpr), ph = Math.round(rect.height * dpr);
  const sizeChanged = canvas.width !== pw || canvas.height !== ph;

  const scene = document.createElement('canvas');
  scene.width = pw; scene.height = ph;
  const sctx = scene.getContext('2d');
  sctx.scale(dpr, dpr);
  renderScene(sctx, rect.width, rect.height, product);

  const ctx = canvas.getContext('2d');
  if (fadeRAF) { cancelAnimationFrame(fadeRAF); fadeRAF = null; }

  if (sizeChanged || !animate) {
    canvas.width = pw; canvas.height = ph;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(scene, 0, 0);
    return;
  }

  const prev = document.createElement('canvas');
  prev.width = pw; prev.height = ph;
  prev.getContext('2d').drawImage(canvas, 0, 0);

  const start = performance.now(), dur = 480;
  function step(now) {
    const t = Math.min(1, (now - start) / dur);
    const e = 1 - Math.pow(1 - t, 3);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.drawImage(prev, 0, 0);
    ctx.globalAlpha = e;
    ctx.drawImage(scene, 0, 0);
    ctx.globalAlpha = 1;
    if (t < 1) fadeRAF = requestAnimationFrame(step);
    else fadeRAF = null;
  }
  fadeRAF = requestAnimationFrame(step);
}

// ===================== 产品列表 =====================
function renderStrip(filter = 'all') {
  const strip = document.getElementById('productStrip');
  const filtered = filter === 'all' ? PRODUCTS : PRODUCTS.filter(p => p.category === filter);
  document.getElementById('productCount').textContent = `${filtered.length} 款在售 · 点击查看铺装效果`;

  strip.innerHTML = filtered.map(p => {
    const compareSide = compareSideFor(p);
    return `
    <div class="p-card ${selectedProduct?.id === p.id && !realCompareMode ? 'selected' : ''} ${compareSide ? `compare-${compareSide.toLowerCase()}` : ''}" onclick="selectProduct('${p.id}')">
      <div class="p-thumb" style="background-image:url('${productSwatch(p)}')">
        ${p.hot ? '<span class="hot-tag">热销</span>' : ''}
        ${compareSide ? `<span class="compare-side-tag">${compareSide}</span>` : ''}
      </div>
      <div class="p-info">
        <div class="name">${p.name}</div>
        <div class="spec">${p.category} · ${p.thickness} · ${p.surface}</div>
        <div class="price">¥${p.price}<small>/m²</small><del>¥${p.origPrice}</del></div>
      </div>
    </div>
  `}).join('');

  const sel = strip.querySelector('.p-card.selected');
  if (sel) sel.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
}

// ===================== 选中产品 =====================
function selectProduct(id) {
  const p = findProduct(id);
  if (!p) return;
  if (realCompareMode && USE_VISUALIZER_CATALOG) {
    chooseCompareProduct(p);
    return;
  }
  selectedProduct = p;

  document.getElementById('heroHint').classList.add('hidden');

  const dc = document.getElementById('detailCard');
  dc.innerHTML = `
    <button class="detail-close" onclick="closeDetail()">✕</button>
    <div class="detail-swatch" style="background-image:url('${productSwatch(p)}')"></div>
    <div class="detail-name">${p.name}</div>
    <div class="detail-code">产品编号 ${p.id}</div>
    <div class="detail-tags">${p.tags.map(t => `<span class="detail-tag">${t}</span>`).join('')}</div>
    <div class="detail-price-row">
      <span class="cur">¥${p.price}<small>/m²</small></span>
      <span class="ori">¥${p.origPrice}/m²</span>
    </div>
    <p class="detail-desc">${p.desc}</p>
    <div class="detail-specs">
      <div class="spec-item"><div class="label">材质</div><div class="value">${p.wood}</div></div>
      <div class="spec-item"><div class="label">厚度</div><div class="value">${p.thickness}</div></div>
      <div class="spec-item"><div class="label">规格</div><div class="value">${p.size}</div></div>
      <div class="spec-item"><div class="label">表面工艺</div><div class="value">${p.surface}</div></div>
    </div>
    <div class="detail-location">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
      <div>门店实物位置 <strong>${p.location}</strong></div>
    </div>
    <div class="calc-box">
      <div class="calc-head">面积估价<span>材料 + ${INSTALL_NAME(p)}费</span></div>
      <div class="calc-row">
        <input id="areaInput" type="number" min="1" placeholder="输入铺装面积" value="${lastArea || ''}">
        <span class="unit">m²</span>
      </div>
      <div class="calc-result" id="calcResult"></div>
    </div>
  `;
  if (!MANUAL_DETAIL) dc.classList.add('visible');
  const areaInput = document.getElementById('areaInput');
  areaInput.addEventListener('input', () => {
    lastArea = parseFloat(areaInput.value) || null;
    updateCalc();
  });
  updateCalc();

  renderRoom(p);
  updateHeroLabel();
  renderStrip(document.querySelector('.filter-btn.active')?.dataset.filter || 'all');
  resetIdleTimer();
}

function updateCalc() {
  const el = document.getElementById('calcResult');
  if (!el || !selectedProduct) return;
  const p = selectedProduct;
  if (!lastArea || lastArea <= 0) {
    el.innerHTML = `输入面积自动估算，${INSTALL_NAME(p)} ${INSTALL_FEE(p)}元/m²`;
    return;
  }
  const material = p.price * lastArea;
  const install = INSTALL_FEE(p) * lastArea;
  el.innerHTML = `材料 ¥${money(material)} + 安装 ¥${money(install)}<br>合计约 <span class="total">¥${money(material + install)}</span>`;
}

function closeDetail() {
  document.getElementById('detailCard').classList.remove('visible');
  document.getElementById('realDetailBtn')?.classList.remove('active');
}

function toggleDetail() {
  if (!selectedProduct) selectProduct(PRODUCTS[0].id);
  const card = document.getElementById('detailCard');
  const willOpen = !card.classList.contains('visible');
  card.classList.toggle('visible', willOpen);
  document.getElementById('realDetailBtn')?.classList.toggle('active', willOpen);
}

function updateHeroLabel() {
  const label = document.getElementById('heroLabel');
  label.textContent = ROOM_NAMES[currentRoom] + (selectedProduct ? ' · ' + selectedProduct.name : ' · AI 真实铺装预览');
}

// ===================== 语音播报 =====================
function speak(text) {
  if (!voiceOn || !('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'zh-CN';
  u.rate = 1.05;
  speechSynthesis.speak(u);
}

function toggleVoice() {
  voiceOn = !voiceOn;
  const btn = document.getElementById('voiceBtn');
  btn.classList.toggle('on', voiceOn);
  if (voiceOn) speak('语音播报已开启');
  else if ('speechSynthesis' in window) speechSynthesis.cancel();
}

// ===================== 聊天系统（打字机输出） =====================
function typeInto(el, html, done) {
  const tokens = html.match(/<[^>]+>|[^]/g) || [];
  const chat = document.getElementById('chatMessages');
  let i = 0, buf = '';
  (function tick() {
    let n = 2;
    while (n-- > 0 && i < tokens.length) buf += tokens[i++];
    el.innerHTML = buf;
    chat.scrollTop = chat.scrollHeight;
    if (i < tokens.length) setTimeout(tick, 22);
    else if (done) done();
  })();
}

function addMessage(text, type = 'ai', extras = '') {
  const chatMessages = document.getElementById('chatMessages');
  const msg = document.createElement('div');
  msg.className = `message ${type}`;

  if (type === 'ai') {
    msg.innerHTML = `<div class="msg-avatar">木</div><div class="msg-bubble"></div>`;
    chatMessages.appendChild(msg);
    const bubble = msg.querySelector('.msg-bubble');
    speak(text.replace(/<[^>]*>/g, ''));
    typeInto(bubble, text, () => {
      if (extras) bubble.insertAdjacentHTML('beforeend', extras);
      chatMessages.scrollTop = chatMessages.scrollHeight;
    });
  } else {
    msg.innerHTML = `<div class="msg-bubble">${text}</div>`;
    chatMessages.appendChild(msg);
  }
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function showTyping() {
  const chatMessages = document.getElementById('chatMessages');
  const typing = document.createElement('div');
  typing.className = 'message ai';
  typing.id = 'typingMsg';
  typing.innerHTML = `<div class="msg-avatar">木</div><div class="typing-indicator"><span></span><span></span><span></span></div>`;
  chatMessages.appendChild(typing);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function removeTyping() {
  const el = document.getElementById('typingMsg');
  if (el) el.remove();
}

function setQuickReplies(options) {
  const qr = document.getElementById('quickReplies');
  qr.innerHTML = options.map(o => `<button class="quick-reply-btn" onclick="handleQuickReply('${o}')">${o}</button>`).join('');
}

function setLiveQuickReplies(options = []) {
  const qr = document.getElementById('quickReplies');
  qr.replaceChildren();
  options.slice(0, 4).forEach(option => {
    const button = document.createElement('button');
    button.className = 'quick-reply-btn';
    button.type = 'button';
    button.textContent = option;
    button.addEventListener('click', () => handleQuickReply(option));
    qr.appendChild(button);
  });
}

function handleQuickReply(text) {
  addMessage(LIVE_AI ? escapeHTML(text) : text, 'user');
  resetIdleTimer();
  if (LIVE_AI) processLiveAI(text);
  else processUserInput(text);
}

function sendMessage() {
  const input = document.getElementById('chatInput');
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  addMessage(LIVE_AI ? escapeHTML(text) : text, 'user');
  resetIdleTimer();
  if (LIVE_AI) processLiveAI(text);
  else processUserInput(text);
}

function setLiveInputBusy(isBusy) {
  liveAIRequestPending = isBusy;
  const input = document.getElementById('chatInput');
  const send = document.getElementById('sendBtn');
  if (input) input.disabled = isBusy;
  if (send) send.disabled = isBusy;
}

function extractDemoProfile(text) {
  const patch = {};
  if (/(公司|办公室|门店|商铺|展厅|工作室|商业)/.test(text)) patch.usage_type = 'business';
  else if (/(家里|家庭|新房|旧房|客厅|卧室|书房|儿童房|全屋)/.test(text)) patch.usage_type = 'home';

  const rooms = ['客厅', '卧室', '书房', '儿童房', '玄关', '办公室', '门店', '工作室', '全屋'].filter(room => text.includes(room));
  if (rooms.length) patch.rooms = rooms;
  const area = text.match(/(\d+(?:\.\d+)?)\s*(?:平方米|平米|平方|㎡|m²|平)/i);
  if (area && !/(预算|每平|单价)/.test(text.slice(Math.max(0, area.index - 8), area.index + area[0].length + 4))) patch.area_m2 = Number(area[1]);
  const budget = text.match(/(?:预算|每平|单价)[^\d]{0,8}(\d+(?:\.\d+)?)/)
    || text.match(/(\d+(?:\.\d+)?)\s*元\s*(?:以内|以下|左右|以上)/);
  if (budget) patch.budget_per_m2 = Number(budget[1]);

  if (/(采光差|比较暗|昏暗|暗房)/.test(text)) patch.lighting = 'dim';
  else if (/(采光很好|采光好|很亮|明亮)/.test(text)) patch.lighting = 'bright';
  else if (/(采光一般|采光中等)/.test(text)) patch.lighting = 'medium';
  if (/(暖色|偏暖|温馨|暖调)/.test(text)) patch.temperature = 'warm';
  else if (/(冷色|偏冷|冷调)/.test(text)) patch.temperature = 'cool';
  else if (/(浅色显大|风格.*不确定|冷暖都可以)/.test(text)) patch.temperature = 'neutral';

  const styles = ['现代简约', '北欧', '日式', '奶油风', '原木风', '轻奢', '法式', '复古', '工业风', '新中式'].filter(style => text.includes(style));
  if (styles.length) patch.style = styles;
  const priorities = [];
  if (/(好打理|易清洁|省心)/.test(text)) priorities.push('easy_clean');
  if (/(耐磨|耐脏|防刮|抗刮)/.test(text)) priorities.push('wear_resistant');
  if (/(显大|提亮)/.test(text)) priorities.push('brighten');
  if (/(高级|高端|质感)/.test(text)) priorities.push('premium');
  if (/(设计感|个性|人字拼)/.test(text)) priorities.push('design');
  if (/(天然|实木|原木)/.test(text)) priorities.push('natural');
  if (priorities.length) patch.priorities = [...new Set(priorities)];

  if (/(没有孩子宠物|没有孩子和宠物|都没有|无孩子宠物)/.test(text)) {
    patch.kids = false; patch.pets = false;
  } else if (/(孩子|小孩|儿童|宠物|猫|狗)/.test(text)) {
    if (/(孩子|小孩|儿童)/.test(text)) patch.kids = true;
    if (/(宠物|猫|狗)/.test(text)) patch.pets = true;
  }
  if (/(没有地暖|没地暖|无地暖)/.test(text)) patch.floor_heating = false;
  else if (/(有地暖|装地暖|地暖房)/.test(text)) patch.floor_heating = true;
  else if (/(地暖.*不确定|不确定.*地暖)/.test(text)) patch.floor_heating = null;
  if (/(明水|经常泡水|直接遇水)/.test(text)) patch.moisture = 'direct_water';
  else if (/(潮湿|返潮)/.test(text)) patch.moisture = 'damp';
  else if (/(普通干燥|正常干燥|没有潮湿|不潮湿|不是明水)/.test(text)) patch.moisture = 'normal';
  return patch;
}

function demoNextStep(profile) {
  if (!profile.usage_type) return ['先确认使用场景：地板是家里使用，还是公司、门店等商业空间使用？', ['家里用', '公司或门店用']];
  if (!profile.rooms?.length) return ['主要准备铺在哪些空间？', ['客厅和卧室', '全屋通铺', '只铺卧室', '办公室或门店']];
  if (!profile.area_m2) return ['预计铺装面积大约多少平方米？面积会影响材料损耗和总价。', ['约30平', '约60平', '约100平', '约150平']];
  if (!profile.lighting) return ['铺装空间的采光怎么样？', ['采光很好', '采光一般', '采光比较暗']];
  if (!profile.temperature && !profile.style?.length) return ['您更喜欢哪一种颜色和空间感觉？', ['喜欢暖色', '喜欢冷色', '浅色显大', '风格还不确定']];
  if (profile.kids === undefined && profile.pets === undefined && !profile.priorities?.length) return ['日常使用上更看重什么？家里有孩子或宠物吗？', ['有孩子或宠物', '没有孩子宠物', '耐磨耐脏优先', '天然质感优先']];
  if (profile.floor_heating === undefined) return ['铺装区域有地暖吗？这会直接影响可选型号。', ['有地暖', '没有地暖', '地暖情况还不确定']];
  if (!profile.moisture) return ['地面环境是否干燥？有没有潮湿或长期直接遇水的情况？', ['普通干燥区域', '有些潮湿', '会直接遇水']];
  if (!profile.budget_per_m2) return ['最后确认材料预算：大约考虑多少元每平方米？', ['200元以内', '预算每平300元', '预算每平400元', '500元以上']];
  return null;
}

function buildOfflineRecommendation(profile) {
  if (profile.moisture === 'direct_water') {
    return {
      reply: '目前这 5 款都没有明确的 100% 防水认证，不建议用于长期直接遇水区域。建议先确认防水等级，再选择对应产品。',
      quickReplies: ['不是明水区域', '我可以换材料', '咨询防水款'],
      recommendation: null
    };
  }
  const heatingSafe = new Set(['RD-OAK-180', 'RD-HB-120', 'RD-WO-190']);
  let candidates = PRODUCTS.filter(product => profile.floor_heating !== true || heatingSafe.has(product.id));
  const withinBudget = candidates.filter(product => product.price <= profile.budget_per_m2);
  if (withinBudget.length) candidates = withinBudget;
  const priorities = new Set(profile.priorities || []);
  const score = product => {
    let value = 0;
    if (product.price <= profile.budget_per_m2) value += 4;
    if (product.id === 'RD-GR-190' && (profile.usage_type === 'business' || profile.kids || profile.pets || priorities.has('wear_resistant') || priorities.has('easy_clean'))) value += 12;
    if (product.id === 'RD-OAK-180' && (profile.temperature === 'warm' || priorities.has('natural'))) value += 9;
    if (product.id === 'RD-WO-190' && (profile.temperature === 'cool' || profile.temperature === 'neutral' || profile.lighting === 'dim')) value += 9;
    if (product.id === 'RD-HB-120' && priorities.has('design')) value += 10;
    if (product.id === 'RD-WAL-190' && priorities.has('premium')) value += 10;
    return value;
  };
  candidates.sort((a, b) => score(b) - score(a) || a.price - b.price);
  const primary = candidates[0] || PRODUCTS[0];
  const backup = candidates[1] || PRODUCTS.find(product => product.id !== primary.id);
  const waste = primary.id === 'RD-HB-120' ? 0.15 : primary.id === 'RD-GR-190' ? 0.05 : 0.08;
  const installRate = primary.id === 'RD-HB-120' ? 65 : primary.id === 'RD-GR-190' ? 30 : 35;
  const material = Math.round(profile.area_m2 * (1 + waste) * primary.price);
  const installation = Math.round(profile.area_m2 * installRate);
  const reason = primary.id === 'RD-GR-190' ? '耐磨耐脏、容易打理且预算友好'
    : primary.id === 'RD-WO-190' ? '浅色能够提亮空间，整体清爽耐看'
      : primary.id === 'RD-HB-120' ? '人字拼设计感强，适合强调空间风格'
        : primary.id === 'RD-WAL-190' ? '深色沉稳，适合高级感空间'
          : '暖色自然、适用范围广，并且支持地暖';
  return {
    reply: `我更推荐「${primary.name}」（${primary.id}），活动材料价 ¥${primary.price}/m²，主要因为${reason}。${backup ? `备选是「${backup.name}」（¥${backup.price}/m²）。` : ''}<br>按 ${profile.area_m2}m² 估算，含损耗材料费约 ¥${money(material)}，安装约 ¥${money(installation)}，合计约 <strong>¥${money(material + installation)}</strong>。`,
    quickReplies: ['预算改为200元', '预算改为400元', '换成冷色风格', '预约量房'],
    recommendation: { primarySku: primary.id, backupSku: backup?.id || null }
  };
}

function buildOfflineDemoResponse(text) {
  liveAIProfile = { ...liveAIProfile, ...extractDemoProfile(text) };
  const step = demoNextStep(liveAIProfile);
  if (step) return { reply: step[0], quickReplies: step[1], recommendation: null };
  return buildOfflineRecommendation(liveAIProfile);
}

async function processLiveAI(text) {
  if (liveAIRequestPending) return;
  if (/预约.*量房|量房.*预约/.test(text)) {
    openBooking();
    return;
  }
  setLiveInputBusy(true);
  setLiveQuickReplies([]);
  showTyping();
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: text,
        messages: liveAIHistory.slice(-12),
        profile: liveAIProfile
      })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `AI 服务返回 ${response.status}`);

    liveAIProfile = data.profile || liveAIProfile;
    liveAIHistory.push({ role: 'user', content: text });
    liveAIHistory.push({ role: 'assistant', content: data.reply || '' });
    liveAIHistory = liveAIHistory.slice(-16);

    if (data.recommendation?.primarySku) {
      const product = findProduct(data.recommendation.primarySku);
      if (product) selectProduct(product.id);
      lastRecommended = [data.recommendation.primarySku, data.recommendation.backupSku].filter(Boolean);
    }

    const safeReply = escapeHTML(data.reply || '我再了解一下您的需求。').replace(/\n/g, '<br>');
    removeTyping();
    addMessage(safeReply);
    setLiveQuickReplies(data.quickReplies || []);
  } catch (error) {
    removeTyping();
    const data = buildOfflineDemoResponse(text);
    liveAIHistory.push({ role: 'user', content: text }, { role: 'assistant', content: data.reply });
    liveAIHistory = liveAIHistory.slice(-16);
    if (data.recommendation?.primarySku) {
      const product = findProduct(data.recommendation.primarySku);
      if (product) selectProduct(product.id);
      lastRecommended = [data.recommendation.primarySku, data.recommendation.backupSku].filter(Boolean);
    }
    addMessage(data.reply);
    setLiveQuickReplies(data.quickReplies);
  } finally {
    setLiveInputBusy(false);
    document.getElementById('chatInput')?.focus();
  }
}

function recChips(products, extraChipHtml = '') {
  lastRecommended = products.map(p => p.id);
  return `<div class="product-rec">${products.map(p =>
    `<div class="rec-chip" onclick="selectProduct('${p.id}')">${p.name} ¥${p.price}</div>`
  ).join('')}${extraChipHtml}</div>`;
}

// ===================== 对话数据 =====================
const GREETING = "您好，欢迎来到智慧地板体验中心！我是您的AI顾问小木。今天有几款特别受欢迎的地板正在做活动：";

const HOT_PRODUCTS_INTRO = USE_VISUALIZER_CATALOG
  ? PRODUCTS.slice(0, 3).map(product => ({ id: product.id, text: `${product.name} · ¥${product.price}/m²` }))
  : [
      { id: "SM-001", text: "橡木原生大板 · 活动价498/m²" },
      { id: "DC-001", text: "三层橡木·云杉芯 · 328/m²" },
      { id: "SPC-001", text: "SPC奶油原木 · 108/m²起" },
    ];

const GUIDED_QUESTIONS = [
  { q: "请问您这次是准备装修新房还是翻新旧居呢？", extract: "scenario", options: ["新房装修", "旧房翻新", "局部改造"] },
  { q: "大概是哪些房间需要铺地板呢？面积大约多少？", extract: "rooms", options: ["客厅+卧室", "全屋通铺", "只铺卧室"] },
  { q: "您家有安装地暖吗？或者计划安装？", extract: "heating", options: ["有地暖", "没有地暖", "打算装"] },
  { q: "装修预算上，地板这块您大概考虑什么价位呢？", extract: "budget", options: ["100-200元/m²", "200-400元/m²", "400元以上"] },
  { q: "您比较喜欢什么风格的装修呢？", extract: "style", options: ["现代简约", "北欧/日式", "中式/新中式", "轻奢"] },
  { q: "家里有小朋友或者宠物吗？耐磨防刮方面有需要特别注意的吗？", extract: "durability", options: ["有小孩", "有宠物", "都没有"] },
];

const IDLE_PROMPTS = [
  "对了，您如果看中哪款可以直接在产品列表里点开看效果哦，我也可以帮您做对比。",
  "我注意到最近很多客户选择多层实木地板，它兼顾了实木质感和稳定性，要不要了解下？",
  "如果您还在考虑中，可以切换客厅、卧室不同场景，直观感受铺好之后的样子。",
  "我们门店今天还有师傅可以免费上门量房哦，需要的话我帮您预约。",
];

// ===================== 意图处理 =====================
function processUserInput(text) {
  const lowerText = text.toLowerCase();

  // 具体产品
  const matchedProduct = PRODUCTS.find(p =>
    lowerText.includes(p.name.toLowerCase()) || lowerText.includes(p.id.toLowerCase())
  );
  if (matchedProduct) {
    selectProduct(matchedProduct.id);
    setTimeout(() => {
      showTyping();
      setTimeout(() => {
        removeTyping();
        addMessage(`好的，这款<strong>${matchedProduct.name}</strong>确实是很不错的选择！${matchedProduct.desc} 活动价<strong>¥${matchedProduct.price}/m²</strong>，实物就在我们门店<strong>${matchedProduct.location}</strong>，可以过去看看摸一下手感。`);
        setQuickReplies(['有更便宜的吗', '能铺地暖吗', '算下总价', '看看其他推荐']);
      }, 800);
    }, 300);
    return;
  }

  // 预约
  if (lowerText.includes('预约')) {
    showTyping();
    setTimeout(() => {
      removeTyping();
      addMessage('好的！填写一下联系方式，我马上为您安排师傅免费上门量房：');
      openBooking();
    }, 700);
    return;
  }

  // 面积算价
  const areaMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:个?平方米|平米|平方|㎡|m²|平)/);
  if (areaMatch) {
    const area = parseFloat(areaMatch[1]);
    showTyping();
    setTimeout(() => {
      removeTyping();
      if (selectedProduct && area > 0) {
        lastArea = area;
        const input = document.getElementById('areaInput');
        if (input) { input.value = area; updateCalc(); }
        const p = selectedProduct;
        const material = p.price * area, install = INSTALL_FEE(p) * area;
        addMessage(`帮您算好了！<strong>${area}m²</strong> 铺 <strong>${p.name}</strong>：<br>材料费 ¥${money(material)}（${p.price}元/m²）<br>${INSTALL_NAME(p)}费 ¥${money(install)}（${INSTALL_FEE(p)}元/m²）<br>合计约 <strong style="color:#C2452D">¥${money(material + install)}</strong>。今天下定还能再享活动优惠，要不要我帮您预约量房锁定价格？`);
        setQuickReplies(['预约量房', '有更便宜的吗', '看看其他推荐']);
      } else {
        addMessage(`好的，${area}m² 的面积我记下了。您先挑一款心仪的地板，我马上帮您算总价。这几款热销的可以先看看：`, 'ai', recChips(PRODUCTS.filter(p => p.hot).slice(0, 3)));
        lastArea = area;
        setQuickReplies(['性价比高的', '实木地板', '防水的']);
      }
    }, 800);
    return;
  }

  // 问总价但没给面积
  if (/(多少钱|总价|报价|算.{0,2}价)/.test(text)) {
    showTyping();
    setTimeout(() => {
      removeTyping();
      if (selectedProduct) {
        addMessage(`告诉我大概的铺装面积，我马上给您算${selectedProduct.name}的总价（含安装费）。比如直接说"客厅30平"。`);
        setQuickReplies(['30平', '60平', '100平']);
      } else {
        addMessage(`您先从产品列表挑一款地板，再告诉我面积，我来帮您算含安装费的总价。先看看这几款热销的？`, 'ai', recChips(PRODUCTS.filter(p => p.hot).slice(0, 3)));
        setQuickReplies(['性价比高的', '看看实木', '看看SPC']);
      }
    }, 800);
    return;
  }

  // 价格/预算
  if (lowerText.includes('便宜') || lowerText.includes('预算') || lowerText.includes('实惠') || lowerText.includes('100') || lowerText.includes('经济') || lowerText.includes('性价比')) {
    showTyping();
    setTimeout(() => {
      removeTyping();
      const affordable = PRODUCTS.filter(p => p.price <= 150).sort((a, b) => a.price - b.price);
      const recText = affordable.map(p => `<strong>${p.name}</strong> ¥${p.price}/m²`).join('、');
      addMessage(`如果注重性价比的话，我推荐这几款：${recText}。其中强化地板耐磨好打理，SPC地板完全防水零甲醛，各有优势。您更看重哪方面呢？`, 'ai', recChips(affordable.slice(0, 3)));
      setQuickReplies(['对比一下这几款', '看看SPC地板', '200-400价位的呢']);
    }, 1000);
    return;
  }

  // 地暖
  if (lowerText.includes('地暖') || lowerText.includes('暖气') || lowerText.includes('供暖')) {
    showTyping();
    setTimeout(() => {
      removeTyping();
      const heatingOk = PRODUCTS.filter(p =>
        p.tags.some(t => t.includes('地暖')) || p.category === 'SPC' || p.category === '多层实木'
      );
      addMessage(`地暖环境选地板确实要注意！推荐多层实木和SPC两类：多层实木纵横交错结构稳定不变形，脚感好；SPC石晶地板更薄导热更快。我们这几款都经过地暖环境实测认证：`, 'ai', recChips(heatingOk.slice(0, 4)));
      setQuickReplies(['对比一下这几款', '地暖用实木行吗', '算下总价']);
    }, 1000);
    return;
  }

  // 风格
  if (lowerText.includes('北欧') || lowerText.includes('日式') || lowerText.includes('简约') || lowerText.includes('ins')) {
    showTyping();
    setTimeout(() => {
      removeTyping();
      selectProduct('QH-003');
      addMessage(`北欧/日式风格推荐浅色系和灰色调地板。这款<strong>强化复合·北欧灰橡</strong>高级灰色调非常百搭，同步对花纹理逼真。如果预算充裕，<strong>多层白蜡木·经典</strong>的原木质感会更好。`, 'ai',
        recChips(['QH-003', 'DC-002', 'SPC-001'].map(findProduct).filter(Boolean)));
      setQuickReplies(['中式风格呢', '轻奢风格推荐', '对比一下这几款']);
    }, 1000);
    return;
  }

  if (lowerText.includes('中式')) {
    showTyping();
    setTimeout(() => {
      removeTyping();
      selectProduct('SM-001');
      addMessage(`中式/新中式风格非常适合深色暖色调的实木地板。首推<strong>橡木原生大板</strong>，手刮仿古工艺很有韵味；<strong>黑胡桃静雅</strong>则更显档次。人字拼花也很搭中式空间。`, 'ai',
        recChips(['SM-001', 'SM-002', 'DC-003'].map(findProduct).filter(Boolean)));
      setQuickReplies(['实木和多层有什么区别', '算下总价', '安装怎么收费']);
    }, 1000);
    return;
  }

  if (lowerText.includes('轻奢')) {
    showTyping();
    setTimeout(() => {
      removeTyping();
      selectProduct('SM-002');
      addMessage(`轻奢风格推荐深色系、质感突出的地板。<strong>黑胡桃静雅</strong>是首选，北美黑胡桃木色泽深邃高级；<strong>人字拼·胡桃色</strong>则增添空间设计感，很多设计师客户都会选。`, 'ai',
        recChips(['SM-002', 'DC-003'].map(findProduct).filter(Boolean)));
      setQuickReplies(['黑胡桃好在哪', '人字拼怎么铺', '有没有鱼骨拼']);
    }, 1000);
    return;
  }

  // 防水/厨卫
  if (lowerText.includes('防水') || lowerText.includes('厨房') || lowerText.includes('卫生间') || lowerText.includes('阳台')) {
    showTyping();
    setTimeout(() => {
      removeTyping();
      const spcProducts = PRODUCTS.filter(p => p.category === 'SPC');
      addMessage(`厨卫阳台这类潮湿空间，一定要选100%防水的SPC石晶地板。它的基材是石粉+PVC，完全不怕水泡。我们有3款SPC可以看看：`, 'ai', recChips(spcProducts));
      setQuickReplies(['SPC环保吗', '能铺地暖吗', '对比一下这几款']);
    }, 1000);
    return;
  }

  // 环保
  if (lowerText.includes('环保') || lowerText.includes('甲醛') || lowerText.includes('健康') || lowerText.includes('小孩') || lowerText.includes('宝宝')) {
    showTyping();
    setTimeout(() => {
      removeTyping();
      addMessage(`环保安全确实是最重要的！我们的产品环保标准如下：SPC石晶地板是<strong>零甲醛</strong>配方，最安全；实木地板天然无添加也很环保；多层和强化地板均达到<strong>E0级</strong>（甲醛释放≤0.05mg/m³），远优于国标。有小朋友的家庭我特别推荐SPC或实木。`);
      setQuickReplies(['SPC地板怎么样', '实木地板推荐', '检测报告能看吗']);
    }, 1000);
    return;
  }

  // 安装/服务
  if (lowerText.includes('安装') || lowerText.includes('铺装') || lowerText.includes('师傅') || lowerText.includes('上门') || lowerText.includes('量房')) {
    showTyping();
    setTimeout(() => {
      removeTyping();
      addMessage(`我们提供全套安装服务：免费上门量房→专业铺装→售后质保。锁扣地板安装费大约30-40元/m²，龙骨铺装60-80元/m²。下单后一般3-5天可以安排师傅上门。现在预约还能优先排期：`, 'ai',
        `<div class="product-rec"><div class="rec-chip action" onclick="openBooking()">立即预约免费量房</div></div>`);
      setQuickReplies(['预约量房', '锁扣和龙骨区别', '有质保吗']);
    }, 1000);
    return;
  }

  // 对比
  if (/(对比|区别|怎么选|哪个好)/.test(text)) {
    showTyping();
    setTimeout(() => {
      removeTyping();
      if (lastRecommended.length >= 2 && /对比/.test(text)) {
        addMessage('好的，我把这几款的关键参数放在一起，差异一目了然：');
        setTimeout(() => openCompare(lastRecommended), 700);
        setQuickReplies(['预约量房', '算下总价', '看看其他推荐']);
      } else {
        addMessage(`简单来说各类地板特点：<br><br>
<strong>实木</strong> — 脚感最好、最环保，但价格高、需保养<br>
<strong>多层实木</strong> — 兼顾实木质感+稳定性，性价比高，地暖友好<br>
<strong>强化</strong> — 最耐磨、价格最低，花色丰富<br>
<strong>SPC石晶</strong> — 零甲醛、100%防水、超薄，厨卫阳台通用<br><br>
您可以告诉我您的使用场景和预算，我来精准推荐。`);
        setQuickReplies(['客厅用什么好', '卧室推荐', '全屋通铺方案']);
      }
    }, 900);
    return;
  }

  // 推荐
  if (lowerText.includes('推荐') || lowerText.includes('其他') || lowerText.includes('看看') || lowerText.includes('还有')) {
    showTyping();
    setTimeout(() => {
      removeTyping();
      askGuidedQuestion();
    }, 800);
    return;
  }

  // 默认：引导式提问
  showTyping();
  setTimeout(() => {
    removeTyping();
    if (currentQuestionIdx > 0 && currentQuestionIdx <= GUIDED_QUESTIONS.length) {
      const prev = GUIDED_QUESTIONS[currentQuestionIdx - 1];
      userProfile[prev.extract] = text;
    }
    if (Object.keys(userProfile).length >= 3) {
      doSmartRecommendation();
    } else {
      askGuidedQuestion();
    }
  }, 800 + Math.random() * 500);
}

function askGuidedQuestion() {
  if (currentQuestionIdx >= GUIDED_QUESTIONS.length) currentQuestionIdx = 0;
  const q = GUIDED_QUESTIONS[currentQuestionIdx];
  addMessage(q.q);
  setQuickReplies(q.options);
  currentQuestionIdx++;
}

function doSmartRecommendation() {
  let recommended = [...PRODUCTS];

  if (userProfile.budget) {
    if (userProfile.budget.includes('100-200') || userProfile.budget.includes('便宜') || userProfile.budget.includes('实惠')) {
      recommended = recommended.filter(p => p.price <= 200);
    } else if (userProfile.budget.includes('200-400')) {
      recommended = recommended.filter(p => p.price >= 150 && p.price <= 450);
    } else if (userProfile.budget.includes('400')) {
      recommended = recommended.filter(p => p.price >= 350);
    }
  }

  if (userProfile.heating && (userProfile.heating.includes('有') || userProfile.heating.includes('装'))) {
    recommended = recommended.filter(p =>
      p.category !== '实木' || p.tags.some(t => t.includes('地暖'))
    );
  }

  if (recommended.length === 0) recommended = PRODUCTS.filter(p => p.hot);
  recommended = recommended.slice(0, 3);

  const recTexts = recommended.map(p => `<strong>${p.name}</strong>（${p.category}，¥${p.price}/m²）`).join('、');
  addMessage(`根据您的需求，我为您精选了这几款：${recTexts}。点击可以查看详情和铺装效果，也可以去对应展区实物体验。您最感兴趣哪一款？`, 'ai', recChips(recommended));
  setQuickReplies(['对比一下这几款', '算下总价', '预约量房']);
}

// ===================== 预约量房 =====================
function openBooking() {
  document.getElementById('bkErr').textContent = '';
  document.getElementById('bookingMask').classList.add('open');
  resetIdleTimer();
}
function closeBooking() {
  document.getElementById('bookingMask').classList.remove('open');
}
function submitBooking() {
  const name = document.getElementById('bkName').value.trim();
  const phone = document.getElementById('bkPhone').value.trim();
  const time = document.getElementById('bkTime').value;
  const err = document.getElementById('bkErr');
  if (!name) { err.textContent = '请填写您的称呼'; return; }
  if (!/^1\d{10}$/.test(phone)) { err.textContent = '请填写正确的11位手机号'; return; }
  closeBooking();
  showTyping();
  setTimeout(() => {
    removeTyping();
    addMessage(`预约成功！<strong>${name}</strong>，已为您安排师傅<strong>${time}</strong>上门免费量房${selectedProduct ? `，并同步登记了您关注的<strong>${selectedProduct.name}</strong>` : ''}。届时请保持 <strong>${phone}</strong> 畅通，师傅出发前会先与您电话确认。`);
    setQuickReplies(['了解安装服务', '看看其他推荐', '算下总价']);
  }, 900);
}

// ===================== 产品对比 =====================
function openCompare(ids) {
  const ps = ids.map(findProduct).filter(Boolean).slice(0, 3);
  if (ps.length < 2) return;
  const minPrice = Math.min(...ps.map(p => p.price));

  function attrs(p) {
    return {
      '耐磨': p.category === '强化' ? 'AC5级 超耐磨' : p.category === 'SPC' ? '商用级耐磨' : p.category === '多层实木' ? 'UV耐磨漆面' : '漆面 · 需保养',
      '防水': p.category === 'SPC' ? '100% 防水' : p.category === '强化' ? '基材防潮' : '怕水 · 需防潮',
      '地暖': p.tags.some(t => t.includes('地暖')) ? '专用认证' : (p.category === 'SPC' || p.category === '多层实木') ? '适用' : '不建议',
      '环保': p.category === 'SPC' ? '零甲醛' : p.category === '实木' ? '天然原木' : 'E0级',
    };
  }

  const rows = [
    ['价格', ps.map(p => `<span class="cmp-price">¥${p.price}<del>¥${p.origPrice}</del></span>${p.price === minPrice ? '<span class="cmp-best">最优</span>' : ''}`)],
    ['类别', ps.map(p => p.category)],
    ['材质', ps.map(p => p.wood)],
    ['厚度', ps.map(p => p.thickness)],
    ['耐磨', ps.map(p => attrs(p)['耐磨'])],
    ['防水', ps.map(p => attrs(p)['防水'])],
    ['地暖', ps.map(p => attrs(p)['地暖'])],
    ['环保', ps.map(p => attrs(p)['环保'])],
    ['门店位置', ps.map(p => p.location)],
  ];

  document.getElementById('cmpBody').innerHTML = `
    <table class="cmp-table">
      <tr>
        <th></th>
        ${ps.map(p => `<th><div class="cmp-swatch" style="background-image:url('${woodTexture(p.color, p.pattern)}')"></div>${p.name}</th>`).join('')}
      </tr>
      ${rows.map(([label, cells]) => `<tr><td>${label}</td>${cells.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}
      <tr>
        <td></td>
        ${ps.map(p => `<td><button class="quick-reply-btn" onclick="closeCompare();selectProduct('${p.id}')">看铺装效果</button></td>`).join('')}
      </tr>
    </table>
  `;
  document.getElementById('compareMask').classList.add('open');
  resetIdleTimer();
}
function closeCompare() {
  document.getElementById('compareMask').classList.remove('open');
}

// ===================== 冷场处理 =====================
function resetIdleTimer() {
  lastInteractionTime = Date.now();
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = setTimeout(handleIdle, 25000);
}

function handleIdle() {
  if (Date.now() - lastInteractionTime >= 24000) {
    if (LIVE_AI) {
      addMessage('您可以直接告诉我：用在哪里、喜欢暖色还是冷色、家里有没有孩子宠物，以及每平方米预算，我会边聊边帮您筛选。');
      setLiveQuickReplies(['家里用', '公司或门店用', '我还不确定风格']);
      resetIdleTimer();
      return;
    }
    const prompt = IDLE_PROMPTS[idlePromptIdx % IDLE_PROMPTS.length];
    idlePromptIdx++;
    showTyping();
    setTimeout(() => {
      removeTyping();
      addMessage(prompt);
      resetIdleTimer();
    }, 600);
  }
}

// ===================== 弹窗注入 =====================
function injectModals() {
  document.body.insertAdjacentHTML('beforeend', `
    <div class="modal-mask" id="bookingMask" onclick="if(event.target===this)closeBooking()">
      <div class="modal-card">
        <button class="modal-close" onclick="closeBooking()">✕</button>
        <div class="modal-title">预约免费上门量房</div>
        <div class="modal-sub">专业师傅上门测量 · 出全屋用料方案 · 全程免费</div>
        <label>您的称呼<input id="bkName" placeholder="怎么称呼您"></label>
        <label>手机号码<input id="bkPhone" maxlength="11" inputmode="numeric" placeholder="11位手机号"></label>
        <label>期望时间<select id="bkTime">
          <option>今天下午</option><option>明天上午</option><option>明天下午</option><option>本周末</option>
        </select></label>
        <div class="modal-err" id="bkErr"></div>
        <button class="modal-submit" onclick="submitBooking()">确认预约</button>
      </div>
    </div>
    <div class="modal-mask" id="compareMask" onclick="if(event.target===this)closeCompare()">
      <div class="modal-card wide">
        <button class="modal-close" onclick="closeCompare()">✕</button>
        <div class="modal-title">产品参数对比</div>
        <div class="modal-sub">关键指标一览，绿色标签为该项最优</div>
        <div id="cmpBody"></div>
      </div>
    </div>
  `);
}

// ===================== 初始化 =====================
function init() {
  injectModals();
  if (window.VISUALIZER && document.getElementById('realScene')) {
    Object.values(window.VISUALIZER.matrix).forEach(scene => {
      Object.values(scene).forEach(src => { const img = new Image(); img.src = src; });
    });
  }
  renderStrip();
  renderRoom(null, false);
  updateHeroLabel();

  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderStrip(btn.dataset.filter);
    });
  });

  document.querySelectorAll('.room-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.room-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentRoom = tab.dataset.room;
      if (realCompareMode) refreshCompareImages();
      else renderRoom(selectedProduct);
      updateHeroLabel();
    });
  });

  document.getElementById('chatInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendMessage();
  });

  if (LIVE_AI) {
    setTimeout(() => {
      const greeting = '您好，我是 AI 地板顾问小木。您可以像和店员聊天一样告诉我需求，我会逐步了解使用场景、风格、耐磨耐脏、地暖和预算，最后从当前 5 款里推荐最合适的一款。';
      addMessage(greeting);
      liveAIHistory = [{ role: 'assistant', content: greeting }];
      setLiveQuickReplies(['家里用', '公司或门店用', '我还不确定风格']);
      resetIdleTimer();
    }, 500);
  } else {
    setTimeout(() => {
      addMessage(GREETING);
      setTimeout(() => {
        const hotChips = HOT_PRODUCTS_INTRO.map(hp =>
          `<div class="rec-chip" onclick="selectProduct('${hp.id}')">${hp.text}</div>`
        ).join('');
        lastRecommended = HOT_PRODUCTS_INTRO.map(hp => hp.id);
        addMessage(`为您推荐今日热销款：`, 'ai', `<div class="product-rec">${hotChips}</div>`);
        setTimeout(() => {
          askGuidedQuestion();
          resetIdleTimer();
        }, 2200);
      }, 1600);
    }, 600);
  }
}

window.addEventListener('resize', () => {
  if (realCompareMode) updateRealCompare(document.getElementById('realCompareInput')?.value || 50);
  else renderRoom(selectedProduct, false);
});

init();
