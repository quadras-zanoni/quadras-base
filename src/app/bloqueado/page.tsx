import { headers } from "next/headers";
import { VerificarAssinaturaPoller } from "./verificar-assinatura-poller";

export default async function BloqueadoPage() {
  const headerList = await headers();
  const slug = headerList.get("x-tenant-slug") ?? "base";

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 p-6">
      <VerificarAssinaturaPoller slug={slug} />
      <div className="max-w-sm space-y-4 rounded-2xl border border-neutral-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-lg font-semibold tracking-tight">Assinatura pendente</h1>
        <p className="text-sm text-neutral-600">
          O acesso está temporariamente bloqueado até a renovação da mensalidade.
          Assim que o pagamento for confirmado, o acesso é liberado automaticamente
          — não é necessário recarregar a página.
        </p>
      </div>
    </main>
  );
}
