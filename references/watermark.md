# 水印模块

## 概述

为 PDF 导出添加水印功能，支持文字水印和图片水印，可配置位置、透明度、旋转角度等。水印模块（`WatermarkGenerator`）与核心 Hook 完全解耦，可独立使用。

## 配置

```typescript
/** 水印配置 */
interface WatermarkConfig {
  /** 是否启用水印 */
  enabled: boolean;

  /** 水印类型 */
  type: 'text' | 'image';

  // --- 文字水印配置 ---

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

  // --- 图片水印配置 ---

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

  /** 水印位置，默认 `repeat` */
  position: 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'repeat';

  /** X 轴偏移 */
  offsetX?: number;

  /** Y 轴偏移 */
  offsetY?: number;

  /** 重复模式下的间距，默认 200 */
  spacing?: number;
}
```

## 预设配置

```typescript
/** 机密文件水印 */
const CONFIDENTIAL_WATERMARK: WatermarkConfig = {
  enabled: true,
  type: 'text',
  text: '机密文件',
  fontSize: 24,
  fontFamily: 'Arial',
  fontColor: '#cccccc',
  fontWeight: 'normal',
  opacity: 0.3,
  rotate: -30,
  position: 'repeat',
  spacing: 200,
};

/** 草案水印 */
const DRAFT_WATERMARK: WatermarkConfig = {
  enabled: true,
  type: 'text',
  text: 'DRAFT',
  fontSize: 48,
  fontFamily: 'Arial',
  fontColor: '#ff4444',
  fontWeight: 'bold',
  opacity: 0.15,
  rotate: -45,
  position: 'center',
};

/** 公司 Logo 水印 */
const LOGO_WATERMARK: WatermarkConfig = {
  enabled: true,
  type: 'image',
  imageUrl: '/company-logo.png',
  imageWidth: 120,
  imageHeight: 60,
  opacity: 0.2,
  rotate: 0,
  position: 'bottom-right',
  offsetX: -30,
  offsetY: -30,
};
```

## 实现

```typescript
import { jsPDF } from 'jspdf';

interface WatermarkConfig {
  enabled: boolean;
  type: 'text' | 'image';
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontColor?: string;
  fontWeight?: 'normal' | 'bold';
  imageUrl?: string;
  imageWidth?: number;
  imageHeight?: number;
  opacity: number;
  rotate: number;
  position: 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'repeat';
  offsetX?: number;
  offsetY?: number;
  spacing?: number;
}

const DEFAULT_WATERMARK: WatermarkConfig = {
  enabled: false,
  type: 'text',
  text: '机密文件',
  fontSize: 24,
  fontFamily: 'Arial',
  fontColor: '#cccccc',
  fontWeight: 'normal',
  opacity: 0.3,
  rotate: -30,
  position: 'repeat',
  spacing: 200,
};

/**
 * 水印生成器
 *
 * 支持文字水印和图片水印，可配置多种布局模式。
 * 与核心导出 Hook 解耦，独立使用。
 *
 * @example
 * const generator = new WatermarkGenerator({ enabled: true, type: 'text', text: '机密' });
 * const dataUrl = generator.generate(800, 600);
 */
export class WatermarkGenerator {
  private config: WatermarkConfig;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D | null;

  constructor(config: Partial<WatermarkConfig> = {}) {
    this.config = { ...DEFAULT_WATERMARK, ...config };
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
  }

  /**
   * 生成水印 Data URL
   * @param width 画布宽度 (px)
   * @param height 画布高度 (px)
   * @returns 水印图片的 Data URL
   */
  generate(width: number, height: number): string {
    if (!this.ctx) {
      console.warn('[WatermarkGenerator] Canvas 2D context 不可用');
      return '';
    }

    this.canvas.width = width;
    this.canvas.height = height;
    this.ctx.clearRect(0, 0, width, height);

    return this.config.type === 'text'
      ? this.generateTextWatermark(width, height)
      : this.generateImageWatermark(width, height);
  }

  // ==================== 文字水印 ====================

  /** 生成文字水印 */
  private generateTextWatermark(width: number, height: number): string {
    const ctx = this.ctx!;
    const { text = '机密文件', fontSize = 24, fontFamily = 'Arial', fontColor = '#cccccc', fontWeight = 'normal', opacity = 0.3, rotate = -30, position = 'repeat', spacing = 200 } = this.config;

    ctx.globalAlpha = opacity;
    ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
    ctx.fillStyle = fontColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (position === 'repeat') {
      const textWidth = ctx.measureText(text).width;
      const stepX = Math.max(textWidth + spacing, 100);
      const stepY = fontSize * 3;

      for (let y = -height; y < height * 2; y += stepY) {
        for (let x = -width; x < width * 2; x += stepX) {
          this.drawRotated(ctx, 'text', { text }, x, y, rotate);
        }
      }
    } else {
      const pos = this.getPosition(width, height);
      this.drawRotated(ctx, 'text', { text }, pos.x, pos.y, rotate);
    }

    return this.canvas.toDataURL('image/png');
  }

  // ==================== 图片水印 ====================

  /** 生成图片水印 */
  private generateImageWatermark(width: number, height: number): string {
    const { imageUrl, imageWidth = 100, imageHeight = 50, opacity = 0.3, rotate = 0, position = 'repeat' } = this.config;

    if (!imageUrl) {
      console.warn('[WatermarkGenerator] 图片水印缺少 imageUrl');
      return this.canvas.toDataURL('image/png');
    }

    // 图片水印是异步的，同步返回占位 Data URL
    const placeholder = this.canvas.toDataURL('image/png');

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const ctx = this.ctx!;
      ctx.clearRect(0, 0, width, height);
      ctx.globalAlpha = opacity;

      if (position === 'repeat') {
        const stepX = imageWidth * 2;
        const stepY = imageHeight * 2;
        for (let y = 0; y < height; y += stepY) {
          for (let x = 0; x < width; x += stepX) {
            this.drawRotated(ctx, 'image', { img, imageWidth, imageHeight }, x, y, rotate);
          }
        }
      } else {
        const pos = this.getPosition(width, height);
        this.drawRotated(ctx, 'image', { img, imageWidth, imageHeight }, pos.x, pos.y, rotate);
      }
    };

    img.onerror = () => {
      console.warn('[WatermarkGenerator] 水印图片加载失败:', imageUrl);
    };

    img.src = imageUrl;

    return placeholder;
  }

  // ==================== 通用辅助 ====================

  /** 绘制旋转内容 */
  private drawRotated(
    ctx: CanvasRenderingContext2D,
    type: 'text' | 'image',
    data: { text?: string; img?: HTMLImageElement; imageWidth?: number; imageHeight?: number },
    x: number,
    y: number,
    angle: number,
  ): void {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((angle * Math.PI) / 180);

    if (type === 'text' && data.text) {
      ctx.fillText(data.text, 0, 0);
    } else if (type === 'image' && data.img) {
      const w = data.imageWidth || 100;
      const h = data.imageHeight || 50;
      ctx.drawImage(data.img, -w / 2, -h / 2, w, h);
    }

    ctx.restore();
  }

  /** 获取水印位置坐标 */
  private getPosition(width: number, height: number): { x: number; y: number } {
    const { position, offsetX = 0, offsetY = 0 } = this.config;
    const padding = 50;

    switch (position) {
      case 'center':       return { x: width / 2 + offsetX, y: height / 2 + offsetY };
      case 'top-left':     return { x: padding + offsetX, y: padding + offsetY };
      case 'top-right':    return { x: width - padding + offsetX, y: padding + offsetY };
      case 'bottom-left':  return { x: padding + offsetX, y: height - padding + offsetY };
      case 'bottom-right': return { x: width - padding + offsetX, y: height - padding + offsetY };
      default:             return { x: width / 2, y: height / 2 };
    }
  }
}

/**
 * 将水印添加到 PDF 的所有页面
 *
 * @param pdf jsPDF 实例
 * @param watermarkConfig 水印配置
 *
 * @example
 * const pdf = new jsPDF();
 * pdf.text('Hello', 10, 10);
 * addWatermarkToPdf(pdf, CONFIDENTIAL_WATERMARK);
 * pdf.save('document.pdf');
 */
export function addWatermarkToPdf(pdf: jsPDF, watermarkConfig: WatermarkConfig): void {
  if (!watermarkConfig.enabled) return;

  const generator = new WatermarkGenerator(watermarkConfig);
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  // 转换为像素（72 DPI）
  const pixelWidth = Math.round(pageWidth * 72 / 25.4);
  const pixelHeight = Math.round(pageHeight * 72 / 25.4);

  const watermarkDataUrl = generator.generate(pixelWidth, pixelHeight);
  if (!watermarkDataUrl) return;

  const totalPages = pdf.getNumberOfPages();

  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.addImage(watermarkDataUrl, 'PNG', 0, 0, pageWidth, pageHeight);
  }
}
```

## 使用示例

### 文字水印 — 机密文件

```typescript
import { jsPDF } from 'jspdf';
import { addWatermarkToPdf, WatermarkConfig } from './watermark';

const pdf = new jsPDF();
pdf.text('Hello World', 20, 20);

const watermarkConfig: WatermarkConfig = {
  enabled: true,
  type: 'text',
  text: '机密文件',
  fontSize: 24,
  fontColor: '#cccccc',
  opacity: 0.3,
  rotate: -30,
  position: 'repeat',
  spacing: 200,
};

addWatermarkToPdf(pdf, watermarkConfig);
pdf.save('document.pdf');
```

### 图片水印 — 公司 Logo

```typescript
const watermarkConfig: WatermarkConfig = {
  enabled: true,
  type: 'image',
  imageUrl: '/logo.png',
  imageWidth: 100,
  imageHeight: 50,
  opacity: 0.2,
  rotate: 0,
  position: 'bottom-right',
  offsetX: -20,
  offsetY: -20,
};

addWatermarkToPdf(pdf, watermarkConfig);
```

### 集成到 useExportPdf

在导出流程中自动添加水印：

```typescript
const { exportToPdf } = useExportPdf();

const handleExport = async () => {
  await exportToPdf({ title: '报告', fileName: 'report.pdf' });

  // 导出后手动添加水印（如果需要）
  // 注意：useExportPdf 内部直接调用 pdf.save()，
  // 水印需要在 pdf.save() 之前通过自定义 onclone 逻辑添加
};
```

> **注意：** 当前 `useExportPdf` 核心 Hook 暂未内置水印参数。如需在导出时自动添加水印，可修改 `useExportPdf.ts` 中 `pdf.save()` 前的逻辑，调用 `addWatermarkToPdf(pdf, watermarkConfig)`。

## 注意事项

1. **性能**：重复模式水印会增加 PDF 文件体积约 10-30%
2. **图片跨域**：图片水印需处理 CORS（`img.crossOrigin = 'anonymous'`），本地图片不受影响
3. **透明度**：建议在 0.1-0.4 之间，过低失去水印效果，过高影响阅读
4. **文字长度**：中文约 4-6 个字效果最佳，过长的文字在重复模式下会显得拥挤
5. **旋转角度**：建议 ±30°-±45°，完全水平（0°）容易被裁剪掉
6. **图片水印是异步的**：`generate()` 方法对图片水印返回同步占位 Data URL，实际渲染在 `img.onload` 中异步完成。建议在 PDF 保存前确保图片已加载
7. **Canvas 2D 降级**：如果浏览器不支持 Canvas 2D，`generate()` 返回空字符串，不会抛出异常