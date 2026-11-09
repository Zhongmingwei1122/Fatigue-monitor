import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  Clock3,
  Eye,
  HeartPulse,
  Keyboard,
  Layers3,
  Play,
  ShieldCheck,
  Wind,
} from 'lucide-react'
import { useApp } from '../../store/AppContext'
import { Button, Card, PageHeader, RiskBadge, SectionHeading, cn } from '../../components/ui'
import { Sparkline } from '../../components/charts'

export default function AssessmentCenter() {
  const { currentEmployee, assessments } = useApp()
  const navigate = useNavigate()
  const latest = assessments.find((assessment) => assessment.employeeId === currentEmployee.id)
  const history = assessments.filter((assessment) => assessment.employeeId === currentEmployee.id)

  return (
    <div className="assessment-center">
      <PageHeader
        eyebrow="多模态评估"
        title="把“感觉有点累”变成可理解的数据"
        description="生理信号、主观感受与注意力表现相互印证。完成一次评估，帮助你决定现在是否适合继续工作。"
        actions={
          <>
            <Button variant="secondary" onClick={() => navigate('/employee/assessment/full')}>
              完整测评 · 15–20 分钟
            </Button>
            <Button icon={<Play size={16} />} onClick={() => navigate('/employee/assessment/quick')}>
              快速测评 · 5–8 分钟
            </Button>
          </>
        }
      />

      <div className="assessment-hero-grid">
        <Card className="assessment-latest">
          <div className="assessment-latest-top">
            <div>
              <span className="card-kicker">最近一次测评</span>
              <div className="assessment-latest-score">
                <strong>{latest?.riskScore ?? currentEmployee.riskScore}</strong>
                <span>/100</span>
                <RiskBadge level={latest?.riskLevel ?? currentEmployee.riskLevel} />
              </div>
              <p>{latest?.summary ?? '完成一次快速测评，建立今天的状态基线。'}</p>
            </div>
            <div className="assessment-latest-meta">
              <span><Clock3 size={14} /> {latest?.createdAt ?? '今天 13:40'}</span>
              <span><ShieldCheck size={14} /> {latest?.validity ?? '有效'}</span>
              <span><Layers3 size={14} /> {latest?.type ?? '快速测评'}</span>
            </div>
          </div>
          <div className="assessment-modality-scores">
            <div>
              <span>生理</span>
              <strong>68</strong>
              <em>HRV 偏低</em>
            </div>
            <div>
              <span>主观</span>
              <strong>62</strong>
              <em>明显困倦</em>
            </div>
            <div>
              <span>认知</span>
              <strong>{latest?.pvtScore ?? 70}</strong>
              <em>注意中断增加</em>
            </div>
          </div>
        </Card>

        <Card className="assessment-start-card">
          <span className="card-kicker">推荐下一步</span>
          <h2>完成一次快速测评</h2>
          <p>约 5–8 分钟。包括生理数据同步、VAS-F、KSS 与 PVT，适合班中快速复测。</p>
          <ul className="check-list">
            <li><CheckCircle2 size={15} /> 设备已连接，数据质量良好</li>
            <li><CheckCircle2 size={15} /> 预计用时 5–8 分钟</li>
            <li><CheckCircle2 size={15} /> 结果自动纳入风险评估</li>
          </ul>
          <Button full icon={<Play size={16} />} onClick={() => navigate('/employee/assessment/quick')}>
            开始快速测评
          </Button>
          <button className="text-link" onClick={() => navigate('/employee/assessment/full')}>
            查看完整测评包含的任务 <ArrowRight size={14} />
          </button>
        </Card>
      </div>

      <div className="modality-grid">
        <Card className="modality-card">
          <div className="modality-head">
            <span className="modality-icon modality-blue"><HeartPulse size={20} /></span>
            <div>
              <span className="card-kicker">01 · 生理监测</span>
              <h3>恢复状态与自主神经活动</h3>
            </div>
            <span className="status-online"><span /> 已连接</span>
          </div>
          <div className="modality-metrics">
            <div>
              <span>HRV (RMSSD)</span>
              <strong>{currentEmployee.hrv} <small>ms</small></strong>
              <em className="text-bad">较基线 ↓ 27%</em>
            </div>
            <div>
              <span>心率</span>
              <strong>{currentEmployee.hr} <small>bpm</small></strong>
              <em>基线 {currentEmployee.baselineHr}</em>
            </div>
            <div>
              <span>数据质量</span>
              <strong>优</strong>
              <em>完整度 {currentEmployee.dataCompleteness}%</em>
            </div>
          </div>
          <div className="modality-chart">
            <Sparkline data={currentEmployee.hrvTrend} color="var(--series-2)" width={260} height={52} />
          </div>
          <div className="modality-foot">
            <span><Wind size={14} /> 最近同步：刚刚 · {currentEmployee.device}</span>
            <button onClick={() => navigate('/employee/risk')}>查看生理趋势 <ArrowRight size={13} /></button>
          </div>
        </Card>

        <Card className="modality-card">
          <div className="modality-head">
            <span className="modality-icon modality-orange"><Wind size={20} /></span>
            <div>
              <span className="card-kicker">02 · 主观自评</span>
              <h3>你此刻的真实感受</h3>
            </div>
            <span className="status-done"><CheckCircle2 size={14} /> 已完成</span>
          </div>
          <div className="self-report-row">
            <div>
              <span>VAS-F 疲劳</span>
              <strong>{currentEmployee.vasF}<small>/100</small></strong>
            </div>
            <div>
              <span>KSS 困倦</span>
              <strong>{currentEmployee.kss}<small>/9</small></strong>
            </div>
            <div>
              <span>POMS-TMD</span>
              <strong>{currentEmployee.pomsTmd}<small>/100</small></strong>
            </div>
          </div>
          <div className="self-report-bars">
            <div>
              <span>疲劳程度</span>
              <span className="mini-scale"><span style={{ width: `${currentEmployee.vasF}%` }} /></span>
            </div>
            <div>
              <span>困倦程度</span>
              <span className="mini-scale mini-scale-warm"><span style={{ width: `${(currentEmployee.kss / 9) * 100}%` }} /></span>
            </div>
          </div>
          <div className="modality-foot">
            <span>上次提交：今天 13:40</span>
            <button onClick={() => navigate('/employee/assessment/quick')}>重新自评 <ArrowRight size={13} /></button>
          </div>
        </Card>

        <Card className="modality-card">
          <div className="modality-head">
            <span className="modality-icon modality-violet"><BrainCircuit size={20} /></span>
            <div>
              <span className="card-kicker">03 · 注意力检测</span>
              <h3>警觉、搜索与执行控制</h3>
            </div>
            <span className="status-done"><CheckCircle2 size={14} /> 已完成</span>
          </div>
          <div className="cognitive-task-list">
            <div>
              <span className="cognitive-icon"><Clock3 size={15} /></span>
              <div><strong>PVT</strong><span>持续注意力</span></div>
              <em className="score-high">{latest?.pvtScore ?? 70}</em>
            </div>
            <div>
              <span className="cognitive-icon"><Eye size={15} /></span>
              <div><strong>VST</strong><span>视觉搜索</span></div>
              <em>{latest?.vstScore ?? 55}</em>
            </div>
            <div>
              <span className="cognitive-icon"><Keyboard size={15} /></span>
              <div><strong>AX-CPT</strong><span>执行控制</span></div>
              <em>{latest?.axcptScore ?? 60}</em>
            </div>
          </div>
          <div className="modality-foot">
            <span>三项任务均有效</span>
            <button onClick={() => navigate('/employee/assessment/full')}>开始完整检测 <ArrowRight size={13} /></button>
          </div>
        </Card>
      </div>

      <Card className="assessment-history-card">
        <SectionHeading
          title="测评记录"
          description="每次测评均保留原始结果、有效性与算法版本"
          action={<span className="muted-badge">{history.length} 条记录</span>}
        />
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>时间</th>
                <th>类型</th>
                <th>VAS-F</th>
                <th>KSS</th>
                <th>PVT</th>
                <th>风险分</th>
                <th>等级</th>
                <th>有效性</th>
              </tr>
            </thead>
            <tbody>
              {history.map((record) => (
                <tr key={record.id}>
                  <td>{record.createdAt}</td>
                  <td>{record.type}</td>
                  <td>{record.vasF}</td>
                  <td>{record.kss}/9</td>
                  <td>{record.pvtScore}</td>
                  <td className="td-strong">{record.riskScore}</td>
                  <td><RiskBadge level={record.riskLevel} size="sm" /></td>
                  <td><span className={cn('validity', record.validity === '有效' ? 'is-valid' : 'is-warn')}>{record.validity}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
