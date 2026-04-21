import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { ShellProvider, useShellTab } from '../../contexts/ShellContext'
import { Avatar, Badge, Logo } from '../ui'
import * as I from '../icons'
import { cls } from '../../lib/utils'

/* Nav items per role — IDs must match tab IDs used in each dashboard.
 * Optional `href` field: navigates to a route instead of switching tabs.
 * Items with `href` are rendered as <Link> in the bottom nav. */
const ROLE_NAVS = {
  kasir: [
    { id: 'scan',     label: 'Scan QR',      icon: <I.Scan     size={18} /> },
    { id: 'visitors', label: 'Pengunjung',   icon: <I.Users    size={18} /> },
    { id: 'register', label: 'Daftar Member',icon: <I.UserPlus size={18} />, href: '/kasir/register-member' },
  ],
  member: [
    { id: 'qr', label: 'QR Saya', icon: <I.Qr size={18} /> },
  ],
  admin: [
    { id: 'overview', label: 'Overview', icon: <I.Home  size={18} /> },
    { id: 'users',    label: 'Users',    icon: <I.Users size={18} /> },
  ],
  trainer: [
    { id: 'home',    label: 'Home',    icon: <I.Home      size={18} /> },
    { id: 'members', label: 'Members', icon: <I.Users     size={18} /> },
    { id: 'sched',   label: 'Schedule',icon: <I.Calendar  size={18} /> },
  ],
}

const ROLE_LABEL = { kasir: 'Kasir', member: 'Member', admin: 'Admin', trainer: 'Trainer' }

function ShellInner({ children }) {
  const { user, logout }            = useAuth()
  const { activeTab, setActiveTab } = useShellTab()
  const navigate                    = useNavigate()
  const location                    = useLocation()
  const [mobileMenu,    setMobileMenu]    = useState(false)
  const [confirmLogout, setConfirmLogout] = useState(false)

  const nav       = user ? (ROLE_NAVS[user.role] ?? []) : []
  const roleName  = ROLE_LABEL[user?.role] ?? ''
  const firstName = user?.name?.split(' ')[0] ?? ''

  /* Set first tab on mount / role change */
  useEffect(() => {
    if (nav.length > 0) setActiveTab(nav[0].id)
  }, [user?.role]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  function openLogoutConfirm() {
    setMobileMenu(false)
    setConfirmLogout(true)
  }

  const NavItem = ({ n, onClick, size = 'sm' }) => (
    <button
      key={n.id}
      onClick={() => { setActiveTab(n.id); onClick?.() }}
      className={cls(
        'w-full flex items-center gap-3 rounded-md font-semibold transition',
        size === 'sm' ? 'h-10 px-3 text-[13px]' : 'h-11 px-3 text-[14px]',
        activeTab === n.id
          ? 'bg-pop text-ink'
          : 'text-white/70 hover:text-white hover:bg-white/5',
      )}
    >
      {n.icon}{n.label}
    </button>
  )

  return (
    <div className="min-h-screen bg-bone flex">

      {/* ── Desktop sidebar ── */}
      <aside className="hidden lg:flex flex-col w-[220px] xl:w-[240px] bg-ink on-dark text-white shrink-0 sticky top-0 h-screen">
        <div className="p-5 hairline-b">
          <Logo size={30} on="dark" />
        </div>

        <div className="px-3 py-4 flex-1 overflow-y-auto">
          <div className="micro text-white/40 px-3 mb-2">{roleName.toUpperCase()} MENU</div>
          <nav className="space-y-1">
            {nav.map(n => <NavItem key={n.id} n={n} />)}
          </nav>
        </div>

        {/* User profile + logout */}
        <div className="p-3 hairline-t">
          <div className="flex items-center gap-3 p-2">
            <Avatar name={user?.name ?? '?'} size={36} accent />
            <div className="flex-1 min-w-0">
              <div className="font-bold text-[13px] truncate">{user?.name}</div>
              <div className="mono text-[10px] text-white/50 truncate">
                {roleName} · {user?.branch?.name ?? 'FORGE'}
              </div>
            </div>
            <button
              onClick={openLogoutConfirm}
              title="Logout"
              className="w-8 h-8 rounded-md hover:bg-white/10 flex items-center justify-center"
            >
              <I.Logout size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main column ── */}
      <div className="flex-1 min-w-0 flex flex-col">

        {/* Topbar */}
        <header className="sticky top-0 z-30 bg-bone/90 backdrop-blur hairline-b">
          <div className="flex items-center justify-between px-4 md:px-6 h-14 lg:h-16 gap-3">

            {/* Left — hamburger + logo (mobile) | breadcrumb (desktop) */}
            <div className="flex items-center gap-3 lg:hidden">
              <button
                onClick={() => setMobileMenu(true)}
                className="w-9 h-9 rounded-md hairline bg-white flex items-center justify-center"
              >
                <I.Menu size={18} />
              </button>
              <Logo size={24} />
            </div>
            <div className="hidden lg:flex items-center gap-3">
              <span className="text-lg font-black tracking-tight">{roleName} dashboard</span>
              <Badge tone="outline">FORGE GYM</Badge>
            </div>

            {/* Right — user avatar */}
            <div className="flex items-center gap-2">
              <button className="hidden md:flex items-center gap-2 h-9 px-2 pr-3 rounded-md hairline bg-white cursor-pointer">
                <Avatar name={user?.name ?? '?'} size={24} />
                <span className="text-[12px] font-semibold">{firstName}</span>
                <I.ChevronDown size={14} className="text-ink-4" />
              </button>
              {/* Mobile logout quick-access */}
              <button
                onClick={openLogoutConfirm}
                className="md:hidden w-9 h-9 rounded-md hairline bg-white flex items-center justify-center"
                title="Logout"
              >
                <I.Logout size={16} />
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1">
          {children}
        </main>
      </div>

      {/* ── Mobile bottom nav (shown only if role has >1 item) ── */}
      {nav.length > 1 && (
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white hairline-t safe-area-pb">
          <div className="grid" style={{ gridTemplateColumns: `repeat(${nav.length}, 1fr)` }}>
            {nav.map(n => {
              /*
               * Nav item dengan `href` → Link ke route berbeda (misal: /kasir/register-member).
               * Active state: cek pathname, bukan activeTab.
               * Nav item tanpa `href` → tombol biasa yang switch tab dalam halaman.
               */
              /*
               * Non-href items hanya aktif jika:
               *   1. Kita sedang di halaman dashboard base (mis. /kasir, bukan /kasir/register-member)
               *   2. AND activeTab cocok dengan id item ini
               * Tanpa kondisi (1), saat pindah ke sub-route, tab sebelumnya tetap terlihat aktif
               * bersamaan dengan href item → double indicator.
               */
              const basePath = `/${user?.role}`
              const isActive = n.href
                ? location.pathname === n.href
                : location.pathname === basePath && activeTab === n.id

              const activeBar = isActive && (
                <span className="absolute top-0 left-6 right-6 h-0.5 bg-pop" />
              )
              const itemCls = cls(
                'h-16 flex flex-col items-center justify-center gap-0.5 relative',
                isActive ? 'text-ink' : 'text-ink-4',
              )

              if (n.href) {
                return (
                  <Link key={n.id} to={n.href} className={itemCls}>
                    {activeBar}
                    {n.icon}
                    <span className="text-[10px] font-semibold">{n.label}</span>
                  </Link>
                )
              }

              return (
                <button
                  key={n.id}
                  onClick={() => {
                    setActiveTab(n.id)
                    /*
                     * Jika user sedang di sub-route (misal /kasir/register-member),
                     * navigate kembali ke halaman utama role (/kasir, /member, dll)
                     * supaya tab-switch benar-benar mengubah tampilan.
                     */
                    const base = `/${user?.role}`
                    if (location.pathname !== base) navigate(base)
                  }}
                  className={itemCls}
                >
                  {activeBar}
                  {n.icon}
                  <span className="text-[10px] font-semibold">{n.label}</span>
                </button>
              )
            })}
          </div>
        </nav>
      )}

      {/* ── Confirm logout dialog ── */}
      {confirmLogout && (
        <div
          className="fixed inset-0 z-[60] bg-ink/60 backdrop-blur-sm flex items-center justify-center p-6"
          onClick={() => setConfirmLogout(false)}
        >
          <div
            className="bg-white rounded-xl w-full max-w-sm p-6 shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-full bg-bad/10 flex items-center justify-center shrink-0">
                <I.Logout size={18} className="text-bad" />
              </div>
              <div className="text-lg font-black">Yakin ingin keluar?</div>
            </div>
            <p className="text-sm text-ink-4 mb-5 pl-[52px]">
              Session aktif akan dihapus dan kamu harus login ulang.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmLogout(false)}
                className="flex-1 h-10 rounded-lg hairline text-sm font-semibold hover:bg-bone-2 transition"
              >
                Batal
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 h-10 rounded-lg bg-ink text-white text-sm font-semibold hover:bg-ink-2 transition"
              >
                Ya, Keluar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Mobile drawer ── */}
      {mobileMenu && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-ink/60"
          onClick={() => setMobileMenu(false)}
        >
          <aside
            className="absolute left-0 top-0 bottom-0 w-[280px] bg-ink on-dark text-white flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-5 hairline-b flex items-center justify-between">
              <Logo size={28} on="dark" />
              <button onClick={() => setMobileMenu(false)} className="w-8 h-8 flex items-center justify-center">
                <I.X size={18} />
              </button>
            </div>
            <div className="px-3 py-4 flex-1 overflow-y-auto">
              <div className="micro text-white/40 px-3 mb-2">{roleName.toUpperCase()} MENU</div>
              <nav className="space-y-1">
                {nav.map(n => (
                  <NavItem key={n.id} n={n} size="lg" onClick={() => setMobileMenu(false)} />
                ))}
              </nav>
            </div>
            <div className="p-3 hairline-t">
              <button
                onClick={openLogoutConfirm}
                className="w-full flex items-center gap-3 h-11 px-3 rounded-md text-[14px] font-semibold text-white/70 hover:bg-white/5"
              >
                <I.Logout size={18} /> Log out
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  )
}

export default function Shell({ children }) {
  return (
    <ShellProvider>
      <ShellInner>{children}</ShellInner>
    </ShellProvider>
  )
}
