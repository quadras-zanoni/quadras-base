import { ReactNode } from 'react'
import { clsx } from 'clsx'

type BadgeVariant = 'green' | 'yellow' | 'red' | 'blue' | 'gray'

interface BadgeProps {
  variant: BadgeVariant
  children: ReactNode
  className?: string
}

const variants: Record<BadgeVariant, string> = {
  green:  'bg-[#00d9ff]/10 text-[#00d9ff]  border border-[#00d9ff]/20',
  yellow: 'bg-[#fbbf24]/10 text-[#fbbf24]  border border-[#fbbf24]/20',
  red:    'bg-[#ff00d4]/10 text-[#ff88d4]  border border-[#ff00d4]/20',
  blue:   'bg-[#6b2cff]/12 text-[#a78bfa]  border border-[#6b2cff]/25',
  gray:   'bg-white/5      text-[#a8a8bd]  border border-white/10',
}

export function Badge({ variant, children, className }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  )
}

export function statusBadge(status: string) {
  const map: Record<string, { variant: BadgeVariant; label: string }> = {
    confirmado: { variant: 'green',  label: 'Confirmado' },
    pendente:   { variant: 'yellow', label: 'Pendente' },
    cancelado:  { variant: 'red',    label: 'Cancelado' },
    ativo:      { variant: 'green',  label: 'Ativo' },
    ativa:      { variant: 'green',  label: 'Ativa' },
    inativo:    { variant: 'gray',   label: 'Inativo' },
    inativa:    { variant: 'gray',   label: 'Inativa' },
  }
  return map[status] || { variant: 'gray' as BadgeVariant, label: status }
}
