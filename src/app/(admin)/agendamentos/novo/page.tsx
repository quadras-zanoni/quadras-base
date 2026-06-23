import { createClient } from "@/lib/supabase/server";
import { criarAgendamento } from "./actions";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default async function NovoAgendamentoPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;
  const supabase = await createClient();
  const [{ data: quadras }, { data: clientes }] = await Promise.all([
    supabase.from("quadras").select("id, nome").eq("ativa", true).order("nome"),
    supabase.from("clientes").select("id, nome, telefone").order("nome"),
  ]);

  const selectClass =
    "w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400";

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-xl font-semibold tracking-tight">Novo Agendamento</h1>
      {erro ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{erro}</p> : null}

      <Card>
        <form action={criarAgendamento} className="space-y-4">
          <select name="quadra_id" required className={selectClass}>
            <option value="">Selecione a quadra</option>
            {(quadras ?? []).map((quadra) => (
              <option key={quadra.id} value={quadra.id}>
                {quadra.nome}
              </option>
            ))}
          </select>

          <div className="flex gap-2">
            <Input name="data" type="date" required />
            <Input name="hora_inicio" type="time" required />
            <Input name="hora_fim" type="time" required />
          </div>

          <label className="flex items-center gap-2 text-sm text-neutral-700">
            <input type="checkbox" name="recorrente" className="rounded border-neutral-300" /> Horário fixo
            (recorrente)
          </label>

          <select name="cliente_id" className={selectClass}>
            <option value="">— Cliente novo —</option>
            {(clientes ?? []).map((cliente) => (
              <option key={cliente.id} value={cliente.id}>
                {cliente.nome} ({cliente.telefone})
              </option>
            ))}
          </select>

          <div className="flex gap-2">
            <Input name="cliente_novo_nome" placeholder="Nome do cliente novo" />
            <Input name="cliente_novo_telefone" placeholder="Telefone do cliente novo" />
          </div>

          <Button type="submit">Criar agendamento</Button>
        </form>
      </Card>
    </div>
  );
}
