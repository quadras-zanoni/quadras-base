'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import toast from 'react-hot-toast'

export default function CadastroPage() {
  const { register } = useAuth()
  const router = useRouter()
  const [email,   setEmail]   = useState('')
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [loading, setLoading]  = useState(false)

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password || !confirm) return toast.error('Preencha todos os campos')
    if (password.length < 6) return toast.error('A senha deve ter pelo menos 6 caracteres')
    if (password !== confirm) return toast.error('As senhas não coincidem')
    setLoading(true)
    try {
      await register(email, password)
      toast.success('Conta criada com sucesso!')
      router.replace('/dashboard')
    } catch (err: any) {
      const msg =
        err.code === 'auth/email-already-in-use'
          ? 'Este e-mail já está cadastrado'
          : 'Erro ao criar conta. Tente novamente.'
      toast.error(msg)
    } finally {
      setLoading(false)
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
          position: 'absolute', top: '-15%', right: '-10%',
          width: '55%', height: '55%',
          background: 'radial-gradient(circle, rgba(107,44,255,0.10) 0%, transparent 65%)',
        }} />
        <div style={{
          position: 'absolute', bottom: '-10%', left: '-10%',
          width: '50%', height: '50%',
          background: 'radial-gradient(circle, rgba(0,217,255,0.08) 0%, transparent 65%)',
        }} />
        <div style={{
          position: 'absolute', top: '30%', left: '-5%',
          width: '35%', height: '35%',
          background: 'radial-gradient(circle, rgba(255,0,212,0.06) 0%, transparent 70%)',
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
          <p className="text-[#a8a8bd] text-sm mt-1.5">Crie sua conta e comece agora</p>
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
          <form onSubmit={handleRegister} className="space-y-4">
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
              placeholder="Mínimo 6 caracteres"
              autoComplete="new-password"
            />
            <Input
              label="Confirmar Senha"
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="Repita a senha"
              autoComplete="new-password"
            />
            <Button type="submit" loading={loading} className="w-full" size="lg">
              Criar conta
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-[#a8a8bd] mt-6 tracking-wide">
          Já tem conta?{' '}
          <Link href="/login" className="font-semibold gradient-text hover:opacity-80 transition-opacity">
            Fazer login
          </Link>
        </p>
      </div>
    </div>
  )
}
