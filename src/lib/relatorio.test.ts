import { describe, expect, it } from "vitest";
import {
  receitaDeAgendamento,
  receitaTotalAgendamentos,
  contarCancelamentos,
  receitaPorQuadra,
  agruparVendasPorFormaPagamento,
  receitaTotalVendas,
} from "./relatorio";

const agendamentoBase = {
  hora_inicio: "10:00",
  hora_fim: "11:00",
  preco_hora_centavos: 10000,
  status: "confirmado" as const,
  quadra_nome: "Quadra 1",
};

describe("receitaDeAgendamento", () => {
  it("multiplica duração pelo preço por hora", () => {
    expect(receitaDeAgendamento(agendamentoBase)).toBe(10000);
  });

  it("calcula corretamente para meia hora", () => {
    expect(receitaDeAgendamento({ ...agendamentoBase, hora_inicio: "10:00", hora_fim: "10:30" })).toBe(5000);
  });
});

describe("receitaTotalAgendamentos", () => {
  it("soma apenas os confirmados", () => {
    const agendamentos = [agendamentoBase, { ...agendamentoBase, status: "cancelado" as const }];
    expect(receitaTotalAgendamentos(agendamentos)).toBe(10000);
  });
});

describe("contarCancelamentos", () => {
  it("conta apenas os cancelados", () => {
    const agendamentos = [{ status: "confirmado" }, { status: "cancelado" }, { status: "cancelado" }];
    expect(contarCancelamentos(agendamentos)).toBe(2);
  });
});

describe("receitaPorQuadra", () => {
  it("agrupa receita confirmada por nome da quadra", () => {
    const agendamentos = [
      agendamentoBase,
      { ...agendamentoBase, quadra_nome: "Quadra 2" },
      { ...agendamentoBase, status: "cancelado" as const, quadra_nome: "Quadra 2" },
    ];
    expect(receitaPorQuadra(agendamentos)).toEqual({ "Quadra 1": 10000, "Quadra 2": 10000 });
  });
});

describe("agruparVendasPorFormaPagamento", () => {
  it("agrupa e soma por forma de pagamento", () => {
    const vendas = [
      { forma_pagamento: "pix", valor_total_centavos: 1000 },
      { forma_pagamento: "pix", valor_total_centavos: 500 },
      { forma_pagamento: "dinheiro", valor_total_centavos: 300 },
    ];
    expect(agruparVendasPorFormaPagamento(vendas)).toEqual({ pix: 1500, dinheiro: 300 });
  });
});

describe("receitaTotalVendas", () => {
  it("soma o valor total de todas as vendas", () => {
    expect(receitaTotalVendas([{ valor_total_centavos: 100 }, { valor_total_centavos: 200 }])).toBe(300);
  });
});
