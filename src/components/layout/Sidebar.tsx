'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { usePendingCount } from '@/hooks/usePendingCount'
import {
  LayoutDashboard, Calendar, CalendarPlus, Flag, Users,
  Package, ArrowLeftRight, ShoppingCart, LogOut, Menu, X,
  Link2, BarChart2,
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
        'relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all tracking-wide',
        active
          ? 'nav-active'
          : 'text-[#a8a8bd] hover:bg-white/4 hover:text-[#f7f7ff]'
      )}
    >
      <Icon size={17} className="shrink-0" />
      <span className="flex-1">{label}</span>
      {badge != null && badge > 0 && (
        <span
          className="text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center text-white"
          style={{ background: 'linear-gradient(90deg,#ff00d4,#6b2cff)' }}
        >
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </Link>
  )
}

function SidebarContent({ onLinkClick }: { onLinkClick?: () => void }) {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const pendingCount = usePendingCount()

  const isActive = (href: string) =>
    pathname === href || (href !== '/dashboard' && pathname.startsWith(href))

  return (
    <>
      {/* Brand */}
      <div className="px-4 mb-7">
        <div className="flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: 'linear-gradient(135deg,#ff00d4,#6b2cff,#00d9ff)' }}
          >
            <Flag size={17} className="text-white" />
          </div>
          <div>
            <span className="font-heading font-bold text-[#f7f7ff] text-sm tracking-widest gradient-text">
              QUADRAS
            </span>
            <p className="text-[10px] text-[#a8a8bd] -mt-0.5 truncate max-w-[140px]">
              {user?.email}
            </p>
          </div>
        </div>
        {/* Gradient divider */}
        <div
          className="mt-5 h-px"
          style={{ background: 'linear-gradient(90deg,#ff00d4,#6b2cff,#00d9ff,transparent)' }}
        />
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

      {/* Logout */}
      <div className="px-2 pt-4 mt-4 border-t border-[rgba(255,255,255,0.06)]">
        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[#a8a8bd] hover:text-[#ff88d4] hover:bg-[#ff00d4]/6 transition-all w-full tracking-wide"
        >
          <LogOut size={17} />
          <span>Sair</span>
        </button>
      </div>
    </>
  )
}

export function Sidebar() {
  const pendingCount = usePendingCount()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className="hidden lg:flex flex-col w-64 min-h-screen py-6"
        style={{
          background: '#0d0d16',
          borderRight: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <SidebarContent />
      </aside>

      {/* Mobile top bar */}
      <header
        className="lg:hidden fixed top-0 inset-x-0 z-40 flex items-center justify-between px-4 py-3"
        style={{
          background: '#0d0d16',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#ff00d4,#6b2cff,#00d9ff)' }}
          >
            <Flag size={14} className="text-white" />
          </div>
          <span className="font-heading font-bold text-xs tracking-widest gradient-text">QUADRAS</span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-lg text-[#a8a8bd] hover:bg-white/5 hover:text-[#f7f7ff] relative transition-colors"
        >
          {pendingCount > 0 && !mobileOpen && (
            <span className="absolute -top-1 -right-1 w-4 h-4 text-white text-[10px] rounded-full flex items-center justify-center font-bold"
              style={{ background: 'linear-gradient(90deg,#ff00d4,#6b2cff)' }}>
              {pendingCount > 9 ? '9+' : pendingCount}
            </span>
          )}
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside
            className="relative w-72 h-full flex flex-col py-6 overflow-y-auto"
            style={{ background: '#0d0d16', borderRight: '1px solid rgba(255,255,255,0.06)' }}
          >
            <SidebarContent onLinkClick={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}
    </>
  )
}
