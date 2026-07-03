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
  emTeste: boolean
  diasRestantes: number | null
  dataVencimento: string | null
}

export default function SubscriptionClient({
  billingHubUrl,
  tenantKey,
  qrCode,
  qrCodeBase64,
  valor,
  emTeste,
  diasRestantes,
  dataVencimento,
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
        // Confirma quando um pagamento é registrado (em teste, "active" já é true;
        // por isso checamos em_teste virar false = passou a pago).
        if (data.active && data.em_teste === false) {
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

  const dataFmt = dataVencimento
    ? new Date(dataVencimento).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : null
  const dias = diasRestantes != null ? Math.max(diasRestantes, 0) : null

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
          <p className="text-sm text-muted">Assinatura ativa por 30 dias. Redirecionando...</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas p-4">
      <div className="w-full max-w-sm">

        {/* Logo + marca */}
        <div className="flex flex-col items-center gap-3 mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-arena-branca.png" alt="Arena do Parque" className="h-28 w-auto" />
        </div>

        {/* Badge de aviso */}
        <div className="flex justify-center mb-5">
          {emTeste ? (
            <Badge variant="blue">
              <span className="w-1.5 h-1.5 rounded-full bg-info mr-1" />
              Período de teste
            </Badge>
          ) : (
            <Badge variant="yellow">
              <span className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse mr-1" />
              Acesso bloqueado
            </Badge>
          )}
        </div>

        {/* Card principal */}
        <Card className="p-6">

          {/* Título */}
          <div className="text-center mb-6">
            <h1 className="text-xl font-bold text-ink mb-1.5">
              {emTeste ? 'Ative sua assinatura' : 'Mensalidade vencida'}
            </h1>
            <p className="text-sm text-muted leading-relaxed">
              {emTeste
                ? `${dias != null ? (dias === 0 ? 'Seu teste termina hoje. ' : `Você está no teste — faltam ${dias} dia${dias > 1 ? 's' : ''}. `) : 'Você está no período de teste. '}` +
                  `Pague o PIX abaixo para garantir a continuidade${dataFmt ? ` (cobrança em ${dataFmt})` : ''}.`
                : 'Sua mensalidade venceu. Renove para continuar usando o sistema.'}
            </p>
          </div>

          {/* Valor */}
          <div className="text-center mb-5 py-3 border-b border-line">
            <p className="text-xs font-medium text-subtle uppercase tracking-wide mb-1">
              {emTeste ? 'Assinatura mensal' : 'Valor da mensalidade'}
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
