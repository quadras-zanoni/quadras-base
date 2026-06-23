import { Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { criarCliente } from "./actions";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const supabase = await createClient();

  let query = supabase.from("clientes").select("id, nome, telefone, criado_em").order("nome");
  if (q) {
    query = query.or(`nome.ilike.%${q}%,telefone.ilike.%${q}%`);
  }
  const { data: clientes } = await query;

  const total = clientes?.length ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader titulo="Clientes" subtitulo={`${total} cliente${total === 1 ? "" : "s"} cadastrado${total === 1 ? "" : "s"}`} />

      <Card>
        <div className="flex flex-wrap items-end gap-4">
          <form method="get" className="flex gap-2">
            <Input name="q" defaultValue={q ?? ""} placeholder="Buscar por nome ou telefone" className="w-64" />
            <Button type="submit" variant="secondary">
              Buscar
            </Button>
          </form>

          <form action={criarCliente} className="flex flex-wrap items-end gap-2">
            <Input name="nome" placeholder="Nome" required className="w-40" />
            <Input name="telefone" placeholder="Telefone/WhatsApp" required className="w-44" />
            <Button type="submit">Novo cliente</Button>
          </form>
        </div>
      </Card>

      <Card className="overflow-hidden p-0">
        {total === 0 ? (
          <EmptyState
            icon={<Users size={20} />}
            titulo="Nenhum cliente ainda"
            descricao="Criados automaticamente ao fazer agendamentos, ou cadastre um acima."
          />
        ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-neutral-500">
              <th className="px-5 py-3 font-medium">Nome</th>
              <th className="font-medium">Telefone</th>
            </tr>
          </thead>
          <tbody>
            {(clientes ?? []).map((cliente) => (
              <tr key={cliente.id} className="border-b border-neutral-100 last:border-0">
                <td className="px-5 py-3">{cliente.nome}</td>
                <td>{cliente.telefone}</td>
              </tr>
            ))}
          </tbody>
        </table>
        )}
      </Card>
    </div>
  );
}
