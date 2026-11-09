import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  BrainCircuit,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Play,
  ShieldCheck,
  TimerReset,
  Wind,
} from 'lucide-react'
import { KSS_LEVELS, POMS_DIMENSIONS, POMS_ITEMS, POMS_SCALE, VAS_ITEMS, pomsNormalizedScore } from '../../data/assessments'
import type { RiskLevel } from '../../types'
import { useApp } from '../../store/AppContext'
import { clamp } from '../../lib/risk'
import {
  Button,
  Card,
  InfoCallout,
  ProgressBar,
  RiskBadge,
  SectionHeading,
  cn,
} from '../../components/ui'
import { RiskGauge } from '../../components/charts'
import {
  AxcptTask,
  PvtTask,
  VstTask,
  type AxcptResult,
  type PvtResult,
  type VstResult,
} from '../../components/AttentionTests'

type Mode = 'quick' | 'full'

interface SubmittedResult {
  score: number
  level: RiskLevel
  confidence: string
}

const QUICK_STEPS = ['准备', '疲劳自评', '困倦自评', '注意力', '结果']
const FULL_STEPS = ['准备', '疲劳自评', '困倦自评', '情绪状态', 'PVT', '视觉搜索', '执行控制', '结果']

export default function AssessmentSession() {
  const { mode: rawMode } = useParams()
  const mode: Mode = rawMode === 'full' ? 'full' : 'quick'
  const navigate = useNavigate()
  const { currentEmployee, submitAssessment } = useApp()
  const [step, setStep] = useState(0)
  const [vasAnswers, setVasAnswers] = useState<Record<string, number>>(() => {
    const fatigueDefault = clamp(currentEmployee.vasF)
    return Object.fromEntries(
      VAS_ITEMS.map((item) => [
        item.id,
        item.kind === 'fatigue' ? fatigueDefault : clamp(100 - fatigueDefault),
      ]),
    )
  })
  const [kss, setKss] = useState(currentEmployee.kss || 5)
  const [pomsAnswers, setPomsAnswers] = useState<Record<string, number>>(() =>
    Object.fromEntries(POMS_ITEMS.map((item) => [item.id, 2])),
  )
  const [pvt, setPvt] = useState<PvtResult | null>(null)
  const [vst, setVst] = useState<VstResult | null>(null)
  const [axcpt, setAxcpt] = useState<AxcptResult | null>(null)
  const [submittedResult, setSubmittedResult] = useState<SubmittedResult | null>(null)
  const submittedRef = useRef(false)

  const steps = mode === 'quick' ? QUICK_STEPS : FULL_STEPS
  const resultIndex = steps.length - 1
  const isResult = step === resultIndex
  const progress = (step / resultIndex) * 100

  const vasFatigue = useMemo(() => {
    const fatigueItems = VAS_ITEMS.filter((item) => item.kind === 'fatigue')
    const energyItems = VAS_ITEMS.filter((item) => item.kind === 'energy')
    const fatigueAverage =
      fatigueItems.reduce((sum, item) => sum + (vasAnswers[item.id] ?? 0), 0) / fatigueItems.length
    const energyAverage =
      energyItems.reduce((sum, item) => sum + (vasAnswers[item.id] ?? 0), 0) / energyItems.length
    return clamp(Math.round(fatigueAverage * 0.7 + (100 - energyAverage) * 0.3), 0, 100)
  }, [vasAnswers])

  const vasEnergy = useMemo(() => {
    const energyItems = VAS_ITEMS.filter((item) => item.kind === 'energy')
    return Math.round(
      energyItems.reduce((sum, item) => sum + (vasAnswers[item.id] ?? 0), 0) / energyItems.length,
    )
  }, [vasAnswers])

  const poms = useMemo(() => pomsNormalizedScore(pomsAnswers), [pomsAnswers])
  const finalTaskDone = mode === 'quick' ? Boolean(pvt) : Boolean(axcpt)

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [step])

  const next = () => {
    setStep((current) => Math.min(resultIndex, current + 1))
  }

  const finish = () => {
    if (!pvt || submittedRef.current) return
    if (mode === 'full' && (!vst || !axcpt)) return
    submittedRef.current = true
    const result = submitAssessment({
      type: mode === 'quick' ? '快速测评' : '完整测评',
      subjective: {
        vasFatigue,
        vasEnergy,
        kss,
        pomsTmd: mode === 'full' ? poms.normalized : undefined,
        pomsDimensions: mode === 'full' ? poms.dimensions : undefined,
        durationSeconds: mode === 'quick' ? 360 : 1020,
      },
      cognitive: {
        pvt,
        vst: vst ?? undefined,
        axcpt: axcpt ?? undefined,
      },
    })
    setSubmittedResult({
      score: result.score,
      level: result.level as RiskLevel,
      confidence: result.confidence,
    })
    setStep(resultIndex)
  }

  const canContinue =
    step === 3 && mode === 'quick'
      ? Boolean(pvt)
      : step === 4 && mode === 'full'
        ? Boolean(pvt)
        : step === 5 && mode === 'full'
          ? Boolean(vst)
          : step === 6 && mode === 'full'
            ? Boolean(axcpt)
            : true

  return (
    <div className="assessment-session">
      <div className="session-topbar">
        <button className="back-link" onClick={() => navigate('/employee/assessment')}>
          <ArrowLeft size={16} />
          退出测评
        </button>
        <div className="session-title">
          <span className="card-kicker">{mode === 'quick' ? '快速测评' : '完整测评'}</span>
          <strong>{mode === 'quick' ? '5–8 分钟 · 班中快速复测' : '15–20 分钟 · 多模态完整评估'}</strong>
        </div>
        <div className="session-progress-copy">
          <span>步骤 {Math.min(step + 1, steps.length)} / {steps.length}</span>
          <ProgressBar value={progress} size="sm" label="测评进度" />
        </div>
      </div>

      <div className="session-layout">
        <aside className="session-rail" aria-label="测评步骤">
          {steps.map((label, index) => (
            <div key={label} className={cn('session-step', index === step && 'is-active', index < step && 'is-done')}>
              <span className="session-step-index">{index < step ? <Check size={13} /> : index + 1}</span>
              <span>{label}</span>
            </div>
          ))}
          <div className="session-rail-note">
            <ShieldCheck size={16} />
            <span>结果仅用于职业疲劳风险管理，不构成医疗诊断。</span>
          </div>
        </aside>

        <main className="session-content">
          {step === 0 && (
            <Card className="assessment-intro-card">
              <div className="assessment-intro-head">
                <span className="intro-symbol"><BrainCircuit size={24} /></span>
                <div>
                  <span className="card-kicker">开始之前</span>
                  <h1>用 5 分钟，确认现在是否适合继续工作</h1>
                  <p>请根据此刻的真实感受作答。没有“正确答案”，越真实的结果越有帮助。</p>
                </div>
              </div>
              <div className="assessment-check-grid">
                <div><CheckCircle2 size={18} /><span>设备已连接</span><strong>{currentEmployee.device}</strong></div>
                <div><CheckCircle2 size={18} /><span>今日班次</span><strong>{currentEmployee.shift} · {currentEmployee.shiftStart}–{currentEmployee.shiftEnd}</strong></div>
                <div><CheckCircle2 size={18} /><span>预计用时</span><strong>{mode === 'quick' ? '5–8 分钟' : '15–20 分钟'}</strong></div>
                <div><CheckCircle2 size={18} /><span>数据用途</span><strong>风险评估与恢复建议</strong></div>
              </div>
              {mode === 'full' && (
                <InfoCallout tone="info" title="完整测评包含">
                  VAS-F（18 项）、KSS（1 项）、POMS-SF（30 项）、PVT、VST 与 AX-CPT。建议在安静、不被打断的环境中完成。
                </InfoCallout>
              )}
              <div className="assessment-intro-actions">
                <Button size="lg" icon={<Play size={17} />} onClick={next}>
                  开始填写
                </Button>
                <span>首次使用建议先阅读 <button className="text-link" onClick={() => navigate('/employee/records')}>数据使用说明</button></span>
              </div>
            </Card>
          )}

          {step === 1 && (
            <Card className="assessment-form-card">
              <SectionHeading
                title="VAS-F 疲劳自评"
                description="请拖动滑杆，标记你此刻的感受强度。共 18 项，系统已根据最近一次结果预填，可按当前状态调整。"
                icon={<Wind size={18} />}
              />
              <div className="vas-list">
                {VAS_ITEMS.map((item) => (
                  <div key={item.id} className="vas-item">
                    <div className="vas-item-head">
                      <span>{item.text}</span>
                      <strong>{vasAnswers[item.id] ?? 50}</strong>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={vasAnswers[item.id] ?? 50}
                      onChange={(event) =>
                        setVasAnswers((current) => ({ ...current, [item.id]: Number(event.target.value) }))
                      }
                      aria-label={`${item.text}，当前 ${vasAnswers[item.id] ?? 50} 分`}
                      className={cn('vas-slider', item.kind === 'energy' && 'vas-slider-energy')}
                    />
                    <div className="vas-scale-labels">
                      <span>完全没有</span>
                      <span>非常明显</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="form-summary-strip">
                <span>综合疲劳分</span>
                <strong>{vasFatigue}<small>/100</small></strong>
                <span className="fine-print">疲劳维度 × 70% + 精力反向计分 × 30%</span>
              </div>
            </Card>
          )}

          {step === 2 && (
            <Card className="assessment-form-card">
              <SectionHeading
                title="KSS 困倦程度"
                description="选择最符合你此刻状态的一项。KSS ≥ 7 表示明显困倦；安全敏感岗位 ≥ 8 会触发严重风险规则。"
                icon={<Clock3 size={18} />}
              />
              <div className="kss-grid">
                {KSS_LEVELS.map((level) => (
                  <button
                    key={level.value}
                    className={cn('kss-option', kss === level.value && 'is-selected')}
                    onClick={() => setKss(level.value)}
                    aria-pressed={kss === level.value}
                  >
                    <strong>{level.value}</strong>
                    <span>{level.label}</span>
                    <em>{level.hint}</em>
                    {kss === level.value && <CheckCircle2 size={16} />}
                  </button>
                ))}
              </div>
              <InfoCallout tone={kss >= 8 ? 'warning' : 'info'}>
                {kss >= 8
                  ? '当前为严重困倦。若你处于安全敏感岗位，系统将建议停止高风险作业并联系班组长。'
                  : kss >= 7
                    ? '当前为明显困倦，建议尽快安排短时休息，并在 30 分钟内复测。'
                    : '当前困倦程度处于可工作范围，仍建议按计划休息。'}
              </InfoCallout>
            </Card>
          )}

          {step === 3 && mode === 'full' && (
            <Card className="assessment-form-card">
              <SectionHeading
                title="POMS 情绪状态"
                description="POMS-SF 共 30 项，请根据过去 24 小时的真实感受选择。0 = 完全没有，4 = 非常多。"
                icon={<BrainCircuit size={18} />}
              />
              <div className="poms-scale-legend">
                {POMS_SCALE.map((label, index) => (
                  <span key={label}><strong>{index}</strong>{label}</span>
                ))}
              </div>
              <div className="poms-groups">
                {(Object.keys(POMS_DIMENSIONS) as Array<keyof typeof POMS_DIMENSIONS>).map((dimension) => (
                  <div key={dimension} className="poms-group">
                    <h3>{POMS_DIMENSIONS[dimension]}</h3>
                    {POMS_ITEMS.filter((item) => item.dimension === dimension).map((item) => (
                      <div key={item.id} className="poms-row">
                        <span>{item.text}</span>
                        <div className="poms-options">
                          {POMS_SCALE.map((label, index) => (
                            <button
                              key={label}
                              className={cn('poms-dot', pomsAnswers[item.id] === index && 'is-selected')}
                              onClick={() =>
                                setPomsAnswers((current) => ({ ...current, [item.id]: index }))
                              }
                              aria-label={`${item.text}：${label}`}
                              aria-pressed={pomsAnswers[item.id] === index}
                              title={label}
                            >
                              {index}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              <div className="form-summary-strip">
                <span>POMS 标准化 TMD</span>
                <strong>{poms.normalized}<small>/100</small></strong>
                <span className="fine-print">原始 TMD {poms.rawTmd} · 仅用于疲劳风险管理</span>
              </div>
            </Card>
          )}

          {((step === 3 && mode === 'quick') || (step === 4 && mode === 'full')) && (
            <Card className="assessment-task-card">
              <PvtTask onComplete={setPvt} />
              {pvt && (
                <div className="task-continue-note">
                  <CheckCircle2 size={16} /> 结果已记录，继续完成剩余测评
                </div>
              )}
            </Card>
          )}

          {step === 5 && mode === 'full' && (
            <Card className="assessment-task-card">
              <VstTask onComplete={setVst} />
              {vst && <div className="task-continue-note"><CheckCircle2 size={16} /> 结果已记录</div>}
            </Card>
          )}

          {step === 6 && mode === 'full' && (
            <Card className="assessment-task-card">
              <AxcptTask onComplete={setAxcpt} />
              {axcpt && <div className="task-continue-note"><CheckCircle2 size={16} /> 结果已记录</div>}
            </Card>
          )}

          {isResult && submittedResult && (
            <Card className="assessment-result-card">
              <div className="session-result-head">
                <div>
                  <span className="card-kicker">测评完成</span>
                  <h1>你的多模态风险结果</h1>
                  <p>系统已结合本次生理、主观与注意力数据更新风险快照。</p>
                </div>
                <div className="session-result-score">
                  <RiskGauge score={submittedResult.score} level={submittedResult.level} size={144} />
                  <RiskBadge level={submittedResult.level} size="lg" />
                  <span>置信度：{submittedResult.confidence}</span>
                </div>
              </div>
              <div className="session-result-grid">
                <div>
                  <span>生理风险</span>
                  <strong>68</strong>
                  <em>HRV 低于个人基线</em>
                </div>
                <div>
                  <span>主观风险</span>
                  <strong>{Math.round(vasFatigue + poms.normalized * 0.2)}</strong>
                  <em>VAS-F {vasFatigue} · KSS {kss}</em>
                </div>
                <div>
                  <span>认知风险</span>
                  <strong>{pvt?.score ?? 0}</strong>
                  <em>PVT · {pvt?.lapses ?? 0} 次注意中断</em>
                </div>
                <div>
                  <span>数据完整度</span>
                  <strong>{mode === 'full' ? '高' : '中'}</strong>
                  <em>{mode === 'full' ? '三个模态均有效' : '生理 + 主观 + PVT'}</em>
                </div>
              </div>
              <div className="session-result-factors">
                <h3>主要影响因素</h3>
                {currentEmployee.factors.slice(0, 4).map((factor) => (
                  <div key={factor.label} className="session-factor-row">
                    <span>{factor.label}</span>
                    <span className="session-factor-bar"><span style={{ width: `${Math.min(100, factor.contribution * 4)}%` }} /></span>
                    <em>+{factor.contribution}</em>
                  </div>
                ))}
                <p>{submittedResult.level === 'high' || submittedResult.level === 'severe' ? '当前风险较高，建议暂停安全敏感作业并安排恢复。' : '当前风险处于可控范围，请继续保持规律休息。'}</p>
              </div>
              <div className="session-result-actions">
                <Button onClick={() => navigate('/employee/assessment/report')} icon={<ChevronRight size={16} />}>
                  查看完整测评报告
                </Button>
                {submittedResult.level === 'high' || submittedResult.level === 'severe' ? (
                  <Button variant="secondary" icon={<TimerReset size={16} />} onClick={() => navigate('/employee/intervention')}>
                    去安排恢复
                  </Button>
                ) : (
                  <Button variant="secondary" onClick={() => navigate('/employee')}>
                    返回今日状态
                  </Button>
                )}
              </div>
            </Card>
          )}

          {!isResult && step > 0 && (
            <div className="session-footer">
              <div>
                {step > 0 && (
                  <Button variant="ghost" icon={<ArrowLeft size={15} />} onClick={() => setStep((current) => Math.max(0, current - 1))}>
                    上一步
                  </Button>
                )}
              </div>
              <div className="session-footer-right">
                <span><ShieldCheck size={14} /> 自动保存 · 可随时退出</span>
                {step < resultIndex - 1 && (
                  <Button onClick={next} disabled={!canContinue} icon={<ArrowRight size={15} />}>
                    继续
                  </Button>
                )}
                {step === resultIndex - 1 && (
                  <Button onClick={finish} disabled={!finalTaskDone} icon={<CheckCircle2 size={15} />}>
                    生成风险结果
                  </Button>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
