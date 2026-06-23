import { createClient } from "@/lib/supabase/server";
import { centavosParaReais } from "@/lib/money";
import { criarProduto, alternarAtivoProduto, excluirProduto } from "./actions";
import { ExcluirProdutoBotao } from "./excluir-produto-botao";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

export default async function EstoquePage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;
  const supabase = await createClient();
  const { data: produtos } = await supabase
    .from("produtos")
    .select("id, nome, categoria, custo_centavos, preco_centavos, quantidade_estoque, estoque_minimo, ativo")
    .order("nome");

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold tracking-tight">Estoque</h1>
      {erro ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{erro}</p> : null}

      <Card>
        <form action={criarProduto} className="flex flex-wrap items-end gap-2">
          <Input name="nome" placeholder="Nome" required className="w-40" />
          <Input name="categoria" placeholder="Categoria" className="w-32" />
          <Input name="custo_reais" type="number" min="0" step="0.01" placeholder="Custo (R$)" className="w-32" />
          <Input
            name="preco_reais"
            type="number"
            min="0"
            step="0.01"
            placeholder="Valor de venda (R$)"
            required
            className="w-40"
          />
          <Input name="quantidade_inicial" type="number" min="0" placeholder="Estoque atual" className="w-32" />
          <Input name="estoque_minimo" type="number" min="0" placeholder="Estoque mínimo" className="w-32" />
          <Button type="submit">Novo produto</Button>
        </form>
      </Card>

      <Card className="overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-neutral-500">
              <th className="px-5 py-3 font-medium">Nome</th>
              <th className="font-medium">Categoria</th>
              <th className="font-medium">Custo</th>
              <th className="font-medium">Venda</th>
              <th className="font-medium">Estoque</th>
              <th className="font-medium">Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {(produtos ?? []).map((produto) => (
              <tr key={produto.id} className="border-b border-neutral-100 last:border-0">
                <td className="px-5 py-3">{produto.nome}</td>
                <td>{produto.categoria}</td>
                <td>{centavosParaReais(produto.custo_centavos)}</td>
                <td>{centavosParaReais(produto.preco_centavos)}</td>
                <td>
                  <span className="mr-2">{produto.quantidade_estoque}</span>
                  {produto.quantidade_estoque <= produto.estoque_minimo ? (
                    <Badge tone="danger">estoque baixo</Badge>
                  ) : null}
                </td>
                <td>
                  <Badge tone={produto.ativo ? "success" : "neutral"}>
                    {produto.ativo ? "Ativo" : "Inativo"}
                  </Badge>
                </td>
                <td className="space-x-3 px-5">
                  <form action={alternarAtivoProduto} className="inline">
                    <input type="hidden" name="id" value={produto.id} />
                    <input type="hidden" name="ativo" value={String(produto.ativo)} />
                    <button type="submit" className="text-sm text-neutral-500 underline hover:text-neutral-900">
                      {produto.ativo ? "Desativar" : "Ativar"}
                    </button>
                  </form>
                  <form action={excluirProduto} className="inline">
                    <input type="hidden" name="id" value={produto.id} />
                    <ExcluirProdutoBotao />
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
