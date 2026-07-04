'use client'

import { useEffect, useRef, useState } from 'react'
import { useComandas } from '@/hooks/useComandas'
import { useProducts } from '@/hooks/useProducts'
import { useClients } from '@/hooks/useClients'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { ComandaDetail } from './ComandaDetail'
import { Receipt, Plus, User, Clock } from 'lucide-react'
import toast from 'react-hot-toast'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { clsx } from 'clsx'

function fmt(val: number) {
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function ComandasPage() {
  const { user } = useAuth()
  const {
    comandas, loading, openComanda, setHorario,
    addItem, removeItem, closeComanda, cancelComanda,
  } = useComandas()
  const { products } = useProducts()
  const { clients } = useClients()

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [openModal, setOpenModal] = useState(false)
  const [mode, setMode] = useState<'cadastrado' | 'avulso'>('cadastrado')
  const [clientId, setClientId] = useState('')
  const [avulsoName, setAvulsoName] = useState('')
  const [creating, setCreating] = useState(false)

  const selected = comandas.find(c => c.id === selectedId) ?? null

  // Atalho vindo da agenda: ?bookingId=&clientId=&clientName=&horario=
  const didInit = useRef(false)
  useEffect(() => {
    if (didInit.current || !user) return
    const params = new URLSearchParams(window.location.search)
    const bookingId = params.get('bookingId')
    if (!bookingId) return
    didInit.current = true
    const cid = params.get('clientId') || undefined
    const cname = params.get('clientName') || undefined
    const horario = params.get('horario')
    // limpa a URL para um refresh não reabrir a comanda
    window.history.replaceState(null, '', '/comandas')
    ;(async () => {
      try {
        const id = await openComanda(cid, cname, bookingId)
        if (!id) return
        if (horario && Number(horario) > 0) await setHorario(id, Number(horario))
        setSelectedId(id)
      } catch {
        toast.error('Não foi possível abrir a comanda da reserva')
      }
    })()
  }, [user, openComanda, setHorario])

  async function handleOpen() {
    setCreating(true)
    try {
      let id: string | null
      if (mode === 'cadastrado') {
        const client = clients.find(c => c.id === clientId)
        if (!client) { setCreating(false); return toast.error('Escolha um cliente') }
        id = await openComanda(client.id, client.name)
      } else {
        const name = avulsoName.trim()
        if (!name) { setCreating(false); return toast.error('Informe um nome') }
        id = await openComanda(undefined, name)
      }
      if (id) setSelectedId(id)
      setOpenModal(false)
      setClientId('')
      setAvulsoName('')
    } catch {
      toast.error('Erro ao abrir comanda')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Comandas</h1>
          <p className="text-sm text-muted mt-0.5">
            {comandas.length} aberta{comandas.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button variant="primary" size="md" onClick={() => { setMode('cadastrado'); setOpenModal(true) }}>
          <Plus size={16} /> Abrir comanda
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-line border-t-brand" />
        </div>
      ) : comandas.length === 0 ? (
        <div className="bg-surface border border-line rounded-[var(--radius-card)] shadow-card p-12 text-center">
          <div className="w-12 h-12 rounded-[var(--radius-ctl)] bg-surface-2 flex items-center justify-center mx-auto mb-4">
            <Receipt size={24} className="text-subtle" />
          </div>
          <p className="text-base font-medium text-ink mb-1">Nenhuma comanda aberta</p>
          <p className="text-sm text-muted mb-4">Abra uma comanda para começar a lançar consumo.</p>
          <Button variant="primary" size="md" onClick={() => { setMode('cadastrado'); setOpenModal(true) }}>
            Abrir comanda
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {comandas.map(c => {
            const opened = c.openedAt || c.createdAt
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedId(c.id)}
                className="text-left bg-surface border border-line rounded-[var(--radius-card)] shadow-card p-4 hover:border-brand transition-colors"
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-8 h-8 rounded-full bg-brand-weak text-brand flex items-center justify-center shrink-0">
                    <User size={15} />
                  </span>
                  <span className="font-semibold text-ink truncate">{c.clientName || 'Avulsa'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted">
                    {c.items.length} {c.items.length === 1 ? 'item' : 'itens'}
                  </span>
                  <span className="font-bold text-success text-lg">{fmt(c.total)}</span>
                </div>
                {opened && (
                  <p className="flex items-center gap-1 text-[11px] text-subtle mt-2">
                    <Clock size={11} />
                    aberta {formatDistanceToNow(new Date(opened), { locale: ptBR, addSuffix: true })}
                  </p>
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* Detalhe */}
      {selectedId && (
        <ComandaDetail
          comanda={selected}
          products={products}
          clients={clients}
          onExit={() => setSelectedId(null)}
          addItem={addItem}
          removeItem={removeItem}
          setHorario={setHorario}
          closeComanda={closeComanda}
          cancelComanda={cancelComanda}
        />
      )}

      {/* Abrir comanda */}
      <Modal open={openModal} onClose={() => setOpenModal(false)} title="Abrir comanda">
        <div className="space-y-5">
          {/* Toggle cadastrado / avulso */}
          <div className="flex items-center gap-1 bg-surface-2 rounded-[var(--radius-ctl)] p-1">
            {(['cadastrado', 'avulso'] as const).map(m => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={clsx(
                  'flex-1 px-3 py-1.5 rounded-[var(--radius-ctl)] text-sm font-medium transition-colors',
                  mode === m ? 'bg-surface shadow-sm text-ink' : 'text-muted hover:text-ink'
                )}
              >
                {m === 'cadastrado' ? 'Cliente cadastrado' : 'Avulso'}
              </button>
            ))}
          </div>

          {mode === 'cadastrado' ? (
            <Select label="Cliente" value={clientId} onChange={e => setClientId(e.target.value)}>
              <option value="">Selecione…</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.name} – {c.phone}</option>
              ))}
            </Select>
          ) : (
            <Input
              label="Nome (avulso)"
              value={avulsoName}
              onChange={e => setAvulsoName(e.target.value)}
              placeholder="Ex: Mesa da frente, João…"
            />
          )}

          <div className="flex gap-3">
            <Button variant="primary" onClick={handleOpen} loading={creating} className="flex-1">
              Abrir comanda
            </Button>
            <Button variant="secondary" onClick={() => setOpenModal(false)} className="flex-1">
              Cancelar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
