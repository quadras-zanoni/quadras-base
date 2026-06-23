import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  CalendarPlus,
  LandPlot,
  Users,
  Package,
  Boxes,
  ShoppingCart,
  BarChart3,
  Link2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { NavLink } from "@/components/ui/NavLink";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/agenda", label: "Agenda do Dia", icon: CalendarDays },
  { href: "/agendamentos/novo", label: "Novo Agendamento", icon: CalendarPlus },
  { href: "/quadras", label: "Quadras", icon: LandPlot },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/produtos", label: "Produtos", icon: Package },
  { href: "/estoque", label: "Estoque", icon: Boxes },
  { href: "/vendas", label: "Vendas", icon: ShoppingCart },
  { href: "/relatorio", label: "Relatório", icon: BarChart3 },
  { href: "/link-cliente", label: "Link do Cliente", icon: Link2 },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");

  // The proxy already resolved the tenant for the subscription gate above
  // this layout in the request pipeline -- reuse that result via headers
  // instead of paying for a second cross-region lookup here.
  const headerList = await headers();
  if (headerList.get("x-tenant-found") !== "1") redirect("/login");
  const nomeExibicao = decodeURIComponent(headerList.get("x-tenant-nome-exibicao") ?? "");

  return (
    <div className="flex min-h-screen bg-neutral-50">
      <aside className="flex w-60 flex-col border-r border-neutral-200 bg-white p-4">
        <p className="mb-6 px-3 text-sm font-semibold tracking-tight">{nomeExibicao}</p>
        <nav className="space-y-1">
          {NAV.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.href}
                href={item.href}
                label={item.label}
                icon={<Icon size={16} strokeWidth={2} />}
              />
            );
          })}
        </nav>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
