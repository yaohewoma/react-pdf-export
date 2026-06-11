# react-pdf-export

> **一句话**：一行代码解决 TailwindCSS v4 的 oklch 报错

React PDF 导出方案，解决从 React 组件到专业 PDF 报告的所有痛点：TailwindCSS v4 oklch 兼容、SVG 图表自动转换、智能分页和水印。

## 快速开始

```bash
# 查看示例
cat examples/

# 安装依赖
npm install @react-pdf/renderer html2canvas

# 使用 Hook
import { useExportPdf } from './hooks/useExportPdf';
```

## 模块地图

| 目录/文件 | 说明 |
|-----------|------|
| `SKILL.md` | Skill 主文档 |
| `examples/` | 使用示例 (2 个 tsx) |
| `references/` | 参考实现和设计文档 |
| `tests/` | 测试用例 |
| `CHANGELOG.md` | 变更日志 |

## 核心能力

- TailwindCSS v4 oklch 颜色自动转 RGB
- SVG / Chart.js 图表转 Canvas 再入 PDF
- 自动分页 + 封面 + 水印 + 目录
- `useExportPdf()` Hook 一行集成

## 适用场景

- React 管理后台报告导出
- 数据仪表盘 PDF 输出
- 需要专业排版 PDF 的场景

## GitHub

https://github.com/yaohewoma/react-pdf-export