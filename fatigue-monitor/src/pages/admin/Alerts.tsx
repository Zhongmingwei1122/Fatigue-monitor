import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  Bell,
  CheckCircle2,
  ChevronRight,
  Clock3,
  MessageSquare,
  ShieldAlert,
  ShieldCheck,
  TimerReset,
  TriangleAlert,
  XCircle,
} from 'lucide-react'
import { useApp } from '../../store/AppContext'
import type { AlertRecord, AlertStatus } from '../../types'
import { Avatar, Button, Card, EmptyState, FormField, Modal, PageHeader, RiskBadge, SectionHeading, cn } from '../../components/ui'

type StatusFilter = 'open' | 'pending' | 'processing' | 'resolved' | 'all'

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'open', label: '未关闭' },
  { key: 'pending', label: '待确认' },
  { key: 'processing', label: '处理中' },
  { key: 'resolved', label: '已解除' },
  { key: 'all', label: '全部' },
]

const STATUS_LABELS: Record<AlertStatus, string> = {
  pending: '待确认',
  acknowledged: '已确认',
  in_progress: '处理中',
  pending_retest: '待复测',
  resolved: '已解除',
  closed: '已关闭',
  false_positive: '误报',
  escalated: '已升级',
}

function alertTypeLabel(type: AlertRecord['type']) {
  return type === 'fatigue' ? '疲劳预警' : type === 'data' ? '数据质量' : type === 'compliance' ? '依从性提醒' : '干预任务'
}

export default function Alerts() {
  const {
    alerts,
    employees,
    acknowledgeAlert,
    resolveAlert,
    markFalsePositive,
    assignInterventionToAlert,
    addToast,
  } = useApp()
  const navigate = useNavigate()
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('open')
  const [levelFilter, setLevelFilter] = useState('all')
  const [selectedId, setSelectedId] = useState(alerts.find((alert) => alert.status === 'pending')?.id ?? alerts[0]?.id ?? '')
  const [interventionOpen, setInterventionOpen] = useState(false)
  const [falsePositiveOpen, setFalsePositiveOpen] = useState(false)
  const [interventionType, setInterventionType] = useState('20 分钟恢复性休息')
  const [duration, setDuration] = useState(20)
  const [falsePositiveReason, setFalsePositiveReason] = useState('数据异常')

  const filtered = useMemo(
    () =>
      alerts
        .filter((alert) => {
          const matchesStatus =
            statusFilter === 'all'
              ? true
              : statusFilter === 'open'
                ? !['resolved', 'closed', 'false_positive'].includes(alert.status)
                : statusFilter === 'pending'
                  ? ['pending', 'escalated'].includes(alert.status)
                  : statusFilter === 'processing'
                    ? ['acknowledged', 'in_progress', 'pending_retest'].includes(alert.status)
                    : ['resolved', 'closed'].includes(alert.status)
          return matchesStatus && (levelFilter === 'all' || alert.level === levelFilter)
        })
        .sort((a, b) => {
          const order = ['severe', 'high', 'attention', 'low']
          return order.indexOf(a.level) - order.indexOf(b.level)
        }),
    [alerts, levelFilter, statusFilter],
  )

  const selected = alerts.find((alert) => alert.id === selectedId) ?? filtered[0]
  const selectedEmployee = selected ? employees.find((employee) => employee.id === selected.employeeId) : undefined
  const pendingCount = alerts.filter((alert) => ['pending', 'escalated'].includes(alert.status)).length
  const severeCount = alerts.filter((alert) => alert.level === 'severe' && !['resolved', 'closed', 'false_positive'].includes(alert.status)).length
  const overdueCount = alerts.filter((alert) => alert.status === 'pending' && alert.slaMinutes <= 3).length

  const submitIntervention = () => {
    if (!selected) return
    assignInterventionToAlert(selected.id, interventionType, duration)
    setInterventionOpen(false)
  }

  const submitFalsePositive = () => {
    if (!selected) return
    markFalsePositive(selected.id, falsePositiveReason)
    setFalsePositiveOpen(false)
  }

  return (
    <div className="alerts-page">
      <PageHeader
        eyebrow="预警与处置"
        title="预警中心"
        description="集中处理疲劳、数据质量与依从性预警。严重风险需要逐条确认与复核。"
        actions={
          <Button variant="secondary" icon={<ShieldCheck size={15} />} onClick={() => addToast({ title: '已进入值班视图', description: '当前显示所有未关闭预警。', tone: 'info' })}>
            值班视图
          </Button>
        }
      />

      <div className="alert-summary-grid">
        <div><span className="alert-summary-icon alert-icon-critical"><Bell size={18} /></span><div><span>待确认</span><strong>{pendingCount}</strong><em>需要立即响应</em></div></div>
        <div><span className="alert-summary-icon alert-icon-warning"><ShieldAlert size={18} /></span><div><span>严重风险</span><strong>{severeCount}</strong><em>3 分钟内确认</em></div></div>
        <div><span className="alert-summary-icon alert-icon-blue"><Clock3 size={18} /></span><div><span>即将超时</span><strong>{overdueCount}</strong><em>请优先处理</em></div></div>
        <div><span className="alert-summary-icon alert-icon-good"><CheckCircle2 size={18} /></span><div><span>今日已解除</span><strong>{alerts.filter((alert) => ['resolved', 'closed'].includes(alert.status)).length}</strong><em>闭环记录可追溯</em></div></div>
      </div>

      <div className="alerts-layout">
        <Card className="alert-list-panel">
          <div className="alert-filter-tabs" role="tablist" aria-label="预警状态筛选">
            {STATUS_FILTERS.map((item) => (
              <button key={item.key} className={cn(statusFilter === item.key && 'is-active')} onClick={() => setStatusFilter(item.key)} role="tab" aria-selected={statusFilter === item.key}>
                {item.label}
              </button>
            ))}
          </div>
          <div className="alert-list-filter">
            <select value={levelFilter} onChange={(event) => setLevelFilter(event.target.value)} aria-label="按等级筛选">
              <option value="all">全部等级</option>
              <option value="severe">严重风险</option>
              <option value="high">高风险</option>
              <option value="attention">关注</option>
            </select>
            <span>{filtered.length} 条</span>
          </div>
          <div className="alert-rows">
            {filtered.map((alert) => {
              const employee = employees.find((item) => item.id === alert.employeeId)
              return (
                <button key={alert.id} className={cn('alert-row', selected?.id === alert.id && 'is-selected')} onClick={() => setSelectedId(alert.id)}>
                  <span className={cn('alert-row-level', `tone-${alert.level}`)} />
                  <div className="alert-row-copy">
                    <div className="alert-row-top">
                      <span>{alert.createdAt}</span>
                      <RiskBadge level={alert.level} size="sm" />
                      <span className={cn('alert-state', `state-${alert.status}`)}>{STATUS_LABELS[alert.status]}</span>
                    </div>
                    <strong>{alert.title}</strong>
                    <span className="alert-row-person">{employee?.name} · {employee?.team}</span>
                    <p>{alert.reason}</p>
                  </div>
                  <ChevronRight size={16} className="alert-row-chevron" />
                </button>
              )
            })}
            {filtered.length === 0 && <EmptyState icon={<CheckCircle2 size={26} />} title="当前没有匹配预警" description="这个筛选条件下没有需要处理的预警。" />}
          </div>
        </Card>

        <Card className="alert-detail-panel">
          {selected ? (
            <>
              <div className="alert-detail-head">
                <div>
                  <div className="alert-detail-kicker">
                    <span>{alertTypeLabel(selected.type)}</span>
                    <span>·</span>
                    <span>{selected.id.toUpperCase()}</span>
                  </div>
                  <h2>{selected.title}</h2>
                  <div className="alert-detail-badges">
                    <RiskBadge level={selected.level} size="lg" />
                    <span className={cn('alert-state', `state-${selected.status}`)}>{STATUS_LABELS[selected.status]}</span>
                    <span className="alert-detail-sla"><Clock3 size={14} /> 响应时限 {selected.slaMinutes} 分钟</span>
                  </div>
                </div>
                <div className="alert-detail-actions">
                  {['pending', 'escalated'].includes(selected.status) && (
                    <Button size="sm" onClick={() => acknowledgeAlert(selected.id)} icon={<CheckCircle2 size={14} />}>确认预警</Button>
                  )}
                  {['acknowledged', 'in_progress'].includes(selected.status) && (
                    <Button size="sm" onClick={() => setInterventionOpen(true)} icon={<TimerReset size={14} />}>分配干预</Button>
                  )}
                  <Button size="sm" variant="secondary" onClick={() => navigate(`/admin/employees/${selected.employeeId}`)}>员工详情</Button>
                </div>
              </div>

              {selectedEmployee && (
                <div className="alert-employee-strip">
                  <Avatar name={selectedEmployee.name} color={selectedEmployee.avatarColor} />
                  <div>
                    <strong>{selectedEmployee.name}</strong>
                    <span>{selectedEmployee.employeeNo} · {selectedEmployee.job} · {selectedEmployee.team}</span>
                  </div>
                  <RiskBadge level={selectedEmployee.riskLevel} />
                  <span className="alert-employee-score">{selectedEmployee.riskScore}<small>/100</small></span>
                  <span className={cn('shift-pill', selectedEmployee.shift === '夜班' && 'is-night')}>{selectedEmployee.shift}</span>
                </div>
              )}

              <div className="alert-evidence">
                <div className="alert-reason-block">
                  <span className="card-kicker">触发原因</span>
                  <p>{selected.reason}</p>
                  <div className="factor-tags">
                    {selected.factors.map((factor) => <span key={factor}>{factor}</span>)}
                  </div>
                </div>
                <div className="alert-evidence-grid">
                  <div><span>风险分</span><strong>{selectedEmployee?.riskScore ?? '—'}</strong><em>高风险阈值 50</em></div>
                  <div><span>HRV</span><strong>{selectedEmployee?.hrv ?? '—'}<small> ms</small></strong><em>基线 {selectedEmployee?.baselineHrv ?? '—'}</em></div>
                  <div><span>KSS</span><strong>{selectedEmployee?.kss ?? '—'}<small>/9</small></strong><em>{selectedEmployee && selectedEmployee.kss >= 7 ? '明显困倦' : '轻度困倦'}</em></div>
                  <div><span>PVT</span><strong>{selectedEmployee?.pvtScore ?? '—'}</strong><em>注意中断相关</em></div>
                </div>
              </div>

              <div className="alert-timeline-section">
                <SectionHeading title="处置时间线" description="每次确认、干预与复核都会记录" />
                <div className="alert-timeline">
                  {selected.timeline.map((event, index) => (
                    <div key={`${event.time}-${index}`} className="timeline-row">
                      <span className="timeline-dot" />
                      <span className="timeline-time">{event.time}</span>
                      <div><strong>{event.action}</strong><span>{event.actor}{event.note ? ` · ${event.note}` : ''}</span></div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="alert-detail-footer">
                <div className="alert-detail-note">
                  <MessageSquare size={15} />
                  预警内容不可修改；处置记录会写入审计日志。
                </div>
                <div className="alert-detail-footer-actions">
                  <Button variant="ghost" size="sm" onClick={() => addToast({ title: '已通知员工', description: '已发送站内信与企业微信提醒。', tone: 'success' })}>联系员工</Button>
                  {selected.status === 'pending' && (
                    <>
                      <Button variant="ghost" size="sm" icon={<TriangleAlert size={14} />} onClick={() => addToast({ title: '已升级预警', description: '已通知安全管理员与值班负责人。', tone: 'warning' })}>升级</Button>
                      <Button variant="ghost" size="sm" icon={<XCircle size={14} />} onClick={() => setFalsePositiveOpen(true)}>标记误报</Button>
                    </>
                  )}
                  {['acknowledged', 'in_progress', 'pending_retest'].includes(selected.status) && (
                    <Button variant="secondary" size="sm" onClick={() => resolveAlert(selected.id)} icon={<CheckCircle2 size={14} />}>解除预警</Button>
                  )}
                  {selected.status === 'resolved' && (
                    <Button variant="secondary" size="sm" onClick={() => addToast({ title: '预警已复核关闭', description: '处置记录与复测依据已归档。', tone: 'success' })}>复核关闭</Button>
                  )}
                </div>
              </div>
            </>
          ) : (
            <EmptyState icon={<Bell size={28} />} title="选择一条预警" description="从左侧列表中选择预警查看详情与处置记录。" />
          )}
        </Card>
      </div>

      <Modal
        open={interventionOpen}
        onClose={() => setInterventionOpen(false)}
        title="分配干预任务"
        description={selected ? `为 ${selectedEmployee?.name ?? '员工'} 安排恢复性干预` : ''}
        footer={<><Button variant="secondary" onClick={() => setInterventionOpen(false)}>取消</Button><Button onClick={submitIntervention} icon={<TimerReset size={15} />}>创建并通知</Button></>}
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
              <option>立即停止作业 + 职业健康评估</option>
            </select>
          </FormField>
          <FormField label="预计时长（分钟）">
            <input type="number" min="5" max="60" value={duration} onChange={(event) => setDuration(Number(event.target.value))} />
          </FormField>
          <div className="intervention-modal-note">
            <ArrowRight size={15} />
            任务会同步到员工端；完成休息后需进行复测。
          </div>
        </div>
      </Modal>

      <Modal
        open={falsePositiveOpen}
        onClose={() => setFalsePositiveOpen(false)}
        title="标记为误报"
        description="该操作会保留审计记录，并进入规则评估队列。"
        footer={<><Button variant="secondary" onClick={() => setFalsePositiveOpen(false)}>取消</Button><Button variant="danger" onClick={submitFalsePositive}>确认误报</Button></>}
      >
        <FormField label="误报原因">
          <select value={falsePositiveReason} onChange={(event) => setFalsePositiveReason(event.target.value)}>
            <option>数据异常</option>
            <option>规则误判</option>
            <option>岗位不适用</option>
            <option>员工状态已恢复</option>
            <option>其他</option>
          </select>
        </FormField>
        <div className="intervention-modal-note">
          <ShieldAlert size={15} />
          严重风险误报需由安全管理员与职业健康专员共同复核。
        </div>
      </Modal>
    </div>
  )
}
