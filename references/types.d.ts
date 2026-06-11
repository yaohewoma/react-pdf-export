/**
 * react-pdf-export — 共享 TypeScript 类型定义
 *
 * 使用方法：
 *   1. 复制本文件到项目中，如 src/types/pdf-export.d.ts
 *   2. 所有类型已从 useExportPdf.ts 中提取并整理
 *   3. 如果项目中直接使用 useExportPdf.ts，无需额外复制本文件
 *
 * @module react-pdf-export/types
 */

// ==================== 导出配置 ====================

/** PDF 导出进度阶段 */
type ProgressPhase =
  | '准备渲染'
  | '开始截图'
  | '生成图片数据'
  | '生成 PDF'
  | '渲染页面'
  | '保存文件';

/** PDF 导出配置选项 */
export interface ExportOptions {
  /** PDF 标题，出现在 PDF 第一行（helvetica bold 18pt） */
  title?: string;

  /** PDF 副标题，出现在标题下方（helvetica normal 11pt，灰色） */
  subtitle?: string;

  /** 下载文件名，默认 `report.pdf` */
  fileName?: string;

  /** 错误回调，导出失败时触发 */
  onError?: (msg: string) => void;

  /** 进度回调，phase 为当前阶段名，percent 为 0-100 */
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

// ==================== Hook 返回值 ====================

/** useExportPdf Hook 返回值类型 */
export interface UseExportPdfReturn {
  /** 绑定到导出区域容器的 ref */
  containerRef: import('react').RefObject<HTMLDivElement>;

  /** 触发 PDF 导出，每次调用自动取消上一个未完成的任务 */
  exportToPdf: (options?: ExportOptions) => Promise<void>;

  /** 是否正在导出 */
  exporting: boolean;

  /** 取消当前导出（通过 AbortController） */
  cancelExport: () => void;
}

// ==================== 组件 Props ====================

/** ExportButton 组件 Props */
export interface ExportButtonProps {
  /** 点击触发导出 */
  onClick: () => void;

  /** 是否正在导出 */
  exporting: boolean;

  /** 取消导出回调，点击导出中按钮时触发 */
  onCancel?: () => void;

  /** 按钮文字，默认 `导出 PDF` */
  label?: string;

  /** 导出中按钮文字，默认 `导出中...` */
  exportingLabel?: string;

  /** 是否处于错误状态（按钮变红） */
  hasError?: boolean;

  /** 自定义 CSS 类名 */
  className?: string;

  /** 无障碍标签 */
  'aria-label'?: string;
}

/** ExportPage 组件 Props */
export interface ExportPageProps {
  /** 页面内容 */
  children: import('react').ReactNode;

  /** PDF 标题 */
  title?: string;

  /** PDF 副标题 */
  subtitle?: string;

  /** 下载文件名，默认 `report.pdf` */
  fileName?: string;

  /** 导出按钮自定义文字，默认 `导出 PDF` */
  buttonLabel?: string;

  /** 是否显示导出按钮，默认 `true` */
  showButton?: boolean;

  /** 按钮位置，默认 `top-right` */
  buttonPosition?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';

  /** 错误回调 */
  onError?: (msg: string) => void;

  /** 导出开始回调 */
  onExportStart?: () => void;

  /** 导出完成回调 */
  onExportComplete?: () => void;

  /** 额外 CSS 类名 */
  className?: string;

  /** 截图缩放倍率，默认 2 */
  scale?: number;

  /** 截图背景色，默认 `#0f172a` */
  backgroundColor?: string;

  /** 单页边距 (mm)，默认 15 */
  margin?: number;
}

// ==================== 水印 ====================

/** 水印位置 */
type WatermarkPosition =
  | 'center'
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'
  | 'repeat';

/** 水印配置 */
export interface WatermarkConfig {
  /** 是否启用水印 */
  enabled: boolean;

  /** 水印类型 */
  type: 'text' | 'image';

  // --- 文字水印 ---

  /** 水印文字内容 */
  text?: string;

  /** 字号，默认 24 */
  fontSize?: number;

  /** 字体，默认 `Arial` */
  fontFamily?: string;

  /** 字体颜色，默认 `#cccccc` */
  fontColor?: string;

  /** 字体粗细 */
  fontWeight?: 'normal' | 'bold';

  // --- 图片水印 ---

  /** 水印图片 URL */
  imageUrl?: string;

  /** 图片宽度 (px) */
  imageWidth?: number;

  /** 图片高度 (px) */
  imageHeight?: number;

  // --- 通用配置 ---

  /** 透明度 0-1，默认 0.3 */
  opacity: number;

  /** 旋转角度（度），默认 -30 */
  rotate: number;

  /** 水印位置 */
  position: WatermarkPosition;

  /** X 轴偏移 */
  offsetX?: number;

  /** Y 轴偏移 */
  offsetY?: number;

  /** 重复模式下的间距，默认 200 */
  spacing?: number;
}

// ==================== PDF 模板 ====================

/** PDF 模板配置 */
export interface PDFTemplateConfig {
  /** 页面大小 */
  pageSize: 'a4' | 'letter' | 'legal';

  /** 页面方向 */
  orientation: 'portrait' | 'landscape';

  /** 页边距 (mm) */
  margins: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };

  /** 页眉配置 */
  header?: {
    enabled: boolean;
    height: number;
    logo?: {
      url: string;
      width: number;
      height: number;
      position: 'left' | 'center' | 'right';
    };
    title?: {
      text: string;
      fontSize: number;
      fontColor: string;
      position: 'left' | 'center' | 'right';
    };
    line?: {
      enabled: boolean;
      color: string;
      width: number;
    };
  };

  /** 页脚配置 */
  footer?: {
    enabled: boolean;
    height: number;
    pageNumber?: {
      enabled: boolean;
      format: 'page' | 'page-total' | 'custom';
      customFormat?: string;
      position: 'left' | 'center' | 'right';
    };
    text?: {
      text: string;
      fontSize: number;
      fontColor: string;
      position: 'left' | 'center' | 'right';
    };
    line?: {
      enabled: boolean;
      color: string;
      width: number;
    };
  };

  /** 内容区域配置 */
  content: {
    backgroundColor?: string;
    columns?: number;
    columnGap?: number;
  };
}

// ==================== 后端数据 ====================

/** 竞品分析系统产出的项目分析结果（标准输入格式） */
export interface AnalysisReport {
  /** 报告基本信息 */
  meta: {
    title: string;
    subtitle?: string;
    generatedAt: string;
    totalProjects: number;
  };

  /** 统计摘要 */
  summary: {
    avgScore: number;
    sGradeCount: number;
    aGradeCount: number;
    bGradeCount: number;
    cGradeCount: number;
    dimensionScores: Record<string, number>;
  };

  /** 项目明细列表 */
  projects: Array<AnalysisProject>;
}

/** 单个项目的分析结果 */
export interface AnalysisProject {
  /** 唯一标识 */
  id: string;

  /** 项目名称 */
  name: string;

  /** 项目主页 URL */
  url?: string;

  /** 综合评分 (0-10) */
  score: number;

  /** 评级 */
  grade: 'S' | 'A' | 'B' | 'C';

  /** 项目简介（AI 生成） */
  description: string;

  /** 各维度评分 */
  dimensionScores: {
    activity: number;
    community: number;
    codeQuality: number;
    documentation: number;
    innovation: number;
    maturity: number;
  };

  /** 审计标记 */
  flags?: string[];
}