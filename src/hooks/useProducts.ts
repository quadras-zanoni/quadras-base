import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Product } from '@/types'

function mapProduct(row: Record<string, unknown>): Product {
  return {
    id: row.id as string,
    ownerId: row.owner_id as string,
    name: row.name as string,
    category: row.category as string,
    quantity: row.quantity as number,
    minStock: row.min_stock as number,
    salePrice: row.sale_price as number,
    costPrice: row.cost_price as number,
    status: row.status as Product['status'],
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

export function useProducts() {
  const { user } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) return
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('owner_id', user.id)
      .order('name')
    if (error) console.error('[useProducts] load:', error)
    setProducts((data || []).map(mapProduct))
    setLoading(false)
  }, [user])

  useEffect(() => { load() }, [load])

  async function addProduct(data: Omit<Product, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>) {
    if (!user) return
    const { error } = await supabase.from('products').insert({
      owner_id: user.id,
      name: data.name,
      category: data.category,
      quantity: data.quantity,
      min_stock: data.minStock,
      sale_price: data.salePrice,
      cost_price: data.costPrice,
      status: data.status,
    })
    if (error) throw error
    await load()
  }

  async function updateProduct(id: string, data: Partial<Product>) {
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (data.name !== undefined) patch.name = data.name
    if (data.category !== undefined) patch.category = data.category
    if (data.quantity !== undefined) patch.quantity = data.quantity
    if (data.minStock !== undefined) patch.min_stock = data.minStock
    if (data.salePrice !== undefined) patch.sale_price = data.salePrice
    if (data.costPrice !== undefined) patch.cost_price = data.costPrice
    if (data.status !== undefined) patch.status = data.status
    const { error } = await supabase.from('products').update(patch).eq('id', id)
    if (error) throw error
    await load()
  }

  const lowStockProducts = products.filter(p => p.status === 'ativo' && p.quantity <= p.minStock)

  return { products, loading, addProduct, updateProduct, lowStockProducts }
}
