import { afterEach, describe, expect, it, vi } from "vitest";
import { hojeISO, inicioDoDiaUTC, limitesDoMes } from "./timezone";

describe("hojeISO", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("usa a data de Brasília, não a data UTC, perto da virada do dia", () => {
    // 2026-06-23 21:30 em Brasília (UTC-3) é 2026-06-24 00:30 em UTC
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-24T00:30:00Z"));
    expect(hojeISO()).toBe("2026-06-23");
  });

  it("acompanha a virada real do dia em Brasília", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-24T03:30:00Z")); // 2026-06-24 00:30 em Brasília
    expect(hojeISO()).toBe("2026-06-24");
  });
});

describe("inicioDoDiaUTC", () => {
  it("retorna a meia-noite de Brasília como instante com offset explícito", () => {
    expect(inicioDoDiaUTC("2026-06-23")).toBe("2026-06-23T00:00:00-03:00");
  });
});

describe("limitesDoMes", () => {
  it("calcula o início deste mês e do próximo", () => {
    expect(limitesDoMes("2026-06-23")).toEqual({ inicio: "2026-06-01", fim: "2026-07-01" });
  });

  it("vira o ano corretamente em dezembro", () => {
    expect(limitesDoMes("2026-12-15")).toEqual({ inicio: "2026-12-01", fim: "2027-01-01" });
  });
});
