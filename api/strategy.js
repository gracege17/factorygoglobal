export const config = { runtime: 'edge' }

const RATE_LIMIT_MS = 30000 // 同一 IP 30 秒内只能请求一次
const rateLimitMap = new Map()

const SYSTEM_PROMPT = `You are an expert export strategy advisor helping Chinese manufacturers enter overseas B2B markets.

Given a factory's profile, return a JSON object with market recommendations and positioning advice.
Be specific, practical, and grounded in the factory's actual strengths. Avoid generic advice.

Return ONLY valid JSON — no markdown, no explanation, no code fences. Exactly this shape:
{
  "topMarkets": [
    { "country": "USA", "fitScore": 84 },
    { "country": "Germany", "fitScore": 79 }
  ],
  "differentiation": "One clear paragraph on how this factory should position itself vs. competitors",
  "requiredCertifications": ["CE", "ISO 9001"],
  "slogan": "Short punchy positioning line (under 15 words)",
  "valueProps": [
    "First concrete value proposition",
    "Second concrete value proposition",
    "Third concrete value proposition"
  ],
  "trust": "One sentence on the factory's credibility signals and what to strengthen"
}

Rules:
- topMarkets: 2–3 markets only. fitScore 60–96. Pick from: USA, Germany, Vietnam, UAE, Japan, Australia, Brazil, Saudi Arabia.
- Scores must reflect genuine fit based on product category, certifications, customer type, and competitive dynamics — not just the user's wishlist.
- differentiation: be specific to their product and advantages, not generic factory copy.
- requiredCertifications: only certifications actually required or strongly recommended for the recommended markets and product type.
- slogan: write in the response language specified.
- valueProps: 3 items, each grounded in the factory's stated advantages.`

const buildUserPrompt = (input, lang) => {
  const isZh = lang === 'zh'
  const label = isZh ? 'zh' : 'en'

  return `Factory profile (respond in ${label}):
- Company name: ${input.companyName || 'Not provided'}
- Product category: ${input.productCategory || 'Not provided'}
- Production capacity: ${input.currentCapacity || 'Not provided'}
- Export experience: ${input.exportExperience === 'has' ? 'Has export experience' : 'No export experience yet'}
- Current markets: ${input.currentMarkets?.join(', ') || 'None'}
- Certifications held: ${input.certifications?.filter(c => c !== '暂无').join(', ') || 'None'}
- Target markets (user preference): ${input.targetMarkets?.join(', ') || 'No preference stated'}
- Target customers: ${input.targetCustomers?.join(', ') || 'Not specified'}
- Core advantages: ${[...(input.coreAdvantages?.filter(a => a !== '其他') || []), input.coreAdvantageOther].filter(Boolean).join(', ') || 'Not specified'}

Based on this profile, provide market recommendations and positioning advice.`
}

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  // Rate limiting per IP
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown'
  const now = Date.now()
  const lastRequest = rateLimitMap.get(ip) || 0
  if (now - lastRequest < RATE_LIMIT_MS) {
    return new Response(JSON.stringify({ error: 'Too many requests. Please wait before trying again.' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  rateLimitMap.set(ip, now)

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API key not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let body
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { lang = 'zh', ...input } = body

  const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 800,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildUserPrompt(input, lang) }],
    }),
  })

  if (!claudeRes.ok) {
    const err = await claudeRes.text()
    return new Response(JSON.stringify({ error: 'Claude API error', detail: err }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const claudeData = await claudeRes.json()
  const text = claudeData.content?.[0]?.text || ''

  let parsed
  try {
    parsed = JSON.parse(text)
  } catch {
    return new Response(JSON.stringify({ error: 'Failed to parse Claude response', raw: text }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify(parsed), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
