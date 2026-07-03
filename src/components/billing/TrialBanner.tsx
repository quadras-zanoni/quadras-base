'use client'

import Link from 'next/link'
import { useState } from 'react'

interface Props {
  emTeste: boolean
  diasRestantes: number | null
  dataVencimento: string | null
  valor: number | null
}

// Faixa de aviso no painel: mostra o período de teste (ou vencimento próximo) e leva
// pra tela de assinatura. Só aparece em teste ou faltando <= 7 dias. Dispensável na sessão.
export function TrialBanner({ emTeste, diasRestantes, dataVencimento, valor }: Props) {
  const [hidden, setHidden] = useState(false)
  if (hidden || diasRestantes == null) return null

  const nearDue = diasRestantes <= 7
  if (!emTeste && !nearDue) return null

  const dias = Math.max(diasRestantes, 0)
  const diasTxt = dias === 0 ? (emTeste ? 'último dia' : 'hoje') : `${dias} dia${dias > 1 ? 's' : ''}`
  const dataFmt = dataVencimento
    ? new Date(dataVencimento).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : null
  const valorFmt = valor != null ? valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : null

  const texto = emTeste
    ? `Período de teste — ${dias === 0 ? 'último dia' : `faltam ${diasTxt}`}.` +
      (dataFmt ? ` A cobrança${valorFmt ? ` de ${valorFmt}` : ''} começa em ${dataFmt}.` : '')
    : `Sua mensalidade vence ${dias === 0 ? 'hoje' : `em ${diasTxt}`}${dataFmt ? ` (${dataFmt})` : ''}.`

  return (
    <div className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-[var(--radius-card)] border border-warning/40 bg-warning/10 px-4 py-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-warning/20 text-warning" aria-hidden>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
          <path d="M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
          <path d="M12 9v4" strokeLinecap="round" />
          <path d="M12 17h.01" strokeLinecap="round" />
        </svg>
      </span>
      <p className="min-w-0 flex-1 text-sm text-ink">{texto}</p>
      <Link
        href="/subscription"
        className="inline-flex items-center rounded-[var(--radius-ctl)] bg-primary px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
      >
        {emTeste ? 'Assinar agora' : 'Pagar agora'}
      </Link>
      <button
        onClick={() => setHidden(true)}
        aria-label="Fechar aviso"
        className="shrink-0 text-muted transition-colors hover:text-ink"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  )
}
