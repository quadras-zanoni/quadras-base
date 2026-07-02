import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

interface SaveSettingsParams {
  notifyWhatsapp?: string
  slug?: string
}

/**
 * Configurações da arena do dono logado.
 * Guarda o número de WhatsApp ("avisar a arena") e o slug do link público.
 * Um registro por owner (upsert em owner_id).
 *
 * saveSettings({ notifyWhatsapp?, slug? }) — grava só os campos passados.
 * Slug vazio é gravado como NULL (índice UNIQUE ignora múltiplos NULLs no PG).
 * Erro 23505 (slug duplicado) é propagado via throw para a camada de UI tratar.
 */
export function useArenaSettings() {
  const { user } = useAuth()
  const [notifyWhatsapp, setNotifyWhatsapp] = useState('')
  const [slug, setSlug] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    if (!user) return
    const { data, error } = await supabase
      .from('arena_settings')
      .select('notify_whatsapp, slug')
      .eq('owner_id', user.id)
      .maybeSingle()
    if (error) console.error('[useArenaSettings] load:', error)
    setNotifyWhatsapp((data?.notify_whatsapp as string) || '')
    setSlug((data?.slug as string) || '')
    setLoading(false)
  }, [user])

  useEffect(() => { load() }, [load])

  async function saveSettings({ notifyWhatsapp: wa, slug: sl }: SaveSettingsParams) {
    if (!user) return
    setSaving(true)

    const payload: Record<string, unknown> = {
      owner_id: user.id,
      updated_at: new Date().toISOString(),
    }
    if (wa !== undefined) payload.notify_whatsapp = wa.trim()
    // Slug vazio → null para não disputar o índice UNIQUE com string vazia
    if (sl !== undefined) payload.slug = sl.trim() || null

    const { error } = await supabase
      .from('arena_settings')
      .upsert(payload, { onConflict: 'owner_id' })

    setSaving(false)
    if (error) throw error

    if (wa !== undefined) setNotifyWhatsapp(wa.trim())
    if (sl !== undefined) setSlug(sl.trim())
  }

  return { notifyWhatsapp, slug, loading, saving, saveSettings }
}
