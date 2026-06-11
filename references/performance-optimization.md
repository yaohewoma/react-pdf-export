# 性能调优指南

## 概述

本指南面向页面内容较多（>50 个 DOM 节点、含多个图表）或导出 PDF 文件过大（>5 MB）的场景。通过调整参数和策略，可在清晰度和性能之间找到最佳平衡点。

## 性能影响因素

| 因素 | 影响程度 | 说明 |
|------|---------|------|
| DOM 节点数量 | 🔴 高 | 每个节点需要复制 70 个 computed styles 属性 |
| SVG 图表数量和复杂度 | 🔴 高 | 每个 SVG 需要序列化 + 加载为 Image |
| `scale` 参数 | 🔴 高 | scale=2 时 canvas 面积为 scale=1 的 4 倍 |
| 外部图片数量 | 🟡 中 | 跨域图片需额外 CORS 处理 |
| 页面总高度 | 🟡 中 | 影响分片数量和 PDF 页数 |
| 字体加载数量 | 🟢 低 | `document.fonts.ready` 等待所有字体 |
| `foreignObjectRendering` | 🟢 低 | 默认 `false` 已是最优 |

## 调优策略

### 策略 1：降低 scale（最快见效）

```tsx
// 默认 scale=2，适合大多数场景
exportToPdf({ title: '报告', scale: 2 });

// 文件过大或导出慢 → 降至 1
exportToPdf({ title: '报告', scale: 1 });

// 需要超清打印 → 升至 3（谨慎使用）
exportToPdf({ title: '报告', scale: 3 });
```

| scale | canvas 分辨率 | PDF 清晰度 | 典型文件大小（单页） | 适用场景 |
|-------|-------------|-----------|-------------------|---------|
| 1 | 物理像素 1:1 | 可读 | ~200 KB | 移动端、预览用 |
| 2 | 物理像素 2:1 | 清晰 | ~800 KB | **推荐默认值** |
| 3 | 物理像素 3:1 | 超清 | ~2 MB | 打印用 |

### 策略 2：DOM 节点瘦身

```tsx
// ❌ 不必要的装饰元素
<div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10">
  <div className="w-96 h-96 bg-blue-500/20 rounded-full blur-3xl" />
  <div className="w-64 h-64 bg-purple-500/20 rounded-full blur-3xl" />
</div>

// ✅ 用 data-export-ignore 隐藏
<div data-export-ignore="true" className="absolute inset-0 ...">
  {/* 导出时自动移除，不影响页面显示 */}
</div>
```

**最佳实践：**
- 背景装饰元素 → `data-export-ignore="true"`
- 交互控件（搜索框、过滤器、标签页切换） → `data-export-ignore="true"`
- 侧边栏、导航栏 → `data-export-ignore="true"`
- 仅在导出时需要的内容 → 保留在导出区域

### 策略 3：SVG 图表优化

```tsx
// ❌ 复杂的 Recharts 图表
<RadarChart width={800} height={600} data={data}>
  <PolarGrid strokeDasharray="3 3" />  {/* 虚线网格 */}
  <PolarAngleAxis tick={{ fontSize: 10 }} />
  <Radar dataKey="score" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
</RadarChart>

// ✅ 降级为简洁版本
<RadarChart width={600} height={400} data={data}>
  <PolarGrid />                          {/* 实线网格，更少节点 */}
  <Radar dataKey="score" stroke="#8884d8" fill="#8884d8" fillOpacity={0.5} />
</RadarChart>
```

- 减小图表尺寸（降低 `width`/`height`）
- 减少图表中的元素（去掉不必要的辅助线、标签）
- ECharts 优先使用 Canvas 渲染器（非 SVG），无需转换

### 策略 4：分批导出超大页面

当单页面超长（>5 页 A4），考虑分段导出：

```tsx
function LargeDashboardExport() {
  const section1Ref = useRef<HTMLDivElement>(null);
  const section2Ref = useRef<HTMLDivElement>(null);

  const exportAll = async () => {
    // 导出第一部分
    const canvas1 = await html2canvas(section1Ref.current!);
    const pdf = new jsPDF();
    // ... 处理第一部分 ...

    // 导出第二部分
    const canvas2 = await html2canvas(section2Ref.current!);
    pdf.addPage();
    // ... 处理第二部分 ...

    pdf.save('full-report.pdf');
  };

  return (
    <div>
      <button onClick={exportAll}>导出全部</button>
      <div ref={section1Ref}>{/* 概览 + 统计 */}</div>
      <div ref={section2Ref}>{/* 详细数据 */}</div>
    </div>
  );
}
```

### 策略 5：调整 batchSize 和 ESSENTIAL_PROPS

```typescript
// useExportPdf.ts 内部默认值
const PDF_LAYOUT = {
  BATCH_SIZE: 40,         // 每批复制 40 个元素的 styles
};

const ESSENTIAL_PROPS = [  // 70 个关键 CSS 属性
  'color', 'background-color', 'font-size', /* ... */
];

// 页面超大（>500 DOM 节点）→ 增大 batchSize 减少调度开销
// 样式极简（如纯表格）→ 减少 ESSENTIAL_PROPS 到 40 个
// 样式复杂（大量渐变/阴影）→ 增加 ESSENTIAL_PROPS 到 100 个
```

> **注意：** 修改内部常量需要直接编辑 `useExportPdf.ts`，不推荐常规使用。

### 策略 6：动态导入（Code Splitting）

对于非首屏页面，将导出功能按需加载：

```tsx
import { lazy, Suspense } from 'react';

// 导出组件懒加载，减小首屏 bundle
const ExportPage = lazy(() => import('./components/ExportPage'));

function Dashboard() {
  return (
    <Suspense fallback={<div>加载中...</div>}>
      <ExportPage title="报告">
        {/* 页面内容 */}
      </ExportPage>
    </Suspense>
  );
}
```

## 性能基准测试

| 场景 | DOM 节点数 | 图表数 | scale | 耗时 | PDF 大小 | 内存峰值 |
|------|-----------|--------|-------|------|---------|---------|
| 简单报表 | ~30 | 0 | 2 | <1s | ~300 KB | ~20 MB |
| 标准 Dashboard | ~100 | 2（柱状图+饼图） | 2 | 2-3s | ~1 MB | ~50 MB |
| 复杂 Dashboard | ~200 | 4（雷达+柱状+折线+饼图） | 2 | 5-8s | ~3 MB | ~120 MB |
| 超大报表 | ~500 | 6+ | 2 | 15-25s | ~8 MB | ~300 MB |
| 超大报表（优化） | ~500 | 6+ | 1 | 4-6s | ~2 MB | ~80 MB |

> 测试环境：Chrome 120, Intel i7-13700, 16GB RAM, Windows 11

## 内存泄漏预防

```tsx
function Dashboard() {
  const { containerRef, exportToPdf, exporting } = useExportPdf();

  // ✅ 组件卸载时自动清理（Hook 内部处理）
  useEffect(() => {
    return () => {
      // cancelExport 在 Hook 的 finally 块中自动清理 canvas 和 data URL
    };
  }, []);

  // ✅ 如果组件频繁挂载/卸载，确保 ref 不为 null
  return (
    <div ref={containerRef}>
      {/* 内容 */}
    </div>
  );
}
```

Hook 内部已自动处理：
- `canvas.width = 0` / `canvas.height = 0`（释放 GPU 内存）
- `dataUrl = ''`（释放字符串引用）
- `sliceCanvas.width = 0` / `sliceCanvas.height = 0`（释放分片 canvas）
- `abortController = null`（释放 AbortController 引用）

## 快速决策表

| 你的情况 | 推荐方案 |
|---------|---------|
| 页面简单，导出快 | 保持默认 `scale: 2` |
| PDF 文件 > 5 MB | `scale: 1` |
| 导出时 UI 冻结 > 3 秒 | 检查 DOM 节点数 → 加 `data-export-ignore` → 降 `scale` |
| 有 3+ 个 SVG 图表 | 减小图表尺寸，确保图表可见 |
| 移动端导出 | `scale: 1` + 减小图表尺寸 |
| 超大页面（>5 页 A4） | 分批导出（策略 4） 或 降低 scale |