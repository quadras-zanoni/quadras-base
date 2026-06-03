'use client'

import { useState } from 'react'
import { useCourts } from '@/hooks/useCourts'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Badge, statusBadge } from '@/components/ui/Badge'
import { MiniCourt } from '@/components/dashboard/widgets'
import { Court, COURT_TYPES } from '@/types'
import { Flag, Edit, Power, Plus } from 'lucide-react'
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Quadras</h1>
          <p className="text-sm text-muted mt-0.5">
            {courts.length} quadra{courts.length !== 1 ? 's' : ''} cadastrada{courts.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button variant="primary" size="md" onClick={openNew}>
          <Plus size={16} /> Nova quadra
        </Button>
      </div>

      {/* Estado: carregando */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-line border-t-brand" />
        </div>

      /* Estado: vazio */
      ) : courts.length === 0 ? (
        <div className="bg-surface border border-line rounded-[var(--radius-card)] shadow-card p-12 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-brand-weak mb-4">
            <Flag size={26} className="text-brand" />
          </div>
          <p className="text-base font-semibold text-ink mb-1">Nenhuma quadra cadastrada</p>
          <p className="text-sm text-muted mb-5">Adicione a primeira quadra para começar a receber agendamentos.</p>
          <Button variant="primary" size="md" onClick={openNew}>
            <Plus size={16} /> Cadastrar primeira quadra
          </Button>
        </div>

      /* Estado: lista de quadras */
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {courts.map(court => {
            const { variant, label } = statusBadge(court.status)
            const isInactive = court.status === 'inativa'
            return (
              <div
                key={court.id}
                className={`bg-surface border rounded-[var(--radius-card)] shadow-card p-5 flex flex-col gap-4 transition-opacity ${isInactive ? 'border-line opacity-60' : 'border-line'}`}
              >
                {/* Topo: nome + badge */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-ink truncate">{court.name}</h3>
                    <p className="text-sm text-muted mt-0.5">{COURT_TYPES[court.type]}</p>
                  </div>
                  <Badge variant={variant}>{label}</Badge>
                </div>

                {/* Ilustração da quadra */}
                <MiniCourt state={isInactive ? 'manutencao' : 'livre'} />

                {/* Detalhes */}
                <div className="space-y-1.5 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted">Preço/hora</span>
                    <span className="font-semibold text-ink">R$ {court.pricePerHour.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted">Duração</span>
                    <span className="font-medium text-ink">{court.duration} min</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted">Horário</span>
                    <span className="font-medium text-ink">{court.openTime} – {court.closeTime}</span>
                  </div>
                </div>

                {/* Ações */}
                <div className="flex gap-2 pt-1 border-t border-line">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => openEdit(court)}
                    className="flex-1"
                  >
                    <Edit size={14} /> Editar
                  </Button>
                  <Button
                    size="sm"
                    variant={court.status === 'ativa' ? 'ghost' : 'secondary'}
                    onClick={() => toggleStatus(court)}
                    className="flex-1"
                  >
                    <Power size={14} />
                    {court.status === 'ativa' ? 'Desativar' : 'Ativar'}
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal criar/editar */}
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
            placeholder="Ex: Quadra 1 – Beach Tennis"
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
            <Button variant="primary" onClick={handleSave} loading={saving} className="flex-1">
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
