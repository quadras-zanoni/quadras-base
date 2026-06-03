'use client'

import { useState, useEffect, use } from 'react'
import { supabase } from '@/lib/supabase'
import { Court, Booking, COURT_TYPES } from '@/types'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { format, addMinutes, parse } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Clock, CheckCircle, Calendar, Zap } from 'lucide-react'
import { Toaster } from 'react-hot-toast'
import toast from 'react-hot-toast'

function generateSlots(court: Court, bookings: Booking[]) {
  const slots: { time: string; endTime: string; available: boolean }[] = []
  let current = parse(court.openTime, 'HH:mm', new Date())
  const close = parse(court.closeTime, 'HH:mm', new Date())

  while (current < close) {
    const next = addMinutes(current, court.duration)
    if (next > close) break
    const startStr = format(current, 'HH:mm')
    const endStr   = format(next, 'HH:mm')
    const taken = bookings
      .filter(b => b.status !== 'cancelado')
      .some(b => startStr < b.endTime && endStr > b.startTime)
    slots.push({ time: startStr, endTime: endStr, available: !taken })
    current = next
  }
  return slots
}

function StepBadge({ n }: { n: number }) {
  return (
    <span className="w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center bg-brand text-white shrink-0">
      {n}
    </span>
  )
}

export default function ReservarPage({ params }: { params: Promise<{ ownerId: string }> }) {
  const { ownerId } = use(params)

  const [courts, setCourts]           = useState<Court[]>([])
  const [loadingCourts, setLoadingCourts] = useState(true)
  const [selectedCourt, setSelectedCourt] = useState<Court | null>(null)
  const [selectedDate, setSelectedDate]   = useState(format(new Date(), 'yyyy-MM-dd'))
  const [dayBookings, setDayBookings]     = useState<Booking[]>([])
  const [loadingSlots, setLoadingSlots]   = useState(false)
  const [selectedSlot, setSelectedSlot]   = useState<{ time: string; endTime: string } | null>(null)
  const [clientName, setClientName]   = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [saving, setSaving]   = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('courts')
        .select('*')
        .eq('owner_id', ownerId)
        .eq('status', 'ativa')
      setCourts((data || []).map(row => ({
        id: row.id,
        ownerId: row.owner_id,
        name: row.name,
        type: row.type,
        pricePerHour: row.price_per_hour,
        duration: row.duration,
        openTime: row.open_time,
        closeTime: row.close_time,
        status: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      } as Court)))
      setLoadingCourts(false)
    }
    load()
  }, [ownerId])

  useEffect(() => {
    if (!selectedCourt || !selectedDate) return
    setLoadingSlots(true)
    setSelectedSlot(null)

    supabase
      .from('bookings')
      .select('*')
      .eq('owner_id', ownerId)
      .eq('court_id', selectedCourt.id)
      .eq('date', selectedDate)
      .then(({ data }) => {
        setDayBookings((data || []).map(row => ({
          id: row.id,
          ownerId: row.owner_id,
          courtId: row.court_id,
          courtName: row.court_name,
          clientName: row.client_name,
          clientPhone: row.client_phone,
          date: row.date,
          startTime: row.start_time,
          endTime: row.end_time,
          value: row.value,
          status: row.status,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        } as Booking)))
        setLoadingSlots(false)
      })
  }, [selectedCourt, selectedDate, ownerId])

  async function handleReservar() {
    if (!selectedCourt || !selectedSlot) return
    if (!clientName.trim())  return toast.error('Informe seu nome completo')
    if (!clientPhone.trim()) return toast.error('Informe seu telefone')

    setSaving(true)
    try {
      const { data: existing } = await supabase
        .from('bookings')
        .select('status, start_time, end_time')
        .eq('owner_id', ownerId)
        .eq('court_id', selectedCourt.id)
        .eq('date', selectedDate)

      const conflict = (existing || [])
        .filter(b => b.status !== 'cancelado')
        .some(b => selectedSlot.time < b.end_time && selectedSlot.endTime > b.start_time)

      if (conflict) {
        toast.error('Este horário acabou de ser reservado. Escolha outro.')
        setSelectedSlot(null)
        setSaving(false)
        return
      }

      const value = selectedCourt.pricePerHour * (selectedCourt.duration / 60)
      const { error } = await supabase.from('bookings').insert({
        owner_id:     ownerId,
        court_id:     selectedCourt.id,
        court_name:   selectedCourt.name,
        client_name:  clientName.trim(),
        client_phone: clientPhone.trim(),
        notes:        '',
        date:         selectedDate,
        start_time:   selectedSlot.time,
        end_time:     selectedSlot.endTime,
        value,
        status: 'pendente',
      })
      if (error) throw error
      setSuccess(true)
    } catch (err) {
      console.error(err)
      toast.error('Erro ao reservar. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  const slots = selectedCourt ? generateSlots(selectedCourt, dayBookings) : []
  const today  = format(new Date(), 'yyyy-MM-dd')

  /* ─── Tela de sucesso ─── */
  if (success) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center p-4">
        <Toaster position="top-right" />

        <div className="bg-surface border border-line rounded-[var(--radius-card)] shadow-card max-w-md w-full p-8 text-center">
          {/* Ícone */}
          <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-5">
            <CheckCircle size={30} className="text-success" />
          </div>

          <h2 className="text-xl font-bold text-ink mb-2">
            Reserva solicitada!
          </h2>
          <p className="text-muted text-sm mb-6 leading-relaxed">
            Sua reserva foi enviada e está{' '}
            <span className="text-ink font-semibold">aguardando confirmação</span>.
            Em breve você receberá um retorno.
          </p>

          {/* Resumo */}
          <div className="bg-surface-2 border border-line rounded-[var(--radius-ctl)] p-4 text-left space-y-2.5 text-sm mb-6">
            {[
              ['Quadra',   selectedCourt?.name],
              ['Data',     format(new Date(selectedDate + 'T12:00:00'), "dd 'de' MMMM", { locale: ptBR })],
              ['Horário',  `${selectedSlot?.time} – ${selectedSlot?.endTime}`],
              ['Nome',     clientName],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4">
                <span className="text-muted">{k}</span>
                <span className="font-semibold text-ink text-right">{v}</span>
              </div>
            ))}
          </div>

          <Button
            onClick={() => {
              setSuccess(false)
              setSelectedSlot(null)
              setClientName('')
              setClientPhone('')
            }}
            variant="secondary"
            className="w-full"
            size="lg"
          >
            Fazer outra reserva
          </Button>
        </div>
      </div>
    )
  }

  /* ─── Página principal ─── */
  return (
    <div className="min-h-screen bg-canvas">
      <Toaster position="top-right" />

      {/* Header */}
      <header className="sticky top-0 z-10 bg-surface border-b border-line">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          {/* Logo BrandMark teal */}
          <div className="w-10 h-10 rounded-xl bg-brand flex items-center justify-center shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="3" fill="white"/>
              <path d="M12 2C12 2 7 6 7 12s5 10 5 10 5-4 5-10S12 2 12 2z" stroke="white" strokeWidth="1.5" fill="none"/>
              <path d="M2 12h20" stroke="white" strokeWidth="1.5"/>
            </svg>
          </div>
          <div>
            <h1 className="font-bold text-sm tracking-widest text-brand uppercase">QUADRAS</h1>
            <p className="text-[11px] text-muted">Reserve sua quadra de beach tennis</p>
          </div>
        </div>
      </header>

      {/* Conteúdo */}
      <div className="max-w-2xl mx-auto p-4 space-y-3 pb-10">

        {/* Passo 1 — Escolher quadra */}
        <div className="bg-surface border border-line rounded-[var(--radius-card)] shadow-card p-5">
          <h2 className="text-xs font-semibold text-ink tracking-widest mb-4 flex items-center gap-2 uppercase">
            <StepBadge n={1} />
            Escolha a quadra
          </h2>

          {loadingCourts ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-7 w-7 border-2 border-line border-t-brand" />
            </div>
          ) : courts.length === 0 ? (
            <p className="text-muted text-sm text-center py-6">
              Nenhuma quadra disponível no momento.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {courts.map(court => {
                const active = selectedCourt?.id === court.id
                return (
                  <button
                    key={court.id}
                    onClick={() => setSelectedCourt(court)}
                    className={[
                      'p-4 rounded-[var(--radius-ctl)] text-left transition-all',
                      active
                        ? 'bg-brand/10 border-[1.5px] border-brand'
                        : 'bg-surface-2 border border-line hover:border-brand/40',
                    ].join(' ')}
                  >
                    <p className="font-semibold text-ink text-sm">{court.name}</p>
                    <p className="text-xs text-muted mt-0.5">{COURT_TYPES[court.type]}</p>
                    <p className={['text-sm font-bold mt-2', active ? 'text-brand' : 'text-muted'].join(' ')}>
                      R$ {court.pricePerHour.toFixed(2)}<span className="font-normal text-xs">/hora</span>
                    </p>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Passo 2 — Escolher data */}
        {selectedCourt && (
          <div className="bg-surface border border-line rounded-[var(--radius-card)] shadow-card p-5">
            <h2 className="text-xs font-semibold text-ink tracking-widest mb-4 flex items-center gap-2 uppercase">
              <StepBadge n={2} />
              Escolha a data
            </h2>
            <input
              type="date"
              value={selectedDate}
              min={today}
              onChange={e => setSelectedDate(e.target.value)}
              className="w-full px-3 py-2.5 rounded-[var(--radius-ctl)] text-sm text-ink bg-surface border border-line focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors"
            />
            <p className="text-xs text-muted mt-2.5 flex items-center gap-1.5 capitalize">
              <Calendar size={12} className="text-brand" />
              {format(new Date(selectedDate + 'T12:00:00'), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </p>
          </div>
        )}

        {/* Passo 3 — Escolher horário */}
        {selectedCourt && selectedDate && (
          <div className="bg-surface border border-line rounded-[var(--radius-card)] shadow-card p-5">
            <h2 className="text-xs font-semibold text-ink tracking-widest mb-4 flex items-center gap-2 uppercase">
              <StepBadge n={3} />
              Escolha o horário
              <span className="ml-auto text-[10px] text-muted font-normal normal-case tracking-normal">
                {selectedCourt.duration} min por sessão
              </span>
            </h2>

            {loadingSlots ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-7 w-7 border-2 border-line border-t-brand" />
              </div>
            ) : slots.length === 0 ? (
              <p className="text-muted text-sm text-center py-6">
                Sem horários disponíveis nesta data.
              </p>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {slots.map(slot => {
                  const selected = selectedSlot?.time === slot.time
                  return (
                    <button
                      key={slot.time}
                      disabled={!slot.available}
                      onClick={() => setSelectedSlot(slot)}
                      className={[
                        'px-2 py-3 rounded-[var(--radius-ctl)] text-sm font-semibold transition-all flex flex-col items-center gap-0.5 disabled:cursor-not-allowed',
                        selected
                          ? 'bg-primary text-white border-[1.5px] border-primary'
                          : slot.available
                          ? 'border border-line hover:border-brand hover:text-brand text-ink'
                          : 'bg-surface-2 text-subtle line-through border border-line',
                      ].join(' ')}
                    >
                      {slot.available && !selected && (
                        <Clock size={10} className="text-brand" />
                      )}
                      {slot.time}
                    </button>
                  )
                })}
              </div>
            )}

            {/* Legenda */}
            <div className="flex items-center gap-4 mt-4 text-[11px] text-muted">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-primary" />
                Selecionado
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded border border-line bg-surface" />
                Disponível
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-surface-2 border border-line" />
                Ocupado
              </span>
            </div>
          </div>
        )}

        {/* Passo 4 — Dados do cliente */}
        {selectedSlot && (
          <div className="bg-surface border border-line rounded-[var(--radius-card)] shadow-card p-5">
            <h2 className="text-xs font-semibold text-ink tracking-widest mb-4 flex items-center gap-2 uppercase">
              <StepBadge n={4} />
              Seus dados
            </h2>

            {/* Resumo da seleção */}
            <div className="bg-primary/5 border border-primary/20 rounded-[var(--radius-ctl)] p-3.5 mb-5 flex items-start gap-3">
              <Zap size={16} className="text-primary mt-0.5 shrink-0" />
              <div className="text-sm">
                <p className="font-semibold text-ink">
                  {selectedCourt?.name} · {selectedSlot.time} – {selectedSlot.endTime}
                </p>
                <p className="text-muted text-xs mt-0.5">
                  {format(new Date(selectedDate + 'T12:00:00'), "dd/MM/yyyy", { locale: ptBR })} ·{' '}
                  <span className="text-brand font-medium">
                    R$ {(selectedCourt!.pricePerHour * (selectedCourt!.duration / 60)).toFixed(2)}
                  </span>
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <Input
                label="Nome completo"
                value={clientName}
                onChange={e => setClientName(e.target.value)}
                placeholder="Ex: João da Silva"
              />
              <Input
                label="Telefone / WhatsApp"
                value={clientPhone}
                onChange={e => setClientPhone(e.target.value)}
                placeholder="Ex: (11) 99999-9999"
                type="tel"
              />
              <Button
                onClick={handleReservar}
                loading={saving}
                size="lg"
                className="w-full"
              >
                Confirmar reserva
              </Button>
              <p className="text-xs text-muted text-center leading-relaxed">
                Sua reserva ficará <span className="text-ink font-medium">pendente</span> até ser confirmada pelo responsável.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
