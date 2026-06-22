import { describe, expect, it } from "vitest";
import { centavosParaReais } from "./money";

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
