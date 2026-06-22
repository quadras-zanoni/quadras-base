import { createClient } from "@/lib/supabase/server";
import { criarAgendamento } from "./actions";

export default async function NovoAgendamentoPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;
  const supabase = await createClient();
  const { data: quadras } = await supabase
    .from("quadras")
    .select("id, nome")
    .eq("ativa", true)
    .order("nome");
  const { data: clientes } = await supabase
    .from("clientes")
    .select("id, nome, telefone")
    .order("nome");

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-lg font-semibold">Novo Agendamento</h1>
      {erro ? <p className="text-sm text-red-600">{erro}</p> : null}

      <form action={criarAgendamento} className="space-y-4">
        <select name="quadra_id" required className="w-full border border-neutral-300 px-2 py-1.5 text-sm">
          <option value="">Selecione a quadra</option>
          {(quadras ?? []).map((quadra) => (
            <option key={quadra.id} value={quadra.id}>
              {quadra.nome}
            </option>
          ))}
        </select>

        <div className="flex gap-2">
          <input name="data" type="date" required className="border border-neutral-300 px-2 py-1.5 text-sm" />
          <input name="hora_inicio" type="time" required className="border border-neutral-300 px-2 py-1.5 text-sm" />
          <input name="hora_fim" type="time" required className="border border-neutral-300 px-2 py-1.5 text-sm" />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="recorrente" /> Horário fixo (recorrente)
        </label>

        <select name="cliente_id" className="w-full border border-neutral-300 px-2 py-1.5 text-sm">
          <option value="">— Cliente novo —</option>
          {(clientes ?? []).map((cliente) => (
            <option key={cliente.id} value={cliente.id}>
              {cliente.nome} ({cliente.telefone})
            </option>
          ))}
        </select>

        <div className="flex gap-2">
          <input
            name="cliente_novo_nome"
            placeholder="Nome do cliente novo"
            className="border border-neutral-300 px-2 py-1.5 text-sm"
          />
          <input
            name="cliente_novo_telefone"
            placeholder="Telefone do cliente novo"
            className="border border-neutral-300 px-2 py-1.5 text-sm"
          />
        </div>

        <button type="submit" className="bg-black px-4 py-2 text-sm text-white">
          Criar agendamento
        </button>
      </form>
    </div>
  );
}
