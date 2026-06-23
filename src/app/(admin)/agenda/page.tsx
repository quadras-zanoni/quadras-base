import { createClient } from "@/lib/supabase/server";
import { cancelarAgendamento } from "./actions";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

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

  const [{ data: agendamentos }, { data: quadras }] = await Promise.all([
    query,
    supabase.from("quadras").select("id, nome").order("nome"),
  ]);

  const selectClass =
    "rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400";

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold tracking-tight">Agenda do Dia</h1>

      <Card>
        <form method="get" className="flex flex-wrap items-end gap-2">
          <Input name="data" type="date" defaultValue={data} className="w-44" />
          <select name="quadra" defaultValue={params.quadra ?? ""} className={selectClass}>
            <option value="">Todas as quadras</option>
            {(quadras ?? []).map((quadra) => (
              <option key={quadra.id} value={quadra.id}>
                {quadra.nome}
              </option>
            ))}
          </select>
          <select name="status" defaultValue={params.status ?? ""} className={selectClass}>
            <option value="">Todos os status</option>
            <option value="confirmado">Confirmado</option>
            <option value="cancelado">Cancelado</option>
          </select>
          <Button type="submit" variant="secondary">
            Filtrar
          </Button>
        </form>
      </Card>

      <Card className="overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-neutral-500">
              <th className="px-5 py-3 font-medium">Horário</th>
              <th className="font-medium">Quadra</th>
              <th className="font-medium">Cliente</th>
              <th className="font-medium">Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {(agendamentos ?? []).map((agendamento) => (
              <tr key={agendamento.id} className="border-b border-neutral-100 last:border-0">
                <td className="px-5 py-3">
                  {agendamento.hora_inicio}–{agendamento.hora_fim}
                  {agendamento.recorrente ? " 🔁" : ""}
                </td>
                <td>{(agendamento.quadras as unknown as { nome: string })?.nome}</td>
                <td>{(agendamento.clientes as unknown as { nome: string })?.nome}</td>
                <td>
                  <Badge tone={agendamento.status === "confirmado" ? "success" : "neutral"}>
                    {agendamento.status}
                  </Badge>
                </td>
                <td className="px-5">
                  {agendamento.status === "confirmado" ? (
                    <form action={cancelarAgendamento}>
                      <input type="hidden" name="id" value={agendamento.id} />
                      <button type="submit" className="text-sm text-neutral-500 underline hover:text-neutral-900">
                        Cancelar
                      </button>
                    </form>
                  ) : null}
                </td>
              </tr>
            ))}
            {agendamentos?.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-6 text-neutral-500">
                  Nenhum agendamento para este dia
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
