import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buscarTenantPorToken } from "@/lib/tenant";
import { temConflito } from "@/lib/agenda";
import { AgendamentoPublicoInputSchema } from "@/lib/validators/agendamento-publico";

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const tenant = await buscarTenantPorToken(token);
  if (!tenant) return NextResponse.json({ erro: "Link inválido" }, { status: 404 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ erro: "Corpo da requisição inválido" }, { status: 400 });
  }
  const parsed = AgendamentoPublicoInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ erro: parsed.error.flatten() }, { status: 400 });
  }
  const input = parsed.data;
  const admin = createAdminClient();

  const { data: quadra } = await admin
    .from("quadras")
    .select("id, tipos_esporte")
    .eq("id", input.quadra_id)
    .eq("tenant_id", tenant.id)
    .eq("ativa", true)
    .maybeSingle();

  if (!quadra) {
    return NextResponse.json({ erro: "Quadra inválida" }, { status: 404 });
  }

  if (!quadra.tipos_esporte.includes(input.esporte)) {
    return NextResponse.json({ erro: "Essa quadra não oferece esse esporte" }, { status: 400 });
  }

  const { data: existentes } = await admin
    .from("agendamentos")
    .select("hora_inicio, hora_fim")
    .eq("tenant_id", tenant.id)
    .eq("quadra_id", input.quadra_id)
    .eq("data", input.data)
    .eq("status", "confirmado");

  if (temConflito(existentes ?? [], { hora_inicio: input.hora_inicio, hora_fim: input.hora_fim })) {
    return NextResponse.json({ erro: "Esse horário já foi reservado" }, { status: 409 });
  }

  const telefoneLimpo = input.telefone.replace(/\D/g, "");
  const { data: clienteExistente } = await admin
    .from("clientes")
    .select("id")
    .eq("tenant_id", tenant.id)
    .eq("telefone", telefoneLimpo)
    .maybeSingle();

  let clienteId = clienteExistente?.id as string | undefined;
  if (!clienteId) {
    const { data: novoCliente, error: clienteError } = await admin
      .from("clientes")
      .insert({ tenant_id: tenant.id, nome: input.nome, telefone: telefoneLimpo })
      .select("id")
      .single();
    if (clienteError) return NextResponse.json({ erro: clienteError.message }, { status: 500 });
    clienteId = novoCliente.id;
  } else {
    // O nome digitado agora é mais confiável que o que já estava salvo
    // (ex.: o número já existia com um nome de teste/antigo).
    const { error: nomeError } = await admin.from("clientes").update({ nome: input.nome }).eq("id", clienteId);
    if (nomeError) return NextResponse.json({ erro: nomeError.message }, { status: 500 });
  }

  const { data: agendamento, error } = await admin
    .from("agendamentos")
    .insert({
      tenant_id: tenant.id,
      quadra_id: input.quadra_id,
      cliente_id: clienteId,
      data: input.data,
      hora_inicio: input.hora_inicio,
      hora_fim: input.hora_fim,
      esporte: input.esporte,
      origem: "link_publico",
      status: "confirmado",
    })
    .select()
    .single();
  if (error) return NextResponse.json({ erro: error.message }, { status: 500 });

  return NextResponse.json({
    agendamento,
    whatsapp_avisos: tenant.whatsapp_avisos,
    nome_exibicao: tenant.nome_exibicao,
  });
}
