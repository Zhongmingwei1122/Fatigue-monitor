import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  BatteryMedium,
  Bluetooth,
  CalendarDays,
  ChevronRight,
  Clock3,
  Coffee,
  HeartPulse,
  Moon,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sun,
  TimerReset,
  Watch,
  Wind,
} from 'lucide-react'
import { useApp } from '../../store/AppContext'
import { DAY_LABELS } from '../../data/mockData'
import { getRiskMeta } from '../../lib/risk'
import { Button, Card, ProgressBar, RiskBadge, SectionHeading, cn } from '../../components/ui'
import { LineChart, RiskGauge, Sparkline } from '../../components/charts'

function formatDelta(current: number, baseline: number, unit: string) {
  const delta = current - baseline
  const sign = delta > 0 ? '+' : ''
  return `${sign}${delta}${unit}`
}

export default function EmployeeHome() {
  const { currentEmployee, alerts, assessments } = useApp()
  const navigate = useNavigate()
  const [trendMode, setTrendMode] = useState<'risk' | 'hrv'>('risk')
  const meta = getRiskMeta(currentEmployee.riskLevel)
  const activeAlert = alerts.find(
    (alert) =>
      alert.employeeId === currentEmployee.id &&
      ['pending', 'acknowledged', 'in_progress', 'pending_retest'].includes(alert.status),
  )
  const lastAssessment = assessments.find((assessment) => assessment.employeeId === currentEmployee.id)
  const trendData = currentEmployee.trend7.map((value, index) => ({ label: DAY_LABELS[index], value }))
  const hrvData = currentEmployee.hrvTrend.map((value, index) => ({ label: DAY_LABELS[index], value }))
  const greeting =
    new Date().getHours() < 11 ? '早上好' : new Date().getHours() < 18 ? '下午好' : '晚上好'
  const shiftIcon = currentEmployee.shift === '夜班' ? Moon : currentEmployee.shift === '休息' ? Coffee : Sun
  const ShiftIcon = shiftIcon

  return (
    <div className="employee-home">
      <div className="employee-greeting">
        <div>
          <div className="greeting-meta">
            <span>11 月 9 日 · 星期一</span>
            <span className="meta-divider" />
            <span>数据更新于 2 分钟前</span>
          </div>
          <h1>{greeting}，{currentEmployee.name}</h1>
          <p>今天也请先照顾好自己，再开始工作。</p>
        </div>
        <div className="greeting-shift">
          <span className={cn('shift-badge', currentEmployee.shift === '夜班' && 'shift-night')}>
            <ShiftIcon size={15} />
            {currentEmployee.shift}
          </span>
          <span>{currentEmployee.shiftStart} – {currentEmployee.shiftEnd}</span>
          {currentEmployee.safetySensitive && <em>安全敏感岗位</em>}
        </div>
      </div>

      <div className="employee-top-grid">
        <Card
          className="risk-hero-card"
          style={{ '--risk-accent': meta.color, '--risk-soft': meta.soft, '--risk-ink': meta.ink } as React.CSSProperties}
        >
          <div className="risk-hero-main">
            <div className="risk-hero-copy">
              <div className="card-kicker">
                <span className="live-dot" />
                今日疲劳状态
              </div>
              <div className="risk-hero-title">
                <RiskBadge level={currentEmployee.riskLevel} size="lg" />
                <span className="risk-trend-chip">
                  {currentEmployee.riskTrend === 'up' ? '较上次 ↑' : currentEmployee.riskTrend === 'down' ? '较上次 ↓' : '保持稳定'}
                </span>
              </div>
              <h2>{currentEmployee.riskLevel === 'high' ? '你的身体正在提醒你放慢一点。' : meta.description}</h2>
              <p>{meta.description}。当前风险主要来自生理恢复不足与主观困倦，建议先暂停安全敏感作业，完成一次短时恢复。</p>
              <div className="factor-chips">
                {currentEmployee.factors.slice(0, 3).map((factor) => (
                  <span key={factor.label}>{factor.label}</span>
                ))}
              </div>
              <div className="risk-hero-actions">
                <Button icon={<TimerReset size={16} />} onClick={() => navigate('/employee/intervention')}>
                  去休息 / 查看建议
                </Button>
                <Button variant="secondary" icon={<RefreshCw size={16} />} onClick={() => navigate('/employee/assessment')}>
                  开始快速测评
                </Button>
              </div>
            </div>
            <div className="risk-hero-gauge">
              <RiskGauge score={currentEmployee.riskScore} level={currentEmployee.riskLevel} />
              <span>个人基线 52 ms · 当前 38 ms</span>
            </div>
          </div>
          <div className="risk-hero-foot">
            <span><HeartPulse size={15} /> HRV 较基线下降 27%</span>
            <span><Clock3 size={15} /> 连续工作第 {currentEmployee.consecutiveDays} 天</span>
            <button onClick={() => navigate('/employee/risk')}>
              查看完整风险解释 <ChevronRight size={14} />
            </button>
          </div>
        </Card>

        <Card className="shift-card">
          <SectionHeading
            title="今日班次"
            icon={<CalendarDays size={18} />}
            action={<span className="muted-badge">进行中</span>}
          />
          <div className="shift-main">
            <div className="shift-time-row">
              <div>
                <span>开始</span>
                <strong>{currentEmployee.shiftStart}</strong>
              </div>
              <span className="shift-line"><span style={{ width: '54%' }} /></span>
              <div className="align-right">
                <span>结束</span>
                <strong>{currentEmployee.shiftEnd}</strong>
              </div>
            </div>
            <div className="shift-progress-copy">
              <span>本班已进行 6 小时 30 分</span>
              <span>剩余 5 小时 30 分</span>
            </div>
            <ProgressBar value={54} label="今日班次进度" />
          </div>
          <div className="shift-facts">
            <div>
              <span>连续工作</span>
              <strong>{currentEmployee.consecutiveDays} 天</strong>
            </div>
            <div>
              <span>累计加班</span>
              <strong>{currentEmployee.overtimeHours} 小时</strong>
            </div>
            <div>
              <span>计划休息</span>
              <strong>12:00 已休</strong>
            </div>
          </div>
          {currentEmployee.safetySensitive && (
            <div className="safety-strip">
              <ShieldAlert size={15} />
              当前岗位为安全敏感岗位，高风险时请停止高风险操作。
            </div>
          )}
        </Card>
      </div>

      <div className="three-card-grid">
        <Card className="metric-card">
          <div className="metric-card-head">
            <span className="metric-icon metric-icon-blue"><HeartPulse size={17} /></span>
            <span>生理状态</span>
            <button onClick={() => navigate('/employee/risk')}>趋势 <ArrowRight size={13} /></button>
          </div>
          <div className="metric-big-row">
            <div className="metric-big">
              <span>HRV (RMSSD)</span>
              <strong>{currentEmployee.hrv}<small>ms</small></strong>
              <em className={currentEmployee.hrv < currentEmployee.baselineHrv ? 'text-bad' : 'text-good'}>
                {formatDelta(currentEmployee.hrv, currentEmployee.baselineHrv, ' ms')} vs 基线
              </em>
            </div>
            <Sparkline
              data={currentEmployee.hrvTrend}
              color="var(--series-2)"
              width={104}
              height={42}
            />
          </div>
          <div className="metric-split">
            <div>
              <span>心率</span>
              <strong>{currentEmployee.hr} <small>bpm</small></strong>
              <em>基线 {currentEmployee.baselineHr}</em>
            </div>
            <div>
              <span>呼吸率</span>
              <strong>16 <small>次/分</small></strong>
              <em>个人范围</em>
            </div>
          </div>
        </Card>

        <Card className="metric-card">
          <div className="metric-card-head">
            <span className="metric-icon metric-icon-orange"><Wind size={17} /></span>
            <span>疲劳自评</span>
            <button onClick={() => navigate('/employee/assessment')}>去填写 <ArrowRight size={13} /></button>
          </div>
          <div className="assessment-mini">
            <div>
              <span>VAS-F 疲劳程度</span>
              <strong>{currentEmployee.vasF}<small>/100</small></strong>
            </div>
            <div className="assessment-scale" aria-hidden="true">
              <span style={{ width: `${currentEmployee.vasF}%` }} />
            </div>
            <div className="assessment-mini-labels">
              <span>不疲劳</span>
              <span>极度疲劳</span>
            </div>
          </div>
          <div className="metric-split">
            <div>
              <span>KSS 困倦</span>
              <strong>{currentEmployee.kss} <small>/9</small></strong>
              <em>{currentEmployee.kss >= 7 ? '明显困倦' : currentEmployee.kss >= 5 ? '轻度困倦' : '清醒'}</em>
            </div>
            <div>
              <span>POMS-TMD</span>
              <strong>{currentEmployee.pomsTmd} <small>/100</small></strong>
              <em>{lastAssessment?.createdAt ?? '今天 13:40'}</em>
            </div>
          </div>
          <button className="card-link wide" onClick={() => navigate('/employee/assessment')}>
            完成今日自评 <ArrowRight size={14} />
          </button>
        </Card>

        <Card className="device-card">
          <div className="metric-card-head">
            <span className="metric-icon metric-icon-green"><Watch size={17} /></span>
            <span>设备与数据质量</span>
            <span className="status-online"><span /> 已连接</span>
          </div>
          <div className="device-name">
            <div className="device-visual"><Watch size={30} strokeWidth={1.3} /></div>
            <div>
              <strong>{currentEmployee.device}</strong>
              <span>可穿戴生理监测设备</span>
            </div>
            <span className="device-battery"><BatteryMedium size={15} /> 86%</span>
          </div>
          <div className="device-stats">
            <div><span>数据完整度</span><strong>{currentEmployee.dataCompleteness}%</strong></div>
            <div><span>信号质量</span><strong>优</strong></div>
            <div><span>最近同步</span><strong>刚刚</strong></div>
          </div>
          <div className="device-actions">
            <span><Bluetooth size={14} /> 佩戴状态正常</span>
            <button onClick={() => navigate('/employee/assessment')}>检查设备 <ArrowRight size={13} /></button>
          </div>
        </Card>
      </div>

      <div className="employee-bottom-grid">
        <Card className="trend-card">
          <SectionHeading
            title="个人趋势"
            description="最近 7 天 · 班次与测评事件已标注"
            action={
              <div className="mini-tabs" role="tablist" aria-label="选择趋势指标">
                <button className={cn(trendMode === 'risk' && 'is-active')} onClick={() => setTrendMode('risk')} role="tab" aria-selected={trendMode === 'risk'}>
                  疲劳风险
                </button>
                <button className={cn(trendMode === 'hrv' && 'is-active')} onClick={() => setTrendMode('hrv')} role="tab" aria-selected={trendMode === 'hrv'}>
                  HRV
                </button>
              </div>
            }
          />
          <div className="trend-summary">
            <div>
              <span>{trendMode === 'risk' ? '今日风险' : '今日 HRV'}</span>
              <strong>{trendMode === 'risk' ? currentEmployee.riskScore : currentEmployee.hrv}{trendMode === 'risk' ? <small>/100</small> : <small> ms</small>}</strong>
            </div>
            <span className={trendMode === 'risk' ? 'trend-up' : 'trend-down'}>
              {trendMode === 'risk' ? '7 天上升 29 分' : '7 天下降 14 ms'}
            </span>
            <span className="trend-note">个人基线 {currentEmployee.baselineHrv} ms</span>
          </div>
          <LineChart
            data={trendMode === 'risk' ? trendData : hrvData}
            height={238}
            min={0}
            max={trendMode === 'risk' ? 100 : 80}
            color={trendMode === 'risk' ? 'var(--series-1)' : 'var(--series-2)'}
            unit={trendMode === 'risk' ? ' 分' : ' ms'}
            thresholds={
              trendMode === 'risk'
                ? [
                    { value: 75, label: '严重' },
                    { value: 50, label: '高风险' },
                    { value: 25, label: '关注' },
                  ]
                : [{ value: currentEmployee.baselineHrv, label: '基线' }]
            }
            ariaLabel={trendMode === 'risk' ? '最近 7 天疲劳风险趋势' : '最近 7 天 HRV 趋势'}
          />
          <div className="trend-event-note">
            <span><span className="event-dot" /> 11-09 完成快速测评</span>
            <span><span className="event-dot event-dot-orange" /> 11-06 班中休息</span>
            <span><span className="event-dot event-dot-gray" /> 11-05 设备离线 20 分钟</span>
          </div>
        </Card>

        <Card className={cn('rest-guidance-card', activeAlert?.level && `tone-${activeAlert.level}`)}>
          <div className="rest-guidance-top">
            <span className="rest-icon"><Coffee size={20} /></span>
            <div>
              <span className="card-kicker">风险预警</span>
              <h2>{activeAlert ? '现在需要安排一次恢复' : '当前无需额外休息'}</h2>
            </div>
          </div>
          <p>
            {activeAlert
              ? '你的 HRV 与主观困倦已达到高风险阈值。建议暂停安全敏感作业，休息 20–30 分钟后复测。'
              : '保持规律休息和补水即可。若感到困倦，可随时安排 5–10 分钟微休息。'}
          </p>
          <div className="rest-facts">
            <div><span>建议休息</span><strong>20–30 分钟</strong></div>
            <div><span>建议复测</span><strong>30 分钟内</strong></div>
          </div>
          <div className="rest-actions">
            <Button full icon={<TimerReset size={16} />} onClick={() => navigate('/employee/intervention')}>
              开始休息计时
            </Button>
            <Button variant="secondary" full onClick={() => navigate('/employee/risk')}>
              查看预警原因
            </Button>
          </div>
          <div className="rest-note">
            <ShieldCheck size={15} />
            高风险提示不会影响你的考勤记录，仅用于安全支持。
          </div>
        </Card>
      </div>
    </div>
  )
}
