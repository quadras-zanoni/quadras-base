'use client'

import { useState } from 'react'
import { useProducts } from '@/hooks/useProducts'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Badge, statusBadge } from '@/components/ui/Badge'
import { Product } from '@/types'
import { Package, Edit, Power, AlertTriangle, Search } from 'lucide-react'
import toast from 'react-hot-toast'

const EMPTY_FORM = {
  name: '', category: '',
  quantity: 0, minStock: 5,
  salePrice: 0, costPrice: 0,
  status: 'ativo' as Product['status'],
}

export default function EstoquePage() {
  const { products, loading, addProduct, updateProduct } = useProducts()
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [showInactive, setShowInactive] = useState(false)
  const [search, setSearch] = useState('')

  function openNew() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setModal(true)
  }

  function openEdit(product: Product) {
    setEditing(product)
    setForm({
      name: product.name,
      category: product.category,
      quantity: product.quantity,
      minStock: product.minStock,
      salePrice: product.salePrice,
      costPrice: product.costPrice,
      status: product.status,
    })
    setModal(true)
  }

  async function handleSave() {
    if (!form.name.trim()) return toast.error('Informe o nome do produto')
    if (form.salePrice <= 0) return toast.error('Informe o preço de venda')
    setSaving(true)
    try {
      if (editing) {
        await updateProduct(editing.id, form)
        toast.success('Produto atualizado!')
      } else {
        await addProduct(form)
        toast.success('Produto cadastrado!')
      }
      setModal(false)
    } catch {
      toast.error('Erro ao salvar produto')
    } finally {
      setSaving(false)
    }
  }

  async function toggleStatus(product: Product) {
    const next = product.status === 'ativo' ? 'inativo' : 'ativo'
    await updateProduct(product.id, { status: next })
    toast.success(`Produto ${next === 'ativo' ? 'ativado' : 'desativado'}`)
  }

  const visible = (showInactive ? products : products.filter(p => p.status === 'ativo'))
    .filter(p => !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.category.toLowerCase().includes(search.toLowerCase()))
  const lowStock = products.filter(p => p.status === 'ativo' && p.quantity <= p.minStock)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Estoque</h1>
          <p className="text-sm text-muted mt-0.5">
            {products.filter(p => p.status === 'ativo').length} produto{products.filter(p => p.status === 'ativo').length !== 1 ? 's' : ''} ativo{products.filter(p => p.status === 'ativo').length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button variant="primary" size="md" onClick={openNew}>
          <Package size={16} /> Novo produto
        </Button>
      </div>

      {/* Banner estoque baixo */}
      {lowStock.length > 0 && (
        <div className="bg-warning/10 border border-warning/20 rounded-[var(--radius-card)] p-4 flex items-start gap-3">
          <AlertTriangle size={18} className="text-[#b45309] mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-[#b45309]">
              {lowStock.length} produto{lowStock.length !== 1 ? 's' : ''} com estoque baixo
            </p>
            <p className="text-xs text-[#b45309]/80 mt-0.5">
              {lowStock.map(p => p.name).join(', ')}
            </p>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 bg-surface border border-line rounded-[var(--radius-ctl)] px-3 py-2 flex-1 min-w-48">
          <Search size={15} className="text-subtle shrink-0" />
          <input
            type="text"
            placeholder="Buscar produto ou categoria..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="text-sm outline-none bg-transparent placeholder:text-subtle text-ink w-full"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-muted cursor-pointer whitespace-nowrap select-none">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={e => setShowInactive(e.target.checked)}
            className="rounded accent-primary"
          />
          Mostrar inativos
        </label>
      </div>

      {/* Conteúdo */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-line border-t-brand" />
        </div>
      ) : visible.length === 0 ? (
        <div className="bg-surface border border-line rounded-[var(--radius-card)] shadow-card p-12 text-center">
          <div className="w-12 h-12 rounded-[var(--radius-ctl)] bg-surface-2 flex items-center justify-center mx-auto mb-4">
            <Package size={24} className="text-subtle" />
          </div>
          <p className="text-base font-medium text-ink mb-1">Nenhum produto encontrado</p>
          <p className="text-sm text-muted mb-4">Cadastre o primeiro produto para controlar o estoque.</p>
          <Button variant="primary" size="md" onClick={openNew}>Cadastrar produto</Button>
        </div>
      ) : (
        <div className="bg-surface border border-line rounded-[var(--radius-card)] shadow-card overflow-hidden">
          {/* Tabela: visível em sm+ */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line bg-surface-2/60">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Produto</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide hidden sm:table-cell">Categoria</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Estoque</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide hidden md:table-cell">Custo</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Preço venda</th>
                  <th className="px-4 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 w-20" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {visible.map(product => {
                  const { variant, label } = statusBadge(product.status)
                  const isLow = product.status === 'ativo' && product.quantity <= product.minStock
                  return (
                    <tr key={product.id} className="hover:bg-surface-2/40 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-[var(--radius-ctl)] bg-surface-2 flex items-center justify-center shrink-0">
                            <Package size={13} className={isLow ? 'text-[#b45309]' : 'text-subtle'} />
                          </div>
                          <span className="font-medium text-ink">{product.name}</span>
                          {isLow && (
                            <AlertTriangle size={13} className="text-[#b45309] shrink-0" />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted hidden sm:table-cell">{product.category}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={isLow ? 'font-bold text-danger' : 'text-ink'}>
                          {product.quantity}
                        </span>
                        {isLow ? (
                          <Badge variant="yellow" className="ml-2">Mín. {product.minStock}</Badge>
                        ) : (
                          <span className="text-subtle text-xs ml-1">/ mín {product.minStock}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-muted hidden md:table-cell">
                        R$ {product.costPrice.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-ink">
                        R$ {product.salePrice.toFixed(2)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={variant}>{label}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 justify-end">
                          <Button size="sm" variant="ghost" onClick={() => openEdit(product)}>
                            <Edit size={14} />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => toggleStatus(product)}>
                            <Power size={14} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal criar / editar */}
      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Editar produto' : 'Novo produto'}>
        <div className="space-y-4">
          <Input
            label="Nome do produto"
            value={form.name}
            onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
            placeholder="Ex: Água mineral 500ml"
          />
          <Input
            label="Categoria"
            value={form.category}
            onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
            placeholder="Ex: Bebidas, Equipamentos..."
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Qtd em estoque"
              type="number"
              min="0"
              value={form.quantity}
              onChange={e => setForm(p => ({ ...p, quantity: Number(e.target.value) }))}
            />
            <Input
              label="Estoque mínimo"
              type="number"
              min="0"
              value={form.minStock}
              onChange={e => setForm(p => ({ ...p, minStock: Number(e.target.value) }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Preço de custo (R$)"
              type="number"
              min="0"
              step="0.01"
              value={form.costPrice}
              onChange={e => setForm(p => ({ ...p, costPrice: Number(e.target.value) }))}
            />
            <Input
              label="Preço de venda (R$)"
              type="number"
              min="0"
              step="0.01"
              value={form.salePrice}
              onChange={e => setForm(p => ({ ...p, salePrice: Number(e.target.value) }))}
            />
          </div>
          <Select
            label="Status"
            value={form.status}
            onChange={e => setForm(p => ({ ...p, status: e.target.value as Product['status'] }))}
          >
            <option value="ativo">Ativo</option>
            <option value="inativo">Inativo</option>
          </Select>
          <div className="flex gap-3 pt-2">
            <Button variant="primary" onClick={handleSave} loading={saving} className="flex-1">
              {editing ? 'Salvar alterações' : 'Cadastrar produto'}
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
