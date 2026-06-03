import { ReactNode } from 'react'
import { clsx } from 'clsx'

interface CardProps {
  children: ReactNode
  className?: string
}

export function Card({ children, className }: CardProps) {
  return (
    <div
      className={clsx(
        'bg-surface border border-line rounded-[var(--radius-card)] shadow-card',
        className
      )}
    >
      {children}
    </div>
  )
}

type StatColor = 'green' | 'blue' | 'yellow' | 'red' | 'purple' | 'teal'

interface StatCardProps {
  title: string
  value: string | number
  icon: ReactNode
  color: StatColor
  subtitle?: string
  /** Linha de variação opcional (ex: "+2 vs. ontem"). */
  delta?: { label: string; tone?: 'up' | 'down' | 'neutral' }
}

const iconStyles: Record<StatColor, { bg: string; color: string }> = {
  blue:   { bg: '#eff6ff', color: '#3b82f6' },
  green:  { bg: '#ecfdf5', color: '#10b981' },
  yellow: { bg: '#fffbeb', color: '#f59e0b' },
  red:    { bg: '#fef2f2', color: '#ef4444' },
  purple: { bg: '#f5f3ff', color: '#8b5cf6' },
  teal:   { bg: '#f0fdfa', color: '#14b8a6' },
}

const deltaTone = {
  up: 'text-success',
  down: 'text-danger',
  neutral: 'text-muted',
}

export function StatCard({ title, value, icon, color, subtitle, delta }: StatCardProps) {
  const s = iconStyles[color]
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div
          className="p-2.5 rounded-[var(--radius-ctl)] shrink-0"
          style={{ background: s.bg, color: s.color }}
        >
          {icon}
        </div>
      </div>
      <p className="text-[13px] font-medium text-muted mt-3">{title}</p>
      <p className="text-2xl font-bold text-ink leading-tight mt-0.5">{value}</p>
      {delta && (
        <p className={clsx('text-xs font-medium mt-1', deltaTone[delta.tone ?? 'neutral'])}>
          {delta.label}
        </p>
      )}
      {subtitle && !delta && (
        <p className="text-xs text-muted mt-1 truncate">{subtitle}</p>
      )}
    </Card>
  )
}
