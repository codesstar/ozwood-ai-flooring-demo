const BASE_URL = (process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com').replace(/\/$/, '');
const MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash';
const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 30;
const requestWindows = new Map();

const PROFILE_VALUES = {
  space: ['house', 'apartment', 'commercial', 'unknown'],
  room: ['living', 'bedroom', 'study', 'whole', 'unknown'],
  style: ['light', 'warm', 'australian', 'herringbone', 'cool', 'unknown'],
  lifestyle: ['kids-pets', 'heavy', 'quiet', 'rental', 'unknown'],
  subfloor: ['concrete', 'tiles', 'timber', 'unknown'],
  moisture: ['waterproof', 'occasional', 'dry', 'unknown'],
  service: ['supply-install', 'supply-only', 'sample', 'showroom', 'unknown'],
  budget: ['under35', '35-55', '55plus', 'quote', 'unknown']
};
const INTENTS = new Set(['question', 'requirements', 'mixed', 'direct_recommend', 'off_topic']);

const SYSTEM_PROMPT = `你是 Ozwood Australia 的中文地板顾问，也是一个允许用户自由对话的销售助手。固定问题流程只是辅助，绝不能强迫用户按顺序回答。

你的任务：理解用户这句话的意图、回答问题，并只从用户明确表达的内容中抽取选购画像。即使用户在流程中插问，也必须先完整回答；不要把问题、抱怨、寒暄或无关陈述误填进当前字段。客户端会自动恢复流程，所以回答中不要重复当前预设问题。

只输出 JSON 对象：
{"intent":"question|requirements|mixed|direct_recommend|off_topic","answer":"给用户的自然中文回答","profilePatch":{}}

意图规则：
- question：主要在提问，没有明确的新选购条件。
- requirements：主要在提供或修改需求；answer 只用一句话自然确认，不要提前给正式推荐。
- mixed：既提供条件又明确提出问题；answer 先回答问题。没有问号或疑问意图时不要判为 mixed。
- direct_recommend：用户明确要求现在直接推荐或不想再回答。
- off_topic：明显与地板、装修或 Ozwood 无关；友好简短回应并引导回来。

画像字段与唯一允许值：
- space: house | apartment | commercial | unknown
- room: living | bedroom | study | whole | unknown
- area: 5–3000 的数字，单位 m²；不确定时可为 unknown
- style: light | warm | australian | herringbone | cool | unknown
- lifestyle: kids-pets | heavy | quiet | rental | unknown
- subfloor: concrete | tiles | timber | unknown
- moisture: waterproof | occasional | dry | unknown
- service: supply-install | supply-only | sample | showroom | unknown
- budget: under35 | 35-55 | 55plus | quote | unknown
没有明确表达的字段不要猜，不要为了推进流程而填值。

当前演示产品：
1. 欧洲橡木 5106：工程木，1200×163×12mm，2.3472m²/箱，官网促销参考 AU$49/m²。真实木质感、结构稳定，适合普通干区。
2. 澳洲斑纹桉 SG1443-185：澳洲硬木工程地板，天然色差明显、硬度和本土辨识度突出，需要当前报价。
3. 工程橡木人字拼 4301：设计感强；放线、切割、损耗和安装费通常高于直铺，需要供货安装报价。
4. OZ2628 白橡木：12mm 强化地板，1215×197×12mm，2.39m²/箱，锁扣，防潮耐水，官网参考 AU$28.8/m²；防潮耐水不等于完全防水。
5. 灰橡混合地板：6.5mm，1220×183×6.5mm，2.2326m²/箱，E0、AC4、官网标注防水，促销参考 AU$19.8/m²；适合孩子宠物、高频使用和预算优先项目。

通用原则：工程木表层为真实木材，质感自然但要控制水分；强化地板价格友好、耐磨、快装；混合地板强调防水和省心，但天然木材触感较弱。安装前应检查基层平整度和含水率。官网价格可能变化，正式报价必须确认库存、批次、面积、损耗和现场条件。

回答自然、明确，通常不超过 220 个中文字；不要使用 Markdown 表格；不要编造认证、库存、保修、价格或公司政策。不确定的事实明确说“需要向 Ozwood 确认”。`;

function clientKey(req) {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return forwarded || String(req.headers['x-real-ip'] || 'unknown');
}

function withinRateLimit(req) {
  const now = Date.now();
  const key = clientKey(req);
  const current = requestWindows.get(key);
  if (!current || now - current.startedAt > WINDOW_MS) {
    requestWindows.set(key, { startedAt: now, count: 1 });
    return true;
  }
  current.count += 1;
  return current.count <= MAX_REQUESTS_PER_WINDOW;
}

function sanitizeProfilePatch(patch) {
  const safe = {};
  if (!patch || typeof patch !== 'object') return safe;
  for (const [key, values] of Object.entries(PROFILE_VALUES)) {
    if (values.includes(patch[key])) safe[key] = patch[key];
  }
  if (patch.area === 'unknown') safe.area = 'unknown';
  else if (Number.isFinite(Number(patch.area)) && Number(patch.area) >= 5 && Number(patch.area) <= 3000) safe.area = Number(patch.area);
  return safe;
}

function sanitizeHistory(history) {
  if (!Array.isArray(history)) return [];
  return history
    .filter(item => item && ['user', 'assistant'].includes(item.role) && typeof item.content === 'string')
    .slice(-10)
    .map(item => ({ role: item.role, content: item.content.trim().slice(0, 1000) }))
    .filter(item => item.content);
}

function parseModelResult(content) {
  const raw = String(content || '').trim();
  if (!raw) throw new Error('AI 返回空内容');
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1] || raw.match(/\{[\s\S]*\}/)?.[0] || raw;
  try {
    const parsed = JSON.parse(candidate);
    return {
      intent: INTENTS.has(parsed.intent) ? parsed.intent : 'question',
      answer: String(parsed.answer || '').trim().slice(0, 1400),
      profilePatch: sanitizeProfilePatch(parsed.profilePatch)
    };
  } catch (_) {
    return { intent: 'question', answer: raw.slice(0, 1400), profilePatch: {} };
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: '仅支持 POST 请求。' });
  if (!withinRateLimit(req)) return res.status(200).json({ intent: 'question', answer: '', profilePatch: {}, fallback: true });

  const question = typeof req.body?.question === 'string' ? req.body.question.trim().slice(0, 2000) : '';
  if (!question) return res.status(400).json({ error: '请输入问题。' });

  const apiKey = process.env.DEEPSEEK_API_KEY || '';
  if (!apiKey) return res.status(200).json({ intent: 'question', answer: '', profilePatch: {}, fallback: true });

  const currentQuestion = req.body?.currentQuestion && typeof req.body.currentQuestion === 'object'
    ? { id: String(req.body.currentQuestion.id || '').slice(0, 30), text: String(req.body.currentQuestion.text || '').slice(0, 300) }
    : null;
  const context = `当前已确认画像：${JSON.stringify(sanitizeProfilePatch(req.body?.profile))}\n当前流程问题：${currentQuestion ? JSON.stringify(currentQuestion) : '无，需求流程已经完成'}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 18_000);
  try {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const requestBody = {
        model: MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'system', content: context },
          ...sanitizeHistory(req.body?.history),
          { role: 'user', content: question }
        ],
        thinking: { type: 'disabled' },
        max_tokens: 700
      };
      if (attempt === 0) requestBody.response_format = { type: 'json_object' };
      const response = await fetch(`${BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });
      if (!response.ok) throw new Error(`AI 服务返回 ${response.status}`);
      const data = await response.json();
      const content = String(data.choices?.[0]?.message?.content || '').trim();
      if (!content && attempt === 0) continue;
      const result = parseModelResult(content);
      if (!result.answer) result.answer = result.intent === 'requirements' ? '好的，我已经记下这些条件。' : '我理解了，请继续。';
      return res.status(200).json(result);
    }
    throw new Error('AI 连续返回空内容');
  } catch (error) {
    return res.status(200).json({ intent: 'question', answer: '', profilePatch: {}, fallback: true });
  } finally {
    clearTimeout(timer);
  }
}
