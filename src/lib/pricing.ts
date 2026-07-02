import { Court } from '@/types'

/**
 * Preço/hora vigente para um horário específico, considerando as faixas
 * da quadra (dia da semana + intervalo). Se nenhuma faixa casar, cai no
 * preço base (pricePerHour).
 *
 * @param dateISO  data "YYYY-MM-DD"
 * @param startTime horário de início do slot "HH:MM"
 */
export function hourlyPriceAt(court: Court, dateISO: string, startTime: string): number {
  const tiers = court.priceTiers || []
  if (tiers.length && dateISO && startTime) {
    // 0=Dom .. 6=Sáb — usa meio-dia pra não pegar borda de fuso
    const dow = new Date(dateISO + 'T12:00:00').getDay()
    const tier = tiers.find(
      t => (t.days || []).includes(dow) && startTime >= t.start && startTime < t.end
    )
    if (tier) return tier.price
  }
  return court.pricePerHour
}

/** Valor de UM slot (uma sessão = duração da quadra) no horário dado. */
export function slotValueAt(court: Court, dateISO: string, startTime: string): number {
  return hourlyPriceAt(court, dateISO, startTime) * (court.duration / 60)
}

/** Menor preço/hora da quadra (base + faixas) — útil pra exibir "a partir de R$X". */
export function minHourlyPrice(court: Court): number {
  const prices = [court.pricePerHour, ...(court.priceTiers || []).map(t => t.price)]
  return Math.min(...prices)
}
