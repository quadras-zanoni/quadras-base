import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Sale, SaleItem } from '@/types'
import { format } from 'date-fns'

function mapSale(row: Record<string, unknown>): Sale {
  return {
    id: row.id as string,
    ownerId: row.owner_id as string,
    clientId: row.client_id as string | undefined,
    clientName: row.client_name as string | undefined,
    items: row.items as SaleItem[],
    total: row.total as number,
    paymentMethod: row.payment_method as Sale['paymentMethod'],
    notes: row.notes as string | undefined,
    createdAt: row.created_at as string,
  }
}

export function useSales() {
  const { user } = useAuth()
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) return
    const { data, error } = await supabase
      .from('sales')
      .select('*')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })
    if (error) console.error('[useSales] load:', error)
    setSales((data || []).map(mapSale))
    setLoading(false)
  }, [user])

  useEffect(() => { load() }, [load])

  // Venda transacional via RPC (migration 0002): valida estoque, grava a venda,
  // baixa o estoque e registra a movimentação de forma ATÔMICA no banco.
  async function registerSale(
    items: SaleItem[],
    paymentMethod: Sale['paymentMethod'],
    notes?: string,
    clientId?: string,
    clientName?: string
  ) {
    if (!user) return
    const { error } = await supabase.rpc('register_sale', {
      p_items: items,
      p_payment_method: paymentMethod,
      p_notes: notes || '',
      p_client_id: clientId ?? null,
      p_client_name: clientName ?? null,
    })
    if (error) throw error
    await load()
  }

  const today = format(new Date(), 'yyyy-MM-dd')
  const todaySales = sales.filter(s => {
    if (!s.createdAt) return false
    return format(new Date(s.createdAt), 'yyyy-MM-dd') === today
  })

  const todayRevenue = todaySales.reduce((sum, s) => sum + s.total, 0)

  return { sales, loading, registerSale, todaySales, todayRevenue }
}
