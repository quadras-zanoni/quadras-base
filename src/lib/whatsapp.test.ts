import { describe, expect, it } from "vitest";
import { gerarLinkWhatsApp } from "./whatsapp";

describe("gerarLinkWhatsApp", () => {
  it("remove caracteres não numéricos do número", () => {
    expect(gerarLinkWhatsApp("(51) 99999-8888", "oi")).toBe("https://wa.me/51999998888?text=oi");
  });

  it("codifica a mensagem para uso em URL", () => {
    const link = gerarLinkWhatsApp("51999998888", "Olá! Tudo bem?");
    expect(link).toContain(encodeURIComponent("Olá! Tudo bem?"));
  });
});
