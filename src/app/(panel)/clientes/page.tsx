'use client'

import { useState, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useClients } from '@/hooks/useClients'
import { useBookings } from '@/hooks/useBookings'
import { useSales } from '@/hooks/useSales'
import { Input, Textarea } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Badge, statusBadge } from '@/components/ui/Badge'
import { Client, Booking } from '@/types'
import { Users, Phone, Calendar, Search, Edit, History, MessageCircle, UserPlus, TrendingUp, Trash2 } from 'lucide-react'
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

/** Normaliza telefone para comparação: só dígitos, remove DDI 55 se tiver 13 dígitos */
function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  return digits.length === 13 && digits.startsWith('55') ? digits.slice(2) : digits
}

export default function ClientesPage() {
  const { user } = useAuth()
  const { clients, loading, updateClient, addClient, deleteClient } = useClients()
  const { bookings } = useBookings()
  const { sales } = useSales()
  const [search, setSearch] = useState('')

  const [newModal, setNewModal] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newNotes, setNewNotes] = useState('')
  const [newSaving, setNewSaving] = useState(false)

  const [editModal, setEditModal] = useState<Client | null>(null)
  const [editNotes, setEditNotes] = useState('')
  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [saving, setSaving] = useState(false)

  const [historyModal, setHistoryModal] = useState<Client | null>(null)
  const [history, setHistory] = useState<Booking[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  const [deleteModal, setDeleteModal] = useState<Client | null>(null)
  const [deleting, setDeleting] = useState(false)

  // ── Agrega total gasto por cliente (bookings não-cancelados + vendas) ──────
  const spendByClientId = useMemo(() => {
    const map = new Map<string, number>()

    // Bookings: vincula por clientId quando existe, senão por telefone normalizado
    for (const b of bookings) {
      if (b.status === 'cancelado') continue
      const key = b.clientId ?? `phone:${normalizePhone(b.clientPhone)}`
      map.set(key, (map.get(key) ?? 0) + b.value)
    }

    // Vendas: vincula só por clientId (Sale não tem campo de telefone)
    for (const s of sales) {
      if (!s.clientId) continue
      map.set(s.clientId, (map.get(s.clientId) ?? 0) + s.total)
    }

    return map
  }, [bookings, sales])

  /** Retorna total gasto de um cliente combinando chave por id e por telefone */
  function getSpend(client: Client): number {
    const byId    = spendByClientId.get(client.id) ?? 0
    const byPhone = spendByClientId.get(`phone:${normalizePhone(client.phone)}`) ?? 0
    // se o mesmo booking já foi contado via clientId, não somar duas vezes
    // — a lógica no useMemo prioriza clientId sobre phone, então as chaves são distintas
    return byId + byPhone
  }

  // Clientes enriquecidos com gasto, ordenados por maior gasto
  const clientsWithSpend = useMemo(
    () => clients.map(c => ({ ...c, totalSpend: getSpend(c) }))
               .sort((a, b) => b.totalSpend - a.totalSpend),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [clients, spendByClientId]
  )

  const topSpender = clientsWithSpend[0]?.totalSpend > 0 ? clientsWithSpend[0] : null

  const filtered = clientsWithSpend.filter(c => {
    const q = search.toLowerCase()
    return c.name.toLowerCase().includes(q) || c.phone.includes(q)
  })

  async function handleNewClient() {
    if (!newName.trim()) return toast.error('Informe o nome')
    if (!newPhone.trim()) return toast.error('Informe o telefone')
    setNewSaving(true)
    try {
      await addClient(newName.trim(), newPhone.trim(), newNotes.trim())
      toast.success('Cliente cadastrado!')
      setNewModal(false)
      setNewName('')
      setNewPhone('')
      setNewNotes('')
    } catch {
      toast.error('Erro ao cadastrar cliente')
    } finally {
      setNewSaving(false)
    }
  }

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

  async function handleDelete() {
    if (!deleteModal) return
    setDeleting(true)
    try {
      await deleteClient(deleteModal.id)
      toast.success('Cliente excluído')
      setDeleteModal(null)
    } catch {
      toast.error('Erro ao excluir cliente')
    } finally {
      setDeleting(false)
    }
  }

  const totalRevenue = history
    .filter(b => b.status !== 'cancelado')
    .reduce((s, b) => s + b.value, 0)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Clientes</h1>
          <p className="text-sm text-muted mt-0.5">{clients.length} cliente{clients.length !== 1 ? 's' : ''} cadastrado{clients.length !== 1 ? 's' : ''}</p>
        </div>
        <Button variant="primary" size="md" onClick={() => setNewModal(true)}>
          <UserPlus size={16} /> Novo Cliente
        </Button>
      </div>

      {/* Banner top spender */}
      {topSpender && (
        <div className="bg-violet/10 border border-violet/20 rounded-[var(--radius-ctl)] px-4 py-2.5 flex items-center gap-2.5">
          <TrendingUp size={15} className="text-[#6d28d9] shrink-0" />
          <p className="text-sm text-[#6d28d9]">
            <span className="font-semibold">Cliente VIP:</span>{' '}
            {topSpender.name} —{' '}
            <span className="font-semibold">{fmt(topSpender.totalSpend)}</span> em compras e agendamentos
          </p>
        </div>
      )}

      {/* Busca */}
      <div className="bg-surface border border-line rounded-[var(--radius-ctl)] px-3 h-10 flex items-center gap-2">
        <Search size={16} className="text-muted shrink-0" />
        <input
          type="text"
          placeholder="Buscar por nome ou telefone..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 text-sm outline-none bg-transparent text-ink placeholder:text-subtle"
        />
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-line border-t-brand" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-surface border border-line rounded-[var(--radius-card)] p-12 text-center">
          <Users size={40} className="mx-auto mb-3 text-subtle opacity-40" />
          <p className="text-base text-muted">{search ? 'Nenhum cliente encontrado' : 'Nenhum cliente ainda'}</p>
          {!search && <p className="text-sm text-subtle mt-1">Criados automaticamente ao fazer agendamentos</p>}
        </div>
      ) : (
        <div className="bg-surface border border-line rounded-[var(--radius-card)] shadow-card divide-y divide-line">
          {filtered.map((client, idx) => {
            const isVip = idx === 0 && client.totalSpend > 0
            return (
            <div key={client.id} className="flex items-center gap-4 px-4 py-3.5">
              {/* Avatar */}
              <div className={`w-10 h-10 rounded-full font-bold text-sm flex items-center justify-center shrink-0 border-2 border-surface ${isVip ? 'bg-violet/10 text-[#6d28d9]' : 'bg-brand-weak text-brand'}`}>
                {client.name.charAt(0).toUpperCase()}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-ink truncate">{client.name}</p>
                  {isVip && <Badge variant="violet">VIP</Badge>}
                </div>
                <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                  <span className="flex items-center gap-1 text-xs text-muted">
                    <Phone size={11} /> {client.phone}
                  </span>
                  {client.lastBookingDate && (
                    <span className="flex items-center gap-1 text-xs text-subtle">
                      <Calendar size={11} />
                      Último: {format(new Date(client.lastBookingDate + 'T12:00'), 'dd/MM/yyyy', { locale: ptBR })}
                    </span>
                  )}
                  <span className="text-xs text-subtle">
                    {client.totalBookings} agendamento{client.totalBookings !== 1 ? 's' : ''}
                  </span>
                  {client.totalSpend > 0 && (
                    <span className={`text-xs font-semibold ${isVip ? 'text-[#6d28d9]' : 'text-brand'}`}>
                      {fmt(client.totalSpend)}
                    </span>
                  )}
                </div>
                {client.notes && <p className="text-xs text-subtle mt-1 truncate">{client.notes}</p>}
              </div>

              {/* Ações */}
              <div className="flex gap-1 shrink-0">
                <Button size="sm" variant="ghost" onClick={() => openWhatsApp(client.phone)} title="Abrir WhatsApp">
                  <MessageCircle size={15} className="text-success" />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => openHistory(client)} title="Ver histórico">
                  <History size={15} />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => openEdit(client)} title="Editar">
                  <Edit size={15} />
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setDeleteModal(client)} title="Excluir">
                  <Trash2 size={15} className="text-danger" />
                </Button>
              </div>
            </div>
            )
          })}
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
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-line border-t-brand" />
          </div>
        ) : history.length === 0 ? (
          <p className="text-sm text-muted text-center py-8">Nenhum agendamento encontrado</p>
        ) : (
          <div className="space-y-3">
            {/* Resumo */}
            <div className="bg-surface-2 rounded-[var(--radius-ctl)] p-3 grid grid-cols-3 gap-3 text-center mb-4">
              <div>
                <p className="text-2xl font-bold text-ink">{history.length}</p>
                <p className="text-xs text-muted">Total</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-success">{history.filter(b => b.status === 'confirmado').length}</p>
                <p className="text-xs text-muted">Confirmados</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-ink">{fmt(totalRevenue)}</p>
                <p className="text-xs text-muted">Total gasto</p>
              </div>
            </div>

            <div className="divide-y divide-line max-h-72 overflow-y-auto">
              {history.map(b => {
                const { variant, label } = statusBadge(b.status)
                return (
                  <div key={b.id} className="flex items-center gap-3 py-3">
                    <div className="text-xs text-muted font-mono w-24 shrink-0">
                      {format(new Date(b.date + 'T12:00'), 'dd/MM/yyyy')}<br />
                      {b.startTime}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-ink truncate">{b.courtName}</p>
                    </div>
                    <Badge variant={variant}>{label}</Badge>
                    <span className={`text-sm font-medium w-20 text-right ${b.status === 'cancelado' ? 'text-subtle line-through' : 'text-ink'}`}>
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

      {/* Modal novo cliente */}
      <Modal open={newModal} onClose={() => setNewModal(false)} title="Novo Cliente">
        <div className="space-y-4">
          <Input
            label="Nome completo"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Ex: João Júnior"
          />
          <Input
            label="Telefone / WhatsApp"
            value={newPhone}
            onChange={e => setNewPhone(e.target.value)}
            placeholder="Ex: (11) 99999-9999"
            type="tel"
          />
          <Textarea
            label="Observações (opcional)"
            value={newNotes}
            onChange={e => setNewNotes(e.target.value)}
            placeholder="Ex: cliente preferencial, mensalista..."
          />
          <div className="flex gap-3">
            <Button onClick={handleNewClient} loading={newSaving} className="flex-1">Cadastrar</Button>
            <Button variant="secondary" onClick={() => setNewModal(false)} className="flex-1">Cancelar</Button>
          </div>
        </div>
      </Modal>

      {/* Modal exclusão */}
      <Modal open={!!deleteModal} onClose={() => setDeleteModal(null)} title="Excluir cliente">
        <div className="space-y-4">
          <p className="text-sm text-muted">
            Tem certeza que quer excluir <span className="font-semibold text-ink">{deleteModal?.name}</span>? Os agendamentos e vendas já feitos são preservados no histórico.
          </p>
          <div className="flex gap-3">
            <Button variant="danger" onClick={handleDelete} loading={deleting} className="flex-1">Excluir</Button>
            <Button variant="secondary" onClick={() => setDeleteModal(null)} className="flex-1">Cancelar</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
