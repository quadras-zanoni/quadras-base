'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useArenaSettings } from '@/hooks/useArenaSettings'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Link2, Copy, CheckCircle, Smartphone, ExternalLink, MessageCircle, Hash } from 'lucide-react'
import toast from 'react-hot-toast'

/** Sanitiza string → slug válido: minúsculas, espaços→hífen, só [a-z0-9-]. */
function sanitizeSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-{2,}/g, '-')
}

export default function LinkClientePage() {
  const { user } = useAuth()
  const [copied, setCopied] = useState(false)

  const { notifyWhatsapp, slug, loading: loadingWa, saving, saveSettings } = useArenaSettings()
  const [waInput, setWaInput] = useState('')
  const [slugInput, setSlugInput] = useState('')

  useEffect(() => { setWaInput(notifyWhatsapp) }, [notifyWhatsapp])
  useEffect(() => { setSlugInput(slug) }, [slug])

  async function saveWhatsapp() {
    try {
      await saveSettings({ notifyWhatsapp: waInput })
      toast.success('Número salvo!')
    } catch {
      toast.error('Erro ao salvar número')
    }
  }

  async function saveSlug() {
    try {
      await saveSettings({ slug: slugInput })
      toast.success('Apelido salvo!')
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code
      const msg = err instanceof Error ? err.message : String(err)
      if (code === '23505' || msg.toLowerCase().includes('duplicate') || msg.toLowerCase().includes('unique')) {
        toast.error('Esse apelido já está em uso, escolha outro.')
      } else {
        toast.error('Erro ao salvar apelido')
      }
    }
  }

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const publicLink = slug
    ? `${baseUrl}/reservar/${slug}`
    : `${baseUrl}/reservar/${user?.id}`

  async function copyLink() {
    await navigator.clipboard.writeText(publicLink)
    setCopied(true)
    toast.success('Link copiado!')
    setTimeout(() => setCopied(false), 3000)
  }

  return (
    <div className="max-w-2xl space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-ink">Link do Cliente</h1>
        <p className="text-sm text-muted mt-1">
          Compartilhe este link com seus clientes para que eles façam reservas online
        </p>
      </div>

      {/* Card principal — URL + ações */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 bg-brand-weak rounded-[var(--radius-ctl)] flex items-center justify-center shrink-0">
            <Link2 size={20} className="text-brand" />
          </div>
          <div>
            <p className="font-semibold text-ink">Seu link de reservas</p>
            <p className="text-xs text-muted">Qualquer pessoa com este link pode reservar suas quadras</p>
          </div>
        </div>

        <div className="bg-surface-2 border border-line rounded-[var(--radius-ctl)] px-4 py-3 mb-4 flex items-center gap-2">
          <p className="text-sm text-ink flex-1 truncate font-mono">{publicLink}</p>
        </div>

        {!slug && (
          <p className="text-xs text-muted mb-4">
            Seu link atual usa um código longo. Defina um <strong className="text-ink">apelido</strong> abaixo para ter um link curto e fácil de compartilhar.
          </p>
        )}

        <div className="flex gap-3">
          <Button variant="primary" onClick={copyLink} className="flex-1">
            {copied ? (
              <><CheckCircle size={16} /> Copiado!</>
            ) : (
              <><Copy size={16} /> Copiar link</>
            )}
          </Button>
          <Button
            variant="secondary"
            onClick={() => window.open(publicLink, '_blank')}
          >
            <ExternalLink size={16} /> Abrir
          </Button>
        </div>
      </Card>

      {/* Card — Apelido do link (slug) */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-brand-weak rounded-[var(--radius-ctl)] flex items-center justify-center shrink-0">
            <Hash size={20} className="text-brand" />
          </div>
          <div>
            <p className="font-semibold text-ink">Apelido do link</p>
            <p className="text-xs text-muted">Crie um endereço curto e fácil de lembrar para sua arena</p>
          </div>
        </div>

        <Input
          label="Apelido da arena"
          value={slugInput}
          onChange={e => setSlugInput(sanitizeSlug(e.target.value))}
          placeholder="arena-do-parque"
          disabled={loadingWa}
        />

        <p className="text-xs text-muted mt-2 mb-4">
          Seu link ficará: <span className="font-mono text-ink">{baseUrl}/reservar/<strong>{slugInput || 'SEU-APELIDO'}</strong></span>
        </p>

        <Button
          variant="primary"
          onClick={saveSlug}
          loading={saving}
          disabled={loadingWa}
        >
          <CheckCircle size={16} /> Salvar apelido
        </Button>
      </Card>

      {/* Card — WhatsApp de avisos */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-success/10 rounded-[var(--radius-ctl)] flex items-center justify-center shrink-0">
            <MessageCircle size={20} className="text-success" />
          </div>
          <div>
            <p className="font-semibold text-ink">WhatsApp de avisos</p>
            <p className="text-xs text-muted">Quando alguém reservar, o cliente verá um botão pra te avisar neste número</p>
          </div>
        </div>

        <Input
          label="Número da arena (com DDD)"
          value={waInput}
          onChange={e => setWaInput(e.target.value)}
          placeholder="Ex: (11) 99999-9999"
          type="tel"
          disabled={loadingWa}
        />

        <Button
          variant="primary"
          onClick={saveWhatsapp}
          loading={saving}
          disabled={loadingWa}
          className="mt-4"
        >
          <CheckCircle size={16} /> Salvar número
        </Button>

        <p className="text-xs text-muted mt-3 leading-relaxed">
          Esse número fica visível pra quem reserva (é o WhatsApp comercial da arena). A reserva sempre cai na sua Agenda como <span className="text-ink font-medium">pendente</span>, mesmo que o cliente não clique no botão de aviso.
        </p>
      </Card>

      {/* Card como funciona */}
      <Card className="p-5">
        <h2 className="font-semibold text-ink mb-4 flex items-center gap-2">
          <Smartphone size={18} className="text-subtle" />
          Como funciona
        </h2>
        <ol className="space-y-3 text-sm text-muted">
          <li className="flex gap-3">
            <span className="w-6 h-6 bg-primary text-white rounded-full text-xs flex items-center justify-center font-bold shrink-0 mt-0.5">1</span>
            <span>O cliente abre o link no celular ou computador</span>
          </li>
          <li className="flex gap-3">
            <span className="w-6 h-6 bg-primary text-white rounded-full text-xs flex items-center justify-center font-bold shrink-0 mt-0.5">2</span>
            <span>Escolhe a quadra, a data e o horário disponível</span>
          </li>
          <li className="flex gap-3">
            <span className="w-6 h-6 bg-primary text-white rounded-full text-xs flex items-center justify-center font-bold shrink-0 mt-0.5">3</span>
            <span>Preenche o nome e telefone</span>
          </li>
          <li className="flex gap-3">
            <span className="w-6 h-6 bg-primary text-white rounded-full text-xs flex items-center justify-center font-bold shrink-0 mt-0.5">4</span>
            <span>A reserva aparece automaticamente na sua <strong className="text-ink">Agenda do Dia</strong> como <em>Pendente</em></span>
          </li>
          <li className="flex gap-3">
            <span className="w-6 h-6 bg-primary text-white rounded-full text-xs flex items-center justify-center font-bold shrink-0 mt-0.5">5</span>
            <span>Você confirma ou cancela pelo painel</span>
          </li>
        </ol>
      </Card>

      {/* Dica */}
      <div className="bg-warning/10 border border-warning/20 rounded-[var(--radius-card)] p-4 text-sm text-ink">
        <strong>Dica:</strong> Você pode compartilhar este link no WhatsApp, Instagram, ou fixar como link na bio das suas redes sociais.
      </div>
    </div>
  )
}
