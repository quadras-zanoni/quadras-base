'use client'

import { useState } from 'react'
import { useCourts } from '@/hooks/useCourts'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Badge, statusBadge } from '@/components/ui/Badge'
import { MiniCourt } from '@/components/dashboard/widgets'
import { Court, Modality, PriceTier, MODALITIES } from '@/types'
import { minHourlyPrice } from '@/lib/pricing'
import { Flag, Edit, Power, Plus, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

// Rótulos dos dias seguindo getDay(): 0=Dom ... 6=Sáb
const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

const EMPTY_TIER: PriceTier = { days: [], start: '18:00', end: '23:00', price: 0 }

const EMPTY_FORM = {
  name: '',
  modalities: ['beach_tennis'] as Modality[],
  priceTiers: [] as PriceTier[],
  pricePerHour: 0,
  duration: 60,
  openTime: '08:00',
  closeTime: '22:00',
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
      modalities: court.modalities ?? ['beach_tennis'],
      priceTiers: court.priceTiers ?? [],
      pricePerHour: court.pricePerHour,
      duration: court.duration,
      openTime: court.openTime,
      closeTime: court.closeTime,
      status: court.status,
    })
    setModal(true)
  }

  // Alterna uma modalidade na seleção; garante mínimo de 1
  function toggleModality(mod: Modality) {
    setForm(prev => {
      const selecionada = prev.modalities.includes(mod)
      if (selecionada && prev.modalities.length === 1) return prev // mínimo 1
      return {
        ...prev,
        modalities: selecionada
          ? prev.modalities.filter(m => m !== mod)
          : [...prev.modalities, mod],
      }
    })
  }

  // Adiciona faixa de preço vazia
  function addTier() {
    setForm(prev => ({ ...prev, priceTiers: [...prev.priceTiers, { ...EMPTY_TIER }] }))
  }

  // Remove faixa pelo índice
  function removeTier(idx: number) {
    setForm(prev => ({ ...prev, priceTiers: prev.priceTiers.filter((_, i) => i !== idx) }))
  }

  // Atualiza campo de uma faixa específica
  function updateTier<K extends keyof PriceTier>(idx: number, key: K, value: PriceTier[K]) {
    setForm(prev => ({
      ...prev,
      priceTiers: prev.priceTiers.map((t, i) => (i === idx ? { ...t, [key]: value } : t)),
    }))
  }

  // Alterna um dia da semana dentro de uma faixa
  function toggleTierDay(idx: number, day: number) {
    setForm(prev => {
      const tier = prev.priceTiers[idx]
      const days = tier.days.includes(day)
        ? tier.days.filter(d => d !== day)
        : [...tier.days, day]
      return {
        ...prev,
        priceTiers: prev.priceTiers.map((t, i) => (i === idx ? { ...t, days } : t)),
      }
    })
  }

  async function handleSave() {
    if (!form.name.trim()) return toast.error('Informe o nome da quadra')
    if (form.modalities.length < 1) return toast.error('Selecione ao menos uma modalidade')
    if (form.pricePerHour <= 0) return toast.error('Informe o preço padrão por hora')

    // Validar cada faixa de preço
    for (let i = 0; i < form.priceTiers.length; i++) {
      const t = form.priceTiers[i]
      if (t.days.length < 1)
        return toast.error(`Faixa ${i + 1}: selecione ao menos um dia da semana`)
      if (t.start >= t.end)
        return toast.error(`Faixa ${i + 1}: horário de início deve ser anterior ao fim`)
      if (t.price <= 0)
        return toast.error(`Faixa ${i + 1}: informe o valor R$/hora`)
    }

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

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
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
          <p className="text-sm text-muted mb-5">
            Adicione a primeira quadra para começar a receber agendamentos.
          </p>
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
            const hasTiers = (court.priceTiers ?? []).length > 0
            return (
              <div
                key={court.id}
                className={`bg-surface border rounded-[var(--radius-card)] shadow-card p-5 flex flex-col gap-4 transition-opacity ${
                  isInactive ? 'border-line opacity-60' : 'border-line'
                }`}
              >
                {/* Topo: nome + badge */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-ink truncate">{court.name}</h3>
                    {/* Modalidades da quadra */}
                    <p className="text-sm text-muted mt-0.5">
                      {(court.modalities ?? []).map(m => MODALITIES[m]).join(' · ')}
                    </p>
                  </div>
                  <Badge variant={variant}>{label}</Badge>
                </div>

                {/* Ilustração da quadra */}
                <MiniCourt state={isInactive ? 'manutencao' : 'livre'} />

                {/* Detalhes */}
                <div className="space-y-1.5 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted">Preço/hora</span>
                    <span className="font-semibold text-ink">
                      {hasTiers
                        ? `A partir de R$ ${minHourlyPrice(court).toFixed(2)}`
                        : `R$ ${court.pricePerHour.toFixed(2)}`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted">Duração</span>
                    <span className="font-medium text-ink">{court.duration} min</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted">Horário</span>
                    <span className="font-medium text-ink">
                      {court.openTime} – {court.closeTime}
                    </span>
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

          {/* Modalidades — seleção múltipla via chips */}
          <div>
            <p className="text-sm font-medium text-ink mb-2">Modalidades</p>
            <div className="flex flex-wrap gap-2">
              {(Object.entries(MODALITIES) as [Modality, string][]).map(([key, rotulo]) => {
                const selecionada = form.modalities.includes(key)
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleModality(key)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                      selecionada
                        ? 'bg-brand text-white border-brand'
                        : 'bg-surface text-muted border-line hover:border-brand hover:text-brand'
                    }`}
                  >
                    {rotulo}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Preço padrão + duração */}
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Preço padrão (R$/hora)"
              type="number"
              min="0"
              step="0.01"
              placeholder="0,00"
              value={form.pricePerHour || ''}
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

          {/* Faixas de preço (opcional) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-ink">
                  Faixas de preço{' '}
                  <span className="text-muted font-normal">(opcional)</span>
                </p>
                <p className="text-xs text-muted mt-0.5">
                  Horários sem faixa usam o preço padrão.
                </p>
              </div>
              <button
                type="button"
                onClick={addTier}
                className="flex items-center gap-1 text-sm text-brand hover:underline font-medium shrink-0"
              >
                <Plus size={14} /> Adicionar faixa
              </button>
            </div>

            {form.priceTiers.map((tier, idx) => (
              <div
                key={idx}
                className="border border-line rounded-[var(--radius-card)] p-3 space-y-3"
              >
                {/* Título da faixa + botão remover */}
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-muted uppercase tracking-wide">
                    Faixa {idx + 1}
                  </p>
                  <button
                    type="button"
                    onClick={() => removeTier(idx)}
                    className="text-muted hover:text-red-500 transition-colors"
                    aria-label="Remover faixa"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                {/* Dias da semana */}
                <div>
                  <p className="text-xs text-muted mb-1.5">Dias</p>
                  <div className="flex flex-wrap gap-1.5">
                    {DIAS_SEMANA.map((dia, dayIdx) => {
                      const ativo = tier.days.includes(dayIdx)
                      return (
                        <button
                          key={dayIdx}
                          type="button"
                          onClick={() => toggleTierDay(idx, dayIdx)}
                          className={`px-2 py-1 rounded text-xs font-medium border transition-colors ${
                            ativo
                              ? 'bg-brand text-white border-brand'
                              : 'bg-surface text-muted border-line hover:border-brand hover:text-brand'
                          }`}
                        >
                          {dia}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Horário início / fim / valor */}
                <div className="grid grid-cols-3 gap-2">
                  <Input
                    label="Início"
                    type="time"
                    value={tier.start}
                    onChange={e => updateTier(idx, 'start', e.target.value)}
                  />
                  <Input
                    label="Fim"
                    type="time"
                    value={tier.end}
                    onChange={e => updateTier(idx, 'end', e.target.value)}
                  />
                  <Input
                    label="R$/hora"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0,00"
                    value={tier.price || ''}
                    onChange={e => updateTier(idx, 'price', Number(e.target.value))}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Horário de funcionamento */}
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
