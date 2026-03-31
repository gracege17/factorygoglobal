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
  'Basic Info',
  'AI Strategy',
  'Confirm Direction',
  'Cost Framework',
  'Material Output',
]

const certOptions = ['ISO 9001', 'CE', 'FSC', 'FDA', 'BSCI', 'None']

const costReference = {
  usa: {
    tariff: '6% - 18%',
    logistics: 'High',
    platform: '$3,000 - $10,000 / year',
    certification: '$6,000 - $25,000',
  },
  germany: {
    tariff: '4% - 12%',
    logistics: 'Medium',
    platform: '$2,000 - $8,000 / year',
    certification: '$5,000 - $18,000',
  },
  vietnam: {
    tariff: '0% - 8%',
    logistics: 'Low',
    platform: '$1,000 - $5,000 / year',
    certification: '$3,000 - $10,000',
  },
  uae: {
    tariff: '0% - 10%',
    logistics: 'Medium',
    platform: '$1,500 - $6,000 / year',
    certification: '$4,000 - $12,000',
  },
  default: {
    tariff: '5% - 15%',
    logistics: 'Medium',
    platform: '$2,000 - $7,000 / year',
    certification: '$4,000 - $15,000',
  },
}

const PRODUCT_CATEGORY_MAX_LENGTH = 60
const PRODUCT_CATEGORY_MAX_ITEMS = 3
const productCategoryAllowedPattern = /^[\u4e00-\u9fa5A-Za-z0-9\s/&,+\-、，（）()]+$/
const COMPANY_NAME_MAX_LENGTH = 80
const companyNameAllowedPattern = /^[\u4e00-\u9fa5A-Za-z0-9\s&.,'’\-()（）]+$/
const CAPACITY_MAX_LENGTH = 60
const capacityAllowedPattern = /^[\u4e00-\u9fa5A-Za-z0-9\s,./+\-xX*×()（）]+$/
const TARGET_MARKET_MAX_LENGTH = 40
const targetMarketAllowedPattern = /^[\u4e00-\u9fa5A-Za-z\s.'’\-()（）]+$/
const PRODUCT_LIST_MIN = 3
const PRODUCT_LIST_MAX = 5
const PRODUCT_ITEM_MAX_LENGTH = 40
const productItemAllowedPattern = /^[\u4e00-\u9fa5A-Za-z0-9\s/&,+\-.'’()（）]+$/
const PRODUCT_PHOTO_MIN = 2
const PRODUCT_PHOTO_MAX = 3

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

const normalizeProductCategory = (raw = '') =>
  raw.replace(/\n+/g, ' ').replace(/\s+/g, ' ').slice(0, PRODUCT_CATEGORY_MAX_LENGTH)

const normalizeCompanyName = (raw = '') =>
  raw.replace(/\n+/g, ' ').replace(/\s+/g, ' ').slice(0, COMPANY_NAME_MAX_LENGTH)

const normalizeCapacity = (raw = '') =>
  raw.replace(/\n+/g, ' ').replace(/\s+/g, ' ').slice(0, CAPACITY_MAX_LENGTH)

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

  const items = trimmed.split(/[\/、，,]+/).map((item) => item.trim()).filter(Boolean)
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

const getFilledProductItems = (items = []) => items.map((item) => item.trim()).filter(Boolean)
const getFilledProductEntries = (items = [], photos = []) =>
  items
    .map((name, index) => ({
      index,
      name: name.trim(),
      photos: photos[index] || [],
    }))
    .filter((item) => item.name)

const validateProductItems = (items, isZh) => {
  const filledItems = getFilledProductItems(items)
  if (filledItems.length < PRODUCT_LIST_MIN) {
    return {
      error: isZh
        ? `请至少填写 ${PRODUCT_LIST_MIN} 个产品。`
        : `Please provide at least ${PRODUCT_LIST_MIN} products.`,
      items: filledItems,
    }
  }

  if (filledItems.length > PRODUCT_LIST_MAX) {
    return {
      error: isZh
        ? `最多填写 ${PRODUCT_LIST_MAX} 个产品。`
        : `Please provide no more than ${PRODUCT_LIST_MAX} products.`,
      items: filledItems,
    }
  }

  const invalidItem = filledItems.find(
    (item) => item.length < 2 || item.length > PRODUCT_ITEM_MAX_LENGTH || !productItemAllowedPattern.test(item),
  )
  if (invalidItem) {
    return {
      error: isZh
        ? `每个产品需 2-${PRODUCT_ITEM_MAX_LENGTH} 字，且仅支持中英文、数字和常见符号。`
        : `Each product must be 2-${PRODUCT_ITEM_MAX_LENGTH} chars and use letters/numbers/common symbols.`,
      items: filledItems,
    }
  }

  return { error: '', items: filledItems }
}

const validateProductPhotos = (productItems, productPhotos, isZh) => {
  const entries = getFilledProductEntries(productItems, productPhotos)
  const invalidEntry = entries.find(
    (entry) => entry.photos.length < PRODUCT_PHOTO_MIN || entry.photos.length > PRODUCT_PHOTO_MAX,
  )

  if (invalidEntry) {
    const productName = invalidEntry.name || (isZh ? `产品 ${invalidEntry.index + 1}` : `Product ${invalidEntry.index + 1}`)
    return isZh
      ? `「${productName}」需上传 ${PRODUCT_PHOTO_MIN}-${PRODUCT_PHOTO_MAX} 张照片。`
      : `"${productName}" requires ${PRODUCT_PHOTO_MIN}-${PRODUCT_PHOTO_MAX} photos.`
  }

  return ''
}

const getCategoryItems = (value = '') =>
  value
    .split(/[\/、，,]+/)
    .map((item) => item.trim())
    .filter(Boolean)

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

const getFilledPhotoGroups = (photos = []) => photos.filter((group) => group.length >= PRODUCT_PHOTO_MIN).length

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
  const [companyNameError, setCompanyNameError] = useState('')
  const [companyNameTouched, setCompanyNameTouched] = useState(false)
  const [productCategoryError, setProductCategoryError] = useState('')
  const [productCategoryTouched, setProductCategoryTouched] = useState(false)
  const [capacityError, setCapacityError] = useState('')
  const [capacityTouched, setCapacityTouched] = useState(false)
  const [targetMarketError, setTargetMarketError] = useState('')
  const [targetMarketTouched, setTargetMarketTouched] = useState(false)
  const [productListError, setProductListError] = useState('')
  const [productListTouched, setProductListTouched] = useState(false)
  const [productPhotoError, setProductPhotoError] = useState('')
  const [actionError, setActionError] = useState('')
  const [websiteGenerated, setWebsiteGenerated] = useState(false)
  const [onePagerGenerated, setOnePagerGenerated] = useState(false)
  const [lang, setLang] = useState('zh')
  const [selectedPath, setSelectedPath] = useState('accept')
  const [showFullscreen, setShowFullscreen] = useState(false)
  const [leadData, setLeadData] = useState({
    step1: {
      companyName: '',
      productCategory: '',
      currentCapacity: '',
      certifications: [],
    },
    step2: {
      aiPositioning: null,
    },
    step3: {
      targetMarket: '',
    },
    step5: {
      productItems: ['', '', ''],
      productPhotos: [[], [], []],
    },
  })

  const pdfRef = useRef(null)

  const currentMarket =
    leadData.step3.targetMarket || leadData.step2.aiPositioning?.topMarkets?.[0]?.country || ''

  const costData = useMemo(() => getCostData(currentMarket), [currentMarket])

  const progress = (step / steps.length) * 100
  const isZh = lang === 'zh'
  const stepLabels = isZh
    ? ['基础信息', 'AI 战略', '方向确认', '成本框架', '物料生成']
    : steps

  useEffect(() => {
    document.documentElement.lang = isZh ? 'zh-CN' : 'en'
  }, [isZh])

  const updateStep1 = (field, value) => {
    setLeadData((prev) => ({
      ...prev,
      step1: {
        ...prev.step1,
        [field]: value,
      },
    }))
  }

  const handleProductCategoryChange = (value) => {
    const normalized = normalizeProductCategory(value)
    updateStep1('productCategory', normalized)

    if (productCategoryTouched) {
      setProductCategoryError(validateProductCategory(normalized, isZh))
    }
  }

  const handleProductCategoryBlur = () => {
    setProductCategoryTouched(true)
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

  const handleProductItemChange = (index, value) => {
    setLeadData((prev) => ({
      ...prev,
      step5: {
        ...prev.step5,
        productItems: prev.step5.productItems.map((item, itemIndex) => (itemIndex === index ? value : item)),
      },
    }))

    if (productListTouched) {
      setProductListError(validateProductItems(leadData.step5.productItems.map((item, itemIndex) => (itemIndex === index ? value : item)), isZh).error)
    }
  }

  const handleProductItemBlur = () => {
    setProductListTouched(true)
    setProductListError(validateProductItems(leadData.step5.productItems, isZh).error)
  }

  const addProductItem = () => {
    setLeadData((prev) => {
      if (prev.step5.productItems.length >= PRODUCT_LIST_MAX) {
        return prev
      }
      return {
        ...prev,
        step5: {
          ...prev.step5,
          productItems: [...prev.step5.productItems, ''],
          productPhotos: [...prev.step5.productPhotos, []],
        },
      }
    })
  }

  const removeProductItem = (index) => {
    setLeadData((prev) => {
      if (prev.step5.productItems.length <= PRODUCT_LIST_MIN) {
        return prev
      }
      const nextItems = prev.step5.productItems.filter((_, itemIndex) => itemIndex !== index)
      const nextPhotos = prev.step5.productPhotos.filter((_, itemIndex) => itemIndex !== index)
      return {
        ...prev,
        step5: {
          ...prev.step5,
          productItems: nextItems,
          productPhotos: nextPhotos,
        },
      }
    })
  }

  const handleProductPhotoUpload = (productIndex, event) => {
    const pickedFiles = Array.from(event.target.files || [])
    const imageFiles = pickedFiles.filter((file) => file.type.startsWith('image/'))
    const files = imageFiles.slice(0, PRODUCT_PHOTO_MAX)

    const previews = files.map((file) => ({
      name: file.name,
      file,
      url: URL.createObjectURL(file),
    }))

    setLeadData((prev) => ({
      ...prev,
      step5: {
        ...prev.step5,
        productPhotos: prev.step5.productPhotos.map((photos, index) => (index === productIndex ? previews : photos)),
      },
    }))

    if (pickedFiles.length > 0 && imageFiles.length === 0) {
      setProductPhotoError(isZh ? '产品照片仅支持图片文件。' : 'Product photos only support image files.')
      return
    }
    if (imageFiles.length > PRODUCT_PHOTO_MAX) {
      setProductPhotoError(
        isZh
          ? `单个产品最多上传 ${PRODUCT_PHOTO_MAX} 张照片，已保留前 ${PRODUCT_PHOTO_MAX} 张。`
          : `Each product supports up to ${PRODUCT_PHOTO_MAX} photos. Kept the first ${PRODUCT_PHOTO_MAX}.`,
      )
      return
    }
    setProductPhotoError('')
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
    if (!targetMarketTouched || selectedPath !== 'manual') {
      return
    }
    setTargetMarketError(validateTargetMarket(leadData.step3.targetMarket, isZh))
  }, [isZh, leadData.step3.targetMarket, selectedPath, targetMarketTouched])

  useEffect(() => {
    if (!productListTouched) {
      return
    }
    setProductListError(validateProductItems(leadData.step5.productItems, isZh).error)
  }, [isZh, leadData.step5.productItems, productListTouched])

  const toggleCertification = (cert) => {
    setLeadData((prev) => {
      const exists = prev.step1.certifications.includes(cert)
      return {
        ...prev,
        step1: {
          ...prev.step1,
          certifications: exists
            ? prev.step1.certifications.filter((item) => item !== cert)
            : [...prev.step1.certifications, cert],
        },
      }
    })
  }

  const runAnalysis = async () => {
    if (analyzing) {
      return
    }

    const companyNameValidation = validateCompanyName(leadData.step1.companyName, isZh)
    const productCategoryValidation = validateProductCategory(leadData.step1.productCategory, isZh)
    const capacityValidation = validateCapacity(leadData.step1.currentCapacity, isZh)
    if (companyNameValidation || productCategoryValidation || capacityValidation) {
      setFormError(isZh ? '请先填写公司名称和主营品类。' : 'Please enter company name and product category to continue.')
      setCompanyNameTouched(true)
      setCompanyNameError(companyNameValidation)
      setProductCategoryTouched(true)
      setProductCategoryError(productCategoryValidation)
      setCapacityTouched(true)
      setCapacityError(capacityValidation)
      return
    }

    setFormError('')
    setAnalysisError('')
    setAnalyzing(true)

    try {
      const aiPositioning = await fetchAIStrategy(leadData.step1, lang)
      setLeadData((prev) => ({
        ...prev,
        step2: {
          aiPositioning,
        },
      }))
      setStep(2)
    } catch {
      const fallback = createMockAI(leadData.step1, lang)
      setLeadData((prev) => ({
        ...prev,
        step2: {
          aiPositioning: fallback,
        },
      }))
      setAnalysisError(
        isZh ? 'AI 服务暂时不可用，已展示默认建议。' : 'AI service is temporarily unavailable. Showing fallback recommendation.',
      )
      setStep(2)
    } finally {
      setAnalyzing(false)
    }
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

    const productValidation = validateProductItems(leadData.step5.productItems, isZh)
    if (productValidation.error) {
      setProductListTouched(true)
      setProductListError(productValidation.error)
      return
    }
    const productPhotoValidation = validateProductPhotos(leadData.step5.productItems, leadData.step5.productPhotos, isZh)
    if (productPhotoValidation) {
      setProductPhotoError(productPhotoValidation)
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
  const categoryItems = getCategoryItems(leadData.step1.productCategory)
  const primaryImage = leadData.step5.productPhotos.flat()[0]?.url
  const parsedProducts = getFilledProductItems(leadData.step5.productItems)
  const productEntries = getFilledProductEntries(leadData.step5.productItems, leadData.step5.productPhotos)
  const filledPhotoGroups = getFilledPhotoGroups(leadData.step5.productPhotos)

  const validateStep5Inputs = () => {
    const productValidation = validateProductItems(leadData.step5.productItems, isZh)
    if (productValidation.error) {
      setProductListTouched(true)
      setProductListError(productValidation.error)
      return false
    }

    const productPhotoValidation = validateProductPhotos(leadData.step5.productItems, leadData.step5.productPhotos, isZh)
    if (productPhotoValidation) {
      setProductPhotoError(productPhotoValidation)
      return false
    }

    setProductListError('')
    setProductPhotoError('')
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
    <main className="mx-auto max-w-6xl px-3 pb-14 pt-3 text-ink sm:px-4 md:px-8 md:pt-6">
      <section className="mb-4 rounded-3xl border border-black/5 bg-white/80 p-3 shadow-soft backdrop-blur md:mb-6 md:p-6">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-moss/70">FactoryGoGlobal AI</p>
            <h1 className="mt-1 text-2xl md:text-3xl">{isZh ? 'B2B 工厂出海智能导航' : 'B2B Export Readiness Navigator'}</h1>
            <p className="mt-1 hidden max-w-2xl text-sm text-black/65 md:block">
              {isZh
                ? '快速评估出海可行性，找到差异化定位，并生成可直接转化的营销物料。'
                : 'Assess go-global potential, lock a differentiated strategy, and generate conversion-ready materials in minutes.'}
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setLang((prev) => (prev === 'zh' ? 'en' : 'zh'))}
              className="inline-flex items-center gap-1 rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-semibold text-black/75"
            >
              <Languages className="h-3.5 w-3.5" />
              {isZh ? '切换 EN' : '切换中文'}
            </button>
            <div className="rounded-xl bg-sand px-3 py-2 text-xs font-semibold text-black/70">
              {isZh ? '步骤' : 'Step'} {step} / {steps.length}
            </div>
          </div>
        </div>

        <div className="h-1.5 rounded-full bg-black/10">
          <div className="h-1.5 rounded-full bg-moss transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>

        <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1 text-[11px] text-black/55 md:grid md:grid-cols-5 md:gap-2 md:overflow-visible md:pb-0 md:text-xs">
          {stepLabels.map((item, index) => (
            <div
              key={item}
              className={`min-w-max rounded-lg px-2.5 py-1.5 md:min-w-0 md:px-3 md:py-2 ${step === index + 1 ? 'bg-moss/10 text-moss' : 'bg-black/5'}`}
            >
              {index + 1}. {item}
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-black/5 bg-white/85 p-4 shadow-soft md:p-8">
          {step === 1 && (
            <div className="space-y-5">
              <h2 className="text-2xl">{isZh ? '第 1 步：基本信息采集' : 'Step 1. Basic Information'}</h2>
              <div className="rounded-2xl border border-moss/20 bg-moss/5 p-5">
                <p className="text-sm text-black/70">
                  {isZh
                    ? '填写公司、品类和产能后，即可生成市场推荐。'
                    : 'Enter company, category, and capacity to generate market recommendations.'}
                </p>
              </div>

              <div className="space-y-4 xl:grid xl:grid-cols-[minmax(0,1.6fr)_minmax(280px,0.9fr)] xl:gap-5 xl:space-y-0">
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label={isZh ? '公司名称' : 'Company Name'}>
                      <input
                        className="w-full rounded-xl border border-black/15 bg-white px-4 py-3 outline-none ring-moss/30 transition focus:ring"
                        value={leadData.step1.companyName}
                        onChange={(e) => handleCompanyNameChange(e.target.value)}
                        onBlur={handleCompanyNameBlur}
                        placeholder={isZh ? '例如：浙江某某实业有限公司' : 'e.g. Zhejiang Eco Paper Co., Ltd'}
                      />
                      <div className="mt-1 flex items-center justify-end text-xs text-black/45">
                        <span>{leadData.step1.companyName.trim().length}/{COMPANY_NAME_MAX_LENGTH}</span>
                      </div>
                      {companyNameError && <p className="mt-1 text-xs text-clay">{companyNameError}</p>}
                    </Field>
                    <Field label={isZh ? '主营产品/品类' : 'Main Product Category'}>
                      <input
                        className="w-full rounded-xl border border-black/15 bg-white px-4 py-3 outline-none ring-moss/30 transition focus:ring"
                        value={leadData.step1.productCategory}
                        onChange={(e) => handleProductCategoryChange(e.target.value)}
                        onBlur={handleProductCategoryBlur}
                        placeholder={isZh ? '例如：纸巾 / 包装材料 / 家居清洁用品' : 'e.g. Tissue paper / Packaging / Home cleaning'}
                      />
                      <div className="mt-2 flex flex-wrap gap-2">
                        {(isZh
                          ? ['纸制品 / 包装材料', '家具 / 家居用品', '五金 / 建材']
                          : ['Tissue paper / Packaging', 'Furniture / Home goods', 'Hardware / Building materials']
                        ).map((example) => (
                          <button
                            key={example}
                            type="button"
                            onClick={() => handleProductCategoryChange(example)}
                            className="rounded-full border border-black/10 bg-sand px-3 py-1 text-xs text-black/65 transition hover:border-moss/40 hover:text-moss"
                          >
                            {example}
                          </button>
                        ))}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center justify-between gap-1 text-xs">
                        <span className={productCategoryError ? 'text-clay' : 'text-black/50'}>
                          {productCategoryError ||
                            (isZh
                              ? `最多 ${PRODUCT_CATEGORY_MAX_ITEMS} 个品类，支持 / 或逗号分隔`
                              : `Max ${PRODUCT_CATEGORY_MAX_ITEMS} categories, split with "/" or commas`)}
                        </span>
                        <span className="text-black/45">
                          {leadData.step1.productCategory.trim().length}/{PRODUCT_CATEGORY_MAX_LENGTH}
                        </span>
                      </div>
                    </Field>
                  </div>

                  <Field label={isZh ? '大致产能/规模' : 'Current Capacity / Scale'}>
                    <input
                      className="w-full rounded-xl border border-black/15 bg-white px-4 py-3 outline-none ring-moss/30 transition focus:ring"
                      value={leadData.step1.currentCapacity}
                      onChange={(e) => handleCapacityChange(e.target.value)}
                      onBlur={handleCapacityBlur}
                      placeholder={isZh ? '例如：月产 8000 吨，5 条产线' : 'e.g. 8,000 tons/month, 5 production lines'}
                    />
                    <div className="mt-1 flex flex-wrap items-center justify-between gap-1 text-xs">
                      <span className={capacityError ? 'text-clay' : 'text-black/50'}>
                        {capacityError || (isZh ? '选填，建议填写月产能与产线数' : 'Optional: monthly capacity and production lines')}
                      </span>
                      <span className="text-black/45">{leadData.step1.currentCapacity.trim().length}/{CAPACITY_MAX_LENGTH}</span>
                    </div>
                  </Field>

                  <Field label={isZh ? '已有认证' : 'Existing Certifications'}>
                    <div className="flex flex-wrap gap-2">
                      {certOptions.map((cert) => {
                        const selected = leadData.step1.certifications.includes(cert)
                        return (
                          <button
                            type="button"
                            key={cert}
                            onClick={() => toggleCertification(cert)}
                            className={`rounded-full border px-3 py-1.5 text-sm transition ${
                              selected
                                ? 'border-moss bg-moss text-white'
                                : 'border-black/15 bg-white text-black/75 hover:border-moss/40'
                            }`}
                          >
                            {cert}
                          </button>
                        )
                      })}
                    </div>
                  </Field>
                </div>

                <aside className="space-y-4 rounded-2xl border border-black/10 bg-sand/60 p-4 sm:p-5">
                  <div className="rounded-2xl border border-black/10 bg-white p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-black/55">{isZh ? '填写后将生成' : 'Next Output'}</p>
                    <div className="mt-3 space-y-3 text-sm text-black/70">
                      <div>
                        <p className="font-medium text-ink">{isZh ? '市场推荐' : 'Market Recommendation'}</p>
                        <p className="mt-1 text-black/60">{isZh ? '优先进入的目标市场' : 'Suggested priority market'}</p>
                      </div>
                      <div>
                        <p className="font-medium text-ink">{isZh ? '定位建议' : 'Positioning Advice'}</p>
                        <p className="mt-1 text-black/60">{isZh ? '你适合主打什么卖点' : 'What value proposition to lead with'}</p>
                      </div>
                      <div>
                        <p className="font-medium text-ink">{isZh ? '认证重点' : 'Certification Focus'}</p>
                        <p className="mt-1 text-black/60">{isZh ? '下一步优先补什么' : 'What to prioritize next'}</p>
                      </div>
                    </div>
                  </div>
                </aside>
              </div>

              <button
                onClick={runAnalysis}
                disabled={analyzing}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-55 sm:w-auto"
              >
                {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <TrendingUp className="h-4 w-4" />}
                {isZh ? '生成市场推荐与定位建议' : 'Generate Market Recommendation'}
              </button>
              {formError && <p className="text-sm text-clay">{formError}</p>}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <h2 className="text-2xl">{isZh ? '第 2 步：AI 战略定位与市场推荐' : 'Step 2. AI Strategy & Positioning'}</h2>
              <p className="text-sm text-black/60">
                {isZh
                  ? '以下建议基于你刚才填写的公司、品类、产能和认证信息生成。先看主推荐市场，再确认它是否适合你。'
                  : 'These suggestions are generated from your company, category, capacity, and certification inputs. Start with the primary market recommendation.'}
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
                        <div className="rounded-2xl border border-moss/25 bg-moss/5 p-4 sm:p-5">
                          <p className="text-xs uppercase tracking-[0.2em] text-moss/70">{isZh ? '主推荐市场' : 'Primary Market'}</p>
                          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                            <div>
                              <div className="flex items-center gap-2 text-lg font-semibold text-ink">
                                <Globe2 className="h-5 w-5 text-moss" />
                                {topMarket.country}
                              </div>
                              <p className="mt-2 max-w-xl text-sm leading-relaxed text-black/70">
                                {getMarketReason(topMarket.country, isZh)}
                              </p>
                            </div>
                            <div className="w-full rounded-2xl bg-white px-4 py-3 text-center shadow-soft sm:w-auto">
                              <p className="text-3xl font-bold text-moss">{topMarket.fitScore}%</p>
                              <p className="text-xs text-black/55">{isZh ? '市场匹配度' : 'Market fit score'}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="space-y-4 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
                        <div className="rounded-2xl border border-black/10 bg-white p-4 sm:p-5">
                          <p className="text-xs uppercase tracking-[0.2em] text-black/55">{isZh ? '推荐依据' : 'Why This Recommendation'}</p>
                          <ul className="mt-3 space-y-2 text-sm text-black/70">
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
                                  ? `当前产能判断：${leadData.step1.currentCapacity || '按通用工厂能力估算'}`
                                  : `Capacity assessment: ${leadData.step1.currentCapacity || 'Using general factory assumptions'}`}
                              </span>
                            </li>
                            <li className="flex items-start gap-2">
                              <CheckCircle2 className="mt-0.5 h-4 w-4 text-moss" />
                              <span>
                                {isZh
                                  ? `认证情况：${leadData.step1.certifications.length > 0 ? leadData.step1.certifications.join(' / ') : '暂未提供，系统已按保守路径建议'}`
                                  : `Certifications: ${leadData.step1.certifications.length > 0 ? leadData.step1.certifications.join(' / ') : 'Not provided, using a conservative recommendation path'}`}
                              </span>
                            </li>
                          </ul>
                        </div>

                        <div className="rounded-2xl border border-black/10 bg-white p-4 sm:p-5">
                          <p className="text-xs uppercase tracking-[0.2em] text-black/55">{isZh ? '备选市场' : 'Backup Markets'}</p>
                          <div className="mt-3 space-y-3">
                            {ai.topMarkets.slice(1).map((market) => (
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
                      </div>

                      <div className="rounded-2xl border border-moss/20 bg-moss/5 p-4 sm:p-5">
                        <p className="text-xs uppercase tracking-[0.2em] text-moss/70">{isZh ? '建议你怎么卖' : 'How To Position Yourself'}</p>
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
              <h2 className="text-2xl">{isZh ? '第 3 步：客户意向确认' : 'Step 3. Confirm Target Market'}</h2>
              <p className="text-sm text-black/60">
                {isZh
                  ? '先确定首发市场。这个选择会直接影响下一步的成本估算和生成物料内容。'
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
                        <p className="font-semibold">{isZh ? '采用 AI 推荐市场' : 'Use AI Recommended Market'}</p>
                        <p className="mt-1 text-sm text-black/60">
                          {isZh
                            ? `直接以 ${ai.topMarkets[0].country} 作为首发市场，最快进入下一步。`
                            : `Use ${ai.topMarkets[0].country} as the launch market and move forward quickly.`}
                        </p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${selectedPath === 'accept' ? 'bg-moss text-white' : 'bg-black/5 text-black/55'}`}>
                        {isZh ? '推荐' : 'Recommended'}
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

          {step === 4 && (
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

              <div className="space-y-4 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
                <InfoCard label={isZh ? '关税预估范围' : 'Estimated Tariff Range'} value={costData.tariff} />
                <InfoCard
                  label={isZh ? '海空运费级别' : 'Sea/Air Logistics Level'}
                  value={getLocalizedLogisticsLevel(costData.logistics, isZh)}
                />
                <InfoCard label={isZh ? '平台入驻费用区间' : 'Mainstream Platform Entry Cost'} value={costData.platform} />
                <InfoCard label={isZh ? '认证办理费用区间' : 'Certification Processing Cost'} value={costData.certification} />
              </div>

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
          )}

          {step === 5 && (
            <div className="space-y-6">
              <h2 className="text-2xl">{isZh ? '第 5 步：智能物料生成' : 'Step 5. Smart Material Generation'}</h2>
              <div className="rounded-2xl border border-moss/20 bg-moss/5 p-4 sm:p-5">
                <p className="text-sm text-black/70">
                  {isZh
                    ? '先补齐主推产品和照片，再生成网站预览或 One-pager。手机端建议一条产品一条产品地完成。'
                    : 'Complete products and photos first, then generate the website preview or one-pager. On mobile, finish one product at a time.'}
                </p>
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <MiniMetric label={isZh ? '已填产品' : 'Products'} value={`${parsedProducts.length}/${PRODUCT_LIST_MAX}`} />
                  <MiniMetric label={isZh ? '已补照片产品' : 'Photo-ready'} value={`${filledPhotoGroups}/${PRODUCT_LIST_MAX}`} />
                </div>
              </div>

              <div className="rounded-2xl border border-black/10 bg-white p-4">
                <label className="mb-2 block text-sm font-medium">
                  {isZh ? `主推产品清单（必填 ${PRODUCT_LIST_MIN}-${PRODUCT_LIST_MAX} 个）` : `Key Product List (Required: ${PRODUCT_LIST_MIN}-${PRODUCT_LIST_MAX})`}
                </label>
                <div className="space-y-2">
                  {leadData.step5.productItems.map((item, index) => (
                    <div key={`product-${index}`} className="rounded-xl border border-black/10 bg-sand/55 p-3">
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-ink">{isZh ? `产品 ${index + 1}` : `Product ${index + 1}`}</p>
                        <span className="text-xs text-black/50">
                          {(leadData.step5.productPhotos[index] || []).length >= PRODUCT_PHOTO_MIN
                            ? isZh ? '已可生成' : 'Ready'
                            : isZh ? '待补照片' : 'Photos needed'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          value={item}
                          onChange={(e) => handleProductItemChange(index, e.target.value)}
                          onBlur={handleProductItemBlur}
                          className="w-full rounded-xl border border-black/15 bg-white px-4 py-3 text-sm outline-none ring-moss/30 transition focus:ring"
                          placeholder={isZh ? `产品 ${index + 1}，例如：竹纤维面巾纸` : `Product ${index + 1}, e.g. Bamboo facial tissue`}
                        />
                        {leadData.step5.productItems.length > PRODUCT_LIST_MIN && (
                          <button
                            type="button"
                            onClick={() => removeProductItem(index)}
                            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-black/15 text-black/65"
                            aria-label={isZh ? '删除产品' : 'Remove product'}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                      <div className="mt-2">
                        <label className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-black/15 bg-white px-3 py-3 text-xs font-semibold text-black/75 sm:w-auto">
                          <Upload className="h-3.5 w-3.5" />
                          {isZh ? `上传该产品照片（${PRODUCT_PHOTO_MIN}-${PRODUCT_PHOTO_MAX} 张）` : `Upload photos for this product (${PRODUCT_PHOTO_MIN}-${PRODUCT_PHOTO_MAX})`}
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={(e) => handleProductPhotoUpload(index, e)}
                          />
                        </label>
                        <span className="mt-2 block text-xs text-black/50 sm:ml-2 sm:mt-0 sm:inline">
                          {(leadData.step5.productPhotos[index] || []).length}/{PRODUCT_PHOTO_MAX}
                        </span>
                        {(leadData.step5.productPhotos[index] || []).length > 0 && (
                          <div className="mt-2 grid grid-cols-3 gap-2">
                            {leadData.step5.productPhotos[index].map((photo) => (
                              <img
                                key={`${photo.name}-${photo.url}`}
                                src={photo.url}
                                alt={photo.name}
                                className="h-16 w-full rounded-md border border-black/10 object-cover"
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={addProductItem}
                  disabled={leadData.step5.productItems.length >= PRODUCT_LIST_MAX}
                  className="mt-3 inline-flex items-center gap-2 rounded-xl border border-black/15 bg-white px-3 py-2 text-xs font-semibold text-black/70 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {isZh ? '新增一条产品' : 'Add Product Item'}
                </button>
                <div className="mt-1 flex flex-wrap items-center justify-between gap-1 text-xs">
                  <span className={productListError || productPhotoError ? 'text-clay' : 'text-black/50'}>
                    {productListError ||
                      productPhotoError ||
                      (isZh
                        ? `请填写 ${PRODUCT_LIST_MIN}-${PRODUCT_LIST_MAX} 个主推产品，每个产品上传 ${PRODUCT_PHOTO_MIN}-${PRODUCT_PHOTO_MAX} 张照片`
                        : `Provide ${PRODUCT_LIST_MIN}-${PRODUCT_LIST_MAX} key products and upload ${PRODUCT_PHOTO_MIN}-${PRODUCT_PHOTO_MAX} photos for each`)}
                  </span>
                  <span className="text-black/45">
                    {parsedProducts.length}/{PRODUCT_LIST_MAX}
                  </span>
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
                        <p className="text-xs uppercase tracking-[0.15em] text-black/55">Key Products</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {parsedProducts.length > 0
                            ? parsedProducts.slice(0, PRODUCT_LIST_MAX).map((item) => <Tag key={item}>{item}</Tag>)
                            : <Tag>Please add 3-5 products</Tag>}
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
                      <p className="text-xs uppercase tracking-[0.15em] text-black/55">{isZh ? '主推产品' : 'Key Products'}</p>
                      <p className="mt-1 text-sm text-black/75">
                        {parsedProducts.length > 0
                          ? parsedProducts.slice(0, PRODUCT_LIST_MAX).join(' / ')
                          : isZh
                            ? '待填写（请在上方填写 3-5 个产品）'
                            : 'Pending (please provide 3-5 products above)'}
                      </p>
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
                {productEntries.map((entry) => (
                  <article
                    key={`${entry.index}-${entry.name}`}
                    className="rounded-2xl border border-black/10 bg-white px-4 py-4 md:px-5 md:py-5"
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0 md:max-w-[46%]">
                        <div className="flex items-center gap-3">
                          <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-ink px-2 text-xs font-semibold text-white">
                            {String(entry.index + 1).padStart(2, '0')}
                          </span>
                          <h4 className="us-web-subheading truncate">{entry.name}</h4>
                        </div>
                        <ul className="mt-3 space-y-1.5 text-sm text-black/70">
                          <li>MOQ: 1 x 20ft container</li>
                          <li>Lead time: 25-35 days</li>
                          <li>Customization: OEM / private label</li>
                        </ul>
                      </div>

                      <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-3 md:max-w-[50%]">
                        {entry.photos.slice(0, PRODUCT_PHOTO_MAX).map((photo) => (
                          <img
                            key={`${entry.name}-${photo.url}`}
                            src={photo.url}
                            alt={`${entry.name}-${photo.name}`}
                            className="h-24 w-full rounded-lg border border-black/10 object-cover md:h-28"
                          />
                        ))}
                      </div>
                    </div>
                  </article>
                ))}
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

      <section className="mt-5 rounded-2xl border border-black/10 bg-white/70 p-4 text-xs leading-relaxed text-black/60 md:mt-8">
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
      </section>
    </main>
  )
}

function Field({ label, hint, children }) {
  return (
    <label className="space-y-1.5 text-sm text-black/75">
      <span className="font-medium">{label}</span>
      {hint && <p className="text-xs leading-relaxed text-black/50">{hint}</p>}
      {children}
    </label>
  )
}

function InfoCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-black/10 bg-sand p-4">
      <p className="text-xs uppercase tracking-[0.16em] text-black/55">{label}</p>
      <p className="mt-2 text-xl font-semibold text-ink">{value}</p>
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
