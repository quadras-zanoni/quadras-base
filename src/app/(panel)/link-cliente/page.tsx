'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Link2, Copy, CheckCircle, Smartphone, ExternalLink } from 'lucide-react'
import toast from 'react-hot-toast'

export default function LinkClientePage() {
  const { user } = useAuth()
  const [copied, setCopied] = useState(false)

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const publicLink = `${baseUrl}/reservar/${user?.id}`

  async function copyLink() {
    await navigator.clipboard.writeText(publicLink)
    setCopied(true)
    toast.success('Link copiado!')
    setTimeout(() => setCopied(false), 3000)
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Link do Cliente</h1>
        <p className="text-sm text-gray-500 mt-1">
          Compartilhe este link com seus clientes para que eles façam reservas online
        </p>
      </div>

      <Card className="p-6 mb-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
            <Link2 size={20} className="text-green-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">Seu link de reservas</p>
            <p className="text-xs text-gray-500">Qualquer pessoa com este link pode reservar suas quadras</p>
          </div>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4 flex items-center gap-2">
          <p className="text-sm text-gray-700 flex-1 truncate font-mono">{publicLink}</p>
        </div>

        <div className="flex gap-3">
          <Button onClick={copyLink} className="flex-1">
            {copied ? (
              <><CheckCircle size={16} className="mr-2" /> Copiado!</>
            ) : (
              <><Copy size={16} className="mr-2" /> Copiar link</>
            )}
          </Button>
          <Button
            variant="secondary"
            onClick={() => window.open(publicLink, '_blank')}
          >
            <ExternalLink size={16} className="mr-2" /> Abrir
          </Button>
        </div>
      </Card>

      <Card className="p-5 mb-4">
        <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <Smartphone size={18} className="text-gray-400" />
          Como funciona
        </h2>
        <ol className="space-y-3 text-sm text-gray-600">
          <li className="flex gap-3">
            <span className="w-6 h-6 bg-green-600 text-white rounded-full text-xs flex items-center justify-center font-bold shrink-0 mt-0.5">1</span>
            <span>O cliente abre o link no celular ou computador</span>
          </li>
          <li className="flex gap-3">
            <span className="w-6 h-6 bg-green-600 text-white rounded-full text-xs flex items-center justify-center font-bold shrink-0 mt-0.5">2</span>
            <span>Escolhe a quadra, a data e o horário disponível</span>
          </li>
          <li className="flex gap-3">
            <span className="w-6 h-6 bg-green-600 text-white rounded-full text-xs flex items-center justify-center font-bold shrink-0 mt-0.5">3</span>
            <span>Preenche o nome e telefone</span>
          </li>
          <li className="flex gap-3">
            <span className="w-6 h-6 bg-green-600 text-white rounded-full text-xs flex items-center justify-center font-bold shrink-0 mt-0.5">4</span>
            <span>A reserva aparece automaticamente na sua <strong>Agenda do Dia</strong> como <em>Pendente</em></span>
          </li>
          <li className="flex gap-3">
            <span className="w-6 h-6 bg-green-600 text-white rounded-full text-xs flex items-center justify-center font-bold shrink-0 mt-0.5">5</span>
            <span>Você confirma ou cancela pelo painel</span>
          </li>
        </ol>
      </Card>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
        <strong>Dica:</strong> Você pode compartilhar este link no WhatsApp, Instagram, ou fixar como link na bio das suas redes sociais.
      </div>
    </div>
  )
}
