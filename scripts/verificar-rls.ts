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
