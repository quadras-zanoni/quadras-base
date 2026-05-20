import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Court } from '@/types'

function mapCourt(row: Record<string, unknown>): Court {
  return {
    id: row.id as string,
    ownerId: row.owner_id as string,
    name: row.name as string,
    type: row.type as Court['type'],
    pricePerHour: row.price_per_hour as number,
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
    const { data } = await supabase
      .from('courts')
      .select('*')
      .eq('owner_id', user.id)
      .order('name')
    setCourts((data || []).map(mapCourt))
    setLoading(false)
  }, [user])

  useEffect(() => { load() }, [load])

  async function addCourt(data: Omit<Court, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>) {
    if (!user) return
    await supabase.from('courts').insert({
      owner_id: user.id,
      name: data.name,
      type: data.type,
      price_per_hour: data.pricePerHour,
      duration: data.duration,
      open_time: data.openTime,
      close_time: data.closeTime,
      status: data.status,
    })
    await load()
  }

  async function updateCourt(id: string, data: Partial<Court>) {
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (data.name !== undefined) patch.name = data.name
    if (data.type !== undefined) patch.type = data.type
    if (data.pricePerHour !== undefined) patch.price_per_hour = data.pricePerHour
    if (data.duration !== undefined) patch.duration = data.duration
    if (data.openTime !== undefined) patch.open_time = data.openTime
    if (data.closeTime !== undefined) patch.close_time = data.closeTime
    if (data.status !== undefined) patch.status = data.status
    await supabase.from('courts').update(patch).eq('id', id)
    await load()
  }

  return { courts, loading, addCourt, updateCourt }
}
