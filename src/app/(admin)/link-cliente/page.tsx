import { headers } from "next/headers";
import { buscarTenantPorSlug } from "@/lib/tenant";
import { atualizarWhatsappAvisos } from "./actions";
import { CopiarLinkBotao } from "./copiar-link-botao";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default async function LinkClientePage() {
  const headerList = await headers();
  const slug = headerList.get("x-tenant-slug") ?? "base";
  const tenant = await buscarTenantPorSlug(slug);
  if (!tenant) return null;

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const link = `${baseUrl}/r/${tenant.token_link_publico}`;

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-xl font-semibold tracking-tight">Link do Cliente</h1>

      <Card className="space-y-3">
        <p className="text-sm text-neutral-500">Seu link de reservas</p>
        <p className="break-all text-sm">{link}</p>
        <CopiarLinkBotao link={link} />
      </Card>

      <Card>
        <form action={atualizarWhatsappAvisos} className="space-y-3">
          <label className="text-sm text-neutral-500">Número de WhatsApp para avisos</label>
          <Input name="whatsapp_avisos" defaultValue={tenant.whatsapp_avisos ?? ""} placeholder="Ex: 51999998888" />
          <Button type="submit">Salvar</Button>
        </form>
      </Card>
    </div>
  );
}
