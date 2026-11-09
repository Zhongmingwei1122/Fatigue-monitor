export type RiskLevel = 'low' | 'attention' | 'high' | 'severe' | 'pending'
export type Role = 'employee' | 'admin'
export type ShiftType = '白班' | '夜班' | '休息'
export type DeviceStatus = 'connected' | 'not_worn' | 'offline' | 'syncing'
export type AlertStatus =
  | 'pending'
  | 'acknowledged'
  | 'in_progress'
  | 'pending_retest'
  | 'resolved'
  | 'closed'
  | 'false_positive'
  | 'escalated'
export type AlertType = 'fatigue' | 'data' | 'compliance' | 'intervention'
export type InterventionStatus =
  | 'pending'
  | 'accepted'
  | 'in_progress'
  | 'pending_retest'
  | 'completed'
  | 'overdue'
  | 'cancelled'

export interface RiskFactor {
  label: string
  contribution: number
  detail: string
  direction: 'up' | 'down' | 'flat'
}

export interface MetricPoint {
  label: string
  value: number
}

export interface Employee {
  id: string
  name: string
  employeeNo: string
  job: string
  team: string
  teamId: string
  shift: ShiftType
  shiftStart: string
  shiftEnd: string
  safetySensitive: boolean
  phone: string
  device: string
  deviceStatus: DeviceStatus
  battery: number
  lastSync: string
  riskLevel: RiskLevel
  riskScore: number
  riskTrend: 'up' | 'down' | 'flat'
  confidence: '高' | '中' | '低'
  factors: RiskFactor[]
  hrv: number
  baselineHrv: number
  hr: number
  baselineHr: number
  kss: number
  vasF: number
  pomsTmd: number
  pvtScore: number
  dataCompleteness: number
  status: 'active' | 'inactive'
  avatarColor: string
  trend7: number[]
  hrvTrend: number[]
  hrTrend: number[]
  consecutiveDays: number
  overtimeHours: number
  lastAssessment: string
}

export interface AlertRecord {
  id: string
  employeeId: string
  type: AlertType
  level: RiskLevel
  title: string
  reason: string
  factors: string[]
  createdAt: string
  status: AlertStatus
  assignee: string
  slaMinutes: number
  acknowledgedAt?: string
  resolvedAt?: string
  timeline: {
    time: string
    action: string
    actor: string
    note?: string
  }[]
}

export interface InterventionTask {
  id: string
  employeeId: string
  alertId?: string
  type: string
  reason: string
  status: InterventionStatus
  assignedBy: string
  assignee: string
  dueAt: string
  createdAt: string
  completedAt?: string
  preScore: number
  postScore?: number
  durationMinutes: number
  note?: string
  feedback?: number
}

export interface AssessmentRecord {
  id: string
  employeeId: string
  type: '快速测评' | '完整测评' | '干预后复测'
  createdAt: string
  riskScore: number
  riskLevel: RiskLevel
  vasF: number
  kss: number
  pvtScore: number
  pomsTmd?: number
  vstScore?: number
  axcptScore?: number
  validity: '有效' | '部分有效' | '无效'
  summary: string
}

export interface AppNotification {
  id: string
  title: string
  body: string
  time: string
  level: RiskLevel
  read: boolean
  employeeId?: string
}

export interface AppSettings {
  attentionThreshold: number
  highThreshold: number
  severeThreshold: number
  physiologicalWeight: number
  subjectiveWeight: number
  cognitiveWeight: number
  workloadWeight: number
  nightShiftModifier: number
  safetySensitiveModifier: number
  assessmentInterval: string
  severeResponseMinutes: number
  highResponseMinutes: number
  dataRetentionMonths: number
}

export interface ToastMessage {
  id: string
  title: string
  description?: string
  tone: 'success' | 'warning' | 'danger' | 'info'
}

export interface RiskLevelMeta {
  key: RiskLevel
  label: string
  short: string
  description: string
  color: string
  ink: string
  soft: string
}

export interface SubjectivePayload {
  vasFatigue: number
  vasEnergy: number
  kss: number
  pomsTmd?: number
  pomsDimensions?: Record<string, number>
  durationSeconds: number
}

export interface CognitivePayload {
  pvt: {
    valid: boolean
    meanRt: number
    lapses: number
    falseStarts: number
    score: number
  }
  vst?: {
    valid: boolean
    accuracy: number
    meanRt: number
    score: number
  }
  axcpt?: {
    valid: boolean
    accuracy: number
    dPrime: number
    score: number
  }
}
