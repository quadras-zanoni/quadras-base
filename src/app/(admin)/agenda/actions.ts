"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function cancelarAgendamento(formData: FormData) {
  const id = String(formData.get("id"));
  const supabase = await createClient();
  const { error } = await supabase.from("agendamentos").update({ status: "cancelado" }).eq("id", id);
  if (error) throw error;
  revalidatePath("/agenda");
}
