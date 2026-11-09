import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Download,
  FileText,
  LockKeyhole,
  ShieldCheck,
  Trash2,
} from 'lucide-react'
import { useApp } from '../../store/AppContext'
import { DAY_LABELS } from '../../data/mockData'
import { Button, Card, InfoCallout, PageHeader, RiskBadge, SectionHeading, cn } from '../../components/ui'
import { LineChart } from '../../components/charts'

type Tab = 'assessments' | 'alerts' | 'interventions' | 'privacy'

export default function MyRecords() {
  const { currentEmployee, assessments, alerts, interventions, addToast } = useApp()
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('assessments')

  const myAssessments = assessments.filter((assessment) => assessment.employeeId === currentEmployee.id)
  const myAlerts = alerts.filter((alert) => alert.employeeId === currentEmployee.id)
  const myInterventions = interventions.filter((task) => task.employeeId === currentEmployee.id)
  const trend = currentEmployee.trend7.map((value, index) => ({ label: DAY_LABELS[index], value }))

  return (
    <div className="records-page">
      <PageHeader
        eyebrow="我的记录"
        title="你的状态变化，都在这里"
        description="查看测评、预警、干预历史，以及谁在什么时间访问过你的数据。"
        actions={<Button icon={<ClipboardList size={15} />} onClick={() => navigate('/employee/assessment/quick')}>开始新测评</Button>}
      />

      <Card className="records-summary">
        <div className="records-summary-copy">
          <span className="card-kicker">过去 7 天</span>
          <h2>风险从 42 上升到 {currentEmployee.riskScore}，主要受恢复不足影响</h2>
          <p>你完成了 {myAssessments.length} 次测评、{myInterventions.filter((task) => task.status === 'completed').length} 次干预。建议今天优先安排恢复。</p>
        </div>
        <LineChart
          data={trend}
          height={150}
          min={0}
          max={100}
          thresholds={[
            { value: 75, label: '严重' },
            { value: 50, label: '高风险' },
            { value: 25, label: '关注' },
          ]}
          ariaLabel="过去 7 天风险趋势"
        />
      </Card>

      <div className="records-tabs" role="tablist" aria-label="记录分类">
        {[
          ['assessments', '测评记录'],
          ['alerts', '预警记录'],
          ['interventions', '干预记录'],
          ['privacy', '数据与隐私'],
        ].map(([key, label]) => (
          <button key={key} className={cn(tab === key && 'is-active')} onClick={() => setTab(key as Tab)} role="tab" aria-selected={tab === key}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'assessments' && (
        <Card className="record-list-card">
          <SectionHeading title="测评记录" description="评分与有效性由系统自动记录" action={<span className="muted-badge">{myAssessments.length} 条</span>} />
          <div className="record-timeline">
            {myAssessments.map((record) => (
              <div key={record.id} className="record-timeline-item">
                <span className="record-dot" />
                <div className="record-time">{record.createdAt}</div>
                <div className="record-body">
                  <div className="record-body-top">
                    <strong>{record.type}</strong>
                    <RiskBadge level={record.riskLevel} size="sm" />
                    <span className="record-score">{record.riskScore}<small>/100</small></span>
                  </div>
                  <p>{record.summary}</p>
                  <div className="record-meta">
                    <span>VAS-F {record.vasF}</span>
                    <span>KSS {record.kss}/9</span>
                    <span>PVT {record.pvtScore}</span>
                    <span>{record.validity}</span>
                  </div>
                </div>
                <button className="record-link" onClick={() => navigate('/employee/assessment/report')}>
                  查看报告 <ArrowRight size={13} />
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {tab === 'alerts' && (
        <Card className="record-list-card">
          <SectionHeading title="预警记录" description="预警原因、响应与解除过程" action={<span className="muted-badge">{myAlerts.length} 条</span>} />
          <div className="record-timeline">
            {myAlerts.map((alert) => (
              <div key={alert.id} className="record-timeline-item">
                <span className={cn('record-dot', `dot-${alert.level}`)} />
                <div className="record-time">{alert.createdAt}</div>
                <div className="record-body">
                  <div className="record-body-top">
                    <strong>{alert.title}</strong>
                    <RiskBadge level={alert.level} size="sm" />
                    <span className="record-status">{alert.status === 'resolved' ? '已解除' : alert.status === 'pending' ? '待确认' : '处理中'}</span>
                  </div>
                  <p>{alert.reason}</p>
                  <div className="record-meta">
                    <span>负责人：{alert.assignee}</span>
                    <span>响应时限：{alert.slaMinutes} 分钟</span>
                  </div>
                </div>
                <button className="record-link" onClick={() => navigate('/employee/intervention')}>
                  查看处置 <ArrowRight size={13} />
                </button>
              </div>
            ))}
            {myAlerts.length === 0 && <div className="empty-inline">还没有预警记录。</div>}
          </div>
        </Card>
      )}

      {tab === 'interventions' && (
        <Card className="record-list-card">
          <SectionHeading title="干预记录" description="休息动作与复测效果" action={<span className="muted-badge">{myInterventions.length} 条</span>} />
          <div className="data-table-wrap">
            <table className="data-table">
              <thead><tr><th>时间</th><th>干预</th><th>原因</th><th>时长</th><th>干预前</th><th>复测后</th><th>状态</th></tr></thead>
              <tbody>
                {myInterventions.map((task) => (
                  <tr key={task.id}>
                    <td>{task.createdAt}</td>
                    <td>{task.type}</td>
                    <td>{task.reason}</td>
                    <td>{task.durationMinutes} 分钟</td>
                    <td>{task.preScore}</td>
                    <td className="td-strong">{task.postScore ?? '—'}</td>
                    <td><span className={cn('record-status', task.status === 'completed' && 'is-done')}>{task.status === 'completed' ? '已完成' : task.status === 'in_progress' ? '进行中' : task.status === 'pending_retest' ? '待复测' : '待处理'}</span></td>
                  </tr>
                ))}
                {myInterventions.length === 0 && <tr><td colSpan={7}><span className="empty-inline">还没有干预记录。</span></td></tr>}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === 'privacy' && (
        <div className="privacy-grid">
          <Card className="privacy-card">
            <SectionHeading title="授权与访问" description="你始终可以知道数据如何被使用" icon={<LockKeyhole size={18} />} />
            <div className="privacy-status">
              <span className="privacy-icon"><ShieldCheck size={20} /></span>
              <div><strong>数据授权有效</strong><span>授权版本 v1.2 · 2026-01-12 签署</span></div>
              <span className="status-online"><span /> 生效中</span>
            </div>
            <div className="privacy-list">
              <div><span>健康数据用途</span><strong>职业疲劳风险管理</strong></div>
              <div><span>班组长可见范围</span><strong>风险摘要与处置状态</strong></div>
              <div><span>职业健康专员</span><strong>严重风险复核时可见明细</strong></div>
              <div><span>保留期限</span><strong>原始数据 12 个月</strong></div>
            </div>
            <InfoCallout tone="good" icon={<CheckCircle2 size={16} />}>
              系统不会将疲劳数据用于绩效、薪酬或纪律处分。
            </InfoCallout>
            <div className="privacy-actions">
              <Button variant="secondary" icon={<Download size={15} />} onClick={() => addToast({ title: '数据导出请求已提交', description: '演示环境不生成真实文件。', tone: 'info' })}>导出我的数据</Button>
              <Button variant="ghost" icon={<Trash2 size={15} />} onClick={() => addToast({ title: '已打开撤回授权流程', description: '正式环境需二次确认并遵循法定保留要求。', tone: 'warning' })}>撤回授权</Button>
            </div>
          </Card>

          <Card className="privacy-card">
            <SectionHeading title="近期访问记录" description="谁在什么时间查看了你的数据" icon={<FileText size={18} />} />
            <div className="access-list">
              <div><span className="access-avatar">李</span><div><strong>李建国 · 班组长</strong><span>今天 14:21 · 处置高风险预警</span></div><span className="access-tag">风险摘要</span></div>
              <div><span className="access-avatar">系</span><div><strong>风险引擎</strong><span>今天 14:18 · 自动计算风险快照</span></div><span className="access-tag">系统</span></div>
              <div><span className="access-avatar">王</span><div><strong>王医生 · 职业健康</strong><span>11-08 22:10 · 复核关注级预警</span></div><span className="access-tag">授权明细</span></div>
            </div>
            <button className="text-link" onClick={() => addToast({ title: '访问日志已展开', description: '演示环境展示最近 3 条记录。', tone: 'info' })}>查看完整访问日志 <ArrowRight size={13} /></button>
          </Card>
        </div>
      )}
    </div>
  )
}
