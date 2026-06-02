import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { StockMovement, Product } from '@/types'

function mapMovement(row: Record<string, unknown>): StockMovement {
  return {
    id: row.id as string,
    ownerId: row.owner_id as string,
    productId: row.product_id as string,
    productName: row.product_name as string,
    type: row.type as StockMovement['type'],
    quantity: row.quantity as number,
    reason: row.reason as string,
    previousQuantity: row.previous_quantity as number,
    newQuantity: row.new_quantity as number,
    createdAt: row.created_at as string,
  }
}

export function useStock() {
  const { user } = useAuth()
  const [movements, setMovements] = useState<StockMovement[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) return
    const { data, error } = await supabase
      .from('stock_movements')
      .select('*')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })
    if (error) console.error('[useStock] load:', error)
    setMovements((data || []).map(mapMovement))
    setLoading(false)
  }, [user])

  useEffect(() => { load() }, [load])

  async function addMovement(
    product: Product,
    type: StockMovement['type'],
    quantity: number,
    reason: string
  ) {
    if (!user) return
    const delta = type === 'entrada' ? quantity : type === 'saida' ? -quantity : quantity - product.quantity
    const newQty = type === 'ajuste' ? quantity : product.quantity + delta

    const { error: movError } = await supabase.from('stock_movements').insert({
      owner_id: user.id,
      product_id: product.id,
      product_name: product.name,
      type,
      quantity,
      reason,
      previous_quantity: product.quantity,
      new_quantity: newQty,
    })
    if (movError) throw movError

    const { error: prodError } = await supabase.from('products').update({
      quantity: newQty,
      updated_at: new Date().toISOString(),
    }).eq('id', product.id)
    if (prodError) throw prodError

    await load()
  }

  return { movements, loading, addMovement }
}
