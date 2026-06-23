import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { resolverTenantSlug, buscarTenantPorSlug } from "@/lib/tenant";
import { avaliarStatusAssinatura } from "@/lib/subscription";

export async function proxy(request: NextRequest) {
  const host = request.headers.get("host") ?? "";
  const tenantSlug = resolverTenantSlug(
    host,
    process.env.NEXT_PUBLIC_DEV_TENANT_SLUG ?? "base"
  );

  const tenant = await buscarTenantPorSlug(tenantSlug);
  const isBloqueadoPage = request.nextUrl.pathname === "/bloqueado";
  if (tenant && !isBloqueadoPage) {
    const status = avaliarStatusAssinatura(tenant.status_assinatura);
    if (!status.ativo) {
      return NextResponse.redirect(new URL("/bloqueado", request.url));
    }
  }

  // Headers must be attached via the `request` option below, not via
  // response.headers.set() after the fact — the latter only reaches the
  // browser, not headers() in downstream Server Components (Task 4/5 fix).
  // Tenant display fields are forwarded here so downstream layouts don't
  // need a second cross-region lookup for data already fetched above.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-tenant-slug", tenantSlug);
  requestHeaders.set("x-tenant-found", tenant ? "1" : "0");
  if (tenant) {
    requestHeaders.set("x-tenant-id", tenant.id);
    requestHeaders.set("x-tenant-nome-exibicao", encodeURIComponent(tenant.nome_exibicao));
  }
  const response = NextResponse.next({ request: { headers: requestHeaders } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|r/|api/public/).*)"],
};
