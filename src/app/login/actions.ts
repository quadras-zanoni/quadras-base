"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function login(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const senha = String(formData.get("senha") ?? "");

  let authError: string | null = null;
  try {
    console.log("login: step 1, creating client");
    const supabase = await createClient();
    console.log("login: step 2, client created, calling signInWithPassword");
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    console.log("login: step 3, signInWithPassword returned, error=", error?.message ?? "none");
    authError = error?.message ?? null;
  } catch (e) {
    const detail =
      e instanceof Error
        ? `${e.name}: ${e.message} | cause=${String((e as { cause?: unknown }).cause)} | stack=${e.stack?.slice(0, 500)}`
        : String(e);
    console.error("login: caught exception ->", detail);
    authError = detail;
  }

  if (authError) {
    redirect(`/login?erro=${encodeURIComponent(authError)}`);
  }
  redirect("/dashboard");
}
