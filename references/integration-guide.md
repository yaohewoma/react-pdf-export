# 集成指南

## 1. 安装依赖

```bash
npm install html2canvas jspdf
```

## 2. 复制文件到项目

将以下文件从 Skill 的 `references/` 目录复制到项目对应路径：

| 源文件 | 目标路径 | 说明 |
|--------|---------|------|
| `references/useExportPdf.ts` | `src/hooks/useExportPdf.ts` | 核心 Hook（406 行 TypeScript） |
| `references/ExportButton.tsx` | `src/components/ExportButton.tsx` | 导出按钮组件 |
| `references/ExportPage.tsx` | `src/components/ExportPage.tsx` | 一键集成包装组件（可选） |
| `references/full-export-page.tsx` | `src/pages/Dashboard.tsx` | 完整生产级模板（可选，复制后替换示例数据） |

> **注意：** `ExportPage.tsx` 依赖 `useExportPdf.ts` 和 `ExportButton.tsx`，请确保这三个文件都复制到项目中，且保持相对引用路径一致。

## 3. 方式 A：使用 ExportPage 一键集成（推荐）

`ExportPage` 是 `useExportPdf` + `ExportButton` 的封装组件，自动处理 ref 绑定、状态管理和导出按钮渲染。适合快速集成，一行代码即可为页面添加导出功能。

```tsx
import { ExportPage } from './components/ExportPage'

function Dashboard() {
  return (
    <ExportPage
      title="竞品分析报告"
      subtitle="2024 年度"
      fileName="report.pdf"
      scale={2}
      onExportStart={() => console.log('导出开始')}
      onExportComplete={() => console.log('导出完成')}
    >
      {/* 你的页面内容——图表、表格、文字，统统可以导出 */}
    </ExportPage>
  )
}
```

**ExportPage 完整 Props 说明：**

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `children` | `ReactNode` | 是 | — | 页面内容 |
| `title` | `string` | 否 | — | PDF 标题 |
| `subtitle` | `string` | 否 | — | PDF 副标题 |
| `fileName` | `string` | 否 | `report.pdf` | 下载文件名 |
| `buttonLabel` | `string` | 否 | `导出 PDF` | 导出按钮文字 |
| `showButton` | `boolean` | 否 | `true` | 是否显示导出按钮 |
| `buttonPosition` | `string` | 否 | `top-right` | 按钮位置：`top-right` / `top-left` / `bottom-right` / `bottom-left` |
| `onError` | `(msg: string) => void` | 否 | — | 错误回调 |
| `onExportStart` | `() => void` | 否 | — | 导出开始回调 |
| `onExportComplete` | `() => void` | 否 | — | 导出完成回调 |
| `className` | `string` | 否 | — | 额外 CSS 类名 |
| `scale` | `number` | 否 | 2 | 截图缩放倍率，值越大越清晰但性能越差 |
| `backgroundColor` | `string` | 否 | `#0f172a` | 截图背景色 |
| `margin` | `number` | 否 | 15 | 单页边距 (mm) |

## 4. 方式 B：手动集成（更灵活，可自定义布局）

```tsx
import { useExportPdf } from '../hooks/useExportPdf'
import { ExportButton } from '../components/ExportButton'

function MyPage() {
  const { containerRef, exportToPdf, exporting, cancelExport } = useExportPdf()

  return (
    <div>
      {/* 导出按钮放在容器外部或内部都可以，自带 data-export-ignore */}
      <ExportButton
        onClick={() => exportToPdf({
          title: '报告标题',
          subtitle: '副标题',
          fileName: `report_${new Date().toISOString().slice(0, 10)}.pdf`,
          scale: 2,
          onProgress: (phase, percent) => console.log(`${phase}: ${percent}%`),
        })}
        exporting={exporting}
        onCancel={cancelExport}
      />

      {/* 导出内容容器 */}
      <div ref={containerRef}>
        {/* 你的页面内容 */}
      </div>
    </div>
  )
}
```

## 5. ExportOptions 完整配置说明

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `title` | `string` | 否 | — | PDF 标题（helvetica bold 18pt） |
| `subtitle` | `string` | 否 | — | PDF 副标题（helvetica normal 11pt，灰色） |
| `fileName` | `string` | 否 | `report.pdf` | 下载文件名 |
| `onError` | `(msg: string) => void` | 否 | — | 错误回调 |
| `onProgress` | `(phase: string, percent: number) => void` | 否 | — | 进度回调，6 个阶段 0-100% |
| `scale` | `number` | 否 | 2 | 截图缩放倍率 |
| `backgroundColor` | `string` | 否 | `#0f172a` | 截图背景色 |
| `margin` | `number` | 否 | 15 | 单页边距 (mm) |
| `metaTitle` | `string` | 否 | — | PDF 元数据标题 |
| `metaAuthor` | `string` | 否 | — | PDF 元数据作者 |
| `metaCreator` | `string` | 否 | — | PDF 元数据创建者 |
| `signal` | `AbortSignal` | 否 | — | 外部取消信号，传入后可与外部取消事件联动 |

**导出进度阶段说明（通过 `onProgress` 回调）：**

| 阶段 | percent 范围 | 说明 |
|------|-------------|------|
| 准备渲染 | 0-5% | `requestAnimationFrame` + `document.fonts.ready` |
| 开始截图 | 5-15% | html2canvas 开始执行 |
| 生成图片数据 | 15-50% | `canvas.toDataURL` 生成 PNG |
| 生成 PDF | 50-65% | 创建 jsPDF 实例，写标题副标题 |
| 渲染页面 | 65-95% | 贴截图到 PDF，多页分片处理 |
| 保存文件 | 95-100% | 添加页码页脚 → `pdf.save()` |

## 6. Next.js SSR 兼容

本 Hook 依赖浏览器 API（`document`、`getComputedStyle`、`document.fonts` 等），在 Next.js 中使用时需注意：

### 6.1 使用 `'use client'` 指令

```tsx
'use client'

import { useExportPdf } from '../hooks/useExportPdf'
import { ExportButton } from '../components/ExportButton'
```

### 6.2 动态导入（避免 SSR 报错）

如果直接在页面组件中使用遇到 `document is not defined` 错误，使用 Next.js 动态导入：

```tsx
'use client'

import dynamic from 'next/dynamic'

const ExportButton = dynamic(
  () => import('../components/ExportButton').then(mod => mod.ExportButton),
  { ssr: false }
)

const ExportSection = dynamic(
  () => import('../components/ExportSection'),
  { ssr: false }
)
```

### 6.3 确保只在客户端渲染

```tsx
'use client'

import { useEffect, useState } from 'react'

function MyPage() {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  if (!isClient) return <div>Loading...</div>

  return (
    <ExportPage title="报告">
      {/* 内容 */}
    </ExportPage>
  )
}
```

## 7. 注意事项

- 容器需要 `ref={containerRef}`，这就是导出区域
- 导出按钮等不需要出现在 PDF 中的元素加 `data-export-ignore="true"` 属性
- `backgroundColor` 默认为 `#0f172a`（深色 Dashboard），浅色主题页面改为 `#ffffff`
- 如果容器很大，导出可能有短暂延迟，`exporting` 状态用于显示加载动画
- 导出按钮自动添加 `type="button"`，防止在 form 中意外提交
- 支持通过 `onProgress` 回调获取导出进度（6 阶段 0-100%）
- 通过 `metaTitle`/`metaAuthor`/`metaCreator` 设置 PDF 文件元数据
- 每次调用 `exportToPdf` 会自动取消上一个导出任务（通过 AbortController）
- 所有 DOM 操作在 `onclone` 回调中完成，不影响 React 管理的真实 DOM