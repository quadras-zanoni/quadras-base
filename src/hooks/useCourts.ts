import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Court } from '@/types'

function mapCourt(row: Record<string, unknown>): Court {
  return {
    id: row.id as string,
    ownerId: row.owner_id as string,
    name: row.name as string,
    modalities: (row.modalities as Court['modalities']) ?? [],
    type: (row.type as string) ?? undefined,
    pricePerHour: row.price_per_hour as number,
    priceTiers: (row.price_tiers as Court['priceTiers']) ?? [],
    duration: row.duration as number,
    openTime: row.open_time as string,
    closeTime: row.close_time as string,
    status: row.status as Court['status'],
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

export function useCourts() {
  const { user } = useAuth()
  const [courts, setCourts] = useState<Court[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) return
    const { data, error } = await supabase
      .from('courts')
      .select('*')
      .eq('owner_id', user.id)
      .order('name')
    if (error) console.error('[useCourts] load:', error)
    setCourts((data || []).map(mapCourt))
    setLoading(false)
  }, [user])

  useEffect(() => { load() }, [load])

  async function addCourt(data: Omit<Court, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>) {
    if (!user) return
    const { error } = await supabase.from('courts').insert({
      owner_id: user.id,
      name: data.name,
      modalities: data.modalities,
      price_per_hour: data.pricePerHour,
      price_tiers: data.priceTiers,
      duration: data.duration,
      open_time: data.openTime,
      close_time: data.closeTime,
      status: data.status,
    })
    if (error) throw error
    await load()
  }

  async function updateCourt(id: string, data: Partial<Court>) {
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (data.name !== undefined) patch.name = data.name
    if (data.modalities !== undefined) patch.modalities = data.modalities
    if (data.pricePerHour !== undefined) patch.price_per_hour = data.pricePerHour
    if (data.priceTiers !== undefined) patch.price_tiers = data.priceTiers
    if (data.duration !== undefined) patch.duration = data.duration
    if (data.openTime !== undefined) patch.open_time = data.openTime
    if (data.closeTime !== undefined) patch.close_time = data.closeTime
    if (data.status !== undefined) patch.status = data.status
    const { error } = await supabase.from('courts').update(patch).eq('id', id)
    if (error) throw error
    await load()
  }

  return { courts, loading, addCourt, updateCourt }
}
