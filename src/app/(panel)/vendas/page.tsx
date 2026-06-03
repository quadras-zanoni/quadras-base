'use client'

import { useState } from 'react'
import { useSales } from '@/hooks/useSales'
import { useProducts } from '@/hooks/useProducts'
import { useClients } from '@/hooks/useClients'
import { Button } from '@/components/ui/Button'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { SaleItem, Sale, PAYMENT_METHODS } from '@/types'
import { ShoppingCart, Plus, Trash2, Receipt, Wallet, User } from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

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
  const { sales, loading, registerSale, todaySales, todayRevenue } = useSales()
  const { products } = useProducts()
  const { clients } = useClients()

  const [modal, setModal] = useState(false)
  const [items, setItems] = useState<SaleItem[]>([])
  const [notes, setNotes] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<Sale['paymentMethod']>('pix')
  const [saving, setSaving] = useState(false)
  const [selectedProductId, setSelectedProductId] = useState('')
  const [qty, setQty] = useState(1)
  const [selectedClientId, setSelectedClientId] = useState('')

  const activeProducts = products.filter(p => p.status === 'ativo')
  const total = items.reduce((sum, i) => sum + i.total, 0)
  const selectedClient = clients.find(c => c.id === selectedClientId)

  function openModal() {
    setItems([])
    setNotes('')
    setPaymentMethod('pix')
    setSelectedProductId('')
    setSelectedClientId('')
    setQty(1)
    setModal(true)
  }

  function addItem() {
    const product = products.find(p => p.id === selectedProductId)
    if (!product) return toast.error('Selecione um produto')
    if (qty <= 0) return toast.error('Quantidade inválida')

    const existing = items.find(i => i.productId === selectedProductId)
    const totalQty = (existing?.quantity || 0) + qty

    if (totalQty > product.quantity) {
      return toast.error(`Estoque insuficiente. Disponível: ${product.quantity}`)
    }

    if (existing) {
      setItems(prev => prev.map(i =>
        i.productId === selectedProductId
          ? { ...i, quantity: i.quantity + qty, total: (i.quantity + qty) * i.unitPrice }
          : i
      ))
    } else {
      setItems(prev => [...prev, {
        productId: product.id,
        productName: product.name,
        quantity: qty,
        unitPrice: product.salePrice,
        total: qty * product.salePrice,
      }])
    }
    setSelectedProductId('')
    setQty(1)
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
        selectedClient?.name || undefined
      )
      toast.success('Venda registrada!')
      setModal(false)
    } catch {
      toast.error('Erro ao registrar venda')
    } finally {
      setSaving(false)
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
                  <span className="font-bold text-success text-lg">{fmt(sale.total)}</span>
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
        <div className="space-y-4">
          {/* Adicionar produto */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted mb-2">Adicionar produto</p>
            <div className="flex gap-2">
              <div className="flex-1">
                <Select
                  value={selectedProductId}
                  onChange={e => setSelectedProductId(e.target.value)}
                >
                  <option value="">Selecione...</option>
                  {activeProducts.map(p => (
                    <option key={p.id} value={p.id} disabled={p.quantity === 0}>
                      {p.name} ({fmt(p.salePrice)}) – {p.quantity} em estoque
                    </option>
                  ))}
                </Select>
              </div>
              <Input
                type="number"
                min="1"
                value={qty}
                onChange={e => setQty(Number(e.target.value))}
                className="w-20"
              />
              <Button onClick={addItem} variant="secondary">
                <Plus size={16} />
              </Button>
            </div>
          </div>

          {/* Lista de itens */}
          {items.length === 0 ? (
            <p className="text-sm text-muted text-center py-4">Nenhum item adicionado</p>
          ) : (
            <div className="space-y-2">
              {items.map(item => (
                <div key={item.productId} className="flex items-center gap-3 bg-surface-2 border border-line rounded-[var(--radius-ctl)] px-3 py-2">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-ink">{item.productName}</p>
                    <p className="text-xs text-muted">{item.quantity}x {fmt(item.unitPrice)}</p>
                  </div>
                  <span className="font-semibold text-ink">{fmt(item.total)}</span>
                  <button onClick={() => removeItem(item.productId)} className="text-muted hover:text-danger transition-colors">
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
              <div className="flex justify-between items-center pt-2 border-t border-line">
                <span className="font-semibold text-muted">Total</span>
                <span className="text-xl font-bold text-success">{fmt(total)}</span>
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
              Registrar {fmt(total)}
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
