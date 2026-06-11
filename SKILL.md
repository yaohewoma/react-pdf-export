---
name: "react-pdf-export"
version: "1.0.0"
description: "Adds PDF export to React apps with SVG rendering, TailwindCSS v4 oklch compatibility, and React DOM safety. Invoke when user needs to export pages with charts to PDF."
---

# React PDF Export Hook

> **执行前必做：** 生成任何导出代码前，必须先阅读 [`references/useExportPdf.ts`](references/useExportPdf.ts) 获取完整 Hook 实现。
> **核心原则：** 绝不在 React 管理的 DOM 上做 replaceChild，所有操作在 html2canvas 的 onclone 回调中完成。

## 0. 流水线位置

```
数据采集（stealth-scraper）→ AI 评分（ai-batch-processor）→ 规则评分（rule-scoring-engine）
    → 数据审计（data-audit-toolkit）→ Dashboard 渲染 → react-pdf-export → PDF 文件
                                                    ↑ 本 Skill [独立，消费后端 JSON 数据]
```

- **上游依赖**：无代码依赖，仅需要后端 Pipeline 产出的 JSON 数据用于页面渲染
- **下游 Skill**：无，PDF 导出是管线最后一环
- **输入**：React 组件渲染的页面 DOM（包含 Recharts/ECharts SVG 图表）
- **输出**：A4 格式 PDF 文件（标题 + 副标题 + 页面截图 + 页码页脚），浏览器自动下载
- **总索引**：[SKILLS-INDEX.md](../SKILLS-INDEX.md)

## 1. 何时使用本 Skill

### 1.1 触发条件

以下场景应使用本 skill：
- 需要将 React 页面（含 Recharts/ECharts 图表）导出为 PDF
- 项目使用 TailwindCSS v4（oklch 色彩空间，html2canvas 不支持）
- 页面中有 SVG 图表需要渲染到 PDF
- 导出按钮等 UI 元素不应出现在 PDF 中
- 长页面需要自动分页
- 用户提到"导出PDF"、"下载报告"、"打印页面" 等关键词

以下场景不应使用本 skill：
- 纯文本页面，无图表 —— 用 `window.print()` 更简单
- 项目中已有 Puppeteer 服务端渲染 —— 服务端方案更稳定
- 不需要导出 PDF 格式 —— 如果是导出图片，直接用 html2canvas + download
- 服务端渲染环境（如 Next.js SSR 无 `'use client'` 的 Server Component）—— 本 Hook 依赖浏览器 API

### 1.2 前置约束

1. 先读 [`references/useExportPdf.ts`](references/useExportPdf.ts)，理解完整 Hook 架构（406 行 TypeScript）
2. 安装依赖：`npm install html2canvas jspdf`
3. 页面容器必须有 `ref={containerRef}`，这就是导出区域
4. 导出按钮等 UI 元素加 `data-export-ignore="true"` 属性
5. **绝不在 React 组件中直接操作 DOM**，所有 DOM 操作在 `onclone` 回调中完成
6. 完整可运行模板参考 [`references/full-export-page.tsx`](references/full-export-page.tsx)
7. 集成步骤参考 [`references/integration-guide.md`](references/integration-guide.md)

## 2. 模块与命令导航

### 2.1 模块地图

| 大模块 | 解决什么问题 | 参考文件 |
|------|------------|---------|
| 核心 Hook | 完整的 useExportPdf 实现，导出流程编排 | [`references/useExportPdf.ts`](references/useExportPdf.ts) |
| 完整模板 | 一键复制即可运行的生产级出口页面 | [`references/full-export-page.tsx`](references/full-export-page.tsx) |
| 类型定义 | 所有 TypeScript 类型定义，可直接复制到项目 | [`references/types.d.ts`](references/types.d.ts) |
| 导出按钮 | ExportButton 组件，内置 loading 动画和取消功能 | [`references/ExportButton.tsx`](references/ExportButton.tsx) |
| 页面包装组件 | 一键集成的 ExportPage 包装器 | [`references/ExportPage.tsx`](references/ExportPage.tsx) |
| 数据契约 | 输入/输出格式定义，技术约束、浏览器兼容矩阵、Bundle 体积 | [`references/data-contract.md`](references/data-contract.md) |
| 集成指南 | 页面中如何接入 + Next.js SSR 兼容 + 配置说明 | [`references/integration-guide.md`](references/integration-guide.md) |
| 性能调优 | scale 调优、DOM 瘦身、SVG 优化、分批导出、内存管理 | [`references/performance-optimization.md`](references/performance-optimization.md) |
| 水印功能 | 文字/图片水印、重复模式、多位置支持 | [`references/watermark.md`](references/watermark.md) |
| PDF 模板 | 页眉页脚、Logo、预设模板、自定义布局 | [`references/pdf-templates.md`](references/pdf-templates.md) |
| 故障排查 | 导出失败、样式丢失、性能问题的解决方案 | [`references/troubleshooting.md`](references/troubleshooting.md) |

### 2.2 核心 Hook

**必读 reference**：[`references/useExportPdf.ts`](references/useExportPdf.ts)

完整的 TypeScript Hook（406 行），返回 `{ containerRef, exportToPdf, exporting, cancelExport }`。

| 返回值 | 类型 | 说明 |
|--------|------|------|
| `containerRef` | `RefObject<HTMLDivElement>` | 绑定到导出区域容器 |
| `exportToPdf` | `(options?: ExportOptions) => Promise<void>` | 触发导出，每次调用自动取消上一个任务 |
| `exporting` | `boolean` | 导出中状态，用于禁用按钮和显示加载动画 |
| `cancelExport` | `() => void` | 取消当前导出（通过 AbortController） |

**ExportOptions 参数**：

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `title` | `string` | 否 | — | PDF 标题（helvetica bold 18pt） |
| `subtitle` | `string` | 否 | — | PDF 副标题（helvetica 11pt，灰色） |
| `fileName` | `string` | 否 | `report.pdf` | 下载文件名 |
| `onError` | `(msg: string) => void` | 否 | — | 错误回调 |
| `onProgress` | `(phase: string, percent: number) => void` | 否 | — | 进度回调，6 个阶段 0-100% |
| `scale` | `number` | 否 | 2 | 截图缩放倍率，越大越清晰但性能越差 |
| `backgroundColor` | `string` | 否 | `#0f172a` | 截图背景色 |
| `margin` | `number` | 否 | 15 | 单页边距 (mm) |
| `metaTitle` | `string` | 否 | — | PDF 元数据标题 |
| `metaAuthor` | `string` | 否 | — | PDF 元数据作者 |
| `metaCreator` | `string` | 否 | — | PDF 元数据创建者 |
| `signal` | `AbortSignal` | 否 | — | 外部取消信号，传入后可与外部取消联动 |

**路由提醒**：优先使用 `onProgress` 回调为用户展示导出进度条，提升体验。

### 2.3 完整模板

**必读 reference**：[`references/full-export-page.tsx`](references/full-export-page.tsx)

一个完整的、生产级 Dashboard 导出页面模板，包含：
- 统计卡片（分析项目数、S 级占比等）
- 评分分布柱状图（SVG 图表自动转换）
- 项目详情数据表
- 导出按钮（含 loading 动画 + 取消功能）
- 导出进度条 UI

**路由提醒**：复制此文件到项目中，替换示例数据即可运行。适合快速验证或作为项目起点。

### 2.4 导出按钮组件

**必读 reference**：[`references/ExportButton.tsx`](references/ExportButton.tsx)

| Props | 类型 | 必填 | 默认值 | 说明 |
|-------|------|------|--------|------|
| `onClick` | `() => void` | 是 | — | 点击触发导出 |
| `exporting` | `boolean` | 是 | — | 导出中状态 |
| `onCancel` | `() => void` | 否 | — | 取消导出回调 |
| `label` | `string` | 否 | `导出 PDF` | 按钮文字 |
| `exportingLabel` | `string` | 否 | `导出中...` | 导出中按钮文字 |
| `hasError` | `boolean` | 否 | `false` | 是否处于错误状态（按钮变红） |
| `className` | `string` | 否 | — | 自定义 CSS 类名 |
| `aria-label` | `string` | 否 | 自动生成 | 无障碍标签 |

**路由提醒**：按钮自带 `type="button"`（防止 form 提交）+ `data-export-ignore="true"`（PDF 中自动隐藏）+ `aria-busy` 无障碍状态。

### 2.5 页面包装组件

**必读 reference**：[`references/ExportPage.tsx`](references/ExportPage.tsx)

| Props | 类型 | 必填 | 默认值 | 说明 |
|-------|------|------|--------|------|
| `children` | `ReactNode` | 是 | — | 页面内容 |
| `title` | `string` | 否 | — | PDF 标题 |
| `subtitle` | `string` | 否 | — | PDF 副标题 |
| `fileName` | `string` | 否 | `report.pdf` | 下载文件名 |
| `buttonLabel` | `string` | 否 | `导出 PDF` | 按钮文字 |
| `showButton` | `boolean` | 否 | `true` | 是否显示导出按钮 |
| `buttonPosition` | `string` | 否 | `top-right` | 按钮位置：`top-right` / `top-left` / `bottom-right` / `bottom-left` |
| `onError` | `(msg: string) => void` | 否 | — | 错误回调 |
| `onExportStart` | `() => void` | 否 | — | 导出开始回调 |
| `onExportComplete` | `() => void` | 否 | — | 导出完成回调 |
| `className` | `string` | 否 | — | 额外 CSS 类名 |
| `scale` | `number` | 否 | 2 | 截图缩放倍率 |
| `backgroundColor` | `string` | 否 | `#0f172a` | 截图背景色 |
| `margin` | `number` | 否 | 15 | 单页边距 (mm) |

**路由提醒**：`ExportPage` 是 `useExportPdf` + `ExportButton` 的一键封装，自动处理 ref 绑定、状态管理和生命周期回调。推荐优先使用，除非需要完全自定义按钮布局。

### 2.6 类型定义

**必读 reference**：[`references/types.d.ts`](references/types.d.ts)

共享 TypeScript 类型定义文件，包含所有导出接口和类型。可直接复制到项目中替代手动输入类型。

| 类型 | 说明 | 字段数 |
|------|------|--------|
| `ExportOptions` | 导出配置选项 | 11 个可选字段 |
| `UseExportPdfReturn` | Hook 返回值类型 | 4 个字段 |
| `ExportButtonProps` | 按钮组件 Props | 7 个字段 |
| `ExportPageProps` | 包装组件 Props | 15 个字段 |
| `WatermarkConfig` | 水印配置 | 18 个字段 |
| `PDFTemplateConfig` | PDF 模板配置 | 嵌套结构 |
| `AnalysisReport` | 后端数据 Schema | 3 个顶层字段 |
| `AnalysisProject` | 项目分析结果 | 7 个字段 |

**路由提醒**：如果项目中直接使用 `useExportPdf.ts`，无需额外复制本文件——类型已内联在 Hook 中。本文件是为需要独立类型引用的场景提供的便利文件。

### 2.7 数据契约

**必读 reference**：[`references/data-contract.md`](references/data-contract.md)

定义本 Skill 的输入输出规范和技术约束。

| 维度 | 内容 |
|------|------|
| 输入格式 | React 组件渲染的页面 DOM，数据来自后端 JSON |
| 输出格式 | A4 PDF（标题 + 副标题 + 截图 + 页码） |
| 浏览器兼容 | 需支持 `html2canvas` + `jsPDF`（Chrome/Firefox/Edge） |
| 颜色约束 | 所有 `oklch()` 颜色必须在 `onclone` 中转为 RGB |
| 图表约束 | SVG 图表（Recharts/ECharts）必须预转为 Image |

**路由提醒**：如果后端产出非 JSON 格式数据，需在前端组件中统一转换后再渲染。

### 2.8 水印功能

**必读 reference**：[`references/watermark.md`](references/watermark.md)

支持文字水印和图片水印。

| 水印类型 | 配置要点 | 适用场景 |
|---------|---------|---------|
| 文字水印 | 文本、字号、颜色、透明度、旋转角度 | 内部文件标注"机密"、"草案"等 |
| 图片水印 | 图片 URL、尺寸、透明度 | 企业 Logo 水印、版权标记 |
| 重复模式 | `position: 'repeat'` + spacing | 全页覆盖防截图 |
| 固定位置 | `position: 'top-right'` / `'center'` 等 | 角标水印 |

**路由提醒**：水印功能通过 `addWatermarkToPdf(pdf, config)` 独立函数调用，不侵入核心导出流程。

### 2.9 PDF 模板

**必读 reference**：[`references/pdf-templates.md`](references/pdf-templates.md)

提供可复用的 PDF 模板系统，支持自定义页眉、页脚、Logo 和布局。

| 模板 | 特点 | 适用场景 |
|------|------|---------|
| 企业报告模板 | Logo + 标题页眉 + 版权页脚 | 对外交付客户 |
| 简洁模板 | 仅页码页脚，无页眉 | 内部使用、快速导出 |
| 自定义模板 | 通过 `PDFTemplateConfig` 完全自定义 | 品牌化报告 |

**路由提醒**：模板系统（`PDFTemplateManager`）与核心 Hook 解耦，可独立使用，也可与 `useExportPdf` 配合。

### 2.10 性能调优

**必读 reference**：[`references/performance-optimization.md`](references/performance-optimization.md)

面向页面内容多（>50 DOM 节点、含多个图表）或导出文件过大（>5 MB）的调优指南。

| 策略 | 适用场景 | 效果 |
|------|---------|------|
| 降低 scale | PDF 文件过大、移动端 | scale=1 文件大小约为 scale=2 的 1/4 |
| DOM 瘦身 | 页面 DOM 节点 > 100 | 用 `data-export-ignore` 隐藏装饰元素 |
| 减小图表尺寸 | 含 3+ SVG 图表 | 减少 SVG 序列化和 Image 加载开销 |
| 分批导出 | 超大页面（>5 页 A4） | 避免内存峰值，分段处理更稳定 |
| 动态导入 | 非首屏导出组件 | 减少首屏 Bundle 体积约 60 KB |

**路由提醒**：默认 `scale: 2` 适合大多数场景。如果导出时 UI 冻结超过 3 秒，优先检查 DOM 节点数并添加 `data-export-ignore`。

## 3. 集成导出功能的标准流程

```
1. 安装依赖
   └─ npm install html2canvas jspdf

2. 复制文件到项目
   ├─ useExportPdf.ts → src/hooks/useExportPdf.ts
   ├─ ExportButton.tsx → src/components/ExportButton.tsx
   └─ ExportPage.tsx   → src/components/ExportPage.tsx（可选）

3. 方案选择
   ├─ 快速集成：用 <ExportPage> 包装页面（一行代码）
   └─ 灵活集成：用 useExportPdf() + <ExportButton> 手动组装

4. 页面接入
   ├─ 方案 A：<ExportPage title="报告" fileName="report.pdf">...</ExportPage>
   └─ 方案 B：const { containerRef, exportToPdf } = useExportPdf()
              <div ref={containerRef}>内容</div>
              <ExportButton onClick={() => exportToPdf({...})} exporting={exporting} />

5. 测试验证
   └─ npm run dev → 点击导出按钮 → 检查 PDF 内容
```

内部执行流程：

```
用户点击导出
  → setExporting(true)（UI 反馈：按钮变灰 + loading 动画）
  → await document.fonts.ready（等待字体加载）
  → html2canvas(container, { foreignObjectRendering: false, scale: 2 })
  → onclone 回调（在克隆文档中操作，不碰 React DOM）：
      1. 移除所有 <style> 标签（消除 oklch 颜色定义）
      2. 分批复制 70 个 computed styles 属性到克隆元素（RGB 回写）
      3. 隐藏 data-export-ignore 元素
      4. SVG → Data URL → <img> 替换（XMLSerializer 序列化）
  → canvas.toDataURL('image/png')
  → jsPDF 生成 PDF：
      1. 写标题（helvetica bold 18pt）
      2. 写副标题（helvetica normal 11pt，灰色）
      3. 贴截图（单页直接贴，多页按 A4 高度分片渲染）
      4. 页码页脚（Page n/N，每页居中）
  → pdf.save(fileName)（浏览器自动下载）
  → setExporting(false)
```

## 4. 常见错误

| 错误 | 后果 | 正确做法 |
|------|------|---------|
| 在 React 组件中直接操作 DOM 节点 | `NotFoundError: Failed to execute 'removeChild'`，页面崩溃 | 所有 DOM 操作在 html2canvas 的 `onclone` 回调中完成，操作的是克隆文档 |
| TailwindCSS v4 默认 oklch 色彩空间 | `Attempting to parse an unsupported color function "oklch"`，导出失败 | Hook 已内置：移除 `<style>` 标签 + `getComputedStyle` 回写 RGB 行内样式 |
| 页面中有 Recharts/ECharts SVG 图表 | 导出后图表区域为空白 | Hook 已内置：`onclone` 中 SVG → XMLSerializer → Data URL → `<img>` |
| 导出前未等待字体加载 | 导出后中文字体显示为方框或默认字体 | Hook 已内置：`await document.fonts.ready` 确保字体就绪 |
| 页面中有跨域外部图片 | `Canvas tainted by cross-origin content`，图片区域空白 | 图片标签加 `crossOrigin="anonymous"` + 服务端配置 CORS 头 |
| 将 `foreignObjectRendering` 设为 `true` | 复制 300+ 属性，导出时 UI 冻结数秒 | 使用默认值 `false`，仅复制 70 个关键属性 |
| 在 Next.js Server Component 中直接使用 Hook | `document is not defined`，SSR 报错 | 添加 `'use client'` 指令 + `dynamic(ssr: false)` 动态导入 |
| 忘记在页面容器上绑定 ref | 点击导出无反应，`containerRef.current` 为 null | 确保导出区域的根元素绑定了 `ref={containerRef}` |
| 多次快速点击导出按钮 | 多个导出任务并发执行 | Hook 已内置：每次调用自动通过 AbortController 取消上一个任务 |
| 使用 ECharts SVG 渲染模式 | 图表区域空白，同 Recharts 问题 | 改用 ECharts 默认 Canvas 渲染器（`renderer: 'canvas'`），避免 SVG 转换 |
| CSS-in-JS（styled-components/Emotion）样式注入 | 导出后样式不完整，自定义 CSS 丢失 | 同时使用 Tailwind 类名作为降级，或保留 `data-styled` 属性标签 |

## 5. 参数调优速查

| 参数 | 默认值 | 说明 | 何时调参 |
|------|--------|------|---------|
| `scale` | 2 | html2canvas 缩放倍率 | PDF 文件过大时降至 1；需要超高清时升至 3 |
| `foreignObjectRendering` | `false` | 是否使用 foreignObject 渲染 | 图表非常简单时可设为 `true` 略微提速 |
| `backgroundColor` | `#0f172a` | 截图背景色（深色 Dashboard） | 浅色主题页面改为 `#ffffff` |
| `margin` | 15 | PDF 单页边距 (mm) | 紧凑布局可降至 10；宽松布局升至 20 |
| ESSENTIAL_PROPS 数量 | 70 | computed styles 复制属性数 | 样式极简时降至 40（提速）；样式复杂时增至 100 |
| `batchSize` | 40 | computed styles 分批处理大小 | 页面超大 (>500 DOM 节点) 时增大到 80 |
| `html2canvas timeout` | 30000ms | 截图超时阈值 | 超大页面（>1000 DOM 节点）时增大到 60000 |
| `title` 字号 | 18pt | PDF 标题字体大小 | 标题较长 (>30 字符) 时减至 14pt |
| `subtitle` 字号 | 11pt | PDF 副标题字体大小 | 副标题需突出时增至 13pt |
| `fileName` | `report.pdf` | 下载文件名 | 每次导出时通过 `exportToPdf({ fileName })` 覆盖 |

## 6. Quick Start

```bash
# 1. 安装依赖
npm install html2canvas jspdf
```

```bash
# 2. 复制文件到项目
#    useExportPdf.ts     → src/hooks/useExportPdf.ts
#    ExportButton.tsx    → src/components/ExportButton.tsx
#    ExportPage.tsx      → src/components/ExportPage.tsx（推荐）
#    full-export-page.tsx → src/pages/Dashboard.tsx（完整模板，复制后改数据）
```

```tsx
// 3. 方式 A：ExportPage 一键集成（推荐）
import { ExportPage } from "./components/ExportPage";

function Dashboard() {
  return (
    <ExportPage title="竞品分析报告" fileName="report.pdf" subtitle="2024 Q4">
      {/* 你的页面内容——图表、表格、文字，统统可以导出 */}
    </ExportPage>
  );
}
```

```tsx
// 4. 方式 B：手动集成（完全自定义布局）
import { useExportPdf } from "./hooks/useExportPdf";
import { ExportButton } from "./components/ExportButton";

function Dashboard() {
  const { containerRef, exportToPdf, exporting, cancelExport } = useExportPdf();

  return (
    <div>
      <ExportButton
        onClick={() => exportToPdf({ title: "报告", fileName: "report.pdf" })}
        exporting={exporting}
        onCancel={cancelExport}
      />
      <div ref={containerRef}>{/* 你的页面内容 */}</div>
    </div>
  );
}
```

```bash
# 5. 测试导出
npm run dev
# 打开浏览器，点击"导出 PDF"按钮验证
```

## 依赖

| 包名 | 版本 | 用途 | 说明 |
|------|------|------|------|
| `html2canvas` | ^1.4.1 | 页面截图 | 将 DOM 渲染为 Canvas，Gzip ~18 KB |
| `jspdf` | ^2.5.1 | PDF 生成 | A4 排版 + 分页 + 元数据，Gzip ~38 KB |
| React | ^18.0.0 | UI 框架 | Hook 和组件运行环境 |
| TypeScript | ^5.0.0 | 类型系统 | `.tsx` / `.ts` 文件编译 |
| Node.js | ^18.0.0 | 开发环境 | 开发/构建