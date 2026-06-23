import { describe, expect, it } from "vitest";
import { QuadraInputSchema } from "./quadra";

describe("QuadraInputSchema", () => {
  it("aceita uma quadra válida", () => {
    const resultado = QuadraInputSchema.safeParse({
      nome: "Quadra 1",
      tipos_esporte: ["futevolei"],
      preco_hora_centavos: 10000,
    });
    expect(resultado.success).toBe(true);
  });

  it("aceita múltiplos esportes", () => {
    const resultado = QuadraInputSchema.safeParse({
      nome: "Quadra 1",
      tipos_esporte: ["futevolei", "beach-tenis", "volei"],
      preco_hora_centavos: 10000,
    });
    expect(resultado.success).toBe(true);
  });

  it("rejeita nenhum esporte selecionado", () => {
    const resultado = QuadraInputSchema.safeParse({
      nome: "Quadra 1",
      tipos_esporte: [],
      preco_hora_centavos: 10000,
    });
    expect(resultado.success).toBe(false);
  });

  it("rejeita nome vazio", () => {
    const resultado = QuadraInputSchema.safeParse({
      nome: "",
      tipos_esporte: ["futevolei"],
      preco_hora_centavos: 10000,
    });
    expect(resultado.success).toBe(false);
  });

  it("rejeita preço negativo", () => {
    const resultado = QuadraInputSchema.safeParse({
      nome: "Quadra 1",
      tipos_esporte: ["futevolei"],
      preco_hora_centavos: -100,
    });
    expect(resultado.success).toBe(false);
  });
});
