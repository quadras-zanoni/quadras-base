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
      const msg = err.message?.includes('already registered') || err.message?.includes('already been registered')
        ? 'Este e-mail já está cadastrado'
        : 'Erro ao criar conta. Tente novamente.'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas p-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-arena-branca.png" alt="Arena do Parque" className="h-32 w-auto" />
        </div>

        {/* Card */}
        <div className="bg-surface border border-line rounded-[var(--radius-card)] shadow-card p-7">
          <h2 className="text-base font-semibold text-ink mb-5">Criar sua conta</h2>

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
            <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full">
              Criar conta
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-muted mt-6">
          Já tem conta?{' '}
          <Link href="/login" className="font-semibold text-brand hover:opacity-80 transition-opacity">
            Fazer login
          </Link>
        </p>

      </div>
    </div>
  )
}
