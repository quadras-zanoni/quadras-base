import { ButtonHTMLAttributes, ReactNode } from 'react'
import { clsx } from 'clsx'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  children: ReactNode
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  children,
  className,
  disabled,
  ...props
}: ButtonProps) {
  const base =
    'inline-flex items-center justify-center font-semibold rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#05050a] disabled:opacity-40 disabled:cursor-not-allowed tracking-wide'

  const variants = {
    primary: 'btn-gradient focus:ring-[#6b2cff]',
    secondary:
      'bg-[#151522] text-[#f7f7ff] border border-[rgba(255,255,255,0.09)] hover:border-[rgba(255,255,255,0.18)] hover:bg-[#1e1e30] focus:ring-[#6b2cff]',
    danger:
      'bg-[#ff00d4]/10 text-[#ff88d4] border border-[#ff00d4]/25 hover:bg-[#ff00d4]/18 focus:ring-[#ff00d4]',
    ghost:
      'text-[#a8a8bd] hover:bg-white/5 hover:text-[#f7f7ff] focus:ring-[#6b2cff]',
  }

  const sizes = {
    sm: 'px-3 py-1.5 text-sm h-8',
    md: 'px-4 py-2 text-sm h-10',
    lg: 'px-6 text-base h-12',
  }

  return (
    <button
      className={clsx(base, variants[variant], sizes[size], className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  )
}
