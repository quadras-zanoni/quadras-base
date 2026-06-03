'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const { login, resetPassword } = useAuth()
  const router = useRouter()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [showReset, setShowReset]   = useState(false)
  const [resetEmail, setResetEmail] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password) return toast.error('Preencha todos os campos')
    setLoading(true)
    try {
      await login(email, password)
      router.replace('/dashboard')
    } catch (err: any) {
      const msg = err.message?.includes('Email not confirmed')
        ? 'Confirme seu e-mail antes de entrar (verifique sua caixa de entrada)'
        : err.message?.includes('Invalid login credentials') || err.message?.includes('invalid_credentials')
        ? 'E-mail ou senha incorretos'
        : 'Erro ao fazer login. Tente novamente.'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    if (!resetEmail) return toast.error('Digite seu e-mail')
    try {
      await resetPassword(resetEmail)
      toast.success('E-mail de recuperação enviado!')
      setShowReset(false)
    } catch {
      toast.error('Erro ao enviar e-mail. Verifique o endereço.')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas p-4">
      {/* Auth card */}
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="rounded-[10px] flex items-center justify-center shrink-0 bg-brand w-10 h-10">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="5" width="18" height="14" rx="2" stroke="white" strokeWidth="2" />
                <path d="M12 5v14" stroke="white" strokeWidth="2" />
                <circle cx="12" cy="12" r="1.6" fill="white" />
              </svg>
            </div>
            <div>
              <span className="font-bold text-ink text-lg tracking-tight">QUADRAS</span>
              <p className="text-[10px] font-medium text-subtle uppercase tracking-widest -mt-0.5">
                Gestão Inteligente
              </p>
            </div>
          </div>
        </div>

        {/* Card */}
        <div className="bg-surface border border-line rounded-[var(--radius-card)] shadow-card p-7">
          {!showReset ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <Input
                label="E-mail"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com"
                autoComplete="email"
              />
              <Input
                label="Senha"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Sua senha"
                autoComplete="current-password"
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowReset(true)}
                  className="text-xs text-muted hover:text-brand transition-colors tracking-wide"
                >
                  Esqueci minha senha
                </button>
              </div>
              <Button variant="primary" type="submit" loading={loading} className="w-full" size="lg">
                Entrar
              </Button>
            </form>
          ) : (
            <form onSubmit={handleReset} className="space-y-4">
              <p className="text-sm text-muted mb-3 leading-relaxed">
                Digite seu e-mail e enviaremos um link para redefinir sua senha.
              </p>
              <Input
                label="E-mail"
                type="email"
                value={resetEmail}
                onChange={e => setResetEmail(e.target.value)}
                placeholder="seu@email.com"
              />
              <Button variant="primary" type="submit" className="w-full" size="lg">
                Enviar link de recuperação
              </Button>
              <button
                type="button"
                onClick={() => setShowReset(false)}
                className="text-xs text-muted hover:text-ink transition-colors w-full text-center tracking-wide"
              >
                ← Voltar ao login
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-sm text-muted mt-6 tracking-wide">
          Não tem conta?{' '}
          <Link href="/cadastro" className="font-semibold text-brand hover:opacity-80 transition-opacity">
            Criar conta
          </Link>
        </p>
      </div>
    </div>
  )
}
