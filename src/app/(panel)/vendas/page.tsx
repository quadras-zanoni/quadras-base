'use client'

import { useState } from 'react'
import { useSales } from '@/hooks/useSales'
import { useProducts } from '@/hooks/useProducts'
import { useClients } from '@/hooks/useClients'
import { Button } from '@/components/ui/Button'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { SaleItem, Sale, Product, PAYMENT_METHODS } from '@/types'
import { ShoppingCart, Plus, Minus, Trash2, Receipt, Wallet, User } from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { clsx } from 'clsx'

function fmt(val: number) {
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const paymentBadge: Record<Sale['paymentMethod'], { label: string; color: 'green' | 'blue' | 'yellow' | 'gray' }> = {
  pix: { label: 'PIX', color: 'green' },
  dinheiro: { label: 'Dinheiro', color: 'yellow' },
  cartao_debito: { label: 'Débito', color: 'blue' },
  cartao_credito: { label: 'Crédito', color: 'blue' },
  outro: { label: 'Outro', color: 'gray' },
}

export default function VendasPage() {
  const { sales, loading, registerSale, deleteSale, todaySales, todayRevenue } = useSales()
  const { products } = useProducts()
  const { clients } = useClients()

  const [modal, setModal] = useState(false)
  const [items, setItems] = useState<SaleItem[]>([])
  const [notes, setNotes] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<Sale['paymentMethod']>('pix')
  const [saving, setSaving] = useState(false)
  const [selectedClientId, setSelectedClientId] = useState('')
  const [desconto, setDesconto] = useState(0)
  const [produtoBusca, setProdutoBusca] = useState('')

  const activeProducts = products.filter(p => p.status === 'ativo')
  const total = items.reduce((sum, i) => sum + i.total, 0)
  const selectedClient = clients.find(c => c.id === selectedClientId)

  function openModal() {
    setItems([])
    setNotes('')
    setPaymentMethod('pix')
    setSelectedClientId('')
    setDesconto(0)
    setModal(true)
  }

  // Clicar no produto adiciona 1 (ou incrementa), respeitando o estoque
  function addProduct(p: Product) {
    if (p.quantity === 0) return
    setItems(prev => {
      const ex = prev.find(i => i.productId === p.id)
      if (ex) {
        if (ex.quantity >= p.quantity) { toast.error(`Só há ${p.quantity} em estoque`); return prev }
        return prev.map(i => i.productId === p.id
          ? { ...i, quantity: i.quantity + 1, total: (i.quantity + 1) * i.unitPrice }
          : i)
      }
      return [...prev, { productId: p.id, productName: p.name, quantity: 1, unitPrice: p.salePrice, total: p.salePrice }]
    })
  }

  function changeQty(productId: string, delta: number) {
    setItems(prev => prev.map(i => {
      if (i.productId !== productId) return i
      const max = products.find(p => p.id === productId)?.quantity ?? i.quantity
      const q = i.quantity + delta
      if (q < 1) return i
      if (q > max) { toast.error(`Só há ${max} em estoque`); return i }
      return { ...i, quantity: q, total: q * i.unitPrice }
    }))
  }

  function removeItem(productId: string) {
    setItems(prev => prev.filter(i => i.productId !== productId))
  }

  async function handleSave() {
    if (items.length === 0) return toast.error('Adicione pelo menos um produto')
    setSaving(true)
    try {
      await registerSale(
        items,
        paymentMethod,
        notes,
        selectedClientId || undefined,
        selectedClient?.name || undefined,
        desconto
      )
      toast.success('Venda registrada!')
      setModal(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao registrar venda')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(sale: Sale) {
    const liq = sale.total - (sale.desconto ?? 0)
    if (!confirm(`Apagar esta venda de ${fmt(sale.total)} (líquido ${fmt(liq)})? O estoque dos produtos volta.`)) return
    try {
      await deleteSale(sale.id)
      toast.success('Venda apagada — estoque devolvido')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao apagar venda')
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Vendas</h1>
          <p className="text-sm text-muted mt-0.5">
            Hoje: {todaySales.length} venda{todaySales.length !== 1 ? 's' : ''} · {fmt(todayRevenue)}
          </p>
        </div>
        <Button variant="primary" size="md" onClick={openModal}>
          <Plus size={16} /> Nova Venda
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-line border-t-brand" />
        </div>
      ) : sales.length === 0 ? (
        <div className="bg-surface border border-line rounded-[var(--radius-card)] shadow-card p-12 text-center">
          <div className="w-12 h-12 rounded-[var(--radius-ctl)] bg-surface-2 flex items-center justify-center mx-auto mb-4">
            <ShoppingCart size={24} className="text-subtle" />
          </div>
          <p className="text-base font-medium text-ink mb-1">Nenhuma venda registrada</p>
          <p className="text-sm text-muted mb-4">Registre a primeira venda do dia.</p>
          <Button variant="primary" size="md" onClick={openModal}>Registrar venda</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {sales.map(sale => {
            const date = sale.createdAt ? new Date(sale.createdAt) : null
            const pm = paymentBadge[sale.paymentMethod] ?? paymentBadge.outro
            return (
              <div key={sale.id} className="bg-surface border border-line rounded-[var(--radius-card)] shadow-card p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Receipt size={15} className="text-subtle" />
                    <span className="text-sm text-muted">
                      {date ? format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : '–'}
                    </span>
                    <Badge variant={pm.color}>{pm.label}</Badge>
                    {sale.clientName && (
                      <span className="flex items-center gap-1 text-xs text-muted">
                        <User size={11} /> {sale.clientName}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      {sale.desconto ? (
                        <>
                          <span className="font-bold text-success text-lg">{fmt(sale.total - sale.desconto)}</span>
                          <p className="text-[11px] text-danger">-{fmt(sale.desconto)} desconto</p>
                        </>
                      ) : (
                        <span className="font-bold text-success text-lg">{fmt(sale.total)}</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDelete(sale)}
                      title="Apagar venda"
                      className="text-muted hover:text-danger transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <div className="space-y-1">
                  {sale.items.map(item => (
                    <div key={item.productId} className="flex justify-between text-sm">
                      <span className="text-ink">{item.quantity}x {item.productName}</span>
                      <span className="text-muted">{fmt(item.total)}</span>
                    </div>
                  ))}
                </div>
                {sale.notes && (
                  <p className="text-xs text-subtle mt-2 border-t border-line pt-2">{sale.notes}</p>
                )}
              </div>
            )
          })}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="Nova Venda" size="lg">
        <div className="space-y-5">
          {/* Produtos — clique para adicionar */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted mb-2">
              Produtos <span className="normal-case font-normal text-subtle tracking-normal">· toque para adicionar</span>
            </p>
            <Input
              placeholder="Buscar produto…"
              value={produtoBusca}
              onChange={e => setProdutoBusca(e.target.value)}
              className="mb-2"
            />
            {(() => {
              const filtered = activeProducts.filter(p =>
                p.name.toLowerCase().includes(produtoBusca.trim().toLowerCase())
              )
              if (activeProducts.length === 0) {
                return <p className="text-sm text-muted py-4 text-center">Nenhum produto cadastrado.</p>
              }
              if (filtered.length === 0) {
                return <p className="text-sm text-muted py-4 text-center">Nenhum produto encontrado.</p>
              }
              return (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {filtered.map(p => {
                  const inCart = items.find(i => i.productId === p.id)
                  const out = p.quantity === 0
                  return (
                    <button
                      key={p.id}
                      type="button"
                      disabled={out}
                      onClick={() => addProduct(p)}
                      className={clsx(
                        'relative text-left p-3 rounded-[var(--radius-ctl)] border transition-colors',
                        out
                          ? 'border-line bg-surface-2 opacity-60 cursor-not-allowed'
                          : inCart
                          ? 'border-brand bg-brand-weak'
                          : 'border-line bg-surface hover:border-brand hover:bg-brand-weak/50'
                      )}
                    >
                      {inCart && (
                        <span className="absolute top-1.5 right-1.5 min-w-[20px] h-5 px-1 rounded-full bg-brand text-white text-[11px] font-bold flex items-center justify-center">
                          {inCart.quantity}
                        </span>
                      )}
                      <p className="text-sm font-semibold text-ink truncate pr-6">{p.name}</p>
                      <p className="text-sm font-bold text-brand mt-0.5">{fmt(p.salePrice)}</p>
                      <p className="text-[11px] text-subtle mt-0.5">{out ? 'Esgotado' : `${p.quantity} em estoque`}</p>
                    </button>
                  )
                })}
              </div>
            )
            })()}
          </div>

          {/* Carrinho */}
          {items.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted mb-2">Carrinho</p>
              <div className="space-y-2">
                {items.map(item => (
                  <div key={item.productId} className="flex items-center gap-3 bg-surface-2 border border-line rounded-[var(--radius-ctl)] px-3 py-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-ink truncate">{item.productName}</p>
                      <p className="text-xs text-muted">{fmt(item.unitPrice)} cada</p>
                    </div>
                    {/* Stepper de quantidade */}
                    <div className="flex items-center border border-line rounded-[var(--radius-ctl)] bg-surface shrink-0">
                      <button type="button" onClick={() => changeQty(item.productId, -1)} className="px-2 py-1.5 text-muted hover:text-ink disabled:opacity-40" disabled={item.quantity <= 1}>
                        <Minus size={14} />
                      </button>
                      <span className="w-8 text-center text-sm font-semibold text-ink">{item.quantity}</span>
                      <button type="button" onClick={() => changeQty(item.productId, 1)} className="px-2 py-1.5 text-muted hover:text-ink">
                        <Plus size={14} />
                      </button>
                    </div>
                    <span className="w-20 text-right text-sm font-semibold text-ink shrink-0">{fmt(item.total)}</span>
                    <button type="button" onClick={() => removeItem(item.productId)} className="text-muted hover:text-danger transition-colors shrink-0">
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
                <div className="flex justify-between items-center pt-2 border-t border-line">
                  <span className="font-semibold text-muted">Total</span>
                  <span className="text-xl font-bold text-success">{fmt(total)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Desconto no total */}
          <div className="flex items-end gap-2">
            <Input
              type="number"
              label="Desconto (R$)"
              value={desconto === 0 ? '' : String(desconto)}
              onChange={e => {
                const raw = e.target.value
                const v = raw === '' ? 0 : Math.max(0, Math.min(Number(raw), total))
                setDesconto(isNaN(v) ? 0 : v)
              }}
              placeholder="0,00"
              min={0}
              className="flex-1"
            />
          </div>
          {desconto > 0 && (
            <div className="space-y-0.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted">Subtotal</span>
                <span className="text-ink font-medium">{fmt(total)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-danger">Desconto</span>
                <span className="text-danger font-medium">- {fmt(desconto)}</span>
              </div>
              <div className="flex justify-between border-t border-line pt-1">
                <span className="text-muted font-semibold">Total a pagar</span>
                <span className="text-success font-bold text-lg">{fmt(total - desconto)}</span>
              </div>
            </div>
          )}

          {/* Cliente (opcional) */}
          <Select
            label="Cliente (opcional)"
            value={selectedClientId}
            onChange={e => setSelectedClientId(e.target.value)}
          >
            <option value="">Sem cliente vinculado</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>{c.name} – {c.phone}</option>
            ))}
          </Select>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Forma de pagamento"
              value={paymentMethod}
              onChange={e => setPaymentMethod(e.target.value as Sale['paymentMethod'])}
            >
              {Object.entries(PAYMENT_METHODS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </Select>
            <Textarea
              label="Observações (opcional)"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Ex: troco R$10..."
            />
          </div>

          <div className="flex gap-3">
            <Button variant="primary" onClick={handleSave} loading={saving} className="flex-1" disabled={items.length === 0}>
              <Wallet size={16} />
              Registrar {fmt(total - desconto)}
            </Button>
            <Button variant="secondary" onClick={() => setModal(false)} className="flex-1">
              Cancelar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
