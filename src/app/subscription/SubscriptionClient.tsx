'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  billingHubUrl: string
  tenantKey: string
  qrCode: string
  qrCodeBase64: string
  valor: number
}

export default function SubscriptionClient({
  billingHubUrl,
  tenantKey,
  qrCode,
  qrCodeBase64,
  valor,
}: Props) {
  const router = useRouter()
  const [paid, setPaid] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(
          `${billingHubUrl}/api/subscription/check?tenant_key=${tenantKey}`
        )
        const data = await res.json()
        if (data.active) {
          setPaid(true)
          setTimeout(() => router.push('/'), 2000)
        }
      } catch {
        // ignora erros de rede
      }
    }, 15_000)

    return () => clearInterval(interval)
  }, [billingHubUrl, tenantKey, router])

  async function handleCopy() {
    if (!qrCode) return
    try {
      await navigator.clipboard.writeText(qrCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // clipboard não disponível
    }
  }

  if (paid) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a10' }}>
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2" style={{ fontFamily: 'var(--font-rajdhani, sans-serif)' }}>
            Pagamento confirmado!
          </h2>
          <p className="text-sm" style={{ color: '#a8a8bd' }}>Redirecionando para o sistema...</p>
        </div>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: '#0a0a10' }}
    >
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-4"
            style={{ background: 'rgba(239,68,68,0.12)', color: '#f87171' }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
            Acesso bloqueado
          </div>
          <h1 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: 'var(--font-orbitron, monospace)' }}>
            Mensalidade vencida
          </h1>
          <p className="text-sm" style={{ color: '#a8a8bd' }}>
            Sua mensalidade venceu. Renove para continuar usando o sistema.
          </p>
        </div>

        {/* Card de pagamento */}
        <div
          className="rounded-2xl p-6 mb-4"
          style={{ background: '#13131f', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div className="text-center mb-5">
            <p className="text-sm mb-1" style={{ color: '#a8a8bd' }}>Valor da mensalidade</p>
            <p className="text-4xl font-bold text-white" style={{ fontFamily: 'var(--font-orbitron, monospace)' }}>
              R$ {valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>

          {/* QR Code */}
          <div className="flex justify-center mb-5">
            {qrCodeBase64 ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`data:image/png;base64,${qrCodeBase64}`}
                alt="QR Code PIX"
                className="w-52 h-52 rounded-xl"
              />
            ) : (
              <div
                className="w-52 h-52 rounded-xl flex items-center justify-center"
                style={{ background: '#0d0d16', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <p className="text-xs text-center px-4" style={{ color: '#a8a8bd' }}>
                  QR Code indisponível. Tente recarregar a página.
                </p>
              </div>
            )}
          </div>

          {/* Botão copiar */}
          <button
            onClick={handleCopy}
            disabled={!qrCode}
            className="w-full py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-40"
            style={{
              background: copied ? 'rgba(16,185,129,0.15)' : '#6b2cff',
              color: copied ? '#34d399' : 'white',
              fontFamily: 'var(--font-rajdhani, sans-serif)',
            }}
          >
            {copied ? '✓ Código copiado!' : 'Copiar código PIX'}
          </button>
        </div>

        <p className="text-center text-xs" style={{ color: '#6b7280' }}>
          O acesso é liberado automaticamente após a confirmação do pagamento.
        </p>
      </div>
    </div>
  )
}
