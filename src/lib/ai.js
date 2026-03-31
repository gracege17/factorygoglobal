export const createMockAI = ({ productCategory, certifications, companyName }, lang = 'en') => {
  const product = productCategory.toLowerCase()
  const hasFSC = certifications.includes('FSC')
  const isZh = lang === 'zh'

  if (product.includes('paper') || product.includes('tissue') || product.includes('卫生纸')) {
    return {
      topMarkets: [
        { country: 'Germany', fitScore: 91 },
        { country: 'UAE', fitScore: 84 },
        { country: 'Vietnam', fitScore: 79 },
      ],
      differentiation: isZh
        ? '避开同质化红海市场，主打 FSC 认证竹浆环保纸，以稳定工业供货能力和更低生命周期影响建立差异化。'
        : 'Avoid red-ocean commodity tissue. Position as FSC-certified bamboo pulp hygiene paper with stable industrial supply and lower lifecycle footprint.',
      requiredCertifications: ['FSC Chain of Custody', 'REACH (if chemicals used)', 'ISO 9001'],
      slogan: isZh
        ? `${companyName || '你的工厂'}，面向增长市场的可持续纸品合作伙伴`
        : `${companyName || 'Your Factory'}, Sustainable Paper Partner for Fast-Growing Markets`,
      valueProps: isZh
        ? ['可持续原料，溯源清晰', 'MOQ 灵活，覆盖进口商与分销渠道', '批量供货稳定，质量管控可视化']
        : [
            'Sustainable raw materials with clear traceability',
            'Flexible MOQ for importer and distributor channels',
            'Consistent bulk production with quality checkpoints',
          ],
      trust: hasFSC
        ? isZh
          ? '已具备 FSC 信任背书，可加速进入高价值环保采购渠道。'
          : 'FSC credibility already available, fast-track market messaging possible.'
        : isZh
          ? '建议补齐 FSC 认证，以切入高毛利环保采购市场。'
          : 'Recommend FSC onboarding to unlock high-margin eco buyers.',
    }
  }

  return {
    topMarkets: [
      { country: 'USA', fitScore: 88 },
      { country: 'Germany', fitScore: 83 },
      { country: 'UAE', fitScore: 78 },
    ],
    differentiation: isZh
      ? '建议围绕“稳定交期 + 稳定品质”做定位，重点服务被大型供应商忽视的中型海外买家。'
      : 'Position around reliable lead time + quality consistency for mid-size overseas buyers that are underserved by giant suppliers.',
    requiredCertifications: ['ISO 9001', 'Product-specific compliance for destination market'],
    slogan: isZh ? `${companyName || '你的工厂'} | 稳定可靠的 B2B 供货伙伴` : `${companyName || 'Your Factory'} | Built for Reliable B2B Supply`,
    valueProps: isZh
      ? ['交付窗口可预测，便于长期复购', '质量与合规记录透明可查', '工厂直连沟通，决策更快']
      : [
          'Predictable fulfillment windows for repeat buyers',
          'Transparent quality and compliance records',
          'Factory-direct communication for faster decisions',
        ],
    trust: isZh ? '定位更清晰后，可有效避开纯价格战。' : 'With clearer niche positioning, this category can avoid pure price wars.',
  }
}

const normalizeResponse = (payload) => ({
  topMarkets: Array.isArray(payload?.topMarkets) ? payload.topMarkets : [],
  differentiation: payload?.differentiation || 'No differentiation result returned.',
  requiredCertifications: Array.isArray(payload?.requiredCertifications) ? payload.requiredCertifications : [],
  slogan: payload?.slogan || 'Reliable Manufacturing for Global Buyers',
  valueProps: Array.isArray(payload?.valueProps) ? payload.valueProps : [],
  trust: payload?.trust || 'Directional result generated from available input.',
})

export const fetchAIStrategy = async (input, lang = 'en') => {
  const mode = (import.meta.env.VITE_AI_MODE || 'mock').toLowerCase()

  if (mode !== 'real') {
    return createMockAI(input, lang)
  }

  const response = await fetch('/api/strategy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...input, lang }),
  })

  if (!response.ok) {
    throw new Error(`AI request failed with status ${response.status}`)
  }

  const payload = await response.json()
  return normalizeResponse(payload)
}
