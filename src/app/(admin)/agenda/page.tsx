import { createClient } from "@/lib/supabase/server";
import { cancelarAgendamento } from "./actions";

export default async function AgendaDoDiaPage({
  searchParams,
}: {
  searchParams: Promise<{ data?: string; quadra?: string; status?: string }>;
}) {
  const params = await searchParams;
  const data = params.data ?? new Date().toISOString().slice(0, 10);

  const supabase = await createClient();
  let query = supabase
    .from("agendamentos")
    .select("id, hora_inicio, hora_fim, status, recorrente, quadras(nome), clientes(nome, telefone)")
    .eq("data", data)
    .order("hora_inicio");

  if (params.quadra) query = query.eq("quadra_id", params.quadra);
  if (params.status) query = query.eq("status", params.status);

  const { data: agendamentos } = await query;
  const { data: quadras } = await supabase.from("quadras").select("id, nome").order("nome");

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">Agenda do Dia</h1>

      <form method="get" className="flex flex-wrap gap-2">
        <input name="data" type="date" defaultValue={data} className="border border-neutral-300 px-2 py-1 text-sm" />
        <select name="quadra" defaultValue={params.quadra ?? ""} className="border border-neutral-300 px-2 py-1 text-sm">
          <option value="">Todas as quadras</option>
          {(quadras ?? []).map((quadra) => (
            <option key={quadra.id} value={quadra.id}>
              {quadra.nome}
            </option>
          ))}
        </select>
        <select name="status" defaultValue={params.status ?? ""} className="border border-neutral-300 px-2 py-1 text-sm">
          <option value="">Todos os status</option>
          <option value="confirmado">Confirmado</option>
          <option value="cancelado">Cancelado</option>
        </select>
        <button type="submit" className="border border-neutral-300 px-3 py-1 text-sm">
          Filtrar
        </button>
      </form>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-neutral-500">
            <th className="py-2">Horário</th>
            <th>Quadra</th>
            <th>Cliente</th>
            <th>Status</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {(agendamentos ?? []).map((agendamento) => (
            <tr key={agendamento.id} className="border-b border-neutral-100">
              <td className="py-2">
                {agendamento.hora_inicio}–{agendamento.hora_fim}
                {agendamento.recorrente ? " 🔁" : ""}
              </td>
              <td>{(agendamento.quadras as unknown as { nome: string })?.nome}</td>
              <td>{(agendamento.clientes as unknown as { nome: string })?.nome}</td>
              <td>{agendamento.status}</td>
              <td>
                {agendamento.status === "confirmado" ? (
                  <form action={cancelarAgendamento}>
                    <input type="hidden" name="id" value={agendamento.id} />
                    <button type="submit" className="text-neutral-600 underline">
                      Cancelar
                    </button>
                  </form>
                ) : null}
              </td>
            </tr>
          ))}
          {agendamentos?.length === 0 ? (
            <tr>
              <td colSpan={5} className="py-4 text-neutral-500">
                Nenhum agendamento para este dia
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
