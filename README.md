# FactoryGoGlobal MVP

B2B 工厂出海 AI 智能导航与自动物料生成工具（MVP）。

## 当前能力
- 5-step 向导流程（基础信息 -> AI 战略 -> 目标确认 -> 成本框架 -> 物料生成）
- Mock/Real AI 模式切换（默认 `mock`）
- 图片上传预览（1-3 张）
- One-page 营销页预览
- One-pager PDF 下载（含水印）
- 中英文一键切换
- Mobile-first 布局

## 技术栈
- React + Vite
- Tailwind CSS
- Lucide React
- jsPDF + html2canvas（PDF 生成，按需加载）

## 本地启动
```bash
npm install
npm run dev
```

默认地址：`http://localhost:5173`

## 环境变量
在项目根目录创建 `.env`：

```bash
VITE_AI_MODE=mock
```

可选值：
- `mock`: 使用本地 mock 结果
- `real`: 调用 `/api/strategy`（需你自行提供后端代理）

## 构建
```bash
npm run build
npm run preview
```

## 后端接口约定（当 `VITE_AI_MODE=real`）
- `POST /api/strategy`
- 输入示例：

```json
{
  "companyName": "Zhejiang Eco Paper Co., Ltd",
  "productCategory": "tissue paper",
  "currentCapacity": "8000 tons/month",
  "certifications": ["ISO 9001", "FSC"]
}
```

- 输出示例：

```json
{
  "topMarkets": [{ "country": "Germany", "fitScore": 91 }],
  "differentiation": "...",
  "requiredCertifications": ["FSC", "ISO 9001"],
  "slogan": "...",
  "valueProps": ["...", "...", "..."],
  "trust": "..."
}
```
