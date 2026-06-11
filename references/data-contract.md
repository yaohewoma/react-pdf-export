# 数据契约：React PDF Export

## 1. 概述

本 Skill 为纯前端 PDF 导出工具，不依赖后端服务。输入为 React 组件渲染的 DOM 树，输出为 A4 格式 PDF 文件。核心依赖：`html2canvas`（截图）+ `jsPDF`（PDF 生成）。

## 2. 输入

### 2.1 页面输入（DOM）

本 Skill 消费 **React 组件渲染后的 DOM 树**（通过 `containerRef` 绑定），页面的实际数据来自后端 Pipeline 产出的 JSON 文件。

### 2.2 后端数据 Schema（竞品分析系统标准格式）

```typescript
/** 竞品分析系统产出的项目分析结果 */
interface AnalysisReport {
  /** 报告基本信息 */
  meta: {
    title: string;                      // 报告标题，如 "竞品分析报告"
    subtitle?: string;                  // 副标题
    generatedAt: string;                // ISO 8601 生成时间
    totalProjects: number;              // 总分析项目数
  };

  /** 统计摘要 */
  summary: {
    avgScore: number;                   // 平均评分 (0-10)
    sGradeCount: number;                // S 级项目数
    aGradeCount: number;                // A 级项目数
    bGradeCount: number;                // B 级项目数
    cGradeCount: number;                // C 级项目数
    dimensionScores: Record<string, number>; // 各维度平均分
  };

  /** 项目明细列表 */
  projects: Array<{
    id: string;                         // 唯一标识
    name: string;                       // 项目名称
    url?: string;                       // 项目主页 URL
    score: number;                      // 综合评分 (0-10)
    grade: 'S' | 'A' | 'B' | 'C';      // 评级
    description: string;                // 项目简介（AI 生成）
    dimensionScores: {
      activity: number;                 // 活跃度 (0-10)
      community: number;                // 社区健康度 (0-10)
      codeQuality: number;              // 代码质量 (0-10)
      documentation: number;            // 文档质量 (0-10)
      innovation: number;               // 创新度 (0-10)
      maturity: number;                 // 成熟度 (0-10)
    };
    flags?: string[];                   // 审计标记，如 ["data_suspect", "inactive"]
  }>;

  /** 数据审计结果 */
  audit?: {
    duplicateCount: number;             // 疑似重复项目数
    dataSuspectCount: number;           // 数据疑似不实项目数
    inactiveCount: number;              // 不活跃项目数
    totalFlags: number;                 // 总标记数
  };
}
```

### 2.3 导出配置（ExportOptions）

```typescript
interface ExportOptions {
  /** PDF 标题，出现在 PDF 第一行 */
  title?: string;

  /** PDF 副标题，出现在标题下方 */
  subtitle?: string;

  /** 下载文件名，默认 `report.pdf` */
  fileName?: string;

  /** 错误回调，导出失败时触发 */
  onError?: (msg: string) => void;

  /** 进度回调，6 个阶段 0-100% */
  onProgress?: (phase: ProgressPhase, percent: number) => void;

  /** 截图缩放倍率，默认 2。越大越清晰但文件越大、性能越差 */
  scale?: number;

  /** 截图背景色，默认 `#0f172a`（深色 Dashboard 主题） */
  backgroundColor?: string;

  /** PDF 单页边距 (mm)，默认 15 */
  margin?: number;

  /** PDF 元数据 - 标题 */
  metaTitle?: string;

  /** PDF 元数据 - 作者 */
  metaAuthor?: string;

  /** PDF 元数据 - 创建者 */
  metaCreator?: string;

  /** 外部取消信号，传入后可与外部 AbortController 联动 */
  signal?: AbortSignal;
}

type ProgressPhase =
  | '准备渲染'   // 0-5%：requestAnimationFrame + document.fonts.ready
  | '开始截图'   // 5-15%：html2canvas 执行中
  | '生成图片数据' // 15-50%：canvas.toDataURL
  | '生成 PDF'   // 50-65%：创建 jsPDF + 写标题副标题
  | '渲染页面'   // 65-95%：贴截图到 PDF + 多页分片
  | '保存文件';  // 95-100%：页码页脚 + pdf.save()
```

## 3. 输出

### 3.1 PDF 文件规格

| 属性 | 值 |
|------|-----|
| 格式 | PDF 1.3+（通过 jsPDF 生成） |
| 页面尺寸 | A4（210mm × 297mm） |
| 方向 | 纵向（portrait） |
| 分辨率 | 由 `scale` 参数决定（默认 2x，即 144 DPI 等效） |
| 内容结构 | 标题行 → 副标题行 → 页面截图（单页或多页分片） → 页码页脚（Page n/N） |
| 下载方式 | 浏览器 Blob 自动下载，文件名由 `fileName` 参数指定 |
| 中文字体 | 依赖页面加载的字体（通过 `document.fonts.ready` 保证就绪） |
| 元数据 | 支持设置 `title`、`author`、`creator` 字段 |

### 3.2 页面分片逻辑

```
单页场景：imgHeight ≤ pageHeight - titleHeight - margin
  → pdf.addImage(imgData, pageWidth, imgHeight) → 一页完成

多页场景：imgHeight > pageHeight - titleHeight - margin
  → 将长截图按 A4 可用高度分片（canvas.drawImage 区域裁剪）
  → 逐页添加分片图片 + 每页页码页脚（Page n/N）
```

## 4. 技术约束

### 4.1 浏览器兼容矩阵

| 浏览器 | 最低版本 | html2canvas | jsPDF | 备注 |
|--------|---------|-------------|-------|------|
| Chrome | 90+ | ✅ 完全支持 | ✅ 完全支持 | 推荐 |
| Firefox | 90+ | ✅ 完全支持 | ✅ 完全支持 | 字体加载稍慢 |
| Edge | 90+ | ✅ 完全支持 | ✅ 完全支持 | 基于 Chromium |
| Safari | 15+ | ⚠️ 部分支持 | ✅ 完全支持 | `foreignObjectRendering` 必须为 `false` |
| iOS Safari | 15+ | ⚠️ 部分支持 | ✅ 完全支持 | 内存限制更严格，建议 `scale: 1` |
| Chrome Android | 90+ | ✅ 完全支持 | ✅ 完全支持 | 建议 `scale: 1` |

### 4.2 颜色空间约束

| 约束 | 说明 | 处理方式 |
|------|------|---------|
| TailwindCSS v4 oklch | html2canvas 不支持 `oklch()` 函数 | Hook 内置：移除 `<style>` + `getComputedStyle` 回写 RGB |
| CSS 变量中的 oklch | 如 `--my-color: oklch(...)` | 需改为 RGB 值 |
| 透明度叠加 | `rgba()` 在截图时可能偏色 | 建议用不透明颜色 + opacity 属性 |

### 4.3 图表约束

| 图表库 | 约束 | 处理方式 |
|--------|------|---------|
| Recharts | 输出 SVG，html2canvas 无法直接渲染 | Hook 内置：`XMLSerializer` → Data URL → `<img>` |
| ECharts | 默认 Canvas 渲染，可直接截图 | 无需处理；若设为 SVG 模式则走同样转换逻辑 |
| Chart.js | Canvas 渲染 | 无需处理 |
| D3.js | 通常输出 SVG | 走 SVG 转换逻辑 |
| 自定义 SVG | 包含内联 `<style>` 或 `<foreignObject>` | 需确保 SVG 自包含，避免外部引用 |

### 4.4 Bundle 体积

| 依赖 | 版本 | Gzip 大小 | 说明 |
|------|------|----------|------|
| `html2canvas` | ^1.4.1 | ~18 KB | 截图库，核心依赖 |
| `jspdf` | ^2.5.1 | ~38 KB | PDF 生成库，核心依赖 |
| `useExportPdf.ts` | — | ~3 KB | 本 Skill 核心 Hook |
| `ExportButton.tsx` | — | ~1 KB | 按钮组件 |
| **总计（不含字体）** | | **~60 KB** | 建议按需加载（dynamic import） |

## 5. Hook 返回值契约

```typescript
interface UseExportPdfReturn {
  /** 绑定到导出区域容器的 ref */
  containerRef: React.RefObject<HTMLDivElement>;

  /** 触发 PDF 导出，每次调用自动取消上一个未完成的任务 */
  exportToPdf: (options?: ExportOptions) => Promise<void>;

  /** 是否正在导出，用于 UI 状态反馈 */
  exporting: boolean;

  /** 取消当前导出任务 */
  cancelExport: () => void;
}
```

**行为契约：**

| 行为 | 保证 |
|------|------|
| 幂等性 | 多次快速调用 `exportToPdf` 只执行最后一次（前序任务被 AbortController 取消） |
| 错误隔离 | `onError` 回调触发后，`exporting` 自动恢复为 `false` |
| 内存清理 | 导出完成后自动回收 canvas 和 data URL 引用 |
| 并发安全 | 同一时间只有一个导出任务在执行 |
| 超时保护 | html2canvas 默认 30 秒超时，超时后触发 `onError` |

## 6. 集成方式

```tsx
// 方式 A：ExportPage 一键集成（推荐）
import { ExportPage } from './components/ExportPage';

function Dashboard() {
  return (
    <ExportPage
      title="竞品分析报告"
      subtitle="2024 Q4"
      fileName="report.pdf"
      scale={2}
      onExportStart={() => trackEvent('export_start')}
      onExportComplete={() => trackEvent('export_complete')}
    >
      <ScoreChart data={data.projects} />
      <ProjectTable data={data.projects} />
    </ExportPage>
  );
}
```

```tsx
// 方式 B：useExportPdf 手动集成（完全自定义）
import { useExportPdf } from './hooks/useExportPdf';
import { ExportButton } from './components/ExportButton';

function CustomPage() {
  const { containerRef, exportToPdf, exporting, cancelExport } = useExportPdf();

  return (
    <div>
      <ExportButton
        onClick={() => exportToPdf({
          title: '报表',
          fileName: 'report.pdf',
          onProgress: (phase, pct) => setProgress({ phase, pct }),
          signal: abortController.signal,
        })}
        exporting={exporting}
        onCancel={cancelExport}
      />
      <div ref={containerRef}>{/* 页面内容 */}</div>
    </div>
  );
}
```