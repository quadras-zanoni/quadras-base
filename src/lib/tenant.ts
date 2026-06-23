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
  const hostname = host.split(":")[0];
  if (hostname.endsWith(".quadrashub.app")) return hostname.split(".")[0];
  return devSlug;
}

const TENANT_CACHE_TTL_MS = 30_000;
const tenantPorSlugCache = new Map<string, { tenant: Tenant | null; expiraEm: number }>();

export async function buscarTenantPorSlug(slug: string): Promise<Tenant | null> {
  const cacheado = tenantPorSlugCache.get(slug);
  if (cacheado && cacheado.expiraEm > Date.now()) return cacheado.tenant;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("tenants")
    .select(
      "id, slug, nome_exibicao, logo_url, cor_primaria, whatsapp_avisos, token_link_publico, status_assinatura"
    )
    .eq("slug", slug)
    .single();
  const tenant = error || !data ? null : data;
  tenantPorSlugCache.set(slug, { tenant, expiraEm: Date.now() + TENANT_CACHE_TTL_MS });
  return tenant;
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
