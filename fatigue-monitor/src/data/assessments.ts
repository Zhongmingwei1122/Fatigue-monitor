export interface VasItem {
  id: string
  text: string
  kind: 'fatigue' | 'energy'
}

export const VAS_ITEMS: VasItem[] = [
  { id: 'vas-01', text: '疲倦的', kind: 'fatigue' },
  { id: 'vas-02', text: '疲劳的', kind: 'fatigue' },
  { id: 'vas-03', text: '困倦的', kind: 'fatigue' },
  { id: 'vas-04', text: '无力的', kind: 'fatigue' },
  { id: 'vas-05', text: '迟钝的', kind: 'fatigue' },
  { id: 'vas-06', text: '昏昏欲睡的', kind: 'fatigue' },
  { id: 'vas-07', text: '精神不振的', kind: 'fatigue' },
  { id: 'vas-08', text: '需要休息的', kind: 'fatigue' },
  { id: 'vas-09', text: '身体沉重的', kind: 'fatigue' },
  { id: 'vas-10', text: '动作缓慢的', kind: 'fatigue' },
  { id: 'vas-11', text: '难以集中注意力的', kind: 'fatigue' },
  { id: 'vas-12', text: '缺乏干劲的', kind: 'fatigue' },
  { id: 'vas-13', text: '疲惫不堪的', kind: 'fatigue' },
  { id: 'vas-14', text: '精力充沛的', kind: 'energy' },
  { id: 'vas-15', text: '清醒的', kind: 'energy' },
  { id: 'vas-16', text: '活跃的', kind: 'energy' },
  { id: 'vas-17', text: '有活力的', kind: 'energy' },
  { id: 'vas-18', text: '精神饱满的', kind: 'energy' },
]

export const KSS_LEVELS = [
  { value: 1, label: '极度清醒', hint: '警觉、反应敏捷' },
  { value: 2, label: '非常清醒', hint: '状态很好' },
  { value: 3, label: '清醒', hint: '可以正常工作' },
  { value: 4, label: '比较清醒', hint: '略有下降' },
  { value: 5, label: '既不清醒也不困倦', hint: '中性状态' },
  { value: 6, label: '有些困倦', hint: '想打哈欠' },
  { value: 7, label: '困倦', hint: '难以保持清醒' },
  { value: 8, label: '非常困倦', hint: '强烈想睡' },
  { value: 9, label: '极度困倦', hint: '几乎无法保持清醒' },
]

export type PomsDimension =
  | 'tension'
  | 'depression'
  | 'anger'
  | 'vigor'
  | 'fatigue'
  | 'confusion'

export interface PomsItem {
  id: string
  text: string
  dimension: PomsDimension
}

export const POMS_DIMENSIONS: Record<PomsDimension, string> = {
  tension: '紧张-焦虑',
  depression: '抑郁-沮丧',
  anger: '愤怒-敌意',
  vigor: '精力-活动',
  fatigue: '疲劳-惰性',
  confusion: '困惑-迷茫',
}

export const POMS_ITEMS: PomsItem[] = [
  { id: 'poms-01', text: '紧张的', dimension: 'tension' },
  { id: 'poms-02', text: '不安的', dimension: 'tension' },
  { id: 'poms-03', text: '心烦意乱的', dimension: 'tension' },
  { id: 'poms-04', text: '焦虑的', dimension: 'tension' },
  { id: 'poms-05', text: '神经质的', dimension: 'tension' },
  { id: 'poms-06', text: '沮丧的', dimension: 'depression' },
  { id: 'poms-07', text: '悲伤的', dimension: 'depression' },
  { id: 'poms-08', text: '不快乐的', dimension: 'depression' },
  { id: 'poms-09', text: '绝望的', dimension: 'depression' },
  { id: 'poms-10', text: '无价值的', dimension: 'depression' },
  { id: 'poms-11', text: '生气的', dimension: 'anger' },
  { id: 'poms-12', text: '恼怒的', dimension: 'anger' },
  { id: 'poms-13', text: '易怒的', dimension: 'anger' },
  { id: 'poms-14', text: '愤恨的', dimension: 'anger' },
  { id: 'poms-15', text: '不满的', dimension: 'anger' },
  { id: 'poms-16', text: '精力充沛的', dimension: 'vigor' },
  { id: 'poms-17', text: '活跃的', dimension: 'vigor' },
  { id: 'poms-18', text: '有活力的', dimension: 'vigor' },
  { id: 'poms-19', text: '精神饱满的', dimension: 'vigor' },
  { id: 'poms-20', text: '充满干劲的', dimension: 'vigor' },
  { id: 'poms-21', text: '疲劳的', dimension: 'fatigue' },
  { id: 'poms-22', text: '疲倦的', dimension: 'fatigue' },
  { id: 'poms-23', text: '筋疲力尽的', dimension: 'fatigue' },
  { id: 'poms-24', text: '迟钝的', dimension: 'fatigue' },
  { id: 'poms-25', text: '无精打采的', dimension: 'fatigue' },
  { id: 'poms-26', text: '困惑的', dimension: 'confusion' },
  { id: 'poms-27', text: '迷茫的', dimension: 'confusion' },
  { id: 'poms-28', text: '注意力不集中的', dimension: 'confusion' },
  { id: 'poms-29', text: '健忘的', dimension: 'confusion' },
  { id: 'poms-30', text: '犹豫不决的', dimension: 'confusion' },
]

export const POMS_SCALE = ['完全没有', '有一点', '中等', '相当多', '非常多']

export function pomsNormalizedScore(answers: Record<string, number>): {
  normalized: number
  rawTmd: number
  dimensions: Record<PomsDimension, number>
} {
  const dimensions: Record<PomsDimension, number> = {
    tension: 0,
    depression: 0,
    anger: 0,
    vigor: 0,
    fatigue: 0,
    confusion: 0,
  }
  POMS_ITEMS.forEach((item) => {
    dimensions[item.dimension] += answers[item.id] ?? 0
  })
  const negative =
    dimensions.tension +
    dimensions.depression +
    dimensions.anger +
    dimensions.fatigue +
    dimensions.confusion
  const rawTmd = 100 + negative - dimensions.vigor
  const normalized = Math.min(100, Math.max(0, ((rawTmd - 80) / 120) * 100))
  return { normalized: Math.round(normalized), rawTmd, dimensions }
}
