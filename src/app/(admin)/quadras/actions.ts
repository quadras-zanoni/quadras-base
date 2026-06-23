"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { QuadraInputSchema } from "@/lib/validators/quadra";
import { reaisParaCentavos } from "@/lib/money";

export async function criarQuadra(formData: FormData) {
  const input = QuadraInputSchema.parse({
    nome: formData.get("nome"),
    tipo_esporte: formData.get("tipo_esporte"),
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
