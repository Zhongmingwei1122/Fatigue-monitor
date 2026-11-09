import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  BrainCircuit,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Download,
  Eye,
  HeartPulse,
  MessageSquare,
  ShieldCheck,
  TimerReset,
  Watch,
  Wind,
} from 'lucide-react'
import { useApp } from '../../store/AppContext'
import { DAY_LABELS } from '../../data/mockData'
import { clamp, getRiskMeta } from '../../lib/risk'
import { Avatar, Button, Card, EmptyState, FormField, Modal, RiskBadge, SectionHeading, cn } from '../../components/ui'
import { BarList, LineChart } from '../../components/charts'

type DetailTab = 'overview' | 'physiology' | 'subjective' | 'cognitive' | 'alerts' | 'interventions'

const TABS: { key: DetailTab; label: string }[] = [
  { key: 'overview', label: '总览' },
  { key: 'physiology', label: '生理数据' },
  { key: 'subjective', label: '主观数据' },
  { key: 'cognitive', label: '认知数据' },
  { key: 'alerts', label: '预警记录' },
  { key: 'interventions', label: '干预记录' },
]

export default function EmployeeDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { employees, alerts, interventions, assignInterventionToEmployee, addToast } = useApp()
  const employee = employees.find((item) => item.id === id)
  const [tab, setTab] = useState<DetailTab>('overview')
  const [interventionOpen, setInterventionOpen] = useState(false)
  const [interventionType, setInterventionType] = useState('20 分钟恢复性休息')
  const [duration, setDuration] = useState(20)

  const employeeAlerts = alerts.filter((alert) => alert.employeeId === id)
  const employeeInterventions = interventions.filter((task) => task.employeeId === id)

  const subjectiveTrend = useMemo(() => {
    if (!employee) return []
    return DAY_LABELS.map((label, index) => ({
      label,
      value: clamp(employee.vasF - (6 - index) * 2 + Math.sin(index) * 3, 0, 100),
    }))
  }, [employee])

  if (!employee) {
    return (
      <EmptyState
        title="未找到员工"
        description="员工可能已被停用或链接失效。"
        action={<Button onClick={() => navigate('/admin/employees')}>返回员工管理</Button>}
      />
    )
  }

  const meta = getRiskMeta(employee.riskLevel)
  const riskTrend = employee.trend7.map((value, index) => ({ label: DAY_LABELS[index], value }))
  const hrvTrend = employee.hrvTrend.map((value, index) => ({ label: DAY_LABELS[index], value }))
  const hrTrend = employee.hrTrend.map((value, index) => ({ label: DAY_LABELS[index], value }))
  const activeAlert = employeeAlerts.find((alert) => !['resolved', 'closed', 'false_positive'].includes(alert.status))
  const pvt = employee.pvtScore
  const vst = clamp(pvt - 9)
  const axcpt = clamp(pvt - 4)

  const submitIntervention = () => {
    assignInterventionToEmployee(employee.id, interventionType, duration)
    setInterventionOpen(false)
  }

  return (
    <div className="employee-detail-page">
      <button className="back-link" onClick={() => navigate('/admin/employees')}>
        <ArrowLeft size={16} /> 返回员工管理
      </button>

      <Card className="employee-profile-card">
        <div className="profile-main">
          <Avatar name={employee.name} color={employee.avatarColor} size="lg" />
          <div className="profile-copy">
            <div className="profile-name-row">
              <h1>{employee.name}</h1>
              <RiskBadge level={employee.riskLevel} />
              {employee.safetySensitive && <span className="profile-tag">安全敏感岗位</span>}
            </div>
            <p>{employee.employeeNo} · {employee.job} · {employee.team}</p>
            <div className="profile-meta">
              <span><CalendarDays size={14} /> {employee.shift} · {employee.shiftStart}–{employee.shiftEnd}</span>
              <span><Watch size={14} /> {employee.device} · {employee.deviceStatus === 'connected' ? '已连接' : employee.deviceStatus === 'offline' ? '离线' : '未佩戴'}</span>
              <span><Clock3 size={14} /> 最近测评 {employee.lastAssessment}</span>
            </div>
          </div>
        </div>
        <div className="profile-actions">
          <Button variant="secondary" icon={<MessageSquare size={15} />} onClick={() => addToast({ title: '已通知员工', description: '站内信与企业微信提醒已发送。', tone: 'success' })}>联系员工</Button>
          <Button icon={<TimerReset size={15} />} onClick={() => setInterventionOpen(true)}>分配干预</Button>
          <Button variant="ghost" icon={<Download size={15} />} onClick={() => addToast({ title: '导出请求已提交', description: '导出含敏感数据，已记录操作日志。', tone: 'info' })}>导出档案</Button>
        </div>
      </Card>

      <div className="employee-detail-kpis">
        <div className="detail-kpi">
          <span>当前风险分</span>
          <strong style={{ color: meta.ink }}>{employee.riskScore}<small>/100</small></strong>
          <em>{meta.label} · {employee.confidence}置信度</em>
        </div>
        <div className="detail-kpi">
          <span>HRV (RMSSD)</span>
          <strong>{employee.hrv}<small> ms</small></strong>
          <em className="text-bad">较基线 {Math.round(((employee.hrv - employee.baselineHrv) / employee.baselineHrv) * 100)}%</em>
        </div>
        <div className="detail-kpi">
          <span>心率</span>
          <strong>{employee.hr}<small> bpm</small></strong>
          <em>基线 {employee.baselineHr} bpm</em>
        </div>
        <div className="detail-kpi">
          <span>KSS / PVT</span>
          <strong>{employee.kss}<small>/9</small></strong>
          <em>PVT 风险分 {pvt}</em>
        </div>
        <div className="detail-kpi">
          <span>数据完整度</span>
          <strong>{employee.dataCompleteness}<small>%</small></strong>
          <em>{employee.confidence}置信度</em>
        </div>
      </div>

      <div className="detail-tabs" role="tablist" aria-label="员工详情分类">
        {TABS.map((item) => (
          <button key={item.key} className={cn(tab === item.key && 'is-active')} onClick={() => setTab(item.key)} role="tab" aria-selected={tab === item.key}>
            {item.label}
            {item.key === 'alerts' && employeeAlerts.length > 0 && <span>{employeeAlerts.length}</span>}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="detail-overview">
          <Card className="detail-trend-card">
            <SectionHeading
              title="风险趋势"
              description="最近 7 天 · 个人风险快照"
              action={activeAlert ? <RiskBadge level={activeAlert.level} size="sm" /> : <span className="status-done"><CheckCircle2 size={14} /> 无未关闭预警</span>}
            />
            <LineChart
              data={riskTrend}
              height={220}
              min={0}
              max={100}
              unit=" 分"
              thresholds={[
                { value: 75, label: '严重' },
                { value: 50, label: '高风险' },
                { value: 25, label: '关注' },
              ]}
              ariaLabel={`${employee.name}最近 7 天风险趋势`}
            />
          </Card>

          <Card className="detail-factors-card">
            <SectionHeading title="当前主要因素" description="贡献分值越高，影响越大" />
            <BarList
              items={employee.factors.filter((factor) => factor.contribution > 0).map((factor) => ({ label: factor.label, value: factor.contribution, hint: factor.detail }))}
              max={25}
              formatValue={(value) => `+${value}`}
              color="var(--series-1)"
            />
            <div className="factor-footnote"><ShieldCheck size={14} /> 班组长仅可见风险摘要与处置状态。</div>
          </Card>

          <Card className="detail-alerts-mini">
            <SectionHeading title="当前预警" action={<button className="text-link" onClick={() => navigate('/admin/alerts')}>预警中心 <ArrowRight size={13} /></button>} />
            {activeAlert ? (
              <div className="mini-alert-row">
                <span className={cn('mini-alert-dot', `dot-${activeAlert.level}`)} />
                <div><strong>{activeAlert.title}</strong><span>{activeAlert.reason}</span></div>
                <RiskBadge level={activeAlert.level} size="sm" />
              </div>
            ) : <div className="empty-inline">当前无未关闭预警。</div>}
            <div className="access-log-mini">
              <span><Eye size={14} /> 最近访问</span>
              <div><strong>李建国</strong><span>今天 14:21 · 处置预警</span></div>
              <div><strong>风险引擎</strong><span>今天 14:18 · 自动计算</span></div>
            </div>
          </Card>
        </div>
      )}

      {tab === 'physiology' && (
        <div className="detail-data-grid">
          <Card className="detail-chart-card">
            <SectionHeading title="HRV 趋势" description="RMSSD · 个人基线参考" icon={<HeartPulse size={18} />} />
            <LineChart
              data={hrvTrend}
              height={210}
              min={0}
              max={80}
              unit=" ms"
              color="var(--series-2)"
              thresholds={[{ value: employee.baselineHrv, label: '基线' }]}
              ariaLabel={`${employee.name}HRV 趋势`}
            />
          </Card>
          <Card className="detail-chart-card">
            <SectionHeading title="心率趋势" description="bpm · 与个人基线对比" icon={<Activity size={18} />} />
            <LineChart
              data={hrTrend}
              height={210}
              min={40}
              max={140}
              unit=" bpm"
              color="var(--series-1)"
              thresholds={[{ value: employee.baselineHr, label: '基线' }]}
              ariaLabel={`${employee.name}心率趋势`}
            />
          </Card>
          <Card className="detail-table-card">
            <SectionHeading title="设备会话" description="佩戴与数据质量" />
            <div className="data-table-wrap">
              <table className="data-table">
                <thead><tr><th>日期</th><th>设备</th><th>覆盖率</th><th>质量</th><th>异常</th></tr></thead>
                <tbody>
                  <tr><td>11-09</td><td>{employee.device}</td><td>{employee.dataCompleteness}%</td><td><span className="validity is-valid">优</span></td><td>{employee.deviceStatus === 'offline' ? '离线 18 分钟' : '无'}</td></tr>
                  <tr><td>11-08</td><td>{employee.device}</td><td>93%</td><td><span className="validity is-valid">优</span></td><td>无</td></tr>
                  <tr><td>11-07</td><td>{employee.device}</td><td>86%</td><td><span className="validity is-warn">中</span></td><td>运动伪影 4 分钟</td></tr>
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {tab === 'subjective' && (
        <div className="detail-data-grid">
          <Card className="detail-chart-card">
            <SectionHeading title="VAS-F 疲劳趋势" description="0–100 · 最近 7 天" icon={<Wind size={18} />} />
            <LineChart data={subjectiveTrend} height={210} max={100} unit=" 分" color="var(--series-2)" ariaLabel={`${employee.name}VAS-F 趋势`} />
          </Card>
          <Card className="detail-subjective-summary">
            <SectionHeading title="最新自评" description="敏感数据仅授权角色可见" />
            <div className="subjective-big">
              <div><span>VAS-F</span><strong>{employee.vasF}<small>/100</small></strong></div>
              <div><span>KSS</span><strong>{employee.kss}<small>/9</small></strong></div>
              <div><span>POMS-TMD</span><strong>{employee.pomsTmd}<small>/100</small></strong></div>
            </div>
            <div className="privacy-data-note"><Eye size={15} /> 班组长仅可见风险摘要，不展示逐题答案。</div>
          </Card>
          <Card className="detail-table-card">
            <SectionHeading title="测评记录" />
            <div className="data-table-wrap">
              <table className="data-table">
                <thead><tr><th>时间</th><th>VAS-F</th><th>KSS</th><th>POMS</th><th>有效性</th></tr></thead>
                <tbody>
                  <tr><td>今天 13:40</td><td>{employee.vasF}</td><td>{employee.kss}/9</td><td>{employee.pomsTmd}</td><td><span className="validity is-valid">有效</span></td></tr>
                  <tr><td>昨天 21:05</td><td>{Math.max(0, employee.vasF - 11)}</td><td>{Math.max(1, employee.kss - 1)}/9</td><td>{Math.max(0, employee.pomsTmd - 7)}</td><td><span className="validity is-valid">有效</span></td></tr>
                  <tr><td>11-07 09:20</td><td>{Math.max(0, employee.vasF - 5)}</td><td>{Math.max(1, employee.kss - 1)}/9</td><td>{Math.max(0, employee.pomsTmd - 4)}</td><td><span className="validity is-valid">有效</span></td></tr>
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {tab === 'cognitive' && (
        <div className="detail-data-grid">
          <Card className="cognitive-summary-card">
            <SectionHeading title="注意力任务" description="上次完整测评 · 结果有效" icon={<BrainCircuit size={18} />} />
            <div className="cognitive-big-grid">
              <div><span>PVT 风险分</span><strong>{pvt}</strong><em>注意中断增加</em></div>
              <div><span>VST 风险分</span><strong>{vst}</strong><em>视觉搜索效率</em></div>
              <div><span>AX-CPT 风险分</span><strong>{axcpt}</strong><em>执行控制</em></div>
            </div>
            <div className="cognitive-note"><ShieldCheck size={15} /> 认知测试结果用于疲劳风险管理，不构成临床诊断。</div>
          </Card>
          <Card className="detail-table-card">
            <SectionHeading title="任务明细" />
            <div className="data-table-wrap">
              <table className="data-table">
                <thead><tr><th>任务</th><th>指标</th><th>结果</th><th>有效性</th></tr></thead>
                <tbody>
                  <tr><td>PVT</td><td>平均反应时 / 注意中断</td><td>386 ms / 4 次</td><td><span className="validity is-valid">有效</span></td></tr>
                  <tr><td>VST</td><td>正确率 / 平均反应时</td><td>82% / 1.8 s</td><td><span className="validity is-valid">有效</span></td></tr>
                  <tr><td>AX-CPT</td><td>正确率 / d′</td><td>86% / 1.9</td><td><span className="validity is-valid">有效</span></td></tr>
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {tab === 'alerts' && (
        <Card className="detail-list-card">
          <SectionHeading title="预警记录" description="从生成到关闭的完整处置链" action={<span className="muted-badge">{employeeAlerts.length} 条</span>} />
          <div className="detail-alert-list">
            {employeeAlerts.map((alert) => (
              <div key={alert.id} className="detail-alert-row">
                <span className={cn('detail-alert-dot', `dot-${alert.level}`)} />
                <div className="detail-alert-copy">
                  <div><strong>{alert.title}</strong><RiskBadge level={alert.level} size="sm" /><span className="alert-state">{alert.status === 'resolved' ? '已解除' : alert.status === 'pending' ? '待确认' : '处理中'}</span></div>
                  <p>{alert.reason}</p>
                  <span>{alert.createdAt} · 负责人 {alert.assignee}</span>
                </div>
                <button className="record-link" onClick={() => navigate('/admin/alerts')}>查看详情 <ArrowRight size={13} /></button>
              </div>
            ))}
            {employeeAlerts.length === 0 && <div className="empty-inline">暂无预警记录。</div>}
          </div>
        </Card>
      )}

      {tab === 'interventions' && (
        <Card className="detail-list-card">
          <SectionHeading title="干预记录" description="任务、执行与复测效果" action={<span className="muted-badge">{employeeInterventions.length} 条</span>} />
          <div className="data-table-wrap">
            <table className="data-table">
              <thead><tr><th>时间</th><th>干预</th><th>执行人</th><th>干预前</th><th>复测后</th><th>状态</th></tr></thead>
              <tbody>
                {employeeInterventions.map((task) => (
                  <tr key={task.id}>
                    <td>{task.createdAt}</td>
                    <td>{task.type}</td>
                    <td>{task.assignee}</td>
                    <td>{task.preScore}</td>
                    <td className="td-strong">{task.postScore ?? '—'}</td>
                    <td><span className={cn('record-status', task.status === 'completed' && 'is-done')}>{task.status === 'completed' ? '已完成' : task.status === 'in_progress' ? '进行中' : task.status === 'pending_retest' ? '待复测' : '待处理'}</span></td>
                  </tr>
                ))}
                {employeeInterventions.length === 0 && <tr><td colSpan={6}><div className="empty-inline">暂无干预记录。</div></td></tr>}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal
        open={interventionOpen}
        onClose={() => setInterventionOpen(false)}
        title={`为 ${employee.name} 分配干预`}
        description="任务会同步到员工端，并关联当前预警。"
        footer={<><Button variant="secondary" onClick={() => setInterventionOpen(false)}>取消</Button><Button onClick={submitIntervention} icon={<ClipboardCheck size={15} />}>创建任务</Button></>}
      >
        <div className="intervention-form">
          <FormField label="干预类型">
            <select value={interventionType} onChange={(event) => {
              setInterventionType(event.target.value)
              setDuration(event.target.value.includes('任务轮换') ? 30 : event.target.value.includes('小睡') ? 15 : 20)
            }}>
              <option>20 分钟恢复性休息</option>
              <option>任务轮换 + 双人复核</option>
              <option>策略性小睡 15 分钟</option>
              <option>职业健康评估</option>
            </select>
          </FormField>
          <FormField label="预计时长（分钟）">
            <input type="number" min="5" max="60" value={duration} onChange={(event) => setDuration(Number(event.target.value))} />
          </FormField>
          <div className="intervention-modal-note"><ArrowRight size={15} /> 员工端会收到任务提醒，逾期将升级给班组长。</div>
        </div>
      </Modal>
    </div>
  )
}
