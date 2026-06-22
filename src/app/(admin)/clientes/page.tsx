import { createClient } from "@/lib/supabase/server";
import { criarCliente } from "./actions";

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

  return (
    <div className="space-y-8">
      <h1 className="text-lg font-semibold">Clientes</h1>

      <form method="get" className="flex gap-2">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Buscar por nome ou telefone"
          className="border border-neutral-300 px-2 py-1 text-sm"
        />
        <button type="submit" className="border border-neutral-300 px-3 py-1.5 text-sm">
          Buscar
        </button>
      </form>

      <form action={criarCliente} className="flex flex-wrap items-end gap-2">
        <input name="nome" placeholder="Nome" required className="border border-neutral-300 px-2 py-1 text-sm" />
        <input
          name="telefone"
          placeholder="Telefone/WhatsApp"
          required
          className="border border-neutral-300 px-2 py-1 text-sm"
        />
        <button type="submit" className="bg-black px-3 py-1.5 text-sm text-white">
          Novo cliente
        </button>
      </form>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-200 text-left text-neutral-500">
            <th className="py-2">Nome</th>
            <th>Telefone</th>
          </tr>
        </thead>
        <tbody>
          {(clientes ?? []).map((cliente) => (
            <tr key={cliente.id} className="border-b border-neutral-100">
              <td className="py-2">{cliente.nome}</td>
              <td>{cliente.telefone}</td>
            </tr>
          ))}
          {clientes?.length === 0 ? (
            <tr>
              <td colSpan={2} className="py-4 text-neutral-500">
                Nenhum cliente ainda
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
