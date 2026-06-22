import { createClient } from "@/lib/supabase/server";
import { centavosParaReais } from "@/lib/money";
import { criarProduto, alternarAtivoProduto } from "./actions";

export default async function EstoquePage() {
  const supabase = await createClient();
  const { data: produtos } = await supabase
    .from("produtos")
    .select("id, nome, categoria, preco_centavos, quantidade_estoque, estoque_minimo, ativo")
    .order("nome");

  return (
    <div className="space-y-8">
      <h1 className="text-lg font-semibold">Estoque</h1>

      <form action={criarProduto} className="flex flex-wrap items-end gap-2">
        <input name="nome" placeholder="Nome" required className="border border-neutral-300 px-2 py-1 text-sm" />
        <input name="categoria" placeholder="Categoria" className="border border-neutral-300 px-2 py-1 text-sm" />
        <input
          name="preco_centavos"
          type="number"
          min="0"
          placeholder="Preço (centavos)"
          required
          className="border border-neutral-300 px-2 py-1 text-sm"
        />
        <input
          name="estoque_minimo"
          type="number"
          min="0"
          placeholder="Estoque mínimo"
          className="border border-neutral-300 px-2 py-1 text-sm"
        />
        <button type="submit" className="bg-black px-3 py-1.5 text-sm text-white">
          Novo produto
        </button>
      </form>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-neutral-500">
            <th className="py-2">Nome</th>
            <th>Categoria</th>
            <th>Preço</th>
            <th>Estoque</th>
            <th>Status</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {(produtos ?? []).map((produto) => (
            <tr key={produto.id} className="border-b border-neutral-100">
              <td className="py-2">{produto.nome}</td>
              <td>{produto.categoria}</td>
              <td>{centavosParaReais(produto.preco_centavos)}</td>
              <td>
                {produto.quantidade_estoque}
                {produto.quantidade_estoque <= produto.estoque_minimo ? (
                  <span className="ml-2 text-red-600">estoque baixo</span>
                ) : null}
              </td>
              <td>{produto.ativo ? "Ativo" : "Inativo"}</td>
              <td>
                <form action={alternarAtivoProduto}>
                  <input type="hidden" name="id" value={produto.id} />
                  <input type="hidden" name="ativo" value={String(produto.ativo)} />
                  <button type="submit" className="text-neutral-600 underline">
                    {produto.ativo ? "Desativar" : "Ativar"}
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
