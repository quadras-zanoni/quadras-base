"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { temConflito } from "@/lib/agenda";
import { AgendamentoInputSchema } from "@/lib/validators/agendamento";

export async function criarAgendamento(formData: FormData) {
  const input = AgendamentoInputSchema.parse({
    quadra_id: formData.get("quadra_id"),
    data: formData.get("data"),
    hora_inicio: formData.get("hora_inicio"),
    hora_fim: formData.get("hora_fim"),
    recorrente: formData.get("recorrente") === "on",
    cliente_id: formData.get("cliente_id") || undefined,
    cliente_novo_nome: formData.get("cliente_novo_nome") || undefined,
    cliente_novo_telefone: formData.get("cliente_novo_telefone") || undefined,
  });

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const tenantId = userData.user?.app_metadata.tenant_id as string;

  const { data: existentes } = await supabase
    .from("agendamentos")
    .select("hora_inicio, hora_fim")
    .eq("quadra_id", input.quadra_id)
    .eq("data", input.data)
    .eq("status", "confirmado");

  if (temConflito(existentes ?? [], { hora_inicio: input.hora_inicio, hora_fim: input.hora_fim })) {
    redirect(`/agendamentos/novo?erro=${encodeURIComponent("Já existe um agendamento nesse horário")}`);
  }

  let clienteId = input.cliente_id;
  if (!clienteId) {
    const { data: clienteExistente } = await supabase
      .from("clientes")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("telefone", input.cliente_novo_telefone)
      .maybeSingle();

    if (clienteExistente) {
      clienteId = clienteExistente.id;
    } else {
      const { data: novoCliente, error: clienteError } = await supabase
        .from("clientes")
        .insert({
          tenant_id: tenantId,
          nome: input.cliente_novo_nome,
          telefone: input.cliente_novo_telefone,
        })
        .select("id")
        .single();
      if (clienteError) throw clienteError;
      clienteId = novoCliente.id;
    }
  }

  const { error } = await supabase.from("agendamentos").insert({
    tenant_id: tenantId,
    quadra_id: input.quadra_id,
    cliente_id: clienteId,
    data: input.data,
    hora_inicio: input.hora_inicio,
    hora_fim: input.hora_fim,
    recorrente: input.recorrente,
    origem: "admin",
    status: "confirmado",
  });
  if (error) throw error;

  redirect(`/agenda?data=${input.data}`);
}
