export interface StatusAssinatura {
  ativo: boolean;
  dias_restantes: number;
}

// Mock do contrato do futuro Quadras Hub (design doc §7). Hoje lê
// tenants.status_assinatura direto; quando o Hub existir, só o
// chamador (src/app/api/subscription/check/route.ts) muda para
// buscar isso de lá em vez do banco local — esta função e seu
// formato de retorno continuam os mesmos.
export function avaliarStatusAssinatura(statusAssinatura: string): StatusAssinatura {
  const ativo = statusAssinatura === "ativo";
  return { ativo, dias_restantes: ativo ? 30 : 0 };
}
