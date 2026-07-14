'use client'

import { useEffect, useRef, useState } from 'react'
import { useComandas } from '@/hooks/useComandas'
import { useProducts } from '@/hooks/useProducts'
import { useClients } from '@/hooks/useClients'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { ComandaDetail } from './ComandaDetail'
import { Receipt, Plus, User, Clock, ChevronDown } from 'lucide-react'
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
    addItem, removeItem, closeComanda, cancelComanda, setDescontoComanda,
  } = useComandas()
  const { products } = useProducts()
  const { clients } = useClients()

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [openModal, setOpenModal] = useState(false)
  const [mode, setMode] = useState<'cadastrado' | 'avulso'>('cadastrado')
  const [clientId, setClientId] = useState('')
  const [avulsoName, setAvulsoName] = useState('')
  const [creating, setCreating] = useState(false)
  const [clientSearch, setClientSearch] = useState('')

  const selected = comandas.find(c => c.id === selectedId) ?? null

  // Comandas com a lista de itens expandida no card (espiar sem abrir a comanda).
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  function toggleExpand(id: string) {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

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
        if (horario && Number(horario) > 0) await setHorario(id, Number(horario), 1)
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
      setClientSearch('')
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
        <Button variant="primary" size="md" onClick={() => { setMode('cadastrado'); setClientSearch(''); setOpenModal(true) }}>
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
          <Button variant="primary" size="md" onClick={() => { setMode('cadastrado'); setClientSearch(''); setOpenModal(true) }}>
            Abrir comanda
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {comandas.map(c => {
            const opened = c.openedAt || c.createdAt
            const expanded = expandedIds.has(c.id)
            const hasItems = c.items.length > 0
            return (
              <div
                key={c.id}
                className="bg-surface border border-line rounded-[var(--radius-card)] shadow-card p-4 hover:border-brand transition-colors"
              >
                {/* Nome — abre a comanda */}
                <button
                  type="button"
                  onClick={() => setSelectedId(c.id)}
                  className="w-full text-left flex items-center gap-2 mb-3"
                >
                  <span className="w-8 h-8 rounded-full bg-brand-weak text-brand flex items-center justify-center shrink-0">
                    <User size={15} />
                  </span>
                  <span className="font-semibold text-ink truncate">{c.clientName || 'Avulsa'}</span>
                </button>

                <div className="flex items-center justify-between">
                  {/* Itens — toque expande a lista aqui mesmo, sem abrir a comanda */}
                  <button
                    type="button"
                    onClick={() => toggleExpand(c.id)}
                    disabled={!hasItems}
                    aria-expanded={expanded}
                    className="flex items-center gap-1 text-xs text-muted hover:text-ink transition-colors disabled:hover:text-muted disabled:opacity-60"
                  >
                    {c.items.length} {c.items.length === 1 ? 'item' : 'itens'}
                    {hasItems && (
                      <ChevronDown
                        size={13}
                        className={clsx('transition-transform', expanded && 'rotate-180')}
                      />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedId(c.id)}
                    className="font-bold text-success text-lg hover:opacity-80 transition-opacity"
                  >
                    {fmt(c.total)}
                  </button>
                </div>

                {/* Lista de itens (só espiar) */}
                {expanded && hasItems && (
                  <ul className="mt-3 pt-3 border-t border-line space-y-1.5">
                    {c.items.map(item => (
                      <li
                        key={item.productId || 'horario'}
                        className="flex items-center justify-between gap-2 text-xs"
                      >
                        <span className="text-ink truncate">
                          {item.quantity}x {item.productName}
                        </span>
                        <span className="text-muted shrink-0 tabular-nums">{fmt(item.total)}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {opened && (
                  <button
                    type="button"
                    onClick={() => setSelectedId(c.id)}
                    className="w-full text-left flex items-center gap-1 text-[11px] text-subtle mt-2"
                  >
                    <Clock size={11} />
                    aberta {formatDistanceToNow(new Date(opened), { locale: ptBR, addSuffix: true })}
                  </button>
                )}
              </div>
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
          setDescontoComanda={setDescontoComanda}
          closeComanda={closeComanda}
          cancelComanda={cancelComanda}
        />
      )}

      {/* Abrir comanda */}
      <Modal open={openModal} onClose={() => { setOpenModal(false); setClientSearch('') }} title="Abrir comanda">
        <div className="space-y-5">
          {/* Toggle cadastrado / avulso */}
          <div className="flex items-center gap-1 bg-surface-2 rounded-[var(--radius-ctl)] p-1">
            {(['cadastrado', 'avulso'] as const).map(m => (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); setClientSearch('') }}
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
            (() => {
              const selectedClient = clients.find(c => c.id === clientId)
              if (selectedClient) {
                return (
                  <div className="bg-surface-2 rounded-[var(--radius-ctl)] px-3 py-2 flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="font-medium text-ink truncate">{selectedClient.name}</p>
                      <p className="text-xs text-muted">{selectedClient.phone}</p>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => setClientId('')}>Trocar</Button>
                  </div>
                )
              }
              const filtered = clients
                .filter(c => c.name.toLowerCase().includes(clientSearch.toLowerCase()) || c.phone.includes(clientSearch))
                .slice(0, 8)
              return (
                <div className="space-y-2">
                  <Input
                    label="Cliente"
                    placeholder="Buscar por nome ou telefone…"
                    value={clientSearch}
                    onChange={e => setClientSearch(e.target.value)}
                  />
                  {filtered.length === 0 ? (
                    <p className="text-sm text-muted text-center py-3">Nenhum cliente encontrado</p>
                  ) : (
                    <div className="border border-line rounded-[var(--radius-ctl)] divide-y divide-line max-h-52 overflow-y-auto">
                      {filtered.map(c => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => { setClientId(c.id); setClientSearch('') }}
                          className="w-full text-left px-3 py-2 hover:bg-surface-2 flex flex-col"
                        >
                          <span className="text-sm font-medium text-ink">{c.name}</span>
                          <span className="text-xs text-muted">{c.phone}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            })()
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
