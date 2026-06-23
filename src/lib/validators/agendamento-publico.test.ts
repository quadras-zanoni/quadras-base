import { describe, expect, it } from "vitest";
import { AgendamentoPublicoInputSchema } from "./agendamento-publico";

describe("AgendamentoPublicoInputSchema", () => {
  it("aceita uma reserva pública válida", () => {
    const resultado = AgendamentoPublicoInputSchema.safeParse({
      quadra_id: "11111111-1111-1111-1111-111111111111",
      data: "2026-06-23",
      hora_inicio: "10:00",
      hora_fim: "11:00",
      esporte: "futevolei",
      nome: "João",
      telefone: "51999998888",
    });
    expect(resultado.success).toBe(true);
  });

  it("rejeita telefone curto", () => {
    const resultado = AgendamentoPublicoInputSchema.safeParse({
      quadra_id: "11111111-1111-1111-1111-111111111111",
      data: "2026-06-23",
      hora_inicio: "10:00",
      hora_fim: "11:00",
      esporte: "futevolei",
      nome: "João",
      telefone: "123",
    });
    expect(resultado.success).toBe(false);
  });

  it("rejeita hora_fim antes de hora_inicio", () => {
    const resultado = AgendamentoPublicoInputSchema.safeParse({
      quadra_id: "11111111-1111-1111-1111-111111111111",
      data: "2026-06-23",
      hora_inicio: "11:00",
      hora_fim: "10:00",
      esporte: "futevolei",
      nome: "João",
      telefone: "51999998888",
    });
    expect(resultado.success).toBe(false);
  });

  it("rejeita esporte ausente", () => {
    const resultado = AgendamentoPublicoInputSchema.safeParse({
      quadra_id: "11111111-1111-1111-1111-111111111111",
      data: "2026-06-23",
      hora_inicio: "10:00",
      hora_fim: "11:00",
      esporte: "",
      nome: "João",
      telefone: "51999998888",
    });
    expect(resultado.success).toBe(false);
  });
});
