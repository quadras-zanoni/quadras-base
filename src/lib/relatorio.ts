import { horaParaMinutos } from "./agenda";

export interface AgendamentoReceita {
  hora_inicio: string;
  hora_fim: string;
  preco_hora_centavos: number;
  status: "confirmado" | "cancelado";
  quadra_nome: string;
}

export function duracaoHoras(hora_inicio: string, hora_fim: string): number {
  return (horaParaMinutos(hora_fim) - horaParaMinutos(hora_inicio)) / 60;
}

export function receitaDeAgendamento(
  agendamento: Pick<AgendamentoReceita, "hora_inicio" | "hora_fim" | "preco_hora_centavos">
): number {
  return Math.round(
    duracaoHoras(agendamento.hora_inicio, agendamento.hora_fim) * agendamento.preco_hora_centavos
  );
}

export function receitaTotalAgendamentos(agendamentos: AgendamentoReceita[]): number {
  return agendamentos
    .filter((a) => a.status === "confirmado")
    .reduce((total, a) => total + receitaDeAgendamento(a), 0);
}

export function contarCancelamentos(agendamentos: { status: string }[]): number {
  return agendamentos.filter((a) => a.status === "cancelado").length;
}

export function receitaPorQuadra(agendamentos: AgendamentoReceita[]): Record<string, number> {
  return agendamentos
    .filter((a) => a.status === "confirmado")
    .reduce((acc, a) => {
      acc[a.quadra_nome] = (acc[a.quadra_nome] ?? 0) + receitaDeAgendamento(a);
      return acc;
    }, {} as Record<string, number>);
}

export function agruparVendasPorFormaPagamento(
  vendas: { forma_pagamento: string; valor_total_centavos: number }[]
): Record<string, number> {
  return vendas.reduce((acc, v) => {
    acc[v.forma_pagamento] = (acc[v.forma_pagamento] ?? 0) + v.valor_total_centavos;
    return acc;
  }, {} as Record<string, number>);
}

export function receitaTotalVendas(vendas: { valor_total_centavos: number }[]): number {
  return vendas.reduce((total, v) => total + v.valor_total_centavos, 0);
}

// Janela de operação padrão considerada para a taxa de ocupação (10h–22h).
// Não há configuração de horário de funcionamento por arena nesta v1.
export const HORAS_OPERACAO_PADRAO = 12;

export function taxaOcupacao(horasReservadasHoje: number, quadrasAtivas: number): number {
  if (quadrasAtivas === 0) return 0;
  return horasReservadasHoje / (quadrasAtivas * HORAS_OPERACAO_PADRAO);
}
