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
