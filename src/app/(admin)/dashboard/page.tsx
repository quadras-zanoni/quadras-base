import { createClient } from "@/lib/supabase/server";
import { centavosParaReais } from "@/lib/money";
import { hojeISO } from "@/lib/timezone";
import {
  receitaTotalAgendamentos,
  duracaoHoras,
  taxaOcupacao,
  type AgendamentoReceita,
} from "@/lib/relatorio";
import { StatCard, Card } from "@/components/ui/Card";

export default async function DashboardPage() {
  const supabase = await createClient();
  const hoje = hojeISO();

  const [{ data: agendamentosHojeRaw }, { data: quadras }, { data: produtos }] = await Promise.all([
    supabase
      .from("agendamentos")
      .select("hora_inicio, hora_fim, status, clientes(nome), quadras(nome, preco_hora_centavos)")
      .eq("data", hoje)
      .order("hora_inicio"),
    supabase.from("quadras").select("id, nome, ativa").order("nome"),
    supabase.from("produtos").select("nome, quantidade_estoque, estoque_minimo").eq("ativo", true),
  ]);

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

  const quadrasAtivas = (quadras ?? []).filter((q) => q.ativa);
  const estoqueBaixo = (produtos ?? []).filter((p) => p.quantidade_estoque <= p.estoque_minimo);

  const confirmadosHoje = agendamentosHoje.filter((a) => a.status === "confirmado");
  const horasReservadasHoje = confirmadosHoje.reduce(
    (total, a) => total + duracaoHoras(a.hora_inicio, a.hora_fim),
    0
  );
  const receitaHoje = receitaTotalAgendamentos(agendamentosHoje);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold tracking-tight">Boa tarde, Administrador!</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Agendamentos hoje" value={agendamentosHoje.length} />
        <StatCard label="Confirmados" value={confirmadosHoje.length} />
        <StatCard label="Receita do dia" value={centavosParaReais(receitaHoje)} />
        <StatCard
          label="Taxa de ocupação"
          value={`${(taxaOcupacao(horasReservadasHoje, quadrasAtivas.length) * 100).toFixed(0)}%`}
        />
        <StatCard label="Quadras ativas" value={quadrasAtivas.length} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <p className="mb-3 text-sm font-medium">Agenda de Hoje</p>
          {confirmadosHoje.length === 0 ? (
            <p className="text-sm text-neutral-500">Nenhum agendamento para hoje</p>
          ) : (
            <div className="space-y-2">
              {confirmadosHoje.map((a, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span>
                    {a.hora_inicio}–{a.hora_fim} · {a.quadra_nome}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card>
          <p className="mb-3 text-sm font-medium">Status das Quadras</p>
          <div className="space-y-2">
            {(quadras ?? []).map((quadra) => (
              <div key={quadra.id} className="flex justify-between text-sm">
                <span>{quadra.nome}</span>
                <span className={quadra.ativa ? "text-emerald-600" : "text-neutral-400"}>
                  {quadra.ativa ? "Ativa" : "Inativa"}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <p className="mb-3 text-sm font-medium">Estoque baixo</p>
        {estoqueBaixo.length === 0 ? (
          <p className="text-sm text-neutral-500">Nenhum produto com estoque baixo</p>
        ) : (
          <div className="space-y-2">
            {estoqueBaixo.map((produto) => (
              <div key={produto.nome} className="flex justify-between text-sm text-red-600">
                <span>{produto.nome}</span>
                <span>{produto.quantidade_estoque} em estoque</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
