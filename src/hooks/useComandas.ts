import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Sale, SaleItem } from '@/types'

/** A linha do "horário" na comanda é um SaleItem com productId vazio. */
export const HORARIO_ID = ''

function mapComanda(row: Record<string, unknown>): Sale {
  return {
    id: row.id as string,
    ownerId: row.owner_id as string,
    clientId: row.client_id as string | undefined,
    clientName: row.client_name as string | undefined,
    items: (row.items as SaleItem[]) ?? [],
    total: row.total as number,
    desconto: (row.desconto as number) ?? 0,
    paymentMethod: row.payment_method as Sale['paymentMethod'],
    notes: row.notes as string | undefined,
    createdAt: row.created_at as string,
    status: row.status as Sale['status'],
    bookingId: row.booking_id as string | undefined,
    openedAt: row.opened_at as string | undefined,
    closedAt: row.closed_at as string | undefined,
  }
}

function calcTotal(items: SaleItem[]) {
  return items.reduce((sum, i) => sum + i.total, 0)
}

export function useComandas() {
  const { user } = useAuth()
  const [comandas, setComandas] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) return
    const { data, error } = await supabase
      .from('sales')
      .select('*')
      .eq('owner_id', user.id)
      .eq('status', 'aberta')
      .order('opened_at', { ascending: false })
    if (error) console.error('[useComandas] load:', error)
    setComandas((data || []).map(mapComanda))
    setLoading(false)
  }, [user])

  useEffect(() => { load() }, [load])

  // Abre uma nova comanda (venda em aberto). Retorna o id criado.
  async function openComanda(clientId?: string, clientName?: string, bookingId?: string) {
    if (!user) return null
    const now = new Date().toISOString()
    const { data, error } = await supabase
      .from('sales')
      .insert({
        owner_id: user.id,
        client_id: clientId ?? null,
        client_name: clientName ?? null,
        items: [],
        total: 0,
        payment_method: null,
        notes: '',
        status: 'aberta',
        opened_at: now,
        booking_id: bookingId ?? null,
      })
      .select('id')
      .single()
    if (error) throw error
    await load()
    return data?.id as string
  }

  // Lança 1 produto (baixa estoque em tempo real via RPC atômica).
  async function addItem(comandaId: string, productId: string, qty = 1) {
    const { error } = await supabase.rpc('comanda_add_item', {
      p_comanda_id: comandaId,
      p_product_id: productId,
      p_qty: qty,
    })
    if (error) throw error
    await load()
  }

  // Remove 1 produto (devolve estoque via RPC atômica).
  async function removeItem(comandaId: string, productId: string) {
    const { error } = await supabase.rpc('comanda_remove_item', {
      p_comanda_id: comandaId,
      p_product_id: productId,
    })
    if (error) throw error
    await load()
  }

  // Define/atualiza a linha do horário (app-side, owner-only, sem concorrência).
  // Lê os items direto do banco por id para não depender do estado em memória
  // (evita closure velha no fluxo de auto-abrir vindo da agenda).
  async function setHorario(comandaId: string, valorUnit: number, quantity: number, label = 'Horário') {
    if (quantity < 1) quantity = 1
    const { data, error } = await supabase
      .from('sales')
      .select('items')
      .eq('id', comandaId)
      .single()
    if (error) throw error
    const items: SaleItem[] = (data?.items as SaleItem[]) ?? []
    const line: SaleItem = { productId: HORARIO_ID, productName: label, quantity, unitPrice: valorUnit, total: valorUnit * quantity }
    const exists = items.some(i => i.productId === HORARIO_ID)
    const newItems = exists
      ? items.map(i => (i.productId === HORARIO_ID ? line : i))
      : [...items, line]
    const { error: upErr } = await supabase
      .from('sales')
      .update({ items: newItems, total: calcTotal(newItems), updated_at: new Date().toISOString() })
      .eq('id', comandaId)
    if (upErr) throw upErr
    await load()
  }

  // Fecha a comanda: vira venda normal (status fechada) com forma de pagamento.
  // Se veio de uma reserva, marca a reserva como confirmada (paga).
  async function closeComanda(comandaId: string, paymentMethod: Sale['paymentMethod'], bookingId?: string) {
    const { error } = await supabase
      .from('sales')
      .update({
        status: 'fechada',
        payment_method: paymentMethod,
        closed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', comandaId)
    if (error) throw error
    if (bookingId) {
      await supabase
        .from('bookings')
        .update({ status: 'confirmado', updated_at: new Date().toISOString() })
        .eq('id', bookingId)
    }
    await load()
  }

  // Cancela a comanda: devolve o estoque de cada produto e marca como cancelada.
  async function cancelComanda(comandaId: string, items: SaleItem[]) {
    for (const item of items) {
      if (item.productId !== HORARIO_ID) {
        await removeItem(comandaId, item.productId)
      }
    }
    const { error } = await supabase
      .from('sales')
      .update({ status: 'cancelada', updated_at: new Date().toISOString() })
      .eq('id', comandaId)
    if (error) throw error
    await load()
  }

  // Define o desconto na comanda (app-side, não passa pelas RPCs de estoque).
  async function setDescontoComanda(comandaId: string, value: number) {
    if (value < 0) value = 0
    const { error } = await supabase
      .from('sales')
      .update({ desconto: value, updated_at: new Date().toISOString() })
      .eq('id', comandaId)
    if (error) throw error
    await load()
  }

  return {
    comandas,
    loading,
    load,
    openComanda,
    addItem,
    removeItem,
    setHorario,
    closeComanda,
    cancelComanda,
    setDescontoComanda,
  }
}
