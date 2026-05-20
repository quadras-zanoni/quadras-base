'use client'

import { useState } from 'react'
import { useSales } from '@/hooks/useSales'
import { useProducts } from '@/hooks/useProducts'
import { Button } from '@/components/ui/Button'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { SaleItem, Sale, PAYMENT_METHODS } from '@/types'
import { ShoppingCart, Plus, Trash2, Receipt, Wallet } from 'lucide-react'
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

  const [modal, setModal] = useState(false)
  const [items, setItems] = useState<SaleItem[]>([])
  const [notes, setNotes] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<Sale['paymentMethod']>('pix')
  const [saving, setSaving] = useState(false)
  const [selectedProductId, setSelectedProductId] = useState('')
  const [qty, setQty] = useState(1)

  const activeProducts = products.filter(p => p.status === 'ativo')
  const total = items.reduce((sum, i) => sum + i.total, 0)

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
      await registerSale(items, products, paymentMethod, notes)
      toast.success('Venda registrada!')
      setModal(false)
      setItems([])
      setNotes('')
      setPaymentMethod('pix')
    } catch {
      toast.error('Erro ao registrar venda')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vendas</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Hoje: {todaySales.length} venda{todaySales.length !== 1 ? 's' : ''} · {fmt(todayRevenue)}
          </p>
        </div>
        <Button onClick={() => { setItems([]); setNotes(''); setPaymentMethod('pix'); setModal(true) }}>
          + Nova Venda
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
        </div>
      ) : sales.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
          <ShoppingCart size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-lg mb-2">Nenhuma venda registrada</p>
          <Button onClick={() => setModal(true)}>Registrar venda</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {sales.map(sale => {
            const date = sale.createdAt ? (sale.createdAt as any).toDate?.() : null
            const pm = paymentBadge[sale.paymentMethod] ?? paymentBadge.outro
            return (
              <div key={sale.id} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Receipt size={15} className="text-gray-400" />
                    <span className="text-sm text-gray-500">
                      {date ? format(date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : '–'}
                    </span>
                    <Badge variant={pm.color}>{pm.label}</Badge>
                  </div>
                  <span className="font-bold text-gray-900 text-lg">{fmt(sale.total)}</span>
                </div>
                <div className="space-y-1">
                  {sale.items.map(item => (
                    <div key={item.productId} className="flex justify-between text-sm">
                      <span className="text-gray-700">{item.quantity}x {item.productName}</span>
                      <span className="text-gray-500">{fmt(item.total)}</span>
                    </div>
                  ))}
                </div>
                {sale.notes && (
                  <p className="text-xs text-gray-400 mt-2 border-t border-gray-100 pt-2">{sale.notes}</p>
                )}
              </div>
            )
          })}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="Nova Venda" size="lg">
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-sm font-medium text-gray-700 mb-2">Adicionar produto</p>
            <div className="flex gap-2">
              <select
                value={selectedProductId}
                onChange={e => setSelectedProductId(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
              >
                <option value="">Selecione...</option>
                {activeProducts.map(p => (
                  <option key={p.id} value={p.id} disabled={p.quantity === 0}>
                    {p.name} ({fmt(p.salePrice)}) – {p.quantity} em estoque
                  </option>
                ))}
              </select>
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

          {items.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">Nenhum item adicionado</p>
          ) : (
            <div className="space-y-2">
              {items.map(item => (
                <div key={item.productId} className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg px-3 py-2">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{item.productName}</p>
                    <p className="text-xs text-gray-400">{item.quantity}x {fmt(item.unitPrice)}</p>
                  </div>
                  <span className="font-semibold text-gray-900">{fmt(item.total)}</span>
                  <button onClick={() => removeItem(item.productId)} className="text-gray-400 hover:text-red-500 transition-colors">
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
              <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                <span className="font-semibold text-gray-700">Total</span>
                <span className="text-xl font-bold text-green-600">{fmt(total)}</span>
              </div>
            </div>
          )}

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
            <Button onClick={handleSave} loading={saving} className="flex-1" disabled={items.length === 0}>
              <Wallet size={16} className="mr-2" />
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
