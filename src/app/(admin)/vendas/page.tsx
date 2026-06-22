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
