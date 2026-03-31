export const createMockAI = ({ productCategory, certifications, companyName }) => {
  const product = productCategory.toLowerCase()
  const hasFSC = certifications.includes('FSC')

  if (product.includes('paper') || product.includes('tissue') || product.includes('卫生纸')) {
    return {
      topMarkets: [
        { country: 'Germany', fitScore: 91 },
        { country: 'UAE', fitScore: 84 },
        { country: 'Vietnam', fitScore: 79 },
      ],
      differentiation:
        'Avoid red-ocean commodity tissue. Position as FSC-certified bamboo pulp hygiene paper with stable industrial supply and lower lifecycle footprint.',
      requiredCertifications: ['FSC Chain of Custody', 'REACH (if chemicals used)', 'ISO 9001'],
      slogan: `${companyName || 'Your Factory'}, Sustainable Paper Partner for Fast-Growing Markets`,
      valueProps: [
        'Sustainable raw materials with clear traceability',
        'Flexible MOQ for importer and distributor channels',
        'Consistent bulk production with quality checkpoints',
      ],
      trust: hasFSC
        ? 'FSC credibility already available, fast-track market messaging possible.'
        : 'Recommend FSC onboarding to unlock high-margin eco buyers.',
    }
  }

  return {
    topMarkets: [
      { country: 'USA', fitScore: 88 },
      { country: 'Germany', fitScore: 83 },
      { country: 'UAE', fitScore: 78 },
    ],
    differentiation:
      'Position around reliable lead time + quality consistency for mid-size overseas buyers that are underserved by giant suppliers.',
    requiredCertifications: ['ISO 9001', 'Product-specific compliance for destination market'],
    slogan: `${companyName || 'Your Factory'} | Built for Reliable B2B Supply`,
    valueProps: [
      'Predictable fulfillment windows for repeat buyers',
      'Transparent quality and compliance records',
      'Factory-direct communication for faster decisions',
    ],
    trust: 'With clearer niche positioning, this category can avoid pure price wars.',
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

export const fetchAIStrategy = async (input) => {
  const mode = (import.meta.env.VITE_AI_MODE || 'mock').toLowerCase()

  if (mode !== 'real') {
    return createMockAI(input)
  }

  const response = await fetch('/api/strategy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    throw new Error(`AI request failed with status ${response.status}`)
  }

  const payload = await response.json()
  return normalizeResponse(payload)
}
