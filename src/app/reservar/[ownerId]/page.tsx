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
    <span
      className="w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center text-white shrink-0"
      style={{ background: 'linear-gradient(135deg,#ff00d4,#6b2cff)' }}
    >
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
      await supabase.from('bookings').insert({
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
      <div
        className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
        style={{ background: '#05050a' }}
      >
        <Toaster position="top-right" toastOptions={{
          style: { background: '#151522', color: '#f7f7ff', border: '1px solid rgba(255,255,255,0.09)' },
        }}/>

        {/* Glows */}
        <div className="fixed inset-0 pointer-events-none">
          <div style={{ position:'absolute', top:'-20%', left:'50%', transform:'translateX(-50%)',
            width:'60%', height:'60%',
            background:'radial-gradient(circle,rgba(0,217,255,0.10) 0%,transparent 65%)' }}/>
          <div style={{ position:'absolute', bottom:'-10%', left:'20%',
            width:'40%', height:'40%',
            background:'radial-gradient(circle,rgba(107,44,255,0.08) 0%,transparent 70%)' }}/>
        </div>

        <div
          className="relative rounded-lg p-8 max-w-md w-full text-center"
          style={{ background:'#0d0d16', border:'1px solid rgba(255,255,255,0.09)',
            boxShadow:'0 24px 80px rgba(0,0,0,0.5),0 0 48px rgba(0,217,255,0.08)' }}
        >
          {/* Icon */}
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
            style={{ background:'rgba(0,217,255,0.12)', border:'1px solid rgba(0,217,255,0.25)' }}
          >
            <CheckCircle size={30} style={{ color:'#00d9ff' }}/>
          </div>

          <h2 className="font-heading text-xl font-bold text-[#f7f7ff] tracking-wide mb-2">
            Reserva solicitada!
          </h2>
          <p className="text-[#a8a8bd] text-sm mb-6 leading-relaxed">
            Sua reserva foi enviada e está <span className="text-[#f7f7ff] font-semibold">aguardando confirmação</span>.
            Em breve você receberá um retorno.
          </p>

          {/* Resumo */}
          <div
            className="rounded-lg p-4 text-left space-y-2.5 text-sm mb-6"
            style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)' }}
          >
            {[
              ['Quadra',   selectedCourt?.name],
              ['Data',     format(new Date(selectedDate + 'T12:00:00'), "dd 'de' MMMM", { locale: ptBR })],
              ['Horário',  `${selectedSlot?.time} – ${selectedSlot?.endTime}`],
              ['Nome',     clientName],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4">
                <span className="text-[#a8a8bd]">{k}</span>
                <span className="font-semibold text-[#f7f7ff] text-right">{v}</span>
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
    <div className="min-h-screen relative" style={{ background: '#05050a' }}>
      <Toaster position="top-right" toastOptions={{
        style: { background: '#151522', color: '#f7f7ff', border: '1px solid rgba(255,255,255,0.09)' },
      }}/>

      {/* Background glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div style={{ position:'absolute', top:'-15%', left:'-10%',
          width:'50%', height:'50%',
          background:'radial-gradient(circle,rgba(255,0,212,0.08) 0%,transparent 65%)' }}/>
        <div style={{ position:'absolute', top:'-10%', right:'-5%',
          width:'45%', height:'45%',
          background:'radial-gradient(circle,rgba(0,217,255,0.08) 0%,transparent 65%)' }}/>
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage:'url(/court-pattern.svg)', backgroundRepeat:'repeat', backgroundSize:'140px' }}
        />
      </div>

      {/* Header */}
      <header
        className="relative z-10 px-4 py-4 border-b border-[rgba(255,255,255,0.07)]"
        style={{ background:'rgba(13,13,22,0.95)', backdropFilter:'blur(12px)' }}
      >
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background:'linear-gradient(135deg,#ff00d4,#6b2cff,#00d9ff)' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="3" fill="white"/>
              <path d="M12 2C12 2 7 6 7 12s5 10 5 10 5-4 5-10S12 2 12 2z" stroke="white" strokeWidth="1.5" fill="none"/>
              <path d="M2 12h20" stroke="white" strokeWidth="1.5"/>
            </svg>
          </div>
          <div>
            <h1 className="font-heading font-bold text-sm tracking-widest gradient-text">QUADRAS</h1>
            <p className="text-[10px] text-[#a8a8bd]">Reserve sua quadra de beach tennis</p>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="relative z-10 max-w-2xl mx-auto p-4 space-y-3 pb-10">

        {/* Passo 1 — Escolher quadra */}
        <div
          className="rounded-lg p-5 border border-[rgba(255,255,255,0.09)]"
          style={{ background:'#0d0d16' }}
        >
          <h2 className="font-heading text-xs font-semibold text-[#f7f7ff] tracking-widest mb-4 flex items-center gap-2">
            <StepBadge n={1} />
            ESCOLHA A QUADRA
          </h2>

          {loadingCourts ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-7 w-7 border-2 border-transparent border-t-[#6b2cff]"/>
            </div>
          ) : courts.length === 0 ? (
            <p className="text-[#a8a8bd] text-sm text-center py-6">
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
                    className="p-4 rounded-lg text-left transition-all"
                    style={{
                      background: active ? 'rgba(107,44,255,0.12)' : 'rgba(255,255,255,0.03)',
                      border: active
                        ? '1.5px solid #6b2cff'
                        : '1px solid rgba(255,255,255,0.09)',
                      boxShadow: active ? '0 0 18px rgba(107,44,255,0.18)' : 'none',
                    }}
                  >
                    <p className="font-semibold text-[#f7f7ff] text-sm">{court.name}</p>
                    <p className="text-xs text-[#a8a8bd] mt-0.5">{COURT_TYPES[court.type]}</p>
                    <p
                      className="text-sm font-bold mt-2"
                      style={{ color: active ? '#00d9ff' : '#a8a8bd' }}
                    >
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
          <div
            className="rounded-lg p-5 border border-[rgba(255,255,255,0.09)]"
            style={{ background:'#0d0d16' }}
          >
            <h2 className="font-heading text-xs font-semibold text-[#f7f7ff] tracking-widest mb-4 flex items-center gap-2">
              <StepBadge n={2} />
              ESCOLHA A DATA
            </h2>
            <input
              type="date"
              value={selectedDate}
              min={today}
              onChange={e => setSelectedDate(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg text-sm text-[#f7f7ff] focus:outline-none focus:ring-1 focus:ring-[#6b2cff] focus:border-[#6b2cff] transition-all"
              style={{
                background:'#0a0a14',
                border:'1px solid rgba(255,255,255,0.09)',
                colorScheme:'dark',
              }}
            />
            <p className="text-xs text-[#a8a8bd] mt-2.5 flex items-center gap-1.5 capitalize">
              <Calendar size={12} style={{ color:'#6b2cff' }}/>
              {format(new Date(selectedDate + 'T12:00:00'), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </p>
          </div>
        )}

        {/* Passo 3 — Escolher horário */}
        {selectedCourt && selectedDate && (
          <div
            className="rounded-lg p-5 border border-[rgba(255,255,255,0.09)]"
            style={{ background:'#0d0d16' }}
          >
            <h2 className="font-heading text-xs font-semibold text-[#f7f7ff] tracking-widest mb-4 flex items-center gap-2">
              <StepBadge n={3} />
              ESCOLHA O HORÁRIO
              <span className="ml-auto text-[10px] text-[#a8a8bd] font-normal normal-case tracking-normal">
                {selectedCourt.duration} min por sessão
              </span>
            </h2>

            {loadingSlots ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-7 w-7 border-2 border-transparent border-t-[#6b2cff]"/>
              </div>
            ) : slots.length === 0 ? (
              <p className="text-[#a8a8bd] text-sm text-center py-6">
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
                      className="px-2 py-3 rounded-lg text-sm font-semibold transition-all flex flex-col items-center gap-0.5 disabled:cursor-not-allowed"
                      style={
                        selected
                          ? {
                              background: 'linear-gradient(135deg,#ff00d4,#6b2cff)',
                              color: '#fff',
                              border: '1.5px solid transparent',
                              boxShadow: '0 0 16px rgba(107,44,255,0.35)',
                            }
                          : slot.available
                          ? {
                              background: 'rgba(255,255,255,0.04)',
                              color: '#f7f7ff',
                              border: '1px solid rgba(255,255,255,0.09)',
                            }
                          : {
                              background: 'rgba(255,255,255,0.02)',
                              color: 'rgba(168,168,189,0.3)',
                              border: '1px solid rgba(255,255,255,0.04)',
                              textDecoration: 'line-through',
                            }
                      }
                    >
                      {slot.available && !selected && (
                        <Clock size={10} style={{ color:'#6b2cff' }}/>
                      )}
                      {slot.time}
                    </button>
                  )
                })}
              </div>
            )}

            {/* Legenda */}
            <div className="flex items-center gap-4 mt-4 text-[11px] text-[#a8a8bd]">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded" style={{ background:'linear-gradient(135deg,#ff00d4,#6b2cff)' }}/>
                Selecionado
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded" style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.09)' }}/>
                Disponível
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded" style={{ background:'rgba(255,255,255,0.02)' }}/>
                Ocupado
              </span>
            </div>
          </div>
        )}

        {/* Passo 4 — Dados do cliente */}
        {selectedSlot && (
          <div
            className="rounded-lg p-5 border border-[rgba(255,255,255,0.09)]"
            style={{ background:'#0d0d16' }}
          >
            <h2 className="font-heading text-xs font-semibold text-[#f7f7ff] tracking-widest mb-4 flex items-center gap-2">
              <StepBadge n={4} />
              SEUS DADOS
            </h2>

            {/* Resumo da seleção */}
            <div
              className="rounded-lg p-3.5 mb-5 flex items-start gap-3"
              style={{
                background:'rgba(107,44,255,0.08)',
                border:'1px solid rgba(107,44,255,0.22)',
              }}
            >
              <Zap size={16} style={{ color:'#a855f7', marginTop:2, flexShrink:0 }}/>
              <div className="text-sm">
                <p className="font-semibold text-[#f7f7ff]">
                  {selectedCourt?.name} · {selectedSlot.time} – {selectedSlot.endTime}
                </p>
                <p className="text-[#a8a8bd] text-xs mt-0.5">
                  {format(new Date(selectedDate + 'T12:00:00'), "dd/MM/yyyy", { locale: ptBR })} ·{' '}
                  <span style={{ color:'#00d9ff' }}>
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
              <p className="text-xs text-[#a8a8bd] text-center leading-relaxed">
                Sua reserva ficará <span className="text-[#f7f7ff]">pendente</span> até ser confirmada pelo responsável.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
