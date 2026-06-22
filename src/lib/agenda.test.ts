import { describe, expect, it } from "vitest";
import { horaParaMinutos, intervalosConflitam, temConflito } from "./agenda";

describe("horaParaMinutos", () => {
  it("converte HH:mm em minutos desde a meia-noite", () => {
    expect(horaParaMinutos("00:00")).toBe(0);
    expect(horaParaMinutos("01:30")).toBe(90);
    expect(horaParaMinutos("23:59")).toBe(1439);
  });
});

describe("intervalosConflitam", () => {
  it("detecta sobreposição parcial", () => {
    expect(
      intervalosConflitam(
        { hora_inicio: "10:00", hora_fim: "11:00" },
        { hora_inicio: "10:30", hora_fim: "11:30" }
      )
    ).toBe(true);
  });

  it("detecta um intervalo totalmente contido no outro", () => {
    expect(
      intervalosConflitam(
        { hora_inicio: "10:00", hora_fim: "12:00" },
        { hora_inicio: "10:30", hora_fim: "11:00" }
      )
    ).toBe(true);
  });

  it("não considera conflito quando os horários são adjacentes", () => {
    expect(
      intervalosConflitam(
        { hora_inicio: "10:00", hora_fim: "11:00" },
        { hora_inicio: "11:00", hora_fim: "12:00" }
      )
    ).toBe(false);
  });

  it("não considera conflito quando não há sobreposição", () => {
    expect(
      intervalosConflitam(
        { hora_inicio: "08:00", hora_fim: "09:00" },
        { hora_inicio: "10:00", hora_fim: "11:00" }
      )
    ).toBe(false);
  });
});

describe("temConflito", () => {
  it("retorna false para lista vazia de existentes", () => {
    expect(temConflito([], { hora_inicio: "10:00", hora_fim: "11:00" })).toBe(false);
  });

  it("retorna true quando algum existente conflita", () => {
    const existentes = [
      { hora_inicio: "08:00", hora_fim: "09:00" },
      { hora_inicio: "10:00", hora_fim: "11:00" },
    ];
    expect(temConflito(existentes, { hora_inicio: "10:30", hora_fim: "11:30" })).toBe(true);
  });

  it("retorna false quando nenhum existente conflita", () => {
    const existentes = [{ hora_inicio: "08:00", hora_fim: "09:00" }];
    expect(temConflito(existentes, { hora_inicio: "10:00", hora_fim: "11:00" })).toBe(false);
  });
});
