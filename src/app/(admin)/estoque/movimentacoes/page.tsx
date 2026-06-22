import { createClient } from "@/lib/supabase/server";
import { criarMovimentacao } from "./actions";

export default async function MovimentacoesPage() {
  const supabase = await createClient();
  const { data: produtos } = await supabase.from("produtos").select("id, nome").order("nome");
  const { data: movimentacoes } = await supabase
    .from("movimentacoes_estoque")
    .select("id, tipo, quantidade, motivo, criado_em, produtos(nome)")
    .order("criado_em", { ascending: false })
    .limit(50);

  return (
    <div className="space-y-8">
      <h1 className="text-lg font-semibold">Movimentações de Estoque</h1>

      <form action={criarMovimentacao} className="flex flex-wrap items-end gap-2">
        <select name="produto_id" required className="border border-neutral-300 px-2 py-1 text-sm">
          <option value="">Produto</option>
          {(produtos ?? []).map((produto) => (
            <option key={produto.id} value={produto.id}>
              {produto.nome}
            </option>
          ))}
        </select>
        <select name="tipo" required className="border border-neutral-300 px-2 py-1 text-sm">
          <option value="entrada">Entrada</option>
          <option value="saida">Saída</option>
        </select>
        <input
          name="quantidade"
          type="number"
          min="1"
          placeholder="Quantidade"
          required
          className="border border-neutral-300 px-2 py-1 text-sm"
        />
        <input name="motivo" placeholder="Motivo" className="border border-neutral-300 px-2 py-1 text-sm" />
        <button type="submit" className="bg-black px-3 py-1.5 text-sm text-white">
          Registrar
        </button>
      </form>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-neutral-500">
            <th className="py-2">Data</th>
            <th>Produto</th>
            <th>Tipo</th>
            <th>Quantidade</th>
            <th>Motivo</th>
          </tr>
        </thead>
        <tbody>
          {(movimentacoes ?? []).map((movimentacao) => (
            <tr key={movimentacao.id} className="border-b border-neutral-100">
              <td className="py-2">{new Date(movimentacao.criado_em).toLocaleString("pt-BR")}</td>
              <td>{(movimentacao.produtos as unknown as { nome: string })?.nome}</td>
              <td>{movimentacao.tipo}</td>
              <td>{movimentacao.quantidade}</td>
              <td>{movimentacao.motivo}</td>
            </tr>
          ))}
          {movimentacoes?.length === 0 ? (
            <tr>
              <td colSpan={5} className="py-4 text-neutral-500">
                Nenhuma movimentação registrada
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
