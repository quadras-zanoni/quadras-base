import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const formData = await request.formData();
  const email = String(formData.get("email") ?? "");
  const senha = String(formData.get("senha") ?? "");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password: senha });

  const url = new URL(request.url);
  if (error) {
    url.pathname = "/login";
    url.search = `?erro=${encodeURIComponent(error.message)}`;
    return NextResponse.redirect(url, 303);
  }

  url.pathname = "/dashboard";
  url.search = "";
  return NextResponse.redirect(url, 303);
}
