import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { VendaInputSchema } from "@/lib/validators/venda";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ erro: "Corpo da requisição inválido" }, { status: 400 });
  }
  const parsed = VendaInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ erro: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const tenantId = userData.user?.app_metadata.tenant_id as string | undefined;
  if (!tenantId) {
    return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });
  }

  const { data: venda, error } = await supabase.rpc("criar_venda", {
    p_tenant_id: tenantId,
    p_cliente_id: parsed.data.cliente_id ?? null,
    p_forma_pagamento: parsed.data.forma_pagamento,
    p_itens: parsed.data.itens,
  });

  if (error) {
    return NextResponse.json({ erro: error.message }, { status: 500 });
  }

  return NextResponse.json({ venda });
}
