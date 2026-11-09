import type {
  AlertRecord,
  AppNotification,
  AppSettings,
  AssessmentRecord,
  Employee,
  InterventionTask,
  RiskFactor,
  RiskLevel,
} from '../types'
import { clamp, getRiskMeta, levelFromScore, round } from '../lib/risk'

export const TODAY = '2026-11-09'
export const DAY_LABELS = ['11-03', '11-04', '11-05', '11-06', '11-07', '11-08', '11-09']

export const TEAMS = [
  { id: 'team-1', name: '运行一班', supervisor: '李建国', color: '#2a78d6' },
  { id: 'team-2', name: '运行二班', supervisor: '王芳', color: '#eb6834' },
  { id: 'team-3', name: '检修班', supervisor: '赵磊', color: '#1baf7a' },
  { id: 'team-4', name: '物流班', supervisor: '陈静', color: '#eda100' },
  { id: 'team-5', name: '质检班', supervisor: '孙浩', color: '#6250d6' },
]

const NAMES = [
  '张伟',
  '王海',
  '刘敏',
  '陈晨',
  '李想',
  '周涛',
  '吴静',
  '郑凯',
  '冯雪',
  '何磊',
  '许峰',
  '杨帆',
  '林悦',
  '黄强',
  '朱琳',
  '高鹏',
  '罗丹',
  '梁宇',
  '宋佳',
  '谢军',
  '唐宁',
  '韩冰',
  '曹阳',
  '邓超',
  '彭丽',
  '曾辉',
  '肖楠',
  '田甜',
  '董浩',
  '袁媛',
  '潘龙',
  '蒋欣',
  '蔡明',
  '余波',
  '杜鹃',
  '叶青',
  '程峰',
  '苏晴',
  '魏东',
  '吕娜',
  '丁一',
  '任杰',
  '沈月',
  '姚远',
  '卢俊',
  '姜楠',
  '崔健',
  '钟琳',
]

const JOBS = ['化工操作员', '设备巡检员', '中控操作员', '装卸工', '质检员', '电工']
const AVATAR_COLORS = [
  '#dbeafe',
  '#ffedd5',
  '#dcfce7',
  '#fef3c7',
  '#fce7f3',
  '#ede9fe',
  '#e0f2fe',
  '#fef2f2',
]

const LEVEL_PLAN: RiskLevel[] = [
  'high', 'severe', 'attention', 'low', 'low', 'high', 'low', 'attention', 'low', 'low',
  'high', 'low', 'attention', 'low', 'low', 'attention', 'low', 'high', 'low', 'low',
  'attention', 'low', 'low', 'high', 'low', 'attention', 'low', 'low', 'attention', 'low',
  'low', 'high', 'attention', 'low', 'low', 'severe', 'attention', 'low', 'high', 'low',
  'attention', 'low', 'low', 'high', 'attention', 'low', 'low', 'attention',
]

const LOW_FACTORS: RiskFactor[] = [
  { label: '恢复状态良好', contribution: 0, detail: 'HRV 处于个人正常范围', direction: 'down' },
  { label: '困倦程度较低', contribution: 0, detail: 'KSS 3 / 9', direction: 'down' },
]

const ATTENTION_FACTORS: RiskFactor[] = [
  { label: 'HRV 轻度下降', contribution: 11, detail: '较个人基线下降 12%', direction: 'up' },
  { label: '主观困倦', contribution: 8, detail: 'KSS 5 / 9，轻度困倦', direction: 'up' },
  { label: '连续工作 4 天', contribution: 6, detail: '建议增加班中休息', direction: 'up' },
]

const HIGH_FACTORS: RiskFactor[] = [
  { label: 'HRV 明显下降', contribution: 18, detail: '较个人基线下降 27%', direction: 'up' },
  { label: '明显困倦', contribution: 12, detail: 'KSS 7 / 9', direction: 'up' },
  { label: '注意力下降', contribution: 10, detail: 'PVT 出现 4 次注意中断', direction: 'up' },
  { label: '连续工作负荷', contribution: 5, detail: '连续第 6 天，累计加班 9 小时', direction: 'up' },
]

const SEVERE_FACTORS: RiskFactor[] = [
  { label: '严重困倦', contribution: 22, detail: 'KSS 8 / 9，难以保持清醒', direction: 'up' },
  { label: 'HRV 显著抑制', contribution: 19, detail: '较个人基线下降 38%', direction: 'up' },
  { label: '注意中断增加', contribution: 16, detail: 'PVT 出现 6 次注意中断', direction: 'up' },
  { label: '安全敏感岗位', contribution: 5, detail: '当前岗位为安全敏感岗位', direction: 'up' },
]

function scoreFor(level: RiskLevel, index: number): number {
  const base: Record<RiskLevel, number> = { low: 14, attention: 36, high: 62, severe: 83, pending: 0 }
  const jitter = ((index * 7) % 11) - 5
  return clamp(round(base[level] + jitter, 1))
}

function makeTrend(score: number, index: number, level: RiskLevel): number[] {
  if (index === 0) return [42, 48, 55, 51, 63, 58, 71]
  const magnitude = level === 'severe' ? 22 : level === 'high' ? 16 : 9
  const values = [0, 1, 2, 3, 4, 5].map((i) => {
    if (i === 5) return score
    const wave = Math.sin((index + i) * 1.4) * 6
    return clamp(round(score - magnitude + i * (magnitude / 5) + wave, 1))
  })
  return [...values, score]
}

function makeHrv(level: RiskLevel, index: number): { baseline: number; current: number } {
  if (index === 0) return { baseline: 52, current: 38 }
  const baseline = 48 + (index % 7)
  const drop = level === 'severe' ? 0.62 : level === 'high' ? 0.74 : level === 'attention' ? 0.87 : 0.97
  return { baseline, current: round(baseline * drop, 0) }
}

function makeHr(level: RiskLevel, index: number): { baseline: number; current: number } {
  if (index === 0) return { baseline: 68, current: 80 }
  const baseline = 66 + (index % 6)
  const lift = level === 'severe' ? 18 : level === 'high' ? 12 : level === 'attention' ? 7 : 2
  return { baseline, current: baseline + lift }
}

function makeEmployee(index: number, level: RiskLevel): Employee {
  const team = TEAMS[index % TEAMS.length]
  const baselineHrv = makeHrv(level, index).baseline
  const hrv = makeHrv(level, index).current
  const baselineHr = makeHr(level, index).baseline
  const hr = makeHr(level, index).current
  const score = index === 0 ? 71 : scoreFor(level, index)
  const isCurrent = index === 0
  const shift = isCurrent
    ? '白班'
    : level === 'high' || level === 'severe'
      ? index % 2 === 1
        ? '夜班'
        : '白班'
      : index % 6 === 5
        ? '休息'
        : index % 3 === 0
          ? '夜班'
          : '白班'
  const name = NAMES[index]
  const deviceStatus = isCurrent
    ? 'connected'
    : index % 13 === 0
      ? 'offline'
      : index % 7 === 0
        ? 'not_worn'
        : 'connected'

  const factors =
    level === 'low'
      ? LOW_FACTORS
      : level === 'attention'
        ? ATTENTION_FACTORS
        : level === 'high'
          ? HIGH_FACTORS
          : SEVERE_FACTORS

  return {
    id: `emp-${String(index + 1).padStart(3, '0')}`,
    name,
    employeeNo: `E-${1042 + index}`,
    job: JOBS[index % JOBS.length],
    team: team.name,
    teamId: team.id,
    shift,
    shiftStart: shift === '夜班' ? '22:00' : shift === '休息' ? '—' : '08:00',
    shiftEnd: shift === '夜班' ? '06:00' : shift === '休息' ? '—' : '20:00',
    safetySensitive: index % 3 !== 2,
    phone: `138${String(12000000 + index * 731).slice(0, 8)}`,
    device: `FIT-${8000 + index}`,
    deviceStatus,
    battery: 38 + ((index * 13) % 60),
    lastSync: deviceStatus === 'offline' ? '12 分钟前' : deviceStatus === 'not_worn' ? '未佩戴' : '刚刚',
    riskLevel: level,
    riskScore: score,
    riskTrend: index === 0 ? 'up' : level === 'low' ? 'flat' : index % 3 === 0 ? 'down' : 'up',
    confidence: deviceStatus === 'offline' ? '低' : level === 'low' ? '高' : '中',
    factors,
    hrv,
    baselineHrv,
    hr,
    baselineHr,
    kss: level === 'low' ? 3 : level === 'attention' ? 5 : level === 'high' ? 7 : 8,
    vasF: level === 'low' ? 22 : level === 'attention' ? 43 : level === 'high' ? 66 : 84,
    pomsTmd: level === 'low' ? 38 : level === 'attention' ? 56 : level === 'high' ? 68 : 82,
    pvtScore: level === 'low' ? 18 : level === 'attention' ? 44 : level === 'high' ? 70 : 88,
    dataCompleteness: deviceStatus === 'offline' ? 46 : deviceStatus === 'not_worn' ? 58 : 88 + (index % 10),
    status: 'active',
    avatarColor: AVATAR_COLORS[index % AVATAR_COLORS.length],
    trend7: makeTrend(score, index, level),
    hrvTrend: [0, 1, 2, 3, 4, 5, 6].map((i) =>
      clamp(round(baselineHrv - (baselineHrv - hrv) * (i / 6) + Math.sin((index + i) * 1.2) * 2, 0)),
    ),
    hrTrend: [0, 1, 2, 3, 4, 5, 6].map((i) =>
      clamp(round(baselineHr + (hr - baselineHr) * (i / 6) + Math.cos((index + i) * 1.1) * 2, 0), 45, 135),
    ),
    consecutiveDays: level === 'severe' ? 8 : level === 'high' ? 6 : 2 + (index % 4),
    overtimeHours: level === 'severe' ? 16 : level === 'high' ? 9 : index % 5,
    lastAssessment: index === 0 ? '今天 13:40' : index % 4 === 0 ? '今天 09:20' : '昨天 18:15',
  }
}

export const EMPLOYEES: Employee[] = LEVEL_PLAN.map((level, index) => makeEmployee(index, level))

export const CURRENT_EMPLOYEE_ID = 'emp-001'

export const CURRENT_EMPLOYEE = EMPLOYEES[0]

export const ALERTS: AlertRecord[] = [
  {
    id: 'alert-001',
    employeeId: 'emp-001',
    type: 'fatigue',
    level: 'high',
    title: '疲劳风险升高',
    reason: 'HRV 较个人基线下降 27%，KSS=7，PVT 注意中断增加',
    factors: ['HRV 明显下降', '明显困倦', '注意力下降'],
    createdAt: '今天 14:18',
    status: 'pending',
    assignee: '李建国',
    slaMinutes: 10,
    timeline: [
      { time: '14:18', action: '系统生成预警', actor: '风险引擎' },
      { time: '14:18', action: '通知员工与班组长', actor: '通知服务', note: '站内信 + 企业微信' },
      { time: '14:21', action: '员工查看预警', actor: '张伟' },
    ],
  },
  {
    id: 'alert-002',
    employeeId: 'emp-002',
    type: 'fatigue',
    level: 'severe',
    title: '严重疲劳风险',
    reason: 'KSS=8，安全敏感岗位，PVT 出现 6 次注意中断',
    factors: ['严重困倦', '安全敏感岗位', '注意中断增加'],
    createdAt: '今天 14:24',
    status: 'pending',
    assignee: '李建国',
    slaMinutes: 3,
    timeline: [
      { time: '14:24', action: '触发严重风险覆盖规则', actor: '风险引擎', note: 'KSS ≥ 8 + 安全敏感岗位' },
      { time: '14:24', action: '通知班组长、安全管理员、职业健康专员', actor: '通知服务' },
    ],
  },
  {
    id: 'alert-003',
    employeeId: 'emp-003',
    type: 'fatigue',
    level: 'high',
    title: '疲劳风险升高',
    reason: '连续夜班第 3 天，HRV 较基线下降 19%，注意力测试反应时延长',
    factors: ['连续夜班', 'HRV 下降', '反应时延长'],
    createdAt: '今天 13:52',
    status: 'in_progress',
    assignee: '王芳',
    slaMinutes: 10,
    acknowledgedAt: '13:55',
    timeline: [
      { time: '13:52', action: '系统生成预警', actor: '风险引擎' },
      { time: '13:55', action: '班组长确认', actor: '王芳' },
      { time: '13:58', action: '分配恢复性休息', actor: '王芳', note: '20 分钟' },
    ],
  },
  {
    id: 'alert-004',
    employeeId: 'emp-006',
    type: 'fatigue',
    level: 'high',
    title: '注意力明显下降',
    reason: 'PVT 平均反应时较基线延长 31%，遗漏增加',
    factors: ['PVT 反应时延长', '遗漏增加'],
    createdAt: '今天 13:20',
    status: 'pending_retest',
    assignee: '李建国',
    slaMinutes: 10,
    acknowledgedAt: '13:26',
    timeline: [
      { time: '13:20', action: '系统生成预警', actor: '风险引擎' },
      { time: '13:26', action: '班组长确认', actor: '李建国' },
      { time: '13:32', action: '完成任务轮换与双人复核', actor: '周涛' },
      { time: '13:45', action: '等待复测', actor: '系统' },
    ],
  },
  {
    id: 'alert-005',
    employeeId: 'emp-008',
    type: 'data',
    level: 'attention',
    title: '设备数据中断',
    reason: '安全敏感班次中设备离线 18 分钟，当前数据完整度 46%',
    factors: ['设备离线', '数据不完整'],
    createdAt: '今天 14:10',
    status: 'pending',
    assignee: '赵磊',
    slaMinutes: 30,
    timeline: [
      { time: '14:10', action: '检测到设备离线', actor: '设备接入服务' },
      { time: '14:10', action: '通知员工与班组长', actor: '通知服务' },
    ],
  },
  {
    id: 'alert-006',
    employeeId: 'emp-012',
    type: 'compliance',
    level: 'attention',
    title: '班前测评未完成',
    reason: '安全敏感岗位班前 30 分钟仍未完成快速测评',
    factors: ['测评缺失', '安全敏感岗位'],
    createdAt: '今天 12:30',
    status: 'acknowledged',
    assignee: '陈静',
    slaMinutes: 60,
    acknowledgedAt: '12:40',
    timeline: [
      { time: '12:30', action: '生成依从性提醒', actor: '测评服务' },
      { time: '12:40', action: '班组长确认并提醒员工', actor: '陈静' },
    ],
  },
  {
    id: 'alert-007',
    employeeId: 'emp-018',
    type: 'fatigue',
    level: 'attention',
    title: '持续关注级疲劳',
    reason: '连续 3 个快照处于关注区间，建议增加班中休息',
    factors: ['持续关注', '轻度疲劳'],
    createdAt: '今天 10:20',
    status: 'resolved',
    assignee: '王芳',
    slaMinutes: 60,
    acknowledgedAt: '10:25',
    resolvedAt: '11:18',
    timeline: [
      { time: '10:20', action: '系统生成预警', actor: '风险引擎' },
      { time: '10:25', action: '班组长确认', actor: '王芳' },
      { time: '10:30', action: '完成 15 分钟微休息', actor: '梁宇' },
      { time: '11:18', action: '复测风险降至低风险', actor: '系统' },
    ],
  },
  {
    id: 'alert-008',
    employeeId: 'emp-024',
    type: 'fatigue',
    level: 'high',
    title: '疲劳风险升高',
    reason: 'HRV 下降 22%，KSS=7，当前为夜班第 4 小时',
    factors: ['HRV 下降', '夜班负荷', '主观困倦'],
    createdAt: '今天 14:26',
    status: 'pending',
    assignee: '赵磊',
    slaMinutes: 10,
    timeline: [
      { time: '14:26', action: '系统生成预警', actor: '风险引擎' },
      { time: '14:26', action: '通知员工与班组长', actor: '通知服务' },
    ],
  },
]

export const INTERVENTIONS: InterventionTask[] = [
  {
    id: 'int-001',
    employeeId: 'emp-003',
    alertId: 'alert-003',
    type: '20 分钟恢复性休息',
    reason: '连续夜班与 HRV 下降',
    status: 'in_progress',
    assignedBy: '王芳',
    assignee: '刘敏',
    dueAt: '今天 14:40',
    createdAt: '今天 13:58',
    preScore: 66,
    durationMinutes: 20,
  },
  {
    id: 'int-002',
    employeeId: 'emp-006',
    alertId: 'alert-004',
    type: '任务轮换 + 双人复核',
    reason: 'PVT 反应时延长，暂停高风险操作',
    status: 'pending_retest',
    assignedBy: '李建国',
    assignee: '周涛',
    dueAt: '今天 14:10',
    createdAt: '今天 13:32',
    preScore: 58,
    durationMinutes: 30,
  },
  {
    id: 'int-003',
    employeeId: 'emp-002',
    alertId: 'alert-002',
    type: '立即停止作业 + 职业健康评估',
    reason: '严重困倦且为安全敏感岗位',
    status: 'in_progress',
    assignedBy: '系统',
    assignee: '王海',
    dueAt: '今天 14:30',
    createdAt: '今天 14:24',
    preScore: 86,
    durationMinutes: 30,
  },
  {
    id: 'int-004',
    employeeId: 'emp-012',
    alertId: 'alert-006',
    type: '设备检查与重新佩戴',
    reason: '设备离线导致数据不足',
    status: 'completed',
    assignedBy: '陈静',
    assignee: '杨帆',
    dueAt: '今天 13:00',
    createdAt: '今天 12:40',
    completedAt: '今天 12:55',
    preScore: 42,
    postScore: 39,
    durationMinutes: 15,
    feedback: 4,
  },
  {
    id: 'int-005',
    employeeId: 'emp-018',
    alertId: 'alert-007',
    type: '15 分钟微休息',
    reason: '持续关注级疲劳',
    status: 'completed',
    assignedBy: '王芳',
    assignee: '梁宇',
    dueAt: '今天 10:50',
    createdAt: '今天 10:30',
    completedAt: '今天 10:46',
    preScore: 44,
    postScore: 31,
    durationMinutes: 15,
    feedback: 5,
  },
  {
    id: 'int-006',
    employeeId: 'emp-024',
    alertId: 'alert-008',
    type: '策略性小睡 15 分钟',
    reason: '夜班中段困倦',
    status: 'accepted',
    assignedBy: '赵磊',
    assignee: '邓超',
    dueAt: '今天 14:55',
    createdAt: '今天 14:28',
    preScore: 65,
    durationMinutes: 15,
  },
]

export const ASSESSMENTS: AssessmentRecord[] = [
  {
    id: 'asm-001',
    employeeId: 'emp-001',
    type: '快速测评',
    createdAt: '今天 13:40',
    riskScore: 71,
    riskLevel: 'high',
    vasF: 66,
    kss: 7,
    pvtScore: 70,
    pomsTmd: 68,
    vstScore: 55,
    axcptScore: 60,
    validity: '有效',
    summary: 'HRV 下降与主观困倦是主要驱动因素，建议暂停安全敏感作业并休息。',
  },
  {
    id: 'asm-002',
    employeeId: 'emp-001',
    type: '完整测评',
    createdAt: '昨天 21:05',
    riskScore: 58,
    riskLevel: 'high',
    vasF: 55,
    kss: 6,
    pvtScore: 61,
    pomsTmd: 61,
    vstScore: 63,
    axcptScore: 58,
    validity: '有效',
    summary: '疲劳风险处于高位，夜班后恢复不足。',
  },
  {
    id: 'asm-003',
    employeeId: 'emp-001',
    type: '快速测评',
    createdAt: '11-07 09:20',
    riskScore: 63,
    riskLevel: 'high',
    vasF: 61,
    kss: 6,
    pvtScore: 64,
    pomsTmd: 64,
    validity: '有效',
    summary: '注意力表现下降，建议增加班中休息。',
  },
  {
    id: 'asm-004',
    employeeId: 'emp-001',
    type: '快速测评',
    createdAt: '11-06 08:55',
    riskScore: 51,
    riskLevel: 'high',
    vasF: 48,
    kss: 5,
    pvtScore: 53,
    pomsTmd: 56,
    validity: '有效',
    summary: '风险进入高位，建议关注恢复情况。',
  },
]

export const NOTIFICATIONS: AppNotification[] = [
  {
    id: 'noti-001',
    title: '高风险疲劳预警',
    body: '你的 HRV 较个人基线明显下降，建议立即暂停安全敏感作业并休息。',
    time: '14:18',
    level: 'high',
    read: false,
    employeeId: 'emp-001',
  },
  {
    id: 'noti-002',
    title: '休息后复测提醒',
    body: '完成 20 分钟恢复性休息后，请进行快速复测以确认状态。',
    time: '13:45',
    level: 'attention',
    read: false,
    employeeId: 'emp-001',
  },
  {
    id: 'noti-003',
    title: '设备同步正常',
    body: '可穿戴设备 FIT-8000 已同步，最近一次数据更新于刚刚。',
    time: '13:42',
    level: 'low',
    read: true,
    employeeId: 'emp-001',
  },
]

export const DEFAULT_SETTINGS: AppSettings = {
  attentionThreshold: 25,
  highThreshold: 50,
  severeThreshold: 75,
  physiologicalWeight: 35,
  subjectiveWeight: 25,
  cognitiveWeight: 25,
  workloadWeight: 15,
  nightShiftModifier: 5,
  safetySensitiveModifier: 5,
  assessmentInterval: '每班次一次',
  severeResponseMinutes: 3,
  highResponseMinutes: 10,
  dataRetentionMonths: 12,
}

export const ORG_TREND = [
  { label: '11-03', value: 31 },
  { label: '11-04', value: 34 },
  { label: '11-05', value: 38 },
  { label: '11-06', value: 36 },
  { label: '11-07', value: 42 },
  { label: '11-08', value: 45 },
  { label: '11-09', value: 43 },
]

export const TEAM_ANALYTICS = TEAMS.map((team, index) => {
  const members = EMPLOYEES.filter((employee) => employee.teamId === team.id)
  const highRisk = members.filter((employee) => ['high', 'severe'].includes(employee.riskLevel)).length
  const avg = members.reduce((sum, employee) => sum + employee.riskScore, 0) / members.length
  const nightMembers = members.filter((employee) => employee.shift === '夜班')
  const nightHigh = nightMembers.filter((employee) => ['high', 'severe'].includes(employee.riskLevel)).length
  return {
    ...team,
    headcount: members.length,
    avgRisk: round(avg),
    highRisk,
    highRiskRate: Math.round((highRisk / members.length) * 100),
    alerts: ALERTS.filter((alert) => members.some((m) => m.id === alert.employeeId)).length,
    completion: [92, 88, 81, 76, 90][index],
    deviceOnline: [96, 92, 94, 88, 97][index],
    nightHighRate: nightMembers.length ? Math.round((nightHigh / nightMembers.length) * 100) : 0,
    dayHighRate: Math.round(((highRisk - nightHigh) / Math.max(1, members.length - nightMembers.length)) * 100),
  }
})

export const FACTOR_SUMMARY = [
  { label: 'HRV 低于基线', value: 31, team: '全组织' },
  { label: '主观困倦 KSS ≥ 7', value: 24, team: '全组织' },
  { label: 'PVT 注意中断', value: 19, team: '全组织' },
  { label: '连续夜班 ≥ 3 天', value: 16, team: '全组织' },
  { label: '设备数据中断', value: 9, team: '全组织' },
]

export function getEmployee(id: string): Employee | undefined {
  return EMPLOYEES.find((employee) => employee.id === id)
}

export function getEmployeeLevelLabel(score: number): string {
  return getRiskMeta(levelFromScore(score)).label
}
