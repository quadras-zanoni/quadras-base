import { LandPlot } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { centavosParaReais } from "@/lib/money";
import { ESPORTES_DISPONIVEIS } from "@/lib/esportes";
import { criarQuadra, alternarAtivaQuadra, excluirQuadra } from "./actions";
import { ExcluirQuadraBotao } from "./excluir-quadra-botao";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";

export default async function QuadrasPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;
  const supabase = await createClient();
  const { data: quadras } = await supabase
    .from("quadras")
    .select("id, nome, tipos_esporte, preco_hora_centavos, ativa")
    .order("nome");

  const total = quadras?.length ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader titulo="Quadras" subtitulo={`${total} quadra${total === 1 ? "" : "s"} cadastrada${total === 1 ? "" : "s"}`} />
      {erro ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{erro}</p> : null}

      <Card>
        <form action={criarQuadra} className="space-y-3">
          <div className="flex flex-wrap items-end gap-2">
            <Input name="nome" placeholder="Nome" required className="w-40" />
            <Input
              name="preco_hora_reais"
              type="number"
              min="0"
              step="0.01"
              placeholder="Preço/hora (R$)"
              required
              className="w-40"
            />
            <Button type="submit">Nova quadra</Button>
          </div>
          <div className="flex flex-wrap gap-4">
            {ESPORTES_DISPONIVEIS.map((esporte) => (
              <label key={esporte.valor} className="flex items-center gap-2 text-sm text-neutral-700">
                <input type="checkbox" name="tipos_esporte" value={esporte.valor} className="rounded border-neutral-300" />
                {esporte.rotulo}
              </label>
            ))}
          </div>
        </form>
      </Card>

      <Card className="overflow-hidden p-0">
        {total === 0 ? (
          <EmptyState
            icon={<LandPlot size={20} />}
            titulo="Nenhuma quadra cadastrada"
            descricao="Cadastre a primeira quadra acima para começar a receber agendamentos."
          />
        ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-neutral-500">
              <th className="px-5 py-3 font-medium">Nome</th>
              <th className="font-medium">Esportes</th>
              <th className="font-medium">Preço/hora</th>
              <th className="font-medium">Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {(quadras ?? []).map((quadra) => (
              <tr key={quadra.id} className="border-b border-neutral-100 last:border-0">
                <td className="px-5 py-3">{quadra.nome}</td>
                <td>{(quadra.tipos_esporte ?? []).join(", ")}</td>
                <td>{centavosParaReais(quadra.preco_hora_centavos)}</td>
                <td>
                  <Badge tone={quadra.ativa ? "success" : "neutral"}>
                    {quadra.ativa ? "Ativa" : "Inativa"}
                  </Badge>
                </td>
                <td className="space-x-3 px-5">
                  <form action={alternarAtivaQuadra} className="inline">
                    <input type="hidden" name="id" value={quadra.id} />
                    <input type="hidden" name="ativa" value={String(quadra.ativa)} />
                    <button type="submit" className="text-sm text-neutral-500 underline hover:text-neutral-900">
                      {quadra.ativa ? "Desativar" : "Ativar"}
                    </button>
                  </form>
                  <form action={excluirQuadra} className="inline">
                    <input type="hidden" name="id" value={quadra.id} />
                    <ExcluirQuadraBotao />
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        )}
      </Card>
    </div>
  );
}
