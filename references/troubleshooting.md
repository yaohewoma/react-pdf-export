# React PDF Export — 故障排查指南

## 导出失败

### `Attempting to parse an unsupported color function "oklch"`

**症状**：点击导出后控制台报 `oklch` 解析错误，PDF 生成失败。

**原因**：TailwindCSS v4 使用 oklch 色彩空间，html2canvas 无法解析。

**解决方案**：
- Hook 已内置处理：在 `onclone` 回调中移除 `<style>` 标签，通过 `getComputedStyle` 将 oklch 颜色转为 RGB 行内样式
- 如果仍然报错，检查是否使用了自定义 CSS 变量中的 oklch 颜色：

```css
/* 避免这样的写法 */
--my-color: oklch(0.6 0.2 180);

/* 改为 RGB */
--my-color: rgb(100, 150, 200);
```

### `Failed to execute 'removeChild' on 'Node'`

**症状**：导出时报 `NotFoundError: Failed to execute 'removeChild' on 'Node'`。

**原因**：在 React 管理的 DOM 上直接操作了节点。

**解决方案**：
- 所有 DOM 操作必须在 `html2canvas` 的 `onclone` 回调中完成
- 不要直接操作 `containerRef.current` 的 DOM
- 不要使用 `document.querySelector` 在原始文档中查找元素

### SVG 图表导出为空白

**症状**：雷达图、柱状图等 SVG 图表在 PDF 中显示为空白区域。

**原因**：html2canvas 无法直接渲染 SVG 元素。

**解决方案**：
- Hook 已内置 SVG → Image 转换：在 `onclone` 中通过 `XMLSerializer` → Data URL → `<img>` 替换
- 如果仍然空白，检查 SVG 是否有内联样式：

```tsx
// 避免内联 style 中的复杂属性
<svg style={{ ... }}>  // 可能导致序列化问题

// 使用属性代替
<svg width="400" height="300">
```

### Canvas 跨域污染

**症状**：`Canvas tainted by cross-origin content`，导出后图片区域空白。

**解决方案**：
1. 确保图片服务器配置了 CORS 头
2. 在图片标签上添加 `crossOrigin="anonymous"`：

```tsx
<img src="https://example.com/image.png" crossOrigin="anonymous" />
```

3. 如果使用本地图片，确保通过相对路径或同源 URL 引用

### 导出超时

**症状**：页面内容过多时，导出长时间无响应，控制台报 `html2canvas 截图 超时`。

**原因**：html2canvas 渲染超大页面耗时超过默认 30 秒超时阈值。

**解决方案**：
1. 降低 `scale` 参数：`exportToPdf({ scale: 1 })`
2. 将大页面拆分为多个小部分分别导出
3. 减少页面中的 DOM 元素数量

## 样式问题

### 导出后样式丢失

**症状**：PDF 中文字颜色、背景色、间距等样式与页面不一致。

**排查**：
1. 检查是否使用了 CSS 变量（`var(--xxx)`），html2canvas 可能无法解析
2. 检查是否使用了 `@apply` 等 Tailwind 指令

**解决方案**：
```tsx
// 优先使用行内样式或 Tailwind 工具类
<div className="bg-blue-500 text-white p-4">  // 可正常渲染
<div style={{ backgroundColor: "var(--my-bg)" }}>  // 可能丢失
```

### 字体不正确

**症状**：导出后中文字体显示为方框或默认字体。

**解决方案**：
1. 确保字体文件在项目中正确加载
2. Hook 已内置 `await document.fonts.ready` 等待字体加载
3. 如果使用 Google Fonts，确保在 `<head>` 中预加载：

```html
<link rel="preload" href="https://fonts.googleapis.com/css2?family=..." as="style" />
```

## 性能问题

### 导出时页面冻结

**症状**：点击导出后 UI 冻结数秒，无响应。

**排查**：
1. 页面内容是否过多（大量图表、图片）
2. `foreignObjectRendering` 是否误设为 `true`

**解决方案**：
```tsx
const { exportToPdf } = useExportPdf();

// 使用默认配置（foreignObjectRendering: false）
// 仅在需要时复制关键 computed styles 属性（70 个）
```

### 内存占用过高

**症状**：导出大页面时浏览器卡顿或崩溃。

**解决方案**：
1. 降低 `scale` 参数：`exportToPdf({ scale: 1 })` 代替默认的 2
2. 将大页面拆分为多个小页面分别导出
3. 使用 `imageFormat: 'image/jpeg'` 减少截图体积

### PDF 文件过大

**症状**：导出的 PDF 文件体积过大（几十 MB 甚至上百 MB）。

**原因**：`scale: 2` 生成高分辨率截图，多页 PDF 每页都嵌入完整分辨率的 PNG 图片。

**解决方案**：
1. 降低 `scale` 至 1：`exportToPdf({ scale: 1 })`
2. 减少页面内容，移除不必要的装饰元素
3. 如果页面包含大量图片，考虑将图片压缩后再嵌入页面
4. 使用 `data-export-ignore` 隐藏不需要导出的背景图或装饰元素

### 分页位置不理想

**症状**：PDF 自动分页截断了图表或文字段落。

**解决方案**：
1. 在页面中控制内容高度，使每个逻辑区块控制在 A4 页面（297mm）的可见范围内
2. 使用 CSS 控制容器高度，避免内容被切分：

```css
.page-break-avoid {
  page-break-inside: avoid;
}
```

3. 在需要分页的位置手动插入分页标记：

```tsx
<div style={{ breakAfter: 'page' }} />
```

## 框架兼容性问题

### React StrictMode 下导出两次

**症状**：React 18 StrictMode 下，导出按钮点击一次却导出两次 PDF。

**原因**：React StrictMode 在开发模式下会双重调用 effect 和 state updater。

**解决方案**：
- 生产环境不受影响，StrictMode 的双重调用仅在开发模式下生效
- 如果开发模式下需要避免，可以临时移除 StrictMode 包装
- 或者使用 `useRef` 防止重复调用：

```tsx
const isExporting = useRef(false)

const handleExport = async () => {
  if (isExporting.current) return
  isExporting.current = true
  try {
    await exportToPdf({ title: '报告' })
  } finally {
    isExporting.current = false
  }
}
```

### Next.js SSR 报错 `document is not defined`

**症状**：Next.js 项目中 `useExportPdf` 在服务端渲染时抛出 `document is not defined` 错误。

**原因**：Hook 依赖浏览器 API（`document.fonts`、`getComputedStyle` 等），在 SSR 阶段不可用。

**解决方案**：
1. 在组件顶部添加 `'use client'` 指令
2. 使用 Next.js 动态导入，禁用 SSR：

```tsx
'use client'
import dynamic from 'next/dynamic'

const ExportButton = dynamic(
  () => import('../components/ExportButton').then(mod => mod.ExportButton),
  { ssr: false }
)
```

3. 使用 `useEffect` + `useState` 确保仅在客户端渲染导出相关组件：

```tsx
const [mounted, setMounted] = useState(false)
useEffect(() => { setMounted(true) }, [])
if (!mounted) return null
```

### 移动端兼容性

**症状**：在移动端浏览器中导出失败或导出效果异常。

**原因**：
1. 移动端浏览器对 `html2canvas` 的支持有限
2. 移动端字体渲染与桌面端不同
3. 移动端内存限制更严格

**解决方案**：
1. 移动端建议降低 `scale` 至 1：`exportToPdf({ scale: 1 })`
2. 确保字体在移动端正确加载，使用系统字体作为 fallback
3. 减少页面 DOM 复杂度，避免在移动端导出超大页面
4. 测试主流移动浏览器（Safari iOS、Chrome Android）

### 并发导出

**症状**：用户快速连续点击导出按钮，多个导出任务同时执行导致异常。

**解决方案**：
- Hook 已内置处理：每次调用 `exportToPdf` 会自动取消前一个导出任务（通过 AbortController）
- 如果仍需额外保护，可在 UI 层面禁用按钮：

```tsx
<ExportButton
  onClick={handleExport}
  exporting={exporting}
  disabled={exporting}
/>
```

## 按钮问题

### 导出按钮出现在 PDF 中

**症状**：导出的 PDF 页面中包含了导出按钮。

**解决方案**：
- 确保按钮有 `data-export-ignore="true"` 属性
- `ExportButton` 组件已内置此属性，无需额外配置
- 如果自定义按钮，手动添加属性：

```tsx
<button data-export-ignore="true" onClick={handleExport}>导出</button>
```

### 按钮点击无反应

**症状**：点击导出按钮后没有任何反应。

**排查**：
1. 检查控制台是否有错误
2. 检查 `containerRef` 是否正确绑定
3. 检查 `html2canvas` 和 `jspdf` 是否正确安装

```bash
npm ls html2canvas jspdf
```

### 按钮在 form 中意外提交

**症状**：导出按钮放在 `<form>` 中时，点击导出会触发表单提交。

**解决方案**：
- `ExportButton` 已内置 `type="button"` 属性，防止在 form 中意外提交
- 如果自定义按钮，请确保添加 `type="button"`：

```tsx
<button type="button" data-export-ignore="true" onClick={handleExport}>导出</button>
```

## 高级场景

### ECharts 设为 SVG 模式后导出空白

**症状**：ECharts 配置了 `renderer: 'svg'`，导出后图表区域空白。

**原因**：ECharts 的 SVG 渲染模式同样产生 `<svg>` 元素，html2canvas 无法直接渲染。

**解决方案**：

```tsx
// 方案 A：ECharts 改回 Canvas 渲染（推荐）
import * as echarts from 'echarts';

const chart = echarts.init(dom, null, {
  renderer: 'canvas',  // 默认值，无需 SVG 转换
});

// 方案 B：如果必须用 SVG，使用 Hook 的 onclone 手动处理
// Hook 已内置 SVG → Image 转换，ECharts SVG 同样适用
```

### CSS-in-JS（styled-components / Emotion）样式丢失

**症状**：使用 styled-components 或 Emotion 的组件，导出后样式不完整。

**原因**：CSS-in-JS 库通过 `<style>` 标签注入样式（通常带 `data-styled` 属性），在 `onclone` 中被移除。

**解决方案**：

```tsx
// 方案 A：确保样式也通过 Tailwind 类名存在
const StyledCard = styled.div`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
`;
// ✅ 同时添加 Tailwind 类名作为降级
<StyledCard className="bg-indigo-500" />

// 方案 B（高级）：修改 useExportPdf 中的 onclone 逻辑，
// 保留带特定 data 属性的 <style> 标签
// clonedDoc.querySelectorAll('style:not([data-styled])').forEach(el => el.remove())
```

### React Portals 内容导出失败

**症状**：使用 `ReactDOM.createPortal` 渲染到 `document.body` 的内容（如 Modal、Tooltip）在 PDF 中丢失。

**原因**：`containerRef` 绑定的元素不包含 Portal 内容，它们被渲染到了 `containerRef` 外部。

**解决方案**：

```tsx
// ❌ Portal 内容不在导出区域内
function Tooltip({ text }) {
  return ReactDOM.createPortal(
    <div className="tooltip">{text}</div>,
    document.body  // 在 containerRef 外部
  );
}

// ✅ 将关键信息移到导出区域内
function ExportSafeTooltip({ text }) {
  return (
    <div>
      <span className="peer cursor-help">ⓘ</span>
      <span className="hidden peer-hover:inline">{text}</span>  {/* 不用 Portal */}
    </div>
  );
}
```

### 懒加载组件（React.lazy）在导出时未渲染

**症状**：使用 `React.lazy` + `Suspense` 的图表组件，在导出 PDF 时显示 fallback（如 "Loading..."）而非实际内容。

**原因**：`React.lazy` 组件首次渲染时异步加载，如果导出在加载完成前触发，html2canvas 捕捉到的是 Suspense fallback。

**解决方案**：

```tsx
function Dashboard() {
  const [chartsReady, setChartsReady] = useState(false);

  // 等待所有懒加载组件就绪后再允许导出
  useEffect(() => {
    // 延迟确保 Suspense 内容渲染完成
    const timer = setTimeout(() => setChartsReady(true), 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <ExportPage title="报告">
      <Suspense fallback={<div>加载图表中...</div>}>
        <LazyChart />
      </Suspense>
      {/* 导出按钮在 chartsReady 后才生效 */}
    </ExportPage>
  );
}
```

### 导出后 canvas 内存未释放导致多次导出后崩溃

**症状**：连续导出 3-5 次后，浏览器内存占用飙升，页面卡顿甚至崩溃。

**原因**：虽然 Hook 内置了 canvas 清理，但如果页面中存在大量图片或 SVG 图表，每次导出的 Data URL 会占用大量内存。

**解决方案**：

```tsx
// 方案 A：限制导出频率
const [cooldown, setCooldown] = useState(false);

const handleExport = async () => {
  if (cooldown) return;
  setCooldown(true);
  await exportToPdf({ title: '报告', scale: 1 });  // 降低 scale
  setTimeout(() => setCooldown(false), 3000);       // 3 秒冷却
};

// 方案 B：导出前清理页面中不必要的资源
const handleExport = async () => {
  // 暂时隐藏非导出内容
  setShowUnusedContent(false);
  await exportToPdf({ title: '报告' });
  setShowUnusedContent(true);
};
```

### 使用自定义 CSS 变量导致颜色不一致

**症状**：PDF 中使用了 `var(--primary)` 等 CSS 变量的元素颜色与页面显示不同。

**原因**：CSS 变量的定义在 `<style>` 标签或 `:root` 中，`onclone` 中移除了 `<style>` 标签导致变量失效。`getComputedStyle` 可以获取到解析后的值，但某些嵌套变量可能回退不完整。

**解决方案**：

```css
/* ❌ 依赖 CSS 变量 */
.text-brand {
  color: var(--primary);
}

/* ✅ 同时提供直接颜色作为降级 */
.text-brand {
  color: var(--primary);
  /* Tailwind 工具类会生成具体的 RGB 值 */
}

/* ✅ 使用 Tailwind v4 的 theme() 函数（如果支持） */
.text-brand {
  color: theme('colors.blue.500');
}
```

更可靠的做法：在导出前通过 `getComputedStyle` 验证关键元素的颜色是否正确解析。