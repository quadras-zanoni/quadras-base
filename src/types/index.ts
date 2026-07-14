export type Modality = 'volei' | 'beach_tennis' | 'futevolei'

/** Faixa de preço: vale para os dias marcados dentro do intervalo [start, end).
 *  days segue a convenção JS getDay(): 0=Dom, 1=Seg, ... 6=Sáb. */
export interface PriceTier {
  days: number[]
  start: string   // "HH:MM"
  end: string     // "HH:MM"
  price: number   // preço/hora nesta faixa
}

export interface Court {
  id: string
  ownerId: string
  name: string
  modalities: Modality[]
  type?: string          // legado (tipo único antigo) — mantido só por compat
  pricePerHour: number   // preço BASE / padrão (fallback quando nenhuma faixa casa)
  priceTiers: PriceTier[]
  duration: number
  openTime: string
  closeTime: string
  status: 'ativa' | 'inativa'
  createdAt: string
  updatedAt: string
}

export interface ArenaSettings {
  ownerId: string
  notifyWhatsapp: string
  slug?: string // apelido do link público (ex: "arena-do-parque")
  createdAt: string
  updatedAt: string
}

export interface Booking {
  id: string
  ownerId: string
  courtId: string
  courtName: string
  clientId?: string
  clientName: string
  clientPhone: string
  notes?: string
  date: string // YYYY-MM-DD
  startTime: string // HH:MM
  endTime: string // HH:MM
  value: number
  modality?: string // modalidade escolhida pelo cliente (quando aplicável)
  status: 'pendente' | 'confirmado' | 'cancelado'
  cancelReason?: string
  cancelledAt?: string
  createdAt: string
  updatedAt: string
}

export interface Client {
  id: string
  ownerId: string
  name: string
  phone: string
  notes?: string
  lastBookingDate?: string
  totalBookings: number
  createdAt: string
  updatedAt: string
}

export interface Product {
  id: string
  ownerId: string
  name: string
  category: string
  quantity: number
  minStock: number
  salePrice: number
  costPrice: number
  status: 'ativo' | 'inativo'
  createdAt: string
  updatedAt: string
}

export interface StockMovement {
  id: string
  ownerId: string
  productId: string
  productName: string
  type: 'entrada' | 'saida' | 'ajuste'
  quantity: number
  reason: string
  previousQuantity: number
  newQuantity: number
  createdAt: string
}

export interface SaleItem {
  productId: string
  productName: string
  quantity: number
  unitPrice: number
  total: number
}

export interface Sale {
  id: string
  ownerId: string
  clientId?: string
  clientName?: string
  items: SaleItem[]
  total: number
  paymentMethod: 'dinheiro' | 'pix' | 'cartao_debito' | 'cartao_credito' | 'outro'
  notes?: string
  createdAt: string
  desconto?: number
  // Comanda (venda em aberto) — campos opcionais, retrocompatível.
  // A linha do "horário" é um SaleItem com productId '' e productName 'Horário'.
  status?: 'aberta' | 'fechada' | 'cancelada'
  bookingId?: string
  openedAt?: string
  closedAt?: string
}

export const PAYMENT_METHODS: Record<Sale['paymentMethod'], string> = {
  dinheiro: 'Dinheiro',
  pix: 'PIX',
  cartao_debito: 'Cartão Débito',
  cartao_credito: 'Cartão Crédito',
  outro: 'Outro',
}

/** As 3 modalidades oficiais. Chave = valor no banco; valor = rótulo exibido. */
export const MODALITIES: Record<Modality, string> = {
  volei: 'Vôlei',
  beach_tennis: 'Beach Tennis',
  futevolei: 'Futevôlei',
}

/** Durações de reserva que o cliente pode escolher (em minutos). */
export const BOOKING_DURATIONS = [30, 60, 90] as const

/** Rótulo amigável de uma duração em minutos (ex: 90 → "1h30"). */
export function durationLabel(min: number): string {
  if (min === 30) return '30 min'
  if (min === 60) return '1 hora'
  if (min === 90) return '1h30'
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`
}
