'use client'

import { useState } from 'react'
import { useBookings } from '@/hooks/useBookings'
import { useCourts } from '@/hooks/useCourts'
import { Badge, statusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { format, addMinutes, parse } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Phone, MessageSquare, X, CheckCircle, Edit, MessageCircle, Clock, LayoutGrid, List } from 'lucide-react'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { Booking, Court, Modality, MODALITIES } from '@/types'

function fmt(val: number) {
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function openWhatsApp(phone: string, message: string) {
  const cleaned = phone.replace(/\D/g, '')
  const withCountry = cleaned.startsWith('55') ? cleaned : `55${cleaned}`
  window.open(`https://wa.me/${withCountry}?text=${encodeURIComponent(message)}`, '_blank')
}

function buildWhatsAppMessage(booking: Booking, status: 'confirmado' | 'cancelado') {
  const dateStr = format(new Date(booking.date + 'T12:00'), "dd/MM/yyyy", { locale: ptBR })
  if (status === 'confirmado') {
    return `Olá ${booking.clientName}! ✅ Seu agendamento está *confirmado*.\n\n📍 Quadra: ${booking.courtName}\n📅 Data: ${dateStr}\n🕐 Horário: ${booking.startTime} – ${booking.endTime}\n💰 Valor: ${fmt(booking.value)}\n\nQualquer dúvida, pode chamar. Até lá! 👋`
  }
  return `Olá ${booking.clientName}. Infelizmente seu agendamento na *${booking.courtName}* do dia *${dateStr}* às *${booking.startTime}* precisou ser cancelado. Entre em contato para remarcar. 🙏`
}

// Gera todos os slots do dia para uma quadra
function generateAllSlots(court: Court, bookings: Booking[]) {
  const slots: { time: string; endTime: string; booking: Booking | null }[] = []
  let current = parse(court.openTime, 'HH:mm', new Date())
  const close = parse(court.closeTime, 'HH:mm', new Date())

  while (current < close) {
    const next = addMinutes(current, court.duration)
    if (next > close) break
    const startStr = format(current, 'HH:mm')
    const endStr = format(next, 'HH:mm')
    const booking = bookings.find(b =>
      b.status !== 'cancelado' && b.startTime === startStr
    ) ?? null
    slots.push({ time: startStr, endTime: endStr, booking })
    current = next
  }
  return slots
}

export default function AgendaPage() {
  const today = format(new Date(), 'yyyy-MM-dd')
  const [selectedDate, setSelectedDate] = useState(today)
  const [courtFilter, setCourtFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [view, setView] = useState<'lista' | 'grade'>('lista')

  const { bookings, loading, updateBooking, cancelBooking } = useBookings(selectedDate)
  const { courts } = useCourts()

  const [cancelModal, setCancelModal] = useState<Booking | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [editModal, setEditModal] = useState<Booking | null>(null)

  const filtered = bookings.filter(b => {
    if (courtFilter && b.courtId !== courtFilter) return false
    if (statusFilter && b.status !== statusFilter) return false
    return true
  })

  async function handleConfirm(booking: Booking) {
    try {
      await updateBooking(booking.id, { status: 'confirmado' })
      toast.success('Confirmado!')
      // Abre WhatsApp automaticamente após confirmar
      openWhatsApp(booking.clientPhone, buildWhatsAppMessage({ ...booking, status: 'confirmado' }, 'confirmado'))
    } catch {
      toast.error('Erro ao confirmar')
    }
  }

  async function handleCancel() {
    if (!cancelModal) return
    try {
      await cancelBooking(cancelModal.id, cancelReason)
      toast.success('Cancelado')
      setCancelModal(null)
      setCancelReason('')
    } catch {
      toast.error('Erro ao cancelar')
    }
  }

  const statusBorderColor: Record<string, string> = {
    confirmado: '#10b981',
    pendente:   '#f59e0b',
    cancelado:  '#94a3b8',
  }

  const activeCourts = courtFilter
    ? courts.filter(c => c.id === courtFilter)
    : courts.filter(c => c.status === 'ativa')

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Agenda do Dia</h1>
          <p className="text-sm text-muted mt-0.5">
            {filtered.length} agendamento{filtered.length !== 1 ? 's' : ''}
            {' '}·{' '}
            {format(new Date(selectedDate + 'T12:00'), "dd 'de' MMMM", { locale: ptBR })}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/agendamentos/novo">
            <Button variant="primary" size="md">+ Novo</Button>
          </Link>
        </div>
      </div>

      {/* Barra de filtros */}
      <div className="bg-surface border border-line rounded-[var(--radius-card)] shadow-card p-4 flex flex-wrap gap-3 items-end">
        <div className="flex gap-2 items-end">
          <Input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="w-auto"
          />
          {selectedDate !== today && (
            <Button variant="secondary" size="sm" onClick={() => setSelectedDate(today)}>
              Hoje
            </Button>
          )}
        </div>

        <Select value={courtFilter} onChange={e => setCourtFilter(e.target.value)} className="w-auto">
          <option value="">Todas as quadras</option>
          {courts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>

        <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-auto">
          <option value="">Todos os status</option>
          <option value="confirmado">Confirmado</option>
          <option value="pendente">Pendente</option>
          <option value="cancelado">Cancelado</option>
        </Select>

        {/* Toggle de visualização */}
        <div className="ml-auto flex items-center gap-1 bg-surface-2 rounded-[var(--radius-ctl)] p-1">
          <button
            onClick={() => setView('lista')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-ctl)] text-sm font-medium transition-colors ${
              view === 'lista'
                ? 'bg-surface shadow-sm text-ink'
                : 'text-muted hover:text-ink'
            }`}
          >
            <List size={14} /> Lista
          </button>
          <button
            onClick={() => setView('grade')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-ctl)] text-sm font-medium transition-colors ${
              view === 'grade'
                ? 'bg-surface shadow-sm text-ink'
                : 'text-muted hover:text-ink'
            }`}
          >
            <LayoutGrid size={14} /> Grade
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-line border-t-brand" />
        </div>
      ) : view === 'lista' ? (
        /* ─── VISÃO LISTA ─── */
        filtered.length === 0 ? (
          <div className="bg-surface border border-line rounded-[var(--radius-card)] shadow-card p-12 text-center">
            <p className="text-base text-muted mb-2">Nenhum agendamento para este dia</p>
            <Link href="/agendamentos/novo" className="text-sm text-brand hover:underline">
              Criar agendamento
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(b => {
              const { variant, label } = statusBadge(b.status)
              const borderColor = statusBorderColor[b.status] ?? '#94a3b8'
              return (
                <div
                  key={b.id}
                  className="bg-surface border border-line rounded-[var(--radius-card)] shadow-card border-l-4 p-4"
                  style={{ borderLeftColor: borderColor }}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    {/* Info principal */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="font-mono text-sm font-semibold text-ink">
                          {b.startTime} – {b.endTime}
                        </span>
                        <Badge variant={variant}>{label}</Badge>
                        <span className="text-sm text-muted">
                          {b.courtName}{b.modality ? ` · ${MODALITIES[b.modality as Modality] ?? b.modality}` : ''}
                        </span>
                      </div>
                      <div className="mt-2">
                        <p className="font-semibold text-ink">{b.clientName}</p>
                        <div className="flex items-center gap-1 text-sm text-muted mt-0.5">
                          <Phone size={13} />
                          <span>{b.clientPhone}</span>
                        </div>
                        {b.notes && (
                          <div className="flex items-start gap-1 text-sm text-subtle mt-1">
                            <MessageSquare size={13} className="mt-0.5 shrink-0" />
                            <span>{b.notes}</span>
                          </div>
                        )}
                        {b.status === 'cancelado' && b.cancelReason && (
                          <p className="text-xs text-danger mt-1">Motivo: {b.cancelReason}</p>
                        )}
                      </div>
                    </div>

                    {/* Valor + ações */}
                    <div className="flex flex-col items-end gap-2">
                      <span className="font-bold text-ink">{fmt(b.value)}</span>
                      <div className="flex flex-wrap gap-2 justify-end">
                        {/* WhatsApp sempre visível */}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openWhatsApp(b.clientPhone, buildWhatsAppMessage(b, b.status === 'confirmado' ? 'confirmado' : 'cancelado'))}
                          className="text-success hover:bg-success/10"
                        >
                          <MessageCircle size={14} /> WhatsApp
                        </Button>

                        {b.status !== 'cancelado' && (
                          <>
                            {b.status === 'pendente' && (
                              <Button size="sm" variant="primary" onClick={() => handleConfirm(b)}>
                                <CheckCircle size={14} /> Confirmar
                              </Button>
                            )}
                            <Button size="sm" variant="secondary" onClick={() => setEditModal(b)}>
                              <Edit size={14} /> Editar
                            </Button>
                            <Button size="sm" variant="danger" onClick={() => setCancelModal(b)}>
                              <X size={14} /> Cancelar
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )
      ) : (
        /* ─── VISÃO GRADE ─── */
        <div className="space-y-6">
          {activeCourts.length === 0 ? (
            <div className="bg-surface border border-line rounded-[var(--radius-card)] shadow-card p-12 text-center text-muted">
              Nenhuma quadra ativa
            </div>
          ) : (
            activeCourts.map(court => {
              const courtBookings = bookings.filter(b => b.courtId === court.id)
              const slots = generateAllSlots(court, courtBookings)
              const freeSlots = slots.filter(s => !s.booking).length
              const bookedSlots = slots.filter(s => s.booking).length

              return (
                <div key={court.id} className="bg-surface border border-line rounded-[var(--radius-card)] shadow-card overflow-hidden">
                  {/* Cabeçalho da quadra */}
                  <div className="flex items-center justify-between px-4 py-3 bg-surface-2 border-b border-line">
                    <div>
                      <h3 className="font-semibold text-ink">{court.name}</h3>
                      <p className="text-xs text-muted mt-0.5">
                        {bookedSlots} ocupado{bookedSlots !== 1 ? 's' : ''}
                        {' · '}
                        <span className="text-success font-medium">
                          {freeSlots} livre{freeSlots !== 1 ? 's' : ''}
                        </span>
                      </p>
                    </div>
                    <Link href="/agendamentos/novo">
                      <Button size="sm" variant="secondary">+ Reservar</Button>
                    </Link>
                  </div>

                  {/* Grid de slots */}
                  <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {slots.map(slot => {
                      if (!slot.booking) {
                        return (
                          <Link key={slot.time} href="/agendamentos/novo">
                            <div className="border-2 border-dashed border-line rounded-[var(--radius-ctl)] p-3 text-center hover:border-brand hover:bg-brand-weak transition-colors cursor-pointer group">
                              <div className="flex items-center justify-center gap-1 text-subtle group-hover:text-brand">
                                <Clock size={13} />
                                <span className="text-sm font-medium">{slot.time}</span>
                              </div>
                              <p className="text-xs text-subtle group-hover:text-brand mt-0.5">livre</p>
                            </div>
                          </Link>
                        )
                      }

                      const { variant, label } = statusBadge(slot.booking.status)

                      const slotBg =
                        slot.booking.status === 'confirmado'
                          ? 'bg-success/10 border-success/30'
                          : slot.booking.status === 'pendente'
                          ? 'bg-warning/10 border-warning/30'
                          : 'bg-danger/10 border-danger/30'

                      return (
                        <div key={slot.time} className={`border-2 rounded-[var(--radius-ctl)] p-3 ${slotBg}`}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-semibold text-ink">{slot.time}</span>
                            <Badge variant={variant} className="text-xs">{label}</Badge>
                          </div>
                          <p className="text-xs font-medium text-ink truncate">{slot.booking.clientName}</p>
                          <div className="flex items-center justify-between mt-2 gap-1">
                            <button
                              onClick={() => openWhatsApp(slot.booking!.clientPhone, buildWhatsAppMessage(slot.booking!, slot.booking!.status === 'confirmado' ? 'confirmado' : 'cancelado'))}
                              className="text-success hover:text-success/70 transition-colors"
                              title="Abrir WhatsApp"
                            >
                              <MessageCircle size={14} />
                            </button>
                            {slot.booking.status === 'pendente' && (
                              <button
                                onClick={() => handleConfirm(slot.booking!)}
                                className="text-success hover:text-success/70 transition-colors"
                                title="Confirmar"
                              >
                                <CheckCircle size={14} />
                              </button>
                            )}
                            {slot.booking.status !== 'cancelado' && (
                              <button
                                onClick={() => setCancelModal(slot.booking!)}
                                className="text-danger hover:text-danger/70 transition-colors"
                                title="Cancelar"
                              >
                                <X size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* Modal cancelamento */}
      <Modal open={!!cancelModal} onClose={() => setCancelModal(null)} title="Cancelar agendamento">
        <div className="space-y-4">
          <p className="text-sm text-muted">
            Cancelar o agendamento de <strong className="text-ink">{cancelModal?.clientName}</strong> às {cancelModal?.startTime}?
          </p>
          <Textarea
            label="Motivo (opcional)"
            value={cancelReason}
            onChange={e => setCancelReason(e.target.value)}
            placeholder="Ex: Cliente solicitou cancelamento"
          />
          <div className="flex gap-3">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => {
                handleCancel()
                if (cancelModal) openWhatsApp(cancelModal.clientPhone, buildWhatsAppMessage(cancelModal, 'cancelado'))
              }}
            >
              <MessageCircle size={14} className="text-success" /> Cancelar e avisar no WhatsApp
            </Button>
          </div>
          <div className="flex gap-3">
            <Button variant="danger" onClick={handleCancel} className="flex-1">Só cancelar</Button>
            <Button variant="secondary" onClick={() => setCancelModal(null)} className="flex-1">Voltar</Button>
          </div>
        </div>
      </Modal>

      {/* Modal edição */}
      {editModal && (
        <EditBookingModal
          booking={editModal}
          onClose={() => setEditModal(null)}
          onSave={async (data) => {
            try {
              await updateBooking(editModal.id, data)
              toast.success('Atualizado!')
              setEditModal(null)
            } catch {
              toast.error('Erro ao atualizar')
            }
          }}
        />
      )}
    </div>
  )
}

function EditBookingModal({ booking, onClose, onSave }: {
  booking: Booking
  onClose: () => void
  onSave: (data: Partial<Booking>) => Promise<void>
}) {
  const [clientName, setClientName] = useState(booking.clientName)
  const [clientPhone, setClientPhone] = useState(booking.clientPhone)
  const [notes, setNotes] = useState(booking.notes || '')
  const [value, setValue] = useState(String(booking.value))
  const [status, setStatus] = useState(booking.status)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    await onSave({ clientName, clientPhone, notes, value: Number(value), status })
    setSaving(false)
  }

  return (
    <Modal open onClose={onClose} title="Editar agendamento">
      <div className="space-y-4">
        <Input label="Nome" value={clientName} onChange={e => setClientName(e.target.value)} />
        <Input label="Telefone" value={clientPhone} onChange={e => setClientPhone(e.target.value)} />
        <Input label="Valor (R$)" type="number" value={value} onChange={e => setValue(e.target.value)} />
        <Select label="Status" value={status} onChange={e => setStatus(e.target.value as Booking['status'])}>
          <option value="pendente">Pendente</option>
          <option value="confirmado">Confirmado</option>
        </Select>
        <Textarea label="Observações" value={notes} onChange={e => setNotes(e.target.value)} />
        <div className="flex gap-3">
          <Button onClick={handleSave} loading={saving} className="flex-1">Salvar</Button>
          <Button variant="secondary" onClick={onClose} className="flex-1">Cancelar</Button>
        </div>
      </div>
    </Modal>
  )
}
