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
      const msg =
        err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found'
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
    <div
      className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden"
      style={{ background: '#05050a' }}
    >
      {/* Background neon glows */}
      <div className="fixed inset-0 pointer-events-none">
        <div style={{
          position: 'absolute', top: '-15%', left: '-10%',
          width: '55%', height: '55%',
          background: 'radial-gradient(circle, rgba(255,0,212,0.09) 0%, transparent 65%)',
        }} />
        <div style={{
          position: 'absolute', top: '-10%', right: '-10%',
          width: '50%', height: '50%',
          background: 'radial-gradient(circle, rgba(0,217,255,0.09) 0%, transparent 65%)',
        }} />
        <div style={{
          position: 'absolute', bottom: '10%', left: '50%', transform: 'translateX(-50%)',
          width: '40%', height: '40%',
          background: 'radial-gradient(circle, rgba(107,44,255,0.07) 0%, transparent 70%)',
        }} />
      </div>

      {/* Court pattern overlay */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: 'url(/court-pattern.svg)',
          backgroundRepeat: 'repeat',
          backgroundSize: '140px',
          opacity: 0.08,
        }}
      />

      {/* Auth card */}
      <div className="relative w-full max-w-[440px]">
        {/* Logo */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-5"
            style={{ background: 'linear-gradient(135deg,#ff00d4 0%,#6b2cff 50%,#00d9ff 100%)' }}
          >
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="3" fill="white"/>
              <path d="M12 2C12 2 7 6 7 12s5 10 5 10 5-4 5-10S12 2 12 2z" stroke="white" strokeWidth="1.5" fill="none"/>
              <path d="M2 12h20" stroke="white" strokeWidth="1.5"/>
            </svg>
          </div>
          <h1 className="font-heading font-bold text-2xl tracking-widest gradient-text">
            QUADRAS
          </h1>
          <p className="text-[#a8a8bd] text-sm mt-1.5">Gestão de beach tennis</p>
        </div>

        {/* Card */}
        <div
          className="rounded-lg p-7"
          style={{
            background: '#0d0d16',
            border: '1px solid rgba(255,255,255,0.09)',
            boxShadow: '0 24px 80px rgba(0,0,0,0.5), 0 0 48px rgba(107,44,255,0.07)',
          }}
        >
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
                  className="text-xs text-[#a8a8bd] hover:text-[#00d9ff] transition-colors tracking-wide"
                >
                  Esqueci minha senha
                </button>
              </div>
              <Button type="submit" loading={loading} className="w-full" size="lg">
                Entrar
              </Button>
            </form>
          ) : (
            <form onSubmit={handleReset} className="space-y-4">
              <p className="text-sm text-[#a8a8bd] mb-3 leading-relaxed">
                Digite seu e-mail e enviaremos um link para redefinir sua senha.
              </p>
              <Input
                label="E-mail"
                type="email"
                value={resetEmail}
                onChange={e => setResetEmail(e.target.value)}
                placeholder="seu@email.com"
              />
              <Button type="submit" className="w-full" size="lg">
                Enviar link de recuperação
              </Button>
              <button
                type="button"
                onClick={() => setShowReset(false)}
                className="text-xs text-[#a8a8bd] hover:text-[#f7f7ff] transition-colors w-full text-center tracking-wide"
              >
                ← Voltar ao login
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-sm text-[#a8a8bd] mt-6 tracking-wide">
          Não tem conta?{' '}
          <Link href="/cadastro" className="font-semibold gradient-text hover:opacity-80 transition-opacity">
            Criar conta
          </Link>
        </p>
      </div>
    </div>
  )
}
