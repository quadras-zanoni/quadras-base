"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { MovimentacaoInputSchema } from "@/lib/validators/movimentacao";

export async function criarMovimentacao(formData: FormData) {
  const input = MovimentacaoInputSchema.parse({
    produto_id: formData.get("produto_id"),
    tipo: formData.get("tipo"),
    quantidade: formData.get("quantidade"),
    motivo: formData.get("motivo") || undefined,
  });

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const tenantId = userData.user?.app_metadata.tenant_id as string;

  const { error } = await supabase.from("movimentacoes_estoque").insert({ ...input, tenant_id: tenantId });
  if (error) throw error;

  revalidatePath("/estoque/movimentacoes");
  revalidatePath("/estoque");
}
