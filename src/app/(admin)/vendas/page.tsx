import { createClient } from "@/lib/supabase/server";
import { centavosParaReais } from "@/lib/money";
import { NovaVendaForm } from "./nova-venda-form";
import { Card } from "@/components/ui/Card";

export default async function VendasPage() {
  const supabase = await createClient();
  const hoje = new Date().toISOString().slice(0, 10);

  const [{ data: produtos }, { data: clientes }, { data: vendas }] = await Promise.all([
    supabase.from("produtos").select("id, nome, preco_centavos").eq("ativo", true).order("nome"),
    supabase.from("clientes").select("id, nome").order("nome"),
    supabase
      .from("vendas")
      .select("id, forma_pagamento, valor_total_centavos, criado_em")
      .gte("criado_em", `${hoje}T00:00:00`)
      .order("criado_em", { ascending: false }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold tracking-tight">Vendas</h1>

      <NovaVendaForm produtos={produtos ?? []} clientes={clientes ?? []} />

      <Card className="overflow-hidden p-0">
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
            {vendas?.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-5 py-6 text-neutral-500">
                  Nenhuma venda registrada hoje
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
