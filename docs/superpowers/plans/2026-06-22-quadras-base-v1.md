# Quadras Base v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the v1 of `quadras-base`, a single multi-tenant Next.js + Supabase SaaS for managing sports-arena courts, scheduling, customers, inventory, sales and financial reporting, with a public no-login booking link per tenant.

**Architecture:** One Next.js (App Router, TypeScript) app deployed on Vercel, one Supabase project (Postgres + Auth) shared by all tenants, isolated by `tenant_id` + Row Level Security. Tenant is resolved per-request from the subdomain by `proxy.ts` (Next.js 16 renamed the `middleware.ts` convention to `proxy.ts` — this project uses the current name throughout). Money is stored as integer centavos everywhere. Stock is only ever changed through `movimentacoes_estoque` rows, enforced by a DB trigger that updates `produtos.quantidade_estoque` — application code never writes that column directly.

**Tech Stack:** Next.js (App Router) + TypeScript, Tailwind CSS, Supabase (`@supabase/supabase-js`, `@supabase/ssr`), Zod, Vitest, deployed on Vercel.

## Global Constraints

- Single repo, single Vercel deployment, single Supabase project — no per-client forks (design §2–3).
- Every business table has `tenant_id`; every query/RLS policy filters by it. Never query a business table without a tenant filter.
- Money stored as integer centavos (`*_centavos` columns), never floats.
- No Docker available in this environment — there is no local Supabase stack. All schema work happens via `supabase db push` against the real linked Supabase project created in Task 2. RLS isolation is verified with a script run against that real project, not an automated local test.
- WhatsApp notification to the arena owner is a `wa.me` link opened on the customer's device — no WhatsApp Business API, no Meta integration (design §6).
- v1 theme is monochrome black/white, no "Arena do Parque" branding anywhere — tenant display name/logo/color are data-driven (`tenants.nome_exibicao`, `logo_url`, `cor_primaria`), defaulting to "BASE" with no logo.
- No automatic recurring billing for `recorrente` (horário fixo) bookings in this v1 — it is a flag used only for reporting (design §4, §9).
- Quadras Hub / Mercado Pago integration is mocked behind a fixed contract (design §7) — do not implement real billing here.

---

### Task 1: Project scaffold

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `.gitignore`, `.env.example`
- Create: `src/app/layout.tsx`, `src/app/globals.css`, `src/app/page.tsx`
- Create: `vitest.config.ts`
- Create: `src/lib/money.ts`, `src/lib/money.test.ts`
- Test: `src/lib/money.test.ts`

**Interfaces:**
- Produces: `centavosParaReais(centavos: number): string` — used by every report/UI task that displays money.

- [ ] **Step 1: Scaffold the Next.js app**

Run:
```bash
cd "C:\Users\Fartech Gamer\Desktop\CRM DAS ARENAS"
npx --yes create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --yes
```
Expected: creates `src/app`, `package.json`, `tsconfig.json`, `tailwind`/`postcss` config, `.gitignore` without overwriting `docs/`.

- [ ] **Step 2: Add runtime dependencies**

Run:
```bash
npm install @supabase/supabase-js @supabase/ssr zod date-fns
npm install -D vitest
```

- [ ] **Step 3: Configure Vitest**

Create `vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
```

Add to `package.json` `scripts`:
```json
"test": "vitest run"
```

- [ ] **Step 4: Write the failing test for the money helper**

Create `src/lib/money.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { centavosParaReais } from "./money";

describe("centavosParaReais", () => {
  it("formata centavos inteiros como BRL", () => {
    expect(centavosParaReais(10000)).toBe("R$ 100,00");
  });

  it("formata valores quebrados", () => {
    expect(centavosParaReais(15050)).toBe("R$ 150,50");
  });

  it("formata zero", () => {
    expect(centavosParaReais(0)).toBe("R$ 0,00");
  });
});
```

- [ ] **Step 5: Run test, verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module './money'`

- [ ] **Step 6: Implement the money helper**

Create `src/lib/money.ts`:
```ts
export function centavosParaReais(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}
```

- [ ] **Step 7: Run test, verify it passes**

Run: `npm test`
Expected: PASS (3 tests)

- [ ] **Step 8: Set the monochrome base theme**

Replace contents of `src/app/globals.css` (keep the Tailwind import line your scaffold generated at the top, then append):
```css
:root {
  --background: #ffffff;
  --foreground: #0a0a0a;
  --muted: #6b7280;
  --border: #e5e7eb;
}

body {
  background: var(--background);
  color: var(--foreground);
}
```

Replace `src/app/page.tsx`:
```tsx
export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <p className="text-sm text-neutral-500">BASE</p>
    </main>
  );
}
```

- [ ] **Step 9: Create `.env.example`**

Create `.env.example`:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_DEV_TENANT_SLUG=base
```

- [ ] **Step 10: Verify the build**

Run: `npm run build`
Expected: build succeeds with no type errors.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js app with Tailwind, Vitest and money helper"
```

---

### Task 2: Supabase project + full schema

**Files:**
- Create: `supabase/config.toml` (via `supabase init`)
- Create: `supabase/migrations/0001_init.sql`

**Interfaces:**
- Produces tables: `tenants`, `quadras`, `clientes`, `agendamentos`, `produtos`, `movimentacoes_estoque`, `vendas`, `venda_itens` — every later task's queries assume these exact column names/types.
- Produces trigger: inserting into `movimentacoes_estoque` automatically adjusts `produtos.quantidade_estoque`. No task may update `quantidade_estoque` directly.

- [ ] **Step 1: Create the Supabase project**

Run:
```bash
cd "C:\Users\Fartech Gamer\Desktop\CRM DAS ARENAS"
supabase init
supabase projects create quadras-base --org-id <ORG_ID> --region sa-east-1 --db-password "<GENERATE_A_STRONG_PASSWORD>"
```
(List the org id first with `supabase orgs list` if unknown.) Note the returned project ref.

- [ ] **Step 2: Link the local repo to the project**

Run: `supabase link --project-ref <PROJECT_REF>`
Expected: writes the ref into `supabase/.temp` / `supabase/config.toml` confirms linkage.

- [ ] **Step 3: Write the schema migration**

Create `supabase/migrations/0001_init.sql`:
```sql
-- Tenants (one row per arena client)
create table tenants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  nome_exibicao text not null,
  logo_url text,
  cor_primaria text not null default '#0a0a0a',
  whatsapp_avisos text,
  token_link_publico uuid not null default gen_random_uuid(),
  status_assinatura text not null default 'ativo' check (status_assinatura in ('ativo', 'bloqueado')),
  criado_em timestamptz not null default now()
);
create unique index tenants_token_link_publico_idx on tenants (token_link_publico);

create table quadras (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  nome text not null,
  tipo_esporte text not null,
  preco_hora_centavos integer not null check (preco_hora_centavos >= 0),
  ativa boolean not null default true,
  criado_em timestamptz not null default now()
);
create index quadras_tenant_id_idx on quadras (tenant_id);

create table clientes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  nome text not null,
  telefone text not null,
  criado_em timestamptz not null default now()
);
create index clientes_tenant_id_idx on clientes (tenant_id);
create index clientes_tenant_telefone_idx on clientes (tenant_id, telefone);

create table agendamentos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  quadra_id uuid not null references quadras (id) on delete cascade,
  cliente_id uuid not null references clientes (id) on delete cascade,
  data date not null,
  hora_inicio time not null,
  hora_fim time not null check (hora_fim > hora_inicio),
  status text not null default 'confirmado' check (status in ('confirmado', 'cancelado')),
  origem text not null default 'admin' check (origem in ('admin', 'link_publico')),
  recorrente boolean not null default false,
  criado_em timestamptz not null default now()
);
create index agendamentos_tenant_data_idx on agendamentos (tenant_id, data);
create index agendamentos_quadra_data_idx on agendamentos (quadra_id, data);

create table produtos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  nome text not null,
  categoria text not null default 'geral',
  preco_centavos integer not null check (preco_centavos >= 0),
  quantidade_estoque integer not null default 0,
  estoque_minimo integer not null default 0,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);
create index produtos_tenant_id_idx on produtos (tenant_id);

create table vendas (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  cliente_id uuid references clientes (id) on delete set null,
  forma_pagamento text not null check (forma_pagamento in ('dinheiro', 'pix', 'debito', 'credito')),
  valor_total_centavos integer not null default 0,
  criado_em timestamptz not null default now()
);
create index vendas_tenant_id_idx on vendas (tenant_id);

create table venda_itens (
  id uuid primary key default gen_random_uuid(),
  venda_id uuid not null references vendas (id) on delete cascade,
  produto_id uuid not null references produtos (id) on delete restrict,
  quantidade integer not null check (quantidade > 0),
  preco_unitario_centavos integer not null check (preco_unitario_centavos >= 0)
);
create index venda_itens_venda_id_idx on venda_itens (venda_id);

create table movimentacoes_estoque (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants (id) on delete cascade,
  produto_id uuid not null references produtos (id) on delete cascade,
  venda_id uuid references vendas (id) on delete set null,
  tipo text not null check (tipo in ('entrada', 'saida')),
  quantidade integer not null check (quantidade > 0),
  motivo text not null default 'manual',
  criado_em timestamptz not null default now()
);
create index movimentacoes_estoque_tenant_id_idx on movimentacoes_estoque (tenant_id);
create index movimentacoes_estoque_produto_id_idx on movimentacoes_estoque (produto_id);

-- Stock is only ever changed by inserting a movimentacao row.
create function aplicar_movimentacao_estoque() returns trigger
language plpgsql as $$
begin
  update produtos
  set quantidade_estoque = quantidade_estoque +
    case when new.tipo = 'entrada' then new.quantidade else -new.quantidade end
  where id = new.produto_id;
  return new;
end;
$$;

create trigger trg_aplicar_movimentacao_estoque
  after insert on movimentacoes_estoque
  for each row execute function aplicar_movimentacao_estoque();
```

- [ ] **Step 4: Apply the migration**

Run: `supabase db push`
Expected: "Applying migration 0001_init.sql..." then success, no errors.

- [ ] **Step 5: Verify the trigger manually**

Run (via `supabase db psql` or the SQL editor in the dashboard):
```sql
insert into tenants (slug, nome_exibicao) values ('teste', 'Teste') returning id;
-- copy the returned id as :tenant_id
insert into produtos (tenant_id, nome, preco_centavos) values (':tenant_id', 'Água', 300) returning id, quantidade_estoque;
-- copy the returned id as :produto_id, quantidade_estoque should be 0
insert into movimentacoes_estoque (tenant_id, produto_id, tipo, quantidade) values (':tenant_id', ':produto_id', 'entrada', 10);
select quantidade_estoque from produtos where id = ':produto_id';
-- expected: 10
delete from tenants where slug = 'teste';
```
Expected: `quantidade_estoque` is `10` after the insert, and the cascading delete removes everything cleanly.

- [ ] **Step 6: Commit**

```bash
git add supabase
git commit -m "feat: add full schema migration with tenant isolation and stock trigger"
```

---

### Task 3: Row Level Security policies

**Files:**
- Create: `supabase/migrations/0002_rls.sql`
- Create: `scripts/verificar-rls.ts`

**Interfaces:**
- Produces: SQL function `current_tenant_id()` — every RLS policy and any future security-definer function relies on this.
- Consumes: tables from Task 2.

- [ ] **Step 1: Write the RLS migration**

Create `supabase/migrations/0002_rls.sql`:
```sql
create function current_tenant_id() returns uuid
language sql stable as $$
  select (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid
$$;

alter table tenants enable row level security;
alter table quadras enable row level security;
alter table clientes enable row level security;
alter table agendamentos enable row level security;
alter table produtos enable row level security;
alter table vendas enable row level security;
alter table venda_itens enable row level security;
alter table movimentacoes_estoque enable row level security;

create policy tenants_isolamento on tenants
  for select using (id = current_tenant_id());

create policy quadras_isolamento on quadras
  for all using (tenant_id = current_tenant_id())
  with check (tenant_id = current_tenant_id());

create policy clientes_isolamento on clientes
  for all using (tenant_id = current_tenant_id())
  with check (tenant_id = current_tenant_id());

create policy agendamentos_isolamento on agendamentos
  for all using (tenant_id = current_tenant_id())
  with check (tenant_id = current_tenant_id());

create policy produtos_isolamento on produtos
  for all using (tenant_id = current_tenant_id())
  with check (tenant_id = current_tenant_id());

create policy vendas_isolamento on vendas
  for all using (tenant_id = current_tenant_id())
  with check (tenant_id = current_tenant_id());

create policy venda_itens_isolamento on venda_itens
  for all using (
    venda_id in (select id from vendas where tenant_id = current_tenant_id())
  )
  with check (
    venda_id in (select id from vendas where tenant_id = current_tenant_id())
  );

create policy movimentacoes_isolamento on movimentacoes_estoque
  for all using (tenant_id = current_tenant_id())
  with check (tenant_id = current_tenant_id());
```

- [ ] **Step 2: Apply the migration**

Run: `supabase db push`
Expected: success, no errors.

- [ ] **Step 3: Write a real cross-tenant isolation check**

Create `scripts/verificar-rls.ts`:
```ts
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

async function main() {
  const admin = createClient(url, serviceKey);

  const { data: tenantA } = await admin
    .from("tenants")
    .insert({ slug: "rls-teste-a", nome_exibicao: "RLS Teste A" })
    .select()
    .single();
  const { data: tenantB } = await admin
    .from("tenants")
    .insert({ slug: "rls-teste-b", nome_exibicao: "RLS Teste B" })
    .select()
    .single();

  await admin.from("quadras").insert({
    tenant_id: tenantB.id,
    nome: "Quadra B",
    tipo_esporte: "futsal",
    preco_hora_centavos: 10000,
  });

  const { data: userA, error: userErr } = await admin.auth.admin.createUser({
    email: `rls-teste-a-${Date.now()}@example.com`,
    password: "senha-temporaria-123",
    email_confirm: true,
    app_metadata: { tenant_id: tenantA.id },
  });
  if (userErr) throw userErr;

  const client = createClient(url, anonKey);
  await client.auth.signInWithPassword({
    email: userA.user.email!,
    password: "senha-temporaria-123",
  });

  const { data: quadrasVisiveis } = await client.from("quadras").select("*");

  await admin.from("tenants").delete().in("id", [tenantA.id, tenantB.id]);
  await admin.auth.admin.deleteUser(userA.user.id);

  if (quadrasVisiveis && quadrasVisiveis.length > 0) {
    console.error("FALHA: usuário do tenant A conseguiu ver quadras do tenant B");
    process.exit(1);
  }
  console.log("OK: isolamento de RLS confirmado");
}

main();
```

- [ ] **Step 4: Run the verification against the real project**

Run: `npx tsx scripts/verificar-rls.ts`
Expected: prints `OK: isolamento de RLS confirmado` and exits 0. If it prints `FALHA`, stop and fix the policy in Step 1 before continuing — do not proceed to Task 4 with broken isolation.

- [ ] **Step 5: Commit**

```bash
git add supabase scripts
git commit -m "feat: add RLS policies and cross-tenant isolation check"
```

---

### Task 4: Supabase clients, tenant resolution, middleware

**Files:**
- Create: `src/lib/supabase/server.ts`, `src/lib/supabase/admin.ts`
- Create: `src/lib/tenant.ts`, `src/lib/tenant.test.ts`
- Create: `src/proxy.ts` (Next.js 16 renamed the `middleware.ts` file convention to `proxy.ts` — use the current name; if you're on an older Next.js this is still called `middleware.ts` with an exported `middleware` function instead of `proxy`)
- Modify: `.env.example` (add real values are filled locally, not committed)

**Interfaces:**
- Produces: `createClient()` (server, cookie-aware, RLS-respecting), `createAdminClient()` (service role, bypasses RLS — server-only, never imported by client components).
- Produces: `resolverTenantSlug(host: string): string`, `buscarTenantPorSlug(slug: string): Promise<Tenant | null>`, `Tenant` type — every page/route that needs the current tenant uses these.
- Produces: the proxy sets request/response header `x-tenant-slug` — later tasks read it via `headers().get("x-tenant-slug")`.

- [ ] **Step 1: Write the failing test for tenant slug resolution**

Create `src/lib/tenant.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { resolverTenantSlug } from "./tenant";

describe("resolverTenantSlug", () => {
  it("usa o subdominio em produção", () => {
    expect(resolverTenantSlug("seven-beach.quadrashub.app")).toBe("seven-beach");
  });

  it("cai para o tenant de desenvolvimento em localhost", () => {
    expect(resolverTenantSlug("localhost:3000", "base")).toBe("base");
  });

  it("cai para o tenant de desenvolvimento em 127.0.0.1", () => {
    expect(resolverTenantSlug("127.0.0.1:3000", "base")).toBe("base");
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module './tenant'`

- [ ] **Step 3: Implement `src/lib/tenant.ts`**

```ts
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
```

- [ ] **Step 4: Run test, verify it passes**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Implement the Supabase server client**

Create `src/lib/supabase/server.ts`:
```ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component render — session refresh
            // already happened in the proxy, safe to ignore here.
          }
        },
      },
    }
  );
}
```

- [ ] **Step 6: Implement the Supabase admin (service role) client**

Create `src/lib/supabase/admin.ts`:
```ts
import { createClient } from "@supabase/supabase-js";

// Bypasses RLS. Server-only. Never import this from a Client Component.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
```

- [ ] **Step 7: Implement the proxy**

Create `src/proxy.ts`:
```ts
import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { resolverTenantSlug } from "@/lib/tenant";

export async function proxy(request: NextRequest) {
  const response = NextResponse.next();
  const host = request.headers.get("host") ?? "";
  const tenantSlug = resolverTenantSlug(
    host,
    process.env.NEXT_PUBLIC_DEV_TENANT_SLUG ?? "base"
  );
  response.headers.set("x-tenant-slug", tenantSlug);

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
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
```

- [ ] **Step 8: Verify the build**

Run: `npm run build`
Expected: succeeds with no type errors.

- [ ] **Step 9: Commit**

```bash
git add src
git commit -m "feat: add supabase clients, tenant resolution and middleware"
```

(Implemented as `src/proxy.ts` with an exported `proxy` function per the Next.js 16 file-convention rename — see the note on this task's Files list.)

---

### Task 5: Auth, admin layout guard, tenant onboarding script

**Files:**
- Create: `src/app/login/page.tsx`, `src/app/login/actions.ts`
- Create: `src/app/(admin)/layout.tsx`
- Create: `scripts/criar-tenant.ts`
- Create: `docs/ONBOARDING-NOVO-CLIENTE.md`

**Interfaces:**
- Consumes: `createClient()` and `createAdminClient()` (Task 4), `Tenant` / `buscarTenantPorSlug()` (Task 4).
- Produces: `(admin)` route group that every later admin page (Tasks 6, 7, 9, 10, 11, 12, 13, 14, 15-settings) is created inside, already guarded and already receiving `tenant: Tenant` via a shared layout fetch — pages just call `buscarTenantPorSlug` themselves if they need it, the layout only handles the auth redirect and the sidebar.
- Produces: `npx tsx scripts/criar-tenant.ts --slug=<slug> --nome=<nome> --email=<email> --senha=<senha>` — the only supported way to create a tenant + its admin login.

- [ ] **Step 1: Write the login page**

Create `src/app/login/actions.ts`:
```ts
"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function login(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const senha = String(formData.get("senha") ?? "");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password: senha });

  if (error) {
    redirect(`/login?erro=${encodeURIComponent(error.message)}`);
  }
  redirect("/dashboard");
}
```

Create `src/app/login/page.tsx`:
```tsx
import { login } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center bg-white">
      <form action={login} className="w-full max-w-sm space-y-4 border border-neutral-200 p-8">
        <h1 className="text-lg font-semibold">BASE</h1>
        {erro ? <p className="text-sm text-red-600">{erro}</p> : null}
        <input
          name="email"
          type="email"
          required
          placeholder="E-mail"
          className="w-full border border-neutral-300 px-3 py-2 text-sm"
        />
        <input
          name="senha"
          type="password"
          required
          placeholder="Senha"
          className="w-full border border-neutral-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="w-full bg-black px-3 py-2 text-sm font-medium text-white"
        >
          Entrar
        </button>
      </form>
    </main>
  );
}
```

- [ ] **Step 2: Write the admin layout guard**

Create `src/app/(admin)/layout.tsx`:
```tsx
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { buscarTenantPorSlug } from "@/lib/tenant";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/agenda", label: "Agenda do Dia" },
  { href: "/agendamentos/novo", label: "Novo Agendamento" },
  { href: "/quadras", label: "Quadras" },
  { href: "/clientes", label: "Clientes" },
  { href: "/estoque", label: "Estoque" },
  { href: "/estoque/movimentacoes", label: "Movimentações" },
  { href: "/vendas", label: "Vendas" },
  { href: "/relatorio", label: "Relatório" },
  { href: "/link-cliente", label: "Link do Cliente" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");

  const headerList = await headers();
  const slug = headerList.get("x-tenant-slug") ?? "base";
  const tenant = await buscarTenantPorSlug(slug);
  if (!tenant) redirect("/login");

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 border-r border-neutral-200 p-4">
        <p className="mb-6 text-sm font-semibold">{tenant.nome_exibicao}</p>
        <nav className="space-y-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block px-2 py-1.5 text-sm text-neutral-700 hover:bg-neutral-100"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
```

- [ ] **Step 3: Write the tenant onboarding script**

Create `scripts/criar-tenant.ts`:
```ts
import { createClient } from "@supabase/supabase-js";

function pegarArg(nome: string): string {
  const prefixo = `--${nome}=`;
  const arg = process.argv.find((a) => a.startsWith(prefixo));
  if (!arg) throw new Error(`Argumento obrigatório faltando: --${nome}`);
  return arg.slice(prefixo.length);
}

async function main() {
  const slug = pegarArg("slug");
  const nome = pegarArg("nome");
  const email = pegarArg("email");
  const senha = pegarArg("senha");

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: tenant, error: tenantError } = await admin
    .from("tenants")
    .insert({ slug, nome_exibicao: nome })
    .select()
    .single();
  if (tenantError) throw tenantError;

  const { data: user, error: userError } = await admin.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    app_metadata: { tenant_id: tenant.id },
  });
  if (userError) throw userError;

  console.log(`Tenant "${slug}" criado (id=${tenant.id}).`);
  console.log(`Login admin: ${email} (user_id=${user.user.id})`);
  console.log(`Link público: token=${tenant.token_link_publico}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 4: Create the onboarding doc**

Create `docs/ONBOARDING-NOVO-CLIENTE.md`:
```markdown
# Como adicionar um novo cliente (tenant)

Não existe fork de repositório. Todo cliente novo é uma linha na tabela
`tenants` do mesmo banco, com seu próprio login admin.

1. Rodar:
   ```bash
   npx tsx scripts/criar-tenant.ts --slug=nome-da-arena --nome="Nome da Arena" --email=dono@arena.com --senha="senha-temporaria"
   ```
2. Guardar o `token_link_publico` impresso — é a base do link público de
   agendamento daquele cliente (`/r/<token>`).
3. Apontar o subdomínio `<slug>.quadrashub.app` para o projeto Vercel
   (wildcard DNS já cobre isso automaticamente; confirmar no painel
   Vercel → Domains se for o primeiro cliente).
4. Personalizar marca: `update tenants set logo_url = '...', cor_primaria = '#...' where slug = 'nome-da-arena';`
5. Cadastrar as quadras do cliente (tela Quadras) e o número de WhatsApp
   de avisos (tela Link do Cliente).
6. Pedir para o cliente trocar a senha no primeiro acesso.
```

- [ ] **Step 5: Verify the build**

Run: `npm run build`
Expected: succeeds with no type errors.

- [ ] **Step 6: Commit**

```bash
git add src docs scripts
git commit -m "feat: add login, admin layout guard, and tenant onboarding script"
```

---

### Task 6: Quadras CRUD

**Files:**
- Create: `src/lib/validators/quadra.ts`, `src/lib/validators/quadra.test.ts`
- Create: `src/app/(admin)/quadras/actions.ts`, `src/app/(admin)/quadras/page.tsx`

**Interfaces:**
- Consumes: `createClient()` (Task 4), admin layout from Task 5.
- Produces: `QuadraInputSchema` (zod) — reused by Task 9's `agendamentos` create form to populate the quadra dropdown's expected shape.

- [ ] **Step 1: Write the failing validator test**

Create `src/lib/validators/quadra.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { QuadraInputSchema } from "./quadra";

describe("QuadraInputSchema", () => {
  it("aceita uma quadra válida", () => {
    const resultado = QuadraInputSchema.safeParse({
      nome: "Quadra 1",
      tipo_esporte: "futsal",
      preco_hora_centavos: 10000,
    });
    expect(resultado.success).toBe(true);
  });

  it("rejeita nome vazio", () => {
    const resultado = QuadraInputSchema.safeParse({
      nome: "",
      tipo_esporte: "futsal",
      preco_hora_centavos: 10000,
    });
    expect(resultado.success).toBe(false);
  });

  it("rejeita preço negativo", () => {
    const resultado = QuadraInputSchema.safeParse({
      nome: "Quadra 1",
      tipo_esporte: "futsal",
      preco_hora_centavos: -100,
    });
    expect(resultado.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module './quadra'`

- [ ] **Step 3: Implement the validator**

Create `src/lib/validators/quadra.ts`:
```ts
import { z } from "zod";

export const QuadraInputSchema = z.object({
  nome: z.string().min(1, "Nome obrigatório"),
  tipo_esporte: z.string().min(1, "Tipo de esporte obrigatório"),
  preco_hora_centavos: z.coerce.number().int().nonnegative(),
});

export type QuadraInput = z.infer<typeof QuadraInputSchema>;
```

- [ ] **Step 4: Run test, verify it passes**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Implement server actions**

Create `src/app/(admin)/quadras/actions.ts`:
```ts
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { QuadraInputSchema } from "@/lib/validators/quadra";

export async function criarQuadra(formData: FormData) {
  const input = QuadraInputSchema.parse({
    nome: formData.get("nome"),
    tipo_esporte: formData.get("tipo_esporte"),
    preco_hora_centavos: formData.get("preco_hora_centavos"),
  });

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const tenantId = userData.user?.app_metadata.tenant_id as string;

  const { error } = await supabase.from("quadras").insert({ ...input, tenant_id: tenantId });
  if (error) throw error;

  revalidatePath("/quadras");
}

export async function alternarAtivaQuadra(formData: FormData) {
  const id = String(formData.get("id"));
  const ativaAtual = formData.get("ativa") === "true";

  const supabase = await createClient();
  const { error } = await supabase.from("quadras").update({ ativa: !ativaAtual }).eq("id", id);
  if (error) throw error;

  revalidatePath("/quadras");
}
```

- [ ] **Step 6: Implement the page**

Create `src/app/(admin)/quadras/page.tsx`:
```tsx
import { createClient } from "@/lib/supabase/server";
import { centavosParaReais } from "@/lib/money";
import { criarQuadra, alternarAtivaQuadra } from "./actions";

export default async function QuadrasPage() {
  const supabase = await createClient();
  const { data: quadras } = await supabase
    .from("quadras")
    .select("id, nome, tipo_esporte, preco_hora_centavos, ativa")
    .order("nome");

  return (
    <div className="space-y-8">
      <h1 className="text-lg font-semibold">Quadras</h1>

      <form action={criarQuadra} className="flex flex-wrap items-end gap-2">
        <input name="nome" placeholder="Nome" required className="border border-neutral-300 px-2 py-1 text-sm" />
        <input
          name="tipo_esporte"
          placeholder="Tipo de esporte"
          required
          className="border border-neutral-300 px-2 py-1 text-sm"
        />
        <input
          name="preco_hora_centavos"
          type="number"
          min="0"
          placeholder="Preço/hora (centavos)"
          required
          className="border border-neutral-300 px-2 py-1 text-sm"
        />
        <button type="submit" className="bg-black px-3 py-1.5 text-sm text-white">
          Nova quadra
        </button>
      </form>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-neutral-500">
            <th className="py-2">Nome</th>
            <th>Esporte</th>
            <th>Preço/hora</th>
            <th>Status</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {(quadras ?? []).map((quadra) => (
            <tr key={quadra.id} className="border-b border-neutral-100">
              <td className="py-2">{quadra.nome}</td>
              <td>{quadra.tipo_esporte}</td>
              <td>{centavosParaReais(quadra.preco_hora_centavos)}</td>
              <td>{quadra.ativa ? "Ativa" : "Inativa"}</td>
              <td>
                <form action={alternarAtivaQuadra}>
                  <input type="hidden" name="id" value={quadra.id} />
                  <input type="hidden" name="ativa" value={String(quadra.ativa)} />
                  <button type="submit" className="text-neutral-600 underline">
                    {quadra.ativa ? "Desativar" : "Ativar"}
                  </button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 7: Verify the build**

Run: `npm run build`
Expected: succeeds with no type errors.

- [ ] **Step 8: Commit**

```bash
git add src
git commit -m "feat: add quadras CRUD"
```

---

### Task 7: Clientes (listagem, busca, criação manual)

**Files:**
- Create: `src/lib/validators/cliente.ts`, `src/lib/validators/cliente.test.ts`
- Create: `src/app/(admin)/clientes/actions.ts`, `src/app/(admin)/clientes/page.tsx`

**Interfaces:**
- Consumes: `createClient()` (Task 4).
- Produces: `ClienteInputSchema` (zod) — reused by Task 9 (novo agendamento "novo cliente") and Task 15 (public booking) for the same name/phone validation rules.

- [ ] **Step 1: Write the failing validator test**

Create `src/lib/validators/cliente.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { ClienteInputSchema } from "./cliente";

describe("ClienteInputSchema", () => {
  it("aceita nome e telefone válidos", () => {
    const resultado = ClienteInputSchema.safeParse({ nome: "João", telefone: "51999998888" });
    expect(resultado.success).toBe(true);
  });

  it("rejeita telefone com menos de 8 dígitos", () => {
    const resultado = ClienteInputSchema.safeParse({ nome: "João", telefone: "123" });
    expect(resultado.success).toBe(false);
  });

  it("rejeita nome vazio", () => {
    const resultado = ClienteInputSchema.safeParse({ nome: "", telefone: "51999998888" });
    expect(resultado.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module './cliente'`

- [ ] **Step 3: Implement the validator**

Create `src/lib/validators/cliente.ts`:
```ts
import { z } from "zod";

export const ClienteInputSchema = z.object({
  nome: z.string().min(1, "Nome obrigatório"),
  telefone: z
    .string()
    .transform((valor) => valor.replace(/\D/g, ""))
    .refine((valor) => valor.length >= 8, "Telefone inválido"),
});

export type ClienteInput = z.infer<typeof ClienteInputSchema>;
```

- [ ] **Step 4: Run test, verify it passes**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Implement the server action**

Create `src/app/(admin)/clientes/actions.ts`:
```ts
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
```

- [ ] **Step 6: Implement the page with search**

Create `src/app/(admin)/clientes/page.tsx`:
```tsx
import { createClient } from "@/lib/supabase/server";
import { criarCliente } from "./actions";

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const supabase = await createClient();

  let query = supabase.from("clientes").select("id, nome, telefone, criado_em").order("nome");
  if (q) {
    query = query.or(`nome.ilike.%${q}%,telefone.ilike.%${q}%`);
  }
  const { data: clientes } = await query;

  return (
    <div className="space-y-8">
      <h1 className="text-lg font-semibold">Clientes</h1>

      <form method="get" className="flex gap-2">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Buscar por nome ou telefone"
          className="border border-neutral-300 px-2 py-1 text-sm"
        />
        <button type="submit" className="border border-neutral-300 px-3 py-1.5 text-sm">
          Buscar
        </button>
      </form>

      <form action={criarCliente} className="flex flex-wrap items-end gap-2">
        <input name="nome" placeholder="Nome" required className="border border-neutral-300 px-2 py-1 text-sm" />
        <input
          name="telefone"
          placeholder="Telefone/WhatsApp"
          required
          className="border border-neutral-300 px-2 py-1 text-sm"
        />
        <button type="submit" className="bg-black px-3 py-1.5 text-sm text-white">
          Novo cliente
        </button>
      </form>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-neutral-500">
            <th className="py-2">Nome</th>
            <th>Telefone</th>
          </tr>
        </thead>
        <tbody>
          {(clientes ?? []).map((cliente) => (
            <tr key={cliente.id} className="border-b border-neutral-100">
              <td className="py-2">{cliente.nome}</td>
              <td>{cliente.telefone}</td>
            </tr>
          ))}
          {clientes?.length === 0 ? (
            <tr>
              <td colSpan={2} className="py-4 text-neutral-500">
                Nenhum cliente ainda
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 7: Verify the build**

Run: `npm run build`
Expected: succeeds with no type errors.

- [ ] **Step 8: Commit**

```bash
git add src
git commit -m "feat: add clientes listing, search and manual creation"
```

---

### Task 8: Agenda — lógica de conflito de horário

**Files:**
- Create: `src/lib/agenda.ts`, `src/lib/agenda.test.ts`

**Interfaces:**
- Produces: `horaParaMinutos(hora: string): number`, `intervalosConflitam(a: IntervaloHorario, b: IntervaloHorario): boolean`, `temConflito(existentes: IntervaloHorario[], novo: IntervaloHorario): boolean`, `IntervaloHorario` type — Task 9's create-agendamento logic and Task 15's public booking logic both call `temConflito` before inserting.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/agenda.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { horaParaMinutos, intervalosConflitam, temConflito } from "./agenda";

describe("horaParaMinutos", () => {
  it("converte HH:mm em minutos desde a meia-noite", () => {
    expect(horaParaMinutos("00:00")).toBe(0);
    expect(horaParaMinutos("01:30")).toBe(90);
    expect(horaParaMinutos("23:59")).toBe(1439);
  });
});

describe("intervalosConflitam", () => {
  it("detecta sobreposição parcial", () => {
    expect(
      intervalosConflitam(
        { hora_inicio: "10:00", hora_fim: "11:00" },
        { hora_inicio: "10:30", hora_fim: "11:30" }
      )
    ).toBe(true);
  });

  it("detecta um intervalo totalmente contido no outro", () => {
    expect(
      intervalosConflitam(
        { hora_inicio: "10:00", hora_fim: "12:00" },
        { hora_inicio: "10:30", hora_fim: "11:00" }
      )
    ).toBe(true);
  });

  it("não considera conflito quando os horários são adjacentes", () => {
    expect(
      intervalosConflitam(
        { hora_inicio: "10:00", hora_fim: "11:00" },
        { hora_inicio: "11:00", hora_fim: "12:00" }
      )
    ).toBe(false);
  });

  it("não considera conflito quando não há sobreposição", () => {
    expect(
      intervalosConflitam(
        { hora_inicio: "08:00", hora_fim: "09:00" },
        { hora_inicio: "10:00", hora_fim: "11:00" }
      )
    ).toBe(false);
  });
});

describe("temConflito", () => {
  it("retorna false para lista vazia de existentes", () => {
    expect(temConflito([], { hora_inicio: "10:00", hora_fim: "11:00" })).toBe(false);
  });

  it("retorna true quando algum existente conflita", () => {
    const existentes = [
      { hora_inicio: "08:00", hora_fim: "09:00" },
      { hora_inicio: "10:00", hora_fim: "11:00" },
    ];
    expect(temConflito(existentes, { hora_inicio: "10:30", hora_fim: "11:30" })).toBe(true);
  });

  it("retorna false quando nenhum existente conflita", () => {
    const existentes = [{ hora_inicio: "08:00", hora_fim: "09:00" }];
    expect(temConflito(existentes, { hora_inicio: "10:00", hora_fim: "11:00" })).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `npm test`
Expected: FAIL — `Cannot find module './agenda'`

- [ ] **Step 3: Implement `src/lib/agenda.ts`**

```ts
export interface IntervaloHorario {
  hora_inicio: string; // "HH:mm"
  hora_fim: string;
}

export function horaParaMinutos(hora: string): number {
  const [horas, minutos] = hora.split(":").map(Number);
  return horas * 60 + minutos;
}

export function intervalosConflitam(a: IntervaloHorario, b: IntervaloHorario): boolean {
  const aIni = horaParaMinutos(a.hora_inicio);
  const aFim = horaParaMinutos(a.hora_fim);
  const bIni = horaParaMinutos(b.hora_inicio);
  const bFim = horaParaMinutos(b.hora_fim);
  return aIni < bFim && bIni < aFim;
}

export function temConflito(existentes: IntervaloHorario[], novo: IntervaloHorario): boolean {
  return existentes.some((existente) => intervalosConflitam(existente, novo));
}
```

- [ ] **Step 4: Run tests, verify they pass**

Run: `npm test`
Expected: PASS (9 tests)

- [ ] **Step 5: Commit**

```bash
git add src
git commit -m "feat: add pure agenda conflict-check logic with full test coverage"
```

---

### Task 9: Agendamentos — API + Agenda do Dia + Novo Agendamento

**Files:**
- Create: `src/lib/validators/agendamento.ts`, `src/lib/validators/agendamento.test.ts`
- Create: `src/app/(admin)/agendamentos/novo/actions.ts`, `src/app/(admin)/agendamentos/novo/page.tsx`
- Create: `src/app/(admin)/agenda/actions.ts`, `src/app/(admin)/agenda/page.tsx`

**Interfaces:**
- Consumes: `temConflito`, `IntervaloHorario` (Task 8), `ClienteInputSchema` shape (Task 7), `createClient()` (Task 4).
- Produces: nothing consumed by later tasks directly, but Task 14 (Dashboard) queries the same `agendamentos` table with the same column names defined here (matches Task 2 schema exactly — no new columns introduced).

- [ ] **Step 1: Write the failing validator test**

Create `src/lib/validators/agendamento.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { AgendamentoInputSchema } from "./agendamento";

describe("AgendamentoInputSchema", () => {
  it("aceita um agendamento com cliente existente", () => {
    const resultado = AgendamentoInputSchema.safeParse({
      quadra_id: "11111111-1111-1111-1111-111111111111",
      data: "2026-06-23",
      hora_inicio: "10:00",
      hora_fim: "11:00",
      recorrente: false,
      cliente_id: "22222222-2222-2222-2222-222222222222",
    });
    expect(resultado.success).toBe(true);
  });

  it("aceita um agendamento com cliente novo", () => {
    const resultado = AgendamentoInputSchema.safeParse({
      quadra_id: "11111111-1111-1111-1111-111111111111",
      data: "2026-06-23",
      hora_inicio: "10:00",
      hora_fim: "11:00",
      recorrente: false,
      cliente_novo_nome: "João",
      cliente_novo_telefone: "51999998888",
    });
    expect(resultado.success).toBe(true);
  });

  it("rejeita quando não há cliente existente nem novo", () => {
    const resultado = AgendamentoInputSchema.safeParse({
      quadra_id: "11111111-1111-1111-1111-111111111111",
      data: "2026-06-23",
      hora_inicio: "10:00",
      hora_fim: "11:00",
      recorrente: false,
    });
    expect(resultado.success).toBe(false);
  });

  it("rejeita hora_fim antes de hora_inicio", () => {
    const resultado = AgendamentoInputSchema.safeParse({
      quadra_id: "11111111-1111-1111-1111-111111111111",
      data: "2026-06-23",
      hora_inicio: "11:00",
      hora_fim: "10:00",
      recorrente: false,
      cliente_id: "22222222-2222-2222-2222-222222222222",
    });
    expect(resultado.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module './agendamento'`

- [ ] **Step 3: Implement the validator**

Create `src/lib/validators/agendamento.ts`:
```ts
import { z } from "zod";
import { horaParaMinutos } from "@/lib/agenda";

export const AgendamentoInputSchema = z
  .object({
    quadra_id: z.string().uuid(),
    data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    hora_inicio: z.string().regex(/^\d{2}:\d{2}$/),
    hora_fim: z.string().regex(/^\d{2}:\d{2}$/),
    recorrente: z.coerce.boolean().default(false),
    cliente_id: z.string().uuid().optional(),
    cliente_novo_nome: z.string().min(1).optional(),
    cliente_novo_telefone: z.string().min(8).optional(),
  })
  .refine((dados) => Boolean(dados.cliente_id) || Boolean(dados.cliente_novo_nome), {
    message: "Informe um cliente existente ou os dados de um cliente novo",
  })
  .refine((dados) => horaParaMinutos(dados.hora_fim) > horaParaMinutos(dados.hora_inicio), {
    message: "O horário final deve ser depois do inicial",
  });

export type AgendamentoInput = z.infer<typeof AgendamentoInputSchema>;
```

- [ ] **Step 4: Run test, verify it passes**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Implement the create-agendamento server action**

Create `src/app/(admin)/agendamentos/novo/actions.ts`:
```ts
"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { temConflito } from "@/lib/agenda";
import { AgendamentoInputSchema } from "@/lib/validators/agendamento";

export async function criarAgendamento(formData: FormData) {
  const input = AgendamentoInputSchema.parse({
    quadra_id: formData.get("quadra_id"),
    data: formData.get("data"),
    hora_inicio: formData.get("hora_inicio"),
    hora_fim: formData.get("hora_fim"),
    recorrente: formData.get("recorrente") === "on",
    cliente_id: formData.get("cliente_id") || undefined,
    cliente_novo_nome: formData.get("cliente_novo_nome") || undefined,
    cliente_novo_telefone: formData.get("cliente_novo_telefone") || undefined,
  });

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const tenantId = userData.user?.app_metadata.tenant_id as string;

  const { data: existentes } = await supabase
    .from("agendamentos")
    .select("hora_inicio, hora_fim")
    .eq("quadra_id", input.quadra_id)
    .eq("data", input.data)
    .eq("status", "confirmado");

  if (temConflito(existentes ?? [], { hora_inicio: input.hora_inicio, hora_fim: input.hora_fim })) {
    redirect(`/agendamentos/novo?erro=${encodeURIComponent("Já existe um agendamento nesse horário")}`);
  }

  let clienteId = input.cliente_id;
  if (!clienteId) {
    const { data: clienteExistente } = await supabase
      .from("clientes")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("telefone", input.cliente_novo_telefone)
      .maybeSingle();

    if (clienteExistente) {
      clienteId = clienteExistente.id;
    } else {
      const { data: novoCliente, error: clienteError } = await supabase
        .from("clientes")
        .insert({
          tenant_id: tenantId,
          nome: input.cliente_novo_nome,
          telefone: input.cliente_novo_telefone,
        })
        .select("id")
        .single();
      if (clienteError) throw clienteError;
      clienteId = novoCliente.id;
    }
  }

  const { error } = await supabase.from("agendamentos").insert({
    tenant_id: tenantId,
    quadra_id: input.quadra_id,
    cliente_id: clienteId,
    data: input.data,
    hora_inicio: input.hora_inicio,
    hora_fim: input.hora_fim,
    recorrente: input.recorrente,
    origem: "admin",
    status: "confirmado",
  });
  if (error) throw error;

  redirect(`/agenda?data=${input.data}`);
}
```

- [ ] **Step 6: Implement the Novo Agendamento page**

Create `src/app/(admin)/agendamentos/novo/page.tsx`:
```tsx
import { createClient } from "@/lib/supabase/server";
import { criarAgendamento } from "./actions";

export default async function NovoAgendamentoPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;
  const supabase = await createClient();
  const { data: quadras } = await supabase
    .from("quadras")
    .select("id, nome")
    .eq("ativa", true)
    .order("nome");
  const { data: clientes } = await supabase
    .from("clientes")
    .select("id, nome, telefone")
    .order("nome");

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-lg font-semibold">Novo Agendamento</h1>
      {erro ? <p className="text-sm text-red-600">{erro}</p> : null}

      <form action={criarAgendamento} className="space-y-4">
        <select name="quadra_id" required className="w-full border border-neutral-300 px-2 py-1.5 text-sm">
          <option value="">Selecione a quadra</option>
          {(quadras ?? []).map((quadra) => (
            <option key={quadra.id} value={quadra.id}>
              {quadra.nome}
            </option>
          ))}
        </select>

        <div className="flex gap-2">
          <input name="data" type="date" required className="border border-neutral-300 px-2 py-1.5 text-sm" />
          <input name="hora_inicio" type="time" required className="border border-neutral-300 px-2 py-1.5 text-sm" />
          <input name="hora_fim" type="time" required className="border border-neutral-300 px-2 py-1.5 text-sm" />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="recorrente" /> Horário fixo (recorrente)
        </label>

        <select name="cliente_id" className="w-full border border-neutral-300 px-2 py-1.5 text-sm">
          <option value="">— Cliente novo —</option>
          {(clientes ?? []).map((cliente) => (
            <option key={cliente.id} value={cliente.id}>
              {cliente.nome} ({cliente.telefone})
            </option>
          ))}
        </select>

        <div className="flex gap-2">
          <input
            name="cliente_novo_nome"
            placeholder="Nome do cliente novo"
            className="border border-neutral-300 px-2 py-1.5 text-sm"
          />
          <input
            name="cliente_novo_telefone"
            placeholder="Telefone do cliente novo"
            className="border border-neutral-300 px-2 py-1.5 text-sm"
          />
        </div>

        <button type="submit" className="bg-black px-4 py-2 text-sm text-white">
          Criar agendamento
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 7: Implement the cancel action and Agenda do Dia page**

Create `src/app/(admin)/agenda/actions.ts`:
```ts
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
```

Create `src/app/(admin)/agenda/page.tsx`:
```tsx
import { createClient } from "@/lib/supabase/server";
import { cancelarAgendamento } from "./actions";

export default async function AgendaDoDiaPage({
  searchParams,
}: {
  searchParams: Promise<{ data?: string; quadra?: string; status?: string }>;
}) {
  const params = await searchParams;
  const data = params.data ?? new Date().toISOString().slice(0, 10);

  const supabase = await createClient();
  let query = supabase
    .from("agendamentos")
    .select("id, hora_inicio, hora_fim, status, recorrente, quadras(nome), clientes(nome, telefone)")
    .eq("data", data)
    .order("hora_inicio");

  if (params.quadra) query = query.eq("quadra_id", params.quadra);
  if (params.status) query = query.eq("status", params.status);

  const { data: agendamentos } = await query;
  const { data: quadras } = await supabase.from("quadras").select("id, nome").order("nome");

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">Agenda do Dia</h1>

      <form method="get" className="flex flex-wrap gap-2">
        <input name="data" type="date" defaultValue={data} className="border border-neutral-300 px-2 py-1 text-sm" />
        <select name="quadra" defaultValue={params.quadra ?? ""} className="border border-neutral-300 px-2 py-1 text-sm">
          <option value="">Todas as quadras</option>
          {(quadras ?? []).map((quadra) => (
            <option key={quadra.id} value={quadra.id}>
              {quadra.nome}
            </option>
          ))}
        </select>
        <select name="status" defaultValue={params.status ?? ""} className="border border-neutral-300 px-2 py-1 text-sm">
          <option value="">Todos os status</option>
          <option value="confirmado">Confirmado</option>
          <option value="cancelado">Cancelado</option>
        </select>
        <button type="submit" className="border border-neutral-300 px-3 py-1 text-sm">
          Filtrar
        </button>
      </form>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-neutral-500">
            <th className="py-2">Horário</th>
            <th>Quadra</th>
            <th>Cliente</th>
            <th>Status</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {(agendamentos ?? []).map((agendamento) => (
            <tr key={agendamento.id} className="border-b border-neutral-100">
              <td className="py-2">
                {agendamento.hora_inicio}–{agendamento.hora_fim}
                {agendamento.recorrente ? " 🔁" : ""}
              </td>
              <td>{(agendamento.quadras as unknown as { nome: string })?.nome}</td>
              <td>{(agendamento.clientes as unknown as { nome: string })?.nome}</td>
              <td>{agendamento.status}</td>
              <td>
                {agendamento.status === "confirmado" ? (
                  <form action={cancelarAgendamento}>
                    <input type="hidden" name="id" value={agendamento.id} />
                    <button type="submit" className="text-neutral-600 underline">
                      Cancelar
                    </button>
                  </form>
                ) : null}
              </td>
            </tr>
          ))}
          {agendamentos?.length === 0 ? (
            <tr>
              <td colSpan={5} className="py-4 text-neutral-500">
                Nenhum agendamento para este dia
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 8: Verify the build**

Run: `npm run build`
Expected: succeeds with no type errors.

- [ ] **Step 9: Commit**

```bash
git add src
git commit -m "feat: add agendamentos creation with conflict check, agenda do dia view"
```

---

### Task 10: Produtos (Estoque) CRUD

**Files:**
- Create: `src/lib/validators/produto.ts`, `src/lib/validators/produto.test.ts`
- Create: `src/app/(admin)/estoque/actions.ts`, `src/app/(admin)/estoque/page.tsx`

**Interfaces:**
- Consumes: `createClient()` (Task 4).
- Produces: `ProdutoInputSchema` (zod) — Task 11 and Task 12 both read `produtos` rows shaped by this schema (`nome`, `categoria`, `preco_centavos`, `estoque_minimo`, `ativo`).

- [ ] **Step 1: Write the failing validator test**

Create `src/lib/validators/produto.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { ProdutoInputSchema } from "./produto";

describe("ProdutoInputSchema", () => {
  it("aceita um produto válido", () => {
    const resultado = ProdutoInputSchema.safeParse({
      nome: "Água",
      categoria: "bebidas",
      preco_centavos: 300,
      estoque_minimo: 5,
    });
    expect(resultado.success).toBe(true);
  });

  it("usa categoria padrão quando ausente", () => {
    const resultado = ProdutoInputSchema.parse({
      nome: "Água",
      preco_centavos: 300,
      estoque_minimo: 5,
    });
    expect(resultado.categoria).toBe("geral");
  });

  it("rejeita preço negativo", () => {
    const resultado = ProdutoInputSchema.safeParse({
      nome: "Água",
      preco_centavos: -1,
      estoque_minimo: 5,
    });
    expect(resultado.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module './produto'`

- [ ] **Step 3: Implement the validator**

Create `src/lib/validators/produto.ts`:
```ts
import { z } from "zod";

export const ProdutoInputSchema = z.object({
  nome: z.string().min(1, "Nome obrigatório"),
  categoria: z.string().min(1).default("geral"),
  preco_centavos: z.coerce.number().int().nonnegative(),
  estoque_minimo: z.coerce.number().int().nonnegative().default(0),
});

export type ProdutoInput = z.infer<typeof ProdutoInputSchema>;
```

- [ ] **Step 4: Run test, verify it passes**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Implement server actions**

Create `src/app/(admin)/estoque/actions.ts`:
```ts
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ProdutoInputSchema } from "@/lib/validators/produto";

export async function criarProduto(formData: FormData) {
  const input = ProdutoInputSchema.parse({
    nome: formData.get("nome"),
    categoria: formData.get("categoria") || undefined,
    preco_centavos: formData.get("preco_centavos"),
    estoque_minimo: formData.get("estoque_minimo") || undefined,
  });

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const tenantId = userData.user?.app_metadata.tenant_id as string;

  const { error } = await supabase.from("produtos").insert({ ...input, tenant_id: tenantId });
  if (error) throw error;

  revalidatePath("/estoque");
}

export async function alternarAtivoProduto(formData: FormData) {
  const id = String(formData.get("id"));
  const ativoAtual = formData.get("ativo") === "true";

  const supabase = await createClient();
  const { error } = await supabase.from("produtos").update({ ativo: !ativoAtual }).eq("id", id);
  if (error) throw error;

  revalidatePath("/estoque");
}
```

- [ ] **Step 6: Implement the page with a low-stock badge**

Create `src/app/(admin)/estoque/page.tsx`:
```tsx
import { createClient } from "@/lib/supabase/server";
import { centavosParaReais } from "@/lib/money";
import { criarProduto, alternarAtivoProduto } from "./actions";

export default async function EstoquePage() {
  const supabase = await createClient();
  const { data: produtos } = await supabase
    .from("produtos")
    .select("id, nome, categoria, preco_centavos, quantidade_estoque, estoque_minimo, ativo")
    .order("nome");

  return (
    <div className="space-y-8">
      <h1 className="text-lg font-semibold">Estoque</h1>

      <form action={criarProduto} className="flex flex-wrap items-end gap-2">
        <input name="nome" placeholder="Nome" required className="border border-neutral-300 px-2 py-1 text-sm" />
        <input name="categoria" placeholder="Categoria" className="border border-neutral-300 px-2 py-1 text-sm" />
        <input
          name="preco_centavos"
          type="number"
          min="0"
          placeholder="Preço (centavos)"
          required
          className="border border-neutral-300 px-2 py-1 text-sm"
        />
        <input
          name="estoque_minimo"
          type="number"
          min="0"
          placeholder="Estoque mínimo"
          className="border border-neutral-300 px-2 py-1 text-sm"
        />
        <button type="submit" className="bg-black px-3 py-1.5 text-sm text-white">
          Novo produto
        </button>
      </form>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-neutral-500">
            <th className="py-2">Nome</th>
            <th>Categoria</th>
            <th>Preço</th>
            <th>Estoque</th>
            <th>Status</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {(produtos ?? []).map((produto) => (
            <tr key={produto.id} className="border-b border-neutral-100">
              <td className="py-2">{produto.nome}</td>
              <td>{produto.categoria}</td>
              <td>{centavosParaReais(produto.preco_centavos)}</td>
              <td>
                {produto.quantidade_estoque}
                {produto.quantidade_estoque <= produto.estoque_minimo ? (
                  <span className="ml-2 text-red-600">estoque baixo</span>
                ) : null}
              </td>
              <td>{produto.ativo ? "Ativo" : "Inativo"}</td>
              <td>
                <form action={alternarAtivoProduto}>
                  <input type="hidden" name="id" value={produto.id} />
                  <input type="hidden" name="ativo" value={String(produto.ativo)} />
                  <button type="submit" className="text-neutral-600 underline">
                    {produto.ativo ? "Desativar" : "Ativar"}
                  </button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 7: Verify the build**

Run: `npm run build`
Expected: succeeds with no type errors.

- [ ] **Step 8: Commit**

```bash
git add src
git commit -m "feat: add produtos CRUD with low-stock indicator"
```

---

### Task 11: Movimentações de Estoque

**Files:**
- Create: `src/lib/validators/movimentacao.ts`, `src/lib/validators/movimentacao.test.ts`
- Create: `src/app/(admin)/estoque/movimentacoes/actions.ts`, `src/app/(admin)/estoque/movimentacoes/page.tsx`

**Interfaces:**
- Consumes: `createClient()` (Task 4), `produtos` table (Task 10). Relies on the `trg_aplicar_movimentacao_estoque` trigger from Task 2 — this task never writes `quantidade_estoque` directly.
- Produces: nothing consumed by later tasks (Task 12 inserts into `movimentacoes_estoque` directly via the RPC function, not through this task's action).

- [ ] **Step 1: Write the failing validator test**

Create `src/lib/validators/movimentacao.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { MovimentacaoInputSchema } from "./movimentacao";

describe("MovimentacaoInputSchema", () => {
  it("aceita uma entrada válida", () => {
    const resultado = MovimentacaoInputSchema.safeParse({
      produto_id: "11111111-1111-1111-1111-111111111111",
      tipo: "entrada",
      quantidade: 10,
      motivo: "reposição",
    });
    expect(resultado.success).toBe(true);
  });

  it("rejeita quantidade zero ou negativa", () => {
    const resultado = MovimentacaoInputSchema.safeParse({
      produto_id: "11111111-1111-1111-1111-111111111111",
      tipo: "saida",
      quantidade: 0,
      motivo: "perda",
    });
    expect(resultado.success).toBe(false);
  });

  it("rejeita tipo inválido", () => {
    const resultado = MovimentacaoInputSchema.safeParse({
      produto_id: "11111111-1111-1111-1111-111111111111",
      tipo: "ajuste",
      quantidade: 1,
      motivo: "x",
    });
    expect(resultado.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module './movimentacao'`

- [ ] **Step 3: Implement the validator**

Create `src/lib/validators/movimentacao.ts`:
```ts
import { z } from "zod";

export const MovimentacaoInputSchema = z.object({
  produto_id: z.string().uuid(),
  tipo: z.enum(["entrada", "saida"]),
  quantidade: z.coerce.number().int().positive(),
  motivo: z.string().min(1).default("manual"),
});

export type MovimentacaoInput = z.infer<typeof MovimentacaoInputSchema>;
```

- [ ] **Step 4: Run test, verify it passes**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Implement the server action**

Create `src/app/(admin)/estoque/movimentacoes/actions.ts`:
```ts
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { MovimentacaoInputSchema } from "@/lib/validators/movimentacao";

export async function criarMovimentacao(formData: FormData) {
  const input = MovimentacaoInputSchema.parse({
    produto_id: formData.get("produto_id"),
    tipo: formData.get("tipo"),
    quantidade: formData.get("quantidade"),
    motivo: formData.get("motivo") || undefined,
  });

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const tenantId = userData.user?.app_metadata.tenant_id as string;

  const { error } = await supabase.from("movimentacoes_estoque").insert({ ...input, tenant_id: tenantId });
  if (error) throw error;

  revalidatePath("/estoque/movimentacoes");
  revalidatePath("/estoque");
}
```

- [ ] **Step 6: Implement the page**

Create `src/app/(admin)/estoque/movimentacoes/page.tsx`:
```tsx
import { createClient } from "@/lib/supabase/server";
import { criarMovimentacao } from "./actions";

export default async function MovimentacoesPage() {
  const supabase = await createClient();
  const { data: produtos } = await supabase.from("produtos").select("id, nome").order("nome");
  const { data: movimentacoes } = await supabase
    .from("movimentacoes_estoque")
    .select("id, tipo, quantidade, motivo, criado_em, produtos(nome)")
    .order("criado_em", { ascending: false })
    .limit(50);

  return (
    <div className="space-y-8">
      <h1 className="text-lg font-semibold">Movimentações de Estoque</h1>

      <form action={criarMovimentacao} className="flex flex-wrap items-end gap-2">
        <select name="produto_id" required className="border border-neutral-300 px-2 py-1 text-sm">
          <option value="">Produto</option>
          {(produtos ?? []).map((produto) => (
            <option key={produto.id} value={produto.id}>
              {produto.nome}
            </option>
          ))}
        </select>
        <select name="tipo" required className="border border-neutral-300 px-2 py-1 text-sm">
          <option value="entrada">Entrada</option>
          <option value="saida">Saída</option>
        </select>
        <input
          name="quantidade"
          type="number"
          min="1"
          placeholder="Quantidade"
          required
          className="border border-neutral-300 px-2 py-1 text-sm"
        />
        <input name="motivo" placeholder="Motivo" className="border border-neutral-300 px-2 py-1 text-sm" />
        <button type="submit" className="bg-black px-3 py-1.5 text-sm text-white">
          Registrar
        </button>
      </form>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-neutral-500">
            <th className="py-2">Data</th>
            <th>Produto</th>
            <th>Tipo</th>
            <th>Quantidade</th>
            <th>Motivo</th>
          </tr>
        </thead>
        <tbody>
          {(movimentacoes ?? []).map((movimentacao) => (
            <tr key={movimentacao.id} className="border-b border-neutral-100">
              <td className="py-2">{new Date(movimentacao.criado_em).toLocaleString("pt-BR")}</td>
              <td>{(movimentacao.produtos as unknown as { nome: string })?.nome}</td>
              <td>{movimentacao.tipo}</td>
              <td>{movimentacao.quantidade}</td>
              <td>{movimentacao.motivo}</td>
            </tr>
          ))}
          {movimentacoes?.length === 0 ? (
            <tr>
              <td colSpan={5} className="py-4 text-neutral-500">
                Nenhuma movimentação registrada
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 7: Verify the build**

Run: `npm run build`
Expected: succeeds with no type errors.

- [ ] **Step 8: Commit**

```bash
git add src
git commit -m "feat: add manual stock movement entry and history"
```

---

### Task 12: Vendas (venda atômica via RPC) + UI

**Files:**
- Create: `supabase/migrations/0003_criar_venda.sql`
- Create: `src/lib/validators/venda.ts`, `src/lib/validators/venda.test.ts`
- Create: `src/app/api/vendas/route.ts`
- Create: `src/app/(admin)/vendas/nova-venda-form.tsx`, `src/app/(admin)/vendas/page.tsx`

**Interfaces:**
- Consumes: `produtos`, `vendas`, `venda_itens`, `movimentacoes_estoque` (Task 2), `createClient()` (Task 4). Relies on the stock trigger (Task 2) being applied — inserting the `movimentacoes_estoque` row inside the RPC is what decrements stock, this task never updates `quantidade_estoque` directly.
- Produces: Postgres RPC `criar_venda(p_tenant_id uuid, p_cliente_id uuid, p_forma_pagamento text, p_itens jsonb) returns vendas` — Task 13's revenue-by-payment-method report reads the `vendas`/`venda_itens` rows this RPC creates.

- [ ] **Step 1: Write the RPC migration**

Create `supabase/migrations/0003_criar_venda.sql`:
```sql
create or replace function criar_venda(
  p_tenant_id uuid,
  p_cliente_id uuid,
  p_forma_pagamento text,
  p_itens jsonb
) returns vendas
language plpgsql as $$
declare
  v_venda vendas;
  v_item jsonb;
  v_total integer := 0;
begin
  insert into vendas (tenant_id, cliente_id, forma_pagamento, valor_total_centavos)
  values (p_tenant_id, p_cliente_id, p_forma_pagamento, 0)
  returning * into v_venda;

  for v_item in select * from jsonb_array_elements(p_itens) loop
    insert into venda_itens (venda_id, produto_id, quantidade, preco_unitario_centavos)
    values (
      v_venda.id,
      (v_item->>'produto_id')::uuid,
      (v_item->>'quantidade')::integer,
      (v_item->>'preco_unitario_centavos')::integer
    );

    insert into movimentacoes_estoque (tenant_id, produto_id, venda_id, tipo, quantidade, motivo)
    values (
      p_tenant_id,
      (v_item->>'produto_id')::uuid,
      v_venda.id,
      'saida',
      (v_item->>'quantidade')::integer,
      'venda'
    );

    v_total := v_total + (v_item->>'quantidade')::integer * (v_item->>'preco_unitario_centavos')::integer;
  end loop;

  update vendas set valor_total_centavos = v_total where id = v_venda.id returning * into v_venda;
  return v_venda;
end;
$$;
```

- [ ] **Step 2: Apply the migration**

Run: `supabase db push`
Expected: success, no errors.

- [ ] **Step 3: Write the failing validator test**

Create `src/lib/validators/venda.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { VendaInputSchema } from "./venda";

describe("VendaInputSchema", () => {
  it("aceita uma venda com um item", () => {
    const resultado = VendaInputSchema.safeParse({
      forma_pagamento: "pix",
      itens: [{ produto_id: "11111111-1111-1111-1111-111111111111", quantidade: 2, preco_unitario_centavos: 300 }],
    });
    expect(resultado.success).toBe(true);
  });

  it("rejeita venda sem itens", () => {
    const resultado = VendaInputSchema.safeParse({ forma_pagamento: "pix", itens: [] });
    expect(resultado.success).toBe(false);
  });

  it("rejeita forma de pagamento inválida", () => {
    const resultado = VendaInputSchema.safeParse({
      forma_pagamento: "boleto",
      itens: [{ produto_id: "11111111-1111-1111-1111-111111111111", quantidade: 1, preco_unitario_centavos: 100 }],
    });
    expect(resultado.success).toBe(false);
  });
});
```

- [ ] **Step 4: Run test, verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module './venda'`

- [ ] **Step 5: Implement the validator**

Create `src/lib/validators/venda.ts`:
```ts
import { z } from "zod";

export const ItemVendaSchema = z.object({
  produto_id: z.string().uuid(),
  quantidade: z.coerce.number().int().positive(),
  preco_unitario_centavos: z.coerce.number().int().nonnegative(),
});

export const VendaInputSchema = z.object({
  cliente_id: z.string().uuid().optional(),
  forma_pagamento: z.enum(["dinheiro", "pix", "debito", "credito"]),
  itens: z.array(ItemVendaSchema).min(1, "Adicione ao menos um item"),
});

export type VendaInput = z.infer<typeof VendaInputSchema>;
```

- [ ] **Step 6: Run test, verify it passes**

Run: `npm test`
Expected: PASS

- [ ] **Step 7: Implement the API route**

Create `src/app/api/vendas/route.ts`:
```ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { VendaInputSchema } from "@/lib/validators/venda";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = VendaInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ erro: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const tenantId = userData.user?.app_metadata.tenant_id as string | undefined;
  if (!tenantId) {
    return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });
  }

  const { data: venda, error } = await supabase.rpc("criar_venda", {
    p_tenant_id: tenantId,
    p_cliente_id: parsed.data.cliente_id ?? null,
    p_forma_pagamento: parsed.data.forma_pagamento,
    p_itens: parsed.data.itens,
  });

  if (error) {
    return NextResponse.json({ erro: error.message }, { status: 500 });
  }

  return NextResponse.json({ venda });
}
```

- [ ] **Step 8: Implement the cart client component**

Create `src/app/(admin)/vendas/nova-venda-form.tsx`:
```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface Produto {
  id: string;
  nome: string;
  preco_centavos: number;
}

interface Cliente {
  id: string;
  nome: string;
}

interface ItemCarrinho {
  produto_id: string;
  quantidade: number;
  preco_unitario_centavos: number;
}

export function NovaVendaForm({ produtos, clientes }: { produtos: Produto[]; clientes: Cliente[] }) {
  const router = useRouter();
  const [itens, setItens] = useState<ItemCarrinho[]>([]);
  const [clienteId, setClienteId] = useState("");
  const [formaPagamento, setFormaPagamento] = useState("dinheiro");
  const [erro, setErro] = useState<string | null>(null);

  function adicionarItem() {
    const primeiroProduto = produtos[0];
    if (!primeiroProduto) return;
    setItens([
      ...itens,
      { produto_id: primeiroProduto.id, quantidade: 1, preco_unitario_centavos: primeiroProduto.preco_centavos },
    ]);
  }

  function atualizarItem(indice: number, campo: keyof ItemCarrinho, valor: string | number) {
    setItens(itens.map((item, i) => (i === indice ? { ...item, [campo]: valor } : item)));
  }

  function removerItem(indice: number) {
    setItens(itens.filter((_, i) => i !== indice));
  }

  async function registrarVenda() {
    setErro(null);
    const resposta = await fetch("/api/vendas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cliente_id: clienteId || undefined, forma_pagamento: formaPagamento, itens }),
    });
    if (!resposta.ok) {
      const corpo = await resposta.json();
      setErro(typeof corpo.erro === "string" ? corpo.erro : "Erro ao registrar venda");
      return;
    }
    setItens([]);
    router.refresh();
  }

  return (
    <div className="space-y-3 border border-neutral-200 p-4">
      {erro ? <p className="text-sm text-red-600">{erro}</p> : null}

      <div className="flex gap-2">
        <select
          value={clienteId}
          onChange={(e) => setClienteId(e.target.value)}
          className="border border-neutral-300 px-2 py-1 text-sm"
        >
          <option value="">Sem cliente</option>
          {clientes.map((cliente) => (
            <option key={cliente.id} value={cliente.id}>
              {cliente.nome}
            </option>
          ))}
        </select>
        <select
          value={formaPagamento}
          onChange={(e) => setFormaPagamento(e.target.value)}
          className="border border-neutral-300 px-2 py-1 text-sm"
        >
          <option value="dinheiro">Dinheiro</option>
          <option value="pix">Pix</option>
          <option value="debito">Débito</option>
          <option value="credito">Crédito</option>
        </select>
      </div>

      {itens.map((item, indice) => (
        <div key={indice} className="flex gap-2">
          <select
            value={item.produto_id}
            onChange={(e) => {
              const produto = produtos.find((p) => p.id === e.target.value);
              atualizarItem(indice, "produto_id", e.target.value);
              if (produto) atualizarItem(indice, "preco_unitario_centavos", produto.preco_centavos);
            }}
            className="border border-neutral-300 px-2 py-1 text-sm"
          >
            {produtos.map((produto) => (
              <option key={produto.id} value={produto.id}>
                {produto.nome}
              </option>
            ))}
          </select>
          <input
            type="number"
            min="1"
            value={item.quantidade}
            onChange={(e) => atualizarItem(indice, "quantidade", Number(e.target.value))}
            className="w-20 border border-neutral-300 px-2 py-1 text-sm"
          />
          <button type="button" onClick={() => removerItem(indice)} className="text-neutral-600 underline">
            remover
          </button>
        </div>
      ))}

      <div className="flex gap-2">
        <button type="button" onClick={adicionarItem} className="border border-neutral-300 px-3 py-1.5 text-sm">
          Adicionar item
        </button>
        <button
          type="button"
          onClick={registrarVenda}
          disabled={itens.length === 0}
          className="bg-black px-3 py-1.5 text-sm text-white disabled:opacity-50"
        >
          Registrar venda
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 9: Implement the page**

Create `src/app/(admin)/vendas/page.tsx`:
```tsx
import { createClient } from "@/lib/supabase/server";
import { centavosParaReais } from "@/lib/money";
import { NovaVendaForm } from "./nova-venda-form";

export default async function VendasPage() {
  const supabase = await createClient();
  const hoje = new Date().toISOString().slice(0, 10);

  const { data: produtos } = await supabase
    .from("produtos")
    .select("id, nome, preco_centavos")
    .eq("ativo", true)
    .order("nome");
  const { data: clientes } = await supabase.from("clientes").select("id, nome").order("nome");
  const { data: vendas } = await supabase
    .from("vendas")
    .select("id, forma_pagamento, valor_total_centavos, criado_em")
    .gte("criado_em", `${hoje}T00:00:00`)
    .order("criado_em", { ascending: false });

  return (
    <div className="space-y-8">
      <h1 className="text-lg font-semibold">Vendas</h1>

      <NovaVendaForm produtos={produtos ?? []} clientes={clientes ?? []} />

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-neutral-500">
            <th className="py-2">Hora</th>
            <th>Forma de pagamento</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {(vendas ?? []).map((venda) => (
            <tr key={venda.id} className="border-b border-neutral-100">
              <td className="py-2">{new Date(venda.criado_em).toLocaleTimeString("pt-BR")}</td>
              <td>{venda.forma_pagamento}</td>
              <td>{centavosParaReais(venda.valor_total_centavos)}</td>
            </tr>
          ))}
          {vendas?.length === 0 ? (
            <tr>
              <td colSpan={3} className="py-4 text-neutral-500">
                Nenhuma venda registrada hoje
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 10: Verify the build**

Run: `npm run build`
Expected: succeeds with no type errors.

- [ ] **Step 11: Commit**

```bash
git add supabase src
git commit -m "feat: add atomic sale creation via RPC with automatic stock decrement"
```

---

### Task 13: Relatório Financeiro

**Files:**
- Create: `src/lib/relatorio.ts`, `src/lib/relatorio.test.ts`
- Create: `src/app/(admin)/relatorio/page.tsx`

**Interfaces:**
- Consumes: `horaParaMinutos` (Task 8), `agendamentos`+`quadras` (Task 2/6/9), `vendas` (Task 12).
- Produces: `receitaDeAgendamento`, `receitaTotalAgendamentos`, `contarCancelamentos`, `receitaPorQuadra`, `agruparVendasPorFormaPagamento`, `receitaTotalVendas` — Task 14 (Dashboard) imports and reuses every one of these for its own widgets instead of redefining them.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/relatorio.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import {
  receitaDeAgendamento,
  receitaTotalAgendamentos,
  contarCancelamentos,
  receitaPorQuadra,
  agruparVendasPorFormaPagamento,
  receitaTotalVendas,
} from "./relatorio";

const agendamentoBase = {
  hora_inicio: "10:00",
  hora_fim: "11:00",
  preco_hora_centavos: 10000,
  status: "confirmado" as const,
  quadra_nome: "Quadra 1",
};

describe("receitaDeAgendamento", () => {
  it("multiplica duração pelo preço por hora", () => {
    expect(receitaDeAgendamento(agendamentoBase)).toBe(10000);
  });

  it("calcula corretamente para meia hora", () => {
    expect(receitaDeAgendamento({ ...agendamentoBase, hora_inicio: "10:00", hora_fim: "10:30" })).toBe(5000);
  });
});

describe("receitaTotalAgendamentos", () => {
  it("soma apenas os confirmados", () => {
    const agendamentos = [agendamentoBase, { ...agendamentoBase, status: "cancelado" as const }];
    expect(receitaTotalAgendamentos(agendamentos)).toBe(10000);
  });
});

describe("contarCancelamentos", () => {
  it("conta apenas os cancelados", () => {
    const agendamentos = [{ status: "confirmado" }, { status: "cancelado" }, { status: "cancelado" }];
    expect(contarCancelamentos(agendamentos)).toBe(2);
  });
});

describe("receitaPorQuadra", () => {
  it("agrupa receita confirmada por nome da quadra", () => {
    const agendamentos = [
      agendamentoBase,
      { ...agendamentoBase, quadra_nome: "Quadra 2" },
      { ...agendamentoBase, status: "cancelado" as const, quadra_nome: "Quadra 2" },
    ];
    expect(receitaPorQuadra(agendamentos)).toEqual({ "Quadra 1": 10000, "Quadra 2": 10000 });
  });
});

describe("agruparVendasPorFormaPagamento", () => {
  it("agrupa e soma por forma de pagamento", () => {
    const vendas = [
      { forma_pagamento: "pix", valor_total_centavos: 1000 },
      { forma_pagamento: "pix", valor_total_centavos: 500 },
      { forma_pagamento: "dinheiro", valor_total_centavos: 300 },
    ];
    expect(agruparVendasPorFormaPagamento(vendas)).toEqual({ pix: 1500, dinheiro: 300 });
  });
});

describe("receitaTotalVendas", () => {
  it("soma o valor total de todas as vendas", () => {
    expect(receitaTotalVendas([{ valor_total_centavos: 100 }, { valor_total_centavos: 200 }])).toBe(300);
  });
});
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `npm test`
Expected: FAIL — `Cannot find module './relatorio'`

- [ ] **Step 3: Implement `src/lib/relatorio.ts`**

```ts
import { horaParaMinutos } from "./agenda";

export interface AgendamentoReceita {
  hora_inicio: string;
  hora_fim: string;
  preco_hora_centavos: number;
  status: "confirmado" | "cancelado";
  quadra_nome: string;
}

export function duracaoHoras(hora_inicio: string, hora_fim: string): number {
  return (horaParaMinutos(hora_fim) - horaParaMinutos(hora_inicio)) / 60;
}

export function receitaDeAgendamento(
  agendamento: Pick<AgendamentoReceita, "hora_inicio" | "hora_fim" | "preco_hora_centavos">
): number {
  return Math.round(
    duracaoHoras(agendamento.hora_inicio, agendamento.hora_fim) * agendamento.preco_hora_centavos
  );
}

export function receitaTotalAgendamentos(agendamentos: AgendamentoReceita[]): number {
  return agendamentos
    .filter((a) => a.status === "confirmado")
    .reduce((total, a) => total + receitaDeAgendamento(a), 0);
}

export function contarCancelamentos(agendamentos: { status: string }[]): number {
  return agendamentos.filter((a) => a.status === "cancelado").length;
}

export function receitaPorQuadra(agendamentos: AgendamentoReceita[]): Record<string, number> {
  return agendamentos
    .filter((a) => a.status === "confirmado")
    .reduce((acc, a) => {
      acc[a.quadra_nome] = (acc[a.quadra_nome] ?? 0) + receitaDeAgendamento(a);
      return acc;
    }, {} as Record<string, number>);
}

export function agruparVendasPorFormaPagamento(
  vendas: { forma_pagamento: string; valor_total_centavos: number }[]
): Record<string, number> {
  return vendas.reduce((acc, v) => {
    acc[v.forma_pagamento] = (acc[v.forma_pagamento] ?? 0) + v.valor_total_centavos;
    return acc;
  }, {} as Record<string, number>);
}

export function receitaTotalVendas(vendas: { valor_total_centavos: number }[]): number {
  return vendas.reduce((total, v) => total + v.valor_total_centavos, 0);
}
```

- [ ] **Step 4: Run tests, verify they pass**

Run: `npm test`
Expected: PASS (8 tests)

- [ ] **Step 5: Implement the report page**

Create `src/app/(admin)/relatorio/page.tsx`:
```tsx
import { createClient } from "@/lib/supabase/server";
import { centavosParaReais } from "@/lib/money";
import {
  receitaTotalAgendamentos,
  contarCancelamentos,
  receitaPorQuadra,
  agruparVendasPorFormaPagamento,
  receitaTotalVendas,
  type AgendamentoReceita,
} from "@/lib/relatorio";

export default async function RelatorioPage() {
  const supabase = await createClient();
  const hoje = new Date();
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().slice(0, 10);
  const inicioProximoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1).toISOString().slice(0, 10);

  const { data: agendamentosRaw } = await supabase
    .from("agendamentos")
    .select("hora_inicio, hora_fim, status, quadras(nome, preco_hora_centavos)")
    .gte("data", inicioMes)
    .lt("data", inicioProximoMes);

  const agendamentos: AgendamentoReceita[] = (agendamentosRaw ?? []).map((a) => {
    const quadra = a.quadras as unknown as { nome: string; preco_hora_centavos: number };
    return {
      hora_inicio: a.hora_inicio,
      hora_fim: a.hora_fim,
      status: a.status as "confirmado" | "cancelado",
      quadra_nome: quadra?.nome ?? "—",
      preco_hora_centavos: quadra?.preco_hora_centavos ?? 0,
    };
  });

  const { data: vendas } = await supabase
    .from("vendas")
    .select("forma_pagamento, valor_total_centavos")
    .gte("criado_em", `${inicioMes}T00:00:00`)
    .lt("criado_em", `${inicioProximoMes}T00:00:00`);

  const receitaQuadras = receitaTotalAgendamentos(agendamentos);
  const receitaProdutos = receitaTotalVendas(vendas ?? []);
  const cancelamentos = contarCancelamentos(agendamentos);
  const porQuadra = receitaPorQuadra(agendamentos);
  const porFormaPagamento = agruparVendasPorFormaPagamento(vendas ?? []);

  return (
    <div className="space-y-8">
      <h1 className="text-lg font-semibold">Relatório Financeiro</h1>

      <div className="grid grid-cols-4 gap-4">
        <div className="border border-neutral-200 p-4">
          <p className="text-xs text-neutral-500">Receita do mês</p>
          <p className="text-lg font-semibold">{centavosParaReais(receitaQuadras + receitaProdutos)}</p>
        </div>
        <div className="border border-neutral-200 p-4">
          <p className="text-xs text-neutral-500">Receita de quadras</p>
          <p className="text-lg font-semibold">{centavosParaReais(receitaQuadras)}</p>
        </div>
        <div className="border border-neutral-200 p-4">
          <p className="text-xs text-neutral-500">Receita de produtos</p>
          <p className="text-lg font-semibold">{centavosParaReais(receitaProdutos)}</p>
        </div>
        <div className="border border-neutral-200 p-4">
          <p className="text-xs text-neutral-500">Cancelamentos</p>
          <p className="text-lg font-semibold">{cancelamentos}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="border border-neutral-200 p-4">
          <p className="mb-2 text-sm font-medium">Receita por quadra</p>
          {Object.entries(porQuadra).map(([nome, valor]) => (
            <div key={nome} className="flex justify-between text-sm">
              <span>{nome}</span>
              <span>{centavosParaReais(valor)}</span>
            </div>
          ))}
          {Object.keys(porQuadra).length === 0 ? (
            <p className="text-sm text-neutral-500">Sem agendamentos neste mês</p>
          ) : null}
        </div>
        <div className="border border-neutral-200 p-4">
          <p className="mb-2 text-sm font-medium">Vendas por forma de pagamento</p>
          {Object.entries(porFormaPagamento).map(([forma, valor]) => (
            <div key={forma} className="flex justify-between text-sm">
              <span>{forma}</span>
              <span>{centavosParaReais(valor)}</span>
            </div>
          ))}
          {Object.keys(porFormaPagamento).length === 0 ? (
            <p className="text-sm text-neutral-500">Sem vendas neste mês</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Verify the build**

Run: `npm run build`
Expected: succeeds with no type errors.

- [ ] **Step 7: Commit**

```bash
git add src
git commit -m "feat: add financial report with revenue and cancellation breakdowns"
```

---

### Task 14: Dashboard

**Files:**
- Modify: `src/lib/relatorio.ts`, `src/lib/relatorio.test.ts` (add `taxaOcupacao`)
- Create: `src/app/(admin)/dashboard/page.tsx`

**Interfaces:**
- Consumes: every helper from Task 13 (`receitaDeAgendamento`, `receitaTotalAgendamentos`), plus the new `taxaOcupacao`.

- [ ] **Step 1: Write the failing test for occupancy rate**

Append to `src/lib/relatorio.test.ts`:
```ts
import { taxaOcupacao } from "./relatorio";

describe("taxaOcupacao", () => {
  it("calcula a fração de horas reservadas sobre a janela padrão de operação", () => {
    // janela padrão: 12h por quadra ativa
    expect(taxaOcupacao(6, 1)).toBe(0.5);
  });

  it("retorna 0 quando não há quadras ativas", () => {
    expect(taxaOcupacao(6, 0)).toBe(0);
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `npm test`
Expected: FAIL — `taxaOcupacao is not exported`

- [ ] **Step 3: Implement `taxaOcupacao`**

Append to `src/lib/relatorio.ts`:
```ts
// Janela de operação padrão considerada para a taxa de ocupação (10h–22h).
// Não há configuração de horário de funcionamento por arena nesta v1.
export const HORAS_OPERACAO_PADRAO = 12;

export function taxaOcupacao(horasReservadasHoje: number, quadrasAtivas: number): number {
  if (quadrasAtivas === 0) return 0;
  return horasReservadasHoje / (quadrasAtivas * HORAS_OPERACAO_PADRAO);
}
```

- [ ] **Step 4: Run test, verify it passes**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Implement the dashboard page**

Create `src/app/(admin)/dashboard/page.tsx`:
```tsx
import { createClient } from "@/lib/supabase/server";
import { centavosParaReais } from "@/lib/money";
import {
  receitaTotalAgendamentos,
  duracaoHoras,
  taxaOcupacao,
  type AgendamentoReceita,
} from "@/lib/relatorio";

export default async function DashboardPage() {
  const supabase = await createClient();
  const hoje = new Date().toISOString().slice(0, 10);

  const { data: agendamentosHojeRaw } = await supabase
    .from("agendamentos")
    .select("hora_inicio, hora_fim, status, clientes(nome), quadras(nome, preco_hora_centavos)")
    .eq("data", hoje)
    .order("hora_inicio");

  const agendamentosHoje: AgendamentoReceita[] = (agendamentosHojeRaw ?? []).map((a) => {
    const quadra = a.quadras as unknown as { nome: string; preco_hora_centavos: number };
    return {
      hora_inicio: a.hora_inicio,
      hora_fim: a.hora_fim,
      status: a.status as "confirmado" | "cancelado",
      quadra_nome: quadra?.nome ?? "—",
      preco_hora_centavos: quadra?.preco_hora_centavos ?? 0,
    };
  });

  const { data: quadras } = await supabase.from("quadras").select("id, nome, ativa").order("nome");
  const quadrasAtivas = (quadras ?? []).filter((q) => q.ativa);

  const { data: produtos } = await supabase
    .from("produtos")
    .select("nome, quantidade_estoque, estoque_minimo")
    .eq("ativo", true);
  const estoqueBaixo = (produtos ?? []).filter((p) => p.quantidade_estoque <= p.estoque_minimo);

  const confirmadosHoje = agendamentosHoje.filter((a) => a.status === "confirmado");
  const horasReservadasHoje = confirmadosHoje.reduce(
    (total, a) => total + duracaoHoras(a.hora_inicio, a.hora_fim),
    0
  );
  const receitaHoje = receitaTotalAgendamentos(agendamentosHoje);

  return (
    <div className="space-y-8">
      <h1 className="text-lg font-semibold">Boa tarde, Administrador!</h1>

      <div className="grid grid-cols-5 gap-4">
        <div className="border border-neutral-200 p-4">
          <p className="text-xs text-neutral-500">Agendamentos hoje</p>
          <p className="text-lg font-semibold">{agendamentosHoje.length}</p>
        </div>
        <div className="border border-neutral-200 p-4">
          <p className="text-xs text-neutral-500">Confirmados</p>
          <p className="text-lg font-semibold">{confirmadosHoje.length}</p>
        </div>
        <div className="border border-neutral-200 p-4">
          <p className="text-xs text-neutral-500">Receita do dia</p>
          <p className="text-lg font-semibold">{centavosParaReais(receitaHoje)}</p>
        </div>
        <div className="border border-neutral-200 p-4">
          <p className="text-xs text-neutral-500">Taxa de ocupação</p>
          <p className="text-lg font-semibold">
            {(taxaOcupacao(horasReservadasHoje, quadrasAtivas.length) * 100).toFixed(0)}%
          </p>
        </div>
        <div className="border border-neutral-200 p-4">
          <p className="text-xs text-neutral-500">Quadras ativas</p>
          <p className="text-lg font-semibold">{quadrasAtivas.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="border border-neutral-200 p-4">
          <p className="mb-2 text-sm font-medium">Agenda de Hoje</p>
          {confirmadosHoje.length === 0 ? (
            <p className="text-sm text-neutral-500">Nenhum agendamento para hoje</p>
          ) : (
            confirmadosHoje.map((a, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span>
                  {a.hora_inicio}–{a.hora_fim} · {a.quadra_nome}
                </span>
              </div>
            ))
          )}
        </div>
        <div className="border border-neutral-200 p-4">
          <p className="mb-2 text-sm font-medium">Status das Quadras</p>
          {(quadras ?? []).map((quadra) => (
            <div key={quadra.id} className="flex justify-between text-sm">
              <span>{quadra.nome}</span>
              <span>{quadra.ativa ? "Ativa" : "Inativa"}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="border border-neutral-200 p-4">
        <p className="mb-2 text-sm font-medium">Estoque baixo</p>
        {estoqueBaixo.length === 0 ? (
          <p className="text-sm text-neutral-500">Nenhum produto com estoque baixo</p>
        ) : (
          estoqueBaixo.map((produto) => (
            <div key={produto.nome} className="flex justify-between text-sm text-red-600">
              <span>{produto.nome}</span>
              <span>{produto.quantidade_estoque} em estoque</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Verify the build**

Run: `npm run build`
Expected: succeeds with no type errors.

- [ ] **Step 7: Commit**

```bash
git add src
git commit -m "feat: add dashboard reusing relatorio helpers"
```

---

### Task 15: Link do Cliente (configurações + agendamento público)

**Files:**
- Create: `supabase/migrations/0004_tenants_update_policy.sql`
- Create: `src/lib/whatsapp.ts`, `src/lib/whatsapp.test.ts`
- Create: `src/lib/validators/agendamento-publico.ts`, `src/lib/validators/agendamento-publico.test.ts`
- Create: `src/app/(admin)/link-cliente/actions.ts`, `src/app/(admin)/link-cliente/copiar-link-botao.tsx`, `src/app/(admin)/link-cliente/page.tsx`
- Create: `src/app/api/public/[token]/agendar/route.ts`
- Create: `src/app/r/[token]/page.tsx`, `src/app/r/[token]/formulario-reserva-publica.tsx`
- Modify: `src/proxy.ts` (renamed from `middleware.ts` in Task 4 per Next.js 16 convention)

**Interfaces:**
- Consumes: `temConflito` (Task 8), `createAdminClient` / `buscarTenantPorToken` (Task 4), `createClient` (Task 4).
- Produces: `gerarLinkWhatsApp(numero: string, mensagem: string): string` — the only place a `wa.me` link is built; Task 16 does not need it.
- This task's public route never goes through `proxy.ts`'s auth refresh meaningfully (no cookies involved) and is reachable with `status_assinatura = 'bloqueado'` — that gate belongs to the admin app in Task 16, not to the public booking page, since a blocked arena owner should still be able to receive bookings while they pay.

- [ ] **Step 1: Allow tenants to update their own row**

Create `supabase/migrations/0004_tenants_update_policy.sql`:
```sql
create policy tenants_atualizar_proprio on tenants
  for update using (id = current_tenant_id())
  with check (id = current_tenant_id());
```

Run: `supabase db push`
Expected: success.

(The application code is the only thing stopping an admin from editing `slug`/`token_link_publico`/`status_assinatura` — the settings form in Step 7 only ever sends `whatsapp_avisos`. Keep it that way; do not add inputs for those fields.)

- [ ] **Step 2: Write the failing test for the WhatsApp link builder**

Create `src/lib/whatsapp.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { gerarLinkWhatsApp } from "./whatsapp";

describe("gerarLinkWhatsApp", () => {
  it("remove caracteres não numéricos do número", () => {
    expect(gerarLinkWhatsApp("(51) 99999-8888", "oi")).toBe("https://wa.me/5199998888?text=oi");
  });

  it("codifica a mensagem para uso em URL", () => {
    const link = gerarLinkWhatsApp("51999998888", "Olá! Tudo bem?");
    expect(link).toContain(encodeURIComponent("Olá! Tudo bem?"));
  });
});
```

- [ ] **Step 3: Run test, verify it fails, then implement**

Run: `npm test` → FAIL (`Cannot find module './whatsapp'`)

Create `src/lib/whatsapp.ts`:
```ts
export function gerarLinkWhatsApp(numero: string, mensagem: string): string {
  const numeroLimpo = numero.replace(/\D/g, "");
  return `https://wa.me/${numeroLimpo}?text=${encodeURIComponent(mensagem)}`;
}
```

Run: `npm test` → PASS

- [ ] **Step 4: Write the failing test for the public booking validator**

Create `src/lib/validators/agendamento-publico.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { AgendamentoPublicoInputSchema } from "./agendamento-publico";

describe("AgendamentoPublicoInputSchema", () => {
  it("aceita uma reserva pública válida", () => {
    const resultado = AgendamentoPublicoInputSchema.safeParse({
      quadra_id: "11111111-1111-1111-1111-111111111111",
      data: "2026-06-23",
      hora_inicio: "10:00",
      hora_fim: "11:00",
      nome: "João",
      telefone: "51999998888",
    });
    expect(resultado.success).toBe(true);
  });

  it("rejeita telefone curto", () => {
    const resultado = AgendamentoPublicoInputSchema.safeParse({
      quadra_id: "11111111-1111-1111-1111-111111111111",
      data: "2026-06-23",
      hora_inicio: "10:00",
      hora_fim: "11:00",
      nome: "João",
      telefone: "123",
    });
    expect(resultado.success).toBe(false);
  });

  it("rejeita hora_fim antes de hora_inicio", () => {
    const resultado = AgendamentoPublicoInputSchema.safeParse({
      quadra_id: "11111111-1111-1111-1111-111111111111",
      data: "2026-06-23",
      hora_inicio: "11:00",
      hora_fim: "10:00",
      nome: "João",
      telefone: "51999998888",
    });
    expect(resultado.success).toBe(false);
  });
});
```

- [ ] **Step 5: Run test, verify it fails, then implement**

Run: `npm test` → FAIL (`Cannot find module './agendamento-publico'`)

Create `src/lib/validators/agendamento-publico.ts`:
```ts
import { z } from "zod";
import { horaParaMinutos } from "@/lib/agenda";

export const AgendamentoPublicoInputSchema = z
  .object({
    quadra_id: z.string().uuid(),
    data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    hora_inicio: z.string().regex(/^\d{2}:\d{2}$/),
    hora_fim: z.string().regex(/^\d{2}:\d{2}$/),
    nome: z.string().min(1),
    telefone: z.string().min(8),
  })
  .refine((dados) => horaParaMinutos(dados.hora_fim) > horaParaMinutos(dados.hora_inicio), {
    message: "O horário final deve ser depois do inicial",
  });

export type AgendamentoPublicoInput = z.infer<typeof AgendamentoPublicoInputSchema>;
```

Run: `npm test` → PASS

- [ ] **Step 6: Implement the public booking API route**

Create `src/app/api/public/[token]/agendar/route.ts`:
```ts
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buscarTenantPorToken } from "@/lib/tenant";
import { temConflito } from "@/lib/agenda";
import { AgendamentoPublicoInputSchema } from "@/lib/validators/agendamento-publico";

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const tenant = await buscarTenantPorToken(token);
  if (!tenant) return NextResponse.json({ erro: "Link inválido" }, { status: 404 });

  const parsed = AgendamentoPublicoInputSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ erro: parsed.error.flatten() }, { status: 400 });
  }
  const input = parsed.data;
  const admin = createAdminClient();

  const { data: existentes } = await admin
    .from("agendamentos")
    .select("hora_inicio, hora_fim")
    .eq("tenant_id", tenant.id)
    .eq("quadra_id", input.quadra_id)
    .eq("data", input.data)
    .eq("status", "confirmado");

  if (temConflito(existentes ?? [], { hora_inicio: input.hora_inicio, hora_fim: input.hora_fim })) {
    return NextResponse.json({ erro: "Esse horário já foi reservado" }, { status: 409 });
  }

  const telefoneLimpo = input.telefone.replace(/\D/g, "");
  const { data: clienteExistente } = await admin
    .from("clientes")
    .select("id")
    .eq("tenant_id", tenant.id)
    .eq("telefone", telefoneLimpo)
    .maybeSingle();

  let clienteId = clienteExistente?.id as string | undefined;
  if (!clienteId) {
    const { data: novoCliente, error: clienteError } = await admin
      .from("clientes")
      .insert({ tenant_id: tenant.id, nome: input.nome, telefone: telefoneLimpo })
      .select("id")
      .single();
    if (clienteError) return NextResponse.json({ erro: clienteError.message }, { status: 500 });
    clienteId = novoCliente.id;
  }

  const { data: agendamento, error } = await admin
    .from("agendamentos")
    .insert({
      tenant_id: tenant.id,
      quadra_id: input.quadra_id,
      cliente_id: clienteId,
      data: input.data,
      hora_inicio: input.hora_inicio,
      hora_fim: input.hora_fim,
      origem: "link_publico",
      status: "confirmado",
    })
    .select()
    .single();
  if (error) return NextResponse.json({ erro: error.message }, { status: 500 });

  return NextResponse.json({
    agendamento,
    whatsapp_avisos: tenant.whatsapp_avisos,
    nome_exibicao: tenant.nome_exibicao,
  });
}
```

- [ ] **Step 7: Implement the admin settings page**

Create `src/app/(admin)/link-cliente/actions.ts`:
```ts
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function atualizarWhatsappAvisos(formData: FormData) {
  const whatsapp = String(formData.get("whatsapp_avisos") ?? "").replace(/\D/g, "");

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const tenantId = userData.user?.app_metadata.tenant_id as string;

  const { error } = await supabase.from("tenants").update({ whatsapp_avisos: whatsapp }).eq("id", tenantId);
  if (error) throw error;

  revalidatePath("/link-cliente");
}
```

Create `src/app/(admin)/link-cliente/copiar-link-botao.tsx`:
```tsx
"use client";

import { useState } from "react";

export function CopiarLinkBotao({ link }: { link: string }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    await navigator.clipboard.writeText(link);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <button type="button" onClick={copiar} className="border border-neutral-300 px-3 py-1.5 text-sm">
      {copiado ? "Copiado!" : "Copiar link"}
    </button>
  );
}
```

Create `src/app/(admin)/link-cliente/page.tsx`:
```tsx
import { headers } from "next/headers";
import { buscarTenantPorSlug } from "@/lib/tenant";
import { atualizarWhatsappAvisos } from "./actions";
import { CopiarLinkBotao } from "./copiar-link-botao";

export default async function LinkClientePage() {
  const headerList = await headers();
  const slug = headerList.get("x-tenant-slug") ?? "base";
  const tenant = await buscarTenantPorSlug(slug);
  if (!tenant) return null;

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const link = `${baseUrl}/r/${tenant.token_link_publico}`;

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-lg font-semibold">Link do Cliente</h1>

      <div className="space-y-2 border border-neutral-200 p-4">
        <p className="text-sm text-neutral-500">Seu link de reservas</p>
        <p className="break-all text-sm">{link}</p>
        <CopiarLinkBotao link={link} />
      </div>

      <form action={atualizarWhatsappAvisos} className="space-y-2 border border-neutral-200 p-4">
        <label className="text-sm text-neutral-500">Número de WhatsApp para avisos</label>
        <input
          name="whatsapp_avisos"
          defaultValue={tenant.whatsapp_avisos ?? ""}
          placeholder="Ex: 51999998888"
          className="w-full border border-neutral-300 px-2 py-1.5 text-sm"
        />
        <button type="submit" className="bg-black px-3 py-1.5 text-sm text-white">
          Salvar
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 8: Implement the public booking page**

Create `src/app/r/[token]/formulario-reserva-publica.tsx`:
```tsx
"use client";

import { useState } from "react";
import { gerarLinkWhatsApp } from "@/lib/whatsapp";

interface Quadra {
  id: string;
  nome: string;
  tipo_esporte: string;
}

export function FormularioReservaPublica({ token, quadras }: { token: string; quadras: Quadra[] }) {
  const [quadraId, setQuadraId] = useState(quadras[0]?.id ?? "");
  const [data, setData] = useState("");
  const [horaInicio, setHoraInicio] = useState("");
  const [horaFim, setHoraFim] = useState("");
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [confirmado, setConfirmado] = useState(false);

  async function enviar() {
    setErro(null);
    const resposta = await fetch(`/api/public/${token}/agendar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        quadra_id: quadraId,
        data,
        hora_inicio: horaInicio,
        hora_fim: horaFim,
        nome,
        telefone,
      }),
    });
    const corpo = await resposta.json();
    if (!resposta.ok) {
      setErro(typeof corpo.erro === "string" ? corpo.erro : "Não foi possível reservar esse horário");
      return;
    }
    setConfirmado(true);
    if (corpo.whatsapp_avisos) {
      const mensagem = `Olá! Acabei de reservar a quadra para ${data} às ${horaInicio}. Meu nome é ${nome}.`;
      window.open(gerarLinkWhatsApp(corpo.whatsapp_avisos, mensagem), "_blank");
    }
  }

  if (confirmado) {
    return (
      <p className="text-sm">
        Reserva confirmada! Se abriu o WhatsApp, é só enviar a mensagem pra avisar o dono.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {erro ? <p className="text-sm text-red-600">{erro}</p> : null}

      <select
        value={quadraId}
        onChange={(e) => setQuadraId(e.target.value)}
        className="w-full border border-neutral-300 px-2 py-1.5 text-sm"
      >
        {quadras.map((quadra) => (
          <option key={quadra.id} value={quadra.id}>
            {quadra.nome} ({quadra.tipo_esporte})
          </option>
        ))}
      </select>
      <input
        type="date"
        value={data}
        onChange={(e) => setData(e.target.value)}
        className="w-full border border-neutral-300 px-2 py-1.5 text-sm"
      />
      <div className="flex gap-2">
        <input
          type="time"
          value={horaInicio}
          onChange={(e) => setHoraInicio(e.target.value)}
          className="w-full border border-neutral-300 px-2 py-1.5 text-sm"
        />
        <input
          type="time"
          value={horaFim}
          onChange={(e) => setHoraFim(e.target.value)}
          className="w-full border border-neutral-300 px-2 py-1.5 text-sm"
        />
      </div>
      <input
        placeholder="Seu nome"
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        className="w-full border border-neutral-300 px-2 py-1.5 text-sm"
      />
      <input
        placeholder="Seu telefone/WhatsApp"
        value={telefone}
        onChange={(e) => setTelefone(e.target.value)}
        className="w-full border border-neutral-300 px-2 py-1.5 text-sm"
      />
      <button type="button" onClick={enviar} className="w-full bg-black px-3 py-2 text-sm text-white">
        Confirmar reserva
      </button>
    </div>
  );
}
```

Create `src/app/r/[token]/page.tsx`:
```tsx
import { notFound } from "next/navigation";
import { buscarTenantPorToken } from "@/lib/tenant";
import { createAdminClient } from "@/lib/supabase/admin";
import { FormularioReservaPublica } from "./formulario-reserva-publica";

export default async function PaginaReservaPublica({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const tenant = await buscarTenantPorToken(token);
  if (!tenant) notFound();

  const admin = createAdminClient();
  const { data: quadras } = await admin
    .from("quadras")
    .select("id, nome, tipo_esporte")
    .eq("tenant_id", tenant.id)
    .eq("ativa", true)
    .order("nome");

  return (
    <main className="mx-auto max-w-md space-y-6 p-6">
      <h1 className="text-lg font-semibold">{tenant.nome_exibicao}</h1>
      <FormularioReservaPublica token={token} quadras={quadras ?? []} />
    </main>
  );
}
```

- [ ] **Step 9: Exempt the public route from the proxy's tenant-by-subdomain assumption**

Modify `src/proxy.ts` (Next.js 16's renamed `middleware.ts` convention — see Task 4) — update the `matcher` so the public route still gets the Supabase cookie refresh (harmless, it just won't have a session) but is never blocked by tenant-by-subdomain logic, since `/r/[token]` resolves its tenant from the URL token, not the host:

```ts
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|r/).*)"],
};
```

- [ ] **Step 10: Verify the build**

Run: `npm run build`
Expected: succeeds with no type errors.

- [ ] **Step 11: Commit**

```bash
git add supabase src
git commit -m "feat: add link do cliente settings and public no-login booking flow"
```

---

### Task 16: Subscription gate (mocked Quadras Hub contract) + lock screen

**Files:**
- Create: `src/lib/subscription.ts`, `src/lib/subscription.test.ts`
- Create: `src/app/api/subscription/check/route.ts`
- Create: `src/app/bloqueado/verificar-assinatura-poller.tsx`, `src/app/bloqueado/page.tsx`
- Modify: `src/proxy.ts` (renamed from `middleware.ts` in Task 4 per Next.js 16 convention)

**Interfaces:**
- Consumes: `buscarTenantPorSlug` (Task 4).
- Produces: `avaliarStatusAssinatura(statusAssinatura: string): { ativo: boolean; dias_restantes: number }` and the contract response shape of `GET /api/subscription/check?tenant=<slug>` — when the real Quadras Hub project exists, only this file's internals change (fetch the Hub instead of reading the local `tenants` row); the shape and every caller stay the same (design §7).

- [ ] **Step 1: Write the failing test**

Create `src/lib/subscription.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { avaliarStatusAssinatura } from "./subscription";

describe("avaliarStatusAssinatura", () => {
  it("considera ativo quando o status é 'ativo'", () => {
    expect(avaliarStatusAssinatura("ativo")).toEqual({ ativo: true, dias_restantes: 30 });
  });

  it("considera bloqueado quando o status não é 'ativo'", () => {
    expect(avaliarStatusAssinatura("bloqueado")).toEqual({ ativo: false, dias_restantes: 0 });
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `npm test`
Expected: FAIL — `Cannot find module './subscription'`

- [ ] **Step 3: Implement `src/lib/subscription.ts`**

```ts
export interface StatusAssinatura {
  ativo: boolean;
  dias_restantes: number;
}

// Mock do contrato do futuro Quadras Hub (design doc §7). Hoje lê
// tenants.status_assinatura direto; quando o Hub existir, só o
// chamador (src/app/api/subscription/check/route.ts) muda para
// buscar isso de lá em vez do banco local — esta função e seu
// formato de retorno continuam os mesmos.
export function avaliarStatusAssinatura(statusAssinatura: string): StatusAssinatura {
  const ativo = statusAssinatura === "ativo";
  return { ativo, dias_restantes: ativo ? 30 : 0 };
}
```

- [ ] **Step 4: Run test, verify it passes**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Implement the check endpoint**

Create `src/app/api/subscription/check/route.ts`:
```ts
import { NextResponse } from "next/server";
import { buscarTenantPorSlug } from "@/lib/tenant";
import { avaliarStatusAssinatura } from "@/lib/subscription";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("tenant");
  if (!slug) return NextResponse.json({ erro: "Parâmetro tenant obrigatório" }, { status: 400 });

  const tenant = await buscarTenantPorSlug(slug);
  if (!tenant) return NextResponse.json({ erro: "Tenant não encontrado" }, { status: 404 });

  return NextResponse.json(avaliarStatusAssinatura(tenant.status_assinatura));
}
```

- [ ] **Step 6: Add the gate to the proxy**

Replace the body of `src/proxy.ts` with:
```ts
import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { resolverTenantSlug, buscarTenantPorSlug } from "@/lib/tenant";
import { avaliarStatusAssinatura } from "@/lib/subscription";

export async function proxy(request: NextRequest) {
  const response = NextResponse.next();
  const host = request.headers.get("host") ?? "";
  const tenantSlug = resolverTenantSlug(
    host,
    process.env.NEXT_PUBLIC_DEV_TENANT_SLUG ?? "base"
  );
  response.headers.set("x-tenant-slug", tenantSlug);

  const tenant = await buscarTenantPorSlug(tenantSlug);
  const isBloqueadoPage = request.nextUrl.pathname === "/bloqueado";
  if (tenant && !isBloqueadoPage) {
    const status = avaliarStatusAssinatura(tenant.status_assinatura);
    if (!status.ativo) {
      return NextResponse.redirect(new URL("/bloqueado", request.url));
    }
  }

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
  matcher: ["/((?!_next/static|_next/image|favicon.ico|r/).*)"],
};
```

- [ ] **Step 7: Implement the lock screen**

Create `src/app/bloqueado/verificar-assinatura-poller.tsx`:
```tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function VerificarAssinaturaPoller({ slug }: { slug: string }) {
  const router = useRouter();

  useEffect(() => {
    const intervalo = setInterval(async () => {
      const resposta = await fetch(`/api/subscription/check?tenant=${slug}`);
      const status = await resposta.json();
      if (status.ativo) {
        router.replace("/dashboard");
      }
    }, 15000);
    return () => clearInterval(intervalo);
  }, [slug, router]);

  return null;
}
```

Create `src/app/bloqueado/page.tsx`:
```tsx
import { headers } from "next/headers";
import { VerificarAssinaturaPoller } from "./verificar-assinatura-poller";

export default async function BloqueadoPage() {
  const headerList = await headers();
  const slug = headerList.get("x-tenant-slug") ?? "base";

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <VerificarAssinaturaPoller slug={slug} />
      <div className="max-w-sm space-y-4 text-center">
        <h1 className="text-lg font-semibold">Assinatura pendente</h1>
        <p className="text-sm text-neutral-600">
          O acesso está temporariamente bloqueado até a renovação da mensalidade.
          Assim que o pagamento for confirmado, o acesso é liberado automaticamente
          — não é necessário recarregar a página.
        </p>
      </div>
    </main>
  );
}
```

- [ ] **Step 8: Manually verify the gate**

Run (via the SQL editor or `supabase db psql`, against the real linked project):
```sql
update tenants set status_assinatura = 'bloqueado' where slug = 'base';
```
Visit `http://localhost:3000/dashboard` → expect a redirect to `/bloqueado`. Then:
```sql
update tenants set status_assinatura = 'ativo' where slug = 'base';
```
Visit `/bloqueado` again (or wait up to 15s on the page) → expect redirect back to `/dashboard`.

- [ ] **Step 9: Verify the build**

Run: `npm run build`
Expected: succeeds with no type errors.

- [ ] **Step 10: Commit**

```bash
git add src
git commit -m "feat: add subscription gate behind mocked Quadras Hub contract"
```

---

### Task 17: Deploy — Vercel project, GitHub repo overwrite, Supabase link, first tenant

**Files:**
- Create: `docs/HANDOFF.md`
- Modify: nothing else — this task is infrastructure, not code.

**Interfaces:**
- Consumes: every previous task's output (this is the first time the full app runs in production).

- [ ] **Step 1: Point the GitHub CLI at the right account**

Run: `gh auth switch --user quadras-zanoni`
Expected: confirms `quadras-zanoni` is now the active account (per [[reference-cerebro-hub]] in project memory — all CRM-for-arenas repos live under this org, not the personal `zanoni-gui` account).

- [ ] **Step 2: Overwrite the existing `quadras-zanoni/quadras-base` repo**

The user explicitly confirmed overwriting history (no archive step). Run:
```bash
cd "C:\Users\Fartech Gamer\Desktop\CRM DAS ARENAS"
git remote add origin git@github.com:quadras-zanoni/quadras-base.git
git branch -M main
git push --force origin main
```
Expected: push succeeds; the GitHub repo's commit history is now entirely this rebuild's history.

- [ ] **Step 3: Create and link the Vercel project**

Run:
```bash
vercel link --yes --project quadras-base
```
Expected: creates (or links to) a Vercel project named `quadras-base` under the `quadras-zanoni` team, writes `.vercel/project.json`.

- [ ] **Step 4: Connect the GitHub repo for automatic deploys**

In the Vercel dashboard (Project → Settings → Git) connect `quadras-zanoni/quadras-base`, or run:
```bash
vercel git connect
```
Expected: future pushes to `main` trigger production deploys automatically.

- [ ] **Step 5: Set the production environment variables**

Run (once per variable, pasting the real value from the Supabase project created in Task 2 when prompted):
```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add NEXT_PUBLIC_DEV_TENANT_SLUG production
vercel env add NEXT_PUBLIC_APP_URL production
```
For `NEXT_PUBLIC_DEV_TENANT_SLUG` use `base`. For `NEXT_PUBLIC_APP_URL` use the production URL Vercel assigns (re-run `vercel env add` to correct it after the first deploy if needed, since the URL isn't known until Step 7).

- [ ] **Step 6: Create the first (demo/base) tenant**

Run against the production Supabase project:
```bash
npx tsx scripts/criar-tenant.ts --slug=base --nome="BASE" --email=admin@quadrashub.app --senha="<escolher-senha-forte>"
```
Expected: prints the new tenant id and `token_link_publico`. Save the login email/password somewhere safe — this is the login for the demo/template tenant, not a real client.

- [ ] **Step 7: Deploy to production**

Run: `vercel --prod`
Expected: build succeeds, prints a production URL.

- [ ] **Step 8: Smoke-test production**

Run: `curl -s -o /dev/null -w "%{http_code}" https://<production-url>/login`
Expected: `200`. Then manually log in with the Step 6 credentials and confirm the dashboard loads, a quadra can be created, and `/r/<token_link_publico>` loads the public booking form.

- [ ] **Step 9: Write the handoff doc**

Create `docs/HANDOFF.md`:
```markdown
# HANDOFF — quadras-base v1

**Produção:** <preencher com a URL do Step 7>
**GitHub:** github.com/quadras-zanoni/quadras-base
**Vercel project:** quadras-base (team quadras-zanoni)
**Supabase project ref:** <preencher com o ref do Task 2>

## Tenant demo/base
- slug: `base`
- login: admin@quadrashub.app (senha definida no Step 6, trocar antes de qualquer demo pública)

## Como adicionar um cliente real
Ver `docs/ONBOARDING-NOVO-CLIENTE.md`.

## O que ainda não existe
- Quadras Hub (prospecção + cobrança Mercado Pago centralizada) — o gate de
  assinatura aqui é mocado lendo `tenants.status_assinatura` direto
  (`src/lib/subscription.ts`). Ver design doc §7 para o contrato que o Hub
  precisa expor.
- Domínio próprio por cliente (suportado pela arquitetura, não configurado ainda).
- Múltiplos usuários por tenant.
```

- [ ] **Step 10: Commit**

```bash
git add docs
git commit -m "docs: add production handoff notes"
git push origin main
```

---

## Self-Review Notes

- **Spec coverage:** every module in design §5 (Dashboard, Agenda do Dia, Novo Agendamento, Quadras, Clientes, Estoque, Movimentações, Vendas, Relatório, Link do Cliente) has a task. §6 (wa.me flow) → Task 15. §7 (Hub contract) → Task 16. §8 (RLS/security) → Tasks 3, 4. The one deliberate simplification vs. the design doc: the prototype's list/grid toggle on Agenda do Dia was reduced to list-only (Task 9) — same data, no new business logic, grid view can be added later as a pure rendering change if wanted.
- **Placeholder scan:** no TBD/TODO left in any task; the only bracketed text is in Task 17 Step 9's doc template, which is explicitly filled in during that same step using values produced earlier in that step.
- **Type consistency:** `Tenant`, `IntervaloHorario`, `AgendamentoReceita`, `StatusAssinatura` are each defined once (Tasks 4, 8, 13, 16) and only ever imported afterward — no task redefines them.

