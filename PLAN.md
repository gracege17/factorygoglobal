# B2B 工厂出海 AI 导航工具 - MVP 执行计划

## 1. 项目目标
- 用 5-step 向导帮助传统制造企业快速完成出海方向判断。
- 输出可直接用于获客的英文物料：One-page 预览 + One-pager PDF。
- 通过 CTA 引导高客单价服务转化（建站、代运营、咨询）。

## 2. MVP 范围（本阶段必须完成）
- 完成 Step 1-5 的前端流程（含进度条、回退、基础校验）。
- Step 2 使用 Mock AI 返回（市场、定位、认证建议）。
- Step 4 展示静态成本框架（关税/运费/平台费/认证费区间）。
- Step 5 支持 1-3 张图片上传预览。
- 支持 One-pager PDF 下载（含轻水印）。
- 3 个 CTA 模块可点击（先跳空链接或占位行为）。

## 3. 非目标（MVP 暂不做）
- 不做真实支付与合同流程。
- 不做复杂用户系统（仅保留本地会话态）。
- 不做多语言后台 CMS。
- 不做自动部署多页面营销站。

## 4. 数据结构与状态管理
- 顶层统一状态对象 `leadData`，保证跨步骤可追踪和复用。

```js
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
```

- 约定 Step 2 AI 输出 JSON（后续接 OpenAI/Claude 时保持同结构）：

```json
{
  "topMarkets": [{ "country": "Germany", "fitScore": 91 }],
  "differentiation": "...",
  "requiredCertifications": ["FSC", "ISO 9001"],
  "slogan": "...",
  "valueProps": ["...", "...", "..."]
}
```

## 5. 分阶段里程碑

### Milestone A: 前端流程完成
- 完成 5-step UI、进度条、回退逻辑。
- 完成 Step 2 Mock AI loading + 结果展示。
- 完成 Step 5 图片上传、预览、PDF 导出。

验收标准：
- 每一步都可进入/返回，不丢关键输入。
- 移动端可用（基础响应式）。
- 控制台无阻塞性报错。

### Milestone B: 真实 AI 接入
- 接入 OpenAI 或 Claude API。
- 将 Step 1 输入映射为统一 Prompt。
- 返回结构化 JSON 并做兜底（解析失败时回退默认建议）。

验收标准：
- 80%+ 请求在 15 秒内返回。
- JSON 字段完整可渲染。
- 失败时有用户可理解的提示。

### Milestone C: 商业化闭环增强
- CTA 接入真实 WhatsApp / 邮件 / 表单收集。
- 增加 Lead 导出（CSV 或 webhook）。
- 补充免责声明和隐私说明。

验收标准：
- CTA 点击可触达真实联系渠道。
- 每次完成 Step 5 可沉淀线索数据。

## 6. 技术实现建议
- 前端：React + Vite + Tailwind。
- PDF：`jspdf` + `html2canvas`。
- 图标：`lucide-react`。
- AI 接口：先服务端代理，再由前端调用，避免 API key 暴露。

## 7. 风险与应对
- AI 输出不稳定：
  - 应对：强制 JSON schema + 默认兜底文案。
- PDF 样式偏差：
  - 应对：固定 A4 宽度容器与字号，减少复杂布局。
- 大包体积导致首屏慢：
  - 应对：将 PDF 相关库改为按需动态加载。

## 8. 任务清单（当前建议顺序）
1. 接入真实 AI API（保留 mock 开关）。
2. 完成 CTA 的真实跳转与线索收集。
3. 增加表单必填校验与错误提示。
4. 优化打包体积（拆分 PDF 逻辑）。
5. 部署到 Vercel 并配置环境变量。

## 9. 完成定义（Definition of Done）
- 用户可在 5 分钟内完整跑通 1 次流程。
- 可以成功下载 PDF。
- 至少 1 个真实联系方式可打通。
- 页面在桌面和手机端都可正常使用。
- 关键功能有基本 README 说明（启动、配置、部署）。
