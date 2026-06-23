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
