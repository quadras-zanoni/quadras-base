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
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Estoque</h1>
          <p className="text-sm text-gray-500 mt-0.5">{products.filter(p => p.status === 'ativo').length} produto{products.filter(p => p.status === 'ativo').length !== 1 ? 's' : ''} ativo{products.filter(p => p.status === 'ativo').length !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={openNew}>+ Novo Produto</Button>
      </div>

      {lowStock.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 flex items-start gap-3">
          <AlertTriangle size={18} className="text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-800">
              {lowStock.length} produto{lowStock.length !== 1 ? 's' : ''} com estoque baixo
            </p>
            <p className="text-xs text-amber-600 mt-0.5">
              {lowStock.map(p => p.name).join(', ')}
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 flex-1 min-w-48">
          <Search size={15} className="text-gray-400 shrink-0" />
          <input
            type="text"
            placeholder="Buscar produto ou categoria..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="text-sm outline-none bg-transparent placeholder-gray-400 w-full"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer whitespace-nowrap">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={e => setShowInactive(e.target.checked)}
            className="rounded"
          />
          Mostrar inativos
        </label>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
        </div>
      ) : visible.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
          <Package size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-lg mb-2">Nenhum produto cadastrado</p>
          <Button onClick={openNew}>Cadastrar produto</Button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Produto</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden sm:table-cell">Categoria</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Estoque</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Custo</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Preço venda</th>
                <th className="px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {visible.map(product => {
                const { variant, label } = statusBadge(product.status)
                const isLow = product.status === 'ativo' && product.quantity <= product.minStock
                return (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {isLow && <AlertTriangle size={14} className="text-amber-500 shrink-0" />}
                        <span className="font-medium text-gray-900">{product.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{product.category}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={isLow ? 'text-red-600 font-bold' : 'text-gray-700'}>
                        {product.quantity}
                      </span>
                      <span className="text-gray-400 text-xs ml-1">/ mín {product.minStock}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500 hidden md:table-cell">
                      R$ {product.costPrice.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">
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
      )}

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
            <Button onClick={handleSave} loading={saving} className="flex-1">
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
