const FUSO_HORARIO = "America/Sao_Paulo";

export function hojeISO(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: FUSO_HORARIO,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function inicioDoDiaUTC(dataISO: string): string {
  return `${dataISO}T00:00:00-03:00`;
}

export function limitesDoMes(dataISO: string): { inicio: string; fim: string } {
  const [ano, mes] = dataISO.split("-").map(Number);
  const inicio = `${dataISO.slice(0, 7)}-01`;
  const proximoAno = mes === 12 ? ano + 1 : ano;
  const proximoMes = mes === 12 ? 1 : mes + 1;
  const fim = `${proximoAno}-${String(proximoMes).padStart(2, "0")}-01`;
  return { inicio, fim };
}
