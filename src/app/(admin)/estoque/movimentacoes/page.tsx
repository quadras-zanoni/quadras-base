import { createClient } from "@/lib/supabase/server";
import { criarMovimentacao } from "./actions";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default async function MovimentacoesPage() {
  const supabase = await createClient();
  const [{ data: produtos }, { data: movimentacoes }] = await Promise.all([
    supabase.from("produtos").select("id, nome").order("nome"),
    supabase
      .from("movimentacoes_estoque")
      .select("id, tipo, quantidade, motivo, criado_em, produtos(nome)")
      .order("criado_em", { ascending: false })
      .limit(50),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold tracking-tight">Movimentações de Estoque</h1>

      <Card>
        <form action={criarMovimentacao} className="flex flex-wrap items-end gap-2">
          <select
            name="produto_id"
            required
            className="rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400"
          >
            <option value="">Produto</option>
            {(produtos ?? []).map((produto) => (
              <option key={produto.id} value={produto.id}>
                {produto.nome}
              </option>
            ))}
          </select>
          <select
            name="tipo"
            required
            className="rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400"
          >
            <option value="entrada">Entrada</option>
            <option value="saida">Saída</option>
          </select>
          <Input name="quantidade" type="number" min="1" placeholder="Quantidade" required className="w-32" />
          <Input
            name="valor_pago_reais"
            type="number"
            min="0"
            step="0.01"
            placeholder="Valor pago (R$)"
            className="w-36"
          />
          <Input name="motivo" placeholder="Motivo" className="w-40" />
          <Button type="submit">Registrar</Button>
        </form>
        <p className="mt-2 text-xs text-neutral-500">
          Em uma entrada, preencher o valor pago total recalcula o custo médio do produto automaticamente.
        </p>
      </Card>

      <Card className="overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-neutral-500">
              <th className="px-5 py-3 font-medium">Data</th>
              <th className="font-medium">Produto</th>
              <th className="font-medium">Tipo</th>
              <th className="font-medium">Quantidade</th>
              <th className="font-medium">Motivo</th>
            </tr>
          </thead>
          <tbody>
            {(movimentacoes ?? []).map((movimentacao) => (
              <tr key={movimentacao.id} className="border-b border-neutral-100 last:border-0">
                <td className="px-5 py-3">{new Date(movimentacao.criado_em).toLocaleString("pt-BR")}</td>
                <td>{(movimentacao.produtos as unknown as { nome: string })?.nome}</td>
                <td className="capitalize">{movimentacao.tipo}</td>
                <td>{movimentacao.quantidade}</td>
                <td>{movimentacao.motivo}</td>
              </tr>
            ))}
            {movimentacoes?.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-6 text-neutral-500">
                  Nenhuma movimentação registrada
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
