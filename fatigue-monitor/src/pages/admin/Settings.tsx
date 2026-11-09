import { useState } from 'react'
import {
  Bell,
  CheckCircle2,
  Database,
  History,
  LockKeyhole,
  RotateCcw,
  Save,
  ShieldCheck,
  SlidersHorizontal,
  UserCog,
} from 'lucide-react'
import { useApp } from '../../store/AppContext'
import type { AppSettings } from '../../types'
import { Button, Card, FormField, InfoCallout, PageHeader, SectionHeading, cn } from '../../components/ui'

export default function Settings() {
  const { settings, updateSettings, resetDemo } = useApp()
  const [draft, setDraft] = useState<AppSettings>(settings)
  const weightTotal =
    draft.physiologicalWeight + draft.subjectiveWeight + draft.cognitiveWeight + draft.workloadWeight

  const update = (key: keyof AppSettings, value: number | string) => {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  const save = () => {
    updateSettings(draft)
  }

  return (
    <div className="settings-page">
      <PageHeader
        eyebrow="系统治理"
        title="系统设置"
        description="配置风险阈值、模型权重、预警规则与数据保留策略。健康相关阈值变更需要安全与职业健康角色审核。"
        actions={<Button icon={<Save size={15} />} onClick={save}>保存设置</Button>}
      />

      <InfoCallout tone="warning" icon={<ShieldCheck size={17} />}>
        演示环境中的设置会即时保存到本地浏览器。正式环境需要版本化、审批与历史数据模拟。
      </InfoCallout>

      <div className="settings-grid">
        <Card className="settings-card">
          <SectionHeading title="风险分级阈值" description="0–100 分 · 阈值不可重叠" icon={<SlidersHorizontal size={18} />} />
          <div className="settings-form-grid">
            <FormField label="关注级起始分" hint="默认 25">
              <input type="number" min="0" max="100" value={draft.attentionThreshold} onChange={(event) => update('attentionThreshold', Number(event.target.value))} />
            </FormField>
            <FormField label="高风险起始分" hint="默认 50">
              <input type="number" min="0" max="100" value={draft.highThreshold} onChange={(event) => update('highThreshold', Number(event.target.value))} />
            </FormField>
            <FormField label="严重风险起始分" hint="默认 75">
              <input type="number" min="0" max="100" value={draft.severeThreshold} onChange={(event) => update('severeThreshold', Number(event.target.value))} />
            </FormField>
          </div>
          <div className="threshold-preview">
            <span className="threshold-low">低风险</span>
            <span className="threshold-attention">关注</span>
            <span className="threshold-high">高风险</span>
            <span className="threshold-severe">严重</span>
          </div>
          <InfoCallout tone="info">
            严重风险覆盖规则仍会独立生效：KSS ≥ 8 且安全敏感岗位、PVT 注意中断 ≥ 5 等。
          </InfoCallout>
        </Card>

        <Card className="settings-card">
          <SectionHeading title="模型权重" description="各模态对总风险分的贡献" icon={<Database size={18} />} />
          <div className="weight-list">
            {[
              ['生理风险', 'physiologicalWeight'],
              ['主观风险', 'subjectiveWeight'],
              ['认知风险', 'cognitiveWeight'],
              ['工作负荷', 'workloadWeight'],
            ].map(([label, key]) => {
              const value = draft[key as keyof AppSettings] as number
              return (
                <div key={key} className="weight-row">
                  <span>{label}</span>
                  <input type="range" min="0" max="60" value={value} onChange={(event) => update(key as keyof AppSettings, Number(event.target.value))} className="weight-slider" aria-label={`${label}权重`} />
                  <strong>{value}%</strong>
                </div>
              )
            })}
          </div>
          <div className={cn('weight-total', weightTotal !== 100 && 'is-warning')}>
            <span>当前合计</span>
            <strong>{weightTotal}%</strong>
            <span>{weightTotal === 100 ? '权重配置有效' : '建议调整至 100%'}</span>
          </div>
        </Card>

        <Card className="settings-card">
          <SectionHeading title="响应与修正" description="预警时限与情境加分" icon={<Bell size={18} />} />
          <div className="settings-form-grid">
            <FormField label="严重风险确认时限（分钟）">
              <input type="number" min="1" max="60" value={draft.severeResponseMinutes} onChange={(event) => update('severeResponseMinutes', Number(event.target.value))} />
            </FormField>
            <FormField label="高风险确认时限（分钟）">
              <input type="number" min="1" max="60" value={draft.highResponseMinutes} onChange={(event) => update('highResponseMinutes', Number(event.target.value))} />
            </FormField>
            <FormField label="夜班情境加分">
              <input type="number" min="0" max="10" value={draft.nightShiftModifier} onChange={(event) => update('nightShiftModifier', Number(event.target.value))} />
            </FormField>
            <FormField label="安全敏感岗位加分">
              <input type="number" min="0" max="10" value={draft.safetySensitiveModifier} onChange={(event) => update('safetySensitiveModifier', Number(event.target.value))} />
            </FormField>
          </div>
        </Card>

        <Card className="settings-card">
          <SectionHeading title="测评与数据保留" description="影响员工端任务频率与数据生命周期" icon={<History size={18} />} />
          <div className="settings-form-grid">
            <FormField label="测评频率">
              <select value={draft.assessmentInterval} onChange={(event) => update('assessmentInterval', event.target.value)}>
                <option>每班次一次</option>
                <option>每 4 小时一次</option>
                <option>每日一次</option>
                <option>按预警触发</option>
              </select>
            </FormField>
            <FormField label="原始数据保留（月）">
              <input type="number" min="1" max="60" value={draft.dataRetentionMonths} onChange={(event) => update('dataRetentionMonths', Number(event.target.value))} />
            </FormField>
          </div>
          <div className="retention-note">
            <LockKeyhole size={15} />
            风险与干预记录默认保留 3 年，审计日志默认保留 180 天，具体以企业合规要求为准。
          </div>
        </Card>

        <Card className="settings-card settings-span-two">
          <SectionHeading title="角色与权限" description="系统管理员默认不可查看员工健康明细" icon={<UserCog size={18} />} />
          <div className="data-table-wrap">
            <table className="data-table">
              <thead><tr><th>角色</th><th>员工数据</th><th>团队聚合</th><th>原始生理</th><th>关闭严重预警</th><th>配置阈值</th></tr></thead>
              <tbody>
                <tr><td>员工</td><td>本人</td><td>—</td><td>本人</td><td>—</td><td>—</td></tr>
                <tr><td>班组长</td><td>直属团队摘要</td><td>有</td><td>—</td><td>不可单独关闭</td><td>—</td></tr>
                <tr><td>安全管理员</td><td>授权范围</td><td>有</td><td>授权后</td><td>复核关闭</td><td>提议</td></tr>
                <tr><td>职业健康专员</td><td>授权范围</td><td>有</td><td>有</td><td>复核关闭</td><td>提议</td></tr>
                <tr><td>系统管理员</td><td>—</td><td>—</td><td>—</td><td>—</td><td>执行</td></tr>
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="settings-card settings-span-two">
          <SectionHeading title="通知与升级路径" description="严重风险通知不可静音" icon={<Bell size={18} />} />
          <div className="notification-rule-grid">
            <div><span>站内信</span><strong className="status-online"><span /> 已启用</strong><em>全部等级</em></div>
            <div><span>企业微信</span><strong className="status-online"><span /> 已启用</strong><em>高风险 + 严重</em></div>
            <div><span>短信</span><strong className="status-online"><span /> 已启用</strong><em>严重风险</em></div>
            <div><span>电话升级</span><strong className="muted-text">未启用</strong><em>10 分钟未确认时</em></div>
          </div>
          <div className="escalation-flow">
            <span>员工</span><b>→</b><span>班组长</span><b>→</b><span>安全管理员</span><b>→</b><span>职业健康专员</span>
          </div>
        </Card>
      </div>

      <Card className="settings-audit-card">
        <SectionHeading title="最近配置变更" description="所有敏感配置修改均保留审计记录" icon={<History size={18} />} />
        <div className="settings-audit-list">
          <div><span>高风险阈值从 55 调整为 50</span><em>李建国 · 安全管理员 · 11-08 16:20</em><span className="audit-status"><CheckCircle2 size={14} /> 已生效</span></div>
          <div><span>启用严重风险电话升级</span><em>王医生 · 职业健康 · 11-06 10:12</em><span className="audit-status"><CheckCircle2 size={14} /> 已回滚</span></div>
          <div><span>新增设备厂商 API 凭证</span><em>系统管理员 · 11-03 09:45</em><span className="audit-status"><CheckCircle2 size={14} /> 已生效</span></div>
        </div>
      </Card>

      <Card className="settings-danger-card">
        <div>
          <span className="card-kicker">演示环境</span>
          <h2>重置全部演示数据</h2>
          <p>恢复初始员工、预警、干预和测评记录，并返回角色选择页。</p>
        </div>
        <Button variant="danger" icon={<RotateCcw size={15} />} onClick={resetDemo}>重置演示</Button>
      </Card>
    </div>
  )
}
