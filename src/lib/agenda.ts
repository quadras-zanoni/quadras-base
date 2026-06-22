export interface IntervaloHorario {
  hora_inicio: string; // "HH:mm"
  hora_fim: string;
}

export function horaParaMinutos(hora: string): number {
  const [horas, minutos] = hora.split(":").map(Number);
  return horas * 60 + minutos;
}

export function intervalosConflitam(a: IntervaloHorario, b: IntervaloHorario): boolean {
  const aIni = horaParaMinutos(a.hora_inicio);
  const aFim = horaParaMinutos(a.hora_fim);
  const bIni = horaParaMinutos(b.hora_inicio);
  const bFim = horaParaMinutos(b.hora_fim);
  return aIni < bFim && bIni < aFim;
}

export function temConflito(existentes: IntervaloHorario[], novo: IntervaloHorario): boolean {
  return existentes.some((existente) => intervalosConflitam(existente, novo));
}
