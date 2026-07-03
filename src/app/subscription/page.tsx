import { redirect } from 'next/navigation'
import SubscriptionClient from './SubscriptionClient'

export default async function SubscriptionPage() {
  const billingHubUrl = process.env.BILLING_HUB_URL
  const tenantKey = process.env.BILLING_TENANT_KEY

  // Sem billing configurado, redireciona para home (fail open)
  if (!billingHubUrl || !tenantKey) redirect('/')

  let qrCode = ''
  let qrCodeBase64 = ''
  let valor = 100
  let emTeste = false
  let diasRestantes: number | null = null
  let dataVencimento: string | null = null

  try {
    const [pixRes, checkRes] = await Promise.all([
      fetch(`${billingHubUrl}/api/subscription/pix?tenant_key=${tenantKey}`, { cache: 'no-store' }),
      fetch(`${billingHubUrl}/api/subscription/check?tenant_key=${tenantKey}`, { cache: 'no-store' }),
    ])
    if (pixRes.ok) {
      const data = await pixRes.json()
      qrCode = data.pix_qr_code ?? ''
      qrCodeBase64 = data.pix_qr_code_base64 ?? ''
      valor = data.valor ?? 100
    }
    if (checkRes.ok) {
      const s = await checkRes.json()
      emTeste = s.em_teste ?? false
      diasRestantes = s.dias_restantes ?? null
      dataVencimento = s.data_proximo_vencimento ?? null
      if (s.valor != null) valor = s.valor
    }
  } catch {
    // billing-hub indisponível — mostra tela sem QR Code
  }

  return (
    <SubscriptionClient
      billingHubUrl={billingHubUrl}
      tenantKey={tenantKey}
      qrCode={qrCode}
      qrCodeBase64={qrCodeBase64}
      valor={valor}
      emTeste={emTeste}
      diasRestantes={diasRestantes}
      dataVencimento={dataVencimento}
    />
  )
}
