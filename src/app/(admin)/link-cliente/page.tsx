import { headers } from "next/headers";
import { buscarTenantPorSlug } from "@/lib/tenant";
import { atualizarWhatsappAvisos } from "./actions";
import { CopiarLinkBotao } from "./copiar-link-botao";

export default async function LinkClientePage() {
  const headerList = await headers();
  const slug = headerList.get("x-tenant-slug") ?? "base";
  const tenant = await buscarTenantPorSlug(slug);
  if (!tenant) return null;

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const link = `${baseUrl}/r/${tenant.token_link_publico}`;

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-lg font-semibold">Link do Cliente</h1>

      <div className="space-y-2 border border-neutral-200 p-4">
        <p className="text-sm text-neutral-500">Seu link de reservas</p>
        <p className="break-all text-sm">{link}</p>
        <CopiarLinkBotao link={link} />
      </div>

      <form action={atualizarWhatsappAvisos} className="space-y-2 border border-neutral-200 p-4">
        <label className="text-sm text-neutral-500">Número de WhatsApp para avisos</label>
        <input
          name="whatsapp_avisos"
          defaultValue={tenant.whatsapp_avisos ?? ""}
          placeholder="Ex: 51999998888"
          className="w-full border border-neutral-300 px-2 py-1.5 text-sm"
        />
        <button type="submit" className="bg-black px-3 py-1.5 text-sm text-white">
          Salvar
        </button>
      </form>
    </div>
  );
}
