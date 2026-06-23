import { createClient } from "@/lib/supabase/server";
import { centavosParaReais } from "@/lib/money";
import { criarQuadra, alternarAtivaQuadra } from "./actions";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

export default async function QuadrasPage() {
  const supabase = await createClient();
  const { data: quadras } = await supabase
    .from("quadras")
    .select("id, nome, tipo_esporte, preco_hora_centavos, ativa")
    .order("nome");

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold tracking-tight">Quadras</h1>

      <Card>
        <form action={criarQuadra} className="flex flex-wrap items-end gap-2">
          <Input name="nome" placeholder="Nome" required className="w-40" />
          <Input name="tipo_esporte" placeholder="Tipo de esporte" required className="w-40" />
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
        </form>
      </Card>

      <Card className="overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-neutral-500">
              <th className="px-5 py-3 font-medium">Nome</th>
              <th className="font-medium">Esporte</th>
              <th className="font-medium">Preço/hora</th>
              <th className="font-medium">Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {(quadras ?? []).map((quadra) => (
              <tr key={quadra.id} className="border-b border-neutral-100 last:border-0">
                <td className="px-5 py-3">{quadra.nome}</td>
                <td>{quadra.tipo_esporte}</td>
                <td>{centavosParaReais(quadra.preco_hora_centavos)}</td>
                <td>
                  <Badge tone={quadra.ativa ? "success" : "neutral"}>
                    {quadra.ativa ? "Ativa" : "Inativa"}
                  </Badge>
                </td>
                <td className="px-5">
                  <form action={alternarAtivaQuadra}>
                    <input type="hidden" name="id" value={quadra.id} />
                    <input type="hidden" name="ativa" value={String(quadra.ativa)} />
                    <button type="submit" className="text-sm text-neutral-500 underline hover:text-neutral-900">
                      {quadra.ativa ? "Desativar" : "Ativar"}
                    </button>
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
