const BASE_URL = (process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com').replace(/\/$/, '');
const MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash';
const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 12;
const requestWindows = new Map();

const OZWOOD_KNOWLEDGE = `你是 Ozwood Australia 的中文地板顾问，只回答地板选购、产品区别、安装、养护、预算和 Ozwood 品牌知识。回答自然、明确，控制在 180 个中文字以内，不使用 Markdown 表格，不编造认证、库存、保修或价格。除 Ozwood、产品编号、AU$ 和必要行业缩写外，尽量使用中文。

当前演示产品：
1. 欧洲橡木 5106：工程木地板，1200×163×12mm，2.3472m²/箱，官网产品页促销参考 AU$49/m²，正式报价需确认。真实木质感、结构稳定，普通干区使用。
2. 澳洲斑纹桉 SG1443-185：澳洲硬木工程地板，天然色差明显，木纹个性强，硬度和本土辨识度突出，需要当前报价。
3. 工程橡木人字拼 4301：工程木拼花，设计感强；放线、切割、损耗和安装费通常高于直铺，需要供货安装报价。
4. OZ2628 白橡木：12mm 强化地板，1215×197×12mm，2.39m²/箱，锁扣，防潮耐水，官网参考 AU$28.8/m²。防潮耐水不等于完全防水。
5. 灰橡混合地板：6.5mm，1220×183×6.5mm，2.2326m²/箱，E0、AC4、官网标注防水，促销参考 AU$19.8/m²。适合孩子宠物、高频使用和预算优先项目。

五种视觉方向：明亮通透=浅白或浅橡色，让小空间和一般采光显得更开阔；温暖自然=原木与暖棕色，家庭感强且百搭；澳洲木材个性=明显天然色差和本土木纹；人字拼设计感=铺法是视觉焦点，但安装与损耗更高；冷灰现代=低饱和灰调，适合极简、现代或商用空间。

通用原则：工程木表层为真实木材，质感自然但要控制水分；强化地板价格友好、耐磨、快装；混合地板强调防水和日常省心，但天然木材触感较弱。所有安装都应检查基层平整度和含水率。官网价格存在不同页面记录，正式报价必须确认库存、批次、面积、损耗和现场安装条件。不确定的事实明确说“需要向 Ozwood 确认”。`;

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

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'POST') return res.status(405).json({ error: '仅支持 POST 请求。' });
  if (!withinRateLimit(req)) return res.status(429).json({ error: '提问太频繁，请稍后再试。' });

  const question = typeof req.body?.question === 'string' ? req.body.question.trim().slice(0, 1200) : '';
  if (!question) return res.status(400).json({ error: '请输入问题。' });

  const apiKey = process.env.DEEPSEEK_API_KEY || '';
  if (!apiKey) return res.status(503).json({ error: '云端 AI 未配置，将使用浏览器本地知识库回答。' });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: OZWOOD_KNOWLEDGE },
          { role: 'user', content: question }
        ],
        thinking: { type: 'disabled' },
        max_tokens: 420
      }),
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`AI 服务返回 ${response.status}`);
    const data = await response.json();
    const answer = String(data.choices?.[0]?.message?.content || '').trim();
    if (!answer) throw new Error('AI 返回空内容');
    return res.status(200).json({ answer: answer.slice(0, 1000) });
  } catch (error) {
    const message = error.name === 'AbortError' ? '云端 AI 响应超时。' : '云端 AI 暂时不可用。';
    return res.status(502).json({ error: message });
  } finally {
    clearTimeout(timer);
  }
}

