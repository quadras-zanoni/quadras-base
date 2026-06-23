"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { QuadraInputSchema } from "@/lib/validators/quadra";
import { reaisParaCentavos } from "@/lib/money";

export async function criarQuadra(formData: FormData) {
  const input = QuadraInputSchema.parse({
    nome: formData.get("nome"),
    tipos_esporte: formData.getAll("tipos_esporte"),
    preco_hora_centavos: reaisParaCentavos(formData.get("preco_hora_reais") as string),
  });

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const tenantId = userData.user?.app_metadata.tenant_id as string;

  const { error } = await supabase.from("quadras").insert({ ...input, tenant_id: tenantId });
  if (error) throw error;

  revalidatePath("/quadras");
}

export async function alternarAtivaQuadra(formData: FormData) {
  const id = String(formData.get("id"));
  const ativaAtual = formData.get("ativa") === "true";

  const supabase = await createClient();
  const { error } = await supabase.from("quadras").update({ ativa: !ativaAtual }).eq("id", id);
  if (error) throw error;

  revalidatePath("/quadras");
}

export async function excluirQuadra(formData: FormData) {
  const id = String(formData.get("id"));

  const supabase = await createClient();

  // agendamentos.quadra_id is ON DELETE CASCADE -- block here instead of
  // letting a delete silently wipe out real booking history.
  const { count } = await supabase
    .from("agendamentos")
    .select("id", { count: "exact", head: true })
    .eq("quadra_id", id);

  if (count && count > 0) {
    redirect(
      `/quadras?erro=${encodeURIComponent(
        "Não é possível excluir: essa quadra já tem agendamentos registrados. Desative-a em vez disso."
      )}`
    );
  }

  const { error } = await supabase.from("quadras").delete().eq("id", id);
  if (error) throw error;

  revalidatePath("/quadras");
}
