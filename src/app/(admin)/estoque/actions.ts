"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { MovimentacaoInputSchema } from "@/lib/validators/movimentacao";
import { reaisParaCentavos } from "@/lib/money";

export async function criarMovimentacao(formData: FormData) {
  const { valor_pago_centavos, ...input } = MovimentacaoInputSchema.parse({
    produto_id: formData.get("produto_id"),
    tipo: formData.get("tipo"),
    quantidade: formData.get("quantidade"),
    motivo: formData.get("motivo") || undefined,
    valor_pago_centavos: reaisParaCentavos(formData.get("valor_pago_reais") as string),
  });

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const tenantId = userData.user?.app_metadata.tenant_id as string;

  if (input.tipo === "entrada" && valor_pago_centavos > 0) {
    const { data: produto, error: produtoError } = await supabase
      .from("produtos")
      .select("custo_centavos, quantidade_estoque")
      .eq("id", input.produto_id)
      .single();
    if (produtoError) throw produtoError;

    const custoUnitarioCompra = Math.round(valor_pago_centavos / input.quantidade);
    const novoCusto = Math.round(
      (produto.quantidade_estoque * produto.custo_centavos + input.quantidade * custoUnitarioCompra) /
        (produto.quantidade_estoque + input.quantidade)
    );

    const { error: custoError } = await supabase
      .from("produtos")
      .update({ custo_centavos: novoCusto })
      .eq("id", input.produto_id);
    if (custoError) throw custoError;
  }

  const { error } = await supabase.from("movimentacoes_estoque").insert({ ...input, tenant_id: tenantId });
  if (error) throw error;

  revalidatePath("/estoque");
  revalidatePath("/produtos");
}
