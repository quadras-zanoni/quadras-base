import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { atualizarCliente } from "../../actions";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";

export default async function EditarClientePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: cliente } = await supabase
    .from("clientes")
    .select("id, nome, telefone, cpf, endereco")
    .eq("id", id)
    .maybeSingle();

  if (!cliente) notFound();

  return (
    <div className="max-w-xl space-y-6">
      <PageHeader titulo="Editar Cliente" />

      <Card>
        <form action={atualizarCliente} className="space-y-3">
          <input type="hidden" name="id" value={cliente.id} />
          <div className="space-y-1">
            <label className="text-sm text-neutral-500">Nome</label>
            <Input name="nome" defaultValue={cliente.nome} required />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-neutral-500">Telefone/WhatsApp</label>
            <Input name="telefone" defaultValue={cliente.telefone} required />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-neutral-500">CPF (opcional)</label>
            <Input name="cpf" defaultValue={cliente.cpf ?? ""} placeholder="000.000.000-00" />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-neutral-500">Endereço (opcional)</label>
            <Input name="endereco" defaultValue={cliente.endereco ?? ""} placeholder="Rua, número, bairro" />
          </div>
          <div className="flex gap-2">
            <Button type="submit">Salvar</Button>
            <a href="/clientes">
              <Button type="button" variant="secondary">
                Cancelar
              </Button>
            </a>
          </div>
        </form>
      </Card>
    </div>
  );
}
