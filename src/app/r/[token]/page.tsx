import { notFound } from "next/navigation";
import { buscarTenantPorToken } from "@/lib/tenant";
import { createAdminClient } from "@/lib/supabase/admin";
import { FormularioReservaPublica } from "./formulario-reserva-publica";

export default async function PaginaReservaPublica({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const tenant = await buscarTenantPorToken(token);
  if (!tenant) notFound();

  const admin = createAdminClient();
  const { data: quadras } = await admin
    .from("quadras")
    .select("id, nome, tipos_esporte")
    .eq("tenant_id", tenant.id)
    .eq("ativa", true)
    .order("nome");

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 p-6">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
        <h1 className="text-lg font-semibold tracking-tight">{tenant.nome_exibicao}</h1>
        <FormularioReservaPublica token={token} quadras={quadras ?? []} />
      </div>
    </main>
  );
}
