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

  try {
    const res = await fetch(
      `${billingHubUrl}/api/subscription/pix?tenant_key=${tenantKey}`,
      { cache: 'no-store' }
    )
    if (res.ok) {
      const data = await res.json()
      qrCode = data.pix_qr_code ?? ''
      qrCodeBase64 = data.pix_qr_code_base64 ?? ''
      valor = data.valor ?? 100
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
    />
  )
}
