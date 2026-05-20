export interface Court {
  id: string
  ownerId: string
  name: string
  type: 'futebol_society' | 'futsal' | 'beach_tennis' | 'tenis' | 'volei' | 'outro'
  pricePerHour: number
  duration: number
  openTime: string
  closeTime: string
  status: 'ativa' | 'inativa'
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
  items: SaleItem[]
  total: number
  paymentMethod: 'dinheiro' | 'pix' | 'cartao_debito' | 'cartao_credito' | 'outro'
  notes?: string
  createdAt: string
}

export const PAYMENT_METHODS: Record<Sale['paymentMethod'], string> = {
  dinheiro: 'Dinheiro',
  pix: 'PIX',
  cartao_debito: 'Cartão Débito',
  cartao_credito: 'Cartão Crédito',
  outro: 'Outro',
}

export const COURT_TYPES: Record<Court['type'], string> = {
  futebol_society: 'Futebol Society',
  futsal: 'Futsal',
  beach_tennis: 'Beach Tennis',
  tenis: 'Tênis',
  volei: 'Vôlei',
  outro: 'Outro',
}
