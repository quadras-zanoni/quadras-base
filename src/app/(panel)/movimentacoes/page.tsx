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
  entrada: { label: 'Entrada', color: 'green' as const, icon: ArrowUp },
  saida:   { label: 'Saída',   color: 'red'    as const, icon: ArrowDown },
  ajuste:  { label: 'Ajuste',  color: 'violet' as const, icon: RefreshCw },
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
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Movimentações de Estoque</h1>
          <p className="text-sm text-muted mt-0.5">
            {movements.length} movimentaç{movements.length !== 1 ? 'ões' : 'ão'} registrada{movements.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button variant="primary" size="md" onClick={() => setModal(true)}>
          <ArrowLeftRight size={16} /> Nova Movimentação
        </Button>
      </div>

      {/* Conteúdo */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-line border-t-brand" />
        </div>
      ) : movements.length === 0 ? (
        <div className="bg-surface border border-line rounded-[var(--radius-card)] shadow-card p-12 text-center">
          <div className="w-12 h-12 rounded-[var(--radius-ctl)] bg-surface-2 flex items-center justify-center mx-auto mb-4">
            <ArrowLeftRight size={24} className="text-subtle" />
          </div>
          <p className="text-base font-medium text-ink mb-1">Nenhuma movimentação registrada</p>
          <p className="text-sm text-muted">Registre a primeira entrada ou saída de estoque.</p>
        </div>
      ) : (
        <div className="bg-surface border border-line rounded-[var(--radius-card)] shadow-card overflow-hidden">
          {/* Cabeçalho da lista */}
          <div className="grid grid-cols-[auto_1fr_auto] sm:grid-cols-[auto_1fr_auto_auto] items-center gap-3 px-4 py-2.5 border-b border-line bg-surface-2/60">
            <span className="text-xs font-semibold text-muted uppercase tracking-wide w-9" />
            <span className="text-xs font-semibold text-muted uppercase tracking-wide">Produto / Motivo</span>
            <span className="text-xs font-semibold text-muted uppercase tracking-wide hidden sm:block">Data</span>
            <span className="text-xs font-semibold text-muted uppercase tracking-wide text-right">Qtd</span>
          </div>

          <div className="divide-y divide-line">
            {movements.map(m => {
              const cfg = typeConfig[m.type]
              const Icon = cfg.icon
              const date = m.createdAt ? new Date(m.createdAt) : null
              return (
                <div key={m.id} className="grid grid-cols-[auto_1fr_auto] sm:grid-cols-[auto_1fr_auto_auto] items-center gap-3 px-4 py-3 hover:bg-surface-2/40 transition-colors">
                  {/* Ícone */}
                  <div className={`w-9 h-9 rounded-[var(--radius-ctl)] flex items-center justify-center shrink-0 ${
                    m.type === 'entrada' ? 'bg-success/10' : m.type === 'saida' ? 'bg-danger/10' : 'bg-violet/10'
                  }`}>
                    <Icon size={15} className={
                      m.type === 'entrada' ? 'text-success' : m.type === 'saida' ? 'text-danger' : 'text-violet'
                    } />
                  </div>

                  {/* Produto + Badge + motivo */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-ink truncate">{m.productName}</span>
                      <Badge variant={
                        m.type === 'entrada' ? 'green' : m.type === 'saida' ? 'red' : 'violet'
                      }>{cfg.label}</Badge>
                    </div>
                    <p className="text-xs text-muted mt-0.5 truncate">{m.reason}</p>
                  </div>

                  {/* Data — oculta em mobile */}
                  <div className="hidden sm:block text-right shrink-0">
                    {date && (
                      <p className="text-xs text-subtle">
                        {format(date, "dd/MM 'às' HH:mm", { locale: ptBR })}
                      </p>
                    )}
                    <p className="text-xs text-muted mt-0.5">
                      {m.previousQuantity} → {m.newQuantity}
                    </p>
                  </div>

                  {/* Quantidade */}
                  <div className="text-right shrink-0">
                    <p className={`font-semibold tabular-nums ${
                      m.type === 'entrada' ? 'text-success' : m.type === 'saida' ? 'text-danger' : 'text-violet'
                    }`}>
                      {m.type === 'entrada' ? '+' : m.type === 'saida' ? '-' : ''}{m.quantity}
                    </p>
                    {/* Fallback de data p/ mobile */}
                    {date && (
                      <p className="text-[10px] text-subtle mt-0.5 sm:hidden">
                        {format(date, 'dd/MM HH:mm', { locale: ptBR })}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Modal nova movimentação */}
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
            <p className="text-xs text-muted bg-surface-2 rounded-[var(--radius-ctl)] px-3 py-2">
              Estoque atual: <strong className="text-ink">{selectedProduct.quantity}</strong>
              {' → '}
              Após movimentação:{' '}
              <strong className={type === 'entrada' ? 'text-success' : 'text-danger'}>
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

          <div className="flex gap-3 pt-2">
            <Button variant="primary" onClick={handleSave} loading={saving} className="flex-1">
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
