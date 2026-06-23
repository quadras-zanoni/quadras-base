import { NextResponse } from "next/server";
import { buscarTenantPorSlug } from "@/lib/tenant";
import { avaliarStatusAssinatura } from "@/lib/subscription";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("tenant");
  if (!slug) return NextResponse.json({ erro: "Parâmetro tenant obrigatório" }, { status: 400 });

  const tenant = await buscarTenantPorSlug(slug);
  if (!tenant) return NextResponse.json({ erro: "Tenant não encontrado" }, { status: 404 });

  return NextResponse.json(avaliarStatusAssinatura(tenant.status_assinatura));
}
