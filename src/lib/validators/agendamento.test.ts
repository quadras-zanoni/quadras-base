import { describe, expect, it } from "vitest";
import { AgendamentoInputSchema } from "./agendamento";

describe("AgendamentoInputSchema", () => {
  it("aceita um agendamento com cliente existente", () => {
    const resultado = AgendamentoInputSchema.safeParse({
      quadra_id: "11111111-1111-1111-1111-111111111111",
      data: "2026-06-23",
      hora_inicio: "10:00",
      hora_fim: "11:00",
      recorrente: false,
      cliente_id: "22222222-2222-2222-2222-222222222222",
    });
    expect(resultado.success).toBe(true);
  });

  it("aceita um agendamento com cliente novo", () => {
    const resultado = AgendamentoInputSchema.safeParse({
      quadra_id: "11111111-1111-1111-1111-111111111111",
      data: "2026-06-23",
      hora_inicio: "10:00",
      hora_fim: "11:00",
      recorrente: false,
      cliente_novo_nome: "João",
      cliente_novo_telefone: "51999998888",
    });
    expect(resultado.success).toBe(true);
  });

  it("rejeita quando não há cliente existente nem novo", () => {
    const resultado = AgendamentoInputSchema.safeParse({
      quadra_id: "11111111-1111-1111-1111-111111111111",
      data: "2026-06-23",
      hora_inicio: "10:00",
      hora_fim: "11:00",
      recorrente: false,
    });
    expect(resultado.success).toBe(false);
  });

  it("rejeita hora_fim antes de hora_inicio", () => {
    const resultado = AgendamentoInputSchema.safeParse({
      quadra_id: "11111111-1111-1111-1111-111111111111",
      data: "2026-06-23",
      hora_inicio: "11:00",
      hora_fim: "10:00",
      recorrente: false,
      cliente_id: "22222222-2222-2222-2222-222222222222",
    });
    expect(resultado.success).toBe(false);
  });
});
