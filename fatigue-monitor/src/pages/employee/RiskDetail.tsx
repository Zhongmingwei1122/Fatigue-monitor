import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Activity,
  ArrowRight,
  Clock3,
  Coffee,
  HeartPulse,
  Info,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  Watch,
} from 'lucide-react'
import { useApp } from '../../store/AppContext'
import { DAY_LABELS } from '../../data/mockData'
import { getRiskMeta } from '../../lib/risk'
import { Button, Card, InfoCallout, PageHeader, ProgressBar, RiskBadge, SectionHeading, cn } from '../../components/ui'
import { LineChart, RiskGauge } from '../../components/charts'

function build24h(score: number) {
  const offsets = [-12, -8, -3, 5, 7, 4, 0]
  const labels = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00']
  return labels.map((label, index) => ({ label, value: Math.max(0, Math.min(100, score + offsets[index])) }))
}

function build30d(score: number) {
  const labels = ['10-11', '10-14', '10-17', '10-20', '10-23', '10-26', '10-29', '11-01', '11-04', '11-07', '11-09']
  return labels.map((label, index) => ({
    label,
    value: Math.max(0, Math.min(100, score - 16 + index * 1.6 + Math.sin(index) * 5)),
  }))
}

export default function RiskDetail() {
  const { currentEmployee, assessments, alerts, addToast } = useApp()
  const navigate = useNavigate()
  const [range, setRange] = useState<'24h' | '7d' | '30d'>('7d')
  const meta = getRiskMeta(currentEmployee.riskLevel)
  const activeAlert = alerts.find(
    (alert) =>
      alert.employeeId === currentEmployee.id &&
      ['pending', 'acknowledged', 'in_progress', 'pending_retest'].includes(alert.status),
  )
  const factorItems = currentEmployee.factors.filter((factor) => factor.contribution > 0)
  const history = assessments.filter((assessment) => assessment.employeeId === currentEmployee.id).slice(0, 5)

  const chartData = useMemo(() => {
    if (range === '24h') return build24h(currentEmployee.riskScore)
    if (range === '30d') return build30d(currentEmployee.riskScore)
    return currentEmployee.trend7.map((value, index) => ({ label: DAY_LABELS[index], value }))
  }, [currentEmployee.riskScore, currentEmployee.trend7, range])

  const prediction = useMemo(() => {
    const base = currentEmployee.riskScore
    return [
      { label: '未来 2 小时', value: Math.min(100, base + 7), probability: 78, tone: 'high' },
      { label: '未来 4 小时', value: Math.min(100, base + 3), probability: 66, tone: 'high' },
      { label: '本班结束前', value: Math.max(0, base - 9), probability: 41, tone: 'attention' },
    ]
  }, [currentEmployee.riskScore])

  return (
    <div className="risk-detail-page">
      <PageHeader
        eyebrow="风险解释"
        title="当前风险从哪里来，下一步做什么"
        description="系统把多模态信号转化为可解释的风险因素。你可以查看每条证据，并选择适合自己的恢复方式。"
        actions={
          <>
            <Button variant="secondary" icon={<RefreshCw size={15} />} onClick={() => navigate('/employee/assessment/quick')}>
              快速复测
            </Button>
            <Button icon={<Coffee size={15} />} onClick={() => navigate('/employee/intervention')}>
              去休息
            </Button>
          </>
        }
      />

      <div className="risk-detail-top">
        <Card className="risk-overview-card" style={{ '--risk-color': meta.color } as React.CSSProperties}>
          <div className="risk-overview-head">
            <div>
              <span className="card-kicker">当前风险快照</span>
              <div className="risk-overview-title">
                <h2>{meta.description}</h2>
                <RiskBadge level={currentEmployee.riskLevel} size="lg" />
              </div>
              <p>
                数据更新于 2 分钟前 · 置信度 {currentEmployee.confidence} · 数据完整度 {currentEmployee.dataCompleteness}%
              </p>
            </div>
            <RiskGauge score={currentEmployee.riskScore} level={currentEmployee.riskLevel} size={148} />
          </div>
          <div className="risk-overview-factors">
            {currentEmployee.factors.slice(0, 3).map((factor) => (
              <span key={factor.label}><span />{factor.label}</span>
            ))}
          </div>
          <div className="risk-overview-footer">
            <div><span>今日峰值</span><strong>71 <small>14:18</small></strong></div>
            <div><span>较上次变化</span><strong className="text-bad">+13 分</strong></div>
            <div><span>班次剩余</span><strong>5 小时 30 分</strong></div>
            <div className="risk-overview-action">
              <Button size="sm" variant="secondary" onClick={() => navigate('/employee/intervention')}>
                查看处置建议 <ArrowRight size={14} />
              </Button>
            </div>
          </div>
        </Card>

        <Card className="prediction-card">
          <SectionHeading
            title="风险预测"
            description="基于当前趋势与班次剩余时间"
            icon={<Sparkles size={18} />}
          />
          <div className="prediction-list">
            {prediction.map((item) => (
              <div key={item.label} className="prediction-row">
                <div>
                  <span>{item.label}</span>
                  <strong>{item.value}<small>/100</small></strong>
                </div>
                <div className="prediction-meter">
                  <ProgressBar
                    value={item.probability}
                    tone={item.tone === 'high' ? 'warning' : 'accent'}
                    size="sm"
                    label={`${item.label}高风险概率`}
                  />
                  <span>{item.probability}% 高风险概率</span>
                </div>
              </div>
            ))}
          </div>
          <InfoCallout tone="info" icon={<Info size={16} />}>
            预测为辅助信息，假设未来 2 小时无额外休息；不构成确定结论。
          </InfoCallout>
        </Card>
      </div>

      <Card className="risk-trend-card">
        <SectionHeading
          title="风险变化趋势"
          description="风险快照每 15 分钟更新一次，测评、干预与设备事件会改变趋势"
          action={
            <div className="mini-tabs" role="tablist" aria-label="风险趋势时间范围">
              {(['24h', '7d', '30d'] as const).map((item) => (
                <button
                  key={item}
                  className={cn(range === item && 'is-active')}
                  onClick={() => setRange(item)}
                  role="tab"
                  aria-selected={range === item}
                >
                  {item === '24h' ? '24 小时' : item === '7d' ? '7 天' : '30 天'}
                </button>
              ))}
            </div>
          }
        />
        <div className="risk-chart-summary">
          <div><span>当前</span><strong>{currentEmployee.riskScore}<small>/100</small></strong></div>
          <span className="risk-chart-badge"><ArrowRight size={13} /> 趋势上升</span>
          <span className="risk-chart-note">主要受 HRV 与主观困倦影响</span>
        </div>
        <LineChart
          data={chartData}
          height={250}
          min={0}
          max={100}
          unit=" 分"
          thresholds={[
            { value: 75, label: '严重' },
            { value: 50, label: '高风险' },
            { value: 25, label: '关注' },
          ]}
          ariaLabel={`${range} 疲劳风险趋势`}
        />
        <div className="chart-events">
          <span><span className="event-dot" /> 快速测评</span>
          <span><span className="event-dot event-dot-orange" /> 预警</span>
          <span><span className="event-dot event-dot-gray" /> 设备离线</span>
        </div>
      </Card>

      <div className="risk-detail-lower">
        <Card className="factor-card">
          <SectionHeading
            title="触发因素"
            description="按对风险分的贡献排序"
            icon={<Activity size={18} />}
          />
          <div className="factor-detail-list">
            {factorItems.map((factor) => (
              <div key={factor.label} className="factor-detail-row">
                <div className="factor-detail-icon"><HeartPulse size={16} /></div>
                <div className="factor-detail-copy">
                  <div>
                    <strong>{factor.label}</strong>
                    <span>+{factor.contribution} 分</span>
                  </div>
                  <p>{factor.detail}</p>
                  <div className="factor-detail-bar">
                    <span style={{ width: `${Math.min(100, factor.contribution * 4)}%` }} />
                  </div>
                </div>
              </div>
            ))}
            {factorItems.length === 0 && (
              <div className="empty-inline">当前没有明显的风险贡献因素。</div>
            )}
          </div>
          <div className="factor-footnote">
            <Info size={15} />
            分数代表该因素对当前风险的贡献，不等于医学指标异常程度。
          </div>
        </Card>

        <Card className="recommendation-card">
          <SectionHeading
            title="建议采取的干预措施"
            description="根据当前因素与班次安排生成"
            icon={<ShieldCheck size={18} />}
          />
          <div className="recommendation-list">
            <div className="recommendation-item is-primary">
              <span className="recommendation-index">01</span>
              <div>
                <strong>20–30 分钟恢复性休息</strong>
                <p>HRV 明显低于基线，优先降低生理负荷。离开工位，在安静环境休息。</p>
                <span className="recommendation-meta">优先级：立即 · 预计风险下降 18–25 分</span>
              </div>
              <Button size="sm" onClick={() => navigate('/employee/intervention')}>开始</Button>
            </div>
            <div className="recommendation-item">
              <span className="recommendation-index">02</span>
              <div>
                <strong>暂停安全敏感作业</strong>
                <p>当前注意力与主观困倦均达到高风险阈值，建议由同伴接管关键操作。</p>
                <span className="recommendation-meta">优先级：立即 · 班组长确认</span>
              </div>
              <Button size="sm" variant="secondary" onClick={() => navigate('/employee/intervention')}>查看</Button>
            </div>
            <div className="recommendation-item">
              <span className="recommendation-index">03</span>
              <div>
                <strong>休息后快速复测</strong>
                <p>复测包含 HRV、KSS 与 PVT，用于判断是否可以恢复安全敏感作业。</p>
                <span className="recommendation-meta">建议时间：30 分钟内</span>
              </div>
              <Button size="sm" variant="secondary" onClick={() => navigate('/employee/assessment/quick')}>复测</Button>
            </div>
          </div>
          <div className="recommendation-footer">
            <button
              className="feedback-button"
              onClick={() => addToast({ title: '反馈已记录', description: '感谢你的反馈，我们会用于优化建议。', tone: 'success' })}
            >
              <ThumbsUp size={14} /> 建议有帮助
            </button>
            <button
              className="feedback-button"
              onClick={() => addToast({ title: '反馈已记录', description: '我们会结合你的情况优化建议。', tone: 'info' })}
            >
              <ThumbsDown size={14} /> 不太适合我
            </button>
          </div>
        </Card>
      </div>

      <div className="risk-detail-bottom">
        <Card className="data-quality-card">
          <SectionHeading title="数据质量" icon={<Watch size={18} />} />
          <div className="data-quality-grid">
            <div><span>设备连接</span><strong><span className="status-online"><span /> 已连接</span></strong></div>
            <div><span>数据完整度</span><strong>{currentEmployee.dataCompleteness}%</strong></div>
            <div><span>最后同步</span><strong>2 分钟前</strong></div>
            <div><span>无效测评</span><strong>0 次</strong></div>
          </div>
          <InfoCallout tone={activeAlert ? 'warning' : 'info'} icon={<ShieldAlert size={16} />}>
            {activeAlert
              ? '当前存在未关闭预警。风险等级不会因设备中断而自动降低。'
              : '设备与数据质量正常，当前风险结果具有较高参考价值。'}
          </InfoCallout>
        </Card>

        <Card className="history-card">
          <SectionHeading title="最近风险记录" icon={<Clock3 size={18} />} action={<button className="text-link" onClick={() => navigate('/employee/records')}>全部记录 <ArrowRight size={13} /></button>} />
          <div className="compact-list">
            {history.map((record) => (
              <div key={record.id} className="compact-list-row">
                <span className="compact-list-time">{record.createdAt}</span>
                <span className="compact-list-title">{record.type}</span>
                <RiskBadge level={record.riskLevel} size="sm" />
                <strong>{record.riskScore}</strong>
              </div>
            ))}
            {history.length === 0 && <div className="empty-inline">暂无测评记录</div>}
          </div>
        </Card>
      </div>
    </div>
  )
}
