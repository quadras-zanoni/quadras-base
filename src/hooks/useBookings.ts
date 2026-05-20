import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Booking } from '@/types'
import { format } from 'date-fns'

function mapBooking(row: Record<string, unknown>): Booking {
  return {
    id: row.id as string,
    ownerId: row.owner_id as string,
    courtId: row.court_id as string,
    courtName: row.court_name as string,
    clientId: row.client_id as string | undefined,
    clientName: row.client_name as string,
    clientPhone: row.client_phone as string,
    notes: row.notes as string | undefined,
    date: row.date as string,
    startTime: row.start_time as string,
    endTime: row.end_time as string,
    value: row.value as number,
    status: row.status as Booking['status'],
    cancelReason: row.cancel_reason as string | undefined,
    cancelledAt: row.cancelled_at as string | undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

export function useBookings(dateFilter?: string) {
  const { user } = useAuth()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) return
    let q = supabase
      .from('bookings')
      .select('*')
      .eq('owner_id', user.id)

    if (dateFilter) {
      q = q.eq('date', dateFilter).order('start_time')
    } else {
      q = q.order('date', { ascending: false })
    }

    const { data } = await q
    setBookings((data || []).map(mapBooking))
    setLoading(false)
  }, [user, dateFilter])

  useEffect(() => { load() }, [load])

  async function addBooking(data: Omit<Booking, 'id' | 'ownerId' | 'createdAt' | 'updatedAt'>) {
    if (!user) return
    const { data: result } = await supabase
      .from('bookings')
      .insert({
        owner_id: user.id,
        court_id: data.courtId,
        court_name: data.courtName,
        client_id: data.clientId ?? null,
        client_name: data.clientName,
        client_phone: data.clientPhone,
        notes: data.notes || '',
        date: data.date,
        start_time: data.startTime,
        end_time: data.endTime,
        value: data.value,
        status: data.status,
      })
      .select('id')
      .single()
    await load()
    return result?.id
  }

  async function updateBooking(id: string, data: Partial<Booking>) {
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (data.courtId !== undefined) patch.court_id = data.courtId
    if (data.courtName !== undefined) patch.court_name = data.courtName
    if (data.clientId !== undefined) patch.client_id = data.clientId
    if (data.clientName !== undefined) patch.client_name = data.clientName
    if (data.clientPhone !== undefined) patch.client_phone = data.clientPhone
    if (data.notes !== undefined) patch.notes = data.notes
    if (data.date !== undefined) patch.date = data.date
    if (data.startTime !== undefined) patch.start_time = data.startTime
    if (data.endTime !== undefined) patch.end_time = data.endTime
    if (data.value !== undefined) patch.value = data.value
    if (data.status !== undefined) patch.status = data.status
    if (data.cancelReason !== undefined) patch.cancel_reason = data.cancelReason
    await supabase.from('bookings').update(patch).eq('id', id)
    await load()
  }

  async function cancelBooking(id: string, reason: string) {
    await supabase.from('bookings').update({
      status: 'cancelado',
      cancel_reason: reason,
      cancelled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', id)
    await load()
  }

  async function checkAvailability(courtId: string, date: string, startTime: string, endTime: string, excludeId?: string) {
    const { data } = await supabase
      .from('bookings')
      .select('*')
      .eq('owner_id', user!.id)
      .eq('court_id', courtId)
      .eq('date', date)

    const active = (data || [])
      .map(mapBooking)
      .filter(b => b.id !== excludeId && b.status !== 'cancelado')

    for (const b of active) {
      if (startTime < b.endTime && endTime > b.startTime) return false
    }
    return true
  }

  const todayBookings = bookings.filter(b => b.date === format(new Date(), 'yyyy-MM-dd'))

  return { bookings, loading, addBooking, updateBooking, cancelBooking, checkAvailability, todayBookings }
}
