import { InputHTMLAttributes, forwardRef } from 'react'
import { clsx } from 'clsx'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, ...props }, ref) => (
    <div className="w-full">
      {label && (
        <label className="block text-xs font-semibold uppercase tracking-widest text-[#a8a8bd] mb-1.5">
          {label}
        </label>
      )}
      <input
        ref={ref}
        className={clsx(
          'w-full px-3 py-2.5 rounded-lg text-sm text-[#f7f7ff] placeholder:text-[#a8a8bd]/45 transition-all focus:outline-none focus:ring-1',
          'bg-[#0a0a14] border',
          error
            ? 'border-[#ff00d4]/50 focus:border-[#ff00d4] focus:ring-[#ff00d4]/25'
            : 'border-[rgba(255,255,255,0.09)] focus:border-[#6b2cff] focus:ring-[#6b2cff]/25',
          className
        )}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-[#ff88d4]">{error}</p>}
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
      {label && (
        <label className="block text-xs font-semibold uppercase tracking-widest text-[#a8a8bd] mb-1.5">
          {label}
        </label>
      )}
      <select
        ref={ref}
        className={clsx(
          'w-full px-3 py-2.5 rounded-lg text-sm text-[#f7f7ff] transition-all focus:outline-none focus:ring-1',
          'bg-[#0a0a14] border',
          error
            ? 'border-[#ff00d4]/50 focus:border-[#ff00d4] focus:ring-[#ff00d4]/25'
            : 'border-[rgba(255,255,255,0.09)] focus:border-[#6b2cff] focus:ring-[#6b2cff]/25',
          className
        )}
        {...props}
      >
        {children}
      </select>
      {error && <p className="mt-1 text-xs text-[#ff88d4]">{error}</p>}
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
      {label && (
        <label className="block text-xs font-semibold uppercase tracking-widest text-[#a8a8bd] mb-1.5">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        rows={3}
        className={clsx(
          'w-full px-3 py-2.5 rounded-lg text-sm text-[#f7f7ff] placeholder:text-[#a8a8bd]/45 transition-all focus:outline-none focus:ring-1 resize-none',
          'bg-[#0a0a14] border',
          error
            ? 'border-[#ff00d4]/50 focus:border-[#ff00d4] focus:ring-[#ff00d4]/25'
            : 'border-[rgba(255,255,255,0.09)] focus:border-[#6b2cff] focus:ring-[#6b2cff]/25',
          className
        )}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-[#ff88d4]">{error}</p>}
    </div>
  )
)
Textarea.displayName = 'Textarea'
