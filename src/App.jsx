import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Download,
  Globe2,
  Languages,
  Loader2,
  Maximize2,
  Plus,
  ShieldCheck,
  Trash2,
  TrendingUp,
  Upload,
} from 'lucide-react'
import { createMockAI, fetchAIStrategy } from './lib/ai'

const steps = [
  'Export Readiness',
  'Recommendations',
  'Confirm Direction',
  'Cost Framework',
  'Material Output',
]

const certOptions = ['ISO 9001', 'CE', 'FSC', 'FDA', 'BSCI', 'SGS / 第三方验厂', 'RoHS', 'REACH', '其他', '暂无']
const exportExperienceOptions = [
  { value: 'has', labelZh: '有', labelEn: 'Yes' },
  { value: 'none', labelZh: '暂无', labelEn: 'No' },
]
const currentMarketOptions = ['中国国内', '北美', '欧洲', '东南亚', '中东', '非洲', '拉美', '日韩', '澳洲']
const targetMarketOptions = ['北美', '欧洲', '东南亚', '中东', '非洲', '拉美', '日韩', '澳洲']
const targetCustomerOptions = ['品牌商', '批发商', '进口商', '分销商', '连锁零售', '电商卖家', '工程客户', '暂不明确']
const coreAdvantageOptions = [
  '价格有优势',
  '交期快',
  '质量稳定',
  '认证齐全',
  '支持 OEM / ODM',
  '小单灵活',
  '定制能力强',
  '产能大',
  '出口经验丰富',
  '研发能力强',
  '其他',
]
const productCategorySuggestions = ['纸制品', '包装材料', '家具家居', '五金建材', '清洁用品', '电子产品', '机械设备', '纺织服装', '汽配摩配']

const costReference = {
  usa: {
    tariff: '6% - 18%', tariffMin: 0.06, tariffMax: 0.18,
    logistics: 'High', logisticsMin: 0.08, logisticsMax: 0.15,
    platform: '$3,000 - $10,000 / year', platformMin: 3000, platformMax: 10000,
    certification: '$6,000 - $25,000', certMin: 6000, certMax: 25000,
  },
  germany: {
    tariff: '4% - 12%', tariffMin: 0.04, tariffMax: 0.12,
    logistics: 'Medium', logisticsMin: 0.05, logisticsMax: 0.10,
    platform: '$2,000 - $8,000 / year', platformMin: 2000, platformMax: 8000,
    certification: '$5,000 - $18,000', certMin: 5000, certMax: 18000,
  },
  vietnam: {
    tariff: '0% - 8%', tariffMin: 0, tariffMax: 0.08,
    logistics: 'Low', logisticsMin: 0.03, logisticsMax: 0.07,
    platform: '$1,000 - $5,000 / year', platformMin: 1000, platformMax: 5000,
    certification: '$3,000 - $10,000', certMin: 3000, certMax: 10000,
  },
  uae: {
    tariff: '0% - 10%', tariffMin: 0, tariffMax: 0.10,
    logistics: 'Medium', logisticsMin: 0.05, logisticsMax: 0.10,
    platform: '$1,500 - $6,000 / year', platformMin: 1500, platformMax: 6000,
    certification: '$4,000 - $12,000', certMin: 4000, certMax: 12000,
  },
  default: {
    tariff: '5% - 15%', tariffMin: 0.05, tariffMax: 0.15,
    logistics: 'Medium', logisticsMin: 0.05, logisticsMax: 0.10,
    platform: '$2,000 - $7,000 / year', platformMin: 2000, platformMax: 7000,
    certification: '$4,000 - $15,000', certMin: 4000, certMax: 15000,
  },
}

const PRODUCT_CATEGORY_MAX_LENGTH = 60
const PRODUCT_CATEGORY_MAX_ITEMS = 3
const productCategoryAllowedPattern = /^[\u4e00-\u9fa5A-Za-z0-9\s/&,+\-、，（）()]+$/
const COMPANY_NAME_MAX_LENGTH = 80
const companyNameAllowedPattern = /^[\u4e00-\u9fa5A-Za-z0-9\s&.,'’\-()（）]+$/
const CAPACITY_MAX_LENGTH = 60
const capacityAllowedPattern = /^[\u4e00-\u9fa5A-Za-z0-9\s,./+\-xX*×()（）]+$/
const OTHER_TEXT_MAX_LENGTH = 40
const otherTextAllowedPattern = /^[\u4e00-\u9fa5A-Za-z0-9\s/&,+\-.'’()（）]+$/
const TARGET_MARKET_MAX_LENGTH = 40
const targetMarketAllowedPattern = /^[\u4e00-\u9fa5A-Za-z\s.'’\-()（）]+$/
const PRODUCT_PHOTO_MAX = 3
const FACTORY_PHOTO_MAX = 5
const FACTORY_VIDEO_MAX = 2

const getCostData = (market = '') => {
  const key = market.trim().toLowerCase()
  return costReference[key] || costReference.default
}

const getLocalizedLogisticsLevel = (level, isZh) => {
  const ranges = {
    High: '8%-15%',
    Medium: '5%-10%',
    Low: '3%-7%',
  }
  const range = ranges[level]
  if (!range) return level

  if (!isZh) {
    return `${level} (~${range} of cargo value)`
  }

  const zhLevelMap = {
    High: '高',
    Medium: '中',
    Low: '低',
  }
  const zhLevel = zhLevelMap[level] || level
  return `${zhLevel}（约占货值 ${range}）`
}

const formatUSD = (n) => {
  if (n === 0) return '$0'
  if (n >= 1000) {
    const k = n / 1000
    return `$${k % 1 === 0 ? k : k.toFixed(1)}k`
  }
  return `$${n}`
}

const normalizeProductCategory = (raw = '') =>
  raw.replace(/\n+/g, ' ').replace(/\s+/g, ' ').slice(0, PRODUCT_CATEGORY_MAX_LENGTH)

const buildProductCategoryValue = (items = []) => items.join(' / ')

const normalizeCompanyName = (raw = '') =>
  raw.replace(/\n+/g, ' ').replace(/\s+/g, ' ').slice(0, COMPANY_NAME_MAX_LENGTH)

const normalizeCapacity = (raw = '') =>
  raw.replace(/\n+/g, ' ').replace(/\s+/g, ' ').slice(0, CAPACITY_MAX_LENGTH)

const normalizeOtherText = (raw = '') =>
  raw.replace(/\n+/g, ' ').replace(/\s+/g, ' ').slice(0, OTHER_TEXT_MAX_LENGTH)

const normalizeTargetMarket = (raw = '') =>
  raw.replace(/\n+/g, ' ').replace(/\s+/g, ' ').slice(0, TARGET_MARKET_MAX_LENGTH)

const validateCompanyName = (value, isZh) => {
  const trimmed = value.trim()
  if (!trimmed) {
    return isZh ? '请填写公司名称。' : 'Please enter your company name.'
  }

  if (trimmed.length < 2) {
    return isZh ? '公司名称至少需要 2 个字符。' : 'Company name must be at least 2 characters.'
  }

  if (!companyNameAllowedPattern.test(trimmed)) {
    return isZh
      ? '公司名称仅支持中英文、数字、空格及常见符号（.-&()）。'
      : 'Company name only supports Chinese/English letters, numbers, spaces, and common symbols (.-&()).'
  }

  return ''
}

const validateProductCategory = (value, isZh) => {
  const trimmed = value.trim()
  if (!trimmed) {
    return isZh ? '请填写主营产品/品类。' : 'Please enter your main product category.'
  }

  if (trimmed.length < 2) {
    return isZh ? '主营产品/品类至少需要 2 个字符。' : 'Product category must be at least 2 characters.'
  }

  if (!productCategoryAllowedPattern.test(trimmed)) {
    return isZh
      ? '仅支持中英文、数字、空格及 /、,、&、-、括号。'
      : 'Only Chinese/English letters, numbers, spaces, /, comma, &, -, and parentheses are allowed.'
  }

  const items = trimmed.split(/[/、，,]+/).map((item) => item.trim()).filter(Boolean)
  if (items.length > PRODUCT_CATEGORY_MAX_ITEMS) {
    return isZh
      ? `最多填写 ${PRODUCT_CATEGORY_MAX_ITEMS} 个品类，请用 / 或逗号分隔。`
      : `Up to ${PRODUCT_CATEGORY_MAX_ITEMS} categories are allowed, separated by "/" or commas.`
  }

  return ''
}

const validateCapacity = (value, isZh) => {
  const trimmed = value.trim()
  if (!trimmed) {
    return ''
  }

  if (!capacityAllowedPattern.test(trimmed)) {
    return isZh
      ? '产能/规模仅支持中英文、数字和常见单位符号。'
      : 'Capacity/scale only supports Chinese/English letters, numbers, and common unit symbols.'
  }

  return ''
}

const validateRequiredSelection = (items, isZh, labelZh, labelEn) => {
  if (items.length === 0) {
    return isZh ? `请选择${labelZh}。` : `Please select ${labelEn}.`
  }
  return ''
}

const validateExportExperience = (value, isZh) => {
  if (!value) {
    return isZh ? '请选择是否已有出口经验。' : 'Please indicate whether you already have export experience.'
  }
  return ''
}

const validateOtherText = (value, isZh, fieldType) => {
  const trimmed = value.trim()
  if (!trimmed) {
    return isZh ? '请补充填写。' : 'Please provide details.'
  }

  if (!otherTextAllowedPattern.test(trimmed)) {
    return isZh
      ? `${fieldType}仅支持中英文、数字、空格和常见符号。`
      : `${fieldType} only supports Chinese/English letters, numbers, spaces, and common symbols.`
  }

  return ''
}

const validateTargetMarket = (value, isZh) => {
  const trimmed = value.trim()
  if (!trimmed) {
    return isZh ? '请填写目标国家/市场。' : 'Please enter your target country/market.'
  }

  if (trimmed.length < 2) {
    return isZh ? '目标国家/市场至少需要 2 个字符。' : 'Target country/market must be at least 2 characters.'
  }

  if (!targetMarketAllowedPattern.test(trimmed)) {
    return isZh
      ? '目标国家/市场仅支持中英文、空格、点、连字符和括号。'
      : 'Target country/market only supports Chinese/English letters, spaces, dots, hyphens, and parentheses.'
  }

  return ''
}


const getCategoryItems = (value = '') =>
  value
    .split(/[/、，,]+/)
    .map((item) => item.trim())
    .filter(Boolean)

const getUniqueCategoryItems = (items = []) => {
  const seen = new Set()
  return items.filter((item) => {
    const key = item.trim().toLowerCase()
    if (!key || seen.has(key)) {
      return false
    }
    seen.add(key)
    return true
  })
}

const getMarketReason = (country, isZh) => {
  const reasons = {
    USA: isZh ? '需求体量大，适合强调稳定交期、质量一致性和长期供货能力。' : 'Large demand base for suppliers with reliable lead times and repeatable quality.',
    Germany: isZh ? '重视认证、环保和供应稳定，适合突出合规与可持续优势。' : 'Strong fit for compliance, sustainability, and dependable supply positioning.',
    UAE: isZh ? '辐射中东分销网络，适合做区域分销和批量供货切入。' : 'Good regional hub for distributor-led expansion and wholesale supply.',
    Vietnam: isZh ? '适合先做东南亚试水，进入成本和物流压力相对更低。' : 'A lighter-weight Southeast Asia entry point with lower logistics pressure.',
  }

  return reasons[country] || (isZh ? '适合作为下一步重点验证市场。' : 'A reasonable market to validate next.')
}

const getEntryDifficulty = (market, isZh) => {
  const map = {
    usa: isZh ? '中高，竞争强但需求大' : 'Medium-high, competitive but large demand',
    germany: isZh ? '中高，重合规与认证' : 'Medium-high, compliance heavy',
    vietnam: isZh ? '中等，适合低成本试水' : 'Medium, lighter-cost entry',
    uae: isZh ? '中等，适合区域分销切入' : 'Medium, strong for distributor-led entry',
  }

  const key = market.trim().toLowerCase()
  return map[key] || (isZh ? '中等，建议进一步核实 HS 编码和渠道要求' : 'Medium, validate HS code and channel requirements')
}


const usWebsiteCopy = {
  heroEyebrow: 'ONE-PAGE WEBSITE PREVIEW',
  heroTitle: 'Reliable B2B Manufacturing Partner for U.S. Buyers',
  heroSubtitle:
    'Reduce sourcing risk with stable lead times, transparent quality control, and direct factory communication.',
  aboutTitle: 'About Us',
  aboutText:
    'We help importers and brand owners scale with dependable manufacturing, compliance-ready workflows, and long-term supply support.',
  whyTitle: 'Why Buyers Choose Us',
  whyItems: [
    'Predictable delivery windows for repeat purchase planning',
    'Quality and compliance records with clear documentation',
    'Direct factory communication for faster decisions',
  ],
  productTitle: 'Product Info',
  trustTitle: 'Trust & Certifications',
  contactTitle: 'Contact Us',
  contactText: 'Request samples, pricing, lead time, and customization details from our team.',
}

function App() {
  const [step, setStep] = useState(1)
  const [analyzing, setAnalyzing] = useState(false)
  const [downloadingPdf, setDownloadingPdf] = useState(false)
  const [formError, setFormError] = useState('')
  const [analysisError, setAnalysisError] = useState('')
  const [pdfError, setPdfError] = useState('')
  const [step1Submitted, setStep1Submitted] = useState(false)
  const [companyNameError, setCompanyNameError] = useState('')
  const [companyNameTouched, setCompanyNameTouched] = useState(false)
  const [productCategoryError, setProductCategoryError] = useState('')
  const [productCategoryTouched, setProductCategoryTouched] = useState(false)
  const [productCategoryDraft, setProductCategoryDraft] = useState('')
  const [capacityError, setCapacityError] = useState('')
  const [capacityTouched, setCapacityTouched] = useState(false)
  const [exportExperienceError, setExportExperienceError] = useState('')
  const [currentMarketsError, setCurrentMarketsError] = useState('')
  const [targetMarketsError, setTargetMarketsError] = useState('')
  const [targetCustomersError, setTargetCustomersError] = useState('')
  const [coreAdvantagesError, setCoreAdvantagesError] = useState('')
  const [certOtherError, setCertOtherError] = useState('')
  const [coreAdvantageOtherError, setCoreAdvantageOtherError] = useState('')
  const [coreAdvantageOtherDraft, setCoreAdvantageOtherDraft] = useState('')
  const [targetMarketError, setTargetMarketError] = useState('')
  const [targetMarketTouched, setTargetMarketTouched] = useState(false)
  const [productNameError, setProductNameError] = useState('')
  const [actionError, setActionError] = useState('')
  const [websiteGenerated, setWebsiteGenerated] = useState(false)
  const [onePagerGenerated, setOnePagerGenerated] = useState(false)
  const [lang, setLang] = useState('zh')
  const [selectedPath, setSelectedPath] = useState('accept')
  const [showFullscreen, setShowFullscreen] = useState(false)
  const [showDecisionFactors, setShowDecisionFactors] = useState(false)
  const [cargoValue, setCargoValue] = useState('')
  const [showLeadGate, setShowLeadGate] = useState(false)
  const [leadContact, setLeadContact] = useState({ wechat: '', name: '' })
  const [leadContactError, setLeadContactError] = useState('')
  const [pendingAnalysis, setPendingAnalysis] = useState(false)
  const [leadData, setLeadData] = useState({
    step1: {
      companyName: '',
      productCategory: '',
      currentCapacity: '',
      exportExperience: '',
      certifications: [],
      certificationOther: '',
      currentMarkets: [],
      targetMarkets: [],
      targetCustomers: [],
      coreAdvantages: [],
      coreAdvantageOther: '',
    },
    step2: {
      aiPositioning: null,
    },
    step3: {
      targetMarket: '',
    },
    step5: {
      products: [
        { name: '', info: ['', '', ''], photos: [] },
        { name: '', info: ['', '', ''], photos: [] },
        { name: '', info: ['', '', ''], photos: [] },
      ],
      factoryPhotos: [],
      factoryVideos: [],
    },
  })

  const pdfRef = useRef(null)
  const companyNameRef = useRef(null)
  const productCategoryRef = useRef(null)
  const exportExperienceRef = useRef(null)
  const currentMarketsRef = useRef(null)
  const targetMarketsRef = useRef(null)
  const targetCustomersRef = useRef(null)
  const coreAdvantagesRef = useRef(null)
  const certOtherRef = useRef(null)
  const coreAdvantageOtherRef = useRef(null)

  const currentMarket =
    leadData.step3.targetMarket || leadData.step2.aiPositioning?.topMarkets?.[0]?.country || ''

  const costData = useMemo(() => getCostData(currentMarket), [currentMarket])

  const progress = (step / steps.length) * 100
  const isZh = lang === 'zh'
  const stepLabels = isZh
    ? ['出口准备度测评', '建议结果', '方向确认', '成本框架', '物料生成']
    : steps

  useEffect(() => {
    document.documentElement.lang = isZh ? 'zh-CN' : 'en'
  }, [isZh])

  const getInputClassName = (hasError) =>
    `w-full rounded-xl border bg-white px-4 py-3 outline-none ring-moss/30 transition focus:ring ${
      hasError ? 'border-clay bg-clay/5' : 'border-black/15'
    }`

  const getSelectionGroupClassName = (hasError) =>
    `rounded-2xl border p-3 transition ${
      hasError ? 'border-clay bg-clay/5' : 'border-black/10 bg-white'
    }`

  const scrollToStep1Error = (refs = []) => {
    const firstRef = refs.find((ref) => ref?.current)
    if (typeof firstRef?.current?.scrollIntoView === 'function') {
      firstRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  const updateStep1 = (field, value) => {
    setLeadData((prev) => ({
      ...prev,
      step1: {
        ...prev.step1,
        [field]: value,
      },
    }))
  }

  const syncProductCategoryValue = (items) => {
    const nextValue = buildProductCategoryValue(getUniqueCategoryItems(items))
    updateStep1('productCategory', nextValue)

    if (productCategoryTouched) {
      setProductCategoryError(validateProductCategory(nextValue, isZh))
    }
  }

  const toggleExclusiveMultiSelect = (field, value, max, exclusiveValue) => {
    setLeadData((prev) => {
      const current = prev.step1[field]
      const exists = current.includes(value)

      if (exists) {
        return {
          ...prev,
          step1: {
            ...prev.step1,
            [field]: current.filter((item) => item !== value),
          },
        }
      }

      if (value === exclusiveValue) {
        return {
          ...prev,
          step1: {
            ...prev.step1,
            [field]: [value],
          },
        }
      }

      const next = current.filter((item) => item !== exclusiveValue)
      return {
        ...prev,
        step1: {
          ...prev.step1,
          [field]: next.length >= max ? [...next.slice(1), value] : [...next, value],
        },
      }
    })
  }

  const handleExportExperienceChange = (value) => {
    setLeadData((prev) => ({
      ...prev,
      step1: {
        ...prev.step1,
        exportExperience: value,
        currentMarkets: value === 'none' ? [] : prev.step1.currentMarkets,
      },
    }))
  }

  const handleProductCategoryChange = (value) => {
    setProductCategoryDraft(normalizeProductCategory(value))
  }

  const addProductCategoryTag = (rawValue) => {
    const normalized = normalizeProductCategory(rawValue).trim()
    if (!normalized) {
      return
    }

    if (normalized.length < 2) {
      setProductCategoryTouched(true)
      setProductCategoryError(isZh ? '主营产品/品类至少需要 2 个字符。' : 'Product category must be at least 2 characters.')
      return
    }

    if (!productCategoryAllowedPattern.test(normalized)) {
      setProductCategoryTouched(true)
      setProductCategoryError(
        isZh
          ? '仅支持中英文、数字、空格及 /、,、&、-、括号。'
          : 'Only Chinese/English letters, numbers, spaces, /, comma, &, -, and parentheses are allowed.',
      )
      return
    }

    const existingItems = getCategoryItems(leadData.step1.productCategory)
    const exists = existingItems.some((item) => item.toLowerCase() === normalized.toLowerCase())
    if (exists) {
      setProductCategoryDraft('')
      return
    }

    if (existingItems.length >= PRODUCT_CATEGORY_MAX_ITEMS) {
      setProductCategoryTouched(true)
      setProductCategoryError(
        isZh
          ? `最多选择 ${PRODUCT_CATEGORY_MAX_ITEMS} 个品类。`
          : `You can select up to ${PRODUCT_CATEGORY_MAX_ITEMS} categories.`,
      )
      return
    }

    syncProductCategoryValue([...existingItems, normalized])
    setProductCategoryTouched(true)
    setProductCategoryError('')
    setProductCategoryDraft('')
  }

  const removeProductCategoryTag = (tag) => {
    const nextItems = getCategoryItems(leadData.step1.productCategory).filter((item) => item !== tag)
    syncProductCategoryValue(nextItems)
    setProductCategoryTouched(true)
  }

  const toggleProductCategoryTag = (tag) => {
    const currentItems = getCategoryItems(leadData.step1.productCategory)
    if (currentItems.includes(tag)) {
      removeProductCategoryTag(tag)
      return
    }

    addProductCategoryTag(tag)
  }

  const handleProductCategoryBlur = () => {
    setProductCategoryTouched(true)
    if (productCategoryDraft.trim()) {
      addProductCategoryTag(productCategoryDraft)
      return
    }
    setProductCategoryError(validateProductCategory(leadData.step1.productCategory, isZh))
  }

  const handleCompanyNameChange = (value) => {
    const normalized = normalizeCompanyName(value)
    updateStep1('companyName', normalized)

    if (companyNameTouched) {
      setCompanyNameError(validateCompanyName(normalized, isZh))
    }
  }

  const handleCompanyNameBlur = () => {
    setCompanyNameTouched(true)
    setCompanyNameError(validateCompanyName(leadData.step1.companyName, isZh))
  }

  const handleCapacityChange = (value) => {
    const normalized = normalizeCapacity(value)
    updateStep1('currentCapacity', normalized)

    if (capacityTouched) {
      setCapacityError(validateCapacity(normalized, isZh))
    }
  }

  const handleCapacityBlur = () => {
    setCapacityTouched(true)
    setCapacityError(validateCapacity(leadData.step1.currentCapacity, isZh))
  }

  const handleCertificationOtherChange = (value) => {
    const normalized = normalizeOtherText(value)
    updateStep1('certificationOther', normalized)

    if (leadData.step1.certifications.includes('其他')) {
      setCertOtherError(validateOtherText(normalized, isZh, isZh ? '认证补充信息' : 'Certification details'))
    }
  }

  const handleCoreAdvantageOtherChange = (value) => {
    const normalized = normalizeOtherText(value)
    setCoreAdvantageOtherDraft(normalized)
  }

  const addCoreAdvantageOtherTag = (rawValue) => {
    const normalized = normalizeOtherText(rawValue)
    const validation = validateOtherText(normalized, isZh, isZh ? '优势补充信息' : 'Advantage details')

    if (validation) {
      setCoreAdvantageOtherError(validation)
      return
    }

    updateStep1('coreAdvantageOther', normalized)
    setCoreAdvantageOtherDraft('')
    setCoreAdvantageOtherError('')
  }

  const removeCoreAdvantageOtherTag = () => {
    updateStep1('coreAdvantageOther', '')
    setCoreAdvantageOtherDraft('')
    setCoreAdvantageOtherError('')
  }

  const handleTargetMarketChange = (value) => {
    const normalized = normalizeTargetMarket(value)
    setLeadData((prev) => ({
      ...prev,
      step3: { targetMarket: normalized },
    }))
    if (targetMarketTouched) {
      setTargetMarketError(validateTargetMarket(normalized, isZh))
    }
  }

  const handleTargetMarketBlur = () => {
    setTargetMarketTouched(true)
    setTargetMarketError(validateTargetMarket(leadData.step3.targetMarket, isZh))
  }

  const handleProductNameChange = (productIndex, value) => {
    setLeadData((prev) => ({
      ...prev,
      step5: {
        ...prev.step5,
        products: prev.step5.products.map((p, i) => i === productIndex ? { ...p, name: value } : p),
      },
    }))
    if (productIndex === 0 && value.trim()) setProductNameError('')
  }

  const handleProductInfoChange = (productIndex, infoIndex, value) => {
    setLeadData((prev) => ({
      ...prev,
      step5: {
        ...prev.step5,
        products: prev.step5.products.map((p, i) =>
          i === productIndex ? { ...p, info: p.info.map((item, j) => (j === infoIndex ? value : item)) } : p
        ),
      },
    }))
  }

  const handleStep5PhotoUpload = (productIndex, event) => {
    const files = Array.from(event.target.files || []).filter((f) => f.type.startsWith('image/'))
    const remaining = PRODUCT_PHOTO_MAX - leadData.step5.products[productIndex].photos.length
    const toAdd = files.slice(0, remaining).map((file) => ({ name: file.name, file, url: URL.createObjectURL(file) }))
    setLeadData((prev) => ({
      ...prev,
      step5: {
        ...prev.step5,
        products: prev.step5.products.map((p, i) =>
          i === productIndex ? { ...p, photos: [...p.photos, ...toAdd] } : p
        ),
      },
    }))
  }

  const removeStep5Photo = (productIndex, photoIndex) => {
    setLeadData((prev) => ({
      ...prev,
      step5: {
        ...prev.step5,
        products: prev.step5.products.map((p, i) =>
          i === productIndex ? { ...p, photos: p.photos.filter((_, j) => j !== photoIndex) } : p
        ),
      },
    }))
  }

  const handleFactoryPhotoUpload = (event) => {
    const files = Array.from(event.target.files || []).filter((f) => f.type.startsWith('image/'))
    const remaining = FACTORY_PHOTO_MAX - leadData.step5.factoryPhotos.length
    const toAdd = files.slice(0, remaining).map((file) => ({ name: file.name, file, url: URL.createObjectURL(file) }))
    setLeadData((prev) => ({
      ...prev,
      step5: { ...prev.step5, factoryPhotos: [...prev.step5.factoryPhotos, ...toAdd] },
    }))
  }

  const removeFactoryPhoto = (index) => {
    setLeadData((prev) => ({
      ...prev,
      step5: { ...prev.step5, factoryPhotos: prev.step5.factoryPhotos.filter((_, i) => i !== index) },
    }))
  }

  const handleFactoryVideoUpload = (event) => {
    const files = Array.from(event.target.files || []).filter((f) => f.type.startsWith('video/'))
    const remaining = FACTORY_VIDEO_MAX - leadData.step5.factoryVideos.length
    const toAdd = files.slice(0, remaining).map((file) => ({ name: file.name, file, url: URL.createObjectURL(file) }))
    setLeadData((prev) => ({
      ...prev,
      step5: { ...prev.step5, factoryVideos: [...prev.step5.factoryVideos, ...toAdd] },
    }))
  }

  const removeFactoryVideo = (index) => {
    setLeadData((prev) => ({
      ...prev,
      step5: { ...prev.step5, factoryVideos: prev.step5.factoryVideos.filter((_, i) => i !== index) },
    }))
  }

  useEffect(() => {
    if (!productCategoryTouched) {
      return
    }

    setProductCategoryError(validateProductCategory(leadData.step1.productCategory, isZh))
  }, [isZh, leadData.step1.productCategory, productCategoryTouched])

  useEffect(() => {
    if (!companyNameTouched) {
      return
    }
    setCompanyNameError(validateCompanyName(leadData.step1.companyName, isZh))
  }, [companyNameTouched, isZh, leadData.step1.companyName])

  useEffect(() => {
    if (!capacityTouched) {
      return
    }
    setCapacityError(validateCapacity(leadData.step1.currentCapacity, isZh))
  }, [capacityTouched, isZh, leadData.step1.currentCapacity])

  useEffect(() => {
    setExportExperienceError(validateExportExperience(leadData.step1.exportExperience, isZh))
  }, [isZh, leadData.step1.exportExperience])

  useEffect(() => {
    if (leadData.step1.exportExperience !== 'has') {
      setCurrentMarketsError('')
      return
    }

    setCurrentMarketsError(
      validateRequiredSelection(
        leadData.step1.currentMarkets,
        isZh,
        '当前主要销售市场',
        'your current sales markets',
      ),
    )
  }, [isZh, leadData.step1.currentMarkets, leadData.step1.exportExperience])

  useEffect(() => {
    setTargetMarketsError(
      validateRequiredSelection(
        leadData.step1.targetMarkets,
        isZh,
        '想重点开发的目标市场',
        'your target markets',
      ),
    )
  }, [isZh, leadData.step1.targetMarkets])

  useEffect(() => {
    setTargetCustomersError(
      validateRequiredSelection(
        leadData.step1.targetCustomers,
        isZh,
        '目标客户类型',
        'your target customers',
      ),
    )
  }, [isZh, leadData.step1.targetCustomers])

  useEffect(() => {
    setCoreAdvantagesError(
      validateRequiredSelection(
        leadData.step1.coreAdvantages,
        isZh,
        '核心竞争优势',
        'your core advantages',
      ),
    )
  }, [isZh, leadData.step1.coreAdvantages])

  useEffect(() => {
    if (!leadData.step1.certifications.includes('其他')) {
      setCertOtherError('')
      return
    }
    setCertOtherError(validateOtherText(leadData.step1.certificationOther, isZh, isZh ? '认证补充信息' : 'Certification details'))
  }, [isZh, leadData.step1.certificationOther, leadData.step1.certifications])

  useEffect(() => {
    if (!leadData.step1.coreAdvantages.includes('其他')) {
      setCoreAdvantageOtherError('')
      setCoreAdvantageOtherDraft('')
      if (leadData.step1.coreAdvantageOther) {
        updateStep1('coreAdvantageOther', '')
      }
      return
    }
    setCoreAdvantageOtherError(
      validateOtherText(leadData.step1.coreAdvantageOther, isZh, isZh ? '优势补充信息' : 'Advantage details'),
    )
  }, [isZh, leadData.step1.coreAdvantageOther, leadData.step1.coreAdvantages])

  useEffect(() => {
    if (!targetMarketTouched || selectedPath !== 'manual') {
      return
    }
    setTargetMarketError(validateTargetMarket(leadData.step3.targetMarket, isZh))
  }, [isZh, leadData.step3.targetMarket, selectedPath, targetMarketTouched])

  const toggleCertification = (cert) => {
    setLeadData((prev) => {
      const exists = prev.step1.certifications.includes(cert)
      if (exists) {
        return {
          ...prev,
          step1: {
            ...prev.step1,
            certifications: prev.step1.certifications.filter((item) => item !== cert),
            certificationOther: cert === '其他' ? '' : prev.step1.certificationOther,
          },
        }
      }

      if (cert === '暂无') {
        return {
          ...prev,
          step1: {
            ...prev.step1,
            certifications: ['暂无'],
            certificationOther: '',
          },
        }
      }

      return {
        ...prev,
        step1: {
          ...prev.step1,
          certifications: [...prev.step1.certifications.filter((item) => item !== '暂无'), cert],
        },
      }
    })
  }

  const handleStep1Submit = async () => {
    if (analyzing) {
      return
    }

    const companyNameValidation = validateCompanyName(leadData.step1.companyName, isZh)
    const productCategoryValidation = validateProductCategory(leadData.step1.productCategory, isZh)
    const capacityValidation = validateCapacity(leadData.step1.currentCapacity, isZh)
    const exportExperienceValidation = validateExportExperience(leadData.step1.exportExperience, isZh)
    const currentMarketsValidation = validateRequiredSelection(
      leadData.step1.exportExperience === 'has' ? leadData.step1.currentMarkets : ['__skip__'],
      isZh,
      '当前主要销售市场',
      'your current sales markets',
    )
    const targetMarketsValidation = validateRequiredSelection(
      leadData.step1.targetMarkets,
      isZh,
      '想重点开发的目标市场',
      'your target markets',
    )
    const targetCustomersValidation = validateRequiredSelection(
      leadData.step1.targetCustomers,
      isZh,
      '目标客户类型',
      'your target customers',
    )
    const coreAdvantagesValidation = validateRequiredSelection(
      leadData.step1.coreAdvantages,
      isZh,
      '核心竞争优势',
      'your core advantages',
    )
    const certOtherValidation = leadData.step1.certifications.includes('其他')
      ? validateOtherText(leadData.step1.certificationOther, isZh, isZh ? '认证补充信息' : 'Certification details')
      : ''
    const coreAdvantageOtherValidation = leadData.step1.coreAdvantages.includes('其他')
      ? validateOtherText(leadData.step1.coreAdvantageOther, isZh, isZh ? '优势补充信息' : 'Advantage details')
      : ''

    if (
      companyNameValidation ||
      productCategoryValidation ||
      capacityValidation ||
      exportExperienceValidation ||
      currentMarketsValidation ||
      targetMarketsValidation ||
      targetCustomersValidation ||
      coreAdvantagesValidation ||
      certOtherValidation ||
      coreAdvantageOtherValidation
    ) {
      setStep1Submitted(true)
      setFormError(
        isZh
          ? '请先补充完整基础信息后再生成建议结果。'
          : 'Please complete the required inputs before generating recommendations.',
      )
      setCompanyNameTouched(true)
      setCompanyNameError(companyNameValidation)
      setProductCategoryTouched(true)
      setProductCategoryError(productCategoryValidation)
      setCapacityTouched(true)
      setCapacityError(capacityValidation)
      setExportExperienceError(exportExperienceValidation)
      setCurrentMarketsError(currentMarketsValidation)
      setTargetMarketsError(targetMarketsValidation)
      setTargetCustomersError(targetCustomersValidation)
      setCoreAdvantagesError(coreAdvantagesValidation)
      setCertOtherError(certOtherValidation)
      setCoreAdvantageOtherError(coreAdvantageOtherValidation)
      scrollToStep1Error([
        companyNameValidation ? companyNameRef : null,
        productCategoryValidation ? productCategoryRef : null,
        exportExperienceValidation ? exportExperienceRef : null,
        currentMarketsValidation ? currentMarketsRef : null,
        targetMarketsValidation ? targetMarketsRef : null,
        targetCustomersValidation ? targetCustomersRef : null,
        coreAdvantagesValidation ? coreAdvantagesRef : null,
        certOtherValidation ? certOtherRef : null,
        coreAdvantageOtherValidation ? coreAdvantageOtherRef : null,
      ])
      return
    }

    setFormError('')
    setStep1Submitted(true)
    setShowLeadGate(true)
  }

  const handleStep3Continue = () => {
    const fallbackMarket = leadData.step2.aiPositioning?.topMarkets?.[0]?.country || ''
    const market = selectedPath === 'accept' ? fallbackMarket : leadData.step3.targetMarket
    const marketValidation = selectedPath === 'manual' ? validateTargetMarket(leadData.step3.targetMarket, isZh) : ''

    if (marketValidation) {
      setTargetMarketTouched(true)
      setTargetMarketError(marketValidation)
      return
    }

    setLeadData((prev) => ({
      ...prev,
      step3: {
        targetMarket: market.trim(),
      },
    }))
    setStep(4)
  }

  const downloadPdf = async () => {
    if (!pdfRef.current || downloadingPdf) {
      return
    }

    if (!onePagerGenerated) {
      setActionError(isZh ? '请先点击“生成 One-pager”再下载 PDF。' : 'Please click "Generate One-pager" before downloading PDF.')
      return
    }

    setActionError('')
    setPdfError('')
    setDownloadingPdf(true)

    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')])
      const canvas = await html2canvas(pdfRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
      })

      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const imgRatio = canvas.width / canvas.height
      let imgWidth = pageWidth - 16
      let imgHeight = imgWidth / imgRatio

      if (imgHeight > pageHeight - 20) {
        imgHeight = pageHeight - 20
        imgWidth = imgHeight * imgRatio
      }

      pdf.addImage(imgData, 'PNG', 8, 8, imgWidth, imgHeight)
      pdf.setTextColor(130)
      pdf.setFontSize(8)
      pdf.text('Generated by FactoryGoGlobal AI Navigator (MVP)', 10, pageHeight - 6)
      pdf.save(`one-pager-${leadData.step1.companyName || 'factory'}.pdf`)
    } catch {
      setPdfError(isZh ? 'PDF 下载失败，请稍后重试。' : 'PDF download failed. Please try again.')
    } finally {
      setDownloadingPdf(false)
    }
  }

  const ai = leadData.step2.aiPositioning
  const topMarket = ai?.topMarkets?.[0]
  const backupMarkets = ai?.topMarkets?.slice(1) || []
  const categoryItems = getCategoryItems(leadData.step1.productCategory)
  const primaryImage = leadData.step5.products[0]?.photos[0]?.url
  const productEntries = leadData.step5.products.filter((p) => p.name.trim())

  const runAnalysis = async () => {
    setShowLeadGate(false)
    setAnalysisError('')
    setAnalyzing(true)
    try {
      const aiPositioning = await fetchAIStrategy(leadData.step1, lang)
      setLeadData((prev) => ({ ...prev, step2: { aiPositioning } }))
      setStep(2)
    } catch {
      const fallback = createMockAI(leadData.step1, lang)
      setLeadData((prev) => ({ ...prev, step2: { aiPositioning: fallback } }))
      setAnalysisError(
        isZh ? '建议服务暂时不可用，已展示默认建议。' : 'Recommendation service is temporarily unavailable. Showing fallback recommendation.',
      )
      setStep(2)
    } finally {
      setAnalyzing(false)
    }
  }

  const submitLeadGate = () => {
    if (!leadContact.wechat.trim()) {
      setLeadContactError(isZh ? '请填写微信号，方便顾问联系你。' : 'Please enter your WeChat ID.')
      return
    }
    setLeadContactError('')
    runAnalysis()
  }

  const validateStep5Inputs = () => {
    if (!leadData.step5.products[0].name.trim()) {
      setProductNameError(isZh ? '请至少填写第 1 个产品名称。' : 'Please enter at least the first product name.')
      return false
    }
    setProductNameError('')
    return true
  }

  const generateWebsitePreview = () => {
    if (!validateStep5Inputs()) {
      setWebsiteGenerated(false)
      return
    }
    setActionError('')
    setWebsiteGenerated(true)
  }

  const generateOnePagerPreview = () => {
    if (!validateStep5Inputs()) {
      setOnePagerGenerated(false)
      return
    }
    setActionError('')
    setOnePagerGenerated(true)
  }

  return (
    <main className="relative mx-auto max-w-6xl px-3 pb-14 pt-3 text-ink sm:px-4 md:px-8 md:pt-6">
      <div className="absolute right-3 top-3 z-10 sm:right-4 md:right-8 md:top-6">
        <button
          type="button"
          onClick={() => setLang((prev) => (prev === 'zh' ? 'en' : 'zh'))}
          className="inline-flex items-center gap-1 rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-semibold text-black/75 shadow-soft"
        >
          <Languages className="h-3.5 w-3.5" />
          {isZh ? '切换 EN' : '切换中文'}
        </button>
      </div>

      <header className="mb-4 pr-24 md:mb-5">
        <p className="text-[11px] uppercase tracking-[0.22em] text-moss/70">FactoryGoGlobal</p>
        <h1 className="mt-1 text-2xl md:text-3xl">{isZh ? 'B2B 工厂出海智能导航' : 'B2B Export Readiness Navigator'}</h1>
        <p className="mt-1 hidden max-w-2xl text-sm text-black/65 md:block">
          {isZh
            ? '快速评估出海可行性，找到差异化定位，并生成可直接转化的营销物料。'
            : 'Assess go-global potential, lock a differentiated strategy, and generate conversion-ready materials in minutes.'}
        </p>
      </header>

      <section className="mb-4 rounded-3xl border border-black/5 bg-white/80 p-3 backdrop-blur md:mb-6 md:p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-ink">
              {step}. {stepLabels[step - 1]}
            </p>
            {step < steps.length && (
              <p className="mt-1 text-xs text-black/50">
                {isZh ? `下一步：${stepLabels[step]}` : `Next step: ${stepLabels[step]}`}
              </p>
            )}
          </div>
          <div className="rounded-xl bg-sand px-3 py-2 text-xs font-semibold text-black/70">
            {isZh ? '步骤' : 'Step'} {step} / {steps.length}
          </div>
        </div>
        <div className="h-1.5 rounded-full bg-black/10">
          <div className="h-1.5 rounded-full bg-moss transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      </section>

      <section className="p-1 md:p-2">
          {step === 1 && (
            <div className="space-y-5">
              <h2 className="text-2xl">{isZh ? '第 1 步：出口准备度测评' : 'Step 1. Export Readiness'}</h2>
              <div className="rounded-2xl border border-moss/20 bg-moss/5 p-5">
                <p className="text-sm text-black/70">
                  {isZh
                    ? '填写以下基础信息，系统将结合您的产品、市场和优势，生成初步的市场与定位建议。预计 1 分钟完成。'
                    : 'Complete the inputs below and the system will generate initial market and positioning recommendations based on your products, markets, and strengths.'}
                </p>
              </div>

              <div className="space-y-5">
                  <SectionCard
                    title={isZh ? 'A. 企业与产品基础' : 'A. Company & Product Basics'}
                    description={
                      isZh
                        ? '先告诉我们你是谁、卖什么，以及大致供货能力。'
                        : 'Start with who you are, what you sell, and your general supply scale.'
                    }
                  >
                  <div className="grid gap-4 md:grid-cols-2">
                    <QuestionBlock>
                    <Field label={isZh ? '公司名称' : 'Company Name'}>
                      <div ref={companyNameRef}>
                      <input
                        className={getInputClassName(!!companyNameError)}
                        value={leadData.step1.companyName}
                        onChange={(e) => handleCompanyNameChange(e.target.value)}
                        onBlur={handleCompanyNameBlur}
                        placeholder={isZh ? '例如：浙江某某实业有限公司' : 'e.g. Zhejiang Eco Paper Co., Ltd'}
                      />
                      </div>
                      <div className="mt-1 flex flex-wrap items-center justify-between gap-1 text-xs">
                        <span className={companyNameError ? 'text-clay' : 'text-black/45'}>
                          {companyNameError || ' '}
                        </span>
                        <span className="text-black/45">{leadData.step1.companyName.trim().length}/{COMPANY_NAME_MAX_LENGTH}</span>
                      </div>
                    </Field>
                    </QuestionBlock>
                    <QuestionBlock>
                    <Field label={isZh ? '主营产品/品类' : 'Main Product Category'}>
                      <div ref={productCategoryRef} className={getSelectionGroupClassName(!!productCategoryError)}>
                        <div className="flex flex-wrap gap-2">
                          {categoryItems.length > 0
                            ? categoryItems.map((item) => (
                              <button
                                key={item}
                                type="button"
                                onClick={() => removeProductCategoryTag(item)}
                                className="inline-flex items-center gap-1 rounded-full border border-moss bg-moss px-3 py-1.5 text-xs font-medium text-white shadow-[0_4px_14px_rgba(37,84,74,0.16)] transition hover:opacity-90"
                              >
                                {item}
                                <span className="text-sm leading-none">×</span>
                              </button>
                            ))
                            : (
                              <p className="py-1 text-xs text-black/45">
                                {isZh ? '请选择或补充 1-3 个主营品类' : 'Select or add 1-3 main categories'}
                              </p>
                            )}
                        </div>
                        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                          <input
                            className={getInputClassName(!!productCategoryError)}
                            value={productCategoryDraft}
                            onChange={(e) => handleProductCategoryChange(e.target.value)}
                            onBlur={handleProductCategoryBlur}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                addProductCategoryTag(productCategoryDraft)
                              }
                            }}
                            placeholder={isZh ? '输入更具体品类，例如：抽纸、礼盒包装' : 'Input a specific category, e.g. facial tissue'}
                          />
                          <button
                            type="button"
                            onClick={() => addProductCategoryTag(productCategoryDraft)}
                            disabled={categoryItems.length >= PRODUCT_CATEGORY_MAX_ITEMS}
                            className="inline-flex items-center justify-center rounded-xl border border-black/15 bg-sand px-4 py-3 text-sm font-semibold text-black/70 transition hover:border-moss/35 hover:text-moss disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                          >
                            {isZh ? '添加品类' : 'Add Tag'}
                          </button>
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {productCategorySuggestions.map((example) => (
                          <SelectionChip
                            key={example}
                            selected={categoryItems.includes(example)}
                            disabled={categoryItems.length >= PRODUCT_CATEGORY_MAX_ITEMS && !categoryItems.includes(example)}
                            onClick={() => toggleProductCategoryTag(example)}
                          >
                            {example}
                          </SelectionChip>
                        ))}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center justify-between gap-1 text-xs">
                        <span className={productCategoryError ? 'text-clay' : 'text-black/50'}>
                          {productCategoryError ||
                            (isZh
                              ? `先选推荐品类，也可以直接补充具体产品；最多 ${PRODUCT_CATEGORY_MAX_ITEMS} 个`
                              : `Pick suggested categories or add your own specific product terms; max ${PRODUCT_CATEGORY_MAX_ITEMS}`)}
                        </span>
                        <span className="text-black/45">
                          {categoryItems.length}/{PRODUCT_CATEGORY_MAX_ITEMS}
                        </span>
                      </div>
                    </Field>
                    </QuestionBlock>
                  </div>

                    <QuestionBlock>
                  <Field label={isZh ? '大致产能/规模' : 'Current Capacity / Scale'}>
                    <input
                      className={getInputClassName(!!capacityError)}
                      value={leadData.step1.currentCapacity}
                      onChange={(e) => handleCapacityChange(e.target.value)}
                      onBlur={handleCapacityBlur}
                      placeholder={isZh ? '例如：月产 8000 吨，5 条产线' : 'e.g. 8,000 tons/month, 5 production lines'}
                    />
                    <div className="mt-1 flex flex-wrap items-center justify-between gap-1 text-xs">
                      <span className={capacityError ? 'text-clay' : 'text-black/50'}>
                        {capacityError ||
                          (isZh
                            ? '选填，建议填写月产能、日产能、工厂面积或产线数量'
                            : 'Optional: monthly capacity, daily output, facility size, or production lines')}
                      </span>
                      <span className="text-black/45">{leadData.step1.currentCapacity.trim().length}/{CAPACITY_MAX_LENGTH}</span>
                    </div>
                  </Field>
                  </QuestionBlock>
                  </SectionCard>

                  <SectionCard
                    title={isZh ? 'B. 市场方向' : 'B. Market Direction'}
                    description={
                      isZh
                        ? '这部分决定系统更适合给你推荐哪些国家和市场优先级。'
                        : 'This section helps the system prioritize the right markets for you.'
                    }
                  >
                  <QuestionBlock>
                  <Field label={isZh ? '已有认证' : 'Existing Certifications'}>
                    <div className="flex flex-wrap gap-2">
                      {certOptions.map((cert) => {
                        const selected = leadData.step1.certifications.includes(cert)
                        return (
                          <SelectionChip key={cert} selected={selected} onClick={() => toggleCertification(cert)}>
                            {cert}
                          </SelectionChip>
                        )
                      })}
                    </div>
                    {leadData.step1.certifications.includes('其他') && (
                      <div ref={certOtherRef} className="mt-3">
                        <input
                          className={getInputClassName(!!certOtherError)}
                          value={leadData.step1.certificationOther}
                          onChange={(e) => handleCertificationOtherChange(e.target.value)}
                          placeholder={isZh ? '请补充认证名称' : 'Please specify the certification'}
                        />
                        <div className="mt-1 flex items-center justify-between text-xs">
                          <span className={certOtherError ? 'text-clay' : 'text-black/50'}>
                            {certOtherError || (isZh ? '例如：Sedex / UL / ETL' : 'e.g. Sedex / UL / ETL')}
                          </span>
                          <span className="text-black/45">
                            {leadData.step1.certificationOther.trim().length}/{OTHER_TEXT_MAX_LENGTH}
                          </span>
                        </div>
                      </div>
                    )}
                  </Field>
                  </QuestionBlock>

                  <QuestionBlock>
                  <Field
                    label={isZh ? '是否已有出口经验？' : 'Do You Already Have Export Experience?'}
                    hint={isZh ? '先确认是否已有海外销售基础，再决定是否需要补充市场区域。' : 'Confirm whether you already have export experience before adding existing market regions.'}
                  >
                    <div ref={exportExperienceRef} className={getSelectionGroupClassName(step1Submitted && !!exportExperienceError)}>
                    <div className="flex flex-wrap gap-2">
                      {exportExperienceOptions.map((option) => (
                        <SelectionChip
                          key={option.value}
                          selected={leadData.step1.exportExperience === option.value}
                          onClick={() => handleExportExperienceChange(option.value)}
                        >
                          {isZh ? option.labelZh : option.labelEn}
                        </SelectionChip>
                      ))}
                    </div>
                    </div>
                    {step1Submitted && exportExperienceError && <p className="mt-2 text-xs text-clay">{exportExperienceError}</p>}
                  </Field>
                  </QuestionBlock>

                  {leadData.step1.exportExperience === 'has' && (
                  <QuestionBlock>
                  <Field
                    label={isZh ? '当前主要销售市场' : 'Current Sales Markets'}
                    hint={isZh ? '最多选择 3 项，帮助系统判断您目前已有基础的市场方向' : 'Choose up to 3 to show where you already have traction'}
                  >
                    <div ref={currentMarketsRef} className={getSelectionGroupClassName(step1Submitted && !!currentMarketsError)}>
                    <div className="flex flex-wrap gap-2">
                      {currentMarketOptions.map((market) => {
                        const selected = leadData.step1.currentMarkets.includes(market)
                        return (
                          <SelectionChip
                            key={market}
                            selected={selected}
                            onClick={() => toggleExclusiveMultiSelect('currentMarkets', market, 3, '__none__')}
                          >
                            {market}
                          </SelectionChip>
                        )
                      })}
                    </div>
                    </div>
                    {step1Submitted && currentMarketsError && <p className="mt-2 text-xs text-clay">{currentMarketsError}</p>}
                  </Field>
                  </QuestionBlock>
                  )}

                  <QuestionBlock>
                  <Field
                    label={isZh ? '想重点开发的目标市场' : 'Target Markets to Develop'}
                    hint={isZh ? '最多选择 3 项，建议选择 1-3 个最想重点开发的市场' : 'Choose up to 3 priority markets to focus on'}
                  >
                    <div ref={targetMarketsRef} className={getSelectionGroupClassName(step1Submitted && !!targetMarketsError)}>
                    <div className="flex flex-wrap gap-2">
                      {targetMarketOptions.map((market) => {
                        const selected = leadData.step1.targetMarkets.includes(market)
                        return (
                          <SelectionChip
                            key={market}
                            selected={selected}
                            onClick={() => toggleExclusiveMultiSelect('targetMarkets', market, 3, '__none__')}
                          >
                            {market}
                          </SelectionChip>
                        )
                      })}
                    </div>
                    </div>
                    {step1Submitted && targetMarketsError && <p className="mt-2 text-xs text-clay">{targetMarketsError}</p>}
                  </Field>
                  </QuestionBlock>
                  </SectionCard>

                  <SectionCard
                    title={isZh ? 'C. 客户与优势判断' : 'C. Customers & Positioning'}
                    description={
                      isZh
                        ? '这一部分会直接影响系统的客户定位和卖点提炼。'
                        : 'This section directly shapes customer targeting and positioning.'}
                  >
                  <QuestionBlock>
                  <Field
                    label={isZh ? '您更想开发哪类客户？' : 'Target Customer Types'}
                    hint={isZh ? '最多选择 3 项，系统会根据客户类型推荐更适合的销售路径' : 'Choose up to 3 customer types to shape the route-to-market advice'}
                  >
                    <div ref={targetCustomersRef} className={getSelectionGroupClassName(step1Submitted && !!targetCustomersError)}>
                    <div className="flex flex-wrap gap-2">
                      {targetCustomerOptions.map((customer) => {
                        const selected = leadData.step1.targetCustomers.includes(customer)
                        return (
                          <SelectionChip
                            key={customer}
                            selected={selected}
                            onClick={() => toggleExclusiveMultiSelect('targetCustomers', customer, 3, '暂不明确')}
                          >
                            {customer}
                          </SelectionChip>
                        )
                      })}
                    </div>
                    </div>
                    {step1Submitted && targetCustomersError && <p className="mt-2 text-xs text-clay">{targetCustomersError}</p>}
                  </Field>
                  </QuestionBlock>

                  <QuestionBlock>
                  <Field
                    label={isZh ? '您觉得自己的核心竞争优势是？' : 'Core Competitive Advantages'}
                    hint={isZh ? '最多选择 3 项，系统会据此提炼您的出海定位和核心卖点' : 'Choose up to 3 strengths so the recommendation can sharpen your positioning'}
                  >
                    <div ref={coreAdvantagesRef} className={getSelectionGroupClassName(step1Submitted && (!!coreAdvantagesError || !!coreAdvantageOtherError))}>
                    <div className="flex flex-wrap gap-2">
                      {coreAdvantageOptions.map((advantage) => {
                        if (advantage === '其他' && leadData.step1.coreAdvantageOther) {
                          return null
                        }
                        const selected = leadData.step1.coreAdvantages.includes(advantage)
                        return (
                          <SelectionChip
                            key={advantage}
                            selected={selected}
                            onClick={() => toggleExclusiveMultiSelect('coreAdvantages', advantage, 3, '__none__')}
                          >
                            {advantage}
                          </SelectionChip>
                        )
                      })}
                      {leadData.step1.coreAdvantageOther && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-moss bg-moss px-3 py-2 text-sm leading-none text-white shadow-[0_4px_14px_rgba(37,84,74,0.16)]">
                          <span>{isZh ? `其他：${leadData.step1.coreAdvantageOther}` : `Custom: ${leadData.step1.coreAdvantageOther}`}</span>
                          <button
                            type="button"
                            onClick={removeCoreAdvantageOtherTag}
                            className="inline-flex h-4 w-4 items-center justify-center rounded-full text-sm leading-none text-white/85 transition hover:bg-white/15 hover:text-white"
                            aria-label={isZh ? '删除自定义优势' : 'Remove custom advantage'}
                          >
                            ×
                          </button>
                        </span>
                      )}
                    </div>
                    </div>
                    {leadData.step1.coreAdvantages.includes('其他') && (
                      <div ref={coreAdvantageOtherRef} className="mt-3">
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <input
                            className={getInputClassName(!!coreAdvantageOtherError)}
                            value={coreAdvantageOtherDraft}
                            onChange={(e) => handleCoreAdvantageOtherChange(e.target.value)}
                            onBlur={() => {
                              if (coreAdvantageOtherDraft.trim()) {
                                addCoreAdvantageOtherTag(coreAdvantageOtherDraft)
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                addCoreAdvantageOtherTag(coreAdvantageOtherDraft)
                              }
                            }}
                            placeholder={isZh ? '请补充您的优势' : 'Please specify your advantage'}
                          />
                          <button
                            type="button"
                            onClick={() => addCoreAdvantageOtherTag(coreAdvantageOtherDraft)}
                            className="inline-flex items-center justify-center rounded-xl border border-black/15 bg-sand px-4 py-3 text-sm font-semibold text-black/70 transition hover:border-moss/35 hover:text-moss sm:w-auto"
                          >
                            {isZh ? '添加' : 'Add'}
                          </button>
                        </div>
                        <div className="mt-1 flex items-center justify-between text-xs">
                          <span className={coreAdvantageOtherError ? 'text-clay' : 'text-black/50'}>
                            {coreAdvantageOtherError || (isZh ? '例如：快速打样 / 海外仓支持；添加后会显示为自定义标签' : 'e.g. rapid sampling / local warehousing; added items will appear as a custom tag')}
                          </span>
                          <span className="text-black/45">
                            {coreAdvantageOtherDraft.trim().length}/{OTHER_TEXT_MAX_LENGTH}
                          </span>
                        </div>
                      </div>
                    )}
                    {step1Submitted && coreAdvantagesError && <p className="mt-2 text-xs text-clay">{coreAdvantagesError}</p>}
                  </Field>
                  </QuestionBlock>
                  </SectionCard>
              </div>

              <button
                onClick={handleStep1Submit}
                disabled={analyzing}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-55 sm:w-auto"
              >
                {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <TrendingUp className="h-4 w-4" />}
                {isZh ? '生成建议结果' : 'Generate Recommendations'}
              </button>
              {formError && <p className="text-sm text-clay">{formError}</p>}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <h2 className="text-2xl">{isZh ? '第 2 步：推荐市场与定位建议' : 'Step 2. Market & Positioning Recommendations'}</h2>
              <p className="text-sm text-black/60">
                {isZh
                  ? '以下建议基于你刚才填写的产品、市场、客户和竞争优势生成。先看主推荐市场，再确认它是否适合你。'
                  : 'These recommendations are generated from your product, market, customer, and advantage inputs. Start with the primary market recommendation.'}
              </p>

              {analyzing && (
                <div className="space-y-3">
                  <div className="h-20 animate-pulse rounded-2xl bg-black/8" />
                  <div className="h-24 animate-pulse rounded-2xl bg-black/8" />
                  <div className="h-16 animate-pulse rounded-2xl bg-black/8" />
                </div>
              )}

              {!analyzing && ai && (
                <>
                  <div className="space-y-4 xl:grid xl:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.9fr)] xl:gap-4 xl:space-y-0">
                    <div className="space-y-4">
                      {topMarket && (
                        <div className="rounded-2xl border border-moss/25 bg-moss/5 p-4">
                          <p className="text-xs uppercase tracking-[0.2em] text-moss/70">{isZh ? '主推荐市场' : 'Primary Market'}</p>
                          <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1.6fr)_180px] lg:items-stretch">
                            <div className="rounded-2xl bg-white/72 p-4">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div className="flex items-center gap-2 text-lg font-semibold text-ink">
                                    <Globe2 className="h-5 w-5 text-moss" />
                                    {topMarket.country}
                                  </div>
                                  <p className="mt-1 text-xs uppercase tracking-[0.16em] text-black/45">
                                    {isZh ? '当前首选进入市场' : 'Current Recommended Entry Market'}
                                  </p>
                                </div>
                                <span className="rounded-full bg-moss px-2.5 py-1 text-[11px] font-semibold text-white">
                                  {isZh ? '首选' : 'Primary'}
                                </span>
                              </div>
                              <p className="mt-3 max-w-xl text-sm leading-relaxed text-black/70">
                                {getMarketReason(topMarket.country, isZh)}
                              </p>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                              <div className="rounded-2xl bg-white px-4 py-3 text-center shadow-soft">
                                <p className="text-2xl font-bold text-moss">{topMarket.fitScore}%</p>
                                <p className="mt-1 text-xs text-black/55">{isZh ? '市场匹配度' : 'Market fit score'}</p>
                              </div>
                              <div className="rounded-2xl border border-white/70 bg-white/65 px-4 py-3 text-center">
                                <p className="text-sm font-semibold text-ink">{isZh ? '建议动作' : 'Suggested Action'}</p>
                                <p className="mt-2 text-xs leading-relaxed text-black/60">
                                  {isZh ? '先按该市场继续查看方向确认与成本框架。' : 'Continue with this market into direction confirmation and cost review.'}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="space-y-4 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
                        <div className="py-1">
                          <button
                            type="button"
                            onClick={() => setShowDecisionFactors((prev) => !prev)}
                            className="flex w-full items-center justify-between gap-3 text-left"
                          >
                            <p className="text-xs text-black/50">
                              {isZh ? '了解更多：查看本次建议的判断依据' : 'Learn more: see what informed this recommendation'}
                            </p>
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-black/10 text-sm text-black/45">
                              {showDecisionFactors ? '−' : '+'}
                            </span>
                          </button>

                          {showDecisionFactors && (
                            <ul className="mt-3 space-y-2 border-t border-black/8 pt-3 text-sm text-black/70">
                              <li className="flex items-start gap-2">
                                <CheckCircle2 className="mt-0.5 h-4 w-4 text-moss" />
                                <span>
                                  {isZh
                                    ? `你的主营方向：${categoryItems.length > 0 ? categoryItems.join(' / ') : '未填写完整'}`
                                    : `Your product focus: ${categoryItems.length > 0 ? categoryItems.join(' / ') : 'Incomplete input'}`}
                                </span>
                              </li>
                              <li className="flex items-start gap-2">
                                <CheckCircle2 className="mt-0.5 h-4 w-4 text-moss" />
                                <span>
                                  {isZh
                                    ? `现有市场基础：${leadData.step1.exportExperience === 'has'
                                        ? leadData.step1.currentMarkets.join(' / ')
                                        : '暂未开展出口'}`
                                    : `Current market base: ${leadData.step1.exportExperience === 'has'
                                        ? leadData.step1.currentMarkets.join(' / ')
                                        : 'No export experience yet'}`}
                                </span>
                              </li>
                              <li className="flex items-start gap-2">
                                <CheckCircle2 className="mt-0.5 h-4 w-4 text-moss" />
                                <span>
                                  {isZh
                                    ? `目标客户与优势：${[
                                        ...leadData.step1.targetCustomers,
                                        ...leadData.step1.coreAdvantages.filter((item) => item !== '其他'),
                                        leadData.step1.coreAdvantageOther,
                                      ]
                                        .filter(Boolean)
                                        .join(' / ')}`
                                    : `Target customers and strengths: ${[
                                        ...leadData.step1.targetCustomers,
                                        ...leadData.step1.coreAdvantages.filter((item) => item !== '其他'),
                                        leadData.step1.coreAdvantageOther,
                                      ]
                                        .filter(Boolean)
                                        .join(' / ')}`}
                                </span>
                              </li>
                            </ul>
                          )}
                        </div>

                        {backupMarkets.length > 0 && (
                          <div className="rounded-2xl border border-black/10 bg-white p-4 sm:p-5">
                            <p className="text-xs uppercase tracking-[0.2em] text-black/55">{isZh ? '备选市场' : 'Backup Markets'}</p>
                            <div className="mt-3 space-y-3">
                              {backupMarkets.map((market) => (
                                <div key={market.country} className="flex items-center justify-between rounded-xl bg-sand px-4 py-3">
                                  <div>
                                    <p className="font-medium text-ink">{market.country}</p>
                                    <p className="mt-1 text-xs text-black/55">{getMarketReason(market.country, isZh)}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-lg font-semibold text-moss">{market.fitScore}%</p>
                                    <p className="text-[11px] text-black/45">{isZh ? '匹配度' : 'Fit'}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="rounded-2xl border border-moss/20 bg-moss/5 p-4 sm:p-5">
                        <p className="text-xs uppercase tracking-[0.2em] text-moss/70">{isZh ? '推荐定位' : 'Recommended Positioning'}</p>
                        <p className="mt-2 text-base leading-relaxed">{ai.differentiation}</p>
                        {ai.valueProps.length > 0 && (
                          <ul className="mt-4 space-y-2 text-sm text-black/75">
                            {ai.valueProps.map((item) => (
                              <li key={item} className="flex items-start gap-2">
                                <CheckCircle2 className="mt-0.5 h-4 w-4 text-moss" />
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>

                    <aside className="space-y-4">
                      <div className="rounded-2xl border border-black/10 bg-white p-4 sm:p-5">
                        <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
                          <ShieldCheck className="h-4 w-4 text-clay" />
                          {isZh ? '优先关注的认证' : 'Certifications To Prioritize'}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {ai.requiredCertifications.map((item) => (
                            <span key={item} className="rounded-full bg-black/5 px-3 py-1 text-sm text-black/70">
                              {item}
                            </span>
                          ))}
                        </div>
                        <p className="mt-3 text-sm leading-relaxed text-black/65">{ai.trust}</p>
                      </div>

                      <div className="rounded-2xl border border-clay/25 bg-clay/5 p-4 sm:p-5">
                        <p className="text-xs uppercase tracking-[0.18em] text-clay/80">{isZh ? '下一步会发生什么' : 'What Happens Next'}</p>
                        <p className="mt-2 text-sm leading-relaxed text-black/70">
                          {isZh
                            ? '下一步你将确认首发市场。你的选择会直接影响成本估算和后续物料生成内容。'
                            : 'Next you will confirm the launch market. That choice will directly shape cost estimates and generated materials.'}
                        </p>
                      </div>
                    </aside>
                  </div>
                </>
              )}

              <p className="text-sm text-black/55">
                {isZh ? '免责声明：方向性建议，仅供初步参考。' : 'Disclaimer: Directional suggestion only, for preliminary reference.'}
              </p>
              {analysisError && <p className="text-sm text-clay">{analysisError}</p>}

              <div className="rounded-2xl border border-moss/20 bg-moss/5 p-4 sm:p-5">
                <p className="text-sm font-medium text-ink">
                  {isZh ? '想进一步聊聊你的出海方案？' : 'Want to discuss your export strategy?'}
                </p>
                <p className="mt-1 text-sm text-black/60">
                  {isZh ? '扫码添加顾问微信，我们会结合你的情况给出更具体的建议。' : 'Scan to add our advisor on WeChat for a more tailored discussion.'}
                </p>
                <div className="mt-3 flex items-center gap-4">
                  <img
                    src="/wechat-qr.png"
                    alt="WeChat QR"
                    className="h-24 w-24 rounded-xl border border-black/10 object-cover"
                    onError={(e) => { e.target.style.display = 'none' }}
                  />
                  <div className="text-sm text-black/60 space-y-1">
                    <p>{isZh ? '扫码或搜索微信号：' : 'Scan or search WeChat ID:'}</p>
                    <p className="font-semibold text-ink">factorygoglobal</p>
                    <p className="text-xs text-black/40">{isZh ? '工作日 9:00–18:00 在线' : 'Available Mon–Fri 9am–6pm'}</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
                <button
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-black/15 px-4 py-3 text-sm"
                  onClick={() => setStep(1)}
                >
                  <ArrowLeft className="h-4 w-4" />
                  {isZh ? '返回修改信息' : 'Back to Edit Inputs'}
                </button>
                <button
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-ink px-4 py-3 text-sm font-semibold text-white sm:w-auto"
                  onClick={() => setStep(3)}
                >
                  {isZh ? '确认并进入下一步' : 'Use This Recommendation'}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {step === 3 && ai && (
            <div className="space-y-5">
              <h2 className="text-2xl">{isZh ? '第 3 步：确认目标市场' : 'Step 3. Confirm Target Market'}</h2>
              <p className="text-sm text-black/60">
                {isZh
                  ? '先确认本次要优先进入的目标市场。这个选择会直接影响下一步的成本估算和生成物料内容。'
                  : 'Choose the launch market first. This will directly shape the cost estimate and generated materials.'}
              </p>

              <div className="space-y-4 xl:grid xl:grid-cols-[minmax(0,1.3fr)_minmax(260px,0.8fr)] xl:gap-4 xl:space-y-0">
                <div className="space-y-4">
                  <button
                    type="button"
                    onClick={() => setSelectedPath('accept')}
                    className={`w-full rounded-2xl border p-4 text-left transition sm:p-5 ${
                      selectedPath === 'accept' ? 'border-moss bg-moss/5 shadow-soft' : 'border-black/10 bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{isZh ? '采用推荐市场' : 'Use Recommended Market'}</p>
                        <p className="mt-1 text-sm text-black/60">
                          {isZh
                            ? `直接以 ${ai.topMarkets[0].country} 作为首发市场，最快进入下一步。`
                            : `Use ${ai.topMarkets[0].country} as the launch market and move forward quickly.`}
                        </p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${selectedPath === 'accept' ? 'bg-moss text-white' : 'bg-black/5 text-black/55'}`}>
                        {isZh ? '首选' : 'Primary'}
                      </span>
                    </div>
                    <div className="mt-3 rounded-xl bg-white/80 px-4 py-3 text-sm text-black/70">
                      <p className="font-medium text-ink">{ai.topMarkets[0].country}</p>
                      <p className="mt-1">{getMarketReason(ai.topMarkets[0].country, isZh)}</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedPath('manual')}
                    className={`w-full rounded-2xl border p-4 text-left transition sm:p-5 ${
                      selectedPath === 'manual' ? 'border-moss bg-moss/5 shadow-soft' : 'border-black/10 bg-white'
                    }`}
                  >
                    <p className="font-semibold">{isZh ? '手动指定目标市场' : 'Enter My Own Target Market'}</p>
                    <p className="mt-1 text-sm text-black/60">
                      {isZh ? '如果你已有明确方向，可以手动输入目标国家。' : 'If you already have a target in mind, enter it manually.'}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {(isZh ? ['加拿大', '德国', '阿联酋'] : ['Canada', 'Germany', 'UAE']).map((market) => (
                        <button
                          key={market}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedPath('manual')
                            handleTargetMarketChange(market)
                          }}
                          className="rounded-full border border-black/10 bg-sand px-3 py-1 text-xs text-black/65 transition hover:border-moss/40 hover:text-moss"
                        >
                          {market}
                        </button>
                      ))}
                    </div>
                    <input
                      value={leadData.step3.targetMarket}
                      onChange={(e) => handleTargetMarketChange(e.target.value)}
                      onBlur={handleTargetMarketBlur}
                      placeholder={isZh ? '例如：加拿大' : 'e.g. Canada'}
                      className="mt-3 w-full rounded-xl border border-black/15 px-3 py-3 text-sm outline-none ring-moss/30 focus:ring"
                    />
                    <div className="mt-1 flex flex-wrap items-center justify-between gap-1 text-xs">
                      <span className={targetMarketError ? 'text-clay' : 'text-black/50'}>
                        {targetMarketError || (isZh ? '请输入国家名称，例如：加拿大 / 德国' : 'Enter country name, e.g. Canada / Germany')}
                      </span>
                      <span className="text-black/45">{leadData.step3.targetMarket.trim().length}/{TARGET_MARKET_MAX_LENGTH}</span>
                    </div>
                  </button>
                </div>

                <aside className="space-y-4">
                  <div className="rounded-2xl border border-black/10 bg-white p-4 sm:p-5">
                    <p className="text-xs uppercase tracking-[0.18em] text-black/55">{isZh ? '当前将进入的市场' : 'Market Going Forward'}</p>
                    <p className="mt-2 text-xl font-semibold text-ink">
                      {selectedPath === 'accept'
                        ? ai.topMarkets[0].country
                        : leadData.step3.targetMarket || (isZh ? '待确认' : 'Pending')}
                    </p>
                    <p className="mt-2 text-sm text-black/65">
                      {isZh
                        ? '确认后，系统会按这个市场生成成本参考和销售物料。'
                        : 'After confirmation, cost guidance and materials will use this market.'}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-clay/30 bg-clay/5 p-4 sm:p-5">
                    <p className="text-xs uppercase tracking-[0.18em] text-clay/80">{isZh ? '需要更深调研？' : 'Need Deeper Research?'}</p>
                    <h3 className="mt-2 text-lg">{isZh ? '获取目标国家准入与竞品分析' : 'Get compliance and competitor analysis'}</h3>
                    <a
                      href="mailto:hello@factorygoglobal.com?subject=Need%20Deep%20Market%20Research"
                      className="mt-4 inline-block w-full rounded-xl bg-clay px-4 py-3 text-center text-sm font-semibold text-white"
                    >
                      {isZh ? '联系专家团队' : 'Contact Expert Team'}
                    </a>
                  </div>
                </aside>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
                <button
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-black/15 px-4 py-3 text-sm"
                  onClick={() => setStep(2)}
                >
                  <ArrowLeft className="h-4 w-4" />
                  {isZh ? '返回' : 'Back'}
                </button>
                <button
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-ink px-4 py-3 text-sm font-semibold text-white"
                  onClick={handleStep3Continue}
                >
                  {isZh ? '确认市场并继续' : 'Confirm Market'}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {step === 4 && (() => {
            const parsedCargo = parseFloat(cargoValue.replace(/,/g, '')) || 0
            const hasCargo = parsedCargo > 0
            const tariffMin = Math.round(parsedCargo * costData.tariffMin)
            const tariffMax = Math.round(parsedCargo * costData.tariffMax)
            const logisticsMin = Math.round(parsedCargo * costData.logisticsMin)
            const logisticsMax = Math.round(parsedCargo * costData.logisticsMax)
            const totalMin = tariffMin + logisticsMin + costData.platformMin + costData.certMin
            const totalMax = tariffMax + logisticsMax + costData.platformMax + costData.certMax
            return (
            <div className="space-y-5">
              <h2 className="text-2xl">{isZh ? '第 4 步：出海成本概算' : 'Step 4. Cost Framework'}</h2>
              <div className="rounded-2xl border border-moss/20 bg-moss/5 p-4 sm:p-5">
                <p className="text-xs uppercase tracking-[0.18em] text-moss/70">{isZh ? '先看结论' : 'Quick Read'}</p>
                <h3 className="mt-2 text-xl">{currentMarket || (isZh ? '目标市场待确认' : 'Target market pending')}</h3>
                <p className="mt-2 text-sm leading-relaxed text-black/70">
                  {isZh
                    ? `当前判断：${getEntryDifficulty(currentMarket, true)}。以下是进入该市场时最值得先关注的 4 个成本项。`
                    : `Current view: ${getEntryDifficulty(currentMarket, false)}. These are the four cost areas to check first.`}
                </p>
              </div>

              <div className="rounded-2xl border border-black/10 bg-white p-4 sm:p-5">
                <label className="text-sm font-medium text-ink">
                  {isZh ? '预计出口货值（选填）' : 'Estimated Export Value (optional)'}
                </label>
                <div className="mt-2 flex items-center gap-2">
                  <span className="shrink-0 text-sm text-black/45">USD $</span>
                  <input
                    type="number"
                    min="0"
                    value={cargoValue}
                    onChange={e => setCargoValue(e.target.value)}
                    placeholder={isZh ? '例如 50000' : 'e.g. 50000'}
                    className="w-full rounded-xl border border-black/15 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-moss/30"
                  />
                </div>
                <p className="mt-1.5 text-xs text-black/40">
                  {isZh
                    ? hasCargo ? '以下各项已折算为估算金额，并汇总首年总附加成本。' : '填入货值后，各成本项会自动折算为估算金额。'
                    : hasCargo ? 'Costs below are converted to dollar estimates based on this value.' : 'Enter a value to convert percentage costs to dollar estimates.'}
                </p>
              </div>

              <div className="space-y-4 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
                <InfoCard
                  label={isZh ? '关税预估范围' : 'Estimated Tariff Range'}
                  value={hasCargo ? `${formatUSD(tariffMin)} – ${formatUSD(tariffMax)}` : costData.tariff}
                  sub={hasCargo ? costData.tariff : null}
                />
                <InfoCard
                  label={isZh ? '海空运费级别' : 'Sea/Air Logistics Level'}
                  value={hasCargo ? `${formatUSD(logisticsMin)} – ${formatUSD(logisticsMax)}` : getLocalizedLogisticsLevel(costData.logistics, isZh)}
                  sub={hasCargo ? getLocalizedLogisticsLevel(costData.logistics, isZh) : null}
                />
                <InfoCard
                  label={isZh ? '平台入驻费用区间' : 'Platform Entry Cost'}
                  value={costData.platform}
                  sub={isZh ? '如 Amazon、阿里巴巴国际站等主流平台年费' : 'e.g. Amazon, Alibaba.com annual fees'}
                />
                <InfoCard
                  label={isZh ? '认证办理费用区间' : 'Certification Cost'}
                  value={costData.certification}
                  sub={isZh ? '如 CE、FDA、ISO 等认证的申请与办理费用' : 'e.g. CE, FDA, ISO application & processing fees'}
                />
              </div>

              {hasCargo && (
                <div className="rounded-2xl border border-moss/25 bg-moss/5 p-4 sm:p-5">
                  <p className="text-xs uppercase tracking-[0.16em] text-moss/70">
                    {isZh ? '首年预估总附加成本' : 'Est. Total First-Year Overhead'}
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-ink">
                    {formatUSD(totalMin)} – {formatUSD(totalMax)}
                  </p>
                  <p className="mt-1 text-xs text-black/50">
                    {isZh
                      ? `约占货值 ${Math.round((totalMin / parsedCargo) * 100)}%–${Math.round((totalMax / parsedCargo) * 100)}%（含关税、物流、平台费、认证）`
                      : `~${Math.round((totalMin / parsedCargo) * 100)}%–${Math.round((totalMax / parsedCargo) * 100)}% of cargo value (tariff + logistics + platform + certification)`}
                  </p>
                </div>
              )}

              <div className="rounded-2xl border border-black/10 bg-white p-4 sm:p-5">
                <p className="text-sm font-semibold text-ink">{isZh ? '怎么看这些数字？' : 'How To Read These Numbers'}</p>
                <p className="mt-2 text-sm text-black/70">
                  {isZh
                    ? '这是 MVP 阶段的方向性估算。真正报价前，仍需确认产品 SKU、HS 编码、认证范围和运输方式。'
                    : 'These are directional MVP ranges. Before quoting, validate SKU, HS code, certifications, and shipping mode.'}
                </p>
              </div>

              <div className="rounded-2xl border border-clay/25 bg-clay/5 p-4 sm:p-5">
                <p className="text-sm text-black/75">
                  {isZh ? '如果你要做准确报价，可以让团队进一步核算到 SKU 级别。' : 'If you need a precise quote, the team can model this down to the SKU level.'}
                </p>
                <a
                  href="mailto:hello@factorygoglobal.com?subject=Need%20Accurate%20Export%20Cost%20Quote"
                  className="mt-3 inline-block w-full rounded-xl bg-clay px-4 py-3 text-center text-sm font-semibold text-white"
                >
                  {isZh ? '获取精准报价' : 'Get Accurate Cost Quote'}
                </a>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
                <button
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-black/15 px-4 py-3 text-sm"
                  onClick={() => setStep(3)}
                >
                  <ArrowLeft className="h-4 w-4" />
                  {isZh ? '返回' : 'Back'}
                </button>
                <button
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-ink px-4 py-3 text-sm font-semibold text-white"
                  onClick={() => setStep(5)}
                >
                  {isZh ? '进入物料生成' : 'Continue to Materials'}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
            )
          })()}

          {step === 5 && (
            <div className="space-y-5">
              <h2 className="text-2xl">{isZh ? '第 5 步：物料生成' : 'Step 5. Material Generation'}</h2>

              {productNameError && <p className="text-xs text-clay">{productNameError}</p>}

              {leadData.step5.products.map((product, productIndex) => (
                <div key={productIndex} className="rounded-2xl border border-black/10 bg-white p-4 sm:p-5">
                  <p className="mb-3 text-sm font-semibold text-ink">
                    {isZh ? `产品 ${productIndex + 1}` : `Product ${productIndex + 1}`}
                    {productIndex === 0 && <span className="ml-1 text-clay">*</span>}
                  </p>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs text-black/55">{isZh ? '产品名称' : 'Product Name'}</label>
                      <input
                        value={product.name}
                        onChange={(e) => handleProductNameChange(productIndex, e.target.value)}
                        className={`mt-1.5 w-full rounded-xl border px-4 py-3 text-sm outline-none ring-moss/30 transition focus:ring ${productIndex === 0 && productNameError ? 'border-clay/60 bg-clay/5' : 'border-black/15'}`}
                        placeholder={isZh ? '例如：竹纤维面巾纸' : 'e.g. Bamboo facial tissue'}
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-black/55">{isZh ? '产品信息（3 条）' : 'Product Info (3 points)'}</label>
                      <div className="mt-1.5 space-y-2">
                        {product.info.map((info, infoIndex) => (
                          <input
                            key={infoIndex}
                            value={info}
                            onChange={(e) => handleProductInfoChange(productIndex, infoIndex, e.target.value)}
                            className="w-full rounded-xl border border-black/15 px-4 py-3 text-sm outline-none ring-moss/30 transition focus:ring"
                            placeholder={isZh
                              ? ['例如：主要材质或核心原料', '例如：产品核心功能或差异化卖点', '例如：适用场景或目标用途'][infoIndex]
                              : ['e.g. Main material or ingredient', 'e.g. Key feature or differentiator', 'e.g. Use case or target application'][infoIndex]}
                          />
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs text-black/55">
                        {isZh ? `产品照片（最多 ${PRODUCT_PHOTO_MAX} 张）` : `Product Photos (up to ${PRODUCT_PHOTO_MAX})`}
                      </label>
                      {product.photos.length > 0 && (
                        <div className="mt-2 grid grid-cols-3 gap-2">
                          {product.photos.map((photo, photoIndex) => (
                            <div key={`${productIndex}-${photoIndex}`} className="relative">
                              <img src={photo.url} alt={photo.name} className="h-24 w-full rounded-xl border border-black/10 object-cover" />
                              <button
                                type="button"
                                onClick={() => removeStep5Photo(productIndex, photoIndex)}
                                className="absolute right-1 top-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-black/55 text-white"
                                aria-label={isZh ? '删除照片' : 'Remove photo'}
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      {product.photos.length < PRODUCT_PHOTO_MAX && (
                        <label className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-black/15 bg-sand/50 px-3 py-2.5 text-xs font-semibold text-black/70">
                          <Upload className="h-3.5 w-3.5" />
                          {isZh ? '上传照片' : 'Upload Photos'}
                          <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleStep5PhotoUpload(productIndex, e)} />
                        </label>
                      )}
                      <span className="ml-2 text-xs text-black/40">{product.photos.length}/{PRODUCT_PHOTO_MAX}</span>
                    </div>
                  </div>
                </div>
              ))}

              <div className="rounded-2xl border border-black/10 bg-white p-4 sm:p-5">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-ink">
                      {isZh ? `工厂照片（最多 ${FACTORY_PHOTO_MAX} 张）` : `Factory Photos (up to ${FACTORY_PHOTO_MAX})`}
                    </label>
                    {leadData.step5.factoryPhotos.length > 0 && (
                      <div className="mt-2 grid grid-cols-3 gap-2">
                        {leadData.step5.factoryPhotos.map((photo, index) => (
                          <div key={`fp-${index}`} className="relative">
                            <img src={photo.url} alt={photo.name} className="h-24 w-full rounded-xl border border-black/10 object-cover" />
                            <button
                              type="button"
                              onClick={() => removeFactoryPhoto(index)}
                              className="absolute right-1 top-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-black/55 text-white"
                              aria-label={isZh ? '删除照片' : 'Remove photo'}
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    {leadData.step5.factoryPhotos.length < FACTORY_PHOTO_MAX && (
                      <label className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-black/15 bg-sand/50 px-3 py-2.5 text-xs font-semibold text-black/70">
                        <Upload className="h-3.5 w-3.5" />
                        {isZh ? '上传照片' : 'Upload Photos'}
                        <input type="file" accept="image/*" multiple className="hidden" onChange={handleFactoryPhotoUpload} />
                      </label>
                    )}
                    <span className="ml-2 text-xs text-black/40">{leadData.step5.factoryPhotos.length}/{FACTORY_PHOTO_MAX}</span>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-ink">
                      {isZh ? `工厂视频（最多 ${FACTORY_VIDEO_MAX} 段）` : `Factory Videos (up to ${FACTORY_VIDEO_MAX})`}
                    </label>
                    {leadData.step5.factoryVideos.length > 0 && (
                      <div className="mt-2 space-y-2">
                        {leadData.step5.factoryVideos.map((video, index) => (
                          <div key={`fv-${index}`} className="relative rounded-xl border border-black/10 overflow-hidden">
                            <video src={video.url} controls className="w-full rounded-xl" style={{ maxHeight: '200px' }} />
                            <button
                              type="button"
                              onClick={() => removeFactoryVideo(index)}
                              className="absolute right-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-black/55 text-white"
                              aria-label={isZh ? '删除视频' : 'Remove video'}
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                            <p className="px-3 py-1.5 text-xs text-black/50 truncate">{video.name}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    {leadData.step5.factoryVideos.length < FACTORY_VIDEO_MAX && (
                      <label className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-black/15 bg-sand/50 px-3 py-2.5 text-xs font-semibold text-black/70">
                        <Upload className="h-3.5 w-3.5" />
                        {isZh ? '上传视频' : 'Upload Video'}
                        <input type="file" accept="video/*" multiple className="hidden" onChange={handleFactoryVideoUpload} />
                      </label>
                    )}
                    <span className="ml-2 text-xs text-black/40">{leadData.step5.factoryVideos.length}/{FACTORY_VIDEO_MAX}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-black/10 bg-white p-4 sm:p-5">
                <p className="text-sm font-semibold text-ink">{isZh ? '选择要生成的内容' : 'Choose What To Generate'}</p>
                <p className="mt-1 text-sm text-black/60">
                  {isZh ? '建议先生成网站预览，再生成 One-pager PDF。' : 'Start with the website preview, then generate the one-pager PDF.'}
                </p>
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                  <button
                    type="button"
                    onClick={generateWebsitePreview}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-ink px-4 py-3 text-sm font-semibold text-white"
                  >
                    {isZh ? '生成网站预览' : 'Generate Website Preview'}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={generateOnePagerPreview}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-ink px-4 py-3 text-sm font-semibold text-ink"
                  >
                    {isZh ? '生成 One-pager' : 'Generate One-pager'}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
                {actionError && <p className="text-sm text-clay">{actionError}</p>}
              </div>

              {websiteGenerated ? (
                <>
                <div className="grid gap-7 xl:grid-cols-2">
                <div className="rounded-2xl border border-black/10 bg-white p-5 md:p-6">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-xl">One-page Marketing Site Preview (US)</h3>
                    <button
                      onClick={() => setShowFullscreen(true)}
                      className="inline-flex items-center gap-1 rounded-lg border border-black/10 px-2.5 py-1.5 text-xs"
                    >
                      <Maximize2 className="h-3.5 w-3.5" />
                      Fullscreen
                    </button>
                  </div>

                  <div className="overflow-hidden rounded-2xl border border-black/10">
                    <div
                      className="relative p-7 text-white md:p-8"
                      style={{
                        background: primaryImage
                          ? `linear-gradient(110deg, rgba(22,22,22,0.78), rgba(22,22,22,0.45)), url(${primaryImage}) center/cover`
                          : 'linear-gradient(120deg, #25544a, #0f2f29)',
                      }}
                    >
                      <p className="text-xs uppercase tracking-[0.22em] text-white/70">{usWebsiteCopy.heroEyebrow}</p>
                      <h4 className="us-web-subheading mt-2">
                        {usWebsiteCopy.heroTitle}
                      </h4>
                    </div>
                    <div className="space-y-4 p-6">
                      <p className="text-xs uppercase tracking-[0.18em] text-black/60">Trust Indicators</p>
                      <div className="flex flex-wrap gap-2">
                        <Tag>{leadData.step1.currentCapacity || 'Capacity data pending'}</Tag>
                        {leadData.step1.certifications.length > 0
                          ? leadData.step1.certifications.map((item) => <Tag key={item}>{item}</Tag>)
                          : <Tag>No certification provided</Tag>}
                      </div>
                      <ul className="space-y-1.5 text-sm text-black/75">
                        {usWebsiteCopy.whyItems.map((point) => (
                          <li key={point} className="flex items-start gap-2">
                            <CheckCircle2 className="mt-0.5 h-4 w-4 text-moss" />
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                      <div>
                        <p className="text-xs uppercase tracking-[0.15em] text-black/55">Key Product</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {productEntries.length > 0
                            ? productEntries.map((p) => <Tag key={p.name}>{p.name}</Tag>)
                            : <Tag>Please add a product</Tag>}
                        </div>
                      </div>
                    </div>
                </div>
              </div>
              </div>
              <div className="rounded-2xl border border-moss/30 bg-moss/8 p-6 md:p-7">
                <p className="text-xs uppercase tracking-[0.2em] text-moss/80">{isZh ? '终极 CTA' : 'Final CTA'}</p>
                <h3 className="mt-2 text-2xl">
                  {isZh ? '需要高级动效独立站与 Amazon 开店支持？' : 'Need a premium export website + Amazon launch support?'}
                </h3>
                <p className="mt-2 text-sm text-black/70">
                  {isZh
                    ? '获取高转化独立站、海外买家触达流程与持续增长支持。'
                    : 'Get a high-conversion site with advanced motion, buyer outreach workflow, and overseas demand generation support.'}
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <a
                    href="https://wa.me/0000000000?text=Hi%20FactoryGoGlobal%2C%20I%20want%20to%20discuss%20a%20premium%20export%20site."
                    target="_blank"
                    rel="noreferrer"
                    className="w-full rounded-xl bg-moss px-4 py-3 text-center text-sm font-semibold text-white sm:w-auto"
                  >
                    {isZh ? 'WhatsApp 联系' : 'Connect on WhatsApp'}
                  </a>
                  <a
                    href="mailto:hello@factorygoglobal.com?subject=Premium%20Export%20Service%20Inquiry"
                    className="w-full rounded-xl border border-moss px-4 py-3 text-center text-sm font-semibold text-moss sm:w-auto"
                  >
                    {isZh ? '邮件联系' : 'Contact via Email'}
                  </a>
                </div>
              </div>
              </>
              ) : (
                <div className="rounded-2xl border border-dashed border-black/20 bg-white p-5 text-sm text-black/60">
                  {isZh
                    ? '点击“生成网站预览”后，这里会展示营销页预览与全屏预览。'
                    : 'Click "Generate Website Preview" to show website preview and fullscreen view.'}
                </div>
              )}

              {onePagerGenerated ? (
              <div className="rounded-2xl border border-black/10 bg-white p-5 md:p-6">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-xl">{isZh ? 'One-pager PDF 预览' : 'One-pager PDF Preview'}</h3>
                    <button
                      onClick={downloadPdf}
                      className="inline-flex items-center gap-1 rounded-lg bg-ink px-3 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
                      disabled={downloadingPdf}
                    >
                      {downloadingPdf ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                      {downloadingPdf ? (isZh ? '正在生成...' : 'Generating...') : isZh ? '下载 PDF' : 'Download PDF'}
                    </button>
                  </div>
                  {pdfError && <p className="mb-3 text-xs text-clay">{pdfError}</p>}

                  <div ref={pdfRef} className="rounded-2xl border border-black/10 bg-white p-6 text-black">
                    <p className="text-xs uppercase tracking-[0.2em] text-black/55">{isZh ? '企业单页简介' : 'Company One-pager'}</p>
                    <h4 className="mt-2 text-2xl">{leadData.step1.companyName || (isZh ? '你的公司名称' : 'Your Company Name')}</h4>
                    <p className="mt-2 text-sm text-black/70">
                      {ai?.differentiation || (isZh ? 'AI 战略摘要将在这里显示。' : 'AI strategy summary will appear here.')}
                    </p>

                    <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                      <MiniMetric label="MOQ" value={isZh ? '1 个 20 尺柜' : '1 x 20ft container'} />
                      <MiniMetric label={isZh ? '交期' : 'Lead Time'} value={isZh ? '25-35 天' : '25-35 days'} />
                      <MiniMetric label={isZh ? '目标市场' : 'Primary Market'} value={currentMarket || (isZh ? '待定' : 'TBD')} />
                      <MiniMetric label={isZh ? '工厂规模' : 'Factory Scale'} value={leadData.step1.currentCapacity || (isZh ? '待定' : 'TBD')} />
                    </div>
                    <div className="mt-4">
                      <p className="text-xs uppercase tracking-[0.15em] text-black/55">{isZh ? '主推产品' : 'Key Product'}</p>
                      {productEntries.length > 0 ? (
                        <div className="mt-1 space-y-2">
                          {productEntries.map((p) => (
                            <div key={p.name}>
                              <p className="text-sm font-medium text-ink">{p.name}</p>
                              {p.info.some(Boolean) && (
                                <ul className="mt-0.5 space-y-0.5 text-sm text-black/65">
                                  {p.info.filter(Boolean).map((point, i) => (
                                    <li key={i} className="flex items-start gap-1.5">
                                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-moss" />
                                      {point}
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-1 text-sm text-black/40">{isZh ? '待填写' : 'Pending'}</p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-black/20 bg-white p-5 text-sm text-black/60">
                  {isZh
                    ? '点击“生成 One-pager”后，这里会展示 PDF 预览与下载。'
                    : 'Click "Generate One-pager" to show PDF preview and download.'}
                </div>
              )}
            </div>
          )}
      </section>

      {showLeadGate && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 px-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
            <p className="text-xs uppercase tracking-[0.18em] text-moss/70">{isZh ? '一步之遥' : 'Almost there'}</p>
            <h3 className="mt-2 text-xl font-semibold text-ink">
              {isZh ? '留下微信，顾问会主动联系你' : 'Share your WeChat to get advisor follow-up'}
            </h3>
            <p className="mt-1.5 text-sm text-black/55">
              {isZh ? '建议结果生成后，顾问团队会通过微信发送完整出海方案。' : 'Our advisor will reach out via WeChat with a complete export strategy.'}
            </p>

            <div className="mt-5 space-y-3">
              <div>
                <label className="block text-xs text-black/55">{isZh ? '微信号' : 'WeChat ID'}<span className="ml-1 text-clay">*</span></label>
                <input
                  autoFocus
                  value={leadContact.wechat}
                  onChange={(e) => { setLeadContact((prev) => ({ ...prev, wechat: e.target.value })); setLeadContactError('') }}
                  onKeyDown={(e) => e.key === 'Enter' && submitLeadGate()}
                  className={`mt-1.5 w-full rounded-xl border px-4 py-3 text-sm outline-none ring-moss/30 transition focus:ring ${leadContactError ? 'border-clay/60 bg-clay/5' : 'border-black/15'}`}
                  placeholder={isZh ? '你的微信号' : 'Your WeChat ID'}
                />
                {leadContactError && <p className="mt-1 text-xs text-clay">{leadContactError}</p>}
              </div>
              <div>
                <label className="block text-xs text-black/55">{isZh ? '姓名（选填）' : 'Name (optional)'}</label>
                <input
                  value={leadContact.name}
                  onChange={(e) => setLeadContact((prev) => ({ ...prev, name: e.target.value }))}
                  className="mt-1.5 w-full rounded-xl border border-black/15 px-4 py-3 text-sm outline-none ring-moss/30 transition focus:ring"
                  placeholder={isZh ? '你的姓名或称呼' : 'Your name'}
                />
              </div>
            </div>

            <button
              type="button"
              onClick={submitLeadGate}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-ink px-4 py-3 text-sm font-semibold text-white"
            >
              {isZh ? '查看建议结果' : 'View My Recommendations'}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {showFullscreen && websiteGenerated && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/65 px-4" onClick={() => setShowFullscreen(false)}>
          <div className="max-h-[90vh] w-full max-w-6xl overflow-auto rounded-3xl bg-white p-6 md:p-8" onClick={(e) => e.stopPropagation()}>
            <div
              className="relative overflow-hidden rounded-2xl p-8 text-white md:p-12"
              style={{
                background: primaryImage
                  ? `linear-gradient(110deg, rgba(22,22,22,0.78), rgba(22,22,22,0.45)), url(${primaryImage}) center/cover`
                  : 'linear-gradient(120deg, #25544a, #0f2f29)',
              }}
            >
              <p className="text-xs uppercase tracking-[0.24em] text-white/70">{usWebsiteCopy.heroEyebrow}</p>
              <h2 className="us-web-title mt-2">{usWebsiteCopy.heroTitle}</h2>
              <p className="us-web-text mt-3 max-w-2xl text-white/85">
                {usWebsiteCopy.heroSubtitle}
              </p>
            </div>

            <section className="us-web-section us-web-card rounded-2xl border border-black/10 bg-sand/40">
              <p className="text-xs uppercase tracking-[0.18em] text-black/55">{usWebsiteCopy.aboutTitle}</p>
              <h3 className="us-web-heading mt-2">{leadData.step1.companyName || 'Your Company'}</h3>
              <p className="us-web-text mt-2 text-black/75">
                {usWebsiteCopy.aboutText}
              </p>
            </section>

            <section className="us-web-section">
              <p className="us-web-subheading text-black/85">{usWebsiteCopy.whyTitle}</p>
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                {usWebsiteCopy.whyItems.map((item) => (
                  <div key={item} className="us-web-text rounded-xl border border-black/10 bg-white p-5 text-black/80">
                    {item}
                  </div>
                ))}
              </div>
            </section>

            <section className="us-web-section">
              <p className="us-web-subheading text-black/85">{usWebsiteCopy.productTitle}</p>
              <div className="mt-4 space-y-3">
                {productEntries.length > 0 ? productEntries.map((entry) => (
                  <article key={entry.name} className="rounded-2xl border border-black/10 bg-white px-4 py-4 md:px-5 md:py-5">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0 md:max-w-[46%]">
                        <h4 className="us-web-subheading">{entry.name}</h4>
                        {entry.info.some(Boolean) && (
                          <ul className="mt-3 space-y-1.5 text-sm text-black/70">
                            {entry.info.filter(Boolean).map((point, i) => <li key={i}>{point}</li>)}
                          </ul>
                        )}
                      </div>
                      {entry.photos.length > 0 && (
                        <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-3 md:max-w-[50%]">
                          {entry.photos.slice(0, PRODUCT_PHOTO_MAX).map((photo) => (
                            <img key={photo.url} src={photo.url} alt={photo.name} className="h-24 w-full rounded-lg border border-black/10 object-cover md:h-28" />
                          ))}
                        </div>
                      )}
                    </div>
                  </article>
                )) : (
                  <p className="text-sm text-black/50">{isZh ? '请先填写产品信息。' : 'Please add a product above.'}</p>
                )}
              </div>
            </section>

            <section className="us-web-section us-web-card rounded-2xl border border-black/10 bg-white">
              <p className="us-web-subheading text-black/85">{usWebsiteCopy.trustTitle}</p>
              <div className="mt-4 flex flex-wrap gap-2.5">
                <Tag>{leadData.step1.currentCapacity || 'Capacity pending'}</Tag>
                {leadData.step1.certifications.length > 0
                  ? leadData.step1.certifications.map((item) => <Tag key={item}>{item}</Tag>)
                  : <Tag>Certifications pending</Tag>}
              </div>
            </section>

            <section className="us-web-section us-web-card rounded-2xl border border-moss/30 bg-moss/8">
              <p className="us-web-subheading text-moss/90">{usWebsiteCopy.contactTitle}</p>
              <h3 className="us-web-heading mt-2">Contact Factory Team</h3>
              <p className="us-web-text mt-2 text-black/75">
                {usWebsiteCopy.contactText}
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <a
                  href="mailto:hello@factorygoglobal.com?subject=FactoryGoGlobal%20Inquiry"
                  className="w-full rounded-xl bg-ink px-4 py-3 text-center text-sm font-semibold text-white sm:w-auto"
                >
                  Email Us
                </a>
                <a
                  href="https://wa.me/0000000000?text=Hi%20FactoryGoGlobal%2C%20I%20want%20to%20discuss%20products."
                  target="_blank"
                  rel="noreferrer"
                  className="w-full rounded-xl border border-ink px-4 py-3 text-center text-sm font-semibold text-ink sm:w-auto"
                >
                  WhatsApp
                </a>
              </div>
            </section>
          </div>
        </div>
      )}

      <div className="mt-6 px-1 text-xs leading-relaxed text-black/50 md:mt-8">
        <p>
          {isZh
            ? '免责声明：本工具输出仅用于方向性参考，不构成法律、税务、金融或合规承诺。不同国家准入规则与税率请以官方和专业机构意见为准。'
            : 'Disclaimer: Outputs are directional only and do not constitute legal, tax, financial, or compliance commitments. Always validate market-entry requirements with official sources and professional advisors.'}
        </p>
        <p className="mt-2">
          {isZh
            ? '隐私说明：你上传的图片与输入信息仅用于当前会话生成预览内容。接入真实后端前，不会自动同步到第三方系统。'
            : 'Privacy Notice: Uploaded images and form inputs are used to generate this session preview only. Before backend integration, data is not automatically synced to third-party systems.'}
        </p>
      </div>
    </main>
  )
}

function Field({ label, hint, children }) {
  return (
    <label className="space-y-2.5 text-sm text-black/75">
      <span className="font-medium text-ink">{label}</span>
      {hint && <p className="max-w-2xl text-xs leading-relaxed text-black/50">{hint}</p>}
      {children}
    </label>
  )
}

function SectionCard({ title, description, children }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-black/8 bg-white/65">
      <div className="bg-sand/70 px-4 py-3 sm:px-5">
        <p className="text-sm font-semibold text-ink">{title}</p>
        <p className="mt-1 text-xs leading-relaxed text-black/55">{description}</p>
      </div>
      <div className="space-y-4 p-4 sm:p-5">{children}</div>
    </div>
  )
}

function QuestionBlock({ children }) {
  return <div className="border-t border-black/8 pt-4 first:border-t-0 first:pt-0">{children}</div>
}

function SelectionChip({ selected, onClick, children, disabled = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-full border px-3.5 py-2 text-sm leading-none transition ${
        selected
          ? 'border-moss bg-moss text-white shadow-[0_4px_14px_rgba(37,84,74,0.16)]'
          : disabled
            ? 'cursor-not-allowed border-black/10 bg-black/3 text-black/35'
            : 'border-black/12 bg-white text-black/72 hover:border-moss/35 hover:bg-moss/5 hover:text-moss'
      }`}
    >
      {children}
    </button>
  )
}

function InfoCard({ label, value, sub }) {
  return (
    <div className="rounded-2xl border border-black/10 bg-sand p-4">
      <p className="text-xs uppercase tracking-[0.16em] text-black/55">{label}</p>
      <p className="mt-2 text-xl font-semibold text-ink">{value}</p>
      {sub && <p className="mt-1 text-xs text-black/40">{sub}</p>}
    </div>
  )
}

function Tag({ children }) {
  return <span className="rounded-full bg-black/5 px-3 py-1 text-xs text-black/70">{children}</span>
}

function MiniMetric({ label, value }) {
  return (
    <div className="rounded-lg border border-black/10 bg-sand px-3 py-2">
      <p className="text-[11px] uppercase tracking-[0.15em] text-black/55">{label}</p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  )
}

export default App
