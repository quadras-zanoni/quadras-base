"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ProdutoInputSchema } from "@/lib/validators/produto";

export async function criarProduto(formData: FormData) {
  const input = ProdutoInputSchema.parse({
    nome: formData.get("nome"),
    categoria: formData.get("categoria") || undefined,
    preco_centavos: formData.get("preco_centavos"),
    estoque_minimo: formData.get("estoque_minimo") || undefined,
  });

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const tenantId = userData.user?.app_metadata.tenant_id as string;

  const { error } = await supabase.from("produtos").insert({ ...input, tenant_id: tenantId });
  if (error) throw error;

  revalidatePath("/estoque");
}

export async function alternarAtivoProduto(formData: FormData) {
  const id = String(formData.get("id"));
  const ativoAtual = formData.get("ativo") === "true";

  const supabase = await createClient();
  const { error } = await supabase.from("produtos").update({ ativo: !ativoAtual }).eq("id", id);
  if (error) throw error;

  revalidatePath("/estoque");
}
