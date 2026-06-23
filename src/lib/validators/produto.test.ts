import { describe, expect, it } from "vitest";
import { ProdutoInputSchema } from "./produto";

describe("ProdutoInputSchema", () => {
  it("aceita um produto válido", () => {
    const resultado = ProdutoInputSchema.safeParse({
      nome: "Água",
      categoria: "bebidas",
      preco_centavos: 300,
      estoque_minimo: 5,
    });
    expect(resultado.success).toBe(true);
  });

  it("usa custo e quantidade inicial padrão (zero) quando ausentes", () => {
    const resultado = ProdutoInputSchema.parse({
      nome: "Água",
      preco_centavos: 300,
      estoque_minimo: 5,
    });
    expect(resultado.custo_centavos).toBe(0);
    expect(resultado.quantidade_inicial).toBe(0);
  });

  it("usa categoria padrão quando ausente", () => {
    const resultado = ProdutoInputSchema.parse({
      nome: "Água",
      preco_centavos: 300,
      estoque_minimo: 5,
    });
    expect(resultado.categoria).toBe("geral");
  });

  it("rejeita preço negativo", () => {
    const resultado = ProdutoInputSchema.safeParse({
      nome: "Água",
      preco_centavos: -1,
      estoque_minimo: 5,
    });
    expect(resultado.success).toBe(false);
  });
});
