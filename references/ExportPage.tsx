/**
 * ExportPage.tsx - 可复用的 PDF 导出页面包装组件
 *
 * 封装了 useExportPdf Hook 和 ExportButton，提供一键集成的页面导出能力。
 * 适用于任何需要导出 PDF 的页面组件。
 *
 * 用法:
 *   <ExportPage title="Dashboard" subtitle="竞品分析报告">
 *     <YourPageContent />
 *   </ExportPage>
 */

import React, { ReactNode, useCallback } from "react";
import { useExportPdf, ExportOptions } from "./useExportPdf";
import { ExportButton } from "./ExportButton";

export interface ExportPageProps {
  /** 页面内容 */
  children: ReactNode;
  /** PDF 标题 */
  title?: string;
  /** PDF 副标题 */
  subtitle?: string;
  /** 下载文件名 */
  fileName?: string;
  /** 导出按钮自定义文字 */
  buttonLabel?: string;
  /** 是否显示导出按钮 */
  showButton?: boolean;
  /** 按钮位置 */
  buttonPosition?: "top-right" | "top-left" | "bottom-right" | "bottom-left";
  /** 错误回调 */
  onError?: (msg: string) => void;
  /** 导出开始回调 */
  onExportStart?: () => void;
  /** 导出完成回调 */
  onExportComplete?: () => void;
  /** 额外 CSS 类名 */
  className?: string;
  /** 截图缩放倍率，越大越清晰但性能越差，默认 2 */
  scale?: number;
  /** 截图背景色，默认 `#0f172a` */
  backgroundColor?: string;
  /** 单页边距 (mm)，默认 15 */
  margin?: number;
}

const positionStyles: Record<string, React.CSSProperties> = {
  "top-right": { position: "absolute", top: 16, right: 16, zIndex: 10 },
  "top-left": { position: "absolute", top: 16, left: 16, zIndex: 10 },
  "bottom-right": { position: "absolute", bottom: 16, right: 16, zIndex: 10 },
  "bottom-left": { position: "absolute", bottom: 16, left: 16, zIndex: 10 },
};

/**
 * PDF 导出页面包装组件
 *
 * 自动处理：
 * - 导出区域 ref 绑定
 * - 导出按钮渲染和状态管理
 * - 导出中 loading 状态
 * - 取消导出
 * - 导出开始/完成回调
 * - 可透传 scale、backgroundColor、margin 等配置
 */
export function ExportPage({
  children,
  title,
  subtitle,
  fileName = "report.pdf",
  buttonLabel = "导出 PDF",
  showButton = true,
  buttonPosition = "top-right",
  onError,
  onExportStart,
  onExportComplete,
  className,
  scale,
  backgroundColor,
  margin,
}: ExportPageProps) {
  const { containerRef, exportToPdf, exporting, cancelExport } = useExportPdf();

  /** 触发 PDF 导出 */
  const handleExport = useCallback(() => {
    const options: ExportOptions = {
      title,
      subtitle,
      fileName,
      onError,
      scale,
      backgroundColor,
      margin,
    };
    onExportStart?.();
    exportToPdf(options).finally(() => {
      onExportComplete?.();
    });
  }, [title, subtitle, fileName, onError, scale, backgroundColor, margin, exportToPdf, onExportStart, onExportComplete]);

  return (
    <div style={{ position: "relative" }} className={className}>
      {showButton && (
        <div style={positionStyles[buttonPosition]}>
          <ExportButton
            onClick={handleExport}
            exporting={exporting}
            onCancel={cancelExport}
            label={buttonLabel}
          />
        </div>
      )}
      <div ref={containerRef}>{children}</div>
    </div>
  );
}

export default ExportPage;