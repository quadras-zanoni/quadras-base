'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Booking, Sale, PAYMENT_METHODS } from '@/types'
import { StatCard } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Panel } from '@/components/dashboard/widgets'
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { DollarSign, Flag, ShoppingCart, TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react'

function fmt(val: number) {
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function monthKey(date: Date) {
  return format(date, 'yyyy-MM')
}

export default function RelatorioPage() {
  const { user } = useAuth()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [bookings, setBookings] = useState<Booking[]>([])
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)

  const monthStart = format(startOfMonth(currentMonth), 'yyyy-MM-dd')
  const monthEnd = format(endOfMonth(currentMonth), 'yyyy-MM-dd')
  const monthLabel = format(currentMonth, "MMMM 'de' yyyy", { locale: ptBR })

  useEffect(() => {
    if (!user) return
    setLoading(true)

    async function load() {
      const { data: bData } = await supabase
        .from('bookings')
        .select('*')
        .eq('owner_id', user!.id)
        .gte('date', monthStart)
        .lte('date', monthEnd)
      setBookings((bData || []).map(row => ({
        id: row.id,
        ownerId: row.owner_id,
        courtId: row.court_id,
        courtName: row.court_name,
        clientName: row.client_name,
        clientPhone: row.client_phone,
        date: row.date,
        startTime: row.start_time,
        endTime: row.end_time,
        value: row.value,
        status: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      } as Booking)))

      const { data: sData } = await supabase
        .from('sales')
        .select('*')
        .eq('owner_id', user!.id)
        .gte('created_at', monthStart + 'T00:00:00')
        .lte('created_at', monthEnd + 'T23:59:59')
      setSales((sData || []).map(row => ({
        id: row.id,
        ownerId: row.owner_id,
        items: row.items,
        total: row.total,
        paymentMethod: row.payment_method,
        notes: row.notes,
        createdAt: row.created_at,
      } as Sale)))

      setLoading(false)
    }
    load()
  }, [user, monthStart, monthEnd])

  function prevMonth() {
    setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))
  }
  function nextMonth() {
    const next = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
    if (next <= new Date()) setCurrentMonth(next)
  }

  const activeBookings = bookings.filter(b => b.status !== 'cancelado')
  const confirmedBookings = bookings.filter(b => b.status === 'confirmado')
  const cancelledBookings = bookings.filter(b => b.status === 'cancelado')

  const bookingRevenue = activeBookings.reduce((s, b) => s + b.value, 0)
  const salesRevenue = sales.reduce((s, v) => s + v.total, 0)
  const totalRevenue = bookingRevenue + salesRevenue

  // Receita por quadra
  const byCourt: Record<string, { name: string; count: number; revenue: number }> = {}
  for (const b of activeBookings) {
    if (!byCourt[b.courtId]) byCourt[b.courtId] = { name: b.courtName, count: 0, revenue: 0 }
    byCourt[b.courtId].count++
    byCourt[b.courtId].revenue += b.value
  }

  // Vendas por forma de pagamento
  const byPayment: Record<string, number> = {}
  for (const s of sales) {
    const pm = s.paymentMethod || 'outro'
    byPayment[pm] = (byPayment[pm] || 0) + s.total
  }

  // Receita por dia (últimos dias do mês)
  const dailyRevenue: Record<string, number> = {}
  for (const b of activeBookings) {
    dailyRevenue[b.date] = (dailyRevenue[b.date] || 0) + b.value
  }
  for (const s of sales) {
    if (!s.createdAt) continue
    const key = format(new Date(s.createdAt), 'yyyy-MM-dd')
    dailyRevenue[key] = (dailyRevenue[key] || 0) + s.total
  }

  const isNextDisabled = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1) > new Date()

  return (
    <div className="space-y-5">
      {/* Header com navegação de mês */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Relatório Financeiro</h1>
          <p className="text-sm text-muted mt-0.5 capitalize">{monthLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={prevMonth}
            className="w-9 h-9 flex items-center justify-center rounded-[var(--radius-ctl)] border border-line bg-surface text-muted hover:bg-surface-2 hover:text-ink transition-colors"
          >
            <ChevronLeft size={17} />
          </button>
          <button
            onClick={nextMonth}
            disabled={isNextDisabled}
            className="w-9 h-9 flex items-center justify-center rounded-[var(--radius-ctl)] border border-line bg-surface text-muted hover:bg-surface-2 hover:text-ink transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight size={17} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-line border-t-brand" />
        </div>
      ) : (
        <div className="space-y-5">
          {/* Cards de resumo */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Receita total"
              value={fmt(totalRevenue)}
              icon={<TrendingUp size={20} />}
              color="green"
              subtitle="Quadras + Produtos"
            />
            <StatCard
              title="Receita de quadras"
              value={fmt(bookingRevenue)}
              icon={<Flag size={20} />}
              color="blue"
              subtitle={`${activeBookings.length} agendamentos`}
            />
            <StatCard
              title="Receita de produtos"
              value={fmt(salesRevenue)}
              icon={<ShoppingCart size={20} />}
              color="purple"
              subtitle={`${sales.length} vendas`}
            />
            <StatCard
              title="Cancelamentos"
              value={cancelledBookings.length}
              icon={<DollarSign size={20} />}
              color="red"
              subtitle={`de ${bookings.length} agendamentos`}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Receita por quadra */}
            <Panel title="Receita por quadra">
              {Object.keys(byCourt).length === 0 ? (
                <p className="text-sm text-muted py-6 text-center">Sem agendamentos neste mês</p>
              ) : (
                <div className="space-y-3">
                  {Object.values(byCourt)
                    .sort((a, b) => b.revenue - a.revenue)
                    .map(court => (
                      <div key={court.name} className="flex items-center gap-3">
                        <div className="flex-1">
                          <div className="flex justify-between text-sm mb-1.5">
                            <span className="font-medium text-ink">{court.name}</span>
                            <span className="font-bold text-ink">{fmt(court.revenue)}</span>
                          </div>
                          <div className="h-1.5 bg-surface-2 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-success rounded-full"
                              style={{ width: `${Math.min((court.revenue / bookingRevenue) * 100, 100)}%` }}
                            />
                          </div>
                          <p className="text-xs text-muted mt-1">
                            {court.count} agendamento{court.count !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </Panel>

            {/* Vendas por forma de pagamento */}
            <Panel title="Vendas por forma de pagamento">
              {Object.keys(byPayment).length === 0 ? (
                <p className="text-sm text-muted py-6 text-center">Sem vendas neste mês</p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(byPayment)
                    .sort((a, b) => b[1] - a[1])
                    .map(([pm, value]) => (
                      <div key={pm} className="flex items-center justify-between py-1">
                        <span className="text-sm text-muted">
                          {PAYMENT_METHODS[pm as keyof typeof PAYMENT_METHODS] ?? pm}
                        </span>
                        <span className="font-semibold text-ink">{fmt(value)}</span>
                      </div>
                    ))}
                  <div className="border-t border-line pt-3 flex justify-between">
                    <span className="text-sm font-medium text-muted">Total vendas</span>
                    <span className="font-bold text-brand">{fmt(salesRevenue)}</span>
                  </div>
                </div>
              )}
            </Panel>
          </div>

          {/* Receita diária */}
          {Object.keys(dailyRevenue).length > 0 && (
            <Panel title="Receita diária">
              <div className="divide-y divide-line max-h-64 overflow-y-auto -mx-5 px-5">
                {Object.entries(dailyRevenue)
                  .sort((a, b) => b[0].localeCompare(a[0]))
                  .map(([date, value]) => (
                    <div key={date} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                      <span className="text-sm text-muted capitalize">
                        {format(parseISO(date), "EEEE, dd/MM", { locale: ptBR })}
                      </span>
                      <span className="font-semibold text-ink">{fmt(value)}</span>
                    </div>
                  ))}
              </div>
            </Panel>
          )}

          {/* Lista de agendamentos do mês */}
          <div className="bg-surface border border-line rounded-[var(--radius-card)] shadow-card overflow-hidden">
            <div className="px-5 pt-5 pb-3 border-b border-line">
              <h2 className="text-base font-semibold text-ink">Todos os agendamentos do mês</h2>
              <p className="text-xs text-muted mt-0.5">
                {bookings.length} no total · {confirmedBookings.length} confirmados · {cancelledBookings.length} cancelados
              </p>
            </div>
            {bookings.length === 0 ? (
              <p className="text-center text-muted text-sm py-10">Nenhum agendamento neste mês</p>
            ) : (
              <div className="divide-y divide-line max-h-80 overflow-y-auto">
                {bookings
                  .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime))
                  .map(b => {
                    const statusColor = b.status === 'confirmado' ? 'green' : b.status === 'pendente' ? 'yellow' : 'red'
                    const statusLabel = b.status === 'confirmado' ? 'Confirmado' : b.status === 'pendente' ? 'Pendente' : 'Cancelado'
                    return (
                      <div key={b.id} className="flex items-center gap-3 px-5 py-3 hover:bg-surface-2/40 transition-colors">
                        <div className="w-24 shrink-0 text-xs font-mono text-muted">
                          {format(parseISO(b.date), 'dd/MM')} {b.startTime}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-ink truncate">{b.clientName}</p>
                          <p className="text-xs text-muted">{b.courtName}</p>
                        </div>
                        <Badge variant={statusColor as 'green' | 'yellow' | 'red'}>{statusLabel}</Badge>
                        <span className={`text-sm font-semibold w-20 text-right tabular-nums ${b.status === 'cancelado' ? 'text-subtle line-through' : 'text-ink'}`}>
                          {fmt(b.value)}
                        </span>
                      </div>
                    )
                  })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
