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
