import { useMemo, useState } from 'react'
import {
  CalendarDays,
  Download,
  FileBarChart,
  FileText,
  Plus,
  Printer,
  ShieldCheck,
} from 'lucide-react'
import { useApp } from '../../store/AppContext'
import { ORG_TREND, TEAMS } from '../../data/mockData'
import type { RiskLevel } from '../../types'
import { Button, Card, FormField, Modal, PageHeader, SectionHeading, cn } from '../../components/ui'
import { LineChart, SegmentedRiskBar } from '../../components/charts'

interface ReportItem {
  id: string
  name: string
  type: '周报' | '月报' | '自定义报告'
  period: string
  createdAt: string
  status: '已生成' | '生成中'
  scope: string
}

const INITIAL_REPORTS: ReportItem[] = [
  { id: 'report-001', name: '生产一部职业疲劳风险周报', type: '周报', period: '2026-11-03 至 2026-11-09', createdAt: '今天 09:00', status: '已生成', scope: '生产一部 · 全部班组' },
  { id: 'report-002', name: '生产一部职业疲劳风险月报', type: '月报', period: '2026-10-01 至 2026-10-31', createdAt: '11-01 08:30', status: '已生成', scope: '生产一部 · 全部班组' },
  { id: 'report-003', name: '夜班疲劳风险专项分析', type: '自定义报告', period: '2026-10-15 至 2026-11-08', createdAt: '11-08 17:20', status: '已生成', scope: '运行一班、运行二班 · 夜班' },
]

export default function Reports() {
  const { employees, alerts, interventions, addToast } = useApp()
  const [reports, setReports] = useState<ReportItem[]>(INITIAL_REPORTS)
  const [generateOpen, setGenerateOpen] = useState(false)
  const [reportType, setReportType] = useState<ReportItem['type']>('周报')
  const [scope, setScope] = useState('生产一部 · 全部班组')
  const [activeReport, setActiveReport] = useState(reports[0])

  const counts = useMemo(() => {
    const result: Record<RiskLevel, number> = { low: 0, attention: 0, high: 0, severe: 0, pending: 0 }
    employees.filter((employee) => employee.status === 'active').forEach((employee) => {
      result[employee.riskLevel] += 1
    })
    return result
  }, [employees])

  const totalWithRisk = counts.low + counts.attention + counts.high + counts.severe
  const highSevere = counts.high + counts.severe
  const completed = interventions.filter((task) => task.status === 'completed').length
  const due = interventions.filter((task) => task.status !== 'cancelled').length
  const completionRate = due ? Math.round((completed / due) * 100) : 0
  const teamHigh = TEAMS.map((team) => {
    const members = employees.filter((employee) => employee.status === 'active' && employee.teamId === team.id)
    const high = members.filter((employee) => ['high', 'severe'].includes(employee.riskLevel)).length
    return { name: team.name, count: high, members: members.length, rate: members.length ? Math.round((high / members.length) * 100) : 0 }
  }).sort((a, b) => b.rate - a.rate)

  const generateReport = () => {
    const report: ReportItem = {
      id: `report-${Date.now()}`,
      name: `生产一部职业疲劳风险${reportType}`,
      type: reportType,
      period: '2026-11-03 至 2026-11-09',
      createdAt: '刚刚',
      status: '已生成',
      scope,
    }
    setReports((current) => [report, ...current])
    setActiveReport(report)
    setGenerateOpen(false)
    addToast({ title: '报告已生成', description: '可在下方预览并导出。', tone: 'success' })
  }

  const trend = ORG_TREND.map((point) => ({ label: point.label, value: point.value }))

  return (
    <div className="reports-page">
      <PageHeader
        eyebrow="复盘与报告"
        title="报告中心"
        description="生成周报、月报和专项分析，复盘风险变化、干预效果与排班改进建议。"
        actions={
          <>
            <Button variant="secondary" icon={<Printer size={15} />} onClick={() => window.print()}>打印报告</Button>
            <Button icon={<Plus size={16} />} onClick={() => setGenerateOpen(true)}>生成报告</Button>
          </>
        }
      />

      <div className="report-summary-strip">
        <div><span><FileBarChart size={17} /> 报告总数</span><strong>{reports.length}</strong><em>周报 + 月报 + 专项</em></div>
        <div><span>本周高风险</span><strong>{highSevere}</strong><em>占有效评估 {totalWithRisk ? Math.round((highSevere / totalWithRisk) * 100) : 0}%</em></div>
        <div><span>干预完成率</span><strong>{completionRate}%</strong><em>{completed} / {due} 个任务</em></div>
        <div><span>数据截止</span><strong>11-09</strong><em>14:00 · Asia/Shanghai</em></div>
      </div>

      <div className="reports-layout">
        <Card className="report-preview-card">
          <div className="report-preview-toolbar">
            <div>
              <span className="card-kicker">报告预览</span>
              <h2>{activeReport.name}</h2>
              <p>{activeReport.period} · {activeReport.scope} · 生成于 {activeReport.createdAt}</p>
            </div>
            <Button size="sm" variant="secondary" icon={<Download size={14} />} onClick={() => addToast({ title: '报告下载已准备', description: '演示环境不生成真实文件。', tone: 'info' })}>导出</Button>
          </div>

          <div className="report-mock-cover">
            <div className="report-mock-brand"><span className="brand-mark"><FileText size={16} /></span> SafePulse · 职业疲劳智能预警监测系统</div>
            <h1>生产一部职业疲劳风险{activeReport.type}</h1>
            <p>{activeReport.period} · 数据截止 2026-11-09 14:00</p>
            <span className="report-confidential-pill"><ShieldCheck size={14} /> 内部保密 · 仅限授权人员</span>
          </div>

          <section className="report-mock-section">
            <h3>执行摘要</h3>
            <div className="report-mock-highlights">
              <div><span>有效评估员工</span><strong>{totalWithRisk}</strong></div>
              <div><span>高风险 + 严重</span><strong>{highSevere}</strong></div>
              <div><span>未关闭预警</span><strong>{alerts.filter((alert) => !['resolved', 'closed', 'false_positive'].includes(alert.status)).length}</strong></div>
              <div><span>干预完成率</span><strong>{completionRate}%</strong></div>
            </div>
            <p>本周期风险整体呈上升趋势，高风险主要集中在夜班与连续作业人群。建议优先关注运行一班与检修班，优化夜班中段休息安排，并对高风险员工完成复测闭环。</p>
          </section>

          <section className="report-mock-section">
            <h3>风险等级分布</h3>
            <SegmentedRiskBar counts={counts} total={totalWithRisk} compact />
          </section>

          <section className="report-mock-section">
            <h3>风险趋势</h3>
            <LineChart
              data={trend}
              height={180}
              min={0}
              max={100}
              unit=" 分"
              thresholds={[{ value: 50, label: '预警线' }]}
              ariaLabel="报告周期疲劳风险趋势"
            />
          </section>

          <section className="report-mock-section report-two-col-mock">
            <div>
              <h3>班组风险对比</h3>
              <div className="report-team-list">
                {teamHigh.map((team) => (
                  <div key={team.name} className="report-team-row">
                    <span>{team.name}</span>
                    <span className="report-team-bar"><span style={{ width: `${team.rate}%` }} /></span>
                    <strong>{team.rate}%</strong>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3>主要风险因素</h3>
              <div className="report-factor-list">
                <div><span>HRV 低于基线</span><strong>31 次</strong></div>
                <div><span>主观困倦 KSS ≥ 7</span><strong>24 次</strong></div>
                <div><span>PVT 注意中断</span><strong>19 次</strong></div>
                <div><span>连续夜班 ≥ 3 天</span><strong>16 次</strong></div>
              </div>
            </div>
          </section>

          <section className="report-mock-section">
            <h3>干预效果</h3>
            <div className="report-intervention-row">
              <div><span>已完成干预</span><strong>{completed}</strong></div>
              <div><span>复测改善率</span><strong>78%</strong></div>
              <div><span>平均响应时长</span><strong>6.2 分钟</strong></div>
              <div><span>逾期任务</span><strong>2</strong></div>
            </div>
            <p>已完成任务的复测改善率为 78%，但检修班与物流班的干预完成率低于组织平均，建议加强班组长跟进。</p>
          </section>

          <section className="report-mock-section report-methodology">
            <h3>方法与局限</h3>
            <p>风险分由生理、主观、认知与工作负荷加权计算。数据缺失时降低置信度，不以缺失数据推断低风险。报告用于职业疲劳风险管理，不构成医疗诊断。个人明细仅向授权角色展示。</p>
          </section>
        </Card>

        <div className="reports-side">
          <Card className="report-history-card">
            <SectionHeading title="报告历史" description="生成后可随时查看" />
            <div className="report-history-list">
              {reports.map((report) => (
                <button key={report.id} className={cn('report-history-item', activeReport.id === report.id && 'is-active')} onClick={() => setActiveReport(report)}>
                  <span className="report-history-icon"><FileText size={16} /></span>
                  <span><strong>{report.name}</strong><em>{report.period}</em><span>{report.type} · {report.createdAt}</span></span>
                  <span className={cn('report-status', report.status === '已生成' ? 'is-ready' : 'is-pending')}>{report.status}</span>
                </button>
              ))}
            </div>
          </Card>

          <Card className="report-schedule-card">
            <SectionHeading title="自动报告" description="按计划生成并推送" icon={<CalendarDays size={18} />} />
            <div className="schedule-list">
              <div><span>周报</span><strong>每周一 08:30</strong><em>下周 · 生产一部</em></div>
              <div><span>月报</span><strong>每月 1 日 08:30</strong><em>下月 · 生产一部</em></div>
            </div>
            <Button variant="secondary" size="sm" onClick={() => addToast({ title: '自动报告设置已打开', description: '演示版展示默认计划。', tone: 'info' })}>管理计划</Button>
          </Card>
        </div>
      </div>

      <Modal
        open={generateOpen}
        onClose={() => setGenerateOpen(false)}
        title="生成报告"
        description="报告将使用生成时刻的数据快照，包含聚合结果与方法说明。"
        footer={<><Button variant="secondary" onClick={() => setGenerateOpen(false)}>取消</Button><Button onClick={generateReport} icon={<FileBarChart size={15} />}>生成并预览</Button></>}
      >
        <div className="report-form">
          <FormField label="报告类型">
            <select value={reportType} onChange={(event) => setReportType(event.target.value as ReportItem['type'])}>
              <option>周报</option>
              <option>月报</option>
              <option>自定义报告</option>
            </select>
          </FormField>
          <FormField label="组织范围">
            <select value={scope} onChange={(event) => setScope(event.target.value)}>
              <option>生产一部 · 全部班组</option>
              <option>生产一部 · 运行一班</option>
              <option>生产一部 · 检修班</option>
              <option>生产一部 · 夜班员工</option>
            </select>
          </FormField>
          <FormField label="报告周期">
            <select>
              <option>2026-11-03 至 2026-11-09</option>
              <option>2026-10-01 至 2026-10-31</option>
            </select>
          </FormField>
          <div className="report-form-note">
            <ShieldCheck size={15} />
            报告默认使用聚合数据，个人明细仅向授权角色展示。
          </div>
        </div>
      </Modal>
    </div>
  )
}
