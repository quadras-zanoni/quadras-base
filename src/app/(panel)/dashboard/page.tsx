'use client'

import { useBookings } from '@/hooks/useBookings'
import { useCourts } from '@/hooks/useCourts'
import { useProducts } from '@/hooks/useProducts'
import { useSales } from '@/hooks/useSales'
import { useClients } from '@/hooks/useClients'
import { StatCard } from '@/components/ui/Card'
import { Badge, statusBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Panel, Donut, MiniCourt, ProgressBar, ComingSoon } from '@/components/dashboard/widgets'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Calendar, CheckCircle2, Clock, DollarSign, Flag, Filter, Plus, Bell, Package,
} from 'lucide-react'
import Link from 'next/link'

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const hhmm = (t: string) => { const [h, m] = t.split(':').map(Number); return h + (m || 0) / 60 }

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

export default function DashboardPage() {
  const now = new Date()
  const today = format(now, 'yyyy-MM-dd')
  const tomorrow = format(new Date(now.getTime() + 864e5), 'yyyy-MM-dd')
  const nowT = format(now, 'HH:mm')

  const { bookings, loading: bLoading } = useBookings()
  const { courts, loading: cLoading } = useCourts()
  const { lowStockProducts } = useProducts()
  const { todayRevenue } = useSales()
  const { clients } = useClients()

  const todayBookings = bookings.filter(b => b.date === today)
  const active = todayBookings.filter(b => b.status !== 'cancelado')
  const confirmed = todayBookings.filter(b => b.status === 'confirmado')
  const pending = todayBookings.filter(b => b.status === 'pendente')
  const pct = (n: number) => (active.length ? Math.round((n / active.length) * 100) : 0)

  const bookingRevenue = active.reduce((s, b) => s + b.value, 0)
  const totalRevenue = bookingRevenue + todayRevenue

  const activeCourts = courts.filter(c => c.status === 'ativa')
  const availHours = activeCourts.reduce((s, c) => s + Math.max(0, hhmm(c.closeTime) - hhmm(c.openTime)), 0)
  const bookedHours = active.reduce((s, b) => s + Math.max(0, hhmm(b.endTime) - hhmm(b.startTime)), 0)
  const occupancy = availHours > 0 ? Math.round((bookedHours / availHours) * 100) : 0

  const upcoming = bookings
    .filter(b => b.status !== 'cancelado')
    .filter(b => b.date > today || (b.date === today && b.endTime >= nowT))
    .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime))
    .slice(0, 5)

  const dayLabel = (d: string) => (d === today ? 'Hoje' : d === tomorrow ? 'Amanhã' : format(new Date(d + 'T12:00:00'), 'dd/MM'))

  function courtView(courtId: string) {
    const list = todayBookings.filter(b => b.courtId === courtId && b.status !== 'cancelado')
    const playing = list.find(b => b.startTime <= nowT && b.endTime > nowT)
    if (playing) return { state: 'jogo' as const, info: `Até ${playing.endTime}`, who: playing.clientName }
    const next = list.filter(b => b.startTime > nowT).sort((a, b) => a.startTime.localeCompare(b.startTime))[0]
    if (next && next.status === 'pendente') return { state: 'pendente' as const, info: `Próximo: ${next.startTime}`, who: 'Aguardando confirmação' }
    if (next) return { state: 'livre' as const, info: `Próximo: ${next.startTime}`, who: next.clientName }
    return { state: 'livre' as const, info: 'Disponível o dia todo', who: '' }
  }

  if (bLoading || cLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-line border-t-brand" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">
            {greeting()}, Administrador! <span className="font-normal">👋</span>
          </h1>
          <p className="text-sm text-muted mt-0.5 capitalize">
            {format(now, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button variant="secondary" size="md"><Filter size={16} /> Filtros</Button>
          <Link href="/agendamentos/novo">
            <Button variant="primary" size="md"><Plus size={16} /> Novo agendamento</Button>
          </Link>
          <button className="relative w-10 h-10 rounded-[var(--radius-ctl)] border border-line bg-surface text-muted hover:text-ink flex items-center justify-center transition-colors">
            <Bell size={18} />
            {pending.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4.5 h-4.5 min-w-[18px] h-[18px] text-[10px] font-bold rounded-full bg-violet text-white flex items-center justify-center">
                {pending.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard title="Agendamentos hoje" value={todayBookings.length} icon={<Calendar size={20} />} color="blue" subtitle="no total de hoje" />
        <StatCard title="Confirmados" value={confirmed.length} icon={<CheckCircle2 size={20} />} color="green" subtitle={`${pct(confirmed.length)}% do total`} />
        <StatCard title="Pendentes" value={pending.length} icon={<Clock size={20} />} color="yellow" subtitle={`${pct(pending.length)}% do total`} />
        <StatCard title="Receita do dia" value={fmt(totalRevenue)} icon={<DollarSign size={20} />} color="teal" subtitle={`Quadras ${fmt(bookingRevenue)} + Vendas ${fmt(todayRevenue)}`} />
        {/* Ocupação (card custom com donut) */}
        <div className="bg-surface border border-line rounded-[var(--radius-card)] shadow-card p-5 flex items-center justify-between gap-2">
          <div>
            <p className="text-[13px] font-medium text-muted">Taxa de ocupação</p>
            <p className="text-2xl font-bold text-ink leading-tight mt-0.5">{occupancy}%</p>
            <p className="text-xs text-muted mt-1">Hoje</p>
          </div>
          <Donut value={occupancy} size={56}>
            <span className="text-[11px] font-bold text-ink">{occupancy}%</span>
          </Donut>
        </div>
        <StatCard title="Quadras ativas" value={`${activeCourts.length}/${courts.length}`} icon={<Flag size={20} />} color="purple" subtitle={courts.length ? '100% operacionais' : 'nenhuma cadastrada'} />
      </div>

      {/* Linha 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Agenda de hoje */}
        <Panel title="Agenda de Hoje" action="Ver todos" actionHref="/agenda">
          {active.length === 0 ? (
            <p className="text-sm text-muted py-8 text-center">Nenhum agendamento para hoje.</p>
          ) : (
            <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
              {[...active].sort((a, b) => a.startTime.localeCompare(b.startTime)).map(b => {
                const sb = statusBadge(b.status)
                const tone = b.status === 'confirmado' ? '#10b981' : b.status === 'pendente' ? '#f59e0b' : '#94a3b8'
                return (
                  <div key={b.id} className="flex items-stretch gap-3">
                    <div className="text-xs font-mono text-muted w-20 shrink-0 pt-2.5">{b.startTime}–{b.endTime}</div>
                    <div className="flex-1 rounded-[var(--radius-ctl)] bg-surface-2/60 border-l-[3px] px-3 py-2.5 flex items-center justify-between gap-2" style={{ borderColor: tone }}>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-ink truncate">{b.clientName}</p>
                        <p className="text-xs text-muted truncate">{b.courtName}</p>
                      </div>
                      <Badge variant={sb.variant}>{sb.label}</Badge>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Panel>

        {/* Status das quadras */}
        <Panel title="Status das Quadras" action="Gerenciar" actionHref="/quadras">
          {activeCourts.length === 0 ? (
            <p className="text-sm text-muted py-8 text-center">Nenhuma quadra ativa.</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                {activeCourts.slice(0, 4).map(c => {
                  const v = courtView(c.id)
                  const sb = v.state === 'jogo' ? 'green' : v.state === 'pendente' ? 'yellow' : 'green'
                  const label = v.state === 'jogo' ? 'Em jogo' : v.state === 'pendente' ? 'Pendente' : 'Livre'
                  return (
                    <div key={c.id} className="rounded-[var(--radius-ctl)] border border-line p-3">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-sm font-semibold text-ink truncate">{c.name}</span>
                        <Badge variant={sb as 'green' | 'yellow'}>{label}</Badge>
                      </div>
                      <p className="text-xs text-muted mb-2">{v.info}</p>
                      <MiniCourt state={v.state} />
                      {v.who && <p className="text-xs text-muted mt-2 truncate">{v.who}</p>}
                    </div>
                  )
                })}
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-4 text-xs text-muted">
                <Legend color="#14b8a6" label="Livre" />
                <Legend color="#10b981" label="Em jogo" />
                <Legend color="#f59e0b" label="Pendente" />
                <Legend color="#8b5cf6" label="Manutenção" />
              </div>
            </>
          )}
        </Panel>

        {/* Próximos agendamentos */}
        <Panel title="Próximos agendamentos" action="Ver todos" actionHref="/agenda">
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted py-8 text-center">Sem agendamentos futuros.</p>
          ) : (
            <div className="divide-y divide-line">
              {upcoming.map(b => {
                const sb = statusBadge(b.status)
                return (
                  <div key={b.id} className="flex items-center gap-3 py-2.5 first:pt-0">
                    <div className="w-14 shrink-0">
                      <p className="text-sm font-bold text-ink">{b.startTime}</p>
                      <p className="text-[11px] text-subtle">{dayLabel(b.date)}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-ink truncate">{b.clientName}</p>
                      <p className="text-xs text-muted truncate">{b.courtName}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <Badge variant={sb.variant}>{sb.label}</Badge>
                      <p className="text-sm font-semibold text-ink mt-1">{fmt(b.value)}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Panel>
      </div>

      {/* Linha 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Resumo financeiro */}
        <Panel title="Resumo financeiro">
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div>
              <p className="text-xs text-muted">Receita</p>
              <p className="text-lg font-bold text-ink">{fmt(totalRevenue)}</p>
              <p className="text-xs text-success font-medium">hoje</p>
            </div>
            <div>
              <p className="text-xs text-muted">Despesas</p>
              <p className="text-lg font-bold text-subtle">—</p>
            </div>
            <div>
              <p className="text-xs text-muted">Lucro</p>
              <p className="text-lg font-bold text-subtle">—</p>
            </div>
          </div>
          <ComingSoon label="Despesas e histórico em breve" hint="O controle de despesas e o gráfico de faturamento entram numa próxima etapa." />
        </Panel>

        {/* Clientes e planos */}
        <Panel title="Clientes e planos" action="Ver todos" actionHref="/clientes">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <p className="text-3xl font-bold text-ink">{clients.length}</p>
              <p className="text-sm text-muted">Clientes cadastrados</p>
            </div>
            <div className="flex -space-x-2">
              {clients.slice(0, 5).map(c => (
                <div key={c.id} className="w-8 h-8 rounded-full bg-brand-weak text-brand text-xs font-bold flex items-center justify-center border-2 border-surface">
                  {c.name.slice(0, 1).toUpperCase()}
                </div>
              ))}
              {clients.length > 5 && (
                <div className="w-8 h-8 rounded-full bg-surface-2 text-muted text-[10px] font-bold flex items-center justify-center border-2 border-surface">
                  +{clients.length - 5}
                </div>
              )}
            </div>
          </div>
          <ComingSoon label="Planos (mensal/avulso) em breve" hint="Mensalidades e planos de cliente entram numa próxima etapa." />
        </Panel>

        {/* Estoque baixo */}
        <Panel title="Estoque baixo" action="Ver estoque" actionHref="/estoque">
          {lowStockProducts.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-muted py-6 justify-center">
              <Package size={16} /> Estoque em ordem.
            </div>
          ) : (
            <div className="space-y-3">
              {lowStockProducts.map(p => (
                <div key={p.id} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-[var(--radius-ctl)] bg-surface-2 flex items-center justify-center shrink-0">
                    <Package size={15} className="text-muted" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink truncate">{p.name}</p>
                    <ProgressBar value={p.quantity} max={p.minStock} />
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-ink">{p.quantity} unid.</p>
                    <span className="text-[11px] font-semibold text-danger">Mín. {p.minStock}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </div>
  )
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  )
}
