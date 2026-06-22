import { describe, expect, it } from "vitest";
import { resolverTenantSlug } from "./tenant";

describe("resolverTenantSlug", () => {
  it("usa o subdominio em produção", () => {
    expect(resolverTenantSlug("seven-beach.quadrashub.app")).toBe("seven-beach");
  });

  it("cai para o tenant de desenvolvimento em localhost", () => {
    expect(resolverTenantSlug("localhost:3000", "base")).toBe("base");
  });

  it("cai para o tenant de desenvolvimento em 127.0.0.1", () => {
    expect(resolverTenantSlug("127.0.0.1:3000", "base")).toBe("base");
  });
});
