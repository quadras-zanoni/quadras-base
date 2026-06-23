import { headers } from "next/headers";
import { Link2, MessageCircleMore, CheckCircle2 } from "lucide-react";
import { buscarTenantPorSlug } from "@/lib/tenant";
import { atualizarWhatsappAvisos } from "./actions";
import { CopiarLinkBotao } from "./copiar-link-botao";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

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
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100">
            <Link2 size={16} className="text-neutral-700" />
          </span>
          <p className="text-sm font-medium text-neutral-700">Seu link de reservas</p>
        </div>
        <p className="text-xs text-neutral-500">
          Compartilhe esse link com seus clientes pra que eles possam reservar uma quadra online, sem precisar te
          chamar no WhatsApp.
        </p>
        <p className="break-all rounded-lg bg-neutral-50 px-3 py-2 text-sm">{link}</p>
        <div className="flex gap-2">
          <CopiarLinkBotao link={link} />
          <a href={link} target="_blank" rel="noopener noreferrer">
            <Button type="button" variant="secondary">
              Abrir
            </Button>
          </a>
        </div>
      </Card>

      <Card className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100">
            <MessageCircleMore size={16} className="text-neutral-700" />
          </span>
          <p className="text-sm font-medium text-neutral-700">WhatsApp de avisos</p>
        </div>
        <p className="text-xs text-neutral-500">
          Toda vez que um cliente reservar pelo link acima, um aviso é enviado automaticamente pra esse número.
        </p>

        {tenant.whatsapp_avisos ? (
          <div className="flex items-center gap-2">
            <Badge tone="success">Ativo</Badge>
            <p className="text-sm text-neutral-600">
              Avisos de reserva sendo enviados para{" "}
              <span className="font-medium text-neutral-900">
                {tenant.whatsapp_avisos_nome || "este número"}
              </span>{" "}
              ({tenant.whatsapp_avisos})
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Badge tone="neutral">Inativo</Badge>
            <p className="text-sm text-neutral-600">Nenhum número configurado para avisos ainda.</p>
          </div>
        )}

        <form action={atualizarWhatsappAvisos} className="space-y-3">
          <div className="space-y-1">
            <label className="text-sm text-neutral-500">Nome (ex: Santana)</label>
            <Input
              name="whatsapp_avisos_nome"
              defaultValue={tenant.whatsapp_avisos_nome ?? ""}
              placeholder="Quem recebe os avisos"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-neutral-500">Número de WhatsApp para avisos</label>
            <Input name="whatsapp_avisos" defaultValue={tenant.whatsapp_avisos ?? ""} placeholder="Ex: 51999998888" />
          </div>
          <Button type="submit">Salvar</Button>
        </form>
      </Card>

      <Card className="space-y-3">
        <p className="text-sm font-medium text-neutral-700">Como funciona</p>
        <ul className="space-y-2">
          {[
            "O cliente abre o link e escolhe a quadra",
            "Escolhe o dia e o horário disponível",
            "Preenche o nome e o WhatsApp e confirma",
            "A reserva já aparece na sua Agenda do Dia",
            "Você recebe um aviso no WhatsApp configurado acima",
          ].map((passo) => (
            <li key={passo} className="flex items-start gap-2 text-sm text-neutral-600">
              <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-neutral-400" />
              {passo}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
