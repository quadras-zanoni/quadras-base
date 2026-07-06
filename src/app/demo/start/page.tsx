'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// Monta a sessão do dono-demo no browser (a partir dos tokens que o servidor devolve)
// e leva pro painel. É a segunda etapa da entrada da demo (a primeira é /demo/[slug]).
export default function DemoStartPage() {
  const router = useRouter()
  const [erro, setErro] = useState(false)

  useEffect(() => {
    let cancelado = false
    ;(async () => {
      try {
        const res = await fetch('/api/demo/session', { method: 'POST' })
        if (!res.ok) throw new Error('session')
        const { access_token, refresh_token } = await res.json()
        const { error } = await supabase.auth.setSession({ access_token, refresh_token })
        if (error) throw error
        if (!cancelado) router.replace('/dashboard')
      } catch {
        if (!cancelado) setErro(true)
      }
    })()
    return () => {
      cancelado = true
    }
  }, [router])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-canvas px-4 text-center">
      {!erro ? (
        <>
          <div className="h-10 w-10 rounded-full border-4 border-brand border-t-transparent animate-spin mb-4" />
          <p className="text-ink font-medium">Preparando a demonstração…</p>
          <p className="text-muted text-sm mt-1">Só um instante</p>
        </>
      ) : (
        <>
          <p className="text-ink font-semibold">Não foi possível abrir a demonstração</p>
          <a href="/login" className="text-brand text-sm mt-2 underline">
            Ir para o login
          </a>
        </>
      )}
    </div>
  )
}
