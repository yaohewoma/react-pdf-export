/**
 * full-export-page.tsx — 完整可运行的生产级 PDF 导出页面模板
 *
 * 用法：
 *   1. 将 useExportPdf.ts 复制到 src/hooks/useExportPdf.ts
 *   2. 将 ExportButton.tsx 复制到 src/components/ExportButton.tsx
 *   3. 将本文件复制到 src/pages/Dashboard.tsx（或任意页面组件）
 *   4. 替换 reportData 为你的实际数据
 *   5. npm run dev → 点击"导出 PDF"验证
 *
 * 导出内容包括：
 *   - 统计卡片（分析项目数、S 级占比等）
 *   - 评分分布柱状图（SVG 图表自动转换为图片嵌入 PDF）
 *   - 项目详情数据表
 *   - 标题、副标题、页码页脚
 */

import React, { useState, useCallback } from 'react'
import { useExportPdf } from '../hooks/useExportPdf'
import { ExportButton } from '../components/ExportButton'

// ==================== 示例数据（替换为你的实际数据） ====================

interface ProjectSummary {
  name: string
  score: number
  grade: string
  description: string
}

const reportData = {
  title: '竞品分析报告',
  subtitle: '2024 年度 Q4 市场分析',
  stats: {
    totalProjects: 156,
    avgScore: 7.2,
    sGradeCount: 23,
    aGradeCount: 58,
    bGradeCount: 49,
    cGradeCount: 26,
  },
  projects: [
    { name: 'Project Alpha', score: 8.7, grade: 'S', description: 'AI 驱动的数据分析平台，功能全面' },
    { name: 'Project Beta', score: 8.2, grade: 'S', description: '实时协作白板，用户体验优秀' },
    { name: 'Project Gamma', score: 7.9, grade: 'A', description: '低代码平台，生态丰富' },
    { name: 'Project Delta', score: 7.5, grade: 'A', description: '云原生微服务框架' },
    { name: 'Project Epsilon', score: 6.8, grade: 'B', description: 'DevOps 工具链集成平台' },
    { name: 'Project Zeta', score: 6.3, grade: 'B', description: '开源 CMS 系统' },
    { name: 'Project Eta', score: 5.8, grade: 'C', description: '基础监控面板' },
    { name: 'Project Theta', score: 5.2, grade: 'C', description: '静态文档生成器' },
  ] as ProjectSummary[],
}

// ==================== 辅助组件：简单 SVG 柱状图 ====================

/** 评分分布柱状图（纯 SVG，导出时自动转换为图片） */
function ScoreDistributionChart({ stats }: { stats: typeof reportData.stats }) {
  const grades = [
    { label: 'S 级', value: stats.sGradeCount, color: '#22c55e' },
    { label: 'A 级', value: stats.aGradeCount, color: '#3b82f6' },
    { label: 'B 级', value: stats.bGradeCount, color: '#f59e0b' },
    { label: 'C 级', value: stats.cGradeCount, color: '#ef4444' },
  ]
  const maxValue = Math.max(...grades.map(g => g.value), 1)
  const chartWidth = 400
  const chartHeight = 180
  const barWidth = 60
  const gap = (chartWidth - grades.length * barWidth) / (grades.length + 1)
  const baseline = chartHeight - 25

  return (
    <svg width={chartWidth} height={chartHeight + 30} className="w-full max-w-md">
      {/* Y 轴网格线 */}
      {[0, 0.25, 0.5, 0.75, 1].map(ratio => (
        <line
          key={ratio}
          x1={0} y1={baseline - (baseline - 20) * ratio}
          x2={chartWidth} y2={baseline - (baseline - 20) * ratio}
          stroke="#334155" strokeWidth={0.5} strokeDasharray="4 4"
        />
      ))}
      {grades.map((grade, i) => {
        const barHeight = (grade.value / maxValue) * (baseline - 20)
        const x = gap + i * (barWidth + gap)
        return (
          <g key={grade.label}>
            <rect
              x={x} y={baseline - barHeight}
              width={barWidth} height={barHeight}
              fill={grade.color} rx={4} opacity={0.85}
            />
            <text
              x={x + barWidth / 2} y={baseline - barHeight - 6}
              textAnchor="middle" fontSize={13} fontWeight="bold" fill="#e2e8f0"
            >
              {grade.value}
            </text>
            <text
              x={x + barWidth / 2} y={baseline + 18}
              textAnchor="middle" fontSize={12} fill="#94a3b8"
            >
              {grade.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

// ==================== 主组件 ====================

/**
 * Dashboard 导出页面
 *
 * 完整演示了 useExportPdf + ExportButton 的接入方式，
 * 包含统计卡片、SVG 图表（自动转换）和项目数据表。
 * 复制此文件后替换 reportData 即可运行。
 */
export default function DashboardPage() {
  const { containerRef, exportToPdf, exporting, cancelExport } = useExportPdf()
  const [progress, setProgress] = useState<{ phase: string; percent: number } | null>(null)

  /** 处理导出 */
  const handleExport = useCallback(() => {
    exportToPdf({
      title: reportData.title,
      subtitle: reportData.subtitle,
      fileName: `竞品分析报告_${new Date().toISOString().slice(0, 10)}.pdf`,
      scale: 2,
      backgroundColor: '#0f172a',
      onProgress: (phase, percent) => {
        setProgress({ phase, percent })
        if (percent >= 100) {
          setTimeout(() => setProgress(null), 1500)
        }
      },
      onError: (msg) => {
        console.error('导出失败:', msg)
        alert('导出失败: ' + msg)
      },
    })
  }, [exportToPdf])

  /** 评级徽章颜色映射 */
  const gradeBadgeClass = (grade: string) => {
    switch (grade) {
      case 'S': return 'bg-green-500/20 text-green-400 border-green-500/30'
      case 'A': return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      case 'B': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      case 'C': return 'bg-red-500/20 text-red-400 border-red-500/30'
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6">
      {/* ===== 工具栏 ===== */}
      <div className="max-w-5xl mx-auto mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">{reportData.title}</h1>
          <p className="text-sm text-slate-400">{reportData.subtitle}</p>
        </div>
        <div className="flex items-center gap-3">
          {/* 导出进度条 */}
          {progress && (
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <span>{progress.phase}</span>
              <div className="w-24 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
              <span className="text-indigo-400 font-mono">{progress.percent}%</span>
            </div>
          )}
          {/* 导出按钮 */}
          <ExportButton
            onClick={handleExport}
            exporting={exporting}
            onCancel={cancelExport}
          />
        </div>
      </div>

      {/* ===== 导出区域 ===== */}
      <div ref={containerRef} className="max-w-5xl mx-auto space-y-6">
        {/* 标题区 */}
        <div className="mb-4">
          <h2 className="text-2xl font-bold">{reportData.title}</h2>
          <p className="text-slate-400 mt-1">{reportData.subtitle}</p>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="分析项目数" value={reportData.stats.totalProjects} unit="个" color="indigo" />
          <StatCard label="平均评分" value={reportData.stats.avgScore} unit="分" color="emerald" />
          <StatCard label="S 级占比" value={`${((reportData.stats.sGradeCount / reportData.stats.totalProjects) * 100).toFixed(1)}`} unit="%" color="green" />
          <StatCard label="A+B 级占比" value={`${(((reportData.stats.aGradeCount + reportData.stats.bGradeCount) / reportData.stats.totalProjects) * 100).toFixed(1)}`} unit="%" color="amber" />
        </div>

        {/* 评分分布图 */}
        <div className="rounded-xl border border-slate-700/50 bg-slate-800/50 p-6">
          <h3 className="text-lg font-semibold mb-4">评分分布</h3>
          <ScoreDistributionChart stats={reportData.stats} />
        </div>

        {/* 项目详情表 */}
        <div className="rounded-xl border border-slate-700/50 bg-slate-800/50 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-700/50">
            <h3 className="text-lg font-semibold">项目详情</h3>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700/50 text-left text-sm text-slate-400">
                <th className="px-6 py-3 font-medium">项目名称</th>
                <th className="px-6 py-3 font-medium text-center">评分</th>
                <th className="px-6 py-3 font-medium text-center">等级</th>
                <th className="px-6 py-3 font-medium">简介</th>
              </tr>
            </thead>
            <tbody>
              {reportData.projects.map((project) => (
                <tr key={project.name} className="border-b border-slate-700/30 text-sm hover:bg-slate-700/20 transition-colors">
                  <td className="px-6 py-3 font-medium">{project.name}</td>
                  <td className="px-6 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${(project.score / 10) * 100}%`,
                            backgroundColor: project.score >= 8 ? '#22c55e' : project.score >= 7 ? '#3b82f6' : project.score >= 6 ? '#f59e0b' : '#ef4444',
                          }}
                        />
                      </div>
                      <span className="font-mono text-slate-300 w-8 text-right">{project.score}</span>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium border ${gradeBadgeClass(project.grade)}`}>
                      {project.grade}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-slate-400">{project.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 页脚 */}
        <div className="text-center text-xs text-slate-500 py-4 border-t border-slate-700/50">
          本报告由竞品分析系统自动生成
        </div>
      </div>
    </div>
  )
}

// ==================== 辅助组件：统计卡片 ====================

/** 统计卡片（深色主题） */
function StatCard({
  label,
  value,
  unit,
  color,
}: {
  label: string
  value: string | number
  unit: string
  color: 'indigo' | 'emerald' | 'green' | 'amber'
}) {
  const colorMap = {
    indigo: { bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/20' },
    emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
    green: { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/20' },
    amber: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
  }
  const c = colorMap[color]

  return (
    <div className={`rounded-xl border ${c.border} ${c.bg} p-4`}>
      <div className="text-xs text-slate-400 mb-1">{label}</div>
      <div className="flex items-baseline gap-1">
        <span className={`text-2xl font-bold ${c.text}`}>{value}</span>
        <span className="text-sm text-slate-500">{unit}</span>
      </div>
    </div>
  )
}