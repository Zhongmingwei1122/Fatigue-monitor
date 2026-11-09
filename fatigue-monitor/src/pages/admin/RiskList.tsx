import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Bell,
  CheckSquare,
  ClipboardCheck,
  Filter,
  Minus,
  Search,
  Users,
} from 'lucide-react'
import { useApp } from '../../store/AppContext'
import { TEAMS } from '../../data/mockData'
import type { RiskLevel } from '../../types'
import { Avatar, Button, Card, EmptyState, FormField, Modal, PageHeader, RiskBadge, cn } from '../../components/ui'

type FilterKey = 'focus' | 'all' | RiskLevel

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'focus', label: '高风险 + 严重' },
  { key: 'all', label: '全部' },
  { key: 'high', label: '高风险' },
  { key: 'severe', label: '严重风险' },
  { key: 'attention', label: '关注' },
  { key: 'low', label: '低风险' },
]

export default function RiskList() {
  const { employees, alerts, assignInterventionToEmployee, addToast } = useApp()
  const navigate = useNavigate()
  const [filter, setFilter] = useState<FilterKey>('focus')
  const [query, setQuery] = useState('')
  const [teamFilter, setTeamFilter] = useState('all')
  const [shiftFilter, setShiftFilter] = useState('all')
  const [selected, setSelected] = useState<string[]>([])
  const [targetId, setTargetId] = useState<string | null>(null)
  const [interventionType, setInterventionType] = useState('20 分钟恢复性休息')
  const [duration, setDuration] = useState(20)

  const counts = useMemo(() => {
    const result: Record<RiskLevel, number> = { low: 0, attention: 0, high: 0, severe: 0, pending: 0 }
    employees.filter((employee) => employee.status === 'active').forEach((employee) => {
      result[employee.riskLevel] += 1
    })
    return result
  }, [employees])

  const filtered = useMemo(() => {
    return employees
      .filter((employee) => {
        const matchesLevel =
          filter === 'all'
            ? true
            : filter === 'focus'
              ? employee.riskLevel === 'high' || employee.riskLevel === 'severe'
              : employee.riskLevel === filter
        const matchesQuery = !query.trim() || employee.name.includes(query.trim()) || employee.employeeNo.includes(query.trim())
        return (
          employee.status === 'active' &&
          matchesLevel &&
          matchesQuery &&
          (teamFilter === 'all' || employee.team === teamFilter) &&
          (shiftFilter === 'all' || employee.shift === shiftFilter)
        )
      })
      .sort((a, b) => b.riskScore - a.riskScore)
  }, [employees, filter, query, shiftFilter, teamFilter])

  const targetEmployee = employees.find((employee) => employee.id === targetId)
  const allSelected = filtered.length > 0 && filtered.every((employee) => selected.includes(employee.id))

  const toggleAll = () => {
    if (allSelected) setSelected((current) => current.filter((id) => !filtered.some((employee) => employee.id === id)))
    else setSelected((current) => [...new Set([...current, ...filtered.map((employee) => employee.id)])])
  }

  const toggleOne = (id: string) => {
    setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]))
  }

  const activeAlertFor = (employeeId: string) =>
    alerts.find(
      (alert) =>
        alert.employeeId === employeeId &&
        ['pending', 'escalated', 'acknowledged', 'in_progress', 'pending_retest'].includes(alert.status),
    )

  const notifySelected = () => {
    if (!selected.length) return
    addToast({ title: '提醒已发送', description: `已通知 ${selected.length} 名员工的班组长与本人。`, tone: 'success' })
    setSelected([])
  }

  const submitIntervention = () => {
    if (!targetId) return
    assignInterventionToEmployee(targetId, interventionType, duration)
    setTargetId(null)
  }

  return (
    <div className="risk-list-page">
      <PageHeader
        eyebrow="风险识别"
        title="风险名单"
        description="按风险等级和班次筛选需要关注的员工。风险名单用于支持，不作为公开排名或绩效依据。"
        actions={
          <Button variant="secondary" icon={<Users size={15} />} onClick={() => navigate('/admin/employees')}>
            员工管理
          </Button>
        }
      />

      <div className="risk-list-summary">
        <div><span>高风险+严重</span><strong>{counts.high + counts.severe}</strong><em>需优先关注</em></div>
        <div><span>关注级</span><strong>{counts.attention}</strong><em>建议主动调节</em></div>
        <div><span>严重风险</span><strong>{counts.severe}</strong><em>立即处置</em></div>
        <div><span>未关闭预警</span><strong>{alerts.filter((alert) => ['pending', 'in_progress', 'pending_retest'].includes(alert.status)).length}</strong><em>含数据质量</em></div>
      </div>

      <Card className="risk-list-card">
        <div className="risk-filter-tabs" role="tablist" aria-label="风险等级筛选">
          {FILTERS.map((item) => {
            const count = item.key === 'focus' ? counts.high + counts.severe : item.key === 'all' ? employees.length : counts[item.key as RiskLevel]
            return (
              <button key={item.key} className={cn(filter === item.key && 'is-active')} onClick={() => { setFilter(item.key); setSelected([]) }} role="tab" aria-selected={filter === item.key}>
                {item.label}
                <span>{count}</span>
              </button>
            )
          })}
        </div>

        <div className="table-toolbar risk-toolbar">
          <label className="search-input">
            <Search size={16} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索姓名或工号" aria-label="搜索风险名单" />
          </label>
          <select value={teamFilter} onChange={(event) => setTeamFilter(event.target.value)} aria-label="筛选班组">
            <option value="all">全部班组</option>
            {TEAMS.map((team) => <option key={team.id} value={team.name}>{team.name}</option>)}
          </select>
          <select value={shiftFilter} onChange={(event) => setShiftFilter(event.target.value)} aria-label="筛选班型">
            <option value="all">全部班型</option>
            <option value="白班">白班</option>
            <option value="夜班">夜班</option>
          </select>
          <span className="table-count">{filtered.length} 人</span>
          <div className="toolbar-spacer" />
          {selected.length > 0 && (
            <Button size="sm" variant="secondary" icon={<Bell size={14} />} onClick={notifySelected}>
              批量提醒 {selected.length}
            </Button>
          )}
        </div>

        {filtered.length ? (
          <div className="data-table-wrap">
            <table className="data-table risk-table">
              <thead>
                <tr>
                  <th className="check-col">
                    <button className={cn('table-check', allSelected && 'is-checked')} onClick={toggleAll} aria-label="全选当前列表">
                      {allSelected && <CheckSquare size={14} />}
                    </button>
                  </th>
                  <th>员工</th>
                  <th>岗位 / 班组</th>
                  <th>班型</th>
                  <th>风险分</th>
                  <th>等级</th>
                  <th>趋势</th>
                  <th>主要因素</th>
                  <th>预警状态</th>
                  <th aria-label="操作" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((employee) => {
                  const alert = activeAlertFor(employee.id)
                  return (
                    <tr key={employee.id} className="clickable-row" onClick={() => navigate(`/admin/employees/${employee.id}`)}>
                      <td className="check-col" onClick={(event) => event.stopPropagation()}>
                        <button className={cn('table-check', selected.includes(employee.id) && 'is-checked')} onClick={() => toggleOne(employee.id)} aria-label={`选择 ${employee.name}`}>
                          {selected.includes(employee.id) && <CheckSquare size={14} />}
                        </button>
                      </td>
                      <td>
                        <div className="person-cell">
                          <Avatar name={employee.name} color={employee.avatarColor} size="sm" />
                          <div><strong>{employee.name}</strong><span>{employee.employeeNo}</span></div>
                        </div>
                      </td>
                      <td><div className="two-line"><strong>{employee.job}</strong><span>{employee.team}</span></div></td>
                      <td><span className={cn('shift-pill', employee.shift === '夜班' && 'is-night')}>{employee.shift}</span></td>
                      <td><strong className="risk-score-number">{employee.riskScore}</strong></td>
                      <td><RiskBadge level={employee.riskLevel} size="sm" /></td>
                      <td>
                        <span className={cn('trend-indicator', `trend-${employee.riskTrend}`)}>
                          {employee.riskTrend === 'up' ? <ArrowUpRight size={14} /> : employee.riskTrend === 'down' ? <ArrowDownRight size={14} /> : <Minus size={14} />}
                          {employee.riskTrend === 'up' ? '上升' : employee.riskTrend === 'down' ? '下降' : '稳定'}
                        </span>
                      </td>
                      <td>
                        <div className="factor-tags compact">
                          {employee.factors.slice(0, 2).map((factor) => <span key={factor.label}>{factor.label}</span>)}
                        </div>
                      </td>
                      <td>
                        {alert ? (
                          <span className={cn('alert-state', `state-${alert.status}`)}>
                            {alert.status === 'pending' ? '待确认' : alert.status === 'in_progress' ? '处理中' : alert.status === 'pending_retest' ? '待复测' : '已确认'}
                          </span>
                        ) : <span className="muted-text">无</span>}
                      </td>
                      <td>
                        <div className="row-actions">
                          <button onClick={(event) => { event.stopPropagation(); setTargetId(employee.id); setInterventionType('20 分钟恢复性休息'); setDuration(20) }}>干预</button>
                          <button onClick={(event) => { event.stopPropagation(); navigate(`/admin/employees/${employee.id}`) }}>查看</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon={<Filter size={26} />} title="没有匹配的风险员工" description="调整风险等级、班组或班型筛选后再试。" action={<Button variant="secondary" onClick={() => { setFilter('all'); setTeamFilter('all'); setShiftFilter('all'); setQuery('') }}>清除筛选</Button>} />
        )}

        <div className="risk-list-footer">
          <span><ClipboardCheck size={15} /> 高风险员工默认按风险分从高到低排序</span>
          <span>数据更新于 1 分钟前</span>
        </div>
      </Card>

      <Modal
        open={Boolean(targetId)}
        onClose={() => setTargetId(null)}
        title={`为 ${targetEmployee?.name ?? '员工'} 分配干预`}
        description="任务会同步到员工端，并记录干预前后的风险变化。"
        footer={
          <>
            <Button variant="secondary" onClick={() => setTargetId(null)}>取消</Button>
            <Button onClick={submitIntervention} icon={<ClipboardCheck size={15} />}>创建任务</Button>
          </>
        }
      >
        <div className="intervention-form">
          <div className="target-employee-strip">
            <Avatar name={targetEmployee?.name ?? '员工'} color={targetEmployee?.avatarColor} size="sm" />
            <div><strong>{targetEmployee?.name}</strong><span>{targetEmployee?.team} · {targetEmployee?.job}</span></div>
            {targetEmployee && <RiskBadge level={targetEmployee.riskLevel} size="sm" />}
          </div>
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
          <div className="intervention-modal-note">
            <ArrowRight size={15} />
            创建后员工端会收到任务；逾期 30 分钟将提醒班组长。
          </div>
        </div>
      </Modal>
    </div>
  )
}
