export function centavosParaReais(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function reaisParaCentavos(valor: string | number | null | undefined): number {
  if (valor === null || valor === undefined || valor === "") return 0;
  const numero = typeof valor === "number" ? valor : parseFloat(String(valor).replace(",", "."));
  if (Number.isNaN(numero)) return 0;
  return Math.round(numero * 100);
}
