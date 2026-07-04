'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { usePendingCount } from '@/hooks/usePendingCount'
import {
  LayoutDashboard, Calendar, CalendarPlus, Flag, Users,
  Package, ArrowLeftRight, ShoppingCart, LogOut, Menu, X,
  Link2, BarChart2, Receipt,
} from 'lucide-react'
import { useState } from 'react'
import { clsx } from 'clsx'

const navItems = [
  { href: '/dashboard',         label: 'Dashboard',        icon: LayoutDashboard },
  { href: '/agenda',            label: 'Agenda do Dia',    icon: Calendar },
  { href: '/agendamentos/novo', label: 'Novo Agendamento', icon: CalendarPlus },
  { href: '/quadras',           label: 'Quadras',          icon: Flag },
  { href: '/clientes',          label: 'Clientes',         icon: Users },
  { href: '/estoque',           label: 'Estoque',          icon: Package },
  { href: '/movimentacoes',     label: 'Movimentações',    icon: ArrowLeftRight },
  { href: '/comandas',          label: 'Comandas',         icon: Receipt },
  { href: '/vendas',            label: 'Vendas',           icon: ShoppingCart },
  { href: '/relatorio',         label: 'Relatório',        icon: BarChart2 },
  { href: '/link-cliente',      label: 'Link do Cliente',  icon: Link2 },
]

function NavLink({
  href, label, icon: Icon, active, badge,
}: {
  href: string; label: string; icon: typeof LayoutDashboard
  active: boolean; badge?: number
}) {
  return (
    <Link
      href={href}
      className={clsx(
        'relative flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-ctl)] text-sm transition-colors',
        active
          ? 'bg-brand-weak text-brand font-semibold'
          : 'text-muted font-medium hover:bg-surface-2 hover:text-ink'
      )}
    >
      <Icon size={18} className="shrink-0" />
      <span className="flex-1">{label}</span>
      {badge != null && badge > 0 && (
        <span className="text-[11px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center text-white bg-violet">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </Link>
  )
}

function UserFooter() {
  const { user, logout } = useAuth()
  const initials = (user?.email?.slice(0, 2) || 'AD').toUpperCase()
  return (
    <div className="px-2 pt-4 mt-2 border-t border-line space-y-1">
      <div className="flex items-center gap-2.5 px-2 py-2">
        <div className="w-9 h-9 rounded-full bg-brand-weak text-brand flex items-center justify-center text-xs font-bold shrink-0">
          {initials}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink leading-tight">Administrador</p>
          <p className="text-[11px] text-subtle truncate max-w-[150px]">{user?.email}</p>
        </div>
      </div>
      <button
        onClick={logout}
        className="flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-ctl)] text-sm font-medium text-muted hover:text-danger hover:bg-danger/5 transition-colors w-full"
      >
        <LogOut size={18} />
        <span>Sair</span>
      </button>
    </div>
  )
}

function SidebarContent({ onLinkClick }: { onLinkClick?: () => void }) {
  const pathname = usePathname()
  const pendingCount = usePendingCount()

  const isActive = (href: string) =>
    pathname === href || (href !== '/dashboard' && pathname.startsWith(href))

  return (
    <>
      {/* Brand */}
      <div className="px-4 mb-6 flex justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-arena-branca.png" alt="Arena do Parque" className="h-20 w-auto" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 flex flex-col gap-0.5" onClick={onLinkClick}>
        {navItems.map(item => (
          <NavLink
            key={item.href}
            {...item}
            active={isActive(item.href)}
            badge={item.href === '/agenda' ? pendingCount || undefined : undefined}
          />
        ))}
      </nav>

      <UserFooter />
    </>
  )
}

export function Sidebar() {
  const pendingCount = usePendingCount()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 min-h-screen py-6 bg-surface border-r border-line">
        <SidebarContent />
      </aside>

      {/* Mobile top bar */}
      <header className="lg:hidden fixed top-0 inset-x-0 z-40 flex items-center justify-between px-4 py-3 bg-surface border-b border-line">
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-arena-branca.png" alt="Arena do Parque" className="h-7 w-7 object-contain shrink-0" />
          <span className="font-bold text-ink text-sm tracking-tight">ARENA DO PARQUE</span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-[var(--radius-ctl)] text-muted hover:bg-surface-2 hover:text-ink relative transition-colors"
        >
          {pendingCount > 0 && !mobileOpen && (
            <span className="absolute -top-1 -right-1 w-4 h-4 text-white text-[10px] rounded-full flex items-center justify-center font-bold bg-violet">
              {pendingCount > 9 ? '9+' : pendingCount}
            </span>
          )}
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-72 h-full flex flex-col py-6 overflow-y-auto bg-surface border-r border-line">
            <SidebarContent onLinkClick={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}
    </>
  )
}
