import { NavLink, Outlet, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Home, Milk, Users, Receipt, HeartPulse, LogOut, LayoutDashboard } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { LangToggle, SyncStatus } from '@/components/Status'
import { fmtDate } from '@/lib/format'
import { todayIST } from '@/lib/format'

export default function ManagerLayout() {
  const { t } = useTranslation()
  const { settings, signOut, isAdmin } = useAuth()
  const items = [
    { to: '/m', icon: Home, label: t('nav.home'), end: true },
    { to: '/m/milk', icon: Milk, label: t('nav.milk') },
    { to: '/m/customers', icon: Users, label: t('nav.customers') },
    { to: '/m/expenses', icon: Receipt, label: t('nav.expenses') },
    { to: '/m/health', icon: HeartPulse, label: t('nav.health') },
  ]
  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col bg-gray-50">
      <header className="sticky top-0 z-30 flex items-center gap-2 bg-brand-700 px-3 py-2 text-white">
        <img src={settings?.logo_url || '/favicon.svg'} className="h-10 w-10 shrink-0 rounded-xl bg-white object-contain" alt="" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-lg font-extrabold">{settings?.farm_name || t('app')}</div>
          <div className="text-xs opacity-90">{fmtDate(todayIST())}</div>
        </div>
        <SyncStatus light />
        <LangToggle light />
        {isAdmin && <Link to="/admin" className="grid h-10 w-10 place-items-center rounded-full bg-white/20"><LayoutDashboard className="h-5 w-5" /></Link>}
        <button onClick={signOut} className="grid h-10 w-10 place-items-center rounded-full bg-white/20" aria-label={t('logout')}><LogOut className="h-5 w-5" /></button>
      </header>
      <main className="flex-1 p-3 pb-28"><Outlet /></main>
      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 mx-auto grid max-w-xl grid-cols-5 border-t-2 border-brand-700 bg-white">
        {items.map((i) => (
          <NavLink
            key={i.to}
            to={i.to}
            end={i.end}
            className={({ isActive }) =>
              `flex h-[68px] flex-col items-center justify-center gap-0.5 text-xs font-bold ${isActive ? 'bg-brand-100 text-brand-900' : 'text-gray-600'}`
            }
          >
            <i.icon className="h-7 w-7" />
            {i.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
