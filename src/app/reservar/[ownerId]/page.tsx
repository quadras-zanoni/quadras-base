'use client'

import { useState, useEffect, use } from 'react'
import { supabase } from '@/lib/supabase'
import { Court, Modality, MODALITIES } from '@/types'
import { slotValueAt } from '@/lib/pricing'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { format, addMinutes, parse } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Clock, CheckCircle, Calendar, Zap, ChevronLeft, MessageCircle } from 'lucide-react'
import toast from 'react-hot-toast'

/* ─── tipos locais ─── */
type Slot = { time: string; endTime: string; available: boolean }
/* horário ocupado vindo da RPC get_booked_slots (sem dados de cliente) */
type BusySlot = { startTime: string; endTime: string }

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function generateSlots(court: Court, busy: BusySlot[], dateISO: string): Slot[] {
  const slots: Slot[] = []
  let current = parse(court.openTime, 'HH:mm', new Date())
  const close = parse(court.closeTime, 'HH:mm', new Date())

  // se a data escolhida é hoje, horários que já começaram/passaram não aparecem
  const now = new Date()
  const isToday = dateISO === format(now, 'yyyy-MM-dd')
  const nowStr  = format(now, 'HH:mm')

  while (current < close) {
    const next = addMinutes(current, court.duration)
    if (next > close) break
    const startStr = format(current, 'HH:mm')
    const endStr   = format(next,    'HH:mm')
    current = next
    if (isToday && startStr <= nowStr) continue   // horário passado → some
    const taken = busy.some(b => startStr < b.endTime && endStr > b.startTime)
    slots.push({ time: startStr, endTime: endStr, available: !taken })
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

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1 text-xs text-muted hover:text-ink transition-colors mb-3"
    >
      <ChevronLeft size={14} />
      voltar
    </button>
  )
}

/* ─── BrandMark (igual ao Sidebar) ─── */
function BrandMark() {
  return (
    <div className="w-10 h-10 rounded-[10px] bg-brand flex items-center justify-center shrink-0">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="5" width="18" height="14" rx="2" stroke="white" strokeWidth="2" />
        <path d="M12 5v14" stroke="white" strokeWidth="2" />
        <circle cx="12" cy="12" r="1.6" fill="white" />
      </svg>
    </div>
  )
}

export default function ReservarPage({ params }: { params: Promise<{ ownerId: string }> }) {
  const { ownerId } = use(params)

  /* uuid efetivo (pode vir de resolução de slug) */
  const [resolvedOwnerId, setResolvedOwnerId]   = useState('')
  const [arenaNotFound, setArenaNotFound]        = useState(false)
  const [courts, setCourts]                      = useState<Court[]>([])
  const [loadingCourts, setLoadingCourts]        = useState(true)
  const [selectedCourt, setSelectedCourt]        = useState<Court | null>(null)
  const [selectedModality, setSelectedModality]  = useState<Modality | null>(null)
  const [selectedDate, setSelectedDate]          = useState(format(new Date(), 'yyyy-MM-dd'))
  const [busySlots, setBusySlots]                = useState<BusySlot[]>([])
  const [loadingSlots, setLoadingSlots]          = useState(false)
  /* multi-slot: array de slots selecionados */
  const [selectedSlots, setSelectedSlots]        = useState<Slot[]>([])
  const [clientName, setClientName]              = useState('')
  const [clientPhone, setClientPhone]            = useState('')
  const [saving, setSaving]                      = useState(false)
  const [success, setSuccess]                    = useState(false)
  /* slots confirmados (para exibir na tela de sucesso) */
  const [confirmedSlots, setConfirmedSlots]      = useState<Slot[]>([])
  /* modalidade confirmada (salva no momento do submit) */
  const [confirmedModality, setConfirmedModality] = useState<Modality | null>(null)
  /* número de WhatsApp da arena — botão "avisar a arena" na tela de sucesso */
  const [arenaWhatsapp, setArenaWhatsapp]        = useState('')

  /* ─── resolver slug → uuid + carregar quadras ─── */
  useEffect(() => {
    async function load() {
      /* 1. Resolver ownerId (UUID direto ou slug legível) */
      let ownerUuid = ownerId
      if (!UUID_REGEX.test(ownerId)) {
        const { data: slugData, error: slugError } = await supabase
          .rpc('resolve_arena_slug', { p_slug: ownerId })
        /* o retorno pode vir como scalar string ou array[0] */
        const resolved = Array.isArray(slugData) ? slugData[0] : slugData
        if (slugError || !resolved) {
          setArenaNotFound(true)
          setLoadingCourts(false)
          return
        }
        ownerUuid = resolved as string
      }
      setResolvedOwnerId(ownerUuid)

      /* 2. Carregar quadras */
      const { data } = await supabase
        .rpc('get_public_courts', { p_owner_id: ownerUuid })
      const rows = (data || []) as Array<{
        id: string; owner_id: string; name: string
        modalities: Modality[]
        price_tiers: Court['priceTiers']
        price_per_hour: number; duration: number; open_time: string
        close_time: string; status: string; created_at: string; updated_at: string
      }>
      setCourts(rows.map(row => ({
        id:           row.id,
        ownerId:      row.owner_id,
        name:         row.name,
        modalities:   row.modalities  || [],
        priceTiers:   row.price_tiers || [],
        pricePerHour: row.price_per_hour,
        duration:     row.duration,
        openTime:     row.open_time,
        closeTime:    row.close_time,
        status:       row.status,
        createdAt:    row.created_at,
        updatedAt:    row.updated_at,
      } as Court)))

      /* 3. Número de WhatsApp da arena (RPC pública, só o número) */
      const { data: arena } = await supabase
        .rpc('get_public_arena', { p_owner_id: ownerUuid })
      const waRow = (arena || [])[0] as { notify_whatsapp: string } | undefined
      setArenaWhatsapp(waRow?.notify_whatsapp || '')

      setLoadingCourts(false)
    }
    load()
  }, [ownerId])

  /* ─── carregar horários ocupados do dia (sem dados de cliente) ─── */
  useEffect(() => {
    if (!selectedCourt || !selectedDate || !resolvedOwnerId) return
    setLoadingSlots(true)
    setSelectedSlots([])

    supabase
      .rpc('get_booked_slots', {
        p_owner_id: resolvedOwnerId,
        p_court_id: selectedCourt.id,
        p_date:     selectedDate,
      })
      .then(({ data }) => {
        setBusySlots((data || []).map((row: { start_time: string; end_time: string }) => ({
          startTime: row.start_time,
          endTime:   row.end_time,
        })))
        setLoadingSlots(false)
      })
  }, [selectedCourt, selectedDate, resolvedOwnerId])

  /* ─── toggle de slot ─── */
  function toggleSlot(slot: Slot) {
    setSelectedSlots(prev => {
      const already = prev.some(s => s.time === slot.time)
      if (already) return prev.filter(s => s.time !== slot.time)
      return [...prev, slot].sort((a, b) => a.time.localeCompare(b.time))
    })
  }

  /* ─── valor total: soma slotValueAt de cada slot selecionado ─── */
  const totalValue = selectedCourt && selectedDate
    ? selectedSlots.reduce((sum, s) => sum + slotValueAt(selectedCourt, selectedDate, s.time), 0)
    : 0

  /* ─── confirmar reserva (multi-slot, aborta se qualquer conflito) ─── */
  async function handleReservar() {
    if (!selectedCourt || selectedSlots.length === 0) return
    if (!clientName.trim())  return toast.error('Informe seu nome completo')
    if (!clientPhone.trim()) return toast.error('Informe seu telefone')

    /* validar modalidade quando há mais de uma opção */
    if (selectedCourt.modalities.length > 1 && !selectedModality) {
      return toast.error('Escolha a modalidade que vai jogar')
    }
    /* auto-resolve se só há uma modalidade */
    const modality: Modality | null = selectedModality ?? (selectedCourt.modalities[0] ?? null)

    setSaving(true)
    try {
      /* checagem de conflito client-side (UX). A garantia real é a trava
         uq_booking_active_slot no banco + a transação da RPC. */
      const { data: busy } = await supabase.rpc('get_booked_slots', {
        p_owner_id: resolvedOwnerId,
        p_court_id: selectedCourt.id,
        p_date:     selectedDate,
      })
      const active = (busy || []) as { start_time: string; end_time: string }[]

      const conflicting = selectedSlots.filter(slot =>
        active.some(b => slot.time < b.end_time && slot.endTime > b.start_time)
      )

      if (conflicting.length > 0) {
        const times = conflicting.map(s => s.time).join(', ')
        toast.error(`Conflito nos horários: ${times}. Revise sua seleção.`)
        /* remove apenas os conflitantes da seleção para o cliente ajustar */
        setSelectedSlots(prev => prev.filter(s => !conflicting.some(c => c.time === s.time)))
        setSaving(false)
        return
      }

      /* cria todas as reservas numa transação (all-or-nothing) via RPC */
      const { error } = await supabase.rpc('create_public_bookings', {
        p_owner_id:     resolvedOwnerId,
        p_court_id:     selectedCourt.id,
        p_court_name:   selectedCourt.name,
        p_client_name:  clientName.trim(),
        p_client_phone: clientPhone.trim(),
        p_date:         selectedDate,
        p_slots:        selectedSlots.map(s => ({
          start_time: s.time,
          end_time:   s.endTime,
          value:      slotValueAt(selectedCourt, selectedDate, s.time),
        })),
        p_value:        slotValueAt(selectedCourt, selectedDate, selectedSlots[0].time),
        p_modality:     modality,
      })
      if (error) throw error

      setConfirmedSlots(selectedSlots)
      setConfirmedModality(modality)
      setSuccess(true)
    } catch (err) {
      console.error(err)
      toast.error('Erro ao reservar. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  /* ─── avisar a arena no WhatsApp (click-to-chat / wa.me) ─── */
  function notifyArenaWhatsApp() {
    const cleaned = arenaWhatsapp.replace(/\D/g, '')
    const withCountry = cleaned.startsWith('55') ? cleaned : `55${cleaned}`
    const dateStr = format(new Date(selectedDate + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR })
    const horarios = confirmedSlots.map(s => `${s.time}–${s.endTime}`).join(', ')
    const modalityLabel = confirmedModality ? MODALITIES[confirmedModality] : ''
    const msg =
      `Olá! Sou ${clientName}, acabei de solicitar uma reserva:\n` +
      `Quadra: ${selectedCourt?.name}\n` +
      (modalityLabel ? `Modalidade: ${modalityLabel}\n` : '') +
      `Data: ${dateStr}\n` +
      `Horário(s): ${horarios}\n\n` +
      `Pode confirmar?`
    window.open(`https://wa.me/${withCountry}?text=${encodeURIComponent(msg)}`, '_blank')
  }

  const slots = selectedCourt ? generateSlots(selectedCourt, busySlots, selectedDate) : []
  const today  = format(new Date(), 'yyyy-MM-dd')

  /* ─── Arena não encontrada ─── */
  if (arenaNotFound) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center p-4">
        <div className="bg-surface border border-line rounded-[var(--radius-card)] shadow-card max-w-md w-full p-8 text-center">
          <h2 className="text-xl font-bold text-ink mb-2">Arena não encontrada</h2>
          <p className="text-muted text-sm leading-relaxed">
            O link que você acessou não corresponde a nenhuma arena cadastrada.
            Verifique o endereço e tente novamente.
          </p>
        </div>
      </div>
    )
  }

  /* ─── Tela de sucesso ─── */
  if (success) {
    /* total dos slots confirmados (com preço por faixa) */
    const confirmedTotal = selectedCourt
      ? confirmedSlots.reduce((sum, s) => sum + slotValueAt(selectedCourt, selectedDate, s.time), 0)
      : 0

    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center p-4">
        <div className="bg-surface border border-line rounded-[var(--radius-card)] shadow-card max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-5">
            <CheckCircle size={30} className="text-success" />
          </div>

          <h2 className="text-xl font-bold text-ink mb-2">
            Reserva{confirmedSlots.length > 1 ? 's solicitadas' : ' solicitada'}!
          </h2>
          <p className="text-muted text-sm mb-6 leading-relaxed">
            {confirmedSlots.length > 1
              ? `Seus ${confirmedSlots.length} horários foram enviados e estão`
              : 'Sua reserva foi enviada e está'}{' '}
            <span className="text-ink font-semibold">aguardando confirmação</span>.
            Em breve você receberá um retorno.
          </p>

          {/* Resumo */}
          <div className="bg-surface-2 border border-line rounded-[var(--radius-ctl)] p-4 text-left space-y-2.5 text-sm mb-6">
            <div className="flex justify-between gap-4">
              <span className="text-muted">Quadra</span>
              <span className="font-semibold text-ink text-right">{selectedCourt?.name}</span>
            </div>
            {confirmedModality && (
              <div className="flex justify-between gap-4">
                <span className="text-muted">Modalidade</span>
                <span className="font-semibold text-ink text-right">{MODALITIES[confirmedModality]}</span>
              </div>
            )}
            <div className="flex justify-between gap-4">
              <span className="text-muted">Data</span>
              <span className="font-semibold text-ink text-right">
                {format(new Date(selectedDate + 'T12:00:00'), "dd 'de' MMMM", { locale: ptBR })}
              </span>
            </div>

            {/* lista de horários confirmados */}
            <div className="flex flex-col gap-1 pt-1 border-t border-line">
              <span className="text-muted text-xs mb-1">
                {confirmedSlots.length > 1 ? `${confirmedSlots.length} horários` : 'Horário'}
              </span>
              {confirmedSlots.map(slot => (
                <div key={slot.time} className="flex justify-between gap-4">
                  <span className="text-subtle text-xs">{slot.time} – {slot.endTime}</span>
                  <span className="text-xs font-medium text-brand">
                    R$ {selectedCourt
                      ? slotValueAt(selectedCourt, selectedDate, slot.time).toFixed(2)
                      : '—'}
                  </span>
                </div>
              ))}
            </div>

            {confirmedSlots.length > 1 && (
              <div className="flex justify-between gap-4 pt-1 border-t border-line">
                <span className="text-muted font-semibold">Total</span>
                <span className="font-bold text-ink">
                  R$ {confirmedTotal.toFixed(2)}
                </span>
              </div>
            )}

            <div className="flex justify-between gap-4 border-t border-line pt-2">
              <span className="text-muted">Nome</span>
              <span className="font-semibold text-ink text-right">{clientName}</span>
            </div>
          </div>

          {arenaWhatsapp && (
            <Button
              onClick={notifyArenaWhatsApp}
              variant="primary"
              className="w-full mb-3"
              size="lg"
            >
              <MessageCircle size={18} /> Avisar a arena no WhatsApp
            </Button>
          )}

          <Button
            onClick={() => {
              setSuccess(false)
              setSelectedSlots([])
              setConfirmedSlots([])
              setConfirmedModality(null)
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
      {/* Header */}
      <header className="sticky top-0 z-10 bg-surface border-b border-line">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-arena-branca.png" alt="Arena do Parque" className="h-12 w-auto shrink-0" />
          <div>
            <h1 className="font-bold text-sm tracking-tight text-ink">Arena do Parque</h1>
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
                    onClick={() => {
                      setSelectedCourt(court)
                      setSelectedSlots([])
                      /* auto-seleciona quando há apenas uma modalidade */
                      setSelectedModality(court.modalities.length === 1 ? court.modalities[0] : null)
                    }}
                    className={[
                      'p-4 rounded-[var(--radius-ctl)] text-left transition-all',
                      active
                        ? 'bg-brand/10 border-[1.5px] border-brand'
                        : 'bg-surface-2 border border-line hover:border-brand/40',
                    ].join(' ')}
                  >
                    <p className="font-semibold text-ink text-sm">{court.name}</p>
                    <p className="text-xs text-muted mt-0.5">
                      {court.modalities.map(m => MODALITIES[m]).join(' · ')}
                    </p>
                    <p className={['text-sm font-bold mt-2', active ? 'text-brand' : 'text-muted'].join(' ')}>
                      R$ {court.pricePerHour.toFixed(2)}<span className="font-normal text-xs">/hora</span>
                    </p>
                  </button>
                )
              })}
            </div>
          )}

          {/* Seletor de modalidade — aparece quando a quadra tem mais de uma */}
          {selectedCourt && selectedCourt.modalities.length > 1 && (
            <div className="mt-4 pt-4 border-t border-line">
              <p className="text-xs text-muted mb-2 font-medium">Qual modalidade vai jogar?</p>
              <div className="flex flex-wrap gap-2">
                {selectedCourt.modalities.map(mod => (
                  <button
                    key={mod}
                    onClick={() => setSelectedModality(mod)}
                    className={[
                      'px-3 py-1.5 rounded-full text-sm font-medium transition-all border',
                      selectedModality === mod
                        ? 'bg-brand text-white border-brand'
                        : 'bg-surface border-line text-ink hover:border-brand/40',
                    ].join(' ')}
                  >
                    {MODALITIES[mod]}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Passo 2 — Escolher data */}
        {selectedCourt && (
          <div className="bg-surface border border-line rounded-[var(--radius-card)] shadow-card p-5">
            <BackButton onClick={() => {
              setSelectedCourt(null)
              setSelectedModality(null)
              setSelectedSlots([])
            }} />
            <h2 className="text-xs font-semibold text-ink tracking-widest mb-4 flex items-center gap-2 uppercase">
              <StepBadge n={2} />
              Escolha a data
            </h2>
            <input
              type="date"
              value={selectedDate}
              min={today}
              onChange={e => {
                setSelectedDate(e.target.value)
                setSelectedSlots([])
              }}
              className="w-full px-3 py-2.5 rounded-[var(--radius-ctl)] text-sm text-ink bg-surface border border-line focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors"
            />
            <p className="text-xs text-muted mt-2.5 flex items-center gap-1.5 capitalize">
              <Calendar size={12} className="text-brand" />
              {format(new Date(selectedDate + 'T12:00:00'), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </p>
          </div>
        )}

        {/* Passo 3 — Escolher horários */}
        {selectedCourt && selectedDate && (
          <div className="bg-surface border border-line rounded-[var(--radius-card)] shadow-card p-5">
            <BackButton onClick={() => {
              setSelectedDate(format(new Date(), 'yyyy-MM-dd'))
              setSelectedSlots([])
            }} />
            <h2 className="text-xs font-semibold text-ink tracking-widest mb-4 flex items-center gap-2 uppercase">
              <StepBadge n={3} />
              Escolha os horários
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
                  const isSelected = selectedSlots.some(s => s.time === slot.time)
                  return (
                    <button
                      key={slot.time}
                      disabled={!slot.available}
                      onClick={() => toggleSlot(slot)}
                      className={[
                        'px-2 py-3 rounded-[var(--radius-ctl)] text-sm font-semibold transition-all flex flex-col items-center gap-0.5 disabled:cursor-not-allowed',
                        isSelected
                          ? 'bg-primary text-white border-[1.5px] border-primary'
                          : slot.available
                          ? 'border border-line hover:border-brand hover:text-brand text-ink'
                          : 'bg-surface-2 text-subtle border border-line',
                      ].join(' ')}
                    >
                      {slot.available && !isSelected && (
                        <Clock size={10} className="text-brand" />
                      )}
                      <span className={slot.available ? '' : 'line-through'}>{slot.time}</span>
                      {!slot.available && (
                        <span className="text-[9px] font-medium leading-none">reservado</span>
                      )}
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
                Reservado
              </span>
            </div>

            {/* Contador de selecionados */}
            {selectedSlots.length > 0 && (
              <p className="mt-3 text-xs text-brand font-medium">
                {selectedSlots.length} horário{selectedSlots.length > 1 ? 's' : ''} selecionado{selectedSlots.length > 1 ? 's' : ''}
                {' '}· Total: <span className="font-bold">R$ {totalValue.toFixed(2)}</span>
              </p>
            )}
          </div>
        )}

        {/* Passo 4 — Dados do cliente */}
        {selectedSlots.length > 0 && (
          <div className="bg-surface border border-line rounded-[var(--radius-card)] shadow-card p-5">
            <BackButton onClick={() => setSelectedSlots([])} />
            <h2 className="text-xs font-semibold text-ink tracking-widest mb-4 flex items-center gap-2 uppercase">
              <StepBadge n={4} />
              Seus dados
            </h2>

            {/* Resumo da seleção */}
            <div className="bg-primary/5 border border-primary/20 rounded-[var(--radius-ctl)] p-3.5 mb-5">
              <div className="flex items-start gap-3">
                <Zap size={16} className="text-primary mt-0.5 shrink-0" />
                <div className="text-sm flex-1 min-w-0">
                  <p className="font-semibold text-ink">{selectedCourt?.name}</p>
                  {selectedModality && (
                    <p className="text-xs text-brand font-medium mt-0.5">
                      {MODALITIES[selectedModality]}
                    </p>
                  )}
                  <p className="text-muted text-xs mt-0.5">
                    {format(new Date(selectedDate + 'T12:00:00'), "dd/MM/yyyy", { locale: ptBR })}
                  </p>
                  {/* lista de horários selecionados com valor por faixa */}
                  <div className="mt-2 space-y-0.5">
                    {selectedSlots.map(slot => (
                      <div key={slot.time} className="flex justify-between text-xs">
                        <span className="text-ink">{slot.time} – {slot.endTime}</span>
                        <span className="text-muted">
                          R$ {selectedCourt
                            ? slotValueAt(selectedCourt, selectedDate, slot.time).toFixed(2)
                            : '—'}
                        </span>
                      </div>
                    ))}
                  </div>
                  {/* total */}
                  {selectedSlots.length > 0 && (
                    <div className="flex justify-between text-xs mt-2 pt-2 border-t border-primary/20">
                      <span className="text-muted font-semibold">
                        {selectedSlots.length} horário{selectedSlots.length > 1 ? 's' : ''}
                      </span>
                      <span className="text-brand font-bold">
                        R$ {totalValue.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
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
                Confirmar reserva{selectedSlots.length > 1 ? ` (${selectedSlots.length} horários)` : ''}
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
