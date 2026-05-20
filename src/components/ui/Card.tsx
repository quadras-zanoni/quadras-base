import { ReactNode } from 'react'
import { clsx } from 'clsx'

interface CardProps {
  children: ReactNode
  className?: string
}

export function Card({ children, className }: CardProps) {
  return (
    <div className={clsx('card-neon', className)}>
      {children}
    </div>
  )
}

interface StatCardProps {
  title: string
  value: string | number
  icon: ReactNode
  color: 'green' | 'blue' | 'yellow' | 'red' | 'purple'
  subtitle?: string
}

const iconStyles: Record<string, { bg: string; color: string }> = {
  green:  { bg: 'rgba(0, 217, 255, 0.12)',  color: '#00d9ff' },
  blue:   { bg: 'rgba(0, 217, 255, 0.12)',  color: '#00d9ff' },
  yellow: { bg: 'rgba(251, 191, 36, 0.12)', color: '#fbbf24' },
  red:    { bg: 'rgba(255, 0, 212, 0.12)',  color: '#ff88d4' },
  purple: { bg: 'rgba(107, 44, 255, 0.15)', color: '#a855f7' },
}

export function StatCard({ title, value, icon, color, subtitle }: StatCardProps) {
  const s = iconStyles[color]
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[#a8a8bd] mb-1">
            {title}
          </p>
          <p className="text-[22px] font-bold text-[#f7f7ff] font-heading leading-none">
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-[#a8a8bd] mt-1.5 truncate">{subtitle}</p>
          )}
        </div>
        <div
          className="p-2.5 rounded-lg shrink-0"
          style={{ background: s.bg, color: s.color }}
        >
          {icon}
        </div>
      </div>
    </Card>
  )
}
