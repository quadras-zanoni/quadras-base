import { describe, expect, it } from "vitest";
import { VendaInputSchema } from "./venda";

describe("VendaInputSchema", () => {
  it("aceita uma venda com um item", () => {
    const resultado = VendaInputSchema.safeParse({
      forma_pagamento: "pix",
      itens: [{ produto_id: "11111111-1111-1111-1111-111111111111", quantidade: 2, preco_unitario_centavos: 300 }],
    });
    expect(resultado.success).toBe(true);
  });

  it("rejeita venda sem itens", () => {
    const resultado = VendaInputSchema.safeParse({ forma_pagamento: "pix", itens: [] });
    expect(resultado.success).toBe(false);
  });

  it("rejeita forma de pagamento inválida", () => {
    const resultado = VendaInputSchema.safeParse({
      forma_pagamento: "boleto",
      itens: [{ produto_id: "11111111-1111-1111-1111-111111111111", quantidade: 1, preco_unitario_centavos: 100 }],
    });
    expect(resultado.success).toBe(false);
  });
});
