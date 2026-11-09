import {
  type ButtonHTMLAttributes,
  type CSSProperties,
  type FormEvent,
  type ReactNode,
  useEffect,
} from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  CircleHelp,
  Eye,
  Info,
  ShieldAlert,
  ShieldCheck,
  X,
} from 'lucide-react'
import type { RiskLevel, ToastMessage } from '../types'
import { getRiskMeta } from '../lib/risk'
import { useApp } from '../store/AppContext'

export function cn(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ')
}

const RISK_ICONS: Record<RiskLevel, typeof ShieldCheck> = {
  low: ShieldCheck,
  attention: Eye,
  high: AlertTriangle,
  severe: ShieldAlert,
  pending: CircleHelp,
}

export function RiskBadge({
  level,
  size = 'md',
  withIcon = true,
  label,
}: {
  level: RiskLevel
  size?: 'sm' | 'md' | 'lg'
  withIcon?: boolean
  label?: string
}) {
  const meta = getRiskMeta(level)
  const Icon = RISK_ICONS[level]
  return (
    <span
      className={cn('risk-badge', `risk-badge-${size}`)}
      style={
        {
          '--risk-color': meta.color,
          '--risk-ink': meta.ink,
          '--risk-soft': meta.soft,
        } as CSSProperties
      }
    >
      {withIcon && <Icon size={size === 'sm' ? 12 : 14} strokeWidth={2.2} aria-hidden="true" />}
      {label ?? meta.label}
    </span>
  )
}

export function RiskDot({ level, size = 8 }: { level: RiskLevel; size?: number }) {
  return (
    <span
      className="risk-dot"
      style={{ background: getRiskMeta(level).color, width: size, height: size }}
      aria-hidden="true"
    />
  )
}

export function Avatar({
  name,
  color = '#dbeafe',
  size = 'md',
}: {
  name: string
  color?: string
  size?: 'sm' | 'md' | 'lg'
}) {
  return (
    <span
      className={cn('avatar', `avatar-${size}`)}
      style={{ background: color }}
      aria-hidden="true"
    >
      {name.slice(-2)}
    </span>
  )
}

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'soft' | 'dark'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  icon?: ReactNode
  full?: boolean
}

export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  full,
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn('btn', `btn-${variant}`, `btn-${size}`, full && 'btn-full', className)}
      {...rest}
    >
      {icon}
      <span>{children}</span>
    </button>
  )
}

export function IconButton({
  label,
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button type="button" className={cn('icon-btn', className)} aria-label={label} {...rest}>
      {children}
    </button>
  )
}

export function Card({
  children,
  className,
  as: Tag = 'section',
  ...rest
}: {
  children: ReactNode
  className?: string
  as?: 'section' | 'article' | 'div'
} & React.HTMLAttributes<HTMLElement>) {
  return (
    <Tag className={cn('card', className)} {...rest}>
      {children}
    </Tag>
  )
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string
  title: string
  description?: string
  actions?: ReactNode
}) {
  return (
    <header className="page-header">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="page-header-actions">{actions}</div>}
    </header>
  )
}

export function SectionHeading({
  title,
  description,
  action,
  icon,
}: {
  title: string
  description?: string
  action?: ReactNode
  icon?: ReactNode
}) {
  return (
    <div className="section-heading">
      <div className="section-heading-copy">
        {icon && <span className="section-icon">{icon}</span>}
        <div>
          <h2>{title}</h2>
          {description && <p>{description}</p>}
        </div>
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
}: {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg'
}) {
  useEffect(() => {
    if (!open) return
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = previousOverflow
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="modal-layer" role="presentation">
      <button className="modal-backdrop" onClick={onClose} aria-label="关闭弹窗" />
      <div className={cn('modal', `modal-${size}`)} role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="modal-head">
          <div>
            <h2 id="modal-title">{title}</h2>
            {description && <p>{description}</p>}
          </div>
          <IconButton label="关闭" onClick={onClose} className="modal-close">
            <X size={18} />
          </IconButton>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  )
}

const TOAST_ICONS: Record<ToastMessage['tone'], typeof CheckCircle2> = {
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: ShieldAlert,
  info: Info,
}

export function ToastStack() {
  const { toasts, removeToast } = useApp()
  return (
    <div className="toast-stack" aria-live="polite" aria-atomic="false">
      {toasts.map((toast) => {
        const Icon = TOAST_ICONS[toast.tone]
        return (
          <div key={toast.id} className={cn('toast', `toast-${toast.tone}`)}>
            <Icon size={18} className="toast-icon" />
            <div className="toast-copy">
              <strong>{toast.title}</strong>
              {toast.description && <span>{toast.description}</span>}
            </div>
            <button onClick={() => removeToast(toast.id)} aria-label="关闭提示">
              <X size={14} />
            </button>
          </div>
        )
      })}
    </div>
  )
}

export function ProgressBar({
  value,
  max = 100,
  tone = 'accent',
  label,
  size = 'md',
}: {
  value: number
  max?: number
  tone?: 'accent' | 'good' | 'warning' | 'critical'
  label?: string
  size?: 'sm' | 'md'
}) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100))
  return (
    <div
      className={cn('progress', `progress-${size}`, `progress-${tone}`)}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.round(value)}
      aria-label={label}
    >
      <span style={{ width: `${percentage}%` }} />
    </div>
  )
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="empty-state">
      {icon && <div className="empty-icon">{icon}</div>}
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action}
    </div>
  )
}

export function InfoCallout({
  tone = 'info',
  title,
  children,
  icon,
}: {
  tone?: 'info' | 'warning' | 'danger' | 'good'
  title?: string
  children: ReactNode
  icon?: ReactNode
}) {
  return (
    <div className={cn('callout', `callout-${tone}`)}>
      <span className="callout-icon">{icon ?? <Info size={17} />}</span>
      <div>
        {title && <strong>{title}</strong>}
        <div>{children}</div>
      </div>
    </div>
  )
}

export function FormField({
  label,
  hint,
  error,
  children,
  htmlFor,
}: {
  label: string
  hint?: string
  error?: string
  children: ReactNode
  htmlFor?: string
}) {
  return (
    <label className={cn('form-field', error && 'has-error')} htmlFor={htmlFor}>
      <span className="form-label">{label}</span>
      {children}
      {error ? <span className="form-error">{error}</span> : hint ? <span className="form-hint">{hint}</span> : null}
    </label>
  )
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={cn('toggle', checked && 'is-on')}
      onClick={() => onChange(!checked)}
    >
      <span />
    </button>
  )
}

export function RiskLegend({ showCounts = false }: { showCounts?: boolean }) {
  const items: RiskLevel[] = ['low', 'attention', 'high', 'severe']
  return (
    <div className="risk-legend">
      {items.map((level) => {
        const meta = getRiskMeta(level)
        return (
          <span key={level} className="legend-item">
            <RiskDot level={level} />
            <span>{meta.label}</span>
            {showCounts && <span className="legend-count">—</span>}
          </span>
        )
      })}
    </div>
  )
}

export function InlineForm({
  onSubmit,
  children,
  className,
}: {
  onSubmit: () => void
  children: ReactNode
  className?: string
}) {
  const handle = (event: FormEvent) => {
    event.preventDefault()
    onSubmit()
  }
  return (
    <form className={className} onSubmit={handle}>
      {children}
    </form>
  )
}
