"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ClienteInputSchema } from "@/lib/validators/cliente";

export async function criarCliente(formData: FormData) {
  const input = ClienteInputSchema.parse({
    nome: formData.get("nome"),
    telefone: formData.get("telefone"),
    cpf: formData.get("cpf") || undefined,
    endereco: formData.get("endereco") || undefined,
  });

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const tenantId = userData.user?.app_metadata.tenant_id as string;

  const { error } = await supabase.from("clientes").insert({ ...input, tenant_id: tenantId });
  if (error) throw error;

  revalidatePath("/clientes");
}

export async function atualizarCliente(formData: FormData) {
  const id = String(formData.get("id"));
  const input = ClienteInputSchema.parse({
    nome: formData.get("nome"),
    telefone: formData.get("telefone"),
    cpf: formData.get("cpf") || undefined,
    endereco: formData.get("endereco") || undefined,
  });

  const supabase = await createClient();
  const { error } = await supabase.from("clientes").update(input).eq("id", id);
  if (error) throw error;

  revalidatePath("/clientes");
  redirect("/clientes");
}

export async function excluirCliente(formData: FormData) {
  const id = String(formData.get("id"));

  const supabase = await createClient();

  // agendamentos.cliente_id is ON DELETE CASCADE -- block here instead of
  // letting a delete silently wipe out real booking history.
  const { count } = await supabase
    .from("agendamentos")
    .select("id", { count: "exact", head: true })
    .eq("cliente_id", id);

  if (count && count > 0) {
    redirect(
      `/clientes?erro=${encodeURIComponent(
        "Não é possível excluir: esse cliente já tem agendamentos registrados."
      )}`
    );
  }

  const { error } = await supabase.from("clientes").delete().eq("id", id);
  if (error) throw error;

  revalidatePath("/clientes");
}
