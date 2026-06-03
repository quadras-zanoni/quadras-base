'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'

interface Props {
  billingHubUrl: string
  tenantKey: string
  qrCode: string
  qrCodeBase64: string
  valor: number
}

function BrandMark({ size = 40 }: { size?: number }) {
  return (
    <div
      className="rounded-[10px] flex items-center justify-center shrink-0 bg-brand"
      style={{ width: size, height: size }}
    >
      <svg width={size * 0.5} height={size * 0.5} viewBox="0 0 24 24" fill="none">
        <rect x="3" y="5" width="18" height="14" rx="2" stroke="white" strokeWidth="2" />
        <path d="M12 5v14" stroke="white" strokeWidth="2" />
        <circle cx="12" cy="12" r="1.6" fill="white" />
      </svg>
    </div>
  )
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
      <div className="min-h-screen flex items-center justify-center bg-canvas p-4">
        <Card className="w-full max-w-sm p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-ink mb-2">
            Pagamento confirmado!
          </h2>
          <p className="text-sm text-muted">Redirecionando para o sistema...</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas p-4">
      <div className="w-full max-w-sm">

        {/* Logo + marca */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="rounded-[var(--radius-card)] bg-[#0b0e0b] p-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-arena.jpg" alt="Arena do Parque" className="h-20 w-auto rounded" />
          </div>
        </div>

        {/* Badge de aviso */}
        <div className="flex justify-center mb-5">
          <Badge variant="yellow">
            <span className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse mr-1" />
            Acesso bloqueado
          </Badge>
        </div>

        {/* Card principal */}
        <Card className="p-6">

          {/* Título */}
          <div className="text-center mb-6">
            <h1 className="text-xl font-bold text-ink mb-1.5">
              Mensalidade vencida
            </h1>
            <p className="text-sm text-muted leading-relaxed">
              Sua mensalidade venceu. Renove para continuar usando o sistema.
            </p>
          </div>

          {/* Valor */}
          <div className="text-center mb-5 py-3 border-b border-line">
            <p className="text-xs font-medium text-subtle uppercase tracking-wide mb-1">
              Valor da mensalidade
            </p>
            <p className="text-3xl font-bold text-ink">
              R$&nbsp;{valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>

          {/* QR Code PIX */}
          <div className="flex justify-center mb-5">
            <div className="bg-surface-2 border border-line rounded-[var(--radius-ctl)] p-3 inline-block">
              {qrCodeBase64 ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`data:image/png;base64,${qrCodeBase64}`}
                  alt="QR Code PIX"
                  className="w-48 h-48 rounded"
                />
              ) : (
                <div className="w-48 h-48 flex items-center justify-center">
                  <p className="text-xs text-muted text-center px-4 leading-relaxed">
                    QR Code indisponível. Tente recarregar a página.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Botão copiar PIX */}
          {copied ? (
            <div className="w-full py-2.5 rounded-[var(--radius-ctl)] text-sm font-semibold text-center bg-success/10 text-success">
              ✓ Código copiado!
            </div>
          ) : (
            <Button
              variant="primary"
              size="md"
              onClick={handleCopy}
              disabled={!qrCode}
              className="w-full"
            >
              Copiar código PIX
            </Button>
          )}
        </Card>

        {/* Rodapé */}
        <p className="text-center text-xs text-subtle mt-4">
          O acesso é liberado automaticamente após a confirmação do pagamento.
        </p>
      </div>
    </div>
  )
}
