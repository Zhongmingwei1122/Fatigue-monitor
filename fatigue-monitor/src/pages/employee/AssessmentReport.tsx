import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  BrainCircuit,
  Clock3,
  Download,
  HeartPulse,
  Info,
  ShieldCheck,
  Wind,
} from 'lucide-react'
import { useApp } from '../../store/AppContext'
import { DAY_LABELS } from '../../data/mockData'
import { getRiskMeta } from '../../lib/risk'
import { Button, Card, EmptyState, InfoCallout, RiskBadge, SectionHeading, cn } from '../../components/ui'
import { BarList, LineChart, RiskGauge } from '../../components/charts'

export default function AssessmentReport() {
  const { currentEmployee, assessments, addToast } = useApp()
  const navigate = useNavigate()
  const latest = assessments.find((assessment) => assessment.employeeId === currentEmployee.id)
  const meta = getRiskMeta(latest?.riskLevel ?? currentEmployee.riskLevel)
  const trend = currentEmployee.trend7.map((value, index) => ({ label: DAY_LABELS[index], value }))
  const physiologicalScore = 68
  const subjectiveScore = latest ? Math.round(latest.vasF * 0.6 + ((latest.kss - 1) / 8) * 100 * 0.4) : 62
  const cognitiveScore = latest?.pvtScore ?? currentEmployee.pvtScore
  const factors = currentEmployee.factors.filter((factor) => factor.contribution > 0).slice(0, 4)

  if (!latest) {
    return (
      <EmptyState
        title="还没有测评报告"
        description="完成一次快速测评后，这里会生成你的多模态风险报告。"
        action={<Button onClick={() => navigate('/employee/assessment')}>去测评</Button>}
      />
    )
  }

  return (
    <div className="report-page">
      <div className="report-toolbar">
        <button className="back-link" onClick={() => navigate('/employee/assessment')}>
          <ArrowLeft size={16} />
          返回测评中心
        </button>
        <div className="report-toolbar-actions">
          <Button
            variant="secondary"
            icon={<Download size={15} />}
            onClick={() => {
              addToast({ title: '已准备打印版本', description: '可使用浏览器“打印/另存为 PDF”。', tone: 'info' })
              window.print()
            }}
          >
            导出 PDF
          </Button>
          <Button icon={<HeartPulse size={15} />} onClick={() => navigate('/employee')}>
            返回今日状态
          </Button>
        </div>
      </div>

      <Card className="report-document">
        <header className="report-header">
          <div>
            <span className="report-brand">SafePulse · 职业疲劳智能预警监测系统</span>
            <h1>多模态疲劳风险评估报告</h1>
            <p>报告编号 RPT-{latest.id.slice(-6).toUpperCase()} · 生成于 {latest.createdAt}</p>
          </div>
          <div className="report-confidential">
            <ShieldCheck size={16} />
            仅限本人及授权人员
          </div>
        </header>

        <div className="report-summary">
          <div className="report-summary-copy">
            <div className="report-person">
              <div>
                <span>姓名</span>
                <strong>{currentEmployee.name}</strong>
              </div>
              <div>
                <span>工号</span>
                <strong>{currentEmployee.employeeNo}</strong>
              </div>
              <div>
                <span>岗位</span>
                <strong>{currentEmployee.job}</strong>
              </div>
              <div>
                <span>班组</span>
                <strong>{currentEmployee.team}</strong>
              </div>
              <div>
                <span>班次</span>
                <strong>{currentEmployee.shift} · {currentEmployee.shiftStart}–{currentEmployee.shiftEnd}</strong>
              </div>
              <div>
                <span>测评类型</span>
                <strong>{latest.type}</strong>
              </div>
            </div>
            <div className="report-verdict">
              <RiskBadge level={latest.riskLevel} size="lg" />
              <h2>{latest.summary}</h2>
              <p>主要风险因素：{currentEmployee.factors.slice(0, 3).map((factor) => factor.label).join('、')}。</p>
            </div>
          </div>
          <div className="report-summary-gauge">
            <RiskGauge score={latest.riskScore} level={latest.riskLevel} size={158} />
            <span>数据完整度 {currentEmployee.dataCompleteness}% · 置信度 {currentEmployee.confidence}</span>
          </div>
        </div>

        <div className="report-section">
          <SectionHeading title="多模态得分" description="分数越高代表该维度对当前疲劳风险的贡献越大" />
          <div className="report-modality-grid">
            <div className="report-modality">
              <span className="report-modality-icon report-icon-blue"><HeartPulse size={18} /></span>
              <div className="report-modality-copy">
                <span>生理</span>
                <strong>{physiologicalScore}</strong>
                <em>HRV 较基线下降 27%，心率高于个人基线</em>
              </div>
              <div className="report-modality-meter"><span style={{ width: `${physiologicalScore}%`, background: 'var(--series-1)' }} /></div>
            </div>
            <div className="report-modality">
              <span className="report-modality-icon report-icon-orange"><Wind size={18} /></span>
              <div className="report-modality-copy">
                <span>主观</span>
                <strong>{subjectiveScore}</strong>
                <em>VAS-F {latest.vasF} · KSS {latest.kss}/9</em>
              </div>
              <div className="report-modality-meter"><span style={{ width: `${subjectiveScore}%`, background: 'var(--series-2)' }} /></div>
            </div>
            <div className="report-modality">
              <span className="report-modality-icon report-icon-violet"><BrainCircuit size={18} /></span>
              <div className="report-modality-copy">
                <span>认知</span>
                <strong>{cognitiveScore}</strong>
                <em>PVT 注意中断增加，视觉搜索效率下降</em>
              </div>
              <div className="report-modality-meter"><span style={{ width: `${cognitiveScore}%`, background: 'var(--series-3)' }} /></div>
            </div>
          </div>
        </div>

        <div className="report-two-col">
          <div className="report-section">
            <SectionHeading title="7 日风险趋势" description="本次结果与个人基线的对比" />
            <LineChart
              data={trend}
              height={190}
              min={0}
              max={100}
              unit=" 分"
              thresholds={[
                { value: 75, label: '严重' },
                { value: 50, label: '高风险' },
                { value: 25, label: '关注' },
              ]}
              ariaLabel="最近 7 天疲劳风险趋势"
            />
          </div>
          <div className="report-section">
            <SectionHeading title="主要因素" description="按贡献分值排序" />
            <BarList
              items={factors.map((factor) => ({ label: factor.label, value: factor.contribution, hint: factor.detail }))}
              max={25}
              formatValue={(value) => `+${value}`}
              color="var(--series-1)"
            />
          </div>
        </div>

        <div className="report-section">
          <SectionHeading title="测评明细" description="本次原始结果与有效性" />
          <div className="data-table-wrap">
            <table className="data-table report-table">
              <thead>
                <tr>
                  <th>模块</th>
                  <th>指标</th>
                  <th>结果</th>
                  <th>参考</th>
                  <th>有效性</th>
                </tr>
              </thead>
              <tbody>
                <tr><td>生理</td><td>HRV (RMSSD)</td><td className="td-strong">{currentEmployee.hrv} ms</td><td>个人基线 {currentEmployee.baselineHrv} ms</td><td><span className="validity is-valid">有效</span></td></tr>
                <tr><td>生理</td><td>心率</td><td className="td-strong">{currentEmployee.hr} bpm</td><td>基线 {currentEmployee.baselineHr} bpm</td><td><span className="validity is-valid">有效</span></td></tr>
                <tr><td>主观</td><td>VAS-F 疲劳</td><td className="td-strong">{latest.vasF} / 100</td><td>个人 7 日基线</td><td><span className="validity is-valid">有效</span></td></tr>
                <tr><td>主观</td><td>KSS 困倦</td><td className="td-strong">{latest.kss} / 9</td><td>≥ 7 为明显困倦</td><td><span className="validity is-valid">有效</span></td></tr>
                <tr><td>主观</td><td>POMS-TMD</td><td className="td-strong">{latest.pomsTmd ?? '—'}</td><td>标准化 0–100</td><td><span className="validity is-valid">有效</span></td></tr>
                <tr><td>认知</td><td>PVT 风险分</td><td className="td-strong">{latest.pvtScore}</td><td>基线反应时</td><td><span className={cn('validity', latest.validity === '有效' ? 'is-valid' : 'is-warn')}>{latest.validity}</span></td></tr>
                <tr><td>认知</td><td>VST 风险分</td><td className="td-strong">{latest.vstScore ?? '—'}</td><td>正确率与反应时</td><td><span className="validity is-valid">有效</span></td></tr>
                <tr><td>认知</td><td>AX-CPT 风险分</td><td className="td-strong">{latest.axcptScore ?? '—'}</td><td>正确率与 d′</td><td><span className="validity is-valid">有效</span></td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="report-recommendation" style={{ borderColor: meta.color }}>
          <div>
            <span className="card-kicker">建议行动</span>
            <h2>{latest.riskLevel === 'severe' ? '立即停止安全敏感作业' : latest.riskLevel === 'high' ? '暂停安全敏感作业，安排恢复' : '保持节奏，按计划休息'}</h2>
            <p>
              {latest.riskLevel === 'severe'
                ? '请立即告知班组长并接受职业健康评估。恢复安全敏感作业前必须完成复测并由授权人员确认。'
                : latest.riskLevel === 'high'
                  ? '建议在 30 分钟内完成 20–30 分钟恢复性休息，随后进行快速复测；如仍未改善，请联系班组长。'
                  : '当前风险可控，建议每 2 小时安排一次 5–10 分钟微休息，并在班中完成一次复测。'}
            </p>
          </div>
          <InfoCallout tone="info" icon={<Info size={17} />}>
            <strong>报告说明</strong>
            <div>本报告用于职业疲劳风险管理，不构成医疗诊断。风险结果受设备质量、测评有效性及个人状态影响。</div>
          </InfoCallout>
        </div>

        <footer className="report-footer">
          <span>风险模型 v1.0 · 规则版本 2026.11 · 数据截止 {latest.createdAt}</span>
          <span><Clock3 size={13} /> {latest.validity} · {latest.type}</span>
        </footer>
      </Card>
    </div>
  )
}
