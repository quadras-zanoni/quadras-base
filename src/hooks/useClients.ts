import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Client } from '@/types'

function mapClient(row: Record<string, unknown>): Client {
  return {
    id: row.id as string,
    ownerId: row.owner_id as string,
    name: row.name as string,
    phone: row.phone as string,
    notes: row.notes as string | undefined,
    lastBookingDate: row.last_booking_date as string | undefined,
    totalBookings: row.total_bookings as number,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

export function useClients() {
  const { user } = useAuth()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('clients')
      .select('*')
      .eq('owner_id', user.id)
      .order('name')
    setClients((data || []).map(mapClient))
    setLoading(false)
  }, [user])

  useEffect(() => { load() }, [load])

  async function upsertClient(name: string, phone: string, bookingDate: string) {
    if (!user) return null

    const { data: existing } = await supabase
      .from('clients')
      .select('*')
      .eq('owner_id', user.id)
      .eq('phone', phone)
      .single()

    if (existing) {
      await supabase.from('clients').update({
        name,
        last_booking_date: bookingDate,
        total_bookings: (existing.total_bookings || 0) + 1,
        updated_at: new Date().toISOString(),
      }).eq('id', existing.id)
      await load()
      return existing.id as string
    } else {
      const { data: created } = await supabase
        .from('clients')
        .insert({
          owner_id: user.id,
          name,
          phone,
          notes: '',
          last_booking_date: bookingDate,
          total_bookings: 1,
        })
        .select('id')
        .single()
      await load()
      return created?.id as string
    }
  }

  async function updateClient(id: string, data: Partial<Client>) {
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (data.name !== undefined) patch.name = data.name
    if (data.phone !== undefined) patch.phone = data.phone
    if (data.notes !== undefined) patch.notes = data.notes
    if (data.lastBookingDate !== undefined) patch.last_booking_date = data.lastBookingDate
    if (data.totalBookings !== undefined) patch.total_bookings = data.totalBookings
    await supabase.from('clients').update(patch).eq('id', id)
    await load()
  }

  return { clients, loading, upsertClient, updateClient }
}
