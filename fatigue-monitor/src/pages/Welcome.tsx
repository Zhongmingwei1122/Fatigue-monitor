import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  HeartPulse,
  LayoutDashboard,
  LockKeyhole,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { useApp } from '../store/AppContext'
import { RiskBadge } from '../components/ui'

export default function Welcome() {
  const { setRole, currentEmployee } = useApp()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const roleParam = new URLSearchParams(location.search).get('role')
    if (roleParam === 'employee' || roleParam === 'admin') {
      setRole(roleParam)
      navigate(roleParam === 'employee' ? '/employee' : '/admin', { replace: true })
    }
  }, [location.search, navigate, setRole])

  const enter = (role: 'employee' | 'admin') => {
    setRole(role)
    navigate(role === 'employee' ? '/employee' : '/admin')
  }

  return (
    <div className="welcome-page">
      <div className="welcome-ambient welcome-ambient-a" />
      <div className="welcome-ambient welcome-ambient-b" />

      <header className="welcome-top">
        <div className="welcome-brand">
          <span className="brand-mark brand-mark-lg">
            <Activity size={26} strokeWidth={2.4} />
          </span>
          <div>
            <strong>SafePulse</strong>
            <span>职业疲劳智能预警监测系统</span>
          </div>
        </div>
        <span className="welcome-demo-pill">
          <Sparkles size={14} />
          交互演示 · 合成数据
        </span>
      </header>

      <main className="welcome-main">
        <section className="welcome-copy">
          <div className="eyebrow welcome-eyebrow">Occupational Fatigue Monitoring Platform</div>
          <h1>
            在疲劳变成风险之前，
            <br />
            <span>先看见它。</span>
          </h1>
          <p className="welcome-lead">
            用生理信号、主观感受与注意力表现，形成连续的多模态疲劳风险评估，并把每一次预警转化为可执行、可追踪的恢复行动。
          </p>
          <div className="welcome-points">
            <span><CheckCircle2 size={16} /> 多模态风险评分</span>
            <span><CheckCircle2 size={16} /> 分级预警与干预闭环</span>
            <span><CheckCircle2 size={16} /> 组织级风险决策视图</span>
          </div>
          <div className="welcome-trust">
            <LockKeyhole size={15} />
            非医疗诊断工具 · 数据最小化 · 全流程审计
          </div>
        </section>

        <section className="welcome-preview" aria-label="系统预览">
          <div className="preview-window">
            <div className="preview-topbar">
              <span className="preview-dot" />
              <span className="preview-dot" />
              <span className="preview-dot" />
              <span className="preview-window-title">今日状态</span>
              <span className="preview-live">实时</span>
            </div>
            <div className="preview-body">
              <div className="preview-risk">
                <div>
                  <span className="preview-label">当前疲劳风险</span>
                  <div className="preview-score">71<span>/100</span></div>
                  <RiskBadge level="high" />
                </div>
                <div className="preview-gauge" aria-hidden="true">
                  <svg viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="49" fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="8" />
                    <circle
                      cx="60"
                      cy="60"
                      r="49"
                      fill="none"
                      stroke="#ec835a"
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray="218 308"
                      transform="rotate(-90 60 60)"
                    />
                  </svg>
                  <span>高</span>
                </div>
              </div>
              <div className="preview-metrics">
                <div>
                  <span>HRV</span>
                  <strong>38<small>ms</small></strong>
                  <em>↓ 27% vs 基线</em>
                </div>
                <div>
                  <span>心率</span>
                  <strong>80<small>bpm</small></strong>
                  <em>↑ 12 bpm</em>
                </div>
                <div>
                  <span>KSS</span>
                  <strong>7<small>/9</small></strong>
                  <em>明显困倦</em>
                </div>
              </div>
              <div className="preview-factors">
                <span className="preview-label">主要因素</span>
                <div>
                  <span>HRV 明显下降</span>
                  <span>注意力下降</span>
                  <span>连续工作 6 天</span>
                </div>
              </div>
              <div className="preview-action">
                <span><ShieldAlert size={16} /> 建议暂停安全敏感作业</span>
                <ArrowRight size={16} />
              </div>
            </div>
          </div>
          <div className="preview-floating">
            <div className="floating-icon"><ShieldCheck size={18} /></div>
            <div>
              <strong>预警已送达</strong>
              <span>班组长 · 10 分钟内确认</span>
            </div>
          </div>
        </section>
      </main>

      <section className="role-chooser" aria-label="选择演示角色">
        <button className="role-card role-card-employee" onClick={() => enter('employee')}>
          <span className="role-icon role-icon-blue"><HeartPulse size={22} /></span>
          <span className="role-card-copy">
            <span className="role-kicker">员工端</span>
            <strong>查看我的状态</strong>
            <em>风险、测评、休息与复测</em>
          </span>
          <span className="role-arrow"><ArrowRight size={18} /></span>
        </button>
        <button className="role-card role-card-admin" onClick={() => enter('admin')}>
          <span className="role-icon role-icon-ink"><LayoutDashboard size={22} /></span>
          <span className="role-card-copy">
            <span className="role-kicker">管理端</span>
            <strong>进入安全管理中心</strong>
            <em>驾驶舱、预警、班组与报告</em>
          </span>
          <span className="role-arrow"><ArrowRight size={18} /></span>
        </button>
      </section>

      <footer className="welcome-foot">
        <span>当前演示员工：{currentEmployee.name} · {currentEmployee.job}</span>
        <span>© 2026 SafePulse · MVP V1.0</span>
      </footer>
    </div>
  )
}
