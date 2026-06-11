/**
 * SVG 图表导出示例
 * 演示如何导出包含 SVG 柱状图和饼图的页面
 * SVG 图表会在 onclone 回调中自动转换为 <img>，无需手动处理
 *
 * 前置条件：
 *   1. 已复制 useExportPdf.ts → src/hooks/useExportPdf.ts
 *   2. 已复制 ExportButton.tsx → src/components/ExportButton.tsx
 *   3. 已安装依赖：npm install html2canvas jspdf
 */
import React from 'react'
import { useExportPdf } from '../hooks/useExportPdf'
import { ExportButton } from '../components/ExportButton'

// 示例数据
const chartData = [
  { name: '1月', value: 400 },
  { name: '2月', value: 300 },
  { name: '3月', value: 600 },
  { name: '4月', value: 800 },
  { name: '5月', value: 500 },
]

// 简单的 SVG 柱状图组件（纯 SVG，导出时自动转为图片）
function BarChart({ data }: { data: typeof chartData }) {
  const maxValue = Math.max(...data.map(d => d.value))
  const barWidth = 60
  const chartHeight = 200
  const chartWidth = data.length * (barWidth + 20)

  return (
    <svg width={chartWidth} height={chartHeight + 40} className="mt-4">
      {data.map((item, index) => {
        const barHeight = (item.value / maxValue) * chartHeight
        const x = index * (barWidth + 20) + 10
        const y = chartHeight - barHeight

        return (
          <g key={item.name}>
            <rect
              x={x} y={y}
              width={barWidth} height={barHeight}
              fill="#3b82f6" rx={4}
            />
            <text
              x={x + barWidth / 2} y={y - 5}
              textAnchor="middle" fontSize={12} fill="#374151"
            >
              {item.value}
            </text>
            <text
              x={x + barWidth / 2} y={chartHeight + 20}
              textAnchor="middle" fontSize={12} fill="#6b7280"
            >
              {item.name}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// 简单的 SVG 饼图组件（纯 SVG，导出时自动转为图片）
function PieChart({ data }: { data: typeof chartData }) {
  const total = data.reduce((sum, d) => sum + d.value, 0)
  let currentAngle = 0
  const centerX = 150
  const centerY = 150
  const radius = 120
  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

  return (
    <svg width={300} height={300} className="mt-4">
      {data.map((item, index) => {
        const angle = (item.value / total) * 360
        const startAngle = currentAngle
        const endAngle = currentAngle + angle
        currentAngle = endAngle

        const startRad = (startAngle * Math.PI) / 180
        const endRad = (endAngle * Math.PI) / 180

        const x1 = centerX + radius * Math.cos(startRad)
        const y1 = centerY + radius * Math.sin(startRad)
        const x2 = centerX + radius * Math.cos(endRad)
        const y2 = centerY + radius * Math.sin(endRad)

        const largeArcFlag = angle > 180 ? 1 : 0

        const pathData = [
          `M ${centerX} ${centerY}`,
          `L ${x1} ${y1}`,
          `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
          'Z'
        ].join(' ')

        return (
          <path
            key={item.name}
            d={pathData}
            fill={colors[index % colors.length]}
            stroke="white"
            strokeWidth={2}
          />
        )
      })}
    </svg>
  )
}

export default function SvgChartExportDemo() {
  const { containerRef, exportToPdf, exporting } = useExportPdf()

  const handleExport = () => {
    exportToPdf({
      title: 'SVG 图表导出示例',
      subtitle: '包含柱状图和饼图，SVG 自动转换为图片',
      fileName: 'svg-chart-demo.pdf'
    })
  }

  return (
    <div className="p-8">
      <ExportButton onClick={handleExport} exporting={exporting} />

      <div ref={containerRef} className="mt-4 p-6 bg-white rounded-lg shadow">
        <h1 className="text-2xl font-bold mb-2">SVG 图表导出示例</h1>
        <p className="text-gray-500 mb-6">演示如何导出包含 SVG 图表的页面</p>

        <div className="grid grid-cols-2 gap-8">
          {/* 柱状图 */}
          <div>
            <h2 className="text-lg font-semibold mb-2">柱状图</h2>
            <BarChart data={chartData} />
          </div>

          {/* 饼图 */}
          <div>
            <h2 className="text-lg font-semibold mb-2">饼图</h2>
            <PieChart data={chartData} />
          </div>
        </div>

        {/* 数据表格 */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-2">数据详情</h2>
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="p-2 text-left">月份</th>
                <th className="p-2 text-right">数值</th>
                <th className="p-2 text-right">占比</th>
              </tr>
            </thead>
            <tbody>
              {chartData.map((item) => {
                const total = chartData.reduce((sum, d) => sum + d.value, 0)
                const percentage = ((item.value / total) * 100).toFixed(1)
                return (
                  <tr key={item.name} className="border-t">
                    <td className="p-2">{item.name}</td>
                    <td className="p-2 text-right">{item.value}</td>
                    <td className="p-2 text-right">{percentage}%</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}