import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

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

const OZWOOD_KNOWLEDGE = `你是 Ozwood Australia 的中文地板顾问，也是允许用户随时插问、修改需求或跳过流程的销售助手。固定问题流程只是辅助，绝不能强迫用户按顺序回答。先判断用户是在提问、提供需求、二者都有、要求直接推荐，还是明显跑题；问题必须先回答，绝不能把问题或插话误填进当前字段。

只输出 JSON：{"intent":"question|requirements|mixed|direct_recommend|off_topic","answer":"自然中文回答","profilePatch":{}}。requirements 只用一句话确认，不要提前给正式推荐；mixed 必须同时存在明确问题，没有疑问意图时不要判为 mixed。profilePatch 只填写用户明确表达的条件，没有明确表达就不要猜。允许字段和值：space=house|apartment|commercial|unknown；room=living|bedroom|study|whole|unknown；area=5–3000 的数字或 unknown；lighting=bright|medium|dim|unknown；style=light|warm|australian|herringbone|cool|unknown；household=kids|pregnant|elderly|pets|mixed|none|unknown；lifestyle=kids-pets|heavy|quiet|rental|unknown；subfloor=concrete|tiles|timber|unknown；moisture=waterproof|occasional|dry|unknown；service=supply-install|supply-only|sample|showroom|unknown；budget=under35|35-55|55plus|quote|unknown。关键画像未齐时若用户催促推荐，只给方向性建议，不要点名具体型号。

回答要自然、明确，通常不超过 220 个中文字，不要使用 Markdown 表格，也不要编造认证、库存、保修或价格。客户端会恢复流程，所以回答中不要重复当前预设问题。

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

async function readJson(req, maxBytes = 100_000) {
  let body = '';
  for await (const chunk of req) {
    body += chunk;
    if (body.length > maxBytes) throw new Error('请求内容过大');
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

function isDomainRelevantMessage(message) {
  return /(地板|木板|铺装|装修|翻新|房间|客厅|卧室|书房|厨房|基层|地暖|防水|材料预算|每平|采光|光线|色调|暖色|冷色|ozwood|floor|renovat|interior|subfloor)/i.test(message);
}

function isSlotAnswerMessage(message) {
  return /(?:\d+(?:\.\d+)?\s*(?:平方米|平米|平方|㎡|m²|平)|约?\s*\d+\s*平|平以内|[–—\-到至]\s*\d+\s*平|采光|光线|有地暖|没有地暖|没地暖|无地暖|预算每平|家里用|公司或门店|全屋通铺|只铺卧室|客厅和卧室|普通干燥|偶尔有水|直接遇水|温暖自然|明亮浅色|冷灰现代|喜欢暖色|喜欢冷色|暖色|冷色|偏暖|偏冷|耐磨耐脏|天然质感|性价比优先|有孩子或宠物|没有孩子宠物|还没测量|先看方案|风格还不确定)/i.test(message);
}

function extractLighting(message) {
  // 必须带采光/光线语境，避免「明亮浅色」被误判成采光。
  if (/(采光\s*(比较暗|偏暗|不好|较差|差)|光线\s*(比较暗|偏暗|暗|不足|差)|昏暗|暗房)/.test(message)) return 'dim';
  if (/(采光\s*(很好|不错|可以|充足|好|棒|足)|光线\s*(很好|不错|可以|充足|好|足|亮)|采光充足|光线充足)/.test(message)) return 'bright';
  if (/(采光\s*(一般|中等|还行)|光线\s*(一般|中等|还行))/.test(message)) return 'medium';
  return undefined;
}

function extractTemperature(message) {
  if (/(暖色|偏暖|温馨|暖调|温暖自然|喜欢暖)/.test(message)) return 'warm';
  if (/(冷色|偏冷|冷调|冷灰现代|喜欢冷)/.test(message)) return 'cool';
  if (/(浅色显大|浅色系|明亮浅色|冷暖都可以|风格还不确定|没有风格偏好)/.test(message)) return 'neutral';
  return undefined;
}

function applyContextualShortAnswer(message, missingField) {
  if (!missingField) return {};
  const t = String(message || '').trim();
  if (!t || t.length > 24) return {};

  if (missingField === 'lighting') {
    if (/^(很好|不错|可以|很亮|明亮|充足|好|亮)$/.test(t)) return { lighting: 'bright' };
    if (/^(一般|还行|中等|还好)$/.test(t)) return { lighting: 'medium' };
    if (/^(较暗|偏暗|暗|不好|比较暗)$/.test(t)) return { lighting: 'dim' };
    if (/^(不确定|不清楚|不知道)$/.test(t)) return { lighting: 'medium' };
  }
  if (missingField === 'temperature') {
    if (/^(暖|偏暖|暖色|温馨|暖调)$/.test(t)) return { temperature: 'warm' };
    if (/^(冷|偏冷|冷色|冷调)$/.test(t)) return { temperature: 'cool' };
    if (/^(浅色|中性|不确定|都可以|还不确定)$/.test(t)) return { temperature: 'neutral' };
  }
  if (missingField === 'floor_heating') {
    if (/^(有|有的|是|装了)$/.test(t)) return { floor_heating: true };
    if (/^(没有|没|无|否)$/.test(t)) return { floor_heating: false };
    if (/^(不确定|还不确定|不清楚)$/.test(t)) return { floor_heating: null };
  }
  if (missingField === 'moisture') {
    if (/^(干燥|普通|正常|不潮湿)$/.test(t)) return { moisture: 'normal' };
    if (/^(潮湿|返潮|偶尔有水|有点潮)$/.test(t)) return { moisture: 'damp' };
    if (/^(遇水|明水|经常泡水)$/.test(t)) return { moisture: 'direct_water' };
  }
  if (missingField === 'usage_type') {
    if (/^(家里|家用|住宅)$/.test(t)) return { usage_type: 'home' };
    if (/^(公司|门店|商用|商业)$/.test(t)) return { usage_type: 'business' };
  }
  if (missingField === 'area_m2') {
    const bare = t.match(/^约?\s*(\d+(?:\.\d+)?)\s*$/);
    if (bare) {
      const value = Number(bare[1]);
      if (Number.isFinite(value) && value >= 5 && value <= 3000) return { area_m2: value };
    }
  }
  return {};
}

function extractAreaM2(message) {
  if (/(还没测量|暂时不清楚|不清楚面积|不确定面积|面积还不确定)/.test(message)) return undefined;
  if (/(?:30\s*平?\s*以内|小于\s*30\s*平|不到\s*30\s*平)/.test(message)) return 25;
  if (/30\s*[–—\-到至]\s*70/.test(message)) return 50;
  if (/70\s*[–—\-到至]\s*120/.test(message)) return 95;
  if (/(?:120\s*平?\s*以上|大于\s*120\s*平)/.test(message)) return 150;
  // 只认面积单位；避免把「300元/平」里的数字当成面积。
  const area = message.match(/(\d+(?:\.\d+)?)\s*(?:平方米|平米|平方|㎡|m²|平)(?!\s*(?:方|米)?(?:预算|单价))/i);
  if (area) {
    const around = message.slice(Math.max(0, area.index - 6), area.index);
    if (/(?:元|¥|￥|\/)\s*$/.test(around)) return undefined;
    const value = Number(area[1]);
    if (Number.isFinite(value) && value >= 5 && value <= 3000) return value;
  }
  return undefined;
}

function hasExplicitBudgetCue(message) {
  return /(?:预算|单价|材料价|每平(?:米|方米)?(?:材料)?|\d+(?:\.\d+)?\s*元|¥|￥|\/\s*(?:m²|㎡|平))/.test(message);
}

function extractBudgetPerM2(message) {
  if (/(先看方案再定|先看方案|预算未定|预算先不定)/.test(message)) return { deferred: true };

  // 「200元以内 / 500元以上」
  let match = message.match(/(\d+(?:\.\d+)?)\s*元\s*(?:以内|以下|左右|以上)/);
  if (match) {
    const value = Number(match[1]);
    if (Number.isFinite(value) && value > 0) return { value };
  }

  // 「200–350元/平」——必须带「元」，避免把「70–120平」面积区间当成预算。
  match = message.match(/(\d+(?:\.\d+)?)\s*[–—\-到至]\s*(\d+(?:\.\d+)?)\s*元(?:\s*\/?\s*(?:平|m²|㎡))?/);
  if (match) {
    const low = Number(match[1]);
    const high = Number(match[2]);
    if (Number.isFinite(low) && Number.isFinite(high) && low > 0 && high > 0) {
      return { value: (low + high) / 2 };
    }
  }

  // 「300元/m²」「¥328/平」
  match = message.match(/(?:¥|￥)?\s*(\d+(?:\.\d+)?)\s*(?:元)?\s*\/\s*(?:m²|㎡|平)/i);
  if (match) {
    const value = Number(match[1]);
    if (Number.isFinite(value) && value > 0) return { value };
  }

  // 「预算每平300」「单价不超过200」「预算改为400元」
  match = message.match(/(?:预算|每平(?:米|方米)?|单价)[^\d]{0,10}(\d+(?:\.\d+)?)/);
  if (match) {
    const value = Number(match[1]);
    if (Number.isFinite(value) && value > 0) return { value };
  }

  return null;
}

/** 修复历史会话：面积区间中值曾被误写入 budget_per_m2。 */
function scrubConfusedAreaBudget(profile, message = '') {
  const clean = { ...profile };
  const areaRangeMidpoints = new Set([25, 50, 95, 150]);
  if (
    !hasExplicitBudgetCue(message)
    && clean.area_m2 != null
    && clean.budget_per_m2 != null
    && Number(clean.budget_per_m2) === Number(clean.area_m2)
    && areaRangeMidpoints.has(Number(clean.area_m2))
  ) {
    delete clean.budget_per_m2;
  }
  return clean;
}

function extractProfileLocally(message) {
  const patch = {};
  if (/(公司|办公室|门店|商铺|展厅|工作室|商业|公司或门店)/.test(message)) patch.usage_type = 'business';
  else if (/(家里|家庭|新房|旧房|客厅|卧室|书房|儿童房|全屋|家里用)/.test(message)) patch.usage_type = 'home';

  const rooms = ['客厅', '卧室', '书房', '儿童房', '玄关', '办公室', '门店', '工作室', '全屋']
    .filter(room => message.includes(room));
  if (rooms.length) patch.rooms = rooms;

  const area = extractAreaM2(message);
  if (area !== undefined) patch.area_m2 = area;

  const budget = extractBudgetPerM2(message);
  if (budget?.value != null) patch.budget_per_m2 = budget.value;
  if (/(不能超|不超过|最高|硬预算)/.test(message)) patch.budget_is_hard_limit = true;
  if (budget?.deferred) {
    patch.budget_is_hard_limit = false;
  }

  const lighting = extractLighting(message);
  if (lighting) patch.lighting = lighting;
  if (/(小户型|空间小|面积小)/.test(message)) patch.space_size = 'small';
  else if (/(大户型|空间大|面积大)/.test(message)) patch.space_size = 'large';

  const temperature = extractTemperature(message);
  if (temperature) patch.temperature = temperature;
  const styles = ['现代简约', '北欧', '日式', '奶油风', '原木风', '轻奢', '法式', '复古', '工业风', '新中式']
    .filter(style => message.includes(style));
  if (styles.length) patch.style = styles;

  const priorities = [];
  if (/(好打理|易清洁|容易清洁|省心)/.test(message)) priorities.push('easy_clean');
  if (/(耐磨|防刮|抗刮|耐磨耐脏)/.test(message)) priorities.push('wear_resistant');
  if (/(显大|提亮|明亮)/.test(message)) priorities.push('brighten');
  if (/(高级|高端|质感)/.test(message)) priorities.push('premium');
  if (/(设计感|个性|人字拼)/.test(message)) priorities.push('design');
  if (/(天然|实木|原木|天然质感)/.test(message)) priorities.push('natural');
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
  if (/(明水|经常泡水|直接遇水|经常直接遇水)/.test(message)) patch.moisture = 'direct_water';
  else if (/(潮湿|返潮|偶尔有水)/.test(message)) patch.moisture = 'damp';
  else if (/(普通干燥|正常干燥|没有潮湿|不潮湿)/.test(message)) patch.moisture = 'normal';
  if (/(没有地暖|没地暖|无地暖)/.test(message)) patch.floor_heating = false;
  else if (/(有地暖|装地暖|地暖房)/.test(message)) patch.floor_heating = true;
  else if (/(地暖.*不确定|不确定.*地暖)/.test(message) && /地暖/.test(message)) patch.floor_heating = null;
  if (/(风格.*不确定|冷暖都可以|没有风格偏好|风格还不确定)/.test(message)) patch.temperature = 'neutral';
  if (/(不想保养|低维护|少打理)/.test(message)) patch.maintenance = 'low';
  if (/(工期紧|快装|施工简单)/.test(message)) patch.install_tolerance = 'low';
  return patch;
}

function stripCasualLifestylePatch(patch) {
  const safe = { ...patch };
  delete safe.kids;
  delete safe.pets;
  delete safe.priorities;
  delete safe.traffic;
  return safe;
}

function corroborateModelProfilePatch(modelPatch, localPatch, message, intent) {
  if (!['requirements', 'mixed', 'direct_recommend'].includes(intent)) return {};
  const safe = sanitizeProfilePatch(modelPatch);
  const corroborated = {};
  for (const [key, value] of Object.entries(safe)) {
    if (Object.prototype.hasOwnProperty.call(localPatch, key)) {
      // 本地关键词解析优先，模型同字段交给最终 merge 中的 localPatch。
      continue;
    }
    if (key === 'area_m2' && extractAreaM2(message) === value) {
      corroborated[key] = value;
      continue;
    }
    if (key === 'rooms' && Array.isArray(value) && value.some(room => message.includes(room))) {
      corroborated[key] = value;
      continue;
    }
    if (key === 'usage_type' && ((value === 'home' && /(家里|家庭|新房|旧房)/.test(message)) || (value === 'business' && /(公司|办公室|门店|商铺|商业)/.test(message)))) {
      corroborated[key] = value;
      continue;
    }
    if (['lighting', 'temperature', 'moisture', 'floor_heating', 'budget_per_m2', 'space_size', 'maintenance', 'install_tolerance', 'kids', 'pets', 'traffic', 'priorities', 'style', 'budget_is_hard_limit'].includes(key)) {
      // 其余字段仅在本地已抽出时保留；避免模型凭空补全并跳过追问。
      continue;
    }
  }
  return corroborated;
}

function localConversationFallback(profile) {
  if (!profile.usage_type) return { missingField: 'usage_type', reply: '先从使用场景开始：这次主要是家庭空间还是商业空间？', quickReplies: ['家里用', '公司或门店用', '还没确定'] };
  if (!profile.rooms?.length) return { missingField: 'rooms', reply: '主要准备铺在哪些空间？', quickReplies: profile.usage_type === 'business' ? ['办公室', '门店', '多个商业区域', '还没确定'] : ['客厅和卧室', '全屋通铺', '只铺卧室', '还没确定'] };
  if (!profile.area_m2) return { missingField: 'area_m2', reply: '预计铺装面积大约多少平方米？不确定也可以先选范围。', quickReplies: ['30平以内', '30–70平', '70–120平', '还没测量'] };
  if (!profile.lighting) return { missingField: 'lighting', reply: '铺装空间的自然采光怎么样？', quickReplies: ['采光很好', '采光一般', '采光比较暗', '不确定'] };
  if (!profile.temperature && !profile.style?.length) return { missingField: 'temperature', reply: '更偏向哪种颜色和空间感觉？', quickReplies: ['温暖自然', '明亮浅色', '冷灰现代', '风格还不确定'] };
  if (profile.kids === undefined && profile.pets === undefined && !profile.priorities?.length) {
    return { missingField: 'priorities', reply: '日常使用中，哪项最影响你的选择？', quickReplies: ['有孩子或宠物', '耐磨耐脏优先', '天然质感优先', '性价比优先'] };
  }
  if (profile.floor_heating === undefined) return { missingField: 'floor_heating', reply: '铺装区域有地暖吗？', quickReplies: ['有地暖', '没有地暖', '还不确定'] };
  if (!profile.moisture) return { missingField: 'moisture', reply: '地面环境的水分情况更接近哪一种？', quickReplies: ['普通干燥区域', '偶尔有水或返潮', '经常直接遇水', '还不确定'] };
  if (!profile.budget_per_m2) return { missingField: 'budget_per_m2', reply: '材料预算大致在哪个范围？', quickReplies: ['200元以内', '200–350元/平', '350–500元/平', '先看方案再定'] };
  return { missingField: null, reply: '核心需求已经齐了，可以生成推荐。', quickReplies: ['现在推荐', '再补充一个条件'] };
}

function guidedAnswerResponse(modelResult, profile, domainRelevant, userMessage = '') {
  const nextStep = localConversationFallback(profile);

  // 离题 / 非领域：先完整回答，再一句主动反问拉回选购。
  if (modelResult.intent === 'off_topic' || !domainRelevant) {
    const pullback = buildProactivePullback(modelResult.reply, profile, userMessage);
    return {
      reply: pullback.reply,
      quickReplies: pullback.quickReplies,
      missingField: pullback.missingField,
      pullback: true,
      conversationMode: 'discovery'
    };
  }

  if (modelResult.intent === 'mixed') {
    const composed = composeAnswerWithNextStep(modelResult.reply, nextStep, {
      leadIn: '为了继续缩小范围：'
    });
    return {
      reply: composed.reply,
      quickReplies: composed.quickReplies,
      missingField: composed.missingField,
      pullback: false,
      conversationMode: 'discovery'
    };
  }

  // 领域内知识问答：先答；画像未齐时再跟一句下一槽位，不硬推 SKU。
  if (modelResult.intent === 'question' && domainRelevant) {
    if (nextStep.missingField) {
      const composed = composeAnswerWithNextStep(modelResult.reply, nextStep, {
        leadIn: '顺带确认一下：'
      });
      return {
        reply: composed.reply,
        quickReplies: composed.quickReplies,
        missingField: composed.missingField,
        pullback: true,
        conversationMode: 'discovery'
      };
    }
    return {
      reply: stripImprovisedDiscoveryAsk(modelResult.reply) || modelResult.reply,
      quickReplies: ['现在推荐', '再补充一个条件'],
      missingField: null,
      pullback: false,
      conversationMode: 'discovery'
    };
  }

  return {
    reply: modelResult.reply,
    quickReplies: ['继续了解这个问题', '开始需求匹配'],
    missingField: null,
    pullback: false,
    conversationMode: 'discovery'
  };
}

function softenDiscoveryQuestion(question) {
  return String(question || '')
    .replace(/^先从使用场景开始：/, '')
    .replace(/^主要准备/, '主要想')
    .trim();
}

/** 去掉模型擅自追问的选购问题，避免文案问 A、按钮却是 B。 */
function stripImprovisedDiscoveryAsk(reply) {
  let text = String(reply || '').trim();
  if (!text) return '';
  const askPattern = /(?:请问|想问|想先了解|想确认|顺便问|对了)[^\n]{0,40}?(?:平方米|平米|面积|采光|色调|暖色|冷色|地暖|预算|家里用|商用|铺[在在哪]|哪些空间|使用场景)[^\n]*$/;
  const lines = text.split(/\n+/).map(line => line.trim()).filter(Boolean);
  while (lines.length) {
    const last = lines[lines.length - 1];
    if (
      /[？?]$/.test(last)
      && /(?:平方米|平米|面积|采光|地暖|预算|色调|暖色|冷色|家里用|公司|门店|哪些空间|使用场景|铺装)/.test(last)
    ) {
      lines.pop();
      continue;
    }
    if (askPattern.test(last)) {
      lines.pop();
      continue;
    }
    break;
  }
  return lines.join('\n').trim();
}

function composeAnswerWithNextStep(answer, nextStep, { hook = '', leadIn = '对了，要是也在看地板，我想先确认一下：' } = {}) {
  const base = stripImprovisedDiscoveryAsk(answer);
  const question = softenDiscoveryQuestion(nextStep.reply);
  const bridge = `${hook || leadIn}${question}`;
  return {
    reply: base ? `${base}\n\n${bridge}` : bridge,
    quickReplies: (nextStep.quickReplies || []).slice(0, 4),
    missingField: nextStep.missingField
  };
}

/** 离题答完后主动反问一个选购槽位，轻轻拉回 discovery。 */
function buildProactivePullback(reply, profile, userMessage = '') {
  const nextStep = localConversationFallback(profile || {});
  const hook = pickPullbackHook(userMessage, nextStep.missingField);
  return composeAnswerWithNextStep(reply, nextStep, {
    hook,
    leadIn: '对了，要是也在看地板，我想先确认一下：'
  });
}

function pickPullbackHook(userMessage, missingField) {
  const text = String(userMessage || '');
  if (/(墨尔本|旅游|旅行|出去玩|度假|自驾|景点)/.test(text)) {
    if (missingField === 'usage_type') {
      return '玩回来要是也想把家里氛围弄得更轻松，可以先从地板聊起——';
    }
    return '玩回来若打算整理家里，我们也可以先把地板条件过一遍：';
  }
  if (/(搬家|新家|装修|入住)/.test(text)) {
    return '说到住的地方，地板其实也挺关键，我想先问一句：';
  }
  if (/(天气|下雨|潮湿)/.test(text) && missingField === 'moisture') {
    return '说到环境干湿，选地板时这点也很关键：';
  }
  return '';
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
  // 仅认明确的地板选购推荐意图；避免「墨尔本有什么推荐」误触发。
  return /(现在推荐|直接推荐|帮我选一款|帮我挑(?:一款)?地板|推荐一款地板|给我推荐地板|哪款地板|适合我的地板)/.test(message)
    || (isDomainRelevantMessage(message) && /(哪款|哪个好|选什么|适合我|直接选|给我选|帮我挑|帮我定)/.test(message));
}

function normalizeConversationMode(value) {
  return ['open', 'discovery', 'paused'].includes(value) ? value : 'open';
}

function resolveConversationMode({ previousMode, intent, domainRelevant, slotAnswer, startDiscovery, forceAnswer, withPullback }) {
  if (startDiscovery || slotAnswer) return 'discovery';
  if (withPullback) return 'discovery';
  if (domainRelevant && intent !== 'off_topic') return 'discovery';
  if (intent === 'off_topic' || (forceAnswer && !domainRelevant)) {
    if (previousMode === 'discovery' || previousMode === 'paused') return 'paused';
    return 'open';
  }
  if (intent === 'requirements' || intent === 'mixed' || intent === 'direct_recommend') return 'discovery';
  return previousMode || 'open';
}

function shouldForceAnswer(intent, domainRelevant, message = '', slotAnswer = false, startDiscovery = false, hasLocalPatch = false) {
  if (slotAnswer || startDiscovery || hasLocalPatch) return false;
  if (intent === 'direct_recommend' || wantsRecommendation(message)) return false;
  if (intent === 'off_topic' || intent === 'question') return true;
  // 非领域闲聊一律先回答，禁止因残留画像硬切推荐。
  if (!domainRelevant) return true;
  return false;
}

function canEmitRecommendation({ message, intent, domainRelevant, slotAnswer, profile, mode }) {
  if (!profileReadyForRecommendation(profile)) return false;
  if (intent === 'off_topic' || intent === 'question') return false;

  if (intent === 'direct_recommend' || wantsRecommendation(message)) {
    return domainRelevant || slotAnswer || mode === 'discovery' || mode === 'paused';
  }
  if (['requirements', 'mixed'].includes(intent) && (domainRelevant || slotAnswer)) return true;
  return false;
}

function recommendationPayload(profile, recommendation, conversationMode, extra = {}) {
  return {
    type: 'recommendation',
    reply: buildRecommendationReply(recommendation),
    profile,
    conversationMode,
    quickReplies: recommendation.status === 'recommended'
      ? ['预算改为200元', '预算改为400元', '换成冷色风格', '预约量房']
      : ['不是明水区域', '我可以换材料', '咨询防水款'],
    recommendation,
    ...extra
  };
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
普通生活、知识或闲聊问题必须先直接回答，不要强行转回地板，也不要把其中的“孩子、宠物、预算”等词提取成地板需求。只有用户主要在提供地板选购条件时，才继续追问画像。

Answer-First 与离题硬规则（必须遵守）：
- 用户问旅行、美食、天气、娱乐、自我介绍等与装修无关内容时：intent 必须为 off_topic，reply 只认真回答该问题。
- off_topic / question 的 reply 中禁止出现具体 SKU、型号编号、材料单价、面积估价或“我更推荐「某款」”。
- 不要在离题回答里自己连问多个选购问题，也不要硬切回地板推荐；服务端会在答完后追加一句主动反问来拉回选购。
- 「有什么推荐」若指旅游/餐厅等，仍是 off_topic，不要理解成地板推荐。

单位与字段硬约束（必须遵守）：
- area_m2 只表示铺装面积，单位是平方米（m²）。用户说「70–120平」「约95m²」「100平方米」时，只能写入 area_m2，绝不能写入 budget_per_m2。
- budget_per_m2 只表示材料单价预算，单位是元/平方米（¥/m²）。只有用户明确提到预算、单价、元/平、元以内等价格意图时才可填写。
- 禁止把同一个数字同时当作面积和单价；禁止把面积数字编造成「不超过 ¥xx/m²」的预算说明。

只返回一个 JSON 对象，不要 Markdown，不要额外文字：
{"intent":"question|requirements|mixed|off_topic|direct_recommend","reply":"自然简洁的中文回复或单个追问","profilePatch":{},"missingField":"下一个希望了解的字段或null","readyToRecommend":false,"quickReplies":["0到4个简短选项"]}

intent 规则：question=地板或装修问题；requirements=只提供选购条件；mixed=条件加问题；off_topic=普通宽域问题或闲聊，仍要正常回答；direct_recommend=明确要求推荐地板款式。question、mixed、off_topic 必须在 reply 中先回答用户问题。question、mixed、off_topic 的 reply 只回答，不要自行追加追问；服务端会选择唯一的下一分支。

不得把品类特征绝对化：不要声称某类地板必然完全防水、零甲醛、绝对耐刮、适合浴室/地暖或可多次翻新。应说明取决于具体产品结构、表层、技术资料和现场条件。

profilePatch 可用字段和值：usage_type=home|business；rooms=字符串数组；area_m2=数字（仅面积 m²）；lighting=bright|medium|dim；space_size=small|medium|large；temperature=warm|cool|neutral；style=字符串数组；priorities=easy_clean|wear_resistant|brighten|premium|design|natural|budget 的数组；kids/pets=true|false；traffic=low|medium|high；moisture=normal|damp|direct_water；floor_heating=true|false；maintenance=low|normal|high；budget_per_m2=数字（仅材料单价 ¥/m²，勿与面积混淆）；budget_is_hard_limit=true|false；install_tolerance=low|normal|high。没有明确表达的字段不要猜。`;
}

function parseModelJson(content) {
  const trimmed = String(content || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  if (!trimmed) throw new Error('模型返回空正文');
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start < 0 && end < 0) {
    return {
      intent: 'question',
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
    intent: ['question', 'requirements', 'mixed', 'off_topic', 'direct_recommend'].includes(parsed.intent) ? parsed.intent : 'question',
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
  let message = typeof body.message === 'string' ? body.message.trim().slice(0, 3000) : '';
  if (!message) return sendJson(res, 400, { error: '请输入一条消息。' });

  const existingProfile = scrubConfusedAreaBudget(normalizeProfile(body.profile), message);
  let previousMode = normalizeConversationMode(body.conversationMode);
  if (previousMode === 'open' && Object.keys(existingProfile).length > 0) previousMode = 'discovery';
  const expectedMissingField = typeof body.missingField === 'string' ? body.missingField : null;

  const startDiscovery = /我想开始地板装修需求匹配|开始装修咨询|开始需求匹配/.test(message);

  // 兼容旧前端：点「继续…」时不能空返回。
  if (/^(继续当前话题|继续了解这个问题)$/.test(message)) {
    if (previousMode === 'discovery' || Object.keys(existingProfile).length > 0) {
      const nextStep = localConversationFallback(existingProfile);
      return sendJson(res, 200, {
        type: 'question',
        reply: `好的，我们继续。${nextStep.reply}`,
        profile: existingProfile,
        conversationMode: 'discovery',
        quickReplies: nextStep.quickReplies,
        missingField: nextStep.missingField,
        recommendation: null
      });
    }
    message = message === '继续了解这个问题'
      ? '请就你上一条回答再展开说明，补充更具体、可执行的建议。'
      : '请继续刚才的话题，把重点说清楚。';
  }

  const domainRelevant = isDomainRelevantMessage(message) || startDiscovery;
  const slotAnswer = isSlotAnswerMessage(message);
  const inDiscovery = previousMode === 'discovery' || previousMode === 'paused';
  // 选购进行中也允许抽槽，覆盖「采光好/喜欢暖色」等口语；纯 open 闲聊仍不抽。
  let localPatch = {};
  if (domainRelevant || slotAnswer || inDiscovery) {
    localPatch = extractProfileLocally(message);
  }
  const contextualPatch = applyContextualShortAnswer(message, expectedMissingField);
  localPatch = { ...localPatch, ...contextualPatch };
  const hasLocalPatch = Object.keys(localPatch).length > 0;
  const profileBeforeModel = scrubConfusedAreaBudget({ ...existingProfile, ...localPatch }, message);

  let modelResult;
  try {
    modelResult = await callDeepSeek(message, body.messages, profileBeforeModel);
  } catch (error) {
    console.warn(`[${new Date().toISOString()}] DeepSeek response fallback: ${error.message}`);
    if (Object.keys(localPatch).length && (domainRelevant || slotAnswer)) {
      const profile = { ...existingProfile, ...localPatch };
      const conversationMode = 'discovery';
      if (canEmitRecommendation({
        message, intent: 'requirements', domainRelevant, slotAnswer, profile, mode: conversationMode
      })) {
        const recommendation = calculateRecommendation(profile);
        return sendJson(res, 200, recommendationPayload(profile, recommendation, conversationMode, { fallback: true }));
      }
      const nextStep = localConversationFallback(profile);
      return sendJson(res, 200, {
        type: 'question',
        reply: nextStep.reply,
        profile,
        conversationMode,
        quickReplies: nextStep.quickReplies,
        missingField: nextStep.missingField,
        recommendation: null,
        fallback: true
      });
    }
    const failIntent = domainRelevant ? 'question' : 'off_topic';
    if (!domainRelevant) {
      const pullback = buildProactivePullback(
        '抱歉，刚才服务暂时没有成功返回内容。你的问题我还想接着聊；也可以先从地板需求开始。',
        existingProfile,
        message
      );
      return sendJson(res, 200, {
        type: 'answer',
        intent: failIntent,
        reply: pullback.reply,
        profile: existingProfile,
        conversationMode: 'discovery',
        quickReplies: pullback.quickReplies,
        missingField: pullback.missingField,
        recommendation: null,
        pullback: true,
        fallback: true
      });
    }
    return sendJson(res, 200, {
      type: 'answer',
      intent: failIntent,
      reply: '抱歉，刚才服务暂时没有成功返回内容。请再发送一次，我会直接回答当前问题，不会把它当成地板选购条件。',
      profile: existingProfile,
      conversationMode: previousMode || 'open',
      quickReplies: [],
      recommendation: null,
      fallback: true
    });
  }

  // 非领域消息强制按回答路径处理，防止误判 requirements 后硬切推荐。
  // 「现在推荐」等购买意图除外；已抽出选购条件时也不得当离题。
  let intent = modelResult.intent;
  if (
    !domainRelevant && !slotAnswer && !startDiscovery && !hasLocalPatch
    && intent !== 'off_topic' && intent !== 'question' && intent !== 'direct_recommend'
    && !wantsRecommendation(message)
  ) {
    intent = 'off_topic';
  }
  if ((domainRelevant || slotAnswer || hasLocalPatch) && intent === 'off_topic' && hasLocalPatch) {
    intent = 'requirements';
  }

  const modelPatch = corroborateModelProfilePatch(modelResult.profilePatch, localPatch, message, intent);
  const profile = scrubConfusedAreaBudget({ ...existingProfile, ...modelPatch, ...localPatch }, message);
  const forceAnswer = shouldForceAnswer(intent, domainRelevant, message, slotAnswer || hasLocalPatch, startDiscovery, hasLocalPatch);
  const conversationMode = resolveConversationMode({
    previousMode,
    intent,
    domainRelevant,
    slotAnswer,
    startDiscovery,
    forceAnswer
  });

  // Answer-First：先完整回答；再由服务端追加一句主动反问拉回选购（不替换成推荐）。
  if (forceAnswer) {
    const guided = guidedAnswerResponse(
      { ...modelResult, intent },
      existingProfile,
      domainRelevant,
      message
    );
    const finalMode = guided.pullback
      ? 'discovery'
      : resolveConversationMode({
        previousMode,
        intent,
        domainRelevant,
        slotAnswer,
        startDiscovery,
        forceAnswer: true,
        withPullback: false
      });
    return sendJson(res, 200, {
      type: 'answer',
      intent,
      reply: guided.reply,
      profile: existingProfile,
      conversationMode: finalMode,
      quickReplies: guided.quickReplies,
      missingField: guided.missingField,
      recommendation: null,
      pullback: Boolean(guided.pullback)
    });
  }

  if (canEmitRecommendation({
    message, intent, domainRelevant, slotAnswer, profile, mode: conversationMode
  })) {
    const recommendation = calculateRecommendation(profile);
    return sendJson(res, 200, recommendationPayload(profile, recommendation, 'discovery'));
  }

  const nextStep = localConversationFallback(profile);
  let reply = nextStep.reply;
  if (localPatch.area_m2 && existingProfile.area_m2 !== localPatch.area_m2) {
    reply = `好的，大约 ${profile.area_m2}m² 我记下了。${nextStep.reply}`;
  } else if (Object.keys(localPatch).length && intent === 'mixed' && modelResult.reply) {
    reply = composeAnswerWithNextStep(modelResult.reply, nextStep, {
      leadIn: '为了继续缩小范围：'
    }).reply;
  } else if (intent === 'question' && modelResult.reply && domainRelevant) {
    reply = composeAnswerWithNextStep(modelResult.reply, nextStep, {
      leadIn: '顺带确认一下：'
    }).reply;
  }

  return sendJson(res, 200, {
    type: 'question',
    reply,
    profile,
    conversationMode: 'discovery',
    quickReplies: nextStep.quickReplies,
    missingField: nextStep.missingField,
    recommendation: null
  });
}

const OZWOOD_PROFILE_VALUES = {
  space: ['house', 'apartment', 'commercial', 'unknown'],
  room: ['living', 'bedroom', 'study', 'whole', 'unknown'],
  lighting: ['bright', 'medium', 'dim', 'unknown'],
  style: ['light', 'warm', 'australian', 'herringbone', 'cool', 'unknown'],
  household: ['kids', 'pregnant', 'elderly', 'pets', 'mixed', 'none', 'unknown'],
  lifestyle: ['kids-pets', 'heavy', 'quiet', 'rental', 'unknown'],
  subfloor: ['concrete', 'tiles', 'timber', 'unknown'],
  moisture: ['waterproof', 'occasional', 'dry', 'unknown'],
  service: ['supply-install', 'supply-only', 'sample', 'showroom', 'unknown'],
  budget: ['under35', '35-55', '55plus', 'quote', 'unknown']
};

function sanitizeOzwoodProfile(patch) {
  const safe = {};
  if (!patch || typeof patch !== 'object') return safe;
  for (const [key, values] of Object.entries(OZWOOD_PROFILE_VALUES)) {
    if (values.includes(patch[key])) safe[key] = patch[key];
  }
  if (patch.area === 'unknown') safe.area = 'unknown';
  else if (Number.isFinite(Number(patch.area)) && Number(patch.area) >= 5 && Number(patch.area) <= 3000) safe.area = Number(patch.area);
  return safe;
}

function sanitizeOzwoodHistory(history) {
  if (!Array.isArray(history)) return [];
  return history
    .filter(item => item && ['user', 'assistant'].includes(item.role) && typeof item.content === 'string')
    .slice(-10)
    .map(item => ({ role: item.role, content: item.content.trim().slice(0, 1000) }))
    .filter(item => item.content);
}

function parseOzwoodResult(content) {
  const raw = String(content || '').trim();
  if (!raw) throw new Error('模型返回空正文');
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1] || raw.match(/\{[\s\S]*\}/)?.[0] || raw;
  try {
    const parsed = JSON.parse(candidate);
    const intents = new Set(['question', 'requirements', 'mixed', 'direct_recommend', 'off_topic']);
    return {
      intent: intents.has(parsed.intent) ? parsed.intent : 'question',
      answer: String(parsed.answer || '').trim().slice(0, 1400),
      profilePatch: sanitizeOzwoodProfile(parsed.profilePatch)
    };
  } catch (_) {
    return { intent: 'question', answer: raw.slice(0, 1400), profilePatch: {} };
  }
}

async function handleOzwoodQuestion(req, res) {
  const body = await readJson(req);
  const { default: ozwoodQuestionHandler } = await import('./api/ozwood-question.mjs');
  const apiReq = { method: 'POST', headers: req.headers, body };
  const apiRes = {
    setHeader(name, value) { res.setHeader(name, value); },
    status(code) {
      res.statusCode = code;
      return {
        json(value) {
          if (!res.headersSent) res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(JSON.stringify(value));
        },
        end() { res.end(); }
      };
    }
  };
  return ozwoodQuestionHandler(apiReq, apiRes);
}

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml'
};

const IMAGE_BASE = (process.env.IMAGE_BASE_URL || 'https://dashscope.aliyuncs.com').replace(/\/$/, '');
const IMAGE_MODEL = process.env.IMAGE_MODEL || 'qwen-image-2.0-pro-2026-06-22';
const IMAGE_API_KEY = process.env.IMAGE_API_KEY || '';
const IMAGE_API_URL = `${IMAGE_BASE}/api/v1/services/aigc/multimodal-generation/generation`;
const MAX_IMAGE_SIZE = 2048;
const FLOOR_TEXTURE_MAP = {
  'european-oak': 'product-european-oak.jpg',
  'spotted-gum': 'product-spotted-gum.jpg',
  'herringbone': 'product-herringbone.jpg',
  'white-oak': 'product-white-oak.jpg',
  'hybrid-grey': 'product-hybrid-grey.jpg',
};
const FLOOR_SWAP_PROMPT = `Completely remove the original floor from the first image and replace it with the floor texture and color from the second reference image (regardless of whether the original floor is wood, tile, cement, or any other material, forcibly replace it with the reference flooring material).

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

async function compressImageBuffer(buffer) {
  const metadata = await sharp(buffer).metadata();
  let w = metadata.width || 0;
  let h = metadata.height || 0;
  if (Math.max(w, h) > MAX_IMAGE_SIZE) {
    const ratio = MAX_IMAGE_SIZE / Math.max(w, h);
    w = Math.round(w * ratio);
    h = Math.round(h * ratio);
    return sharp(buffer).resize(w, h, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer();
  }
  return buffer;
}

async function handleFloorSwap(req, res) {
  if (!IMAGE_API_KEY) return sendJson(res, 200, { error: 'IMAGE_API_KEY 未配置', fallback: true });

  const body = await readJson(req, 5_000_000);
  const { image, floorKey } = body || {};
  if (!image || typeof image !== 'string') return sendJson(res, 400, { error: '请提供 base64 图片' });
  if (!floorKey || !FLOOR_TEXTURE_MAP[floorKey]) return sendJson(res, 400, { error: '无效的 floorKey' });

  const texturePath = path.join(ROOT, 'assets', 'ozwood', 'official', FLOOR_TEXTURE_MAP[floorKey]);
  if (!existsSync(texturePath)) return sendJson(res, 500, { error: '地板参考图文件不存在' });

  try {
    const textureBase64 = readFileSync(texturePath).toString('base64');
    const imageBuffer = Buffer.from(image, 'base64');
    const compressed = await compressImageBuffer(imageBuffer);
    const compressedBase64 = compressed.toString('base64');

    const response = await fetch(IMAGE_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${IMAGE_API_KEY}` },
      body: JSON.stringify({
        model: IMAGE_MODEL,
        input: {
          messages: [{
            role: 'user',
            content: [
              { image: `data:image/jpeg;base64,${compressedBase64}` },
              { image: `data:image/jpeg;base64,${textureBase64}` },
              { text: FLOOR_SWAP_PROMPT },
            ],
          }],
        },
        parameters: { n: 1, watermark: false },
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      return sendJson(res, 200, { error: `AI 服务返回 ${response.status}`, detail: text.slice(0, 300), fallback: true });
    }

    const data = await response.json();
    if (!data.output?.choices?.[0]) {
      return sendJson(res, 200, { error: 'AI 返回异常', detail: JSON.stringify(data).slice(0, 300), fallback: true });
    }

    const imgUrl = data.output.choices[0].message?.content?.[0]?.image;
    if (!imgUrl) {
      return sendJson(res, 200, { error: 'AI 返回无图片', fallback: true });
    }

    return sendJson(res, 200, { url: imgUrl });
  } catch (err) {
    return sendJson(res, 200, { error: err.message || '生成失败', fallback: true });
  }
}

async function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === '/') pathname = '/ozwood-demo.html';
  if (/(^|\/)(?:\.env(?:\.|\/|$)|\.git(?:\/|$)|\.loci(?:\/|$))/i.test(pathname)) {
    return sendJson(res, 404, { error: 'Not found' });
  }
  const file = path.resolve(ROOT, `.${pathname}`);
  if (file !== ROOT && !file.startsWith(`${ROOT}${path.sep}`)) return sendJson(res, 403, { error: 'Forbidden' });
  try {
    const data = await readFile(file);
    const ext = path.extname(file).toLowerCase();
    const headers = { 'Content-Type': MIME[ext] || 'application/octet-stream' };
    if (ext === '.html' || ext === '.js' || ext === '.css') {
      headers['Cache-Control'] = 'no-store, no-cache, must-revalidate';
      headers.Pragma = 'no-cache';
    }
    res.writeHead(200, headers);
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
    if (req.method === 'POST' && req.url === '/api/floor-swap') return await handleFloorSwap(req, res);
    if (req.method === 'GET' || req.method === 'HEAD') return await serveStatic(req, res);
    return sendJson(res, 405, { error: 'Method not allowed' });
  } catch (error) {
    const message = error.name === 'AbortError' ? 'AI 响应超时，请稍后再试。' : error.message;
    console.error(`[${new Date().toISOString()}]`, message);
    sendJson(res, 500, { error: message || '服务暂时不可用。' });
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Ozwood AI 地板顾问已启动：http://127.0.0.1:${PORT}/`);
  console.log(`DeepSeek：${API_KEY ? '已配置' : '未配置'} · 模型：${MODEL}`);
});
