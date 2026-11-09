import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Coffee,
  Droplets,
  HeartPulse,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  TimerReset,
  Users,
  Wind,
} from 'lucide-react'
import { useApp } from '../../store/AppContext'
import { getRiskMeta } from '../../lib/risk'
import { Button, Card, InfoCallout, Modal, PageHeader, ProgressBar, RiskBadge, SectionHeading, cn } from '../../components/ui'

interface RetestResult {
  score: number
  level: string
}

const INTERVENTION_OPTIONS = [
  {
    id: 'rest-20',
    type: '20 分钟恢复性休息',
    duration: 20,
    icon: Coffee,
    description: '离开工位，在安静环境休息，减少屏幕与噪声刺激。',
    evidence: '适用于 HRV 明显低于基线',
    tone: 'blue',
  },
  {
    id: 'rotate',
    type: '任务轮换 + 双人复核',
    duration: 30,
    icon: Users,
    description: '暂停安全敏感操作，由同伴接管关键步骤，改为低风险任务。',
    evidence: '适用于注意力下降、暂时不能离岗',
    tone: 'orange',
  },
  {
    id: 'breath',
    type: '3 分钟呼吸放松',
    duration: 3,
    icon: Wind,
    description: '缓慢呼吸，帮助降低生理唤醒。可作为完整休息前的过渡。',
    evidence: '适用于心率偏高、紧张',
    tone: 'green',
  },
  {
    id: 'hydrate',
    type: '补水与轻食',
    duration: 5,
    icon: Droplets,
    description: '补充水分和少量食物，帮助维持基础状态。',
    evidence: '适用于连续作业与轻度疲劳',
    tone: 'green',
  },
]

function statusLabel(status: string) {
  const map: Record<string, string> = {
    pending: '待确认',
    acknowledged: '已确认',
    in_progress: '干预中',
    pending_retest: '待复测',
    resolved: '已解除',
    completed: '已完成',
    accepted: '已接收',
    overdue: '已逾期',
    cancelled: '已取消',
  }
  return map[status] ?? status
}

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`
}

export default function Intervention() {
  const {
    currentEmployee,
    alerts,
    interventions,
    acknowledgeAlert,
    startCurrentIntervention,
    completeIntervention,
    retestCurrent,
    addToast,
  } = useApp()
  const navigate = useNavigate()
  const [activeId, setActiveId] = useState<string | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [selectedMinutes, setSelectedMinutes] = useState(20)
  const [paused, setPaused] = useState(false)
  const [retestOpen, setRetestOpen] = useState(false)
  const [retestKss, setRetestKss] = useState(4)
  const [retestVasF, setRetestVasF] = useState(38)
  const [retestResult, setRetestResult] = useState<RetestResult | null>(null)
  const completedRef = useRef(false)

  const activeAlert = alerts.find(
    (alert) =>
      alert.employeeId === currentEmployee.id &&
      ['pending', 'acknowledged', 'in_progress', 'pending_retest'].includes(alert.status),
  )
  const activeIntervention = interventions.find(
    (task) => task.id === activeId || (task.employeeId === currentEmployee.id && ['in_progress', 'pending_retest'].includes(task.status)),
  )
  const history = interventions.filter(
    (task) => task.employeeId === currentEmployee.id && ['completed', 'cancelled'].includes(task.status),
  )
  const selectedOption = INTERVENTION_OPTIONS.find((option) => option.duration === selectedMinutes) ?? INTERVENTION_OPTIONS[0]
  const timerDone = Boolean(activeId && secondsLeft === 0)
  const meta = getRiskMeta(currentEmployee.riskLevel)

  const restCompleted = activeIntervention?.status === 'pending_retest' || activeIntervention?.status === 'completed'
  const canStart = !activeId || timerDone

  const lastCompleted = useMemo(
    () => interventions.find((task) => task.employeeId === currentEmployee.id && task.status === 'completed'),
    [currentEmployee.id, interventions],
  )

  useEffect(() => {
    if (!activeId || paused || secondsLeft <= 0) return
    const timer = window.setInterval(() => {
      setSecondsLeft((current) => Math.max(0, current - 1))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [activeId, paused, secondsLeft])

  useEffect(() => {
    if (!activeId || secondsLeft !== 0 || completedRef.current) return
    completedRef.current = true
    completeIntervention(activeId)
    setRetestOpen(true)
  }, [activeId, completeIntervention, secondsLeft])

  const begin = (type: string, duration: number) => {
    if (!canStart) return
    const id = startCurrentIntervention(type, duration)
    completedRef.current = false
    setActiveId(id)
    setSelectedMinutes(duration)
    setSecondsLeft(duration * 60)
    setPaused(false)
    setRetestResult(null)
  }

  const skipTimer = () => {
    if (!activeId) return
    setSecondsLeft(0)
  }

  const submitRetest = () => {
    const result = retestCurrent(retestKss, retestVasF)
    if (result) {
      setRetestResult({ score: result.score, level: result.level })
    }
    setRetestOpen(false)
    addToast({ title: '复测结果已记录', description: '预警已更新，复测结果已关联到本次干预。', tone: 'success' })
  }

  return (
    <div className="intervention-page">
      <PageHeader
        eyebrow="干预与恢复"
        title="先恢复，再决定下一步"
        description="系统会把预警变成具体的恢复动作。完成休息后，请进行一次快速复测，确认是否适合继续工作。"
        actions={
          <Button variant="secondary" icon={<ArrowRight size={15} />} onClick={() => navigate('/employee/assessment/quick')}>
            直接复测
          </Button>
        }
      />

      <Card className={cn('alert-focus-card', activeAlert ? `tone-${activeAlert.level}` : 'tone-low')}>
        <div className="alert-focus-main">
          <span className="alert-focus-icon"><ShieldAlert size={22} /></span>
          <div>
            <div className="alert-focus-top">
              <span className="card-kicker">当前预警</span>
              {activeAlert ? <RiskBadge level={activeAlert.level} /> : <span className="status-done"><CheckCircle2 size={14} /> 已解除</span>}
              <span className="alert-focus-time">{activeAlert?.createdAt ?? '今天 14:18'}</span>
            </div>
            <h2>{activeAlert?.title ?? '当前没有未关闭的疲劳预警'}</h2>
            <p>{activeAlert?.reason ?? '你的风险已经回到可控范围，请继续保持规律休息。'}</p>
            {activeAlert && (
              <div className="alert-factor-chips">
                {activeAlert.factors.map((factor) => <span key={factor}>{factor}</span>)}
              </div>
            )}
          </div>
        </div>
        <div className="alert-focus-side">
          <div className="alert-sla">
            <span>响应时限</span>
            <strong>{activeAlert?.status === 'pending' ? '剩余 4 分钟' : statusLabel(activeAlert?.status ?? 'resolved')}</strong>
            <ProgressBar value={activeAlert?.status === 'pending' ? 62 : 100} tone="warning" size="sm" label="预警响应时限" />
          </div>
          {activeAlert?.status === 'pending' && (
            <Button variant="secondary" size="sm" onClick={() => acknowledgeAlert(activeAlert.id)}>
              我已知晓
            </Button>
          )}
          <span className="alert-policy"><ShieldCheck size={14} /> 严重风险不可自行关闭</span>
        </div>
      </Card>

      <div className="intervention-main-grid">
        <Card className="rest-timer-card">
          <SectionHeading
            title={restCompleted ? '休息完成，请复测' : activeId ? '恢复计时中' : '开始一次恢复'}
            description={restCompleted ? '复测将对比干预前后的风险变化' : '选择一种恢复方式，系统会记录实际休息时长'}
            icon={<TimerReset size={18} />}
            action={<span className="muted-badge">{selectedOption.type}</span>}
          />

          {!activeId && (
            <div className="intervention-picker">
              {INTERVENTION_OPTIONS.map((option) => {
                const Icon = option.icon
                return (
                  <button
                    key={option.id}
                    className={cn('intervention-option', selectedMinutes === option.duration && 'is-selected')}
                    onClick={() => setSelectedMinutes(option.duration)}
                  >
                    <span className={cn('intervention-option-icon', `tone-${option.tone}`)}><Icon size={18} /></span>
                    <span>
                      <strong>{option.type}</strong>
                      <em>{option.description}</em>
                    </span>
                    <span className="intervention-option-duration">{option.duration} 分钟</span>
                  </button>
                )
              })}
            </div>
          )}

          {activeId && (
            <div className={cn('timer-zone', timerDone && 'is-done')}>
              <div className="timer-ring" style={{ '--timer-color': timerDone ? 'var(--status-good)' : meta.color } as React.CSSProperties}>
                <svg viewBox="0 0 140 140" aria-hidden="true">
                  <circle cx="70" cy="70" r="58" fill="none" stroke="var(--line)" strokeWidth="8" />
                  <circle
                    cx="70"
                    cy="70"
                    r="58"
                    fill="none"
                    stroke="var(--timer-color)"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${(secondsLeft / (selectedOption.duration * 60)) * 364} 364`}
                    transform="rotate(-90 70 70)"
                  />
                </svg>
                <div>
                  <strong>{formatTime(secondsLeft)}</strong>
                  <span>{timerDone ? '休息完成' : paused ? '已暂停' : '请放松'}</span>
                </div>
              </div>
              <div className="timer-actions">
                {!timerDone && (
                  <>
                    <Button variant="secondary" size="sm" icon={paused ? <Play size={14} /> : <Pause size={14} />} onClick={() => setPaused((value) => !value)}>
                      {paused ? '继续计时' : '暂停'}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={skipTimer}>演示：立即完成</Button>
                  </>
                )}
                {timerDone && (
                  <Button onClick={() => setRetestOpen(true)} icon={<RefreshCw size={15} />}>
                    开始复测
                  </Button>
                )}
              </div>
              {!timerDone && <p className="timer-note">休息结束后将自动提示复测。演示环境可使用“立即完成”跳过等待。</p>}
            </div>
          )}

          {!activeId && (
            <Button full size="lg" icon={<Play size={16} />} onClick={() => begin(selectedOption.type, selectedOption.duration)}>
              开始 {selectedOption.type}
            </Button>
          )}

          {restCompleted && (
            <div className="rest-complete-banner">
              <CheckCircle2 size={18} />
              <div>
                <strong>休息已完成，等待复测</strong>
                <span>复测会更新你的当前风险，并关联到本次干预记录。</span>
              </div>
              <Button size="sm" onClick={() => setRetestOpen(true)}>去复测</Button>
            </div>
          )}

          {retestResult && (
            <div className="retest-result-card">
              <div>
                <span>复测完成</span>
                <strong>{retestResult.score}<small>/100</small></strong>
                <RiskBadge level={retestResult.level as typeof currentEmployee.riskLevel} size="sm" />
              </div>
              <div>
                <span>干预前</span>
                <strong>{activeIntervention?.preScore ?? lastCompleted?.preScore ?? 71}</strong>
                <em>→ 下降 {Math.max(0, (activeIntervention?.preScore ?? 71) - retestResult.score)} 分</em>
              </div>
              <InfoCallout tone="good">
                预警已解除。若仍有困倦，请继续休息并联系班组长；安全敏感作业需按企业流程恢复。
              </InfoCallout>
            </div>
          )}
        </Card>

        <Card className="recommendation-side-card">
          <SectionHeading
            title="推荐干预"
            description="根据触发因素生成"
            icon={<HeartPulse size={18} />}
          />
          <div className="side-recommendations">
            <button onClick={() => begin('20 分钟恢复性休息', 20)} disabled={!canStart}>
              <span className="side-rec-icon tone-blue"><Coffee size={17} /></span>
              <span><strong>恢复性休息</strong><em>HRV 下降 · 优先降低生理负荷</em></span>
              <ArrowRight size={15} />
            </button>
            <button onClick={() => begin('任务轮换 + 双人复核', 30)} disabled={!canStart}>
              <span className="side-rec-icon tone-orange"><Users size={17} /></span>
              <span><strong>任务轮换</strong><em>注意力下降 · 暂停安全敏感操作</em></span>
              <ArrowRight size={15} />
            </button>
            <button onClick={() => begin('补水与轻食', 5)} disabled={!canStart}>
              <span className="side-rec-icon tone-green"><Droplets size={17} /></span>
              <span><strong>补水与轻食</strong><em>连续作业 · 维持基础状态</em></span>
              <ArrowRight size={15} />
            </button>
          </div>
          <InfoCallout tone="info">
            不建议在班末大量摄入咖啡因；如你有已知健康限制，请遵循职业健康建议。
          </InfoCallout>
          <div className="side-note">
            <Clock3 size={15} />
            干预建议不会替代现场判断。若出现胸闷、晕厥等不适，请立即就医。
          </div>
        </Card>
      </div>

      <Card className="intervention-history">
        <SectionHeading
          title="我的干预记录"
          description="休息、任务调整与复测结果都会保存在这里"
          action={<span className="muted-badge">{history.length} 条已完成</span>}
        />
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>时间</th>
                <th>干预</th>
                <th>原因</th>
                <th>时长</th>
                <th>干预前</th>
                <th>复测后</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              {history.map((task) => (
                <tr key={task.id}>
                  <td>{task.createdAt}</td>
                  <td>{task.type}</td>
                  <td>{task.reason}</td>
                  <td>{task.durationMinutes} 分钟</td>
                  <td>{task.preScore}</td>
                  <td className="td-strong">{task.postScore ?? '—'}</td>
                  <td><span className="status-done"><CheckCircle2 size={13} /> 已完成</span></td>
                </tr>
              ))}
              {history.length === 0 && (
                <tr><td colSpan={7}><span className="empty-inline">还没有已完成的干预记录。</span></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal
        open={retestOpen}
        onClose={() => setRetestOpen(false)}
        title="完成干预后复测"
        description="用两个问题快速确认恢复情况，系统会更新风险并关联本次干预。"
        footer={
          <>
            <Button variant="secondary" onClick={() => setRetestOpen(false)}>稍后再测</Button>
            <Button onClick={submitRetest} icon={<RotateCcw size={15} />}>提交复测</Button>
          </>
        }
      >
        <div className="retest-form">
          <div className="retest-field">
            <div className="retest-label-row">
              <span>KSS 困倦程度</span>
              <strong>{retestKss} / 9</strong>
            </div>
            <div className="retest-kss-row">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((value) => (
                <button key={value} className={cn('retest-kss', retestKss === value && 'is-selected')} onClick={() => setRetestKss(value)}>
                  {value}
                </button>
              ))}
            </div>
            <div className="retest-scale-labels"><span>清醒</span><span>极度困倦</span></div>
          </div>
          <div className="retest-field">
            <div className="retest-label-row">
              <span>当前疲劳程度 (VAS-F)</span>
              <strong>{retestVasF} / 100</strong>
            </div>
            <input type="range" min="0" max="100" value={retestVasF} onChange={(event) => setRetestVasF(Number(event.target.value))} className="vas-slider" aria-label="复测疲劳程度" />
            <div className="retest-scale-labels"><span>完全不疲劳</span><span>极度疲劳</span></div>
          </div>
          <InfoCallout tone="info">
            本演示使用当前生理趋势模拟复测。生产环境会重新采集 HRV、KSS 与 PVT 数据。
          </InfoCallout>
        </div>
      </Modal>
    </div>
  )
}
