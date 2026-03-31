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
  ShieldCheck,
  TrendingUp,
  Upload,
  Video,
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
const MEDIA_MIN = 1
const MEDIA_MAX = 3

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

const parseProductItems = (raw = '') =>
  raw
    .split(/[\n,，、;；]+/)
    .map((item) => item.trim())
    .filter(Boolean)

const validateProductItems = (raw, isZh) => {
  const items = parseProductItems(raw)
  if (items.length < PRODUCT_LIST_MIN) {
    return {
      error: isZh
        ? `请至少填写 ${PRODUCT_LIST_MIN} 个产品。`
        : `Please provide at least ${PRODUCT_LIST_MIN} products.`,
      items,
    }
  }

  if (items.length > PRODUCT_LIST_MAX) {
    return {
      error: isZh
        ? `最多填写 ${PRODUCT_LIST_MAX} 个产品。`
        : `Please provide no more than ${PRODUCT_LIST_MAX} products.`,
      items,
    }
  }

  const invalidItem = items.find((item) => item.length < 2 || item.length > PRODUCT_ITEM_MAX_LENGTH || !productItemAllowedPattern.test(item))
  if (invalidItem) {
    return {
      error: isZh
        ? `每个产品需 2-${PRODUCT_ITEM_MAX_LENGTH} 字，且仅支持中英文、数字和常见符号。`
        : `Each product must be 2-${PRODUCT_ITEM_MAX_LENGTH} chars and use letters/numbers/common symbols.`,
      items,
    }
  }

  return { error: '', items }
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
  const [uploadError, setUploadError] = useState('')
  const [lang, setLang] = useState('en')
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
      uploadedMedia: [],
      productListInput: '',
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

  const handleProductListChange = (value) => {
    setLeadData((prev) => ({
      ...prev,
      step5: {
        ...prev.step5,
        productListInput: value,
      },
    }))

    if (productListTouched) {
      setProductListError(validateProductItems(value, isZh).error)
    }
  }

  const handleProductListBlur = () => {
    setProductListTouched(true)
    setProductListError(validateProductItems(leadData.step5.productListInput, isZh).error)
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
    setProductListError(validateProductItems(leadData.step5.productListInput, isZh).error)
  }, [isZh, leadData.step5.productListInput, productListTouched])

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

  const handleUpload = (event) => {
    const pickedFiles = Array.from(event.target.files || [])
    const mediaFiles = pickedFiles.filter((file) => file.type.startsWith('image/') || file.type.startsWith('video/'))
    const files = mediaFiles.slice(0, MEDIA_MAX)
    const hasTooMany = mediaFiles.length > MEDIA_MAX
    const hasNoValidMedia = pickedFiles.length > 0 && mediaFiles.length === 0

    const previews = files.map((file) => ({
      name: file.name,
      file,
      url: URL.createObjectURL(file),
      kind: file.type.startsWith('video/') ? 'video' : 'image',
    }))

    setLeadData((prev) => ({
      ...prev,
      step5: {
        ...prev.step5,
        uploadedMedia: previews,
      },
    }))

    if (hasNoValidMedia) {
      setUploadError(
        isZh ? '仅支持上传图片或视频文件。' : 'Only image or video files are supported.',
      )
      return
    }
    if (hasTooMany) {
      setUploadError(
        isZh
          ? `最多上传 ${MEDIA_MAX} 个素材，已保留前 ${MEDIA_MAX} 个。`
          : `Up to ${MEDIA_MAX} media files are allowed. Kept the first ${MEDIA_MAX}.`,
      )
      return
    }
    if (files.length === 0) {
      setUploadError(
        isZh ? `请至少上传 ${MEDIA_MIN} 个工厂照片/视频。` : `Please upload at least ${MEDIA_MIN} factory photo/video.`,
      )
      return
    }
    setUploadError('')
  }

  const downloadPdf = async () => {
    if (!pdfRef.current || downloadingPdf) {
      return
    }

    const productValidation = validateProductItems(leadData.step5.productListInput, isZh)
    if (productValidation.error) {
      setProductListTouched(true)
      setProductListError(productValidation.error)
      return
    }
    if (leadData.step5.uploadedMedia.length < MEDIA_MIN || leadData.step5.uploadedMedia.length > MEDIA_MAX) {
      setUploadError(
        isZh
          ? `下载 PDF 前请先上传 ${MEDIA_MIN}-${MEDIA_MAX} 个工厂照片/视频素材。`
          : `Please upload ${MEDIA_MIN}-${MEDIA_MAX} factory photo/video files before downloading PDF.`,
      )
      return
    }

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
  const primaryImage = leadData.step5.uploadedMedia.find((item) => item.kind === 'image')?.url
  const parsedProducts = parseProductItems(leadData.step5.productListInput)

  return (
    <main className="mx-auto max-w-6xl px-3 pb-14 pt-4 text-ink sm:px-4 md:px-8 md:pt-8">
      <section className="mb-5 rounded-3xl border border-black/5 bg-white/80 p-4 shadow-soft backdrop-blur md:mb-8 md:p-8">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-moss/70">FactoryGoGlobal AI</p>
            <h1 className="mt-1 text-3xl md:text-4xl">{isZh ? 'B2B 工厂出海智能导航' : 'B2B Export Readiness Navigator'}</h1>
            <p className="mt-2 max-w-2xl text-sm text-black/65 md:text-base">
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

        <div className="h-2 rounded-full bg-black/10">
          <div className="h-2 rounded-full bg-moss transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1 text-xs text-black/55 md:grid md:grid-cols-5 md:overflow-visible md:pb-0">
          {stepLabels.map((item, index) => (
            <div
              key={item}
              className={`min-w-max rounded-lg px-3 py-2 md:min-w-0 ${step === index + 1 ? 'bg-moss/10 text-moss' : 'bg-black/5'}`}
            >
              {index + 1}. {item}
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-black/5 bg-white/85 p-4 shadow-soft md:p-8">
          {step === 1 && (
            <div className="space-y-5">
              <h2 className="text-2xl">{isZh ? 'Step 1. 基本信息采集' : 'Step 1. Basic Information'}</h2>
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
                    placeholder={isZh ? '例如：纸巾 / 包装材料' : 'e.g. Tissue paper / Packaging'}
                  />
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

              <button
                onClick={runAnalysis}
                disabled={analyzing}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-55 sm:w-auto"
              >
                {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <TrendingUp className="h-4 w-4" />}
                {isZh ? '开始 AI 战略分析' : 'Start AI Strategic Analysis'}
              </button>
              {formError && <p className="text-sm text-clay">{formError}</p>}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <h2 className="text-2xl">{isZh ? 'Step 2. AI 战略定位与市场推荐' : 'Step 2. AI Strategy & Positioning'}</h2>

              {analyzing && (
                <div className="space-y-3">
                  <div className="h-20 animate-pulse rounded-2xl bg-black/8" />
                  <div className="h-24 animate-pulse rounded-2xl bg-black/8" />
                  <div className="h-16 animate-pulse rounded-2xl bg-black/8" />
                </div>
              )}

              {!analyzing && ai && (
                <>
                  <div className="grid gap-4 md:grid-cols-3">
                    {ai.topMarkets.map((market) => (
                      <div key={market.country} className="rounded-2xl border border-black/10 bg-sand p-4">
                        <div className="flex items-center gap-2 text-sm font-semibold">
                          <Globe2 className="h-4 w-4 text-moss" />
                          {market.country}
                        </div>
                        <p className="mt-2 text-2xl font-bold text-moss">{market.fitScore}%</p>
                        <p className="text-xs text-black/60">{isZh ? '市场匹配度' : 'Market fit score'}</p>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-2xl border border-moss/20 bg-moss/5 p-5">
                    <p className="text-xs uppercase tracking-[0.2em] text-moss/70">{isZh ? '核心定位' : 'Core Differentiation'}</p>
                    <p className="mt-2 text-base leading-relaxed">{ai.differentiation}</p>
                  </div>

                  <div className="rounded-2xl border border-black/10 bg-white p-5">
                    <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
                      <ShieldCheck className="h-4 w-4 text-clay" />
                      {isZh ? '准入所需认证' : 'Required Certifications'}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {ai.requiredCertifications.map((item) => (
                        <span key={item} className="rounded-full bg-black/5 px-3 py-1 text-sm text-black/70">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <p className="text-sm text-black/55">
                {isZh ? '免责声明：方向性建议，仅供初步参考。' : 'Disclaimer: Directional suggestion only, for preliminary reference.'}
              </p>
              {analysisError && <p className="text-sm text-clay">{analysisError}</p>}

              <div className="flex justify-end">
                <button
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-ink px-4 py-3 text-sm font-semibold text-white sm:w-auto"
                  onClick={() => setStep(3)}
                >
                  {isZh ? '继续' : 'Continue'}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {step === 3 && ai && (
            <div className="space-y-5">
              <h2 className="text-2xl">{isZh ? 'Step 3. 客户意向确认' : 'Step 3. Confirm Target Market'}</h2>

              <div className="grid gap-4 lg:grid-cols-3">
                <div className="space-y-4 lg:col-span-2">
                  <div
                    onClick={() => setSelectedPath('accept')}
                    className={`w-full rounded-2xl border p-4 text-left transition ${
                      selectedPath === 'accept' ? 'border-moss bg-moss/5' : 'border-black/10 bg-white'
                    }`}
                  >
                    <p className="font-semibold">{isZh ? '选项 A：接受 AI 推荐' : 'Option A: Accept AI Recommendation'}</p>
                    <p className="mt-1 text-sm text-black/60">
                      {isZh
                        ? `以 ${ai.topMarkets[0].country} 作为首发市场并继续。`
                        : `Use ${ai.topMarkets[0].country} as primary launch market and continue.`}
                    </p>
                  </div>

                  <div
                    onClick={() => setSelectedPath('manual')}
                    className={`w-full rounded-2xl border p-4 text-left transition ${
                      selectedPath === 'manual' ? 'border-moss bg-moss/5' : 'border-black/10 bg-white'
                    }`}
                  >
                    <p className="font-semibold">{isZh ? '选项 B：手动输入目标国家' : 'Option B: Enter Your Own Market'}</p>
                    <input
                      value={leadData.step3.targetMarket}
                      onChange={(e) => handleTargetMarketChange(e.target.value)}
                      onBlur={handleTargetMarketBlur}
                      placeholder={isZh ? '例如：加拿大' : 'e.g. Canada'}
                      className="mt-3 w-full rounded-xl border border-black/15 px-3 py-2 text-sm outline-none ring-moss/30 focus:ring"
                    />
                    <div className="mt-1 flex flex-wrap items-center justify-between gap-1 text-xs">
                      <span className={targetMarketError ? 'text-clay' : 'text-black/50'}>
                        {targetMarketError || (isZh ? '请输入国家名称，例如：加拿大 / 德国' : 'Enter country name, e.g. Canada / Germany')}
                      </span>
                      <span className="text-black/45">{leadData.step3.targetMarket.trim().length}/{TARGET_MARKET_MAX_LENGTH}</span>
                    </div>
                  </div>
                </div>

                <aside className="rounded-2xl border border-clay/30 bg-clay/5 p-5">
                  <p className="text-xs uppercase tracking-[0.18em] text-clay/80">CTA 1</p>
                  <h3 className="mt-2 text-xl">
                    {isZh ? '需要针对目标国家做深度准入调研吗？' : 'Need deep market compliance research?'}
                  </h3>
                  <p className="mt-2 text-sm text-black/65">
                    {isZh
                      ? '获取针对特定国家的准入要求与竞品分析。'
                      : 'Get country-specific entry requirements and competitor mapping from our expert team.'}
                  </p>
                  <a
                    href="mailto:hello@factorygoglobal.com?subject=Need%20Deep%20Market%20Research"
                    className="mt-4 inline-block w-full rounded-xl bg-clay px-4 py-3 text-center text-sm font-semibold text-white sm:w-auto"
                  >
                    {isZh ? '联系专家团队' : 'Contact Expert Team'}
                  </a>
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
                  {isZh ? '继续' : 'Continue'}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-5">
              <h2 className="text-2xl">{isZh ? 'Step 4. 出海成本概算' : 'Step 4. Cost Framework'}</h2>
              <p className="text-sm text-black/60">
                {isZh
                  ? <>基于 <span className="font-semibold">{currentMarket || '你选择的市场'}</span> 的粗略估算（MVP 阶段）。</>
                  : <>Estimated for <span className="font-semibold">{currentMarket || 'your selected market'}</span>. MVP uses rough ranges.</>}
              </p>

              <div className="grid gap-4 md:grid-cols-2">
                <InfoCard label={isZh ? '关税预估范围' : 'Estimated Tariff Range'} value={costData.tariff} />
                <InfoCard
                  label={isZh ? '海空运费级别' : 'Sea/Air Logistics Level'}
                  value={getLocalizedLogisticsLevel(costData.logistics, isZh)}
                />
                <InfoCard label={isZh ? '平台入驻费用区间' : 'Mainstream Platform Entry Cost'} value={costData.platform} />
                <InfoCard label={isZh ? '认证办理费用区间' : 'Certification Processing Cost'} value={costData.certification} />
              </div>

              <div className="rounded-2xl border border-clay/25 bg-clay/5 p-5">
                <p className="text-sm text-black/75">
                  {isZh
                    ? 'CTA 2：不同 SKU 与 HS 编码对应税率差异较大。'
                    : 'CTA 2: Specific tax rates vary significantly by exact SKU and HS code.'}
                </p>
                <a
                  href="mailto:hello@factorygoglobal.com?subject=Need%20Accurate%20Export%20Cost%20Quote"
                  className="mt-3 inline-block w-full rounded-xl bg-clay px-4 py-3 text-center text-sm font-semibold text-white sm:w-auto"
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
                  {isZh ? '继续' : 'Continue'}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-6">
              <h2 className="text-2xl">{isZh ? 'Step 5. 智能物料生成' : 'Step 5. Smart Material Generation'}</h2>

              <div className="rounded-2xl border border-black/10 bg-white p-4">
                <label className="mb-2 block text-sm font-medium">
                  {isZh ? `主推产品清单（必填 ${PRODUCT_LIST_MIN}-${PRODUCT_LIST_MAX} 个）` : `Key Product List (Required: ${PRODUCT_LIST_MIN}-${PRODUCT_LIST_MAX})`}
                </label>
                <textarea
                  value={leadData.step5.productListInput}
                  onChange={(e) => handleProductListChange(e.target.value)}
                  onBlur={handleProductListBlur}
                  rows={4}
                  className="w-full rounded-xl border border-black/15 bg-white px-4 py-3 text-sm outline-none ring-moss/30 transition focus:ring"
                  placeholder={
                    isZh
                      ? '每行或用逗号分隔填写一个产品，例如：\n竹纤维面巾纸\n厨房用纸\n抽纸'
                      : 'One product per line or separated by commas, e.g.\nBamboo facial tissue\nKitchen paper towel\nPocket tissue'
                  }
                />
                <div className="mt-1 flex flex-wrap items-center justify-between gap-1 text-xs">
                  <span className={productListError ? 'text-clay' : 'text-black/50'}>
                    {productListError ||
                      (isZh
                        ? `请填写 ${PRODUCT_LIST_MIN}-${PRODUCT_LIST_MAX} 个产品；支持换行或逗号分隔`
                        : `Provide ${PRODUCT_LIST_MIN}-${PRODUCT_LIST_MAX} products; use line breaks or commas`)}
                  </span>
                  <span className="text-black/45">
                    {parsedProducts.length}/{PRODUCT_LIST_MAX}
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border border-black/10 bg-sand p-4">
                <label className="mb-2 block text-sm font-medium">
                  {isZh
                    ? `请上传 ${MEDIA_MIN}-${MEDIA_MAX} 个工厂照片/视频素材`
                    : `Upload ${MEDIA_MIN}-${MEDIA_MAX} factory photo/video assets`}
                </label>
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-black/15 bg-white px-4 py-2.5 text-sm font-semibold">
                  <Upload className="h-4 w-4" />
                  {isZh ? '选择照片/视频' : 'Select Photo/Video'}
                  <input type="file" accept="image/*,video/*" multiple className="hidden" onChange={handleUpload} />
                </label>
                <div className="mt-1 flex flex-wrap items-center justify-between gap-1 text-xs">
                  <span className={uploadError ? 'text-clay' : 'text-black/50'}>
                    {uploadError ||
                      (isZh
                        ? `至少 ${MEDIA_MIN} 个、最多 ${MEDIA_MAX} 个；支持图片和短视频`
                        : `At least ${MEDIA_MIN} and up to ${MEDIA_MAX}; supports image and short video`)}
                  </span>
                  <span className="text-black/45">{leadData.step5.uploadedMedia.length}/{MEDIA_MAX}</span>
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  {leadData.step5.uploadedMedia.length === 0 && (
                    <p className="rounded-xl border border-dashed border-black/15 bg-white p-3 text-sm text-black/55 md:col-span-3">
                      {isZh ? '尚未上传照片/视频，预览将使用默认风格。' : 'No photo/video uploaded yet. Preview will use default style.'}
                    </p>
                  )}
                  {leadData.step5.uploadedMedia.map((media) => (
                    <div key={media.name} className="overflow-hidden rounded-xl border border-black/10 bg-white">
                      {media.kind === 'video' ? (
                        <div className="relative">
                          <video src={media.url} className="h-32 w-full object-cover" controls />
                          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/65 px-2 py-1 text-[10px] text-white">
                            <Video className="h-3 w-3" />
                            {isZh ? '视频' : 'Video'}
                          </span>
                        </div>
                      ) : (
                        <img src={media.url} alt={media.name} className="h-32 w-full object-cover" />
                      )}
                      <p className="truncate px-2 py-1 text-xs text-black/55">{media.name}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-5 xl:grid-cols-2">
                <div className="rounded-2xl border border-black/10 bg-white p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-xl">{isZh ? 'One-page 营销页预览' : 'One-page Marketing Site Preview'}</h3>
                    <button
                      onClick={() => setShowFullscreen(true)}
                      className="inline-flex items-center gap-1 rounded-lg border border-black/10 px-2.5 py-1.5 text-xs"
                    >
                      <Maximize2 className="h-3.5 w-3.5" />
                      {isZh ? '全屏预览' : 'Fullscreen'}
                    </button>
                  </div>

                  <div className="overflow-hidden rounded-2xl border border-black/10">
                    <div
                      className="relative p-6 text-white"
                      style={{
                        background: primaryImage
                          ? `linear-gradient(110deg, rgba(22,22,22,0.78), rgba(22,22,22,0.45)), url(${primaryImage}) center/cover`
                          : 'linear-gradient(120deg, #25544a, #0f2f29)',
                      }}
                    >
                      <p className="text-xs uppercase tracking-[0.22em] text-white/70">{isZh ? '主视觉区' : 'Hero Section'}</p>
                      <h4 className="mt-2 text-2xl leading-tight">
                        {ai?.slogan || (isZh ? '精准制造，助力品牌全球增长' : 'Precision Manufacturing, Ready for Global Growth')}
                      </h4>
                    </div>
                    <div className="space-y-3 p-5">
                      <p className="text-xs uppercase tracking-[0.18em] text-black/60">{isZh ? '信任指标' : 'Trust Indicators'}</p>
                      <div className="flex flex-wrap gap-2">
                        <Tag>{leadData.step1.currentCapacity || (isZh ? '待填写产能数据' : 'Capacity data pending')}</Tag>
                        {leadData.step1.certifications.length > 0
                          ? leadData.step1.certifications.map((item) => <Tag key={item}>{item}</Tag>)
                          : <Tag>{isZh ? '暂无认证信息' : 'No certification provided'}</Tag>}
                      </div>
                      <ul className="space-y-1.5 text-sm text-black/75">
                        {(ai?.valueProps || []).map((point) => (
                          <li key={point} className="flex items-start gap-2">
                            <CheckCircle2 className="mt-0.5 h-4 w-4 text-moss" />
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                      <div>
                        <p className="text-xs uppercase tracking-[0.15em] text-black/55">{isZh ? '主推产品' : 'Key Products'}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {parsedProducts.length > 0
                            ? parsedProducts.slice(0, PRODUCT_LIST_MAX).map((item) => <Tag key={item}>{item}</Tag>)
                            : <Tag>{isZh ? '请先填写 3-5 个产品' : 'Please add 3-5 products'}</Tag>}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-black/10 bg-white p-4">
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

                  <div ref={pdfRef} className="rounded-2xl border border-black/10 bg-white p-5 text-black">
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
              </div>

              <div className="rounded-2xl border border-moss/30 bg-moss/8 p-5">
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
            </div>
          )}
      </section>

      {showFullscreen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/65 px-4" onClick={() => setShowFullscreen(false)}>
          <div className="max-h-[90vh] w-full max-w-5xl overflow-auto rounded-3xl bg-white p-6" onClick={(e) => e.stopPropagation()}>
              <div
                className="relative overflow-hidden rounded-2xl p-10 text-white"
                style={{
                  background: primaryImage
                    ? `linear-gradient(110deg, rgba(22,22,22,0.78), rgba(22,22,22,0.45)), url(${primaryImage}) center/cover`
                    : 'linear-gradient(120deg, #25544a, #0f2f29)',
                }}
              >
                <p className="text-xs uppercase tracking-[0.24em] text-white/70">{isZh ? 'One-page 全屏预览' : 'One-page Full Preview'}</p>
                <h2 className="mt-2 text-4xl">{ai?.slogan || (isZh ? '面向全球市场的现代化制造方案' : 'Export-ready manufacturing with modern positioning')}</h2>
                <p className="mt-3 max-w-2xl text-white/80">
                  {ai?.trust || (isZh ? '上传图片并完成分析后，可获得更完整的预览内容。' : 'Upload images and run strategy to enrich this preview.')}
                </p>
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-3">
                {(ai?.valueProps || []).map((item) => (
                  <div key={item} className="rounded-xl border border-black/10 p-4 text-sm">
                    {item}
                  </div>
                ))}
              </div>
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

function Field({ label, children }) {
  return (
    <label className="space-y-1.5 text-sm text-black/75">
      <span className="font-medium">{label}</span>
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
