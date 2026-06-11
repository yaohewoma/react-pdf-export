/**
 * 基础 PDF 导出示例
 * 演示如何使用 useExportPdf Hook 导出包含数据表格和统计卡片的页面
 *
 * 前置条件：
 *   1. 已复制 useExportPdf.ts → src/hooks/useExportPdf.ts
 *   2. 已复制 ExportButton.tsx → src/components/ExportButton.tsx
 *   3. 已安装依赖：npm install html2canvas jspdf
 */
import React from 'react'
import { useExportPdf } from '../hooks/useExportPdf'
import { ExportButton } from '../components/ExportButton'

// 示例数据（替换为你的实际数据）
const reportData = {
  title: '竞品分析报告',
  subtitle: '2024年Q4市场分析',
  stats: [
    { label: '分析项目数', value: '156' },
    { label: '平均评分', value: '7.2' },
    { label: 'S级项目', value: '23' },
  ],
  projects: [
    { name: 'Project A', score: 8.5, grade: 'S' },
    { name: 'Project B', score: 7.2, grade: 'A' },
    { name: 'Project C', score: 6.1, grade: 'B' },
  ]
}

export default function BasicExportDemo() {
  const { containerRef, exportToPdf, exporting } = useExportPdf()

  const handleExport = () => {
    exportToPdf({
      title: reportData.title,
      subtitle: reportData.subtitle,
      fileName: '竞品分析报告.pdf'
    })
  }

  return (
    <div className="p-8">
      {/* 导出按钮 - 会自动隐藏在 PDF 中 */}
      <ExportButton
        onClick={handleExport}
        exporting={exporting}
      />

      {/* 导出区域 */}
      <div ref={containerRef} className="mt-4 p-6 bg-white rounded-lg shadow">
        <h1 className="text-2xl font-bold mb-2">{reportData.title}</h1>
        <p className="text-gray-500 mb-6">{reportData.subtitle}</p>

        {/* 统计卡片 */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {reportData.stats.map((stat) => (
            <div key={stat.label} className="p-4 bg-blue-50 rounded">
              <div className="text-sm text-gray-600">{stat.label}</div>
              <div className="text-2xl font-bold text-blue-600">{stat.value}</div>
            </div>
          ))}
        </div>

        {/* 项目表格 */}
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="p-2 text-left">项目名称</th>
              <th className="p-2 text-right">评分</th>
              <th className="p-2 text-center">等级</th>
            </tr>
          </thead>
          <tbody>
            {reportData.projects.map((project) => (
              <tr key={project.name} className="border-t">
                <td className="p-2">{project.name}</td>
                <td className="p-2 text-right">{project.score}</td>
                <td className="p-2 text-center">
                  <span className={`px-2 py-1 rounded text-sm ${
                    project.grade === 'S' ? 'bg-green-100 text-green-800' :
                    project.grade === 'A' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {project.grade}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}