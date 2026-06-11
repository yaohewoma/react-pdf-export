import { useCallback, useRef, useState } from 'react'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

// ==================== 常量定义 ====================

/** PDF 布局与样式配置常量 */
const PDF_LAYOUT = {
  DEFAULT_BG_COLOR: '#0f172a',
  DEFAULT_SCALE: 2,
  BATCH_SIZE: 40,
  MARGIN: 15,
  CONTENT_START_OFFSET: 8,
  TITLE_FONT_SIZE: 18,
  SUBTITLE_FONT_SIZE: 11,
  PAGE_NUMBER_FONT_SIZE: 8,
  TITLE_LINE_SPACING: 10,
  SUBTITLE_LINE_SPACING: 8,
  NO_SUBTITLE_SPACING: 2,
  FOOTER_OFFSET: 8,
  TITLE_COLOR: { r: 15, g: 23, b: 42 },
  SUBTITLE_COLOR: { r: 100, g: 116, b: 139 },
  FOOTER_COLOR: { r: 148, g: 163, b: 184 },
  HTML2CANVAS_TIMEOUT_MS: 30000,
} as const

// ==================== 接口定义 ====================

/** PDF 导出配置选项 */
export interface ExportOptions {
  /** PDF 标题 */
  title?: string
  /** PDF 副标题 */
  subtitle?: string
  /** 下载文件名，默认 `report.pdf` */
  fileName?: string
  /** 错误回调 */
  onError?: (msg: string) => void
  /** 进度回调，phase 为当前阶段名，percent 为 0-100 的进度百分比 */
  onProgress?: (phase: string, percent: number) => void
  /** 截图缩放倍率，默认 2，值越大导出的 PDF 越清晰但性能越差 */
  scale?: number
  /** 截图背景色，默认 `#0f172a` */
  backgroundColor?: string
  /** 单页边距 (mm)，默认 15 */
  margin?: number
  /** PDF 元数据 - 标题 */
  metaTitle?: string
  /** PDF 元数据 - 作者 */
  metaAuthor?: string
  /** PDF 元数据 - 创建者 */
  metaCreator?: string
  /** 取消信号，外部可传入 AbortSignal 用于取消导出 */
  signal?: AbortSignal
}

/** useExportPdf Hook 返回值类型 */
export interface UseExportPdfReturn {
  /** 绑定到导出区域容器的 ref */
  containerRef: React.RefObject<HTMLDivElement | null>
  /** 触发 PDF 导出 */
  exportToPdf: (options?: ExportOptions) => Promise<void>
  /** 是否正在导出 */
  exporting: boolean
  /** 取消当前导出 */
  cancelExport: () => void
}

// ==================== 工具函数 ====================

/** 渲染必需的关键样式属性 */
const ESSENTIAL_PROPS = [
  'color', 'background-color', 'background-image', 'background-size', 'background-position', 'background-repeat',
  'font-size', 'font-weight', 'font-family', 'font-style', 'line-height', 'letter-spacing',
  'text-align', 'text-decoration', 'text-transform', 'white-space',
  'display', 'position', 'top', 'right', 'bottom', 'left', 'inset',
  'width', 'height', 'min-width', 'max-width', 'min-height', 'max-height',
  'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
  'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'border-top-left-radius', 'border-top-right-radius', 'border-bottom-left-radius', 'border-bottom-right-radius',
  'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width',
  'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color',
  'border-top-style', 'border-right-style', 'border-bottom-style', 'border-left-style',
  'opacity', 'visibility', 'z-index', 'overflow-x', 'overflow-y',
  'flex-direction', 'flex-wrap', 'justify-content', 'align-items', 'align-content', 'gap', 'row-gap', 'column-gap', 'order',
  'grid-template-columns', 'grid-template-rows', 'grid-column', 'grid-row',
  'box-shadow', 'text-shadow', 'backdrop-filter', 'filter', 'transform', 'transform-origin',
  'cursor', 'pointer-events', 'outline-offset', 'outline-width', 'outline-style', 'outline-color',
  'text-overflow', 'overflow-wrap', 'word-break', 'fill', 'stroke', 'stroke-width',
  'object-fit', 'object-position', 'vertical-align', 'aspect-ratio',
  'border-collapse', 'border-spacing', 'table-layout', 'clip-path',
  'transition', 'animation',
]

/**
 * 将原始元素的 computed styles 复制到克隆元素上
 * 仅复制 ESSENTIAL_PROPS 中定义的属性
 */
function copyComputedStyles(original: Element, clone: Element): void {
  if (!(clone instanceof HTMLElement) && !(clone instanceof SVGElement)) return
  const computed = getComputedStyle(original)
  const style = (clone as HTMLElement | SVGElement).style
  for (let i = 0; i < ESSENTIAL_PROPS.length; i++) {
    const prop = ESSENTIAL_PROPS[i]
    const value = computed.getPropertyValue(prop)
    if (value) {
      style.setProperty(prop, value)
    }
  }
}

/**
 * 将克隆文档中的 SVG 元素替换为 `<img>` 标签
 * 解决 html2canvas 无法直接渲染 SVG 的问题
 */
async function replaceSvgsWithImages(clonedDoc: Document): Promise<void> {
  const svgs = clonedDoc.querySelectorAll('svg')
  if (svgs.length === 0) return

  const loads: Promise<void>[] = []

  svgs.forEach(svg => {
    const parent = svg.parentNode
    if (!parent) return
    const rect = svg.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return

    const clonedSvg = svg.cloneNode(true) as SVGElement
    const xml = new XMLSerializer().serializeToString(clonedSvg)
    const dataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml)

    const img = clonedDoc.createElement('img')
    img.style.width = rect.width + 'px'
    img.style.height = rect.height + 'px'
    img.style.display = 'inline-block'

    parent.replaceChild(img, svg)
    loads.push(
      new Promise<void>(resolve => {
        img.onload = () => resolve()
        img.onerror = () => {
          console.warn('[useExportPdf] SVG 替换为图片失败，该图表可能在 PDF 中显示为空白')
          resolve()
        }
        img.src = dataUrl
      }),
    )
  })

  await Promise.all(loads)
}

/**
 * 创建一个可被 reject 的超时 Promise
 */
function createTimeout(ms: number, phase: string): Promise<never> {
  return new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`[useExportPdf] ${phase} 超时（${ms}ms）`)), ms),
  )
}

// ==================== Hook 实现 ====================

/**
 * PDF 导出 Hook
 *
 * 提供将 React 页面区域导出为 PDF 的完整能力，包括：
 * - SVG 图表渲染支持（自动转为图片）
 * - TailwindCSS v4 oklch 兼容（移除 style 标签 + computed styles 回写）
 * - 长页面自动分页 + 页码页脚
 * - 导出中状态管理与取消导出
 * - 超时保护
 */
export function useExportPdf(): UseExportPdfReturn {
  const [exporting, setExporting] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  /** AbortController 替代简单的 boolean ref，支持 AbortSignal 链 */
  const abortControllerRef = useRef<AbortController | null>(null)

  /**
   * 执行 PDF 导出流程
   */
  const exportToPdf = useCallback(async (options: ExportOptions = {}) => {
    const container = containerRef.current
    if (!container) {
      options.onError?.('容器未找到')
      return
    }

    // 创建 AbortController，同时监听外部 signal
    abortControllerRef.current?.abort()
    abortControllerRef.current = new AbortController()
    const { signal: internalSignal } = abortControllerRef.current

    // 如果外部有 signal，串联取消
    const onExternalAbort = () => { abortControllerRef.current?.abort() }
    options.signal?.addEventListener('abort', onExternalAbort, { once: true })

    setExporting(true)

    const {
      title,
      subtitle,
      fileName = 'report.pdf',
      onError,
      onProgress,
      scale = PDF_LAYOUT.DEFAULT_SCALE,
      backgroundColor = PDF_LAYOUT.DEFAULT_BG_COLOR,
      margin = PDF_LAYOUT.MARGIN,
      metaTitle,
      metaAuthor,
      metaCreator,
    } = options

    /** 存放需要清理的 canvas 和 data URL 引用 */
    const cleanupItems: { canvas?: HTMLCanvasElement; dataUrl?: string; sliceCanvas?: HTMLCanvasElement } = { }

    try {
      // 检查是否已被取消
      if (internalSignal.aborted) return

      onProgress?.('准备渲染', 5)

      await new Promise(r => requestAnimationFrame(r))
      await document.fonts.ready

      if (internalSignal.aborted) return

      onProgress?.('开始截图', 15)

      const originalEls: Element[] = [container, ...Array.from(container.querySelectorAll('*'))]

      // html2canvas 调用添加超时保护
      const canvas = await Promise.race([
        html2canvas(container, {
          backgroundColor,
          scale,
          useCORS: true,
          allowTaint: true,
          logging: false,
          foreignObjectRendering: false,
          onclone: async (clonedDoc, refElement) => {
            clonedDoc.querySelectorAll('style').forEach(el => el.remove())

            const clonedEls: Element[] = [
              refElement,
              ...Array.from((refElement as HTMLElement).querySelectorAll('*')),
            ]

            const batchSize = PDF_LAYOUT.BATCH_SIZE
            for (let i = 0; i < originalEls.length && i < clonedEls.length; i += batchSize) {
              const end = Math.min(i + batchSize, originalEls.length, clonedEls.length)
              for (let j = i; j < end; j++) {
                copyComputedStyles(originalEls[j], clonedEls[j])
              }
              if (end < originalEls.length) {
                await new Promise(r => setTimeout(r, 0))
              }
            }

            clonedDoc.querySelectorAll('[data-export-ignore]').forEach(el => {
              (el as HTMLElement).style.display = 'none'
            })

            await replaceSvgsWithImages(clonedDoc)
          },
        }),
        createTimeout(PDF_LAYOUT.HTML2CANVAS_TIMEOUT_MS, 'html2canvas 截图'),
      ])

      cleanupItems.canvas = canvas

      if (internalSignal.aborted) return

      onProgress?.('生成图片数据', 50)

      let imgData: string
      try {
        imgData = canvas.toDataURL('image/png')
        cleanupItems.dataUrl = imgData
      } catch (taintErr) {
        console.error('[useExportPdf] Canvas tainted by cross-origin content:', taintErr)
        onError?.('导出失败：页面中含有跨域资源（如外部图片），请检查后重试')
        return
      }
      if (internalSignal.aborted) return

      onProgress?.('生成 PDF', 65)

      const pdf = new jsPDF('p', 'mm', 'a4')

      // 设置 PDF 元数据
      if (metaTitle) pdf.setProperties({ title: metaTitle })
      if (metaAuthor) pdf.setProperties({ author: metaAuthor })
      if (metaCreator) pdf.setProperties({ creator: metaCreator })

      const pageW = pdf.internal.pageSize.getWidth()
      const pageH = pdf.internal.pageSize.getHeight()
      const usableW = pageW - margin * 2

      let y = margin + PDF_LAYOUT.CONTENT_START_OFFSET
      if (title) {
        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(PDF_LAYOUT.TITLE_FONT_SIZE)
        pdf.setTextColor(PDF_LAYOUT.TITLE_COLOR.r, PDF_LAYOUT.TITLE_COLOR.g, PDF_LAYOUT.TITLE_COLOR.b)
        pdf.text(title, margin, y, { maxWidth: usableW })
        y += PDF_LAYOUT.TITLE_LINE_SPACING
      }
      if (subtitle) {
        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(PDF_LAYOUT.SUBTITLE_FONT_SIZE)
        pdf.setTextColor(PDF_LAYOUT.SUBTITLE_COLOR.r, PDF_LAYOUT.SUBTITLE_COLOR.g, PDF_LAYOUT.SUBTITLE_COLOR.b)
        pdf.text(subtitle, margin, y, { maxWidth: usableW })
        y += PDF_LAYOUT.SUBTITLE_LINE_SPACING
      } else {
        y += PDF_LAYOUT.NO_SUBTITLE_SPACING
      }

      if (internalSignal.aborted) return

      const imgW = usableW
      const imgH = (canvas.height * usableW) / canvas.width
      const remainingOnPage = pageH - y - margin

      onProgress?.('渲染页面', 80)

      if (imgH <= remainingOnPage) {
        pdf.addImage(imgData, 'PNG', margin, y, imgW, imgH)
      } else {
        const slices = Math.ceil(imgH / remainingOnPage)
        const slicedCanvasH = Math.ceil(canvas.height / slices)

        for (let i = 0; i < slices; i++) {
          if (i > 0) { pdf.addPage(); y = margin }
          if (internalSignal.aborted) return

          const sliceCanvas = document.createElement('canvas')
          sliceCanvas.width = canvas.width
          sliceCanvas.height = Math.min(slicedCanvasH, canvas.height - i * slicedCanvasH)
          const sctx = sliceCanvas.getContext('2d')
          if (sctx) {
            sctx.drawImage(
              canvas,
              0, i * slicedCanvasH, canvas.width, sliceCanvas.height,
              0, 0, canvas.width, sliceCanvas.height,
            )
          }
          pdf.addImage(
            sliceCanvas.toDataURL('image/png'), 'PNG',
            margin, y, imgW, (sliceCanvas.height * usableW) / canvas.width,
          )

          // 清理分片 canvas 引用
          sliceCanvas.width = 0
          sliceCanvas.height = 0
        }
      }

      if (internalSignal.aborted) return

      onProgress?.('添加页码', 95)

      const totalPages = pdf.getNumberOfPages()
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i)
        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(PDF_LAYOUT.PAGE_NUMBER_FONT_SIZE)
        pdf.setTextColor(PDF_LAYOUT.FOOTER_COLOR.r, PDF_LAYOUT.FOOTER_COLOR.g, PDF_LAYOUT.FOOTER_COLOR.b)
        pdf.text(`Page ${i}/${totalPages}`, pageW / 2, pageH - PDF_LAYOUT.FOOTER_OFFSET, { align: 'center' })
      }

      onProgress?.('保存文件', 100)

      pdf.save(fileName)
    } catch (err) {
      // 忽略取消错误
      if (err instanceof DOMException && err.name === 'AbortError') return
      console.error('[useExportPdf] PDF export failed:', err)
      const msg = err instanceof Error ? err.message : '导出失败'
      onError?.(msg)
    } finally {
      // 清理 canvas 和 Data URL 内存
      if (cleanupItems.canvas) {
        cleanupItems.canvas.width = 0
        cleanupItems.canvas.height = 0
      }
      // 清除 data URL 引用，以便 GC 回收
      if (cleanupItems.dataUrl) {
        cleanupItems.dataUrl = ''
      }
      // 清理外部 signal 监听器
      if (options.signal) {
        options.signal.removeEventListener('abort', onExternalAbort)
      }
      abortControllerRef.current = null
      setExporting(false)
    }
  }, [])

  /** 取消当前导出 */
  const cancelExport = useCallback(() => {
    abortControllerRef.current?.abort()
  }, [])

  return { containerRef, exportToPdf, exporting, cancelExport }
}