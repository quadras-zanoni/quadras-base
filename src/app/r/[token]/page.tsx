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
    .select("id, nome, tipo_esporte")
    .eq("tenant_id", tenant.id)
    .eq("ativa", true)
    .order("nome");

  return (
    <main className="mx-auto max-w-md space-y-6 p-6">
      <h1 className="text-lg font-semibold">{tenant.nome_exibicao}</h1>
      <FormularioReservaPublica token={token} quadras={quadras ?? []} />
    </main>
  );
}
