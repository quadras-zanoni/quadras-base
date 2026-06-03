import { InputHTMLAttributes, forwardRef } from 'react'
import { clsx } from 'clsx'

const fieldBase =
  'w-full px-3 py-2.5 rounded-[var(--radius-ctl)] text-sm text-ink bg-surface border transition-colors focus:outline-none focus:ring-2'

const fieldState = (error?: string) =>
  error
    ? 'border-danger/60 focus:border-danger focus:ring-danger/20'
    : 'border-line focus:border-brand focus:ring-brand/20'

const labelCls = 'block text-[13px] font-medium text-ink mb-1.5'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, ...props }, ref) => (
    <div className="w-full">
      {label && <label className={labelCls}>{label}</label>}
      <input
        ref={ref}
        className={clsx(fieldBase, 'placeholder:text-subtle', fieldState(error), className)}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  )
)
Input.displayName = 'Input'

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  children: React.ReactNode
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, className, children, ...props }, ref) => (
    <div className="w-full">
      {label && <label className={labelCls}>{label}</label>}
      <select
        ref={ref}
        className={clsx(fieldBase, fieldState(error), className)}
        {...props}
      >
        {children}
      </select>
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  )
)
Select.displayName = 'Select'

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className, ...props }, ref) => (
    <div className="w-full">
      {label && <label className={labelCls}>{label}</label>}
      <textarea
        ref={ref}
        rows={3}
        className={clsx(fieldBase, 'placeholder:text-subtle resize-none', fieldState(error), className)}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  )
)
Textarea.displayName = 'Textarea'
