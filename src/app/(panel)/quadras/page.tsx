'use client'

import { useState } from 'react'
import { useCourts } from '@/hooks/useCourts'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Badge, statusBadge } from '@/components/ui/Badge'
import { Court, COURT_TYPES } from '@/types'
import { Flag, Edit, Power } from 'lucide-react'
import toast from 'react-hot-toast'

const EMPTY_FORM = {
  name: '', type: 'futsal' as Court['type'],
  pricePerHour: 0, duration: 60,
  openTime: '08:00', closeTime: '22:00',
  status: 'ativa' as Court['status'],
}

export default function QuadrasPage() {
  const { courts, loading, addCourt, updateCourt } = useCourts()
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<Court | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  function openNew() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setModal(true)
  }

  function openEdit(court: Court) {
    setEditing(court)
    setForm({
      name: court.name,
      type: court.type,
      pricePerHour: court.pricePerHour,
      duration: court.duration,
      openTime: court.openTime,
      closeTime: court.closeTime,
      status: court.status,
    })
    setModal(true)
  }

  async function handleSave() {
    if (!form.name.trim()) return toast.error('Informe o nome da quadra')
    if (form.pricePerHour <= 0) return toast.error('Informe o preço por hora')
    setSaving(true)
    try {
      if (editing) {
        await updateCourt(editing.id, form)
        toast.success('Quadra atualizada!')
      } else {
        await addCourt(form)
        toast.success('Quadra cadastrada!')
      }
      setModal(false)
    } catch {
      toast.error('Erro ao salvar quadra')
    } finally {
      setSaving(false)
    }
  }

  async function toggleStatus(court: Court) {
    const next = court.status === 'ativa' ? 'inativa' : 'ativa'
    await updateCourt(court.id, { status: next })
    toast.success(`Quadra ${next === 'ativa' ? 'ativada' : 'desativada'}`)
  }

  const f = (v: string | number) =>
    ({ target: { value: v } } as React.ChangeEvent<HTMLInputElement>)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quadras</h1>
          <p className="text-sm text-gray-500 mt-0.5">{courts.length} quadra{courts.length !== 1 ? 's' : ''} cadastrada{courts.length !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={openNew}>+ Nova Quadra</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
        </div>
      ) : courts.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
          <Flag size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-lg mb-2">Nenhuma quadra cadastrada</p>
          <Button onClick={openNew}>Cadastrar primeira quadra</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {courts.map(court => {
            const { variant, label } = statusBadge(court.status)
            return (
              <div key={court.id} className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{court.name}</h3>
                    <p className="text-sm text-gray-500">{COURT_TYPES[court.type]}</p>
                  </div>
                  <Badge variant={variant}>{label}</Badge>
                </div>
                <div className="space-y-1 text-sm text-gray-600 mb-4">
                  <div className="flex justify-between">
                    <span>Preço/hora</span>
                    <span className="font-medium">R$ {court.pricePerHour.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Duração</span>
                    <span className="font-medium">{court.duration} min</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Horário</span>
                    <span className="font-medium">{court.openTime} – {court.closeTime}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => openEdit(court)} className="flex-1">
                    <Edit size={14} className="mr-1" /> Editar
                  </Button>
                  <Button
                    size="sm"
                    variant={court.status === 'ativa' ? 'ghost' : 'secondary'}
                    onClick={() => toggleStatus(court)}
                    className="flex-1"
                  >
                    <Power size={14} className="mr-1" />
                    {court.status === 'ativa' ? 'Desativar' : 'Ativar'}
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={editing ? 'Editar quadra' : 'Nova quadra'}
      >
        <div className="space-y-4">
          <Input
            label="Nome da quadra"
            value={form.name}
            onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
            placeholder="Ex: Quadra 1 – Futsal"
          />
          <Select
            label="Tipo"
            value={form.type}
            onChange={e => setForm(p => ({ ...p, type: e.target.value as Court['type'] }))}
          >
            {Object.entries(COURT_TYPES).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </Select>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Preço por hora (R$)"
              type="number"
              min="0"
              step="0.01"
              value={form.pricePerHour}
              onChange={e => setForm(p => ({ ...p, pricePerHour: Number(e.target.value) }))}
            />
            <Input
              label="Duração do horário (min)"
              type="number"
              min="30"
              step="15"
              value={form.duration}
              onChange={e => setForm(p => ({ ...p, duration: Number(e.target.value) }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Abertura"
              type="time"
              value={form.openTime}
              onChange={e => setForm(p => ({ ...p, openTime: e.target.value }))}
            />
            <Input
              label="Fechamento"
              type="time"
              value={form.closeTime}
              onChange={e => setForm(p => ({ ...p, closeTime: e.target.value }))}
            />
          </div>
          <Select
            label="Status"
            value={form.status}
            onChange={e => setForm(p => ({ ...p, status: e.target.value as Court['status'] }))}
          >
            <option value="ativa">Ativa</option>
            <option value="inativa">Inativa</option>
          </Select>
          <div className="flex gap-3 pt-2">
            <Button onClick={handleSave} loading={saving} className="flex-1">
              {editing ? 'Salvar alterações' : 'Cadastrar quadra'}
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
