'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useClients } from '@/hooks/useClients'
import { Input, Textarea } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Badge, statusBadge } from '@/components/ui/Badge'
import { Client, Booking } from '@/types'
import { Users, Phone, Calendar, Search, Edit, History, MessageCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

function fmt(val: number) {
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function openWhatsApp(phone: string) {
  const cleaned = phone.replace(/\D/g, '')
  const withCountry = cleaned.startsWith('55') ? cleaned : `55${cleaned}`
  window.open(`https://wa.me/${withCountry}`, '_blank')
}

export default function ClientesPage() {
  const { user } = useAuth()
  const { clients, loading, updateClient } = useClients()
  const [search, setSearch] = useState('')

  const [editModal, setEditModal] = useState<Client | null>(null)
  const [editNotes, setEditNotes] = useState('')
  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [saving, setSaving] = useState(false)

  const [historyModal, setHistoryModal] = useState<Client | null>(null)
  const [history, setHistory] = useState<Booking[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  const filtered = clients.filter(c => {
    const q = search.toLowerCase()
    return c.name.toLowerCase().includes(q) || c.phone.includes(q)
  })

  function openEdit(client: Client) {
    setEditModal(client)
    setEditName(client.name)
    setEditPhone(client.phone)
    setEditNotes(client.notes || '')
  }

  async function openHistory(client: Client) {
    setHistoryModal(client)
    setHistory([])
    setHistoryLoading(true)
    try {
      const { data } = await supabase
        .from('bookings')
        .select('*')
        .eq('owner_id', user!.id)
        .eq('client_phone', client.phone)
        .order('date', { ascending: false })
      setHistory((data || []).map(row => ({
        id: row.id,
        ownerId: row.owner_id,
        courtId: row.court_id,
        courtName: row.court_name,
        clientId: row.client_id,
        clientName: row.client_name,
        clientPhone: row.client_phone,
        notes: row.notes,
        date: row.date,
        startTime: row.start_time,
        endTime: row.end_time,
        value: row.value,
        status: row.status,
        cancelReason: row.cancel_reason,
        cancelledAt: row.cancelled_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      } as Booking)))
    } catch {
      toast.error('Erro ao carregar histórico')
    } finally {
      setHistoryLoading(false)
    }
  }

  async function handleSave() {
    if (!editModal) return
    setSaving(true)
    try {
      await updateClient(editModal.id, { name: editName, phone: editPhone, notes: editNotes })
      toast.success('Cliente atualizado!')
      setEditModal(null)
    } catch {
      toast.error('Erro ao atualizar')
    } finally {
      setSaving(false)
    }
  }

  const totalRevenue = history
    .filter(b => b.status !== 'cancelado')
    .reduce((s, b) => s + b.value, 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
          <p className="text-sm text-gray-500 mt-0.5">{clients.length} cliente{clients.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-3 mb-4 flex items-center gap-2">
        <Search size={18} className="text-gray-400 shrink-0" />
        <input
          type="text"
          placeholder="Buscar por nome ou telefone..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 text-sm outline-none bg-transparent placeholder-gray-400"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
          <Users size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-lg">{search ? 'Nenhum cliente encontrado' : 'Nenhum cliente ainda'}</p>
          {!search && <p className="text-sm mt-1">Criados automaticamente ao fazer agendamentos</p>}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {filtered.map(client => (
            <div key={client.id} className="flex items-center gap-4 px-4 py-4">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                <span className="text-green-700 font-semibold text-sm">
                  {client.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900">{client.name}</p>
                <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <Phone size={11} /> {client.phone}
                  </span>
                  {client.lastBookingDate && (
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <Calendar size={11} />
                      Último: {format(new Date(client.lastBookingDate + 'T12:00'), 'dd/MM/yyyy', { locale: ptBR })}
                    </span>
                  )}
                  <span className="text-xs text-gray-400">
                    {client.totalBookings} agendamento{client.totalBookings !== 1 ? 's' : ''}
                  </span>
                </div>
                {client.notes && <p className="text-xs text-gray-400 mt-1 truncate">{client.notes}</p>}
              </div>
              <div className="flex gap-1 shrink-0">
                <Button size="sm" variant="ghost" onClick={() => openWhatsApp(client.phone)} title="Abrir WhatsApp">
                  <MessageCircle size={15} className="text-green-600" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => openHistory(client)} title="Ver histórico">
                  <History size={15} />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => openEdit(client)} title="Editar">
                  <Edit size={15} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal histórico */}
      <Modal
        open={!!historyModal}
        onClose={() => setHistoryModal(null)}
        title={`Histórico — ${historyModal?.name}`}
        size="lg"
      >
        {historyLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600" />
          </div>
        ) : history.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">Nenhum agendamento encontrado</p>
        ) : (
          <div className="space-y-3">
            {/* Resumo */}
            <div className="bg-gray-50 rounded-lg p-3 grid grid-cols-3 gap-3 text-center text-sm mb-4">
              <div>
                <p className="text-2xl font-bold text-gray-900">{history.length}</p>
                <p className="text-gray-500 text-xs">Total</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{history.filter(b => b.status === 'confirmado').length}</p>
                <p className="text-gray-500 text-xs">Confirmados</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{fmt(totalRevenue)}</p>
                <p className="text-gray-500 text-xs">Total gasto</p>
              </div>
            </div>

            <div className="divide-y divide-gray-100 max-h-72 overflow-y-auto">
              {history.map(b => {
                const { variant, label } = statusBadge(b.status)
                return (
                  <div key={b.id} className="flex items-center gap-3 py-3">
                    <div className="text-xs text-gray-500 font-mono w-24 shrink-0">
                      {format(new Date(b.date + 'T12:00'), 'dd/MM/yyyy')}<br />
                      {b.startTime}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{b.courtName}</p>
                    </div>
                    <Badge variant={variant}>{label}</Badge>
                    <span className={`text-sm font-medium w-20 text-right ${b.status === 'cancelado' ? 'text-gray-300 line-through' : 'text-gray-900'}`}>
                      {fmt(b.value)}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </Modal>

      {/* Modal edição */}
      <Modal open={!!editModal} onClose={() => setEditModal(null)} title="Editar cliente">
        <div className="space-y-4">
          <Input label="Nome" value={editName} onChange={e => setEditName(e.target.value)} />
          <Input label="Telefone" value={editPhone} onChange={e => setEditPhone(e.target.value)} />
          <Textarea label="Observações" value={editNotes} onChange={e => setEditNotes(e.target.value)} />
          <div className="flex gap-3">
            <Button onClick={handleSave} loading={saving} className="flex-1">Salvar</Button>
            <Button variant="secondary" onClick={() => setEditModal(null)} className="flex-1">Cancelar</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
