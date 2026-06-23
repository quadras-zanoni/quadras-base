import { ShoppingCart } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { centavosParaReais } from "@/lib/money";
import { hojeISO, inicioDoDiaUTC } from "@/lib/timezone";
import { NovaVendaForm } from "./nova-venda-form";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";

export default async function VendasPage() {
  const supabase = await createClient();
  const hoje = hojeISO();

  const [{ data: produtos }, { data: clientes }, { data: vendas }] = await Promise.all([
    supabase.from("produtos").select("id, nome, preco_centavos").eq("ativo", true).order("nome"),
    supabase.from("clientes").select("id, nome").order("nome"),
    supabase
      .from("vendas")
      .select("id, forma_pagamento, valor_total_centavos, criado_em")
      .gte("criado_em", inicioDoDiaUTC(hoje))
      .order("criado_em", { ascending: false }),
  ]);

  const totalHoje = (vendas ?? []).reduce((soma, venda) => soma + venda.valor_total_centavos, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Vendas"
        subtitulo={`Hoje: ${vendas?.length ?? 0} venda${vendas?.length === 1 ? "" : "s"} · ${centavosParaReais(totalHoje)}`}
      />

      <NovaVendaForm produtos={produtos ?? []} clientes={clientes ?? []} />

      <Card className="overflow-hidden p-0">
        {(vendas?.length ?? 0) === 0 ? (
          <EmptyState
            icon={<ShoppingCart size={20} />}
            titulo="Nenhuma venda registrada"
            descricao="Registre a primeira venda do dia acima."
          />
        ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-neutral-500">
              <th className="px-5 py-3 font-medium">Hora</th>
              <th className="font-medium">Forma de pagamento</th>
              <th className="font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {(vendas ?? []).map((venda) => (
              <tr key={venda.id} className="border-b border-neutral-100 last:border-0">
                <td className="px-5 py-3">{new Date(venda.criado_em).toLocaleTimeString("pt-BR")}</td>
                <td className="capitalize">{venda.forma_pagamento}</td>
                <td>{centavosParaReais(venda.valor_total_centavos)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        )}
      </Card>
    </div>
  );
}
