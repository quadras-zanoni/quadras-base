'use client'

import { useBookings } from '@/hooks/useBookings'
import { useCourts } from '@/hooks/useCourts'
import { useProducts } from '@/hooks/useProducts'
import { useSales } from '@/hooks/useSales'
import { StatCard } from '@/components/ui/Card'
import { Badge, statusBadge } from '@/components/ui/Badge'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Calendar, CheckCircle, Clock, DollarSign,
  ShoppingCart, AlertTriangle, Flag,
} from 'lucide-react'
import Link from 'next/link'

function fmt(val: number) {
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function DashboardPage() {
  const today = format(new Date(), 'yyyy-MM-dd')
  const { bookings, loading: bLoading } = useBookings(today)
  const { courts, loading: cLoading }   = useCourts()
  const { lowStockProducts }            = useProducts()
  const { todaySales, todayRevenue }    = useSales()

  const confirmed = bookings.filter(b => b.status === 'confirmado')
  const pending   = bookings.filter(b => b.status === 'pendente')
  const active    = bookings.filter(b => b.status !== 'cancelado')

  const bookingRevenue = active.reduce((sum, b) => sum + b.value, 0)
  const totalRevenue   = bookingRevenue + todayRevenue

  if (bLoading || cLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div
          className="animate-spin rounded-full h-8 w-8 border-2 border-transparent border-t-[#6b2cff]"
        />
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-xl font-bold text-[#f7f7ff] font-heading tracking-widest">
          DASHBOARD
        </h1>
        <p className="text-[#a8a8bd] text-sm mt-1 capitalize">
          {format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </p>
      </div>

      {/* Stats row 1 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <StatCard
          title="Agendamentos hoje"
          value={bookings.length}
          icon={<Calendar size={20} />}
          color="blue"
        />
        <StatCard
          title="Confirmados"
          value={confirmed.length}
          icon={<CheckCircle size={20} />}
          color="green"
        />
        <StatCard
          title="Pendentes"
          value={pending.length}
          icon={<Clock size={20} />}
          color="yellow"
        />
        <StatCard
          title="Receita prevista"
          value={fmt(totalRevenue)}
          icon={<DollarSign size={20} />}
          color="green"
          subtitle={`Quadras: ${fmt(bookingRevenue)} + Vendas: ${fmt(todayRevenue)}`}
        />
      </div>

      {/* Stats row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <StatCard
          title="Vendas de produtos hoje"
          value={todaySales.length}
          icon={<ShoppingCart size={20} />}
          color="purple"
          subtitle={fmt(todayRevenue)}
        />
        <StatCard
          title="Estoque baixo"
          value={lowStockProducts.length}
          icon={<AlertTriangle size={20} />}
          color={lowStockProducts.length > 0 ? 'red' : 'green'}
          subtitle={lowStockProducts.length > 0 ? 'Produtos precisam de reposição' : 'Tudo em ordem'}
        />
        <StatCard
          title="Quadras ativas"
          value={courts.filter(c => c.status === 'ativa').length}
          icon={<Flag size={20} />}
          color="blue"
          subtitle={`de ${courts.length} cadastradas`}
        />
      </div>

      {/* Agendamentos do dia */}
      <div
        className="rounded-lg border border-[rgba(255,255,255,0.09)] overflow-hidden"
        style={{ background: '#0d0d16' }}
      >
        <div
          className="flex items-center justify-between px-5 py-4 border-b border-[rgba(255,255,255,0.07)]"
        >
          <h2 className="font-heading text-xs font-semibold text-[#f7f7ff] tracking-widest">
            AGENDAMENTOS DE HOJE
          </h2>
          <Link
            href="/agenda"
            className="text-xs font-semibold tracking-wide text-[#6b2cff] hover:text-[#a855f7] transition-colors"
          >
            Ver todos →
          </Link>
        </div>

        {bookings.length === 0 ? (
          <div className="p-10 text-center">
            <Calendar size={32} className="mx-auto mb-3 text-[#a8a8bd] opacity-40" />
            <p className="text-[#a8a8bd] text-sm">Nenhum agendamento para hoje</p>
            <Link
              href="/agendamentos/novo"
              className="text-xs font-semibold gradient-text mt-3 block hover:opacity-80 transition-opacity"
            >
              + Criar agendamento
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-[rgba(255,255,255,0.05)]">
            {bookings.slice(0, 8).map(b => {
              const { variant, label } = statusBadge(b.status)
              return (
                <div
                  key={b.id}
                  className="flex items-center gap-4 px-5 py-3 hover:bg-white/2 transition-colors"
                >
                  <div className="text-xs font-mono text-[#a8a8bd] w-24 shrink-0">
                    {b.startTime} – {b.endTime}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#f7f7ff] truncate">{b.clientName}</p>
                    <p className="text-xs text-[#a8a8bd]">{b.courtName}</p>
                  </div>
                  <Badge variant={variant}>{label}</Badge>
                  <span className="text-sm font-semibold text-[#f7f7ff] w-20 text-right shrink-0">
                    {fmt(b.value)}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Alerta estoque baixo */}
      {lowStockProducts.length > 0 && (
        <div
          className="mt-4 rounded-lg p-4 border"
          style={{
            background: 'rgba(255,0,212,0.06)',
            borderColor: 'rgba(255,0,212,0.20)',
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={16} className="text-[#ff88d4]" />
            <h3 className="font-heading text-xs font-semibold text-[#ff88d4] tracking-widest">
              ESTOQUE BAIXO
            </h3>
          </div>
          <div className="space-y-1.5">
            {lowStockProducts.map(p => (
              <div key={p.id} className="flex justify-between text-sm">
                <span className="text-[#f7f7ff]">{p.name}</span>
                <span className="text-[#ff88d4] font-semibold">
                  {p.quantity} unid. (mín: {p.minStock})
                </span>
              </div>
            ))}
          </div>
          <Link
            href="/estoque"
            className="text-xs font-semibold text-[#ff88d4] hover:text-[#ff00d4] transition-colors mt-3 block"
          >
            Gerenciar estoque →
          </Link>
        </div>
      )}
    </div>
  )
}
