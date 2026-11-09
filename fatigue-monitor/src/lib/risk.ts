import type { RiskLevel, RiskLevelMeta } from '../types'

export const RISK_META: Record<RiskLevel, RiskLevelMeta> = {
  low: {
    key: 'low',
    label: '低风险',
    short: '低',
    description: '状态平稳，未见明显疲劳信号',
    color: '#0ca30c',
    ink: '#006300',
    soft: 'rgba(12, 163, 12, 0.12)',
  },
  attention: {
    key: 'attention',
    label: '关注',
    short: '关注',
    description: '出现轻度疲劳信号，建议主动调节',
    color: '#fab219',
    ink: '#8a5a00',
    soft: 'rgba(250, 178, 25, 0.16)',
  },
  high: {
    key: 'high',
    label: '高风险',
    short: '高',
    description: '疲劳明显，已影响生理与注意力表现',
    color: '#ec835a',
    ink: '#a23f16',
    soft: 'rgba(236, 131, 90, 0.16)',
  },
  severe: {
    key: 'severe',
    label: '严重风险',
    short: '严重',
    description: '不建议继续从事安全敏感作业',
    color: '#d03b3b',
    ink: '#a52a2a',
    soft: 'rgba(208, 59, 59, 0.14)',
  },
  pending: {
    key: 'pending',
    label: '待评估',
    short: '待评估',
    description: '数据不足，暂时无法给出风险等级',
    color: '#898781',
    ink: '#52514e',
    soft: 'rgba(137, 135, 129, 0.14)',
  },
}

export const RISK_ORDER: RiskLevel[] = ['low', 'attention', 'high', 'severe']

export function getRiskMeta(level: RiskLevel): RiskLevelMeta {
  return RISK_META[level] ?? RISK_META.pending
}

export function levelFromScore(score: number): RiskLevel {
  if (score >= 75) return 'severe'
  if (score >= 50) return 'high'
  if (score >= 25) return 'attention'
  return 'low'
}

export function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value))
}

export function round(value: number, digits = 0): number {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

export interface RiskComputationInput {
  physiologicalScore: number
  subjectiveScore: number
  cognitiveScore: number
  workloadScore: number
  nightShift?: boolean
  safetySensitive?: boolean
  consecutiveNights?: number
  hasPhysiological?: boolean
  hasSubjective?: boolean
  hasCognitive?: boolean
}

export interface RiskComputation {
  score: number
  level: RiskLevel
  confidence: '高' | '中' | '低'
  modifier: number
  completeness: number
  weights: {
    physiological: number
    subjective: number
    cognitive: number
    workload: number
  }
}

export function computeRisk(input: RiskComputationInput): RiskComputation {
  const available = {
    physiological: input.hasPhysiological !== false,
    subjective: input.hasSubjective !== false,
    cognitive: input.hasCognitive !== false,
  }

  const baseWeights = {
    physiological: 0.35,
    subjective: 0.25,
    cognitive: 0.25,
    workload: 0.15,
  }

  const modalityWeight =
    (available.physiological ? baseWeights.physiological : 0) +
    (available.subjective ? baseWeights.subjective : 0) +
    (available.cognitive ? baseWeights.cognitive : 0)

  const weights =
    modalityWeight > 0
      ? {
          physiological: available.physiological
            ? baseWeights.physiological / modalityWeight
            : 0,
          subjective: available.subjective ? baseWeights.subjective / modalityWeight : 0,
          cognitive: available.cognitive ? baseWeights.cognitive / modalityWeight : 0,
          workload: baseWeights.workload,
        }
      : baseWeights

  const modalityScore =
    input.physiologicalScore * weights.physiological +
    input.subjectiveScore * weights.subjective +
    input.cognitiveScore * weights.cognitive

  const scoreBeforeModifier = modalityScore * (1 - weights.workload) + input.workloadScore * weights.workload

  let modifier = 0
  if (input.nightShift) modifier += 5
  if (input.safetySensitive) modifier += 5
  if ((input.consecutiveNights ?? 0) >= 3) modifier += 5
  modifier = Math.min(10, modifier)

  const score = clamp(round(scoreBeforeModifier + modifier, 1))
  const modalityCount = Object.values(available).filter(Boolean).length
  const confidence: '高' | '中' | '低' =
    modalityCount === 3 ? '高' : modalityCount === 2 ? '中' : '低'

  return {
    score,
    level: levelFromScore(score),
    confidence,
    modifier,
    completeness:
      (available.physiological ? 40 : 0) +
      (available.subjective ? 35 : 0) +
      (available.cognitive ? 25 : 0),
    weights,
  }
}

export function riskScoreTone(score: number): string {
  return getRiskMeta(levelFromScore(score)).color
}

export function trendLabel(delta: number): { label: string; direction: 'up' | 'down' | 'flat' } {
  if (delta >= 5) return { label: '上升', direction: 'up' }
  if (delta <= -5) return { label: '下降', direction: 'down' }
  return { label: '稳定', direction: 'flat' }
}

export function formatDateLabel(label: string): string {
  return label.replace(/^(\d{2})-(\d{2})$/, '$1/$2')
}

export function maskPhone(phone: string): string {
  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
}
