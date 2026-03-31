import { useMemo, useRef, useState } from 'react'
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
} from 'lucide-react'
import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas'
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

const getCostData = (market = '') => {
  const key = market.trim().toLowerCase()
  return costReference[key] || costReference.default
}

function App() {
  const [step, setStep] = useState(1)
  const [analyzing, setAnalyzing] = useState(false)
  const [formError, setFormError] = useState('')
  const [analysisError, setAnalysisError] = useState('')
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
      uploadedImages: [],
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

    if (!leadData.step1.companyName.trim() || !leadData.step1.productCategory.trim()) {
      setFormError(isZh ? '请先填写公司名称和主营品类。' : 'Please enter company name and product category to continue.')
      return
    }

    setFormError('')
    setAnalysisError('')
    setAnalyzing(true)

    try {
      const aiPositioning = await fetchAIStrategy(leadData.step1)
      setLeadData((prev) => ({
        ...prev,
        step2: {
          aiPositioning,
        },
      }))
      setStep(2)
    } catch {
      const fallback = createMockAI(leadData.step1)
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

    setLeadData((prev) => ({
      ...prev,
      step3: {
        targetMarket: market,
      },
    }))
    setStep(4)
  }

  const handleUpload = (event) => {
    const files = Array.from(event.target.files || [])
      .filter((file) => file.type.startsWith('image/'))
      .slice(0, 3)

    const previews = files.map((file) => ({
      name: file.name,
      file,
      url: URL.createObjectURL(file),
    }))

    setLeadData((prev) => ({
      ...prev,
      step5: {
        uploadedImages: previews,
      },
    }))
  }

  const downloadPdf = async () => {
    if (!pdfRef.current) {
      return
    }

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
  }

  const ai = leadData.step2.aiPositioning
  const primaryImage = leadData.step5.uploadedImages[0]?.url

  return (
    <main className="mx-auto max-w-6xl px-4 pb-14 pt-8 text-ink md:px-8">
      <section className="mb-8 rounded-3xl border border-black/5 bg-white/80 p-5 shadow-soft backdrop-blur md:p-8">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-moss/70">FactoryGoGlobal AI</p>
            <h1 className="mt-1 text-3xl md:text-4xl">{isZh ? 'B2B 工厂出海智能导航' : 'B2B Export Readiness Navigator'}</h1>
            <p className="mt-2 max-w-2xl text-sm text-black/65 md:text-base">
              {isZh
                ? '快速评估出海可行性，找到差异化定位，并生成可直接转化的营销物料。'
                : 'Assess go-global potential, lock a differentiated strategy, and generate conversion-ready materials in minutes.'}
            </p>
          </div>
          <div className="flex items-center gap-2">
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

        <div className="mt-4 grid gap-2 text-xs text-black/55 md:grid-cols-5">
          {stepLabels.map((item, index) => (
            <div key={item} className={`rounded-lg px-3 py-2 ${step === index + 1 ? 'bg-moss/10 text-moss' : 'bg-black/5'}`}>
              {index + 1}. {item}
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-black/5 bg-white/85 p-5 shadow-soft md:p-8">
          {step === 1 && (
            <div className="space-y-5">
              <h2 className="text-2xl">Step 1. Basic Information</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Company Name">
                  <input
                    className="w-full rounded-xl border border-black/15 bg-white px-4 py-2.5 outline-none ring-moss/30 transition focus:ring"
                    value={leadData.step1.companyName}
                    onChange={(e) => updateStep1('companyName', e.target.value)}
                    placeholder="e.g. Zhejiang Eco Paper Co., Ltd"
                  />
                </Field>
                <Field label="Main Product Category">
                  <input
                    className="w-full rounded-xl border border-black/15 bg-white px-4 py-2.5 outline-none ring-moss/30 transition focus:ring"
                    value={leadData.step1.productCategory}
                    onChange={(e) => updateStep1('productCategory', e.target.value)}
                    placeholder="e.g. Tissue paper / Packaging"
                  />
                </Field>
              </div>

              <Field label="Current Capacity / Scale">
                <input
                  className="w-full rounded-xl border border-black/15 bg-white px-4 py-2.5 outline-none ring-moss/30 transition focus:ring"
                  value={leadData.step1.currentCapacity}
                  onChange={(e) => updateStep1('currentCapacity', e.target.value)}
                  placeholder="e.g. 8,000 tons/month, 5 production lines"
                />
              </Field>

              <Field label="Existing Certifications">
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
                className="inline-flex items-center gap-2 rounded-xl bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-55"
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
                        <p className="text-xs text-black/60">Market fit score</p>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-2xl border border-moss/20 bg-moss/5 p-5">
                    <p className="text-xs uppercase tracking-[0.2em] text-moss/70">Core Differentiation</p>
                    <p className="mt-2 text-base leading-relaxed">{ai.differentiation}</p>
                  </div>

                  <div className="rounded-2xl border border-black/10 bg-white p-5">
                    <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
                      <ShieldCheck className="h-4 w-4 text-clay" />
                      Required Certifications
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
                  className="inline-flex items-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-white"
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
                  <button
                    type="button"
                    onClick={() => setSelectedPath('accept')}
                    className={`w-full rounded-2xl border p-4 text-left transition ${
                      selectedPath === 'accept' ? 'border-moss bg-moss/5' : 'border-black/10 bg-white'
                    }`}
                  >
                    <p className="font-semibold">{isZh ? '选项 A：接受 AI 推荐' : 'Option A: Accept AI Recommendation'}</p>
                    <p className="mt-1 text-sm text-black/60">
                      Use {ai.topMarkets[0].country} as primary launch market and continue.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedPath('manual')}
                    className={`w-full rounded-2xl border p-4 text-left transition ${
                      selectedPath === 'manual' ? 'border-moss bg-moss/5' : 'border-black/10 bg-white'
                    }`}
                  >
                    <p className="font-semibold">{isZh ? '选项 B：手动输入目标国家' : 'Option B: Enter Your Own Market'}</p>
                    <input
                      value={leadData.step3.targetMarket}
                      onChange={(e) =>
                        setLeadData((prev) => ({
                          ...prev,
                          step3: { targetMarket: e.target.value },
                        }))
                      }
                      placeholder="e.g. Canada"
                      className="mt-3 w-full rounded-xl border border-black/15 px-3 py-2 text-sm outline-none ring-moss/30 focus:ring"
                    />
                  </button>
                </div>

                <aside className="rounded-2xl border border-clay/30 bg-clay/5 p-5">
                  <p className="text-xs uppercase tracking-[0.18em] text-clay/80">CTA 1</p>
                  <h3 className="mt-2 text-xl">
                    {isZh ? '需要针对目标国家做深度准入调研吗？' : 'Need deep market compliance research?'}
                  </h3>
                  <p className="mt-2 text-sm text-black/65">
                    Get country-specific entry requirements and competitor mapping from our expert team.
                  </p>
                  <a
                    href="mailto:hello@factorygoglobal.com?subject=Need%20Deep%20Market%20Research"
                    className="mt-4 inline-block rounded-xl bg-clay px-4 py-2 text-sm font-semibold text-white"
                  >
                    {isZh ? '联系专家团队' : 'Contact Expert Team'}
                  </a>
                </aside>
              </div>

              <div className="flex justify-between">
                <button
                  className="inline-flex items-center gap-2 rounded-xl border border-black/15 px-4 py-2.5 text-sm"
                  onClick={() => setStep(2)}
                >
                  <ArrowLeft className="h-4 w-4" />
                  {isZh ? '返回' : 'Back'}
                </button>
                <button
                  className="inline-flex items-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-white"
                  onClick={handleStep3Continue}
                  disabled={selectedPath === 'manual' && !leadData.step3.targetMarket}
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
                Estimated for <span className="font-semibold">{currentMarket || 'your selected market'}</span>. MVP uses rough ranges.
              </p>

              <div className="grid gap-4 md:grid-cols-2">
                <InfoCard label="Estimated Tariff Range" value={costData.tariff} />
                <InfoCard label="Sea/Air Logistics Level" value={costData.logistics} />
                <InfoCard label="Mainstream Platform Entry Cost" value={costData.platform} />
                <InfoCard label="Certification Processing Cost" value={costData.certification} />
              </div>

              <div className="rounded-2xl border border-clay/25 bg-clay/5 p-5">
                <p className="text-sm text-black/75">
                  CTA 2: Specific tax rates vary significantly by exact SKU and HS code.
                </p>
                <a
                  href="mailto:hello@factorygoglobal.com?subject=Need%20Accurate%20Export%20Cost%20Quote"
                  className="mt-3 inline-block rounded-xl bg-clay px-4 py-2 text-sm font-semibold text-white"
                >
                  {isZh ? '获取精准报价' : 'Get Accurate Cost Quote'}
                </a>
              </div>

              <div className="flex justify-between">
                <button
                  className="inline-flex items-center gap-2 rounded-xl border border-black/15 px-4 py-2.5 text-sm"
                  onClick={() => setStep(3)}
                >
                  <ArrowLeft className="h-4 w-4" />
                  {isZh ? '返回' : 'Back'}
                </button>
                <button
                  className="inline-flex items-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-white"
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

              <div className="rounded-2xl border border-black/10 bg-sand p-4">
                <label className="mb-2 block text-sm font-medium">Upload 1-3 high-resolution product/factory images</label>
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-black/15 bg-white px-4 py-2.5 text-sm font-semibold">
                  <Upload className="h-4 w-4" />
                  Select Images
                  <input type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} />
                </label>
                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  {leadData.step5.uploadedImages.map((image) => (
                    <div key={image.name} className="overflow-hidden rounded-xl border border-black/10 bg-white">
                      <img src={image.url} alt={image.name} className="h-32 w-full object-cover" />
                      <p className="truncate px-2 py-1 text-xs text-black/55">{image.name}</p>
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
                      <p className="text-xs uppercase tracking-[0.22em] text-white/70">Hero Section</p>
                      <h4 className="mt-2 text-2xl leading-tight">{ai?.slogan || 'Precision Manufacturing, Ready for Global Growth'}</h4>
                    </div>
                    <div className="space-y-3 p-5">
                      <p className="text-xs uppercase tracking-[0.18em] text-black/60">Trust Indicators</p>
                      <div className="flex flex-wrap gap-2">
                        <Tag>{leadData.step1.currentCapacity || 'Capacity data pending'}</Tag>
                        {leadData.step1.certifications.length > 0
                          ? leadData.step1.certifications.map((item) => <Tag key={item}>{item}</Tag>)
                          : <Tag>No certification provided</Tag>}
                      </div>
                      <ul className="space-y-1.5 text-sm text-black/75">
                        {(ai?.valueProps || []).map((point) => (
                          <li key={point} className="flex items-start gap-2">
                            <CheckCircle2 className="mt-0.5 h-4 w-4 text-moss" />
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-black/10 bg-white p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-xl">{isZh ? 'One-pager PDF 预览' : 'One-pager PDF Preview'}</h3>
                    <button
                      onClick={downloadPdf}
                      className="inline-flex items-center gap-1 rounded-lg bg-ink px-3 py-1.5 text-xs font-semibold text-white"
                    >
                      <Download className="h-3.5 w-3.5" />
                      {isZh ? '下载 PDF' : 'Download PDF'}
                    </button>
                  </div>

                  <div ref={pdfRef} className="rounded-2xl border border-black/10 bg-white p-5 text-black">
                    <p className="text-xs uppercase tracking-[0.2em] text-black/55">Company One-pager</p>
                    <h4 className="mt-2 text-2xl">{leadData.step1.companyName || 'Your Company Name'}</h4>
                    <p className="mt-2 text-sm text-black/70">{ai?.differentiation || 'AI strategy summary will appear here.'}</p>

                    <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                      <MiniMetric label="MOQ" value="1 x 20ft container" />
                      <MiniMetric label="Lead Time" value="25-35 days" />
                      <MiniMetric label="Primary Market" value={currentMarket || 'TBD'} />
                      <MiniMetric label="Factory Scale" value={leadData.step1.currentCapacity || 'TBD'} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-moss/30 bg-moss/8 p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-moss/80">Final CTA</p>
                <h3 className="mt-2 text-2xl">
                  {isZh ? '需要高级动效独立站与 Amazon 开店支持？' : 'Need a premium export website + Amazon launch support?'}
                </h3>
                <p className="mt-2 text-sm text-black/70">
                  Get a high-conversion site with advanced motion, buyer outreach workflow, and overseas demand generation support.
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <a
                    href="https://wa.me/0000000000?text=Hi%20FactoryGoGlobal%2C%20I%20want%20to%20discuss%20a%20premium%20export%20site."
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-xl bg-moss px-4 py-2 text-sm font-semibold text-white"
                  >
                    {isZh ? 'WhatsApp 联系' : 'Connect on WhatsApp'}
                  </a>
                  <a
                    href="mailto:hello@factorygoglobal.com?subject=Premium%20Export%20Service%20Inquiry"
                    className="rounded-xl border border-moss px-4 py-2 text-sm font-semibold text-moss"
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
                <p className="text-xs uppercase tracking-[0.24em] text-white/70">One-page Full Preview</p>
                <h2 className="mt-2 text-4xl">{ai?.slogan || 'Export-ready manufacturing with modern positioning'}</h2>
                <p className="mt-3 max-w-2xl text-white/80">{ai?.trust || 'Upload images and run strategy to enrich this preview.'}</p>
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
