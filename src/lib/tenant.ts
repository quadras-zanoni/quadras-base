import { createAdminClient } from "./supabase/admin";

export interface Tenant {
  id: string;
  slug: string;
  nome_exibicao: string;
  logo_url: string | null;
  cor_primaria: string;
  whatsapp_avisos: string | null;
  token_link_publico: string;
  status_assinatura: "ativo" | "bloqueado";
}

export function resolverTenantSlug(host: string, devSlug = "base"): string {
  const isLocal = host.includes("localhost") || host.includes("127.0.0.1");
  if (isLocal) return devSlug;
  return host.split(".")[0];
}

export async function buscarTenantPorSlug(slug: string): Promise<Tenant | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("tenants")
    .select(
      "id, slug, nome_exibicao, logo_url, cor_primaria, whatsapp_avisos, token_link_publico, status_assinatura"
    )
    .eq("slug", slug)
    .single();
  if (error || !data) return null;
  return data;
}

export async function buscarTenantPorToken(token: string): Promise<Tenant | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("tenants")
    .select(
      "id, slug, nome_exibicao, logo_url, cor_primaria, whatsapp_avisos, token_link_publico, status_assinatura"
    )
    .eq("token_link_publico", token)
    .single();
  if (error || !data) return null;
  return data;
}
