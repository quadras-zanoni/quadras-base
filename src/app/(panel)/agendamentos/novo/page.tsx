'use client'

import { useState } from 'react'
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
import { Clock, CheckCircle, RefreshCw } from 'lucide-react'
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

export default function NovoAgendamentoPage() {
  const router = useRouter()
  const { courts } = useCourts()

  const [courtId, setCourtId] = useState('')
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [startTime, setStartTime] = useState('')
  const [clientName, setClientName] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [status, setStatus] = useState<'pendente' | 'confirmado'>('confirmado')
  const [customValue, setCustomValue] = useState('')
  const [saving, setSaving] = useState(false)

  // Recorrência
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurringDays, setRecurringDays] = useState<number[]>([])
  const [recurringWeeks, setRecurringWeeks] = useState(4)

  const { bookings, addBooking, checkAvailability } = useBookings(date)
  const { upsertClient } = useClients()

  const selectedCourt = courts.find(c => c.id === courtId)
  const dayBookings = bookings.filter(b => b.courtId === courtId)
  const slots = selectedCourt ? generateTimeSlots(selectedCourt, dayBookings) : []

  const endTime = selectedCourt && startTime
    ? format(addMinutes(parse(startTime, 'HH:mm', new Date()), selectedCourt.duration), 'HH:mm')
    : ''

  const defaultValue = selectedCourt ? selectedCourt.pricePerHour * (selectedCourt.duration / 60) : 0
  const finalValue = customValue !== '' ? Number(customValue) : defaultValue

  function handleCourtChange(id: string) {
    setCourtId(id)
    setStartTime('')
    const court = courts.find(c => c.id === id)
    if (court) setCustomValue(String(court.pricePerHour * (court.duration / 60)))
  }

  function toggleDay(day: number) {
    setRecurringDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    )
  }

  // Preview das datas recorrentes
  const previewDates = isRecurring && recurringDays.length > 0 && startTime
    ? generateRecurringDates(date, recurringDays, recurringWeeks).slice(0, 20)
    : []

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!courtId) return toast.error('Selecione uma quadra')
    if (!startTime) return toast.error('Selecione um horário')
    if (!clientName.trim()) return toast.error('Informe o nome do cliente')
    if (!clientPhone.trim()) return toast.error('Informe o telefone do cliente')
    if (finalValue < 0) return toast.error('Valor inválido')
    if (isRecurring && recurringDays.length === 0) return toast.error('Selecione pelo menos um dia da semana')

    setSaving(true)
    try {
      const clientId = await upsertClient(clientName, clientPhone, date)

      if (!isRecurring) {
        // Agendamento único
        const available = await checkAvailability(courtId, date, startTime, endTime)
        if (!available) {
          toast.error('Horário já ocupado!')
          setSaving(false)
          return
        }
        await addBooking({
          courtId, courtName: selectedCourt!.name,
          clientId: clientId || undefined, clientName, clientPhone, notes,
          date, startTime, endTime, value: finalValue, status,
        })
        toast.success('Agendamento criado!')
      } else {
        // Agendamentos recorrentes
        const dates = generateRecurringDates(date, recurringDays, recurringWeeks)
        let created = 0
        let skipped = 0

        for (const d of dates) {
          const available = await checkAvailability(courtId, d, startTime, endTime)
          if (!available) { skipped++; continue }
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
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Novo Agendamento</h1>
        <p className="text-sm text-gray-500 mt-1">Preencha os dados para reservar uma quadra</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Quadra e horário</h2>
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
              onChange={e => { setDate(e.target.value); setStartTime('') }}
            />

            {selectedCourt && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Horário ({selectedCourt.duration} min por slot)
                </label>
                {slots.length === 0 ? (
                  <p className="text-sm text-gray-400">Sem horários nesta data</p>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {slots.map(slot => (
                      <button
                        key={slot.time}
                        type="button"
                        disabled={!slot.available}
                        onClick={() => setStartTime(slot.time)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                          startTime === slot.time
                            ? 'bg-green-600 text-white border-green-600'
                            : slot.available
                            ? 'bg-white text-gray-700 border-gray-300 hover:border-green-400 hover:text-green-600'
                            : 'bg-gray-100 text-gray-300 border-gray-200 cursor-not-allowed'
                        }`}
                      >
                        {slot.available
                          ? <span className="flex items-center justify-center gap-1"><Clock size={12} />{slot.time}</span>
                          : <span className="line-through">{slot.time}</span>
                        }
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {startTime && endTime && selectedCourt && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
                <CheckCircle size={18} className="text-green-600" />
                <span className="text-sm text-green-800">
                  <strong>{startTime} – {endTime}</strong> · {selectedCourt.name}
                </span>
              </div>
            )}

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
          </div>
        </Card>

        {/* Recorrência */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <RefreshCw size={16} className="text-gray-400" />
              Agendamento recorrente
            </h2>
            <label className="flex items-center gap-2 cursor-pointer">
              <div
                onClick={() => setIsRecurring(!isRecurring)}
                className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer ${isRecurring ? 'bg-green-600' : 'bg-gray-200'}`}
              >
                <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${isRecurring ? 'translate-x-5' : 'translate-x-1'}`} />
              </div>
              <span className="text-sm text-gray-600">{isRecurring ? 'Ativado' : 'Desativado'}</span>
            </label>
          </div>

          {isRecurring && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Repetir às {startTime || '??:??'} nos dias:
                </label>
                <div className="flex gap-2 flex-wrap">
                  {DAYS_OF_WEEK.map(d => (
                    <button
                      key={d.value}
                      type="button"
                      onClick={() => toggleDay(d.value)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                        recurringDays.includes(d.value)
                          ? 'bg-green-600 text-white border-green-600'
                          : 'bg-white text-gray-600 border-gray-300 hover:border-green-400'
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Repetir por</label>
                <select
                  value={recurringWeeks}
                  onChange={e => setRecurringWeeks(Number(e.target.value))}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                >
                  {[1, 2, 3, 4, 6, 8, 12].map(w => (
                    <option key={w} value={w}>{w} semana{w !== 1 ? 's' : ''}</option>
                  ))}
                </select>
              </div>

              {previewDates.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs font-medium text-blue-700 mb-2">
                    {previewDates.length} agendamento{previewDates.length !== 1 ? 's' : ''} serão criados:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {previewDates.slice(0, 12).map(d => (
                      <span key={d} className="text-xs bg-white border border-blue-200 text-blue-700 px-2 py-0.5 rounded">
                        {format(parseISO(d), 'dd/MM', { locale: ptBR })}
                      </span>
                    ))}
                    {previewDates.length > 12 && (
                      <span className="text-xs text-blue-500">+{previewDates.length - 12} mais</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Dados do cliente</h2>
          <div className="space-y-4">
            <Input label="Nome completo" value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Ex: João da Silva" />
            <Input label="Telefone / WhatsApp" value={clientPhone} onChange={e => setClientPhone(e.target.value)} placeholder="Ex: (11) 99999-9999" type="tel" />
            <Textarea label="Observações (opcional)" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Ex: Pagamento feito, grupo de 5 pessoas..." />
          </div>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" loading={saving} size="lg" className="flex-1">
            {isRecurring && previewDates.length > 0
              ? `Criar ${previewDates.length} agendamento${previewDates.length !== 1 ? 's' : ''}`
              : 'Criar agendamento'
            }
          </Button>
          <Button type="button" variant="secondary" size="lg" onClick={() => router.back()}>Cancelar</Button>
        </div>
      </form>
    </div>
  )
}
