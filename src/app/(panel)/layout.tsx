import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { AuthGuard } from '@/components/layout/AuthGuard'
import { TrialBanner } from '@/components/billing/TrialBanner'

interface BillingStatus {
  active?: boolean
  em_teste?: boolean
  dias_restantes?: number | null
  data_proximo_vencimento?: string | null
  valor?: number | null
}

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const billingHubUrl = process.env.BILLING_HUB_URL
  const tenantKey = process.env.BILLING_TENANT_KEY

  // fail open: só bloqueia se o billing-hub responder explicitamente que está inativo.
  // O redirect() PRECISA ficar fora do try/catch — no Next ele funciona lançando
  // a exceção NEXT_REDIRECT, que um catch genérico engoliria silenciosamente.
  let status: BillingStatus | null = null
  if (billingHubUrl && tenantKey) {
    try {
      const res = await fetch(
        `${billingHubUrl}/api/subscription/check?tenant_key=${tenantKey}`,
        { next: { revalidate: 300 } }
      )
      status = await res.json()
    } catch {
      // billing hub indisponível — acesso liberado (fail open)
      status = null
    }
  }
  if (status && status.active === false) redirect('/subscription')

  return (
    <AuthGuard>
      <div className="flex min-h-screen bg-canvas">
        <Sidebar />
        <main className="flex-1 pt-14 lg:pt-0 overflow-x-hidden">
          <div className="max-w-[1440px] mx-auto p-4 lg:p-8">
            {status && (
              <TrialBanner
                emTeste={status.em_teste ?? false}
                diasRestantes={status.dias_restantes ?? null}
                dataVencimento={status.data_proximo_vencimento ?? null}
                valor={status.valor ?? null}
              />
            )}
            {children}
          </div>
        </main>
      </div>
    </AuthGuard>
  )
}
