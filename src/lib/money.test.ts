import { describe, expect, it } from "vitest";
import { centavosParaReais, reaisParaCentavos } from "./money";

describe("centavosParaReais", () => {
  it("formata centavos inteiros como BRL", () => {
    expect(centavosParaReais(10000)).toBe("R$ 100,00");
  });

  it("formata valores quebrados", () => {
    expect(centavosParaReais(15050)).toBe("R$ 150,50");
  });

  it("formata zero", () => {
    expect(centavosParaReais(0)).toBe("R$ 0,00");
  });
});

describe("reaisParaCentavos", () => {
  it("converte um valor inteiro em reais para centavos", () => {
    expect(reaisParaCentavos("100")).toBe(10000);
  });

  it("converte um valor com ponto decimal", () => {
    expect(reaisParaCentavos("0.50")).toBe(50);
  });

  it("converte um valor com vírgula decimal", () => {
    expect(reaisParaCentavos("10,50")).toBe(1050);
  });

  it("aceita number diretamente", () => {
    expect(reaisParaCentavos(150.5)).toBe(15050);
  });

  it("trata vazio/ausente como zero", () => {
    expect(reaisParaCentavos("")).toBe(0);
    expect(reaisParaCentavos(undefined)).toBe(0);
    expect(reaisParaCentavos(null)).toBe(0);
  });

  it("arredonda para o centavo mais próximo (evita drift de float)", () => {
    expect(reaisParaCentavos("19.99")).toBe(1999);
  });
});
