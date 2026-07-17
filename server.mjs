import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 8787);

async function loadEnv(file) {
  try {
    const text = await readFile(file, 'utf8');
    for (const rawLine of text.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      const match = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/i);
      if (!match || process.env[match[1]]) continue;
      let value = match[2].trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      process.env[match[1]] = value;
    }
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

await loadEnv(path.join(ROOT, '.env.local'));

const API_KEY = process.env.DEEPSEEK_API_KEY || '';
const BASE_URL = (process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com').replace(/\/$/, '');
const MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash';
const catalog = JSON.parse(await readFile(path.join(ROOT, 'ai-recommendation-data.json'), 'utf8'));

const OZWOOD_KNOWLEDGE = `你是 Ozwood Australia 的中文地板顾问，只回答地板选购、产品区别、安装、养护、预算和 Ozwood 品牌知识。回答要自然、明确、控制在 180 个中文字以内，不要使用 Markdown 表格，也不要编造认证、库存、保修或价格。

除 Ozwood、官方产品名/编号、AU$ 和必要的行业缩写外，尽量使用中文。

当前演示产品：
1. 欧洲橡木 5106：工程木地板，1200×163×12mm，2.3472m²/箱，官网产品页促销参考 AU$49/m²（正式报价需确认）。真实木质感、结构稳定，普通干区使用。
2. 澳洲斑纹桉 SG1443-185：澳洲硬木工程地板，天然色差明显，木纹个性强，硬度和本土辨识度突出，需要当前报价。
3. 工程橡木人字拼 4301：工程木拼花，设计感强；放线、切割、损耗和安装费通常高于直铺，需要供货安装报价。
4. OZ2628 白橡木：12mm 强化地板，1215×197×12mm，2.39m²/箱，锁扣，防潮耐水，官网参考 AU$28.8/m²。防潮耐水不等于防水。
5. 灰橡混合地板：6.5mm，1220×183×6.5mm，2.2326m²/箱，E0、AC4、官网标注 waterproof，促销参考 AU$19.8/m²。适合孩子宠物、高频使用和预算优先项目。

演示里的五种视觉方向：明亮通透=浅白或浅橡色，帮助小空间和一般采光显得更开阔；温暖自然=原木与暖棕色，家庭感强且百搭；澳洲木材个性=明显天然色差和本土木纹；人字拼设计感=铺法是视觉焦点，但安装与损耗更高；冷灰现代=低饱和灰调，适合极简、现代或商用空间。

通用原则：工程木表层为真实木材，质感自然但要控制水分；强化地板价格友好、耐磨、快装；混合地板强调防水和日常省心，但天然木材触感较弱。所有安装都应检查基层平整度和含水率。官网价格存在不同页面记录，正式报价必须确认库存、批次、面积、损耗和现场安装条件。不确定的事实要明确说“需要向 Ozwood 确认”。`;

const PROFILE_KEYS = new Set([
  'usage_type', 'rooms', 'area_m2', 'lighting', 'space_size', 'temperature', 'style',
  'priorities', 'kids', 'pets', 'traffic', 'moisture', 'floor_heating', 'maintenance',
  'budget_per_m2', 'budget_is_hard_limit', 'install_tolerance'
]);
const ARRAY_KEYS = new Set(['rooms', 'style', 'priorities']);
const BOOLEAN_KEYS = new Set(['kids', 'pets', 'floor_heating', 'budget_is_hard_limit']);
const NUMBER_KEYS = new Set(['area_m2', 'budget_per_m2']);

function sendJson(res, status, value) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  });
  res.end(JSON.stringify(value));
}

async function readJson(req) {
  let body = '';
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 100_000) throw new Error('请求内容过大');
  }
  return body ? JSON.parse(body) : {};
}

function sanitizeProfilePatch(patch) {
  const clean = {};
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) return clean;
  for (const [key, value] of Object.entries(patch)) {
    if (!PROFILE_KEYS.has(key) || value === undefined) continue;
    if (ARRAY_KEYS.has(key)) {
      clean[key] = Array.isArray(value)
        ? value.filter(v => typeof v === 'string').map(v => v.trim()).filter(Boolean).slice(0, 8)
        : typeof value === 'string' ? [value.trim()].filter(Boolean) : [];
    } else if (BOOLEAN_KEYS.has(key)) {
      if (typeof value === 'boolean' || value === null) clean[key] = value;
    } else if (NUMBER_KEYS.has(key)) {
      const number = Number(value);
      if (Number.isFinite(number) && number > 0) clean[key] = number;
    } else if (typeof value === 'string' || value === null) {
      clean[key] = value;
    }
  }
  return clean;
}

function normalizeProfile(profile) {
  return sanitizeProfilePatch(profile);
}

function extractProfileLocally(message) {
  const patch = {};
  if (/(公司|办公室|门店|商铺|展厅|工作室|商业)/.test(message)) patch.usage_type = 'business';
  else if (/(家里|家庭|新房|旧房|客厅|卧室|书房|儿童房|全屋)/.test(message)) patch.usage_type = 'home';

  const rooms = ['客厅', '卧室', '书房', '儿童房', '玄关', '办公室', '门店', '工作室', '全屋']
    .filter(room => message.includes(room));
  if (rooms.length) patch.rooms = rooms;

  const area = message.match(/(\d+(?:\.\d+)?)\s*(?:平方米|平米|平方|㎡|m²|平)(?!\s*(?:方|米)?预算)/i);
  if (area) patch.area_m2 = Number(area[1]);
  const budget = message.match(/(?:预算|每平|单价)[^\d]{0,8}(\d+(?:\.\d+)?)/)
    || message.match(/(\d+(?:\.\d+)?)\s*(?:元)?\s*\/\s*(?:m²|㎡|平)/i)
    || message.match(/(\d+(?:\.\d+)?)\s*元\s*(?:以内|以下|左右|以上)/);
  if (budget) patch.budget_per_m2 = Number(budget[1]);
  if (/(不能超|不超过|最高|硬预算)/.test(message)) patch.budget_is_hard_limit = true;

  if (/(采光差|比较暗|昏暗|暗房)/.test(message)) patch.lighting = 'dim';
  else if (/(采光很好|采光好|很亮|明亮)/.test(message)) patch.lighting = 'bright';
  else if (/(采光一般|采光中等)/.test(message)) patch.lighting = 'medium';
  if (/(小户型|空间小|面积小)/.test(message)) patch.space_size = 'small';
  else if (/(大户型|空间大|面积大)/.test(message)) patch.space_size = 'large';

  if (/(暖色|偏暖|温馨|暖调)/.test(message)) patch.temperature = 'warm';
  else if (/(冷色|偏冷|冷调)/.test(message)) patch.temperature = 'cool';
  else if (/(浅色显大|浅色系|冷暖都可以)/.test(message)) patch.temperature = 'neutral';
  const styles = ['现代简约', '北欧', '日式', '奶油风', '原木风', '轻奢', '法式', '复古', '工业风', '新中式']
    .filter(style => message.includes(style));
  if (styles.length) patch.style = styles;

  const priorities = [];
  if (/(好打理|易清洁|容易清洁|省心)/.test(message)) priorities.push('easy_clean');
  if (/(耐磨|防刮|抗刮)/.test(message)) priorities.push('wear_resistant');
  if (/(显大|提亮|明亮)/.test(message)) priorities.push('brighten');
  if (/(高级|高端|质感)/.test(message)) priorities.push('premium');
  if (/(设计感|个性|人字拼)/.test(message)) priorities.push('design');
  if (/(天然|实木|原木)/.test(message)) priorities.push('natural');
  if (/(性价比|便宜|预算友好|实惠)/.test(message)) priorities.push('budget');
  if (priorities.length) patch.priorities = [...new Set(priorities)];

  if (/(没有孩子宠物|没有孩子和宠物|都没有|无孩子宠物)/.test(message)) {
    patch.kids = false;
    patch.pets = false;
  } else {
    if (/(没有孩子|没孩子|无小孩)/.test(message)) patch.kids = false;
    else if (/(孩子|小孩|儿童)/.test(message)) patch.kids = true;
    if (/(没有宠物|没宠物|无宠物)/.test(message)) patch.pets = false;
    else if (/(宠物|猫|狗)/.test(message)) patch.pets = true;
  }
  if (/(人流大|人多|高频|商用)/.test(message)) patch.traffic = 'high';
  if (/(明水|经常泡水|直接遇水)/.test(message)) patch.moisture = 'direct_water';
  else if (/(潮湿|返潮)/.test(message)) patch.moisture = 'damp';
  else if (/(普通干燥|正常干燥|没有潮湿|不潮湿)/.test(message)) patch.moisture = 'normal';
  if (/(没有地暖|没地暖|无地暖)/.test(message)) patch.floor_heating = false;
  else if (/(有地暖|装地暖|地暖房)/.test(message)) patch.floor_heating = true;
  else if (/(地暖.*不确定|不确定.*地暖)/.test(message)) patch.floor_heating = null;
  if (/(风格.*不确定|冷暖都可以|没有风格偏好)/.test(message)) patch.temperature = 'neutral';
  if (/(不想保养|低维护|少打理)/.test(message)) patch.maintenance = 'low';
  if (/(工期紧|快装|施工简单)/.test(message)) patch.install_tolerance = 'low';
  return patch;
}

function localConversationFallback(profile) {
  if (!profile.usage_type) return { missingField: 'usage_type', reply: '先确认使用场景：地板是家里使用，还是公司、门店等商业空间使用？', quickReplies: ['家里用', '公司或门店用'] };
  if (!profile.rooms?.length) return { missingField: 'rooms', reply: '主要准备铺在哪些空间？', quickReplies: ['客厅和卧室', '全屋通铺', '只铺卧室', '办公室或门店'] };
  if (!profile.area_m2) return { missingField: 'area_m2', reply: '预计铺装面积大约多少平方米？面积会影响材料损耗和总价。', quickReplies: ['约30平', '约60平', '约100平', '约150平'] };
  if (!profile.lighting) return { missingField: 'lighting', reply: '铺装空间的采光怎么样？', quickReplies: ['采光很好', '采光一般', '采光比较暗'] };
  if (!profile.temperature && !profile.style?.length) return { missingField: 'temperature', reply: '您更喜欢哪一种颜色和空间感觉？', quickReplies: ['喜欢暖色', '喜欢冷色', '浅色显大', '风格还不确定'] };
  if (profile.kids === undefined && profile.pets === undefined && !profile.priorities?.length) {
    return { missingField: 'priorities', reply: '日常使用上更看重什么？家里有孩子或宠物吗？', quickReplies: ['有孩子或宠物', '没有孩子宠物', '耐磨耐脏优先', '天然质感优先'] };
  }
  if (profile.floor_heating === undefined) return { missingField: 'floor_heating', reply: '铺装区域有地暖吗？这会直接影响可选型号。', quickReplies: ['有地暖', '没有地暖', '地暖情况还不确定'] };
  if (!profile.moisture) return { missingField: 'moisture', reply: '地面环境是否干燥？有没有潮湿或长期直接遇水的情况？', quickReplies: ['普通干燥区域', '有些潮湿', '会直接遇水'] };
  if (!profile.budget_per_m2) return { missingField: 'budget_per_m2', reply: '最后确认材料预算：大约考虑多少元每平方米？', quickReplies: ['200元以内', '预算每平300元', '预算每平400元', '500元以上'] };
  return { missingField: null, reply: '需求信息已经完整，可以开始推荐。', quickReplies: ['现在推荐'] };
}

function profileReadyForRecommendation(profile) {
  return Boolean(
    profile.usage_type
    && profile.rooms?.length
    && profile.area_m2
    && profile.lighting
    && (profile.temperature || profile.style?.length)
    && (profile.priorities?.length || profile.kids !== undefined || profile.pets !== undefined || profile.traffic)
    && profile.floor_heating !== undefined
    && profile.moisture
    && profile.budget_per_m2
  );
}

function suggestedRepliesFor(field, profile) {
  const replySets = {
    usage_type: ['家里用', '公司或门店用'],
    rooms: ['客厅和卧室', '全屋通铺', '只铺卧室', '办公室或门店'],
    area_m2: ['30平左右', '60平左右', '100平左右'],
    lighting: ['采光很好', '采光一般', '采光比较暗'],
    space_size: ['小户型', '中等空间', '大户型'],
    temperature: ['喜欢暖色', '喜欢冷色', '浅色显大', '还不确定'],
    style: ['现代简约', '北欧或日式', '奶油原木风', '轻奢有质感'],
    priorities: ['耐磨耐脏优先', '好打理优先', '天然质感优先', '设计感优先'],
    kids: ['有孩子或宠物', '没有孩子宠物', '耐磨耐脏优先'],
    pets: ['有孩子或宠物', '没有孩子宠物', '耐磨耐脏优先'],
    traffic: ['日常家庭使用', '使用频率较高', '商业高人流'],
    budget_per_m2: ['200元以内', '预算每平300元', '预算每平400元', '500元以上'],
    floor_heating: ['有地暖', '没有地暖', '还不确定'],
    moisture: ['普通干燥区域', '有些潮湿', '会直接遇水'],
    maintenance: ['尽量少维护', '正常维护即可', '更看重天然质感'],
    install_tolerance: ['希望快速安装', '正常工期即可', '可以接受复杂铺法']
  };
  if (replySets[field]) return replySets[field];
  if (!profile.usage_type) return replySets.usage_type;
  if (!profile.rooms?.length) return replySets.rooms;
  if (!profile.lighting) return replySets.lighting;
  if (!profile.temperature && !profile.style?.length) return replySets.temperature;
  if (profile.kids === undefined && profile.pets === undefined && !profile.priorities?.length) return replySets.priorities;
  if (!profile.budget_per_m2) return replySets.budget_per_m2;
  if (!profile.area_m2) return replySets.area_m2;
  if (profile.floor_heating === undefined) return replySets.floor_heating;
  if (!profile.moisture) return replySets.moisture;
  return ['现在推荐', '继续补充需求', '调整预算'];
}

function ensureQuickReplies(options, missingField, profile) {
  const supplied = Array.isArray(options)
    ? options.filter(option => typeof option === 'string' && option.trim()).map(option => option.trim())
    : [];
  if (supplied.length >= 2) return [...new Set(supplied)].slice(0, 4);
  const defaults = suggestedRepliesFor(missingField, profile);
  return [...new Set([...supplied, ...defaults])].slice(0, 4);
}

function coreInformationCount(profile) {
  return [
    profile.usage_type,
    profile.rooms?.length,
    profile.temperature || profile.style?.length,
    profile.priorities?.length || profile.kids !== undefined || profile.pets !== undefined || profile.traffic,
    profile.budget_per_m2,
    profile.area_m2,
    profile.lighting || profile.space_size,
    profile.floor_heating !== undefined || profile.moisture
  ].filter(Boolean).length;
}

function wantsRecommendation(message) {
  return /(推荐|哪款|哪个好|选什么|适合我|直接选|给我选|帮我挑|帮我定)/.test(message);
}

function add(scoreMap, id, amount, reason) {
  const item = scoreMap.get(id);
  item.score += amount;
  if (amount > 0 && reason && !item.reasons.includes(reason)) item.reasons.push(reason);
}

function calculateRecommendation(profile) {
  if (profile.moisture === 'direct_water') {
    return {
      status: 'no_safe_match',
      warning: '目前这 5 款都没有明确的 100% 防水认证，不建议用于长期直接遇水区域。'
    };
  }

  let candidates = [...catalog.products];
  const warnings = [];
  if (profile.floor_heating === true) {
    const confirmed = new Set(catalog.hardRules.confirmedFloorHeatingSkus);
    candidates = candidates.filter(product => confirmed.has(product.id));
  }
  if (profile.budget_per_m2 && profile.budget_is_hard_limit !== false) {
    const withinBudget = candidates.filter(product => product.price <= profile.budget_per_m2);
    if (withinBudget.length) candidates = withinBudget;
    else warnings.push(`当前没有单价不超过 ¥${Math.round(profile.budget_per_m2)}/m² 的完全匹配款，以下为最接近需求的方案。`);
  }
  if (!candidates.length) candidates = [...catalog.products];

  const scoreMap = new Map(candidates.map(product => [product.id, { product, score: 0, reasons: [] }]));
  const applyScore = (field, multiplier, reason) => {
    for (const product of candidates) {
      const fieldScore = product.scores[field] || 0;
      add(scoreMap, product.id, fieldScore * multiplier, fieldScore >= 4 ? reason : null);
    }
  };

  if (profile.temperature === 'warm') applyScore('warm', 4, '暖色木调符合您的偏好');
  if (profile.temperature === 'cool') applyScore('coolModern', 4, '冷色现代感更贴合您的审美');
  if (profile.lighting === 'dim' || profile.space_size === 'small') applyScore('brightenSpace', 3, '浅色调有助于提亮并放大空间');
  if (profile.space_size === 'small') applyScore('smallSpace', 2, '适合小空间使用');
  if (profile.usage_type === 'business' || profile.traffic === 'high') {
    applyScore('commercial', 4, '适合高频或商用空间');
    applyScore('wearResistance', 3, '耐磨表现更适合高频使用');
  }
  if (profile.kids === true || profile.pets === true) {
    applyScore('wearResistance', 3, '更耐磨，适合孩子或宠物家庭');
    applyScore('easyMaintenance', 3, '日常清洁维护更省心');
    applyScore('stainTolerance', 2, '颜色和纹理更耐脏');
  }
  if (profile.maintenance === 'low') applyScore('easyMaintenance', 3, '维护要求较低');
  if (profile.install_tolerance === 'low') applyScore('easyInstallation', 2, '施工更快捷、损耗更可控');

  const priorities = new Set(profile.priorities || []);
  if (priorities.has('easy_clean')) applyScore('easyMaintenance', 3, '容易清洁打理');
  if (priorities.has('wear_resistant')) applyScore('wearResistance', 3, '耐磨能力更突出');
  if (priorities.has('brighten')) applyScore('brightenSpace', 3, '能提亮空间');
  if (priorities.has('premium')) applyScore('premium', 3, '整体质感更高级');
  if (priorities.has('design')) applyScore('design', 3, '铺装设计感更强');
  if (priorities.has('budget')) applyScore('budgetFriendly', 3, '整体预算更友好');

  const styleText = (profile.style || []).join('');
  if (/(轻奢|复古|法式|设计)/.test(styleText)) applyScore('design', 3, '风格表达更鲜明');
  if (/(轻奢|高端|商务|沉稳)/.test(styleText)) applyScore('premium', 3, '更符合沉稳高级的空间气质');
  if (/(北欧|日式|奶油|原木)/.test(styleText)) applyScore('brightenSpace', 2, '色调适合北欧、日式或奶油风');
  if (/(现代|工业|极简)/.test(styleText)) applyScore('coolModern', 2, '适合现代简约空间');

  for (const item of scoreMap.values()) {
    const { product } = item;
    if (profile.budget_per_m2) {
      const difference = product.price - profile.budget_per_m2;
      if (difference <= 0) add(scoreMap, product.id, Math.max(0, 8 - Math.abs(difference) / 40), '价格在您的材料预算内');
      else add(scoreMap, product.id, -Math.min(12, difference / 25));
    }
    const roomText = (profile.rooms || []).join('');
    if (/书房|办公室/.test(roomText) && product.id === 'RD-WAL-190') add(scoreMap, product.id, 7, '适合书房或管理层办公室');
    if (/儿童房|卧室/.test(roomText) && product.id === 'RD-WO-190') add(scoreMap, product.id, 5, '浅色柔和，适合卧室或儿童房');
    if (/玄关|门店|工作室/.test(roomText) && product.id === 'RD-GR-190') add(scoreMap, product.id, 6, '更适合高频入口或工作空间');
  }

  const ranked = [...scoreMap.values()].sort((a, b) => b.score - a.score || a.product.price - b.product.price);
  const primary = ranked[0];
  const backup = ranked[1];
  const tradeoff = primary.product.id === 'RD-HB-120'
    ? '人字拼设计感强，但施工费和损耗高于直铺款。'
    : primary.product.id === 'RD-WAL-190'
      ? '深色质感高级，但暗房或小空间会显得更沉。'
      : primary.product.id === 'RD-GR-190'
        ? '耐磨、好打理且预算友好，但天然实木触感较弱。'
        : primary.product.id === 'RD-WO-190'
          ? '能提亮空间，但高污渍入口需要更勤清洁。'
          : '综合表现均衡，但不适合长期直接遇水区域。';

  let estimate = null;
  if (profile.area_m2) {
    const area = profile.area_m2;
    const material = area * (1 + primary.product.wasteRate) * primary.product.price;
    const installation = area * primary.product.installationPrice;
    estimate = {
      area,
      material: Math.round(material),
      installation: Math.round(installation),
      total: Math.round(material + installation),
      wasteRate: primary.product.wasteRate
    };
  }

  return {
    status: 'recommended',
    primarySku: primary.product.id,
    backupSku: backup?.product.id || null,
    reasons: primary.reasons.slice(0, 3),
    tradeoff,
    estimate,
    warnings
  };
}

function buildRecommendationReply(result) {
  if (result.status === 'no_safe_match') return `${result.warning}如果是厨房、阳台或经常有明水的区域，建议先确认防水等级，或者补充一款有明确防水认证的 SKU 后再推荐。`;
  const primary = catalog.products.find(product => product.id === result.primarySku);
  const backup = catalog.products.find(product => product.id === result.backupSku);
  const reasons = result.reasons.length ? result.reasons.join('、') : '综合场景、风格与预算匹配度最高';
  const warning = result.warnings?.length ? `\n需要说明：${result.warnings.join('')}` : '';
  const estimate = result.estimate
    ? `\n按 ${result.estimate.area}m² 估算，含 ${(result.estimate.wasteRate * 100).toFixed(0)}% 损耗的材料费约 ¥${result.estimate.material.toLocaleString('zh-CN')}，安装约 ¥${result.estimate.installation.toLocaleString('zh-CN')}，合计约 ¥${result.estimate.total.toLocaleString('zh-CN')}。`
    : '';
  return `我更推荐「${primary.name}」（${primary.id}），活动材料价 ¥${primary.price}/m²。主要因为：${reasons}。${result.tradeoff}${backup ? `\n备选是「${backup.name}」（¥${backup.price}/m²），可以在预算或风格变化时对比。` : ''}${estimate}${warning}`;
}

function systemPrompt() {
  const products = catalog.products.map(product => ({
    id: product.id, name: product.name, price: product.price, category: product.category,
    bestFor: product.bestFor, avoidFor: product.avoidFor, floorHeating: product.floorHeating
  }));
  return `你是“智慧地板”的中文 AI 导购小木。你的任务是自然地理解需求，每次只追问一个最有价值的问题，不要像问卷一样一次问很多题。\n
优先了解：家用还是商用、房间与面积、采光和空间大小、喜欢暖色/冷色及风格、孩子宠物和耐磨耐脏需求、地暖/潮湿情况、每平方米材料预算、维护和施工偏好。用户已经说过的信息不要重复问。\n
只允许引用下面产品目录中的事实，不要自行推荐具体型号、不要自行计算价格；最终选品和报价由服务端规则完成。遇到长期直接遇水要明确谨慎。\n
产品摘要：${JSON.stringify(products)}\n
只返回一个 JSON 对象，不要 Markdown，不要额外文字：
{"reply":"自然简洁的中文回复或单个追问","profilePatch":{},"missingField":"下一个希望了解的字段或null","readyToRecommend":false,"quickReplies":["2到4个简短选项"]}

profilePatch 可用字段和值：usage_type=home|business；rooms=字符串数组；area_m2=数字；lighting=bright|medium|dim；space_size=small|medium|large；temperature=warm|cool|neutral；style=字符串数组；priorities=easy_clean|wear_resistant|brighten|premium|design|natural|budget 的数组；kids/pets=true|false；traffic=low|medium|high；moisture=normal|damp|direct_water；floor_heating=true|false；maintenance=low|normal|high；budget_per_m2=数字；budget_is_hard_limit=true|false；install_tolerance=low|normal|high。没有明确表达的字段不要猜。`;
}

function parseModelJson(content) {
  const trimmed = String(content || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  if (!trimmed) throw new Error('模型返回空正文');
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start < 0 && end < 0) {
    return {
      reply: trimmed.slice(0, 1000),
      profilePatch: {},
      missingField: null,
      readyToRecommend: false,
      quickReplies: []
    };
  }
  if (start < 0 || end <= start) throw new Error('模型返回了不完整的 JSON');
  const jsonText = trimmed.slice(start, end + 1);
  const parsed = JSON.parse(jsonText);
  return {
    reply: typeof parsed.reply === 'string' ? parsed.reply.slice(0, 1000) : '我再了解一下您的需求。',
    profilePatch: sanitizeProfilePatch(parsed.profilePatch),
    missingField: typeof parsed.missingField === 'string' ? parsed.missingField : null,
    readyToRecommend: Boolean(parsed.readyToRecommend),
    quickReplies: Array.isArray(parsed.quickReplies)
      ? parsed.quickReplies.filter(v => typeof v === 'string').map(v => v.slice(0, 30)).slice(0, 4)
      : []
  };
}

async function callDeepSeek(message, history, profile, attempt = 0) {
  const safeHistory = Array.isArray(history)
    ? history.slice(-12).filter(item => item && ['user', 'assistant'].includes(item.role) && typeof item.content === 'string')
      .map(item => ({ role: item.role, content: item.content.slice(0, 2000) }))
    : [];
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45_000);
  try {
    const response = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: systemPrompt() },
          { role: 'system', content: `当前已确认的用户画像：${JSON.stringify(profile)}` },
          ...safeHistory,
          { role: 'user', content: message }
        ],
        thinking: { type: 'disabled' },
        ...(attempt === 0 ? { response_format: { type: 'json_object' } } : {}),
        max_tokens: 1200
      }),
      signal: controller.signal
    });
    if (!response.ok) {
      const details = await response.text();
      throw new Error(`DeepSeek API 返回 ${response.status}: ${details.slice(0, 300)}`);
    }
    const data = await response.json();
    try {
      return parseModelJson(data.choices?.[0]?.message?.content);
    } catch (error) {
      if (attempt < 1) return callDeepSeek(message, history, profile, attempt + 1);
      throw error;
    }
  } finally {
    clearTimeout(timer);
  }
}

async function handleChat(req, res) {
  if (!API_KEY || /your[_-]?key|replace|sk-xxx/i.test(API_KEY)) {
    return sendJson(res, 503, { error: 'DeepSeek API Key 尚未配置。请填写 .env.local 后重启服务。' });
  }
  const body = await readJson(req);
  const message = typeof body.message === 'string' ? body.message.trim().slice(0, 3000) : '';
  if (!message) return sendJson(res, 400, { error: '请输入一条消息。' });

  const existingProfile = normalizeProfile(body.profile);
  const localPatch = extractProfileLocally(message);
  const profileBeforeModel = { ...existingProfile, ...localPatch };
  let modelResult;
  try {
    modelResult = await callDeepSeek(message, body.messages, profileBeforeModel);
  } catch (error) {
    console.warn(`[${new Date().toISOString()}] DeepSeek response fallback: ${error.message}`);
    const fallback = localConversationFallback(profileBeforeModel);
    modelResult = { ...fallback, profilePatch: {}, missingField: null, readyToRecommend: false };
  }
  // 明确的按钮/关键词解析优先于模型，防止模型覆盖用户刚刚确认的字段。
  const profile = { ...existingProfile, ...modelResult.profilePatch, ...localPatch };
  const shouldRecommend = profileReadyForRecommendation(profile);

  if (shouldRecommend) {
    const recommendation = calculateRecommendation(profile);
    return sendJson(res, 200, {
      type: 'recommendation',
      reply: buildRecommendationReply(recommendation),
      profile,
      quickReplies: recommendation.status === 'recommended'
        ? ['预算改为200元', '预算改为400元', '换成冷色风格', '预约量房']
        : ['不是明水区域', '我可以换材料', '咨询防水款'],
      recommendation
    });
  }

  const nextStep = localConversationFallback(profile);
  return sendJson(res, 200, {
    type: 'question',
    reply: nextStep.reply,
    profile,
    quickReplies: nextStep.quickReplies,
    missingField: nextStep.missingField,
    recommendation: null
  });
}

async function handleOzwoodQuestion(req, res) {
  const body = await readJson(req);
  const question = typeof body.question === 'string' ? body.question.trim().slice(0, 2000) : '';
  if (!question) return sendJson(res, 400, { error: '请输入问题。' });
  if (!API_KEY || /your[_-]?key|replace|sk-xxx/i.test(API_KEY)) {
    return sendJson(res, 503, { error: 'AI 未配置，将使用浏览器本地知识库回答。' });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 18_000);
  try {
    const response = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${API_KEY}` },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: OZWOOD_KNOWLEDGE },
          { role: 'user', content: question }
        ],
        thinking: { type: 'disabled' },
        max_tokens: 500
      }),
      signal: controller.signal
    });
    if (!response.ok) {
      const details = await response.text();
      throw new Error(`DeepSeek API 返回 ${response.status}: ${details.slice(0, 240)}`);
    }
    const data = await response.json();
    const answer = String(data.choices?.[0]?.message?.content || '').trim();
    if (!answer) throw new Error('模型返回空正文');
    return sendJson(res, 200, { answer: answer.slice(0, 1200) });
  } finally {
    clearTimeout(timer);
  }
}

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml'
};

async function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === '/') pathname = '/index.html';
  if (/(^|\/)(?:\.env(?:\.|\/|$)|\.git(?:\/|$)|\.loci(?:\/|$))/i.test(pathname)) {
    return sendJson(res, 404, { error: 'Not found' });
  }
  const file = path.resolve(ROOT, `.${pathname}`);
  if (file !== ROOT && !file.startsWith(`${ROOT}${path.sep}`)) return sendJson(res, 403, { error: 'Forbidden' });
  try {
    const data = await readFile(file);
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream' });
    res.end(data);
  } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'EISDIR') return sendJson(res, 404, { error: 'Not found' });
    throw error;
  }
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'GET' && req.url === '/api/health') {
      return sendJson(res, 200, { ok: true, configured: Boolean(API_KEY), model: MODEL });
    }
    if (req.method === 'POST' && req.url === '/api/chat') return await handleChat(req, res);
    if (req.method === 'POST' && req.url === '/api/ozwood-question') return await handleOzwoodQuestion(req, res);
    if (req.method === 'GET' || req.method === 'HEAD') return await serveStatic(req, res);
    return sendJson(res, 405, { error: 'Method not allowed' });
  } catch (error) {
    const message = error.name === 'AbortError' ? 'AI 响应超时，请稍后再试。' : error.message;
    console.error(`[${new Date().toISOString()}]`, message);
    sendJson(res, 500, { error: message || '服务暂时不可用。' });
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`智慧地板 Demo 已启动：http://127.0.0.1:${PORT}/layout-bottom.html`);
  console.log(`DeepSeek：${API_KEY ? '已配置' : '未配置'} · 模型：${MODEL}`);
});
