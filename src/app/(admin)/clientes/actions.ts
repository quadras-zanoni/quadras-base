"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ClienteInputSchema } from "@/lib/validators/cliente";

export async function criarCliente(formData: FormData) {
  const input = ClienteInputSchema.parse({
    nome: formData.get("nome"),
    telefone: formData.get("telefone"),
  });

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const tenantId = userData.user?.app_metadata.tenant_id as string;

  const { error } = await supabase.from("clientes").insert({ ...input, tenant_id: tenantId });
  if (error) throw error;

  revalidatePath("/clientes");
}
