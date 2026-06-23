import { describe, expect, it } from "vitest";
import { avaliarStatusAssinatura } from "./subscription";

describe("avaliarStatusAssinatura", () => {
  it("considera ativo quando o status é 'ativo'", () => {
    expect(avaliarStatusAssinatura("ativo")).toEqual({ ativo: true, dias_restantes: 30 });
  });

  it("considera bloqueado quando o status não é 'ativo'", () => {
    expect(avaliarStatusAssinatura("bloqueado")).toEqual({ ativo: false, dias_restantes: 0 });
  });
});
