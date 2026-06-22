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
