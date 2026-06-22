import { createClient } from "@/lib/supabase/server";
import { centavosParaReais } from "@/lib/money";
import { criarQuadra, alternarAtivaQuadra } from "./actions";

export default async function QuadrasPage() {
  const supabase = await createClient();
  const { data: quadras } = await supabase
    .from("quadras")
    .select("id, nome, tipo_esporte, preco_hora_centavos, ativa")
    .order("nome");

  return (
    <div className="space-y-8">
      <h1 className="text-lg font-semibold">Quadras</h1>

      <form action={criarQuadra} className="flex flex-wrap items-end gap-2">
        <input name="nome" placeholder="Nome" required className="border border-neutral-300 px-2 py-1 text-sm" />
        <input
          name="tipo_esporte"
          placeholder="Tipo de esporte"
          required
          className="border border-neutral-300 px-2 py-1 text-sm"
        />
        <input
          name="preco_hora_centavos"
          type="number"
          min="0"
          placeholder="Preço/hora (centavos)"
          required
          className="border border-neutral-300 px-2 py-1 text-sm"
        />
        <button type="submit" className="bg-black px-3 py-1.5 text-sm text-white">
          Nova quadra
        </button>
      </form>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-neutral-500">
            <th className="py-2">Nome</th>
            <th>Esporte</th>
            <th>Preço/hora</th>
            <th>Status</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {(quadras ?? []).map((quadra) => (
            <tr key={quadra.id} className="border-b border-neutral-100">
              <td className="py-2">{quadra.nome}</td>
              <td>{quadra.tipo_esporte}</td>
              <td>{centavosParaReais(quadra.preco_hora_centavos)}</td>
              <td>{quadra.ativa ? "Ativa" : "Inativa"}</td>
              <td>
                <form action={alternarAtivaQuadra}>
                  <input type="hidden" name="id" value={quadra.id} />
                  <input type="hidden" name="ativa" value={String(quadra.ativa)} />
                  <button type="submit" className="text-neutral-600 underline">
                    {quadra.ativa ? "Desativar" : "Ativar"}
                  </button>
                </form>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
