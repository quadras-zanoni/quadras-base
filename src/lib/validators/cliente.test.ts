import { describe, expect, it } from "vitest";
import { ClienteInputSchema } from "./cliente";

describe("ClienteInputSchema", () => {
  it("aceita nome e telefone válidos", () => {
    const resultado = ClienteInputSchema.safeParse({ nome: "João", telefone: "51999998888" });
    expect(resultado.success).toBe(true);
  });

  it("rejeita telefone com menos de 8 dígitos", () => {
    const resultado = ClienteInputSchema.safeParse({ nome: "João", telefone: "123" });
    expect(resultado.success).toBe(false);
  });

  it("rejeita nome vazio", () => {
    const resultado = ClienteInputSchema.safeParse({ nome: "", telefone: "51999998888" });
    expect(resultado.success).toBe(false);
  });

  it("aceita cpf e endereco opcionais", () => {
    const resultado = ClienteInputSchema.safeParse({
      nome: "João",
      telefone: "51999998888",
      cpf: "123.456.789-00",
      endereco: "Rua das Flores, 123",
    });
    expect(resultado.success).toBe(true);
  });

  it("funciona sem cpf e endereco", () => {
    const resultado = ClienteInputSchema.parse({ nome: "João", telefone: "51999998888" });
    expect(resultado.cpf).toBeUndefined();
    expect(resultado.endereco).toBeUndefined();
  });
});
