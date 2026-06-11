import React from 'react'

/** ExportButton 组件 Props */
export interface ExportButtonProps {
  /** 点击触发导出 */
  onClick: () => void
  /** 是否正在导出 */
  exporting: boolean
  /** 取消导出回调 */
  onCancel?: () => void
  /** 按钮文字，默认 `导出 PDF` */
  label?: string
  /** 导出中按钮文字，默认 `导出中...` */
  exportingLabel?: string
  /** 是否处于错误状态 */
  hasError?: boolean
  /** 自定义 CSS 类名 */
  className?: string
  /** 无障碍标签 */
  'aria-label'?: string
}

/**
 * PDF 导出按钮组件
 *
 * 内置导出中 loading 动画和取消导出功能。
 * 自动添加 `data-export-ignore="true"` 避免出现在 PDF 中。
 * 添加 `type="button"` 防止在 form 中意外提交。
 */
export function ExportButton({
  onClick,
  exporting,
  onCancel,
  label = '导出 PDF',
  exportingLabel = '导出中...',
  hasError = false,
  className,
  'aria-label': ariaLabel,
}: ExportButtonProps) {
  const baseClass = 'inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors duration-200 disabled:opacity-60 disabled:cursor-not-allowed'
  const normalClass = 'bg-indigo-600 hover:bg-indigo-500 text-white'
  const errorClass = 'bg-red-600 hover:bg-red-500 text-white'

  return (
    <button
      type="button"
      onClick={exporting && onCancel ? onCancel : onClick}
      data-export-ignore="true"
      className={`${baseClass} ${hasError ? errorClass : normalClass} ${className ?? ''}`}
      disabled={exporting && !onCancel}
      aria-label={ariaLabel ?? (exporting ? `${exportingLabel}，点击取消` : label)}
      aria-busy={exporting}
    >
      {exporting ? (
        <>
          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          {exportingLabel}
        </>
      ) : (
        <>
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          {label}
        </>
      )}
    </button>
  )
}

export default ExportButton