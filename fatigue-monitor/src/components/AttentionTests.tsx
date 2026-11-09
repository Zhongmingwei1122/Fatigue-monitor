import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowRight, CheckCircle2, Keyboard, Play, RotateCcw, Timer, XCircle } from 'lucide-react'
import { Button, InfoCallout, cn } from './ui'
import { clamp, round } from '../lib/risk'

export interface PvtResult {
  valid: boolean
  meanRt: number
  lapses: number
  falseStarts: number
  score: number
}

export interface VstResult {
  valid: boolean
  accuracy: number
  meanRt: number
  score: number
}

export interface AxcptResult {
  valid: boolean
  accuracy: number
  dPrime: number
  score: number
}

const PVT_TRIALS = 10
type PvtPhase = 'intro' | 'countdown' | 'waiting' | 'stimulus' | 'between' | 'done'

export function PvtTask({
  onComplete,
  compact = false,
}: {
  onComplete: (result: PvtResult) => void
  compact?: boolean
}) {
  const [phase, setPhase] = useState<PvtPhase>('intro')
  const [countdown, setCountdown] = useState(3)
  const [trial, setTrial] = useState(0)
  const [stats, setStats] = useState({ responses: 0, misses: 0, falseStarts: 0 })
  const [result, setResult] = useState<PvtResult | null>(null)
  const trialRef = useRef(0)
  const responsesRef = useRef<number[]>([])
  const missesRef = useRef(0)
  const falseStartsRef = useRef(0)
  const stimulusAtRef = useRef(0)
  const respondedRef = useRef(false)

  const computeResult = useCallback((): PvtResult => {
    const responses = responsesRef.current
    const meanRt = responses.length
      ? Math.round(responses.reduce((sum, value) => sum + value, 0) / responses.length)
      : 1200
    const lapses = missesRef.current + responses.filter((value) => value > 500).length
    const score = Math.round(
      clamp(((meanRt - 200) / 4) + lapses * 6 + falseStartsRef.current * 2, 0, 100),
    )
    return {
      valid: responses.length >= 7,
      meanRt,
      lapses,
      falseStarts: falseStartsRef.current,
      score,
    }
  }, [])

  const finish = useCallback(() => {
    const next = computeResult()
    setResult(next)
    setPhase('done')
    onComplete(next)
  }, [computeResult, onComplete])

  const nextTrial = useCallback(() => {
    const next = trialRef.current + 1
    if (next >= PVT_TRIALS) {
      finish()
      return
    }
    trialRef.current = next
    setTrial(next)
    setPhase('waiting')
  }, [finish])

  const start = () => {
    trialRef.current = 0
    responsesRef.current = []
    missesRef.current = 0
    falseStartsRef.current = 0
    setTrial(0)
    setStats({ responses: 0, misses: 0, falseStarts: 0 })
    setResult(null)
    setCountdown(3)
    setPhase('countdown')
  }

  useEffect(() => {
    if (phase !== 'countdown') return
    if (countdown <= 0) {
      setPhase('waiting')
      return
    }
    const timer = window.setTimeout(() => setCountdown((current) => current - 1), 650)
    return () => window.clearTimeout(timer)
  }, [countdown, phase])

  useEffect(() => {
    if (phase !== 'waiting') return
    const delay = 1200 + Math.random() * 1400
    const timer = window.setTimeout(() => {
      stimulusAtRef.current = performance.now()
      respondedRef.current = false
      setPhase('stimulus')
    }, delay)
    return () => window.clearTimeout(timer)
  }, [phase, trial])

  useEffect(() => {
    if (phase !== 'stimulus') return
    const timer = window.setTimeout(() => {
      if (!respondedRef.current) {
        respondedRef.current = true
        missesRef.current += 1
        setStats((current) => ({ ...current, misses: current.misses + 1 }))
        setPhase('between')
      }
    }, 1200)
    return () => window.clearTimeout(timer)
  }, [phase, trial])

  useEffect(() => {
    if (phase !== 'between') return
    const timer = window.setTimeout(nextTrial, 420)
    return () => window.clearTimeout(timer)
  }, [nextTrial, phase])

  const respond = useCallback(() => {
    if (phase === 'stimulus' && !respondedRef.current) {
      const rt = Math.round(performance.now() - stimulusAtRef.current)
      respondedRef.current = true
      responsesRef.current.push(rt)
      setStats((current) => ({ ...current, responses: current.responses + 1 }))
      setPhase('between')
      return
    }
    if (phase === 'waiting') {
      falseStartsRef.current += 1
      setStats((current) => ({ ...current, falseStarts: current.falseStarts + 1 }))
    }
  }, [phase])

  useEffect(() => {
    if (phase !== 'waiting' && phase !== 'stimulus') return
    const handler = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        event.preventDefault()
        respond()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [phase, respond])

  return (
    <div className={cn('attention-task', compact && 'attention-task-compact')}>
      <div className="task-head">
        <div>
          <span className="task-kicker">PVT · 精神运动警觉任务</span>
          <h3>持续注意力检测</h3>
        </div>
        <span className="demo-tag">演示版 · {PVT_TRIALS} 次试次</span>
      </div>

      {phase === 'intro' && (
        <div className="task-intro">
          <div className="task-stage task-stage-intro">
            <span className="task-symbol"><Timer size={30} /></span>
            <h4>看到方块出现时，尽快按下空格键</h4>
            <p>不要提前按键。任务约 35 秒，请保持注视屏幕。</p>
          </div>
          <InfoCallout tone="info">
            生产环境采用 3 分钟标准 PVT；演示版缩短为 {PVT_TRIALS} 次试次，仅用于体验流程。
          </InfoCallout>
          <Button icon={<Play size={16} />} onClick={start}>开始 PVT</Button>
        </div>
      )}

      {phase === 'countdown' && (
        <div className="task-stage">
          <span className="task-stage-label">准备</span>
          <strong className="task-countdown">{countdown}</strong>
          <p>将手指放在空格键上</p>
        </div>
      )}

      {(phase === 'waiting' || phase === 'stimulus' || phase === 'between') && (
        <>
          <div className="task-progress">
            <span>试次 {trial + 1} / {PVT_TRIALS}</span>
            <span>{stats.responses} 次有效反应 · {stats.misses} 次遗漏</span>
          </div>
          <button
            type="button"
            className={cn('task-stage task-stage-pvt', phase === 'stimulus' && 'is-stimulus')}
            onClick={respond}
            aria-label="PVT 反应区域，点击或按空格"
          >
            {phase === 'stimulus' ? (
              <span className="pvt-stimulus">现在</span>
            ) : phase === 'between' ? (
              <span className="pvt-between"><CheckCircle2 size={26} /> 已记录</span>
            ) : (
              <span className="pvt-waiting">
                <span className="pvt-cross" />
                等待方块出现
              </span>
            )}
          </button>
          <div className="task-key-hint"><Keyboard size={15} /> 空格键或点击上方区域反应</div>
        </>
      )}

      {phase === 'done' && result && (
        <div className="task-result">
          <div className="task-result-hero">
            <span className={cn('result-mark', result.valid ? 'is-valid' : 'is-invalid')}>
              {result.valid ? <CheckCircle2 size={22} /> : <XCircle size={22} />}
            </span>
            <div>
              <span>PVT 完成</span>
              <strong>{result.score}<small>/100 风险分</small></strong>
            </div>
          </div>
          <div className="task-result-grid">
            <div><span>平均反应时</span><strong>{result.meanRt} ms</strong></div>
            <div><span>注意中断</span><strong>{result.lapses} 次</strong></div>
            <div><span>提前按键</span><strong>{result.falseStarts} 次</strong></div>
          </div>
          <InfoCallout tone={result.valid ? 'good' : 'warning'}>
            {result.valid ? '本次结果有效，已纳入多模态风险评估。' : '有效试次不足，结果仅供参考，建议重新测试。'}
          </InfoCallout>
          <Button variant="secondary" size="sm" icon={<RotateCcw size={14} />} onClick={start}>
            重新测试
          </Button>
        </div>
      )}
    </div>
  )
}

const VST_SEQUENCE = [true, false, true, true, false, true, true, false, true, false]
const GRID_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'U', 'V', 'W', 'X', 'Y', 'Z']

function makeVstGrid(targetPresent: boolean): string[] {
  const cells = Array.from({ length: 25 }, () => GRID_LETTERS[Math.floor(Math.random() * GRID_LETTERS.length)])
  if (targetPresent) {
    cells[Math.floor(Math.random() * 25)] = 'T'
  } else {
    for (let index = 0; index < cells.length; index += 1) {
      if (cells[index] === 'T') cells[index] = 'L'
    }
  }
  return cells
}

export function VstTask({ onComplete }: { onComplete: (result: VstResult) => void }) {
  const [phase, setPhase] = useState<'intro' | 'running' | 'feedback' | 'done'>('intro')
  const [trial, setTrial] = useState(0)
  const [cells, setCells] = useState<string[]>([])
  const [targetPresent, setTargetPresent] = useState(false)
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)
  const [result, setResult] = useState<VstResult | null>(null)
  const correctRef = useRef(0)
  const rtsRef = useRef<number[]>([])
  const startedAtRef = useRef(0)
  const feedbackTimerRef = useRef<number | null>(null)

  const finish = useCallback(() => {
    const accuracy = correctRef.current / VST_SEQUENCE.length
    const meanRt = rtsRef.current.length
      ? Math.round(rtsRef.current.reduce((sum, value) => sum + value, 0) / rtsRef.current.length)
      : 2200
    const score = Math.round(clamp((1 - accuracy) * 82 + clamp((meanRt - 1500) / 55, 0, 18), 0, 100))
    const next = { valid: accuracy >= 0.7, accuracy, meanRt, score }
    setResult(next)
    setPhase('done')
    onComplete(next)
  }, [onComplete])

  const beginTrial = useCallback((index: number) => {
    const present = VST_SEQUENCE[index]
    setTrial(index)
    setTargetPresent(present)
    setCells(makeVstGrid(present))
    setFeedback(null)
    setPhase('running')
    startedAtRef.current = performance.now()
  }, [])

  const start = () => {
    correctRef.current = 0
    rtsRef.current = []
    setResult(null)
    beginTrial(0)
  }

  const answer = useCallback(
    (answerPresent: boolean) => {
      if (phase !== 'running') return
      const rt = Math.round(performance.now() - startedAtRef.current)
      rtsRef.current.push(rt)
      const correct = answerPresent === targetPresent
      if (correct) correctRef.current += 1
      setFeedback(correct ? 'correct' : 'wrong')
      setPhase('feedback')
      feedbackTimerRef.current = window.setTimeout(() => {
        const next = trial + 1
        if (next >= VST_SEQUENCE.length) finish()
        else beginTrial(next)
      }, 380)
    },
    [beginTrial, finish, phase, targetPresent, trial],
  )

  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current) window.clearTimeout(feedbackTimerRef.current)
    }
  }, [])

  return (
    <div className="attention-task">
      <div className="task-head">
        <div>
          <span className="task-kicker">VST · 视觉搜索任务</span>
          <h3>视觉搜索与持续注意</h3>
        </div>
        <span className="demo-tag">演示版 · {VST_SEQUENCE.length} 个试次</span>
      </div>

      {phase === 'intro' && (
        <div className="task-intro">
          <div className="task-stage task-stage-intro">
            <span className="task-symbol">T</span>
            <h4>在字母网格中寻找目标字母 T</h4>
            <p>每轮只判断“有 T”或“没有 T”，请优先保证正确率。</p>
          </div>
          <Button icon={<Play size={16} />} onClick={start}>开始 VST</Button>
        </div>
      )}

      {(phase === 'running' || phase === 'feedback') && (
        <>
          <div className="task-progress">
            <span>试次 {trial + 1} / {VST_SEQUENCE.length}</span>
            <span>正确 {correctRef.current} 次</span>
          </div>
          <div className="vst-stage">
            <div className={cn('vst-grid', feedback && (feedback === 'correct' ? 'is-correct' : 'is-wrong'))}>
              {cells.map((letter, index) => (
                <span key={`${letter}-${index}`} className={cn('vst-cell', letter === 'T' && 'is-target')}>
                  {letter}
                </span>
              ))}
            </div>
            <div className="vst-actions">
              <Button variant="secondary" onClick={() => answer(false)} disabled={phase !== 'running'}>
                没有 T
              </Button>
              <Button onClick={() => answer(true)} disabled={phase !== 'running'}>
                有 T <ArrowRight size={15} />
              </Button>
            </div>
          </div>
          <div className="task-key-hint">
            {feedback ? (feedback === 'correct' ? '正确，准备下一轮…' : '已记录，准备下一轮…') : '找到 T 了吗？'}
          </div>
        </>
      )}

      {phase === 'done' && result && (
        <div className="task-result">
          <div className="task-result-hero">
            <span className={cn('result-mark', result.valid ? 'is-valid' : 'is-invalid')}>
              {result.valid ? <CheckCircle2 size={22} /> : <XCircle size={22} />}
            </span>
            <div>
              <span>VST 完成</span>
              <strong>{result.score}<small>/100 风险分</small></strong>
            </div>
          </div>
          <div className="task-result-grid">
            <div><span>正确率</span><strong>{Math.round(result.accuracy * 100)}%</strong></div>
            <div><span>平均反应时</span><strong>{result.meanRt} ms</strong></div>
            <div><span>有效性</span><strong>{result.valid ? '有效' : '无效'}</strong></div>
          </div>
          <Button variant="secondary" size="sm" icon={<RotateCcw size={14} />} onClick={start}>
            重新测试
          </Button>
        </div>
      )}
    </div>
  )
}

const AX_SEQUENCE = [
  { cue: 'A', probe: 'X', target: true },
  { cue: 'A', probe: 'X', target: true },
  { cue: 'A', probe: 'Y', target: false },
  { cue: 'A', probe: 'X', target: true },
  { cue: 'B', probe: 'X', target: false },
  { cue: 'A', probe: 'X', target: true },
  { cue: 'A', probe: 'X', target: true },
  { cue: 'A', probe: 'Y', target: false },
  { cue: 'A', probe: 'X', target: true },
  { cue: 'A', probe: 'X', target: true },
]

export function AxcptTask({ onComplete }: { onComplete: (result: AxcptResult) => void }) {
  const [phase, setPhase] = useState<'intro' | 'cue' | 'probe' | 'feedback' | 'done'>('intro')
  const [trial, setTrial] = useState(0)
  const [cue, setCue] = useState('A')
  const [probe, setProbe] = useState('X')
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)
  const [result, setResult] = useState<AxcptResult | null>(null)
  const trialRef = useRef(0)
  const correctRef = useRef(0)
  const hitRef = useRef(0)
  const hitTotalRef = useRef(0)
  const falseAlarmRef = useRef(0)
  const nonTargetTotalRef = useRef(0)
  const rtsRef = useRef<number[]>([])
  const probeAtRef = useRef(0)
  const answeredRef = useRef(false)
  const cueTimerRef = useRef<number | null>(null)
  const probeTimerRef = useRef<number | null>(null)
  const feedbackTimerRef = useRef<number | null>(null)

  const finish = useCallback(() => {
    const accuracy = correctRef.current / AX_SEQUENCE.length
    const hitRate = hitTotalRef.current ? hitRef.current / hitTotalRef.current : 0
    const falseAlarmRate = nonTargetTotalRef.current
      ? falseAlarmRef.current / nonTargetTotalRef.current
      : 0
    const dPrime = round(Math.max(0, (hitRate - falseAlarmRate) * 3), 2)
    const meanRt = rtsRef.current.length
      ? Math.round(rtsRef.current.reduce((sum, value) => sum + value, 0) / rtsRef.current.length)
      : 1400
    const score = Math.round(clamp((1 - accuracy) * 82 + clamp((meanRt - 600) / 45, 0, 18), 0, 100))
    const next = { valid: accuracy >= 0.7, accuracy, dPrime, score }
    setResult(next)
    setPhase('done')
    onComplete(next)
  }, [onComplete])

  const beginTrial = useCallback((index: number) => {
    const sequence = AX_SEQUENCE[index]
    trialRef.current = index
    setTrial(index)
    setCue(sequence.cue)
    setProbe(sequence.probe)
    setFeedback(null)
    setPhase('cue')
    answeredRef.current = false
    cueTimerRef.current = window.setTimeout(() => {
      setPhase('probe')
      probeAtRef.current = performance.now()
      probeTimerRef.current = window.setTimeout(() => {
        if (answeredRef.current) return
        answeredRef.current = true
        if (sequence.target) hitTotalRef.current += 1
        else nonTargetTotalRef.current += 1
        setFeedback('wrong')
        setPhase('feedback')
        feedbackTimerRef.current = window.setTimeout(() => {
          if (index + 1 >= AX_SEQUENCE.length) finish()
          else beginTrial(index + 1)
        }, 380)
      }, 2000)
    }, 700)
  }, [finish])

  const start = () => {
    correctRef.current = 0
    hitRef.current = 0
    hitTotalRef.current = 0
    falseAlarmRef.current = 0
    nonTargetTotalRef.current = 0
    rtsRef.current = []
    setResult(null)
    beginTrial(0)
  }

  const answer = useCallback(
    (isTargetAnswer: boolean) => {
      if (phase !== 'probe' || answeredRef.current) return
      answeredRef.current = true
      if (probeTimerRef.current) window.clearTimeout(probeTimerRef.current)
      const rt = Math.round(performance.now() - probeAtRef.current)
      rtsRef.current.push(rt)
      const sequence = AX_SEQUENCE[trialRef.current]
      const correct = isTargetAnswer === sequence.target
      if (correct) correctRef.current += 1
      if (sequence.target) {
        hitTotalRef.current += 1
        if (isTargetAnswer) hitRef.current += 1
      } else {
        nonTargetTotalRef.current += 1
        if (isTargetAnswer) falseAlarmRef.current += 1
      }
      setFeedback(correct ? 'correct' : 'wrong')
      setPhase('feedback')
      feedbackTimerRef.current = window.setTimeout(() => {
        if (trialRef.current + 1 >= AX_SEQUENCE.length) finish()
        else beginTrial(trialRef.current + 1)
      }, 380)
    },
    [beginTrial, finish, phase],
  )

  useEffect(() => {
    return () => {
      if (cueTimerRef.current) window.clearTimeout(cueTimerRef.current)
      if (probeTimerRef.current) window.clearTimeout(probeTimerRef.current)
      if (feedbackTimerRef.current) window.clearTimeout(feedbackTimerRef.current)
    }
  }, [])

  return (
    <div className="attention-task">
      <div className="task-head">
        <div>
          <span className="task-kicker">AX-CPT · 执行控制任务</span>
          <h3>工作记忆与执行控制</h3>
        </div>
        <span className="demo-tag">演示版 · {AX_SEQUENCE.length} 个试次</span>
      </div>

      {phase === 'intro' && (
        <div className="task-intro">
          <div className="task-stage task-stage-intro">
            <span className="task-symbol">A→X</span>
            <h4>只有先看到 A，再看到 X，才按“是 AX”</h4>
            <p>线索 A/B 会先出现，随后出现探测字母 X/Y。其他组合都按“非目标”。</p>
          </div>
          <Button icon={<Play size={16} />} onClick={start}>开始 AX-CPT</Button>
        </div>
      )}

      {(phase === 'cue' || phase === 'probe' || phase === 'feedback') && (
        <>
          <div className="task-progress">
            <span>试次 {trial + 1} / {AX_SEQUENCE.length}</span>
            <span>正确 {correctRef.current} 次</span>
          </div>
          <div className={cn('axcpt-stage', feedback && (feedback === 'correct' ? 'is-correct' : 'is-wrong'))}>
            {phase === 'cue' ? (
              <>
                <span className="axcpt-label">线索</span>
                <strong className="axcpt-letter">{cue}</strong>
                <span className="axcpt-hint">记住这个字母</span>
              </>
            ) : (
              <>
                <span className="axcpt-label">探测</span>
                <strong className="axcpt-letter">{probe}</strong>
                <span className="axcpt-hint">
                  {feedback ? (feedback === 'correct' ? '正确' : '已记录') : '现在做出判断'}
                </span>
              </>
            )}
          </div>
          <div className="axcpt-actions">
            <Button variant="secondary" onClick={() => answer(false)} disabled={phase !== 'probe'}>
              非目标
            </Button>
            <Button onClick={() => answer(true)} disabled={phase !== 'probe'}>
              是 AX <ArrowRight size={15} />
            </Button>
          </div>
        </>
      )}

      {phase === 'done' && result && (
        <div className="task-result">
          <div className="task-result-hero">
            <span className={cn('result-mark', result.valid ? 'is-valid' : 'is-invalid')}>
              {result.valid ? <CheckCircle2 size={22} /> : <XCircle size={22} />}
            </span>
            <div>
              <span>AX-CPT 完成</span>
              <strong>{result.score}<small>/100 风险分</small></strong>
            </div>
          </div>
          <div className="task-result-grid">
            <div><span>正确率</span><strong>{Math.round(result.accuracy * 100)}%</strong></div>
            <div><span>d′</span><strong>{result.dPrime}</strong></div>
            <div><span>有效性</span><strong>{result.valid ? '有效' : '无效'}</strong></div>
          </div>
          <Button variant="secondary" size="sm" icon={<RotateCcw size={14} />} onClick={start}>
            重新测试
          </Button>
        </div>
      )}
    </div>
  )
}
