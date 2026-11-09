import {
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
import type { MetricPoint, RiskLevel } from '../types'
import { getRiskMeta, RISK_ORDER, clamp } from '../lib/risk'
import { cn } from './ui'

function useContainerWidth<T extends HTMLElement>() {
  const ref = useRef<T | null>(null)
  const [width, setWidth] = useState(640)

  useEffect(() => {
    const element = ref.current
    if (!element) return
    const observer = new ResizeObserver((entries) => {
      const nextWidth = entries[0]?.contentRect.width
      if (nextWidth && nextWidth > 0) setWidth(nextWidth)
    })
    observer.observe(element)
    setWidth(element.getBoundingClientRect().width)
    return () => observer.disconnect()
  }, [])

  return { ref, width }
}

interface Threshold {
  value: number
  label: string
}

interface LineChartProps {
  data: MetricPoint[]
  height?: number
  min?: number
  max?: number
  color?: string
  unit?: string
  thresholds?: Threshold[]
  ariaLabel: string
  valueFormatter?: (value: number) => string
  labelFormatter?: (label: string) => string
}

export function LineChart({
  data,
  height = 220,
  min = 0,
  max = 100,
  color = 'var(--series-1)',
  unit = '',
  thresholds,
  ariaLabel,
  valueFormatter = (value) => `${value}`,
  labelFormatter = (label) => label,
}: LineChartProps) {
  const { ref, width } = useContainerWidth<HTMLDivElement>()
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  const gradientId = useId().replace(/:/g, '')
  const pad = { top: 20, right: 42, bottom: 28, left: 38 }
  const plotWidth = Math.max(10, width - pad.left - pad.right)
  const plotHeight = Math.max(10, height - pad.top - pad.bottom)

  const xFor = (index: number) => pad.left + (data.length <= 1 ? plotWidth / 2 : (index / (data.length - 1)) * plotWidth)
  const yFor = (value: number) => pad.top + (1 - (clamp(value, min, max) - min) / (max - min || 1)) * plotHeight

  const points = data.map((point, index) => ({ ...point, x: xFor(index), y: yFor(point.value) }))
  const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ')
  const areaPath = points.length
    ? `${path} L ${points[points.length - 1].x} ${pad.top + plotHeight} L ${points[0].x} ${pad.top + plotHeight} Z`
    : ''
  const ticks = Array.from({ length: 5 }, (_, index) => min + ((max - min) / 4) * index)
  const hovered = hoverIndex != null ? points[hoverIndex] : null

  const handlePointer = (event: React.PointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const x = event.clientX - rect.left
    const clamped = clamp(x, pad.left, pad.left + plotWidth)
    const ratio = (clamped - pad.left) / plotWidth
    const index = Math.round(ratio * (data.length - 1))
    setHoverIndex(clamp(index, 0, data.length - 1))
  }

  if (!data.length) {
    return <div className="chart-empty">暂无可展示的数据</div>
  }

  const last = points[points.length - 1]
  const lastLabelX = last.x > width - 48 ? last.x - 10 : last.x + 10
  const lastLabelAnchor = last.x > width - 48 ? 'end' : 'start'

  return (
    <div className="line-chart" ref={ref} style={{ height }}>
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={ariaLabel}
        onPointerMove={handlePointer}
        onPointerLeave={() => setHoverIndex(null)}
        className="line-chart-svg"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.16" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {ticks.map((tick) => {
          const y = yFor(tick)
          return (
            <g key={tick}>
              <line
                x1={pad.left}
                x2={width - pad.right}
                y1={y}
                y2={y}
                stroke="var(--line)"
                strokeWidth="1"
              />
              <text x={pad.left - 9} y={y + 3.5} textAnchor="end" className="chart-axis-text">
                {valueFormatter(tick)}
              </text>
            </g>
          )
        })}

        {thresholds?.map((threshold) => {
          const y = yFor(threshold.value)
          return (
            <g key={threshold.label}>
              <line
                x1={pad.left}
                x2={width - pad.right}
                y1={y}
                y2={y}
                stroke="var(--line-strong)"
                strokeWidth="1"
              />
              <text x={width - pad.right + 5} y={y + 3.5} className="chart-threshold-text">
                {threshold.label}
              </text>
            </g>
          )
        })}

        <path d={areaPath} fill={`url(#${gradientId})`} />
        <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

        {points.map((point, index) => (
          <text
            key={`x-${point.label}-${index}`}
            x={point.x}
            y={height - 8}
            textAnchor={index === 0 ? 'start' : index === points.length - 1 ? 'end' : 'middle'}
            className="chart-axis-text"
          >
            {labelFormatter(point.label)}
          </text>
        ))}

        {points.map((point, index) => (
          <circle
            key={`dot-${point.label}-${index}`}
            cx={point.x}
            cy={point.y}
            r={hoverIndex === index ? 4.5 : 2.2}
            fill={hoverIndex === index ? color : 'var(--surface-1)'}
            stroke={color}
            strokeWidth={hoverIndex === index ? 0 : 1.5}
            className="chart-dot"
          />
        ))}

        <circle
          cx={last.x}
          cy={last.y}
          r="5"
          fill={color}
          stroke="var(--surface-1)"
          strokeWidth="2"
        />
        <text
          x={lastLabelX}
          y={Math.max(12, last.y - 10)}
          textAnchor={lastLabelAnchor}
          className="chart-end-label"
        >
          {valueFormatter(last.value)}
        </text>

        {hovered && (
          <>
            <line
              x1={hovered.x}
              x2={hovered.x}
              y1={pad.top}
              y2={pad.top + plotHeight}
              stroke="var(--ink-3)"
              strokeWidth="1"
              pointerEvents="none"
            />
            <circle cx={hovered.x} cy={hovered.y} r="5" fill={color} stroke="var(--surface-1)" strokeWidth="2" />
          </>
        )}
      </svg>

      {hovered && (
        <div
          className="chart-tooltip"
          style={{
            left: `${clamp(hovered.x, 58, width - 58)}px`,
            top: `${Math.max(8, hovered.y - 54)}px`,
          }}
        >
          <strong>
            {valueFormatter(hovered.value)}
            {unit}
          </strong>
          <span>{labelFormatter(hovered.label)}</span>
        </div>
      )}

      <details className="chart-table">
        <summary>查看数据表</summary>
        <table>
          <caption className="sr-only">{ariaLabel}</caption>
          <thead>
            <tr>
              <th>时间</th>
              <th>数值</th>
            </tr>
          </thead>
          <tbody>
            {data.map((point) => (
              <tr key={point.label}>
                <td>{labelFormatter(point.label)}</td>
                <td>
                  {valueFormatter(point.value)}
                  {unit}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  )
}

export function Sparkline({
  data,
  color = 'var(--series-1)',
  width = 108,
  height = 34,
}: {
  data: number[]
  color?: string
  width?: number
  height?: number
}) {
  if (!data.length) return null
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const points = data.map((value, index) => ({
    x: (index / Math.max(1, data.length - 1)) * (width - 4) + 2,
    y: height - 3 - ((value - min) / range) * (height - 8),
  }))
  const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ')
  const last = points[points.length - 1]
  return (
    <svg
      className="sparkline"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
    >
      <path d={path} fill="none" stroke="var(--ink-3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={`${Math.max(1, width * 0.42)} 999`}
      />
      <circle cx={last.x} cy={last.y} r="3" fill={color} stroke="var(--surface-1)" strokeWidth="2" />
    </svg>
  )
}

export function StatTile({
  label,
  value,
  suffix,
  delta,
  deltaDirection = 'up',
  deltaGood = true,
  icon,
  sparkline,
  tone = 'accent',
  footer,
}: {
  label: string
  value: string | number
  suffix?: string
  delta?: string
  deltaDirection?: 'up' | 'down' | 'flat'
  deltaGood?: boolean
  icon?: ReactNode
  sparkline?: number[]
  tone?: 'accent' | 'good' | 'warning' | 'critical'
  footer?: string
}) {
  const DeltaIcon = deltaDirection === 'up' ? ArrowUpRight : deltaDirection === 'down' ? ArrowDownRight : Minus
  const deltaClass =
    deltaDirection === 'flat' ? 'flat' : deltaGood ? 'good' : 'bad'
  const sparkColor =
    tone === 'good'
      ? 'var(--status-good)'
      : tone === 'warning'
        ? 'var(--status-serious)'
        : tone === 'critical'
          ? 'var(--status-critical)'
          : 'var(--series-1)'
  return (
    <div className={cn('stat-tile', `stat-tile-${tone}`)}>
      <div className="stat-tile-top">
        <span className="stat-label">{label}</span>
        {icon && <span className="stat-icon">{icon}</span>}
      </div>
      <div className="stat-value-row">
        <div className="stat-value">
          {value}
          {suffix && <span className="stat-suffix">{suffix}</span>}
        </div>
        {sparkline && <Sparkline data={sparkline} color={sparkColor} />}
      </div>
      <div className="stat-foot">
        {delta && (
          <span className={cn('stat-delta', deltaClass)}>
            <DeltaIcon size={13} />
            {delta}
          </span>
        )}
        {footer && <span className="stat-footer-text">{footer}</span>}
      </div>
    </div>
  )
}

export function SegmentedRiskBar({
  counts,
  total,
  compact = false,
}: {
  counts: Record<RiskLevel, number>
  total: number
  compact?: boolean
}) {
  const levels = RISK_ORDER
  return (
    <div className={cn('segmented-risk', compact && 'segmented-risk-compact')}>
      <div className="segmented-risk-track" role="img" aria-label="风险等级分布">
        {levels.map((level) => {
          const meta = getRiskMeta(level)
          const count = counts[level] ?? 0
          const share = total ? (count / total) * 100 : 0
          if (!count) return null
          return (
            <span
              key={level}
              className="segmented-risk-part"
              style={
                {
                  flexGrow: count,
                  '--part-color': meta.color,
                } as CSSProperties
              }
              title={`${meta.label}：${count} 人（${share.toFixed(1)}%）`}
            >
              {share >= 9 && <span className={level === 'attention' ? 'dark-label' : ''}>{share.toFixed(0)}%</span>}
            </span>
          )
        })}
      </div>
      <div className="segmented-risk-legend">
        {levels.map((level) => {
          const meta = getRiskMeta(level)
          const count = counts[level] ?? 0
          return (
            <div key={level} className="segmented-legend-row">
              <span className="legend-item">
                <span className="legend-swatch" style={{ background: meta.color }} />
                <span>{meta.label}</span>
              </span>
              <span className="segmented-legend-value">
                {count}
                <small>{total ? `${((count / total) * 100).toFixed(0)}%` : '0%'}</small>
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function BarList({
  items,
  max,
  formatValue = (value) => `${value}`,
  color = 'var(--series-1)',
  emptyLabel = '暂无数据',
}: {
  items: { label: string; value: number; hint?: string }[]
  max?: number
  formatValue?: (value: number) => string
  color?: string
  emptyLabel?: string
}) {
  const domain = max ?? Math.max(1, ...items.map((item) => item.value))
  if (!items.length) return <div className="chart-empty">{emptyLabel}</div>
  return (
    <div className="bar-list">
      {items.map((item) => {
        const percentage = clamp((item.value / domain) * 100, 0, 100)
        return (
          <div
            key={item.label}
            className="bar-row"
            tabIndex={0}
            data-tip={`${item.label} · ${formatValue(item.value)}${item.hint ? ` · ${item.hint}` : ''}`}
          >
            <span className="bar-label">{item.label}</span>
            <span className="bar-track" aria-hidden="true">
              <span className="bar-fill" style={{ width: `${percentage}%`, background: color }} />
            </span>
            <span className="bar-value">{formatValue(item.value)}</span>
          </div>
        )
      })}
      <details className="chart-table">
        <summary>查看数据表</summary>
        <table>
          <thead>
            <tr>
              <th>项目</th>
              <th>数值</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.label}>
                <td>{item.label}</td>
                <td>{formatValue(item.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  )
}

export function RiskGauge({
  score,
  level,
  size = 172,
}: {
  score: number
  level: RiskLevel
  size?: number
}) {
  const meta = getRiskMeta(level)
  const radius = 52
  const circumference = 2 * Math.PI * radius
  const dash = (clamp(score, 0, 100) / 100) * circumference
  return (
    <div className="risk-gauge" style={{ width: size, height: size }}>
      <svg viewBox="0 0 120 120" width={size} height={size} aria-hidden="true">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="var(--line)" strokeWidth="9" />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke={meta.color}
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
          transform="rotate(-90 60 60)"
        />
      </svg>
      <div className="risk-gauge-center">
        <strong>{score}</strong>
        <span>/ 100</span>
        <em style={{ color: meta.ink }}>{meta.label}</em>
      </div>
    </div>
  )
}

export function Heatmap({
  rows,
  columns,
  values,
  formatValue = (value) => `${value}`,
  ariaLabel,
}: {
  rows: string[]
  columns: string[]
  values: number[][]
  formatValue?: (value: number) => string
  ariaLabel: string
}) {
  return (
    <div className="heatmap-wrap">
      <div
        className="heatmap"
        style={{ gridTemplateColumns: `minmax(88px, 1fr) repeat(${columns.length}, minmax(58px, 1fr))` }}
        role="img"
        aria-label={ariaLabel}
      >
        <span />
        {columns.map((column) => (
          <span key={column} className="heatmap-col-label">
            {column}
          </span>
        ))}
        {rows.map((row, rowIndex) => (
          <div key={row} className="heatmap-row" style={{ display: 'contents' }}>
            <span className="heatmap-row-label">{row}</span>
            {columns.map((column, columnIndex) => {
              const value = values[rowIndex]?.[columnIndex] ?? 0
              const intensity = clamp(value, 0, 100)
              const light = intensity > 55
              return (
                <span
                  key={`${row}-${column}`}
                  className={cn('heatmap-cell', light && 'heatmap-cell-light')}
                  style={{
                    background: `color-mix(in srgb, var(--series-1) ${12 + intensity * 0.72}%, var(--surface-1))`,
                  }}
                  title={`${row} · ${column}：${formatValue(value)}`}
                >
                  {formatValue(value)}
                </span>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
