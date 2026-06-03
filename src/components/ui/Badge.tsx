import { ReactNode } from 'react'
import { clsx } from 'clsx'

type BadgeVariant = 'green' | 'yellow' | 'red' | 'blue' | 'gray' | 'violet'

interface BadgeProps {
  variant: BadgeVariant
  children: ReactNode
  className?: string
}

const variants: Record<BadgeVariant, string> = {
  green:  'bg-success/10 text-[#047857]',
  yellow: 'bg-warning/10 text-[#b45309]',
  red:    'bg-danger/10  text-[#b91c1c]',
  blue:   'bg-info/10    text-[#1d4ed8]',
  violet: 'bg-violet/10  text-[#6d28d9]',
  gray:   'bg-surface-2  text-muted',
}

export function Badge({ variant, children, className }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide',
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
