"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function login(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const senha = String(formData.get("senha") ?? "");

  const supabase = await createClient();

  let authError: string | null = null;
  try {
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    authError = error?.message ?? null;
  } catch (e) {
    console.error("login signInWithPassword threw:", e);
    authError = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
  }

  if (authError) {
    redirect(`/login?erro=${encodeURIComponent(authError)}`);
  }
  redirect("/dashboard");
}
