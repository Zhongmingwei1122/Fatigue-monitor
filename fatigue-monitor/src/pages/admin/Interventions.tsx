import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Plus,
  RotateCcw,
  Search,
  TimerReset,
  Users,
} from 'lucide-react'
import { useApp } from '../../store/AppContext'
import { TEAMS } from '../../data/mockData'
import type { InterventionStatus } from '../../types'
import { Avatar, Button, Card, EmptyState, FormField, InfoCallout, Modal, PageHeader, RiskBadge, cn } from '../../components/ui'

type TabKey = 'all' | 'pending' | 'in_progress' | 'pending_retest' | 'completed' | 'overdue'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'all', label: '全部任务' },
  { key: 'pending', label: '待接收' },
  { key: 'in_progress', label: '进行中' },
  { key: 'pending_retest', label: '待复测' },
  { key: 'completed', label: '已完成' },
  { key: 'overdue', label: '已逾期' },
]

const STATUS_LABELS: Record<InterventionStatus, string> = {
  pending: '待接收',
  accepted: '已接收',
  in_progress: '进行中',
  pending_retest: '待复测',
  completed: '已完成',
  overdue: '已逾期',
  cancelled: '已取消',
}

export default function Interventions() {
  const {
    employees,
    interventions,
    alerts,
    assignInterventionToEmployee,
    updateInterventionStatus,
    completeIntervention,
    finishInterventionRetest,
    addToast,
  } = useApp()
  const navigate = useNavigate()
  const [tab, setTab] = useState<TabKey>('all')
  const [teamFilter, setTeamFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [retestId, setRetestId] = useState<string | null>(null)
  const [postScore, setPostScore] = useState(40)
  const [newTask, setNewTask] = useState({
    employeeId: employees[0]?.id ?? '',
    type: '20 分钟恢复性休息',
    duration: 20,
  })

  const filtered = useMemo(
    () =>
      interventions.filter((task) => {
        const employee = employees.find((item) => item.id === task.employeeId)
        const matchesTab =
          tab === 'all'
            ? true
            : tab === 'pending'
              ? ['pending', 'accepted'].includes(task.status)
              : tab === 'in_progress'
                ? task.status === 'in_progress'
                : task.status === tab
        return (
          matchesTab &&
          (teamFilter === 'all' || employee?.team === teamFilter) &&
          (!query.trim() || employee?.name.includes(query.trim()) || task.type.includes(query.trim()))
        )
      }),
    [employees, interventions, query, tab, teamFilter],
  )

  const activeCount = interventions.filter((task) => ['pending', 'accepted', 'in_progress', 'pending_retest', 'overdue'].includes(task.status)).length
  const pendingRetest = interventions.filter((task) => task.status === 'pending_retest').length
  const completedCount = interventions.filter((task) => task.status === 'completed').length
  const retestTask = interventions.find((task) => task.id === retestId)
  const retestEmployee = employees.find((item) => item.id === retestTask?.employeeId)

  const createTask = () => {
    if (!newTask.employeeId) return
    assignInterventionToEmployee(newTask.employeeId, newTask.type, newTask.duration)
    setCreateOpen(false)
  }

  const openRetest = (id: string, preScore: number) => {
    setRetestId(id)
    setPostScore(Math.max(10, Math.min(100, preScore - 22)))
  }

  const submitRetest = () => {
    if (!retestId) return
    finishInterventionRetest(retestId, postScore)
    setRetestId(null)
  }

  return (
    <div className="interventions-page">
      <PageHeader
        eyebrow="闭环管理"
        title="干预管理"
        description="从预警生成任务，跟踪休息、任务调整与复测结果，确认干预是否真正降低了风险。"
        actions={<Button icon={<Plus size={16} />} onClick={() => setCreateOpen(true)}>新增干预任务</Button>}
      />

      <div className="intervention-summary-grid">
        <div><span className="intervention-summary-icon"><ClipboardCheck size={18} /></span><div><span>未完成任务</span><strong>{activeCount}</strong><em>含待复测与逾期</em></div></div>
        <div><span className="intervention-summary-icon intervention-summary-orange"><RotateCcw size={18} /></span><div><span>待复测</span><strong>{pendingRetest}</strong><em>复测后才能关闭</em></div></div>
        <div><span className="intervention-summary-icon intervention-summary-green"><CheckCircle2 size={18} /></span><div><span>已完成</span><strong>{completedCount}</strong><em>含效果记录</em></div></div>
        <div><span className="intervention-summary-icon intervention-summary-blue"><Clock3 size={18} /></span><div><span>平均完成时长</span><strong>24<small> 分钟</small></strong><em>较上周 -6 分钟</em></div></div>
      </div>

      <Card className="intervention-table-card">
        <div className="intervention-tabs" role="tablist" aria-label="干预状态筛选">
          {TABS.map((item) => {
            const count =
              item.key === 'all'
                ? interventions.length
                : item.key === 'pending'
                  ? interventions.filter((task) => ['pending', 'accepted'].includes(task.status)).length
                  : interventions.filter((task) => task.status === item.key).length
            return (
              <button key={item.key} className={cn(tab === item.key && 'is-active')} onClick={() => setTab(item.key)} role="tab" aria-selected={tab === item.key}>
                {item.label}<span>{count}</span>
              </button>
            )
          })}
        </div>
        <div className="table-toolbar">
          <label className="search-input">
            <Search size={16} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索员工或干预类型" aria-label="搜索干预任务" />
          </label>
          <select value={teamFilter} onChange={(event) => setTeamFilter(event.target.value)} aria-label="按班组筛选">
            <option value="all">全部班组</option>
            {TEAMS.map((team) => <option key={team.id} value={team.name}>{team.name}</option>)}
          </select>
          <span className="table-count">{filtered.length} 个任务</span>
          <div className="toolbar-spacer" />
          <Button size="sm" variant="secondary" icon={<Users size={14} />} onClick={() => addToast({ title: '已提醒执行人', description: '任务提醒已发送到员工端与班组长。', tone: 'success' })}>批量提醒</Button>
        </div>

        {filtered.length ? (
          <div className="data-table-wrap">
            <table className="data-table intervention-table">
              <thead>
                <tr><th>员工</th><th>干预任务</th><th>来源预警</th><th>负责人</th><th>截止时间</th><th>风险变化</th><th>状态</th><th aria-label="操作" /></tr>
              </thead>
              <tbody>
                {filtered.map((task) => {
                  const employee = employees.find((item) => item.id === task.employeeId)
                  const alert = alerts.find((item) => item.id === task.alertId)
                  return (
                    <tr key={task.id}>
                      <td>
                        <button className="person-cell person-cell-button" onClick={() => navigate(`/admin/employees/${task.employeeId}`)}>
                          <Avatar name={employee?.name ?? '员工'} color={employee?.avatarColor} size="sm" />
                          <div><strong>{employee?.name ?? '未知员工'}</strong><span>{employee?.team} · {employee?.job}</span></div>
                        </button>
                      </td>
                      <td><div className="two-line"><strong>{task.type}</strong><span>{task.reason}</span></div></td>
                      <td>{alert ? <div className="two-line"><strong>{alert.title}</strong><span>{alert.createdAt}</span></div> : <span className="muted-text">手动创建</span>}</td>
                      <td>{task.assignee}</td>
                      <td><span className={cn(task.status === 'overdue' && 'text-bad')}>{task.dueAt}</span></td>
                      <td>
                        <div className="risk-change-cell">
                          <span>{task.preScore}</span>
                          <ArrowRight size={13} />
                          <strong>{task.postScore ?? '—'}</strong>
                          {task.postScore != null && <em className={task.postScore < task.preScore ? 'text-good' : 'text-bad'}>{task.postScore < task.preScore ? '改善' : '未改善'}</em>}
                        </div>
                      </td>
                      <td><span className={cn('task-status', `task-${task.status}`)}>{STATUS_LABELS[task.status]}</span></td>
                      <td>
                        <div className="row-actions">
                          {['pending', 'accepted'].includes(task.status) && <button onClick={() => updateInterventionStatus(task.id, 'in_progress')}>开始</button>}
                          {task.status === 'in_progress' && <button onClick={() => completeIntervention(task.id)}>完成</button>}
                          {task.status === 'pending_retest' && <button onClick={() => openRetest(task.id, task.preScore)}>复测</button>}
                          {['pending', 'accepted', 'in_progress'].includes(task.status) && <button onClick={() => updateInterventionStatus(task.id, 'cancelled')}>取消</button>}
                          <button onClick={() => addToast({ title: '提醒已发送', description: `已提醒 ${task.assignee} 处理“${task.type}”。`, tone: 'success' })}>提醒</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon={<ClipboardCheck size={26} />} title="没有匹配的干预任务" description="调整状态、班组或搜索条件后再试。" />
        )}

        <div className="risk-list-footer">
          <span><TimerReset size={15} /> 高风险任务默认 30 分钟内完成，逾期自动升级</span>
          <span>任务状态与员工端实时同步</span>
        </div>
      </Card>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="新增干预任务"
        description="手动为员工安排恢复性干预，任务会同步到员工端。"
        footer={<><Button variant="secondary" onClick={() => setCreateOpen(false)}>取消</Button><Button onClick={createTask} icon={<ClipboardCheck size={15} />}>创建任务</Button></>}
      >
        <div className="intervention-form">
          <FormField label="员工">
            <select value={newTask.employeeId} onChange={(event) => setNewTask({ ...newTask, employeeId: event.target.value })}>
              {employees.filter((employee) => employee.status === 'active').map((employee) => (
                <option key={employee.id} value={employee.id}>{employee.name} · {employee.team}</option>
              ))}
            </select>
          </FormField>
          <FormField label="干预类型">
            <select value={newTask.type} onChange={(event) => {
              const type = event.target.value
              setNewTask({ ...newTask, type, duration: type.includes('任务轮换') ? 30 : type.includes('小睡') ? 15 : 20 })
            }}>
              <option>20 分钟恢复性休息</option>
              <option>任务轮换 + 双人复核</option>
              <option>策略性小睡 15 分钟</option>
              <option>职业健康评估</option>
            </select>
          </FormField>
          <FormField label="预计时长（分钟）">
            <input type="number" min="5" max="60" value={newTask.duration} onChange={(event) => setNewTask({ ...newTask, duration: Number(event.target.value) })} />
          </FormField>
          <div className="intervention-modal-note"><ArrowRight size={15} /> 创建后会通知员工，并记录干预前后风险。</div>
        </div>
      </Modal>

      <Modal
        open={Boolean(retestId)}
        onClose={() => setRetestId(null)}
        title="记录复测结果"
        description={retestEmployee ? `${retestEmployee.name} · ${retestTask?.type}` : '干预后风险复测'}
        footer={<><Button variant="secondary" onClick={() => setRetestId(null)}>取消</Button><Button onClick={submitRetest} icon={<RotateCcw size={15} />}>保存复测</Button></>}
      >
        <div className="retest-admin-form">
          <div className="retest-compare">
            <div><span>干预前风险</span><strong>{retestTask?.preScore ?? '—'}</strong></div>
            <ArrowRight size={18} />
            <div><span>复测后风险</span><strong>{postScore}</strong></div>
            {retestTask && <RiskBadge level={postScore >= 75 ? 'severe' : postScore >= 50 ? 'high' : postScore >= 25 ? 'attention' : 'low'} size="sm" />}
          </div>
          <FormField label="复测风险分" hint="0–100，分数越低代表恢复越好">
            <input type="range" min="0" max="100" value={postScore} onChange={(event) => setPostScore(Number(event.target.value))} className="vas-slider" />
          </FormField>
          <InfoCallout tone={postScore < 50 ? 'good' : 'warning'}>
            {postScore < 50 ? '风险已降至关注/低风险区间，复测后将解除关联预警。' : '风险仍处于高风险区间，建议继续干预并安排职业健康复核。'}
          </InfoCallout>
        </div>
      </Modal>
    </div>
  )
}
