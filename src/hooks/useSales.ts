import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Sale, SaleItem, Product } from '@/types'
import { format } from 'date-fns'

function mapSale(row: Record<string, unknown>): Sale {
  return {
    id: row.id as string,
    ownerId: row.owner_id as string,
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
    const { data } = await supabase
      .from('sales')
      .select('*')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })
    setSales((data || []).map(mapSale))
    setLoading(false)
  }, [user])

  useEffect(() => { load() }, [load])

  async function registerSale(
    items: SaleItem[],
    products: Product[],
    paymentMethod: Sale['paymentMethod'],
    notes?: string
  ) {
    if (!user) return
    const total = items.reduce((sum, item) => sum + item.total, 0)

    await supabase.from('sales').insert({
      owner_id: user.id,
      items,
      total,
      payment_method: paymentMethod,
      notes: notes || '',
    })

    for (const item of items) {
      const product = products.find(p => p.id === item.productId)
      if (!product) continue
      const newQty = product.quantity - item.quantity

      await supabase.from('products').update({
        quantity: newQty,
        updated_at: new Date().toISOString(),
      }).eq('id', item.productId)

      await supabase.from('stock_movements').insert({
        owner_id: user.id,
        product_id: item.productId,
        product_name: item.productName,
        type: 'saida',
        quantity: item.quantity,
        reason: 'Venda registrada',
        previous_quantity: product.quantity,
        new_quantity: newQty,
      })
    }

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
