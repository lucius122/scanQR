import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { ShellProvider, useShellTab } from '../../contexts/ShellContext'
import { Avatar, Badge, Logo } from '../ui'
import * as I from '../icons'
import { cls } from '../../lib/utils'

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
    { id: 'overview', label: 'Overview',  icon: <I.Home   size={18} /> },
    { id: 'reports',  label: 'Laporan',   icon: <I.Chart  size={18} /> },
    { id: 'audit',    label: 'Audit Log', icon: <I.Shield size={18} /> },
    { id: 'members',  label: 'Members',   icon: <I.Users  size={18} /> },
  ],
  trainer: [
    { id: 'home',    label: 'Home',     icon: <I.Home     size={18} /> },
    { id: 'members', label: 'Members',  icon: <I.Users    size={18} /> },
    { id: 'sched',   label: 'Schedule', icon: <I.Calendar size={18} /> },
  ],
}

const ROLE_LABEL = { kasir: 'Kasir', member: 'Member', admin: 'Admin', trainer: 'Trainer' }

/* ── Sidebar collapse hook — persists ke localStorage ── */
function useSidebarCollapse() {
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem('forge_sidebar_collapsed') === 'true',
  )
  function toggle() {
    setCollapsed(prev => {
      const next = !prev
      localStorage.setItem('forge_sidebar_collapsed', String(next))
      return next
    })
  }
  return { collapsed, toggle }
}

/* ── Nav item component — defined outside ShellInner untuk stabilitas ref ── */
function SidebarItem({ n, collapsed, isActive, onActivate, onHover, onLeave }) {
  const activeCls = isActive
    ? 'bg-pop text-ink'
    : 'text-white/70 hover:text-white hover:bg-white/5'

  const sharedCls = cls(
    'transition-colors rounded-md',
    collapsed
      ? 'w-full h-10 flex items-center justify-center'
      : 'w-full h-10 px-3 flex items-center gap-3 font-semibold text-[13px]',
    activeCls,
  )

  const handlers = {
    onMouseEnter: onHover ? (e) => onHover(e, n.label) : undefined,
    onMouseLeave: onLeave,
  }

  if (n.href) {
    return (
      <Link to={n.href} className={sharedCls} {...handlers}>
        {n.icon}
        {!collapsed && <span className="truncate">{n.label}</span>}
      </Link>
    )
  }
  return (
    <button onClick={onActivate} className={sharedCls} {...handlers}>
      {n.icon}
      {!collapsed && <span className="truncate">{n.label}</span>}
    </button>
  )
}

function ShellInner({ children }) {
  const { user, logout }            = useAuth()
  const { activeTab, setActiveTab } = useShellTab()
  const navigate                    = useNavigate()
  const location                    = useLocation()
  const [confirmLogout, setConfirmLogout] = useState(false)
  const { collapsed, toggle }            = useSidebarCollapse()

  /*
   * Tooltip untuk collapsed sidebar.
   * Dirender sebagai position:fixed di luar <aside> sehingga tidak
   * pernah ter-clip oleh overflow:hidden sidebar manapun.
   */
  const [tip, setTip] = useState(null) // { label: string, top: number }

  const nav       = user ? (ROLE_NAVS[user.role] ?? []) : []
  const roleName  = ROLE_LABEL[user?.role] ?? ''
  const firstName = user?.name?.split(' ')[0] ?? ''

  useEffect(() => {
    if (nav.length > 0) setActiveTab(nav[0].id)
  }, [user?.role]) // eslint-disable-line react-hooks/exhaustive-deps

  /* Sembunyikan tooltip saat sidebar expand */
  useEffect(() => {
    if (!collapsed) setTip(null)
  }, [collapsed])

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  function showTip(e, label) {
    if (!collapsed) return
    const rect = e.currentTarget.getBoundingClientRect()
    setTip({ label, top: rect.top + rect.height / 2 })
  }

  return (
    <div className="min-h-screen bg-bone flex">

      {/* ── Sidebar wrapper — flex item dengan width transition ── */}
      {/*
       * Wrapper (bukan aside) yang menjadi flex item dan mengontrol lebar.
       * Aside di dalamnya adalah absolute inset-0 + overflow-hidden SELALU
       * → tidak ada horizontal scroll dari text overflow.
       * Toggle button adalah sibling dari aside (bukan child) → tidak
       * ter-clip oleh overflow:hidden aside.
       */}
      <div className={cls(
        'hidden lg:block relative shrink-0 sticky top-0 h-screen z-40',
        'transition-[width] duration-200 ease-in-out',
        collapsed ? 'w-16' : 'w-[220px] xl:w-[240px]',
      )}>

        {/* Sidebar — overflow-hidden SELALU, tidak pernah overflow-visible */}
        <aside className="absolute inset-0 overflow-hidden bg-ink on-dark text-white flex flex-col">

          {/* Header */}
          <div className={cls(
            'hairline-b flex shrink-0',
            collapsed ? 'justify-center py-[18px] px-2' : 'items-center p-4',
          )}>
            {collapsed ? (
              <div className="w-9 h-9 bg-pop rounded-lg flex items-center justify-center">
                <span className="font-black text-ink text-base leading-none">F</span>
              </div>
            ) : (
              <Logo size={28} on="dark" />
            )}
          </div>

          {/* Nav */}
          <div className={cls('py-4 flex-1 overflow-y-auto overflow-x-hidden', collapsed ? 'px-2' : 'px-3')}>
            {!collapsed && (
              <div className="micro text-white/40 px-3 mb-2">{roleName.toUpperCase()} MENU</div>
            )}
            <nav className="space-y-1">
              {nav.map(n => (
                <SidebarItem
                  key={n.id}
                  n={n}
                  collapsed={collapsed}
                  isActive={
                    n.href
                      ? location.pathname === n.href
                      : activeTab === n.id
                  }
                  onActivate={() => setActiveTab(n.id)}
                  onHover={collapsed ? showTip : undefined}
                  onLeave={collapsed ? () => setTip(null) : undefined}
                />
              ))}
            </nav>
          </div>

          {/* Profile + logout */}
          <div className="hairline-t shrink-0">
            {collapsed ? (
              /* Collapsed — hanya avatar + logout icon, TIDAK ada text di DOM */
              <div className="flex flex-col items-center gap-2 py-3 px-2">
                <div
                  onMouseEnter={e => showTip(e, `${user?.name ?? '?'} · ${roleName}`)}
                  onMouseLeave={() => setTip(null)}
                  className="cursor-default"
                >
                  <Avatar name={user?.name ?? '?'} size={34} accent />
                </div>
                <button
                  onClick={() => setConfirmLogout(true)}
                  onMouseEnter={e => showTip(e, 'Logout')}
                  onMouseLeave={() => setTip(null)}
                  className="w-8 h-8 rounded-md hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors"
                >
                  <I.Logout size={15} />
                </button>
              </div>
            ) : (
              /* Expanded — avatar + nama + role + logout */
              <div className="flex items-center gap-3 p-3">
                <Avatar name={user?.name ?? '?'} size={36} accent />
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-[13px] truncate">{user?.name}</div>
                  <div className="mono text-[10px] text-white/50 truncate">
                    {roleName} · {user?.branch?.name ?? 'FORGE'}
                  </div>
                </div>
                <button
                  onClick={() => setConfirmLogout(true)}
                  title="Logout"
                  className="w-8 h-8 rounded-md hover:bg-white/10 flex items-center justify-center shrink-0"
                >
                  <I.Logout size={16} />
                </button>
              </div>
            )}
          </div>
        </aside>

        {/*
         * Toggle button — sibling dari aside, BUKAN child-nya.
         * Karena aside yang punya overflow:hidden, bukan wrapper div ini,
         * tombol ini TIDAK ter-clip walaupun translate-x-1/2 keluar ke kanan.
         * top-[22px] sejajar dengan tengah logo F di header.
         */}
        <button
          onClick={toggle}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={cls(
            'absolute top-[22px] right-0 translate-x-1/2 z-50',
            'w-7 h-7 rounded-full shadow-md',
            'bg-pop hover:bg-pop-2 text-ink',
            'flex items-center justify-center',
            'ring-2 ring-ink/10',
            'transition-transform duration-150 hover:scale-110',
          )}
        >
          {collapsed
            ? <I.ChevronsRight size={14} />
            : <I.ChevronsLeft  size={14} />
          }
        </button>
      </div>

      {/* Fixed tooltip — position:fixed, tidak pernah ter-clip apapun */}
      {collapsed && tip && (
        <div
          className={cls(
            'fixed pointer-events-none z-[200]',
            'bg-ink text-white text-xs font-semibold',
            'px-2.5 py-1.5 rounded-md whitespace-nowrap',
            'shadow-lg border border-white/10',
          )}
          style={{ top: tip.top, left: 76, transform: 'translateY(-50%)' }}
        >
          {tip.label}
        </div>
      )}

      {/* ── Main column ── */}
      <div className="flex-1 min-w-0 flex flex-col">

        {/* Topbar */}
        <header className="sticky top-0 z-30 bg-bone/90 backdrop-blur hairline-b">
          <div className="flex items-center justify-between px-4 md:px-6 h-14 lg:h-16 gap-3">

            {/* Logo — mobile/tablet only */}
            <div className="flex items-center lg:hidden">
              <Logo size={24} />
            </div>
            {/* Breadcrumb — desktop only */}
            <div className="hidden lg:flex items-center gap-3">
              <span className="text-lg font-black tracking-tight">{roleName} dashboard</span>
              <Badge tone="outline">FORGE GYM</Badge>
            </div>

            {/* Right */}
            <div className="flex items-center gap-2">
              {/* User chip — tablet only (md–lg) */}
              <button className="hidden md:flex lg:hidden items-center gap-2 h-9 px-2 pr-3 rounded-md hairline bg-white cursor-pointer">
                <Avatar name={user?.name ?? '?'} size={24} />
                <span className="text-[12px] font-semibold">{firstName}</span>
              </button>
              {/* Logout — mobile & tablet; desktop pakai sidebar */}
              <button
                onClick={() => setConfirmLogout(true)}
                className="lg:hidden w-9 h-9 rounded-md hairline bg-white flex items-center justify-center"
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

      {/* ── Mobile bottom nav ── */}
      {nav.length > 1 && (
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white hairline-t safe-area-pb">
          <div className="grid" style={{ gridTemplateColumns: `repeat(${nav.length}, 1fr)` }}>
            {nav.map(n => {
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
                    if (location.pathname !== `/${user?.role}`) navigate(`/${user?.role}`)
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
