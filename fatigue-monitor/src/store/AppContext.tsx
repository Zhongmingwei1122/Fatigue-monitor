import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type {
  AlertRecord,
  AppNotification,
  AppSettings,
  AssessmentRecord,
  CognitivePayload,
  Employee,
  InterventionTask,
  RiskFactor,
  Role,
  SubjectivePayload,
  ToastMessage,
} from '../types'
import {
  ALERTS,
  ASSESSMENTS,
  CURRENT_EMPLOYEE_ID,
  DEFAULT_SETTINGS,
  EMPLOYEES,
  INTERVENTIONS,
  NOTIFICATIONS,
  TODAY,
} from '../data/mockData'
import { clamp, computeRisk, getRiskMeta, round } from '../lib/risk'

const STORAGE_KEY = 'ofmp-demo-state-v1'
const ROLE_KEY = 'ofmp-role'
const THEME_KEY = 'ofmp-theme'

type Theme = 'light' | 'dark'

interface PersistedState {
  employees: Employee[]
  alerts: AlertRecord[]
  interventions: InterventionTask[]
  assessments: AssessmentRecord[]
  notifications: AppNotification[]
  settings: AppSettings
}

interface AssessmentSubmission {
  type: '快速测评' | '完整测评' | '干预后复测'
  subjective: SubjectivePayload
  cognitive: CognitivePayload
}

interface EmployeeDraft {
  name: string
  employeeNo: string
  job: string
  team: string
  shift: Employee['shift']
  safetySensitive: boolean
  phone: string
  device: string
}

interface AppContextValue extends PersistedState {
  role: Role | null
  theme: Theme
  currentEmployee: Employee
  currentEmployeeId: string
  toasts: ToastMessage[]
  setRole: (role: Role | null) => void
  toggleTheme: () => void
  addToast: (toast: Omit<ToastMessage, 'id'>) => void
  removeToast: (id: string) => void
  resetDemo: () => void
  markNotificationsRead: () => void
  acknowledgeAlert: (id: string) => void
  resolveAlert: (id: string) => void
  markFalsePositive: (id: string, reason: string) => void
  assignInterventionToAlert: (alertId: string, type: string, duration: number) => void
  assignInterventionToEmployee: (employeeId: string, type: string, duration: number) => void
  startCurrentIntervention: (type: string, duration: number) => string
  completeIntervention: (id: string) => void
  updateInterventionStatus: (id: string, status: InterventionTask['status']) => void
  finishInterventionRetest: (id: string, postScore: number) => void
  retestCurrent: (kss: number, vasF: number) => { score: number; level: string } | null
  submitAssessment: (submission: AssessmentSubmission) => { score: number; level: string; confidence: string }
  addEmployee: (draft: EmployeeDraft) => boolean
  toggleEmployeeStatus: (id: string) => void
  updateSettings: (settings: AppSettings) => void
}

const AppContext = createContext<AppContextValue | null>(null)

function initialState(): PersistedState {
  return {
    employees: EMPLOYEES.map((employee) => ({ ...employee })),
    alerts: ALERTS.map((alert) => ({ ...alert, timeline: [...alert.timeline] })),
    interventions: INTERVENTIONS.map((task) => ({ ...task })),
    assessments: ASSESSMENTS.map((assessment) => ({ ...assessment })),
    notifications: NOTIFICATIONS.map((notification) => ({ ...notification })),
    settings: { ...DEFAULT_SETTINGS },
  }
}

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function safeSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Some file:// browser contexts disable storage; the demo still runs in memory.
  }
}

function safeRemove(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch {
    // Ignore unavailable storage in standalone file mode.
  }
}

function loadState(): PersistedState {
  try {
    const raw = safeGet(STORAGE_KEY)
    if (!raw) return initialState()
    const parsed = JSON.parse(raw) as PersistedState
    if (!parsed.employees?.length || !parsed.settings) return initialState()
    return parsed
  } catch {
    return initialState()
  }
}

function nowLabel(): string {
  const now = new Date()
  return `今天 ${now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`
}

function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function countForWeight(value: number): number {
  return clamp(round(value * 100), 0, 100)
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PersistedState>(loadState)
  const [role, setRoleState] = useState<Role | null>(
    () => (safeGet(ROLE_KEY) as Role | null) ?? null,
  )
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = safeGet(THEME_KEY) as Theme | null
    if (saved) return saved
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  useEffect(() => {
    safeSet(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    safeSet(THEME_KEY, theme)
  }, [theme])

  useEffect(() => {
    if (role) safeSet(ROLE_KEY, role)
    else safeRemove(ROLE_KEY)
  }, [role])

  const addToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = uid('toast')
    setToasts((current) => [...current, { ...toast, id }])
    window.setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== id))
    }, 4200)
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts((current) => current.filter((item) => item.id !== id))
  }, [])

  const setRole = useCallback((nextRole: Role | null) => {
    setRoleState(nextRole)
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme((current) => (current === 'light' ? 'dark' : 'light'))
  }, [])

  const resetDemo = useCallback(() => {
    safeRemove(STORAGE_KEY)
    setState(initialState())
    setRoleState(null)
    addToast({ title: '演示数据已重置', description: '已恢复为初始场景。', tone: 'info' })
  }, [addToast])

  const markNotificationsRead = useCallback(() => {
    setState((current) => ({
      ...current,
      notifications: current.notifications.map((notification) => ({ ...notification, read: true })),
    }))
  }, [])

  const acknowledgeAlert = useCallback(
    (id: string) => {
      setState((current) => {
        const target = current.alerts.find((alert) => alert.id === id)
        return {
          ...current,
          alerts: current.alerts.map((alert) =>
            alert.id === id
              ? {
                  ...alert,
                  status: alert.status === 'escalated' ? 'in_progress' : 'acknowledged',
                  acknowledgedAt: nowLabel(),
                  timeline: [
                    ...alert.timeline,
                    { time: nowLabel(), action: '负责人确认预警', actor: '当前用户' },
                  ],
                }
              : alert,
          ),
          notifications: target
            ? current.notifications.map((notification) =>
                notification.employeeId === target.employeeId
                  ? { ...notification, read: true }
                  : notification,
              )
            : current.notifications,
        }
      })
      addToast({ title: '预警已确认', description: '请在时限内完成干预与复测。', tone: 'success' })
    },
    [addToast],
  )

  const resolveAlert = useCallback(
    (id: string) => {
      setState((current) => ({
        ...current,
        alerts: current.alerts.map((alert) =>
          alert.id === id
            ? {
                ...alert,
                status: 'resolved',
                resolvedAt: nowLabel(),
                timeline: [
                  ...alert.timeline,
                  { time: nowLabel(), action: '风险解除，等待复核关闭', actor: '当前用户' },
                ],
              }
            : alert,
        ),
      }))
      addToast({ title: '预警已解除', description: '请保留复测依据并完成复核。', tone: 'success' })
    },
    [addToast],
  )

  const markFalsePositive = useCallback(
    (id: string, reason: string) => {
      setState((current) => ({
        ...current,
        alerts: current.alerts.map((alert) =>
          alert.id === id
            ? {
                ...alert,
                status: 'false_positive',
                resolvedAt: nowLabel(),
                timeline: [
                  ...alert.timeline,
                  { time: nowLabel(), action: '复核标记为误报', actor: '当前用户', note: reason },
                ],
              }
            : alert,
        ),
      }))
      addToast({ title: '已标记为误报', description: '该记录将进入规则评估队列。', tone: 'warning' })
    },
    [addToast],
  )

  const assignInterventionToAlert = useCallback(
    (alertId: string, type: string, duration: number) => {
      setState((current) => {
        const alert = current.alerts.find((item) => item.id === alertId)
        if (!alert) return current
        const employee = current.employees.find((item) => item.id === alert.employeeId)
        const task: InterventionTask = {
          id: uid('int'),
          employeeId: alert.employeeId,
          alertId,
          type,
          reason: alert.reason,
          status: 'accepted',
          assignedBy: '当前用户',
          assignee: employee?.name ?? '待分配',
          dueAt: `今天 ${new Date(Date.now() + duration * 60_000).toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit',
          })}`,
          createdAt: nowLabel(),
          preScore: employee?.riskScore ?? 0,
          durationMinutes: duration,
        }
        return {
          ...current,
          interventions: [task, ...current.interventions],
          alerts: current.alerts.map((item) =>
            item.id === alertId
              ? {
                  ...item,
                  status: 'in_progress',
                  acknowledgedAt: item.acknowledgedAt ?? nowLabel(),
                  timeline: [
                    ...item.timeline,
                    {
                      time: nowLabel(),
                      action: '分配干预任务',
                      actor: '当前用户',
                      note: `${type} · ${duration} 分钟`,
                    },
                  ],
                }
              : item,
          ),
        }
      })
      addToast({ title: '干预任务已分配', description: `${type} · ${duration} 分钟`, tone: 'success' })
    },
    [addToast],
  )

  const assignInterventionToEmployee = useCallback(
    (employeeId: string, type: string, duration: number) => {
      setState((current) => {
        const employee = current.employees.find((item) => item.id === employeeId)
        if (!employee) return current
        const alert = current.alerts.find(
          (item) =>
            item.employeeId === employeeId &&
            item.type === 'fatigue' &&
            !['resolved', 'closed', 'false_positive'].includes(item.status),
        )
        const task: InterventionTask = {
          id: uid('int'),
          employeeId,
          alertId: alert?.id,
          type,
          reason: alert?.reason ?? '管理员安排恢复性干预',
          status: 'accepted',
          assignedBy: '当前用户',
          assignee: employee.name,
          dueAt: `今天 ${new Date(Date.now() + duration * 60_000).toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit',
          })}`,
          createdAt: nowLabel(),
          preScore: employee.riskScore,
          durationMinutes: duration,
        }
        return {
          ...current,
          interventions: [task, ...current.interventions],
          alerts: alert
            ? current.alerts.map((item) =>
                item.id === alert.id
                  ? {
                      ...item,
                      status: 'in_progress',
                      acknowledgedAt: item.acknowledgedAt ?? nowLabel(),
                      timeline: [
                        ...item.timeline,
                        {
                          time: nowLabel(),
                          action: '分配干预任务',
                          actor: '当前用户',
                          note: `${type} · ${duration} 分钟`,
                        },
                      ],
                    }
                  : item,
              )
            : current.alerts,
        }
      })
      addToast({ title: '干预任务已创建', description: `${type} · ${duration} 分钟`, tone: 'success' })
    },
    [addToast],
  )

  const startCurrentIntervention = useCallback(
    (type: string, duration: number) => {
      const id = uid('int')
      setState((current) => {
        const employee = current.employees.find((item) => item.id === CURRENT_EMPLOYEE_ID)
        const alert = current.alerts.find(
          (item) => item.employeeId === CURRENT_EMPLOYEE_ID && item.type === 'fatigue' && !['resolved', 'closed', 'false_positive'].includes(item.status),
        )
        const task: InterventionTask = {
          id,
          employeeId: CURRENT_EMPLOYEE_ID,
          alertId: alert?.id,
          type,
          reason: alert?.reason ?? '疲劳风险升高',
          status: 'in_progress',
          assignedBy: '本人',
          assignee: employee?.name ?? '张伟',
          dueAt: `今天 ${new Date(Date.now() + duration * 60_000).toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit',
          })}`,
          createdAt: nowLabel(),
          preScore: employee?.riskScore ?? 0,
          durationMinutes: duration,
        }
        return {
          ...current,
          interventions: [task, ...current.interventions],
          alerts: current.alerts.map((item) =>
            item.id === alert?.id
              ? {
                  ...item,
                  status: 'in_progress',
                  acknowledgedAt: item.acknowledgedAt ?? nowLabel(),
                  timeline: [
                    ...item.timeline,
                    { time: nowLabel(), action: '员工开始干预', actor: employee?.name ?? '张伟', note: type },
                  ],
                }
              : item,
          ),
        }
      })
      addToast({ title: '恢复计时已开始', description: '请在安静环境休息，结束后完成复测。', tone: 'info' })
      return id
    },
    [addToast],
  )

  const completeIntervention = useCallback(
    (id: string) => {
      setState((current) => {
        const task = current.interventions.find((item) => item.id === id)
        return {
          ...current,
          interventions: current.interventions.map((item) =>
            item.id === id
              ? { ...item, status: 'pending_retest', completedAt: nowLabel() }
              : item,
          ),
          alerts: current.alerts.map((alert) =>
            task?.alertId === alert.id
              ? {
                  ...alert,
                  status: 'pending_retest',
                  timeline: [
                    ...alert.timeline,
                    { time: nowLabel(), action: '干预完成，等待复测', actor: task.assignee },
                  ],
                }
              : alert,
          ),
        }
      })
      addToast({ title: '休息已完成', description: '请进行复测，确认当前状态。', tone: 'success' })
    },
    [addToast],
  )

  const updateInterventionStatus = useCallback(
    (id: string, status: InterventionTask['status']) => {
      setState((current) => ({
        ...current,
        interventions: current.interventions.map((task) =>
          task.id === id
            ? {
                ...task,
                status,
                completedAt: status === 'completed' ? nowLabel() : task.completedAt,
              }
            : task,
        ),
      }))
      addToast({
        title: '任务状态已更新',
        description:
          status === 'in_progress'
            ? '干预已开始。'
            : status === 'cancelled'
              ? '任务已取消。'
              : '状态已同步到员工端。',
        tone: status === 'cancelled' ? 'warning' : 'success',
      })
    },
    [addToast],
  )

  const finishInterventionRetest = useCallback(
    (id: string, postScore: number) => {
      setState((current) => {
        const task = current.interventions.find((item) => item.id === id)
        const employee = current.employees.find((item) => item.id === task?.employeeId)
        const closed = Boolean(task && postScore < 50)
        return {
          ...current,
          interventions: current.interventions.map((item) =>
            item.id === id
              ? {
                  ...item,
                  status: 'completed',
                  postScore,
                  completedAt: nowLabel(),
                  feedback: 4,
                }
              : item,
          ),
          employees: current.employees.map((item) =>
            item.id === employee?.id
              ? {
                  ...item,
                  riskScore: postScore,
                  riskLevel: postScore >= 75 ? 'severe' : postScore >= 50 ? 'high' : postScore >= 25 ? 'attention' : 'low',
                  trend7: [...item.trend7.slice(0, -1), postScore],
                }
              : item,
          ),
          alerts: current.alerts.map((alert) =>
            alert.id === task?.alertId && closed
              ? {
                  ...alert,
                  status: 'resolved',
                  resolvedAt: nowLabel(),
                  timeline: [
                    ...alert.timeline,
                    {
                      time: nowLabel(),
                      action: `复测完成，风险降至 ${postScore} 分`,
                      actor: '当前用户',
                    },
                  ],
                }
              : alert,
          ),
        }
      })
      addToast({ title: '复测结果已记录', description: `干预后风险分 ${postScore}。`, tone: postScore < 50 ? 'success' : 'warning' })
    },
    [addToast],
  )

  const submitAssessment = useCallback(
    (submission: AssessmentSubmission) => {
      const employee = state.employees.find((item) => item.id === CURRENT_EMPLOYEE_ID)
      if (!employee) throw new Error('当前员工不存在')

      const kssNorm = clamp(((submission.subjective.kss - 1) / 8) * 100)
      const poms = submission.subjective.pomsTmd
      const subjectiveScore =
        poms != null
          ? 0.45 * submission.subjective.vasFatigue + 0.3 * kssNorm + 0.25 * poms
          : 0.6 * submission.subjective.vasFatigue + 0.4 * kssNorm

      const cognitiveScores = [
        submission.cognitive.pvt.score,
        submission.cognitive.vst?.score,
        submission.cognitive.axcpt?.score,
      ].filter((value): value is number => typeof value === 'number')
      const cognitiveScore =
        cognitiveScores.reduce((sum, value) => sum + value, 0) / Math.max(1, cognitiveScores.length)

      const physiologicalScore = clamp(
        (Math.max(0, employee.baselineHrv - employee.hrv) / employee.baselineHrv) * 120 +
          Math.max(0, employee.hr - employee.baselineHr) * 1.4 +
          10,
      )
      const workloadScore = clamp(
        20 +
          employee.consecutiveDays * 4 +
          employee.overtimeHours * 1.5 +
          (employee.shift === '夜班' ? 20 : 0),
      )

      const result = computeRisk({
        physiologicalScore,
        subjectiveScore,
        cognitiveScore,
        workloadScore,
        nightShift: employee.shift === '夜班',
        safetySensitive: employee.safetySensitive,
        hasPhysiological: true,
        hasSubjective: true,
        hasCognitive: cognitiveScores.length > 0,
      })

      const factors: RiskFactor[] = []
      if (employee.hrv < employee.baselineHrv * 0.85) {
        factors.push({
          label: 'HRV 低于基线',
          contribution: countForWeight((employee.baselineHrv - employee.hrv) / 60),
          detail: `较个人基线下降 ${Math.round(((employee.baselineHrv - employee.hrv) / employee.baselineHrv) * 100)}%`,
          direction: 'up',
        })
      }
      if (submission.subjective.kss >= 6) {
        factors.push({
          label: '主观困倦',
          contribution: Math.round(kssNorm * 0.16),
          detail: `KSS ${submission.subjective.kss} / 9`,
          direction: 'up',
        })
      }
      if (submission.cognitive.pvt.lapses >= 2) {
        factors.push({
          label: '注意中断增加',
          contribution: Math.min(18, submission.cognitive.pvt.lapses * 4),
          detail: `PVT 出现 ${submission.cognitive.pvt.lapses} 次注意中断`,
          direction: 'up',
        })
      }
      if (employee.consecutiveDays >= 5) {
        factors.push({
          label: '连续工作负荷',
          contribution: 5,
          detail: `连续第 ${employee.consecutiveDays} 天，累计加班 ${employee.overtimeHours} 小时`,
          direction: 'up',
        })
      }
      if (!factors.length) {
        factors.push(
          { label: '恢复状态良好', contribution: 0, detail: 'HRV 处于个人正常范围', direction: 'down' },
          { label: '困倦程度较低', contribution: 0, detail: `KSS ${submission.subjective.kss} / 9`, direction: 'down' },
        )
      }

      const record: AssessmentRecord = {
        id: uid('asm'),
        employeeId: CURRENT_EMPLOYEE_ID,
        type: submission.type,
        createdAt: nowLabel(),
        riskScore: result.score,
        riskLevel: result.level,
        vasF: Math.round(submission.subjective.vasFatigue),
        kss: submission.subjective.kss,
        pvtScore: submission.cognitive.pvt.score,
        pomsTmd: submission.subjective.pomsTmd,
        vstScore: submission.cognitive.vst?.score,
        axcptScore: submission.cognitive.axcpt?.score,
        validity: submission.cognitive.pvt.valid ? '有效' : '部分有效',
        summary:
          result.level === 'low'
            ? '当前多模态指标平稳，建议保持规律休息。'
            : result.level === 'attention'
              ? '出现轻度疲劳信号，建议尽快安排一次短时休息。'
              : result.level === 'high'
                ? '疲劳风险较高，建议暂停安全敏感作业并安排恢复性休息。'
                : '疲劳风险严重，请立即停止安全敏感作业并联系班组长。',
      }

      setState((current) => {
        const updatedEmployees = current.employees.map((item) =>
          item.id === CURRENT_EMPLOYEE_ID
            ? {
                ...item,
                riskScore: result.score,
                riskLevel: result.level,
                confidence: result.confidence,
                factors,
                kss: submission.subjective.kss,
                vasF: Math.round(submission.subjective.vasFatigue),
                pvtScore: submission.cognitive.pvt.score,
                pomsTmd: submission.subjective.pomsTmd ?? item.pomsTmd,
                trend7: [...item.trend7.slice(0, -1), result.score],
                lastAssessment: '刚刚',
                dataCompleteness: result.completeness,
              }
            : item,
        )
        const activeAlert = current.alerts.find(
          (alert) =>
            alert.employeeId === CURRENT_EMPLOYEE_ID &&
            alert.type === 'fatigue' &&
            !['resolved', 'closed', 'false_positive'].includes(alert.status),
        )
        const shouldAlert = result.level === 'high' || result.level === 'severe'
        const alerts = activeAlert
          ? current.alerts.map((alert) =>
              alert.id === activeAlert.id
                ? {
                    ...alert,
                    level: result.level,
                    reason: record.summary,
                    factors: factors.map((factor) => factor.label),
                  }
                : alert,
            )
          : shouldAlert
            ? [
                {
                  id: uid('alert'),
                  employeeId: CURRENT_EMPLOYEE_ID,
                  type: 'fatigue' as const,
                  level: result.level,
                  title: result.level === 'severe' ? '严重疲劳风险' : '疲劳风险升高',
                  reason: record.summary,
                  factors: factors.map((factor) => factor.label),
                  createdAt: nowLabel(),
                  status: 'pending' as const,
                  assignee: '李建国',
                  slaMinutes: result.level === 'severe' ? 3 : 10,
                  timeline: [
                    { time: nowLabel(), action: '测评生成风险预警', actor: '风险引擎' },
                    { time: nowLabel(), action: '通知员工与班组长', actor: '通知服务' },
                  ],
                },
                ...current.alerts,
              ]
            : current.alerts
        const notifications = [
          {
            id: uid('noti'),
            title: '测评已完成',
            body: `本次${submission.type}得分 ${result.score} 分，风险等级：${getRiskMeta(result.level).label}。`,
            time: nowLabel(),
            level: result.level,
            read: false,
            employeeId: CURRENT_EMPLOYEE_ID,
          },
          ...current.notifications,
        ]
        return {
          ...current,
          employees: updatedEmployees,
          assessments: [record, ...current.assessments],
          alerts,
          notifications,
        }
      })

      addToast({
        title: '测评完成',
        description: `风险得分 ${result.score} 分 · ${getRiskMeta(result.level).label}`,
        tone: result.level === 'severe' ? 'danger' : result.level === 'high' ? 'warning' : 'success',
      })

      return { score: result.score, level: result.level, confidence: result.confidence }
    },
    [addToast, state.employees],
  )

  const retestCurrent = useCallback(
    (kss: number, vasF: number) => {
      const employee = state.employees.find((item) => item.id === CURRENT_EMPLOYEE_ID)
      if (!employee) return null
      const activeIntervention = state.interventions.find(
        (task) => task.employeeId === CURRENT_EMPLOYEE_ID && !['completed', 'cancelled'].includes(task.status),
      )
      const kssNorm = clamp(((kss - 1) / 8) * 100)
      const subjectiveScore = 0.6 * vasF + 0.4 * kssNorm
      const postPhysiological = clamp(
        (Math.max(0, employee.baselineHrv - employee.hrv) / employee.baselineHrv) * 90 +
          Math.max(0, employee.hr - employee.baselineHr) * 1.0 +
          8,
      )
      const cognitiveScore = clamp(employee.pvtScore * 0.68)
      const workloadScore = clamp(20 + employee.consecutiveDays * 3 + employee.overtimeHours)
      const result = computeRisk({
        physiologicalScore: postPhysiological,
        subjectiveScore,
        cognitiveScore,
        workloadScore,
        safetySensitive: employee.safetySensitive,
        hasPhysiological: true,
        hasSubjective: true,
        hasCognitive: true,
      })
      const factors: RiskFactor[] =
        result.level === 'low'
          ? [
              { label: '休息后恢复良好', contribution: 0, detail: 'HRV 与主观困倦均改善', direction: 'down' },
              { label: '注意力回升', contribution: 0, detail: '复测注意中断减少', direction: 'down' },
            ]
          : [
              { label: 'HRV 仍低于基线', contribution: 10, detail: '恢复仍需时间', direction: 'up' },
              { label: '主观困倦', contribution: 8, detail: `KSS ${kss} / 9`, direction: 'up' },
            ]

      const record: AssessmentRecord = {
        id: uid('asm'),
        employeeId: CURRENT_EMPLOYEE_ID,
        type: '干预后复测',
        createdAt: nowLabel(),
        riskScore: result.score,
        riskLevel: result.level,
        vasF: Math.round(vasF),
        kss,
        pvtScore: Math.round(cognitiveScore),
        validity: '有效',
        summary:
          result.level === 'attention' || result.level === 'low'
            ? '干预后风险下降，建议继续观察并按计划休息。'
            : '干预后风险仍偏高，建议延长休息并联系班组长。',
      }

      setState((current) => ({
        ...current,
        employees: current.employees.map((item) =>
          item.id === CURRENT_EMPLOYEE_ID
            ? {
                ...item,
                riskScore: result.score,
                riskLevel: result.level,
                confidence: result.confidence,
                factors,
                kss,
                vasF: Math.round(vasF),
                trend7: [...item.trend7.slice(0, -1), result.score],
                lastAssessment: '刚刚',
              }
            : item,
        ),
        assessments: [record, ...current.assessments],
        alerts: current.alerts.map((alert) =>
          alert.employeeId === CURRENT_EMPLOYEE_ID && alert.type === 'fatigue'
            ? {
                ...alert,
                status: 'resolved',
                resolvedAt: nowLabel(),
                timeline: [
                  ...alert.timeline,
                  {
                    time: nowLabel(),
                    action: '干预后复测完成，风险降至' + getRiskMeta(result.level).label,
                    actor: '张伟',
                    note: `复测得分 ${result.score}`,
                  },
                ],
              }
            : alert,
        ),
        interventions: current.interventions.map((task) =>
          task.id === activeIntervention?.id
            ? {
                ...task,
                status: 'completed',
                completedAt: nowLabel(),
                postScore: result.score,
                feedback: 4,
              }
            : task,
        ),
        notifications: [
          {
            id: uid('noti'),
            title: '复测完成',
            body: `干预后风险得分 ${result.score} 分，当前为${getRiskMeta(result.level).label}。`,
            time: nowLabel(),
            level: result.level,
            read: false,
            employeeId: CURRENT_EMPLOYEE_ID,
          },
          ...current.notifications,
        ],
      }))

      addToast({
        title: '复测完成',
        description: `风险得分 ${result.score} 分 · ${getRiskMeta(result.level).label}`,
        tone: result.level === 'low' ? 'success' : 'warning',
      })
      return { score: result.score, level: result.level }
    },
    [addToast, state.employees, state.interventions],
  )

  const addEmployee = useCallback(
    (draft: EmployeeDraft) => {
      if (state.employees.some((employee) => employee.employeeNo === draft.employeeNo)) {
        addToast({ title: '工号已存在', description: '请使用组织内唯一的工号。', tone: 'danger' })
        return false
      }
      const team = state.employees.find((employee) => employee.team === draft.team)
      const employee: Employee = {
        id: uid('emp'),
        name: draft.name,
        employeeNo: draft.employeeNo,
        job: draft.job,
        team: draft.team,
        teamId: team?.teamId ?? 'team-1',
        shift: draft.shift,
        shiftStart: draft.shift === '夜班' ? '22:00' : draft.shift === '休息' ? '—' : '08:00',
        shiftEnd: draft.shift === '夜班' ? '06:00' : draft.shift === '休息' ? '—' : '20:00',
        safetySensitive: draft.safetySensitive,
        phone: draft.phone,
        device: draft.device,
        deviceStatus: 'connected',
        battery: 92,
        lastSync: '刚刚',
        riskLevel: 'pending',
        riskScore: 0,
        riskTrend: 'flat',
        confidence: '低',
        factors: [{ label: '待完成首次测评', contribution: 0, detail: '暂无有效风险快照', direction: 'flat' }],
        hrv: 50,
        baselineHrv: 50,
        hr: 70,
        baselineHr: 70,
        kss: 0,
        vasF: 0,
        pomsTmd: 0,
        pvtScore: 0,
        dataCompleteness: 0,
        status: 'active',
        avatarColor: '#dbeafe',
        trend7: [0, 0, 0, 0, 0, 0, 0],
        hrvTrend: [50, 50, 50, 50, 50, 50, 50],
        hrTrend: [70, 70, 70, 70, 70, 70, 70],
        consecutiveDays: 0,
        overtimeHours: 0,
        lastAssessment: '未测评',
      }
      setState((current) => ({ ...current, employees: [employee, ...current.employees] }))
      addToast({ title: '员工已添加', description: '请通知员工完成数据授权与首次测评。', tone: 'success' })
      return true
    },
    [addToast, state.employees],
  )

  const toggleEmployeeStatus = useCallback((id: string) => {
    setState((current) => ({
      ...current,
      employees: current.employees.map((employee) =>
        employee.id === id
          ? { ...employee, status: employee.status === 'active' ? 'inactive' : 'active' }
          : employee,
      ),
    }))
    addToast({ title: '员工状态已更新', tone: 'info' })
  }, [addToast])

  const updateSettings = useCallback(
    (settings: AppSettings) => {
      setState((current) => ({ ...current, settings }))
      addToast({ title: '设置已保存', description: '风险阈值与规则将在下一次计算时生效。', tone: 'success' })
    },
    [addToast],
  )

  const currentEmployee = state.employees.find((employee) => employee.id === CURRENT_EMPLOYEE_ID) ?? EMPLOYEES[0]

  const value = useMemo<AppContextValue>(
    () => ({
      ...state,
      role,
      theme,
      currentEmployee,
      currentEmployeeId: CURRENT_EMPLOYEE_ID,
      toasts,
      setRole,
      toggleTheme,
      addToast,
      removeToast,
      resetDemo,
      markNotificationsRead,
      acknowledgeAlert,
      resolveAlert,
      markFalsePositive,
      assignInterventionToAlert,
      assignInterventionToEmployee,
      startCurrentIntervention,
      completeIntervention,
      updateInterventionStatus,
      finishInterventionRetest,
      retestCurrent,
      submitAssessment,
      addEmployee,
      toggleEmployeeStatus,
      updateSettings,
    }),
    [
      state,
      role,
      theme,
      currentEmployee,
      toasts,
      setRole,
      toggleTheme,
      addToast,
      removeToast,
      resetDemo,
      markNotificationsRead,
      acknowledgeAlert,
      resolveAlert,
      markFalsePositive,
      assignInterventionToAlert,
      assignInterventionToEmployee,
      startCurrentIntervention,
      completeIntervention,
      updateInterventionStatus,
      finishInterventionRetest,
      retestCurrent,
      submitAssessment,
      addEmployee,
      toggleEmployeeStatus,
      updateSettings,
    ],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp(): AppContextValue {
  const context = useContext(AppContext)
  if (!context) throw new Error('useApp must be used within AppProvider')
  return context
}

export { CURRENT_EMPLOYEE_ID, TODAY }
