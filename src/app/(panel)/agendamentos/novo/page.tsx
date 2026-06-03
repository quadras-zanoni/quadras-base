'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useCourts } from '@/hooks/useCourts'
import { useBookings } from '@/hooks/useBookings'
import { useClients } from '@/hooks/useClients'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { format, addMinutes, parse, addWeeks, getDay, addDays, isAfter, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import toast from 'react-hot-toast'
import { Clock, CheckCircle, RefreshCw, User, UserPlus, ChevronLeft } from 'lucide-react'
import { Court } from '@/types'

const DAYS_OF_WEEK = [
  { label: 'Dom', value: 0 },
  { label: 'Seg', value: 1 },
  { label: 'Ter', value: 2 },
  { label: 'Qua', value: 3 },
  { label: 'Qui', value: 4 },
  { label: 'Sex', value: 5 },
  { label: 'Sáb', value: 6 },
]

function generateTimeSlots(court: Court, existingBookings: Array<{ startTime: string; endTime: string; status: string }>) {
  const slots: { time: string; available: boolean }[] = []
  let current = parse(court.openTime, 'HH:mm', new Date())
  const close = parse(court.closeTime, 'HH:mm', new Date())
  while (current < close) {
    const next = addMinutes(current, court.duration)
    if (next > close) break
    const startStr = format(current, 'HH:mm')
    const endStr = format(next, 'HH:mm')
    const isBooked = existingBookings
      .filter(b => b.status !== 'cancelado')
      .some(b => startStr < b.endTime && endStr > b.startTime)
    slots.push({ time: startStr, available: !isBooked })
    current = next
  }
  return slots
}

// Gera todas as datas recorrentes dado os dias da semana e período
function generateRecurringDates(startDate: string, selectedDays: number[], weeks: number): string[] {
  const dates: string[] = []
  const start = parseISO(startDate)
  const end = addWeeks(start, weeks)
  let cursor = start

  while (!isAfter(cursor, end)) {
    if (selectedDays.includes(getDay(cursor))) {
      dates.push(format(cursor, 'yyyy-MM-dd'))
    }
    cursor = addDays(cursor, 1)
  }
  return dates
}

type ClientMode = 'existing' | 'new'

export default function NovoAgendamentoPage() {
  const router = useRouter()
  const { courts } = useCourts()

  const [courtId, setCourtId] = useState('')
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))

  // --- Modo recorrente: 1 horário (comportamento original) ---
  const [startTime, setStartTime] = useState('')

  // --- Modo não-recorrente: múltiplos slots ---
  const [selectedSlots, setSelectedSlots] = useState<string[]>([])

  const [clientName, setClientName] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState<'pendente' | 'confirmado'>('confirmado')
  const [customValue, setCustomValue] = useState('')
  const [discount, setDiscount] = useState('')
  const [saving, setSaving] = useState(false)

  // Recorrência
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurringDays, setRecurringDays] = useState<number[]>([])
  const [recurringWeeks, setRecurringWeeks] = useState(4)

  // Seletor de cliente
  const [clientMode, setClientMode] = useState<ClientMode>('new')
  const [selectedClientId, setSelectedClientId] = useState('')

  const { bookings, addBooking, checkAvailability } = useBookings(date)
  const { clients, upsertClient } = useClients()

  const selectedCourt = courts.find(c => c.id === courtId)
  const dayBookings = bookings.filter(b => b.courtId === courtId)
  const slots = selectedCourt ? generateTimeSlots(selectedCourt, dayBookings) : []

  // endTime para recorrente (1 slot)
  const endTime = selectedCourt && startTime
    ? format(addMinutes(parse(startTime, 'HH:mm', new Date()), selectedCourt.duration), 'HH:mm')
    : ''

  const defaultValue = selectedCourt ? selectedCourt.pricePerHour * (selectedCourt.duration / 60) : 0

  // --- Cálculo de valor para modo não-recorrente multi-slot ---
  const slotCount = selectedSlots.length
  const perSlotDefault = defaultValue // valor por slot = preço da duração
  const multiTotal = customValue !== '' ? Number(customValue) : (perSlotDefault * (slotCount || 1))
  const discountVal = discount !== '' ? Math.max(0, Number(discount)) : 0
  const finalMultiTotal = Math.max(0, multiTotal - discountVal)
  const valuePerSlot = slotCount > 0 ? finalMultiTotal / slotCount : finalMultiTotal

  // --- Valor para modo recorrente (comportamento original) ---
  const finalValue = customValue !== '' ? Number(customValue) : defaultValue

  // Clientes ordenados por nome (já vêm ordenados do hook)
  const sortedClients = useMemo(() => clients, [clients])

  function handleCourtChange(id: string) {
    setCourtId(id)
    setStartTime('')
    setSelectedSlots([])
    const court = courts.find(c => c.id === id)
    if (court) setCustomValue(String(court.pricePerHour * (court.duration / 60)))
  }

  function toggleDay(day: number) {
    setRecurringDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    )
  }

  // Toggle de slot no modo multi-slot
  function toggleSlot(time: string) {
    setSelectedSlots(prev =>
      prev.includes(time) ? prev.filter(t => t !== time) : [...prev, time]
    )
  }

  // Quando seleciona cliente existente, preenche nome e telefone
  function handleSelectExistingClient(id: string) {
    setSelectedClientId(id)
    const found = clients.find(c => c.id === id)
    if (found) {
      setClientName(found.name)
      setClientPhone(found.phone)
    } else {
      setClientName('')
      setClientPhone('')
    }
  }

  // Preview das datas recorrentes
  const previewDates = isRecurring && recurringDays.length > 0 && startTime
    ? generateRecurringDates(date, recurringDays, recurringWeeks).slice(0, 20)
    : []

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!courtId) return toast.error('Selecione uma quadra')

    if (isRecurring) {
      if (!startTime) return toast.error('Selecione um horário')
    } else {
      if (selectedSlots.length === 0) return toast.error('Selecione pelo menos um horário')
    }

    if (!clientName.trim()) return toast.error('Informe o nome do cliente')
    if (!clientPhone.trim()) return toast.error('Informe o telefone do cliente')

    if (isRecurring && finalValue < 0) return toast.error('Valor inválido')
    if (!isRecurring && finalMultiTotal < 0) return toast.error('Valor inválido')
    if (isRecurring && recurringDays.length === 0) return toast.error('Selecione pelo menos um dia da semana')

    setSaving(true)
    try {
      const clientId = await upsertClient(clientName, clientPhone, date)

      if (!isRecurring) {
        // Agendamentos múltiplos (um por slot selecionado)
        let created = 0
        let skipped = 0

        // Ordenar slots cronologicamente
        const sortedSelected = [...selectedSlots].sort()

        for (const slot of sortedSelected) {
          const slotEnd = format(
            addMinutes(parse(slot, 'HH:mm', new Date()), selectedCourt!.duration),
            'HH:mm'
          )
          const available = await checkAvailability(courtId, date, slot, slotEnd)
          if (!available) {
            skipped++
            toast.error(`Horário ${slot} já está ocupado — pulado`)
            continue
          }
          await addBooking({
            courtId, courtName: selectedCourt!.name,
            clientId: clientId || undefined, clientName, clientPhone, notes,
            date, startTime: slot, endTime: slotEnd,
            value: valuePerSlot,
            status,
          })
          created++
        }

        if (created > 0) {
          toast.success(
            `${created} agendamento${created !== 1 ? 's' : ''} criado${created !== 1 ? 's' : ''}!` +
            (skipped > 0 ? ` (${skipped} conflito${skipped !== 1 ? 's' : ''} ignorado${skipped !== 1 ? 's' : ''})` : '')
          )
        } else {
          toast.error('Nenhum horário disponível')
          setSaving(false)
          return
        }
      } else {
        // Agendamentos recorrentes (comportamento original: 1 horário)
        const available = await checkAvailability(courtId, date, startTime, endTime)
        const dates = generateRecurringDates(date, recurringDays, recurringWeeks)
        let created = 0
        let skipped = 0

        // Verifica a data inicial separadamente
        if (!available) { skipped++ }

        for (const d of dates) {
          const avail = await checkAvailability(courtId, d, startTime, endTime)
          if (!avail) { skipped++; continue }
          await addBooking({
            courtId, courtName: selectedCourt!.name,
            clientId: clientId || undefined, clientName, clientPhone,
            notes: notes ? `[Recorrente] ${notes}` : '[Recorrente]',
            date: d, startTime, endTime, value: finalValue, status,
          })
          created++
        }

        if (created > 0) toast.success(`${created} agendamento${created !== 1 ? 's' : ''} criado${created !== 1 ? 's' : ''}!${skipped > 0 ? ` (${skipped} conflito${skipped !== 1 ? 's' : ''} ignorado${skipped !== 1 ? 's' : ''})` : ''}`)
        else toast.error('Nenhum horário disponível nas datas selecionadas')
      }

      router.push('/agenda')
    } catch {
      toast.error('Erro ao criar agendamento')
    } finally {
      setSaving(false)
    }
  }

  const activeCourts = courts.filter(c => c.status === 'ativa')

  return (
    <div className="max-w-2xl">
      <button
        type="button"
        onClick={() => router.back()}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-ink mb-4 transition-colors"
      >
        <ChevronLeft size={16} /> Voltar
      </button>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink">Novo Agendamento</h1>
        <p className="text-sm text-muted mt-1">Preencha os dados para reservar uma quadra</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="p-5">
          <h2 className="text-base font-semibold text-ink mb-4">Quadra e horário</h2>
          <div className="space-y-4">
            <Select label="Quadra" value={courtId} onChange={e => handleCourtChange(e.target.value)}>
              <option value="">Selecione uma quadra</option>
              {activeCourts.map(c => (
                <option key={c.id} value={c.id}>{c.name} – R$ {c.pricePerHour.toFixed(2)}/hora</option>
              ))}
            </Select>

            <Input
              label="Data inicial"
              type="date"
              value={date}
              onChange={e => { setDate(e.target.value); setStartTime(''); setSelectedSlots([]) }}
            />

            {selectedCourt && (
              <div>
                <label className="block text-[13px] font-medium text-ink mb-2">
                  {isRecurring
                    ? `Horário (${selectedCourt.duration} min por slot)`
                    : `Horários (${selectedCourt.duration} min por slot — selecione um ou mais)`}
                </label>
                {slots.length === 0 ? (
                  <p className="text-sm text-muted">Sem horários nesta data</p>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {slots.map(slot => {
                      const isActiveRecurring = isRecurring && startTime === slot.time
                      const isActiveMulti = !isRecurring && selectedSlots.includes(slot.time)
                      const isActive = isActiveRecurring || isActiveMulti

                      return (
                        <button
                          key={slot.time}
                          type="button"
                          disabled={!slot.available}
                          onClick={() => {
                            if (isRecurring) {
                              setStartTime(slot.time)
                            } else {
                              toggleSlot(slot.time)
                            }
                          }}
                          className={`px-3 py-2 rounded-[var(--radius-ctl)] text-sm font-medium border transition-colors ${
                            isActive
                              ? 'bg-primary text-white border-primary'
                              : slot.available
                              ? 'bg-surface text-ink border-line hover:border-brand hover:text-brand'
                              : 'bg-surface-2 text-subtle border-line cursor-not-allowed'
                          }`}
                        >
                          {slot.available
                            ? <span className="flex items-center justify-center gap-1"><Clock size={12} />{slot.time}</span>
                            : <span className="line-through">{slot.time}</span>
                          }
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Confirmação visual — modo recorrente (1 slot) */}
            {isRecurring && startTime && endTime && selectedCourt && (
              <div className="bg-success/10 border border-success/20 rounded-[var(--radius-ctl)] p-3 flex items-center gap-2">
                <CheckCircle size={18} className="text-success shrink-0" />
                <span className="text-sm text-ink">
                  <strong>{startTime} – {endTime}</strong> · {selectedCourt.name}
                </span>
              </div>
            )}

            {/* Confirmação visual — modo multi-slot */}
            {!isRecurring && selectedSlots.length > 0 && selectedCourt && (
              <div className="bg-success/10 border border-success/20 rounded-[var(--radius-ctl)] p-3">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle size={18} className="text-success shrink-0" />
                  <span className="text-sm font-medium text-ink">
                    {selectedSlots.length} slot{selectedSlots.length !== 1 ? 's' : ''} selecionado{selectedSlots.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {[...selectedSlots].sort().map(s => {
                    const sEnd = format(addMinutes(parse(s, 'HH:mm', new Date()), selectedCourt.duration), 'HH:mm')
                    return (
                      <span key={s} className="text-xs bg-surface border border-success/30 text-success px-2 py-0.5 rounded-full font-medium">
                        {s}–{sEnd}
                      </span>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Valor e desconto */}
            {!isRecurring ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label={`Subtotal (R$) — ${slotCount || 1} slot${(slotCount || 1) !== 1 ? 's' : ''}`}
                    type="number"
                    min="0"
                    step="0.01"
                    value={customValue}
                    onChange={e => setCustomValue(e.target.value)}
                    placeholder={(perSlotDefault * (slotCount || 1)).toFixed(2)}
                  />
                  <Input
                    label="Desconto (R$)"
                    type="number"
                    min="0"
                    step="0.01"
                    value={discount}
                    onChange={e => setDiscount(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                {(discountVal > 0 || slotCount > 1) && (
                  <div className="flex items-center justify-between bg-surface-2 rounded-[var(--radius-ctl)] px-3 py-2 text-sm">
                    <span className="text-muted">Total final</span>
                    <span className="font-semibold text-ink">R$ {finalMultiTotal.toFixed(2)}</span>
                  </div>
                )}
                {slotCount > 1 && (
                  <p className="text-xs text-muted">
                    Cada agendamento receberá R$ {valuePerSlot.toFixed(2)} (total ÷ {slotCount} slots)
                  </p>
                )}
                <Select label="Status inicial" value={status} onChange={e => setStatus(e.target.value as 'pendente' | 'confirmado')}>
                  <option value="confirmado">Confirmado</option>
                  <option value="pendente">Pendente</option>
                </Select>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Valor (R$)"
                  type="number"
                  min="0"
                  step="0.01"
                  value={customValue}
                  onChange={e => setCustomValue(e.target.value)}
                  placeholder={defaultValue.toFixed(2)}
                />
                <Select label="Status inicial" value={status} onChange={e => setStatus(e.target.value as 'pendente' | 'confirmado')}>
                  <option value="confirmado">Confirmado</option>
                  <option value="pendente">Pendente</option>
                </Select>
              </div>
            )}
          </div>
        </Card>

        {/* Recorrência */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-ink flex items-center gap-2">
              <RefreshCw size={16} className="text-muted" />
              Agendamento recorrente
            </h2>
            <label className="flex items-center gap-2 cursor-pointer">
              <div
                onClick={() => {
                  setIsRecurring(!isRecurring)
                  // Limpa seleções ao trocar modo
                  setStartTime('')
                  setSelectedSlots([])
                }}
                className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer ${isRecurring ? 'bg-brand' : 'bg-surface-2'}`}
              >
                <div className={`w-4 h-4 bg-surface rounded-full absolute top-1 transition-transform shadow-sm ${isRecurring ? 'translate-x-5' : 'translate-x-1'}`} />
              </div>
              <span className="text-sm text-muted">{isRecurring ? 'Ativado' : 'Desativado'}</span>
            </label>
          </div>

          {isRecurring && (
            <div className="space-y-4">
              <div>
                <label className="block text-[13px] font-medium text-ink mb-2">
                  Repetir às {startTime || '??:??'} nos dias:
                </label>
                <div className="flex gap-2 flex-wrap">
                  {DAYS_OF_WEEK.map(d => (
                    <button
                      key={d.value}
                      type="button"
                      onClick={() => toggleDay(d.value)}
                      className={`px-3 py-1.5 rounded-[var(--radius-ctl)] text-sm font-medium border transition-colors ${
                        recurringDays.includes(d.value)
                          ? 'bg-primary text-white border-primary'
                          : 'bg-surface text-ink border-line hover:border-brand hover:text-brand'
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <label className="text-[13px] font-medium text-ink whitespace-nowrap">Repetir por</label>
                <select
                  value={recurringWeeks}
                  onChange={e => setRecurringWeeks(Number(e.target.value))}
                  className="px-3 py-2 border border-line rounded-[var(--radius-ctl)] text-sm text-ink bg-surface focus:outline-none focus:ring-2 focus:border-brand focus:ring-brand/20 transition-colors"
                >
                  {[1, 2, 3, 4, 6, 8, 12].map(w => (
                    <option key={w} value={w}>{w} semana{w !== 1 ? 's' : ''}</option>
                  ))}
                </select>
              </div>

              {previewDates.length > 0 && (
                <div className="bg-info/10 border border-info/20 rounded-[var(--radius-ctl)] p-3">
                  <p className="text-xs font-semibold text-info mb-2">
                    {previewDates.length} agendamento{previewDates.length !== 1 ? 's' : ''} serão criados:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {previewDates.slice(0, 12).map(d => (
                      <span key={d} className="text-xs bg-surface border border-info/20 text-info px-2 py-0.5 rounded-full font-medium">
                        {format(parseISO(d), 'dd/MM', { locale: ptBR })}
                      </span>
                    ))}
                    {previewDates.length > 12 && (
                      <span className="text-xs text-muted">+{previewDates.length - 12} mais</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Dados do cliente */}
        <Card className="p-5">
          <h2 className="text-base font-semibold text-ink mb-4">Dados do cliente</h2>
          <div className="space-y-4">

            {/* Toggle novo / existente */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setClientMode('existing'); setClientName(''); setClientPhone(''); setSelectedClientId('') }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-ctl)] text-sm font-medium border transition-colors ${
                  clientMode === 'existing'
                    ? 'bg-primary text-white border-primary'
                    : 'bg-surface text-ink border-line hover:border-brand hover:text-brand'
                }`}
              >
                <User size={14} />
                Cliente cadastrado
              </button>
              <button
                type="button"
                onClick={() => { setClientMode('new'); setSelectedClientId(''); setClientName(''); setClientPhone('') }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-ctl)] text-sm font-medium border transition-colors ${
                  clientMode === 'new'
                    ? 'bg-primary text-white border-primary'
                    : 'bg-surface text-ink border-line hover:border-brand hover:text-brand'
                }`}
              >
                <UserPlus size={14} />
                Novo cliente
              </button>
            </div>

            {/* Modo: cliente existente */}
            {clientMode === 'existing' && (
              <>
                {sortedClients.length === 0 ? (
                  <p className="text-sm text-muted">Nenhum cliente cadastrado ainda.</p>
                ) : (
                  <Select
                    label="Selecionar cliente"
                    value={selectedClientId}
                    onChange={e => handleSelectExistingClient(e.target.value)}
                  >
                    <option value="">Escolha um cliente…</option>
                    {sortedClients.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name}{c.phone ? ` — ${c.phone}` : ''}
                      </option>
                    ))}
                  </Select>
                )}
                {/* Campos editáveis pré-preenchidos */}
                {selectedClientId && (
                  <div className="space-y-3">
                    <Input
                      label="Nome completo"
                      value={clientName}
                      onChange={e => setClientName(e.target.value)}
                      placeholder="Nome do cliente"
                    />
                    <Input
                      label="Telefone / WhatsApp"
                      value={clientPhone}
                      onChange={e => setClientPhone(e.target.value)}
                      placeholder="(11) 99999-9999"
                      type="tel"
                    />
                  </div>
                )}
              </>
            )}

            {/* Modo: novo cliente */}
            {clientMode === 'new' && (
              <>
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
              </>
            )}

            <Textarea
              label="Observações (opcional)"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Ex: Pagamento feito, grupo de 5 pessoas..."
            />
          </div>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" variant="primary" loading={saving} size="lg" className="flex-1">
            {isRecurring && previewDates.length > 0
              ? `Criar ${previewDates.length} agendamento${previewDates.length !== 1 ? 's' : ''}`
              : !isRecurring && selectedSlots.length > 1
              ? `Criar ${selectedSlots.length} agendamentos`
              : 'Criar agendamento'
            }
          </Button>
          <Button type="button" variant="secondary" size="lg" onClick={() => router.back()}>Cancelar</Button>
        </div>
      </form>
    </div>
  )
}
