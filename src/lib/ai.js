const marketLabelMap = {
  '北美': 'USA',
  '欧洲': 'Germany',
  '东南亚': 'Vietnam',
  '中东': 'UAE',
}

const marketScoreBase = {
  USA: 84,
  Germany: 82,
  Vietnam: 78,
  UAE: 77,
}

const getCategoryItems = (value = '') =>
  value
    .split(/[/、，,]+/)
    .map((item) => item.trim())
    .filter(Boolean)

const buildTopMarkets = (targetMarkets = [], certifications = [], currentMarkets = [], lang = 'en') => {
  const isZh = lang === 'zh'
  const selected = targetMarkets
    .map((item) => marketLabelMap[item])
    .filter(Boolean)

  const uniqueMarkets = selected.length > 0 ? [...new Set(selected)] : ['USA', 'Germany', 'UAE']

  return uniqueMarkets.slice(0, 3).map((country, index) => {
    let fitScore = marketScoreBase[country] || 76

    if (country === 'Germany' && certifications.includes('FSC')) fitScore += 6
    if (country === 'Germany' && certifications.includes('CE')) fitScore += 2
    if (country === 'USA' && currentMarkets.includes(isZh ? '北美' : 'North America')) fitScore += 4
    if (country === 'UAE' && currentMarkets.includes(isZh ? '中东' : 'Middle East')) fitScore += 4
    if (country === 'Vietnam' && currentMarkets.includes(isZh ? '东南亚' : 'Southeast Asia')) fitScore += 4

    return { country, fitScore: Math.min(96, fitScore - index * 2) }
  })
}

export const createMockAI = ({
  productCategory,
  certifications = [],
  companyName,
  currentMarkets = [],
  targetMarkets = [],
  targetCustomers = [],
  coreAdvantages = [],
  coreAdvantageOther = '',
}, lang = 'en') => {
  const categoryItems = getCategoryItems(productCategory)
  const product = categoryItems.join(' ').toLowerCase()
  const categorySummary = categoryItems.slice(0, 3).join(' / ')
  const hasFSC = certifications.includes('FSC')
  const isZh = lang === 'zh'
  const topMarkets = buildTopMarkets(targetMarkets, certifications, currentMarkets, lang)
  const strengths = [...coreAdvantages.filter((item) => item !== '其他'), coreAdvantageOther].filter(Boolean)
  const primaryCustomer = targetCustomers[0]

  const trustText = certifications.length > 0 && !certifications.includes('暂无')
    ? isZh
      ? `已有 ${certifications.filter((item) => item !== '其他').join(' / ')} 等背书，建议围绕信任与稳定交付组织页面表达。`
      : `Existing trust signals such as ${certifications.filter((item) => item !== '其他').join(' / ')} should be used in the go-to-market story.`
    : isZh
      ? '建议尽快补强认证或第三方背书，以提高目标市场信任度。'
      : 'Recommend strengthening certifications or third-party verification to improve trust in the target market.'

  if (product.includes('toy') || product.includes('玩具') || product.includes('积木') || product.includes('毛绒') || product.includes('遥控') || product.includes('模型') || product.includes('拼图')) {
    return {
      topMarkets,
      differentiation: isZh
        ? `建议围绕"${strengths.slice(0, 2).join(' + ') || '安全认证 + 稳定品质'}"做定位，重点服务${primaryCustomer || '品牌商和进口商'}，主推${categorySummary || '核心玩具品类'}。玩具出口核心壁垒是认证，建议优先补齐目标市场所需资质。`
        : `Position around "${strengths.slice(0, 2).join(' + ') || 'safety compliance + quality consistency'}" for ${primaryCustomer || 'brand owners and importers'}, leading with ${categorySummary || 'your core toy categories'}. Safety certification is the #1 barrier in toy exports — prioritize getting compliant first.`,
      requiredCertifications: ['EN71 (Europe)', 'ASTM F963 (USA)', 'CPSC compliance (USA)', 'CE marking', 'ISO 9001'],
      slogan: isZh
        ? `${companyName || '你的工厂'} | 安全认证、稳定交付的玩具出口伙伴`
        : `${companyName || 'Your Factory'} | Certified, Reliable Toy Manufacturer for Global Buyers`,
      valueProps: isZh
        ? [
            `主推品类：${categorySummary || '请补充核心玩具品类'}`,
            `认证齐全，符合${targetMarkets.join(' / ') || '欧美'}主流市场准入要求`,
            `目标客户：${targetCustomers.join(' / ') || '品牌商 / 进口商 / 批发商'}`,
            strengths[0] || '产品安全可追溯，支持买家审厂',
          ]
        : [
            `Lead categories: ${categorySummary || 'Add your core toy categories'}`,
            `Fully certified for ${targetMarkets.join(' / ') || 'Europe / North America'} market entry`,
            `Target customers: ${targetCustomers.join(' / ') || 'brand owners / importers / wholesalers'}`,
            strengths[0] || 'Traceable safety standards with factory audit support',
          ],
      trust: trustText,
    }
  }

  if (product.includes('paper') || product.includes('tissue') || product.includes('卫生纸')) {
    return {
      topMarkets,
      differentiation: isZh
        ? `建议避开纯价格战，围绕${primaryCustomer || '进口商和分销商'}主打${categorySummary || '环保纸品'}、稳定供货和长期复购场景。`
        : `Avoid a pure price fight. Position around ${categorySummary || 'eco paper supply'}, repeat-order reliability, and a clear fit for ${primaryCustomer || 'importers and distributors'}.`,
      requiredCertifications: ['FSC Chain of Custody', 'REACH (if chemicals used)', 'ISO 9001'],
      slogan: isZh
        ? `${companyName || '你的工厂'}，面向增长市场的可持续纸品合作伙伴`
        : `${companyName || 'Your Factory'}, Sustainable Paper Partner for Fast-Growing Markets`,
      valueProps: isZh
        ? [
            '可持续原料，溯源清晰',
            `适合 ${primaryCustomer || '进口商 / 分销商'} 的稳定补货节奏`,
            strengths[0] || '批量供货稳定，质量管控可视化',
          ]
        : [
          'Sustainable raw materials with clear traceability',
          `Built for ${primaryCustomer || 'importer / distributor'} replenishment cycles`,
          strengths[0] || 'Consistent bulk production with quality checkpoints',
        ],
      trust: hasFSC
        ? isZh
          ? '已具备 FSC 信任背书，可优先切入环保采购与高标准买家渠道。'
          : 'FSC is already in place, which supports entry into higher-standard eco-oriented channels.'
        : trustText,
    }
  }

  return {
      topMarkets,
      differentiation: isZh
      ? `建议围绕“${strengths.slice(0, 2).join(' + ') || '稳定交期 + 稳定品质'}”做定位，重点服务${primaryCustomer || '海外目标客户'}，主推${categorySummary || '核心品类'}。`
      : `Position around "${strengths.slice(0, 2).join(' + ') || 'reliable lead time + quality consistency'}" for ${primaryCustomer || 'your target overseas buyers'}, with ${categorySummary || 'your core categories'} as the lead offer.`,
    requiredCertifications: ['ISO 9001', 'Product-specific compliance for destination market'],
    slogan: isZh ? `${companyName || '你的工厂'} | 稳定可靠的 B2B 供货伙伴` : `${companyName || 'Your Factory'} | Built for Reliable B2B Supply`,
    valueProps: isZh
      ? [
          `主推品类建议：${categorySummary || '请补充核心品类'}`,
          `目标市场优先建议：${targetMarkets.join(' / ') || '北美 / 欧洲 / 中东'}`,
          `目标客户方向：${targetCustomers.join(' / ') || '品牌商 / 批发商 / 进口商'}`,
          strengths[0] || '交付窗口可预测，便于长期复购',
        ]
      : [
          `Lead categories: ${categorySummary || 'Add your core product categories'}`,
          `Priority markets: ${targetMarkets.join(' / ') || 'North America / Europe / Middle East'}`,
          `Target customers: ${targetCustomers.join(' / ') || 'brands / wholesalers / importers'}`,
          strengths[0] || 'Predictable fulfillment windows for repeat buyers',
        ],
    trust: trustText,
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
