import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buscarTenantPorToken } from "@/lib/tenant";

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const tenant = await buscarTenantPorToken(token);
  if (!tenant) return NextResponse.json({ erro: "Link inválido" }, { status: 404 });

  const url = new URL(request.url);
  const quadraId = url.searchParams.get("quadra_id");
  const data = url.searchParams.get("data");
  if (!quadraId || !data) {
    return NextResponse.json({ erro: "Informe quadra_id e data" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: ocupados, error } = await admin
    .from("agendamentos")
    .select("hora_inicio, hora_fim")
    .eq("tenant_id", tenant.id)
    .eq("quadra_id", quadraId)
    .eq("data", data)
    .eq("status", "confirmado");
  if (error) return NextResponse.json({ erro: error.message }, { status: 500 });

  return NextResponse.json({ ocupados });
}
