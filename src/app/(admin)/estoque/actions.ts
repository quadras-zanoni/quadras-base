"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProdutoInputSchema } from "@/lib/validators/produto";
import { reaisParaCentavos } from "@/lib/money";

export async function criarProduto(formData: FormData) {
  const { quantidade_inicial, ...input } = ProdutoInputSchema.parse({
    nome: formData.get("nome"),
    categoria: formData.get("categoria") || undefined,
    preco_centavos: reaisParaCentavos(formData.get("preco_reais") as string),
    custo_centavos: reaisParaCentavos(formData.get("custo_reais") as string),
    estoque_minimo: formData.get("estoque_minimo") || undefined,
    quantidade_inicial: formData.get("quantidade_inicial") || undefined,
  });

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const tenantId = userData.user?.app_metadata.tenant_id as string;

  const { data: produto, error } = await supabase
    .from("produtos")
    .insert({ ...input, tenant_id: tenantId })
    .select("id")
    .single();
  if (error) throw error;

  if (quantidade_inicial > 0) {
    const { error: erroMovimentacao } = await supabase.from("movimentacoes_estoque").insert({
      tenant_id: tenantId,
      produto_id: produto.id,
      tipo: "entrada",
      quantidade: quantidade_inicial,
      motivo: "estoque inicial",
    });
    if (erroMovimentacao) throw erroMovimentacao;
  }

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

export async function excluirProduto(formData: FormData) {
  const id = String(formData.get("id"));

  const supabase = await createClient();
  const { error } = await supabase.from("produtos").delete().eq("id", id);
  if (error) {
    if (error.code === "23503") {
      redirect(
        `/estoque?erro=${encodeURIComponent(
          "Não é possível excluir: esse produto já tem vendas registradas. Desative-o em vez disso."
        )}`
      );
    }
    throw error;
  }

  revalidatePath("/estoque");
}
