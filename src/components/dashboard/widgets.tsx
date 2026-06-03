import { ReactNode } from 'react'
import Link from 'next/link'
import { clsx } from 'clsx'

/** Card de painel com header (título + ação opcional). */
export function Panel({
  title, action, actionHref, className, children,
}: {
  title: string
  action?: string
  actionHref?: string
  className?: string
  children: ReactNode
}) {
  return (
    <div className={clsx('bg-surface border border-line rounded-[var(--radius-card)] shadow-card', className)}>
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <h2 className="text-base font-semibold text-ink">{title}</h2>
        {action && actionHref && (
          <Link href={actionHref} className="text-sm font-medium text-brand hover:underline">
            {action}
          </Link>
        )}
      </div>
      <div className="px-5 pb-5">{children}</div>
    </div>
  )
}

/** Donut/anel de progresso em SVG puro (sem lib). */
export function Donut({
  value, size = 56, stroke = 7, color = 'var(--color-brand)', track = 'var(--color-surface-2)', children,
}: {
  value: number
  size?: number
  stroke?: number
  color?: string
  track?: string
  children?: ReactNode
}) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(100, value))
  const dash = (pct / 100) * c
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={`${dash} ${c}`} strokeLinecap="round"
        />
      </svg>
      {children && <div className="absolute inset-0 flex items-center justify-center">{children}</div>}
    </div>
  )
}

type CourtState = 'livre' | 'jogo' | 'pendente' | 'manutencao'

const courtTone: Record<CourtState, { line: string; fill: string }> = {
  livre:      { line: '#14b8a6', fill: '#f0fdfa' },
  jogo:       { line: '#10b981', fill: '#ecfdf5' },
  pendente:   { line: '#f59e0b', fill: '#fffbeb' },
  manutencao: { line: '#8b5cf6', fill: '#f5f3ff' },
}

/** Desenho esquemático de quadra de beach tennis com cor de status. */
export function MiniCourt({ state }: { state: CourtState }) {
  const t = courtTone[state]
  return (
    <svg viewBox="0 0 120 64" className="w-full h-auto" preserveAspectRatio="none">
      <rect x="2" y="2" width="116" height="60" rx="4" fill={t.fill} stroke={t.line} strokeWidth="2" />
      <line x1="60" y1="2" x2="60" y2="62" stroke={t.line} strokeWidth="2" strokeDasharray="3 3" />
      <rect x="22" y="2" width="0.5" height="60" stroke={t.line} strokeWidth="1" opacity="0.5" />
      <rect x="98" y="2" width="0.5" height="60" stroke={t.line} strokeWidth="1" opacity="0.5" />
    </svg>
  )
}

/** Barra de progresso (trilha + preenchimento). */
export function ProgressBar({ value, max, color = 'var(--color-danger)' }: { value: number; max: number; color?: string }) {
  const pct = Math.max(4, Math.min(100, (value / (max || 1)) * 100))
  return (
    <div className="h-1.5 w-full rounded-full bg-surface-2 overflow-hidden">
      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
    </div>
  )
}

/** Estado "em breve" honesto para painéis que dependem de feature inexistente. */
export function ComingSoon({ label = 'Em breve', hint }: { label?: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-6 px-3 rounded-[var(--radius-ctl)] bg-surface-2/60 border border-dashed border-line">
      <span className="text-sm font-medium text-muted">{label}</span>
      {hint && <span className="text-xs text-subtle mt-1 max-w-[220px]">{hint}</span>}
    </div>
  )
}
