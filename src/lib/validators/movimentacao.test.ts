import { describe, expect, it } from "vitest";
import { MovimentacaoInputSchema } from "./movimentacao";

describe("MovimentacaoInputSchema", () => {
  it("aceita uma entrada válida", () => {
    const resultado = MovimentacaoInputSchema.safeParse({
      produto_id: "11111111-1111-1111-1111-111111111111",
      tipo: "entrada",
      quantidade: 10,
      motivo: "reposição",
    });
    expect(resultado.success).toBe(true);
  });

  it("rejeita quantidade zero ou negativa", () => {
    const resultado = MovimentacaoInputSchema.safeParse({
      produto_id: "11111111-1111-1111-1111-111111111111",
      tipo: "saida",
      quantidade: 0,
      motivo: "perda",
    });
    expect(resultado.success).toBe(false);
  });

  it("rejeita tipo inválido", () => {
    const resultado = MovimentacaoInputSchema.safeParse({
      produto_id: "11111111-1111-1111-1111-111111111111",
      tipo: "ajuste",
      quantidade: 1,
      motivo: "x",
    });
    expect(resultado.success).toBe(false);
  });
});
