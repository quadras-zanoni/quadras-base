import { describe, expect, it } from "vitest";
import { QuadraInputSchema } from "./quadra";

describe("QuadraInputSchema", () => {
  it("aceita uma quadra válida", () => {
    const resultado = QuadraInputSchema.safeParse({
      nome: "Quadra 1",
      tipo_esporte: "futsal",
      preco_hora_centavos: 10000,
    });
    expect(resultado.success).toBe(true);
  });

  it("rejeita nome vazio", () => {
    const resultado = QuadraInputSchema.safeParse({
      nome: "",
      tipo_esporte: "futsal",
      preco_hora_centavos: 10000,
    });
    expect(resultado.success).toBe(false);
  });

  it("rejeita preço negativo", () => {
    const resultado = QuadraInputSchema.safeParse({
      nome: "Quadra 1",
      tipo_esporte: "futsal",
      preco_hora_centavos: -100,
    });
    expect(resultado.success).toBe(false);
  });
});
