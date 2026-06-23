"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function atualizarWhatsappAvisos(formData: FormData) {
  const whatsapp = String(formData.get("whatsapp_avisos") ?? "").replace(/\D/g, "");
  const nome = String(formData.get("whatsapp_avisos_nome") ?? "").trim();

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const tenantId = userData.user?.app_metadata.tenant_id as string;

  const { error } = await supabase
    .from("tenants")
    .update({ whatsapp_avisos: whatsapp, whatsapp_avisos_nome: nome || null })
    .eq("id", tenantId);
  if (error) throw error;

  revalidatePath("/link-cliente");
}
