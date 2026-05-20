'use client'

import { useState } from 'react'
import { useStock } from '@/hooks/useStock'
import { useProducts } from '@/hooks/useProducts'
import { Button } from '@/components/ui/Button'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { StockMovement } from '@/types'
import { ArrowLeftRight, ArrowDown, ArrowUp, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const typeConfig = {
  entrada: { label: 'Entrada', color: 'green' as const, icon: ArrowDown },
  saida: { label: 'Saída', color: 'red' as const, icon: ArrowUp },
  ajuste: { label: 'Ajuste', color: 'blue' as const, icon: RefreshCw },
}

export default function MovimentacoesPage() {
  const { movements, loading, addMovement } = useStock()
  const { products } = useProducts()

  const [modal, setModal] = useState(false)
  const [productId, setProductId] = useState('')
  const [type, setType] = useState<StockMovement['type']>('entrada')
  const [quantity, setQuantity] = useState(1)
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)

  const activeProducts = products.filter(p => p.status === 'ativo')
  const selectedProduct = products.find(p => p.id === productId)

  async function handleSave() {
    if (!productId) return toast.error('Selecione um produto')
    if (!selectedProduct) return
    if (quantity <= 0) return toast.error('Informe uma quantidade válida')
    if (!reason.trim()) return toast.error('Informe o motivo')
    if (type === 'saida' && quantity > selectedProduct.quantity) {
      return toast.error(`Estoque insuficiente. Disponível: ${selectedProduct.quantity}`)
    }

    setSaving(true)
    try {
      await addMovement(selectedProduct, type, quantity, reason)
      toast.success('Movimentação registrada!')
      setModal(false)
      setProductId('')
      setQuantity(1)
      setReason('')
      setType('entrada')
    } catch {
      toast.error('Erro ao registrar movimentação')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Movimentações de Estoque</h1>
          <p className="text-sm text-gray-500 mt-0.5">{movements.length} movimentação{movements.length !== 1 ? 'ões' : ''} registrada{movements.length !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={() => setModal(true)}>+ Nova Movimentação</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
        </div>
      ) : movements.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
          <ArrowLeftRight size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-lg">Nenhuma movimentação registrada</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {movements.map(m => {
            const cfg = typeConfig[m.type]
            const Icon = cfg.icon
            const date = m.createdAt ? (m.createdAt as any).toDate() : null
            return (
              <div key={m.id} className="flex items-center gap-4 px-4 py-3">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                  m.type === 'entrada' ? 'bg-green-100' : m.type === 'saida' ? 'bg-red-100' : 'bg-blue-100'
                }`}>
                  <Icon size={16} className={
                    m.type === 'entrada' ? 'text-green-600' : m.type === 'saida' ? 'text-red-600' : 'text-blue-600'
                  } />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-900">{m.productName}</span>
                    <Badge variant={cfg.color}>{cfg.label}</Badge>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{m.reason}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`font-semibold ${
                    m.type === 'entrada' ? 'text-green-600' : m.type === 'saida' ? 'text-red-600' : 'text-blue-600'
                  }`}>
                    {m.type === 'entrada' ? '+' : m.type === 'saida' ? '-' : ''}{m.quantity}
                  </p>
                  <p className="text-xs text-gray-400">
                    {m.previousQuantity} → {m.newQuantity}
                  </p>
                  {date && (
                    <p className="text-xs text-gray-300">
                      {format(date, "dd/MM 'às' HH:mm", { locale: ptBR })}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="Nova Movimentação">
        <div className="space-y-4">
          <Select
            label="Produto"
            value={productId}
            onChange={e => setProductId(e.target.value)}
          >
            <option value="">Selecione um produto</option>
            {activeProducts.map(p => (
              <option key={p.id} value={p.id}>
                {p.name} (estoque: {p.quantity})
              </option>
            ))}
          </Select>

          <Select
            label="Tipo de movimentação"
            value={type}
            onChange={e => setType(e.target.value as StockMovement['type'])}
          >
            <option value="entrada">Entrada (compra/reposição)</option>
            <option value="saida">Saída manual</option>
            <option value="ajuste">Ajuste de inventário</option>
          </Select>

          <Input
            label={type === 'ajuste' ? 'Nova quantidade total' : 'Quantidade'}
            type="number"
            min="0"
            value={quantity}
            onChange={e => setQuantity(Number(e.target.value))}
          />

          {selectedProduct && type !== 'ajuste' && (
            <p className="text-xs text-gray-500">
              Estoque atual: <strong>{selectedProduct.quantity}</strong> →
              Após movimentação: <strong>
                {type === 'entrada'
                  ? selectedProduct.quantity + quantity
                  : selectedProduct.quantity - quantity}
              </strong>
            </p>
          )}

          <Textarea
            label="Motivo / Observação"
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Ex: Compra do fornecedor, perda, inventário..."
          />

          <div className="flex gap-3">
            <Button onClick={handleSave} loading={saving} className="flex-1">
              Registrar
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
