import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bell,
  CheckCircle2,
  Clock3,
  Download,
  RefreshCw,
  ShieldAlert,
  Users,
  Watch,
} from 'lucide-react'
import { useApp } from '../../store/AppContext'
import { ORG_TREND, TEAMS } from '../../data/mockData'
import type { RiskLevel } from '../../types'
import { Button, Card, PageHeader, RiskBadge, SectionHeading, cn } from '../../components/ui'
import { BarList, LineChart, SegmentedRiskBar, StatTile } from '../../components/charts'

type DateRange = 'today' | '7d' | '30d'

export default function Dashboard() {
  const { employees, alerts, interventions, addToast } = useApp()
  const navigate = useNavigate()
  const [teamFilter, setTeamFilter] = useState('all')
  const [shiftFilter, setShiftFilter] = useState('all')
  const [dateRange, setDateRange] = useState<DateRange>('today')
  const [trendMode, setTrendMode] = useState<'avg' | 'high'>('avg')

  const filteredEmployees = useMemo(
    () =>
      employees.filter(
        (employee) =>
          employee.status === 'active' &&
          (teamFilter === 'all' || employee.team === teamFilter) &&
          (shiftFilter === 'all' || employee.shift === shiftFilter),
      ),
    [employees, shiftFilter, teamFilter],
  )

  const employeeIds = useMemo(() => new Set(filteredEmployees.map((employee) => employee.id)), [filteredEmployees])
  const filteredAlerts = alerts.filter((alert) => employeeIds.has(alert.employeeId))
  const filteredInterventions = interventions.filter((task) => employeeIds.has(task.employeeId))

  const counts = useMemo(() => {
    const result: Record<RiskLevel, number> = { low: 0, attention: 0, high: 0, severe: 0, pending: 0 }
    filteredEmployees.forEach((employee) => {
      result[employee.riskLevel] += 1
    })
    return result
  }, [filteredEmployees])

  const totalWithRisk = counts.low + counts.attention + counts.high + counts.severe
  const highSevere = counts.high + counts.severe
  const pendingAlerts = filteredAlerts.filter((alert) => ['pending', 'escalated'].includes(alert.status)).length
  const onDuty = filteredEmployees.filter((employee) => employee.shift !== '休息').length
  const connected = filteredEmployees.filter((employee) => employee.deviceStatus === 'connected').length
  const deviceOnlineRate = filteredEmployees.length ? Math.round((connected / filteredEmployees.length) * 100) : 0
  const dueTasks = filteredInterventions.filter((task) => task.status !== 'cancelled')
  const completedTasks = dueTasks.filter((task) => task.status === 'completed').length
  const completionRate = dueTasks.length ? Math.round((completedTasks / dueTasks.length) * 100) : 0

  const teamStats = useMemo(
    () =>
      TEAMS.map((team) => {
        const members = filteredEmployees.filter((employee) => employee.teamId === team.id)
        const high = members.filter((employee) => ['high', 'severe'].includes(employee.riskLevel)).length
        return {
          label: team.name,
          value: members.length ? Math.round((high / members.length) * 100) : 0,
          hint: `${high} / ${members.length} 人`,
          members: members.length,
        }
      }).filter((team) => team.members > 0),
    [filteredEmployees],
  )

  const shiftData = useMemo(
    () =>
      ['白班', '夜班'].map((shift) => {
        const members = filteredEmployees.filter((employee) => employee.shift === shift)
        const high = members.filter((employee) => ['high', 'severe'].includes(employee.riskLevel)).length
        return {
          shift,
          members: members.length,
          high,
          rate: members.length ? Math.round((high / members.length) * 100) : 0,
        }
      }),
    [filteredEmployees],
  )

  const latestAlerts = [...filteredAlerts]
    .sort((a, b) => {
      const order = ['severe', 'high', 'attention', 'low', 'pending']
      return order.indexOf(a.level) - order.indexOf(b.level)
    })
    .slice(0, 6)

  const topRiskEmployees = [...filteredEmployees]
    .filter((employee) => employee.riskLevel === 'high' || employee.riskLevel === 'severe')
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, 5)

  const trend = ORG_TREND.map((point, index) => ({
    label: point.label,
    value: trendMode === 'avg' ? point.value : [4, 5, 6, 5, 8, 9, highSevere][index],
  }))

  const dateRangeLabel = dateRange === 'today' ? '今日' : dateRange === '7d' ? '近 7 天' : '近 30 天'

  return (
    <div className="dashboard-page">
      <PageHeader
        eyebrow="安全管理中心"
        title="风险管理驾驶舱"
        description={`${dateRangeLabel} · 华东化工生产一部 · 数据更新于 1 分钟前`}
        actions={
          <>
            <Button variant="secondary" icon={<Download size={15} />} onClick={() => navigate('/admin/reports')}>
              生成报告
            </Button>
            <Button variant="ghost" icon={<RefreshCw size={15} />} onClick={() => addToast({ title: '数据已刷新', description: '最近同步于刚刚。', tone: 'info' })}>
              刷新
            </Button>
          </>
        }
      />

      <div className="dashboard-filters">
        <div className="filter-group">
          <span className="filter-label">时间范围</span>
          <div className="segmented-control">
            {([['today', '今日'], ['7d', '近 7 天'], ['30d', '近 30 天']] as const).map(([value, label]) => (
              <button key={value} className={cn(dateRange === value && 'is-active')} onClick={() => setDateRange(value)}>{label}</button>
            ))}
          </div>
        </div>
        <label className="filter-select">
          <span className="filter-label">班组</span>
          <select value={teamFilter} onChange={(event) => setTeamFilter(event.target.value)}>
            <option value="all">全部班组</option>
            {TEAMS.map((team) => <option key={team.id} value={team.name}>{team.name}</option>)}
          </select>
        </label>
        <label className="filter-select">
          <span className="filter-label">班型</span>
          <select value={shiftFilter} onChange={(event) => setShiftFilter(event.target.value)}>
            <option value="all">全部班型</option>
            <option value="白班">白班</option>
            <option value="夜班">夜班</option>
            <option value="休息">休息</option>
          </select>
        </label>
        <span className="filter-live"><span className="live-dot" /> 实时 · 60 秒自动刷新</span>
      </div>

      <div className="kpi-grid">
        <StatTile
          label="员工总数"
          value={filteredEmployees.length}
          suffix="人"
          delta={`${onDuty} 人当班`}
          deltaDirection="flat"
          icon={<Users size={18} />}
          sparkline={[42, 44, 44, 46, 47, 48, 48]}
        />
        <StatTile
          label="高风险 + 严重"
          value={highSevere}
          suffix="人"
          delta="较昨日 +2"
          deltaDirection="up"
          deltaGood={false}
          icon={<ShieldAlert size={18} />}
          tone="warning"
          sparkline={[4, 5, 6, 5, 8, 9, highSevere]}
        />
        <StatTile
          label="待处理预警"
          value={pendingAlerts}
          suffix="条"
          delta="较昨日 -1"
          deltaDirection="down"
          deltaGood
          icon={<Bell size={18} />}
          tone="critical"
          sparkline={[8, 7, 6, 7, 6, 5, pendingAlerts]}
        />
        <StatTile
          label="干预完成率"
          value={completionRate}
          suffix="%"
          delta="较上周 +6%"
          deltaDirection="up"
          deltaGood
          icon={<CheckCircle2 size={18} />}
          tone="good"
          sparkline={[64, 68, 70, 69, 76, 82, completionRate]}
        />
        <StatTile
          label="设备在线率"
          value={deviceOnlineRate}
          suffix="%"
          delta={`${filteredEmployees.length - connected} 台离线`}
          deltaDirection="flat"
          icon={<Watch size={18} />}
          sparkline={[91, 93, 92, 95, 94, 92, deviceOnlineRate]}
        />
        <StatTile
          label="今日测评完成"
          value={filteredEmployees.filter((employee) => employee.lastAssessment.includes('今天')).length}
          suffix={`/ ${filteredEmployees.length}`}
          delta="完成率 71%"
          deltaDirection="up"
          deltaGood
          icon={<Activity size={18} />}
          sparkline={[22, 25, 24, 30, 32, 31, 34]}
        />
      </div>

      <div className="dashboard-trend-grid">
        <Card className="risk-distribution-card">
          <SectionHeading
            title="风险等级分布"
            description={`当前 ${totalWithRisk} 名有效评估员工`}
            action={<span className="muted-badge">{totalWithRisk ? Math.round((highSevere / totalWithRisk) * 100) : 0}% 高风险</span>}
          />
          <SegmentedRiskBar counts={counts} total={totalWithRisk} />
          <div className="distribution-insight">
            <AlertTriangle size={17} />
            <div>
              <strong>高风险集中在夜班与连续作业人群</strong>
              <span>建议优先关注运行一班、检修班，并检查今晚夜班排班。</span>
            </div>
          </div>
        </Card>

        <Card className="org-trend-card">
          <SectionHeading
            title="风险变化趋势"
            description="组织级每日风险快照"
            action={
              <div className="mini-tabs" role="tablist" aria-label="趋势指标">
                <button className={cn(trendMode === 'avg' && 'is-active')} onClick={() => setTrendMode('avg')} role="tab" aria-selected={trendMode === 'avg'}>平均风险</button>
                <button className={cn(trendMode === 'high' && 'is-active')} onClick={() => setTrendMode('high')} role="tab" aria-selected={trendMode === 'high'}>高风险人数</button>
              </div>
            }
          />
          <div className="org-trend-summary">
            <div>
              <span>{trendMode === 'avg' ? '当前平均风险' : '当前高风险人数'}</span>
              <strong>{trendMode === 'avg' ? 43 : highSevere}{trendMode === 'avg' ? <small>/100</small> : <small> 人</small>}</strong>
            </div>
            <span className={trendMode === 'avg' ? 'trend-up' : 'trend-up'}>{trendMode === 'avg' ? '较 7 日前 +12' : '较 7 日前 +5'}</span>
            <span className="trend-note">数据截止 11-09 14:00</span>
          </div>
          <LineChart
            data={trend}
            height={220}
            min={0}
            max={trendMode === 'avg' ? 100 : 12}
            unit={trendMode === 'avg' ? ' 分' : ' 人'}
            color="var(--series-1)"
            thresholds={trendMode === 'avg' ? [{ value: 50, label: '预警线' }] : undefined}
            ariaLabel={trendMode === 'avg' ? '组织平均疲劳风险趋势' : '高风险人数趋势'}
          />
        </Card>
      </div>

      <div className="dashboard-lower-grid">
        <Card className="team-compare-card">
          <SectionHeading
            title="班组高风险占比"
            description="仅展示样本量 ≥ 5 的班组"
            action={<button className="text-link" onClick={() => navigate('/admin/teams')}>班组分析 <ArrowRight size={13} /></button>}
          />
          <BarList
            items={teamStats}
            max={100}
            formatValue={(value) => `${value}%`}
            color="var(--series-1)"
          />
          <div className="shift-compare">
            {shiftData.map((item) => (
              <div key={item.shift} className="shift-compare-item">
                <span>{item.shift}</span>
                <strong>{item.high}<small> / {item.members} 人</small></strong>
                <em>{item.rate}% 高风险</em>
              </div>
            ))}
          </div>
        </Card>

        <Card className="latest-alerts-card">
          <SectionHeading
            title="最新预警"
            description="按风险等级与时间排序"
            action={<button className="text-link" onClick={() => navigate('/admin/alerts')}>全部预警 <ArrowRight size={13} /></button>}
          />
          <div className="alert-feed">
            {latestAlerts.map((alert) => {
              const employee = employees.find((item) => item.id === alert.employeeId)
              return (
                <button key={alert.id} className="alert-feed-row" onClick={() => navigate('/admin/alerts')}>
                  <span className="alert-feed-time">{alert.createdAt.replace('今天 ', '')}</span>
                  <span className="alert-feed-main">
                    <span className="alert-feed-title">
                      <strong>{employee?.name ?? '员工'}</strong>
                      <RiskBadge level={alert.level} size="sm" />
                    </span>
                    <span>{alert.reason}</span>
                  </span>
                  <span className={cn('alert-feed-status', alert.status === 'pending' && 'is-pending')}>
                    {alert.status === 'pending' ? '待确认' : alert.status === 'in_progress' ? '处理中' : alert.status === 'pending_retest' ? '待复测' : '已处理'}
                  </span>
                </button>
              )
            })}
          </div>
        </Card>
      </div>

      <div className="dashboard-bottom-grid">
        <Card className="factor-summary-card">
          <SectionHeading title="主要风险因素" description="近 7 天预警关联因素" />
          <BarList
            items={[
              { label: 'HRV 低于基线', value: 31 },
              { label: '主观困倦 KSS ≥ 7', value: 24 },
              { label: 'PVT 注意中断', value: 19 },
              { label: '连续夜班 ≥ 3 天', value: 16 },
              { label: '设备数据中断', value: 9 },
            ]}
            max={35}
            formatValue={(value) => `${value} 次`}
            color="var(--series-2)"
          />
        </Card>

        <Card className="top-risk-card">
          <SectionHeading
            title="优先关注员工"
            description="按当前风险分排序，不展示为公开排名"
            action={<button className="text-link" onClick={() => navigate('/admin/risk')}>风险名单 <ArrowRight size={13} /></button>}
          />
          <div className="top-risk-list">
            {topRiskEmployees.map((employee) => (
              <button key={employee.id} className="top-risk-row" onClick={() => navigate(`/admin/employees/${employee.id}`)}>
                <span className="top-risk-avatar" style={{ background: employee.avatarColor }}>{employee.name.slice(-2)}</span>
                <span className="top-risk-person"><strong>{employee.name}</strong><em>{employee.team} · {employee.job}</em></span>
                <span className="top-risk-score">{employee.riskScore}</span>
                <RiskBadge level={employee.riskLevel} size="sm" />
                <ArrowRight size={14} />
              </button>
            ))}
          </div>
        </Card>

        <Card className="attention-card">
          <SectionHeading title="今日关注" description="需要管理者跟进的异常" />
          <div className="attention-list">
            <div><span className="attention-icon attention-warning"><Clock3 size={15} /></span><div><strong>2 条预警即将超时</strong><span>严重风险响应时限 3 分钟</span></div><span className="attention-tag">立即</span></div>
            <div><span className="attention-icon attention-blue"><Watch size={15} /></span><div><strong>4 台设备离线</strong><span>其中 2 台处于安全敏感班次</span></div><span className="attention-tag">关注</span></div>
            <div><span className="attention-icon attention-green"><CheckCircle2 size={15} /></span><div><strong>干预完成率 72%</strong><span>较上周提升 6 个百分点</span></div><span className="attention-tag">正常</span></div>
          </div>
          <Button variant="secondary" full size="sm" onClick={() => navigate('/admin/alerts')}>进入预警中心</Button>
        </Card>
      </div>
    </div>
  )
}
