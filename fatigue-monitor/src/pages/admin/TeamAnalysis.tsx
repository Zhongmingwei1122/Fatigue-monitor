import { useMemo, useState } from 'react'
import {
  ArrowRight,
  BarChart3,
  Download,
  Info,
  Moon,
  Sun,
  TrendingUp,
  Users,
} from 'lucide-react'
import { useApp } from '../../store/AppContext'
import { TEAMS } from '../../data/mockData'
import { Button, Card, InfoCallout, PageHeader, SectionHeading, cn } from '../../components/ui'
import { BarList, Heatmap } from '../../components/charts'

export default function TeamAnalysis() {
  const { employees, alerts, interventions, addToast } = useApp()
  const [shiftView, setShiftView] = useState<'all' | '白班' | '夜班'>('all')

  const teamStats = useMemo(
    () =>
      TEAMS.map((team) => {
        const members = employees.filter((employee) => employee.status === 'active' && employee.teamId === team.id)
        const highRisk = members.filter((employee) => ['high', 'severe'].includes(employee.riskLevel)).length
        const teamAlerts = alerts.filter((alert) => members.some((member) => member.id === alert.employeeId))
        const tasks = interventions.filter((task) => members.some((member) => member.id === task.employeeId) && task.status !== 'cancelled')
        const completed = tasks.filter((task) => task.status === 'completed').length
        const online = members.filter((member) => member.deviceStatus === 'connected').length
        const nightMembers = members.filter((member) => member.shift === '夜班')
        const nightHigh = nightMembers.filter((member) => ['high', 'severe'].includes(member.riskLevel)).length
        const dayMembers = members.filter((member) => member.shift === '白班')
        const dayHigh = dayMembers.filter((member) => ['high', 'severe'].includes(member.riskLevel)).length
        return {
          ...team,
          members,
          headcount: members.length,
          avgRisk: members.length ? Math.round(members.reduce((sum, member) => sum + member.riskScore, 0) / members.length) : 0,
          highRisk,
          highRiskRate: members.length ? Math.round((highRisk / members.length) * 100) : 0,
          alertCount: teamAlerts.length,
          completion: tasks.length ? Math.round((completed / tasks.length) * 100) : 100,
          deviceOnline: members.length ? Math.round((online / members.length) * 100) : 0,
          nightRate: nightMembers.length ? Math.round((nightHigh / nightMembers.length) * 100) : 0,
          dayRate: dayMembers.length ? Math.round((dayHigh / dayMembers.length) * 100) : 0,
          nightCount: nightMembers.length,
          dayCount: dayMembers.length,
        }
      }),
    [alerts, employees, interventions],
  )

  const scopedStats = teamStats.map((team) => {
    if (shiftView === 'all') return team
    const members = team.members.filter((member) => member.shift === shiftView)
    const highRisk = members.filter((member) => ['high', 'severe'].includes(member.riskLevel)).length
    return {
      ...team,
      headcount: members.length,
      highRisk,
      highRiskRate: members.length ? Math.round((highRisk / members.length) * 100) : 0,
      avgRisk: members.length ? Math.round(members.reduce((sum, member) => sum + member.riskScore, 0) / members.length) : 0,
    }
  })

  const topTeam = [...teamStats].sort((a, b) => b.highRiskRate - a.highRiskRate)[0]
  const totalHigh = teamStats.reduce((sum, team) => sum + team.highRisk, 0)
  const avgCompletion = Math.round(teamStats.reduce((sum, team) => sum + team.completion, 0) / teamStats.length)
  const activeMembers = employees.filter((employee) => employee.status === 'active')
  const nightMembers = activeMembers.filter((employee) => employee.shift === '夜班')
  const dayMembers = activeMembers.filter((employee) => employee.shift === '白班')
  const nightHigh = nightMembers.filter((employee) => ['high', 'severe'].includes(employee.riskLevel)).length
  const dayHigh = dayMembers.filter((employee) => ['high', 'severe'].includes(employee.riskLevel)).length
  const nightRate = nightMembers.length ? Math.round((nightHigh / nightMembers.length) * 100) : 0
  const dayRate = dayMembers.length ? Math.round((dayHigh / dayMembers.length) * 100) : 0
  const higherShift = nightRate >= dayRate ? '夜班' : '白班'
  const higherRate = higherShift === '夜班' ? nightRate : dayRate
  const otherRate = higherShift === '夜班' ? dayRate : nightRate
  const lowTeams = teamStats.filter((team) => team.completion < avgCompletion).map((team) => team.name)

  return (
    <div className="team-analysis-page">
      <PageHeader
        eyebrow="组织洞察"
        title="班组分析"
        description="比较不同班组与班型的疲劳风险，识别排班、岗位与支持流程中的系统性问题。"
        actions={
          <Button
            variant="secondary"
            icon={<Download size={15} />}
            onClick={() => addToast({ title: '分析报告已准备', description: '演示环境不生成真实文件；导出操作已记录。', tone: 'info' })}
          >
            导出分析
          </Button>
        }
      />

      <div className="team-summary-grid">
        <div><span className="team-summary-icon"><Users size={17} /></span><div><span>纳入分析班组</span><strong>{TEAMS.length}</strong><em>所有班组样本均 ≥ 5 人</em></div></div>
        <div><span className="team-summary-icon team-summary-orange"><TrendingUp size={17} /></span><div><span>高风险人数</span><strong>{totalHigh}</strong><em>全组织需优先关注</em></div></div>
        <div><span className="team-summary-icon team-summary-violet"><BarChart3 size={17} /></span><div><span>高风险占比最高</span><strong>{topTeam.highRiskRate}%</strong><em>{topTeam.name}</em></div></div>
        <div><span className="team-summary-icon team-summary-green"><ArrowRight size={17} /></span><div><span>平均干预完成率</span><strong>{avgCompletion}%</strong><em>较上周 +6%</em></div></div>
      </div>

      <div className="team-analysis-top">
        <Card className="team-bar-card">
          <SectionHeading
            title="班组高风险占比"
            description="高风险 + 严重风险人数占班组人数比例"
            action={
              <div className="mini-tabs" role="tablist" aria-label="班型筛选">
                {(['all', '白班', '夜班'] as const).map((value) => (
                  <button key={value} className={cn(shiftView === value && 'is-active')} onClick={() => setShiftView(value)} role="tab" aria-selected={shiftView === value}>
                    {value === 'all' ? '全部' : value}
                  </button>
                ))}
              </div>
            }
          />
          <BarList
            items={scopedStats.map((team) => ({ label: team.name, value: team.highRiskRate, hint: `${team.highRisk} / ${team.headcount} 人` }))}
            max={100}
            formatValue={(value) => `${value}%`}
            color="var(--series-1)"
          />
          <div className="team-bar-footnote"><Info size={14} /> 小样本班组（&lt; 5 人）不展示可识别聚合数据。</div>
        </Card>

        <Card className="team-heatmap-card">
          <SectionHeading title="班型风险热力" description="高风险占比 · 白班 vs 夜班" />
          <Heatmap
            rows={teamStats.map((team) => team.name)}
            columns={['白班', '夜班']}
            values={teamStats.map((team) => [team.dayRate, team.nightRate])}
            formatValue={(value) => `${value}%`}
            ariaLabel="各班组白班与夜班高风险占比热力图"
          />
          <div className="heatmap-legend">
            <span>低</span>
            <span className="heatmap-gradient" />
            <span>高</span>
          </div>
        </Card>
      </div>

      <div className="team-insights">
        <Card className="team-insight-card">
          <span className={cn('insight-icon', higherShift === '夜班' ? 'insight-warning' : 'insight-blue')}>
            {higherShift === '夜班' ? <Moon size={18} /> : <Sun size={18} />}
          </span>
          <div>
            <span>{higherShift}风险更高</span>
            <strong>{higherRate}%</strong>
            <p>{higherShift}高风险占比为 {higherRate}%，{higherShift === '夜班' ? '白班' : '夜班'}为 {otherRate}%。建议结合班次分布检查中段休息与任务安排。</p>
          </div>
        </Card>
        <Card className="team-insight-card">
          <span className="insight-icon insight-blue"><Sun size={18} /></span>
          <div><span>重点关注班组</span><strong>{topTeam.name}</strong><p>{topTeam.name} 高风险占比 {topTeam.highRiskRate}%，当前 {topTeam.highRisk} 人处于高风险或严重风险。</p></div>
        </Card>
        <Card className="team-insight-card">
          <span className="insight-icon insight-green"><ArrowRight size={18} /></span>
          <div>
            <span>干预闭环</span>
            <strong>{avgCompletion}%</strong>
            <p>整体干预完成率 {avgCompletion}%。{lowTeams.length ? `${lowTeams.join('、')}低于组织平均，建议增加班组长跟进。` : '各班组完成率均达到组织平均。'}</p>
          </div>
        </Card>
      </div>

      <Card className="team-table-card">
        <SectionHeading title="班组对比明细" description="用于改善排班和支持流程，不用于个人排名" action={<span className="muted-badge">数据截止 14:00</span>} />
        <div className="data-table-wrap">
          <table className="data-table team-table">
            <thead>
              <tr><th>班组</th><th>班组长</th><th>人数</th><th>平均风险</th><th>高风险占比</th><th>预警数</th><th>干预完成率</th><th>设备在线率</th></tr>
            </thead>
            <tbody>
              {teamStats.map((team) => (
                <tr key={team.id}>
                  <td><strong>{team.name}</strong></td>
                  <td>{team.supervisor}</td>
                  <td>{team.headcount}</td>
                  <td>{team.avgRisk}</td>
                  <td><div className="team-rate-cell"><span>{team.highRiskRate}%</span><span className="team-rate-track"><span style={{ width: `${team.highRiskRate}%` }} /></span></div></td>
                  <td>{team.alertCount}</td>
                  <td><span className={cn('team-completion', team.completion < 80 && 'is-low')}>{team.completion}%</span></td>
                  <td>{team.deviceOnline}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <InfoCallout tone="warning">
          班组分析用于改善安全管理与排班，不应作为公开比较、绩效评价或纪律处分的依据。
        </InfoCallout>
      </Card>
    </div>
  )
}
