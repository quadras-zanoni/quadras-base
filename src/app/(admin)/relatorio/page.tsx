import { createClient } from "@/lib/supabase/server";
import { centavosParaReais } from "@/lib/money";
import { hojeISO, inicioDoDiaUTC, limitesDoMes } from "@/lib/timezone";
import {
  receitaTotalAgendamentos,
  contarCancelamentos,
  receitaPorQuadra,
  agruparVendasPorFormaPagamento,
  receitaTotalVendas,
  type AgendamentoReceita,
} from "@/lib/relatorio";
import { StatCard, Card } from "@/components/ui/Card";

export default async function RelatorioPage() {
  const supabase = await createClient();
  const { inicio: inicioMes, fim: inicioProximoMes } = limitesDoMes(hojeISO());

  const [{ data: agendamentosRaw }, { data: vendas }] = await Promise.all([
    supabase
      .from("agendamentos")
      .select("hora_inicio, hora_fim, status, quadras(nome, preco_hora_centavos)")
      .gte("data", inicioMes)
      .lt("data", inicioProximoMes),
    supabase
      .from("vendas")
      .select("forma_pagamento, valor_total_centavos")
      .gte("criado_em", inicioDoDiaUTC(inicioMes))
      .lt("criado_em", inicioDoDiaUTC(inicioProximoMes)),
  ]);

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

  const receitaQuadras = receitaTotalAgendamentos(agendamentos);
  const receitaProdutos = receitaTotalVendas(vendas ?? []);
  const cancelamentos = contarCancelamentos(agendamentos);
  const porQuadra = receitaPorQuadra(agendamentos);
  const porFormaPagamento = agruparVendasPorFormaPagamento(vendas ?? []);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold tracking-tight">Relatório Financeiro</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Receita do mês" value={centavosParaReais(receitaQuadras + receitaProdutos)} />
        <StatCard label="Receita de quadras" value={centavosParaReais(receitaQuadras)} />
        <StatCard label="Receita de produtos" value={centavosParaReais(receitaProdutos)} />
        <StatCard label="Cancelamentos" value={cancelamentos} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <p className="mb-3 text-sm font-medium">Receita por quadra</p>
          <div className="space-y-2">
            {Object.entries(porQuadra).map(([nome, valor]) => (
              <div key={nome} className="flex justify-between text-sm">
                <span>{nome}</span>
                <span>{centavosParaReais(valor)}</span>
              </div>
            ))}
          </div>
          {Object.keys(porQuadra).length === 0 ? (
            <p className="text-sm text-neutral-500">Sem agendamentos neste mês</p>
          ) : null}
        </Card>
        <Card>
          <p className="mb-3 text-sm font-medium">Vendas por forma de pagamento</p>
          <div className="space-y-2">
            {Object.entries(porFormaPagamento).map(([forma, valor]) => (
              <div key={forma} className="flex justify-between text-sm capitalize">
                <span>{forma}</span>
                <span>{centavosParaReais(valor)}</span>
              </div>
            ))}
          </div>
          {Object.keys(porFormaPagamento).length === 0 ? (
            <p className="text-sm text-neutral-500">Sem vendas neste mês</p>
          ) : null}
        </Card>
      </div>
    </div>
  );
}
