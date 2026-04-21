import { useEffect, useRef, useState } from 'react'
import { useShellTab } from '../../contexts/ShellContext'
import api from '../../lib/axios'
import { formatDateTimeWIB, formatDateWIB } from '../../lib/datetime'
import { AreaChart, Avatar, Badge, KPI } from '../../components/ui'
import * as I from '../../components/icons'
import { cls } from '../../lib/utils'

// ── Toast ─────────────────────────────────────────────────────────────────
function Toast({ message, tone = 'ok' }) {
  const bg = tone === 'ok' ? 'bg-ok' : tone === 'warn' ? 'bg-warn' : 'bg-bad'
  return (
    <div className={cls(
      'fixed bottom-6 right-6 z-[70]',
      'flex items-center gap-2.5 px-4 py-3 rounded-xl text-white text-sm font-semibold shadow-xl',
      bg,
    )}>
      {tone === 'ok' ? <I.Check size={16} /> : <I.X size={16} />}
      {message}
    </div>
  )
}

// ── Confirm Modal ─────────────────────────────────────────────────────────
function ConfirmModal({ title, body, onConfirm, onClose, danger = false }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-ink/60 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="font-bold text-lg">{title}</h3>
        <p className="text-sm text-ink-4">{body}</p>
        <div className="flex gap-2 justify-end pt-2">
          <button onClick={onClose} className="px-4 h-9 rounded-lg text-sm font-semibold hover:bg-bone-2 transition">
            Batal
          </button>
          <button
            onClick={onConfirm}
            className={cls(
              'px-4 h-9 rounded-lg text-sm font-bold transition text-white',
              danger ? 'bg-bad hover:bg-bad/80' : 'bg-ink hover:bg-ink-2',
            )}
          >
            Konfirmasi
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// TAB 1: Overview
// ─────────────────────────────────────────────────────────────────────────
function TabOverview() {
  const [kpi,     setKpi]     = useState(null)
  const [traffic, setTraffic] = useState(null)
  const [period,  setPeriod]  = useState(6)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      api.get('/api/admin/overview'),
      api.get(`/api/admin/overview/traffic?period=${period}`),
    ])
      .then(([ovRes, trRes]) => {
        setKpi(ovRes.data)
        setTraffic(trRes.data)
      })
      .finally(() => setLoading(false))
  }, [period])

  if (loading) return (
    <div className="py-20 flex justify-center">
      <div className="w-7 h-7 border-2 border-pop border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const k = kpi?.kpi ?? {}

  return (
    <div className="space-y-6">
      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <KPI
          label="Active Members"
          value={k.active_members ?? '—'}
          icon={<I.Users size={14} />}
          tone="light"
        />
        <KPI
          label="Visitors Today"
          value={k.visitors_today ?? '—'}
          icon={<I.Scan size={14} />}
          tone="pop"
        />
        <KPI
          label="Visitors This Month"
          value={k.visitors_this_month ?? '—'}
          delta={k.month_delta}
          icon={<I.Calendar size={14} />}
          tone="light"
        />
        <KPI
          label="Total Check-ins"
          value={k.total_check_ins_all_time ?? '—'}
          unit="all-time"
          icon={<I.TrendUp size={14} />}
          tone="dark"
        />
      </div>

      {/* Traffic chart */}
      <div className="bg-white hairline rounded-xl p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div className="font-bold">Traffic Login Member</div>
          <div className="flex gap-1">
            {[3, 6, 12].map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={cls(
                  'px-3 h-7 rounded-md text-xs font-semibold transition',
                  period === p ? 'bg-ink text-white' : 'bg-bone-2 text-ink-4 hover:bg-bone-3',
                )}
              >
                {p} bln
              </button>
            ))}
          </div>
        </div>
        {traffic && traffic.values.length > 1 && (
          <AreaChart labels={traffic.labels} values={traffic.values} height={200} />
        )}
        {traffic && traffic.values.length <= 1 && (
          <p className="text-ink-4 text-sm text-center py-8">Belum ada data cukup untuk grafik.</p>
        )}
      </div>

      {/* Top branches */}
      {kpi?.top_branches?.length > 0 && (
        <div className="bg-white hairline rounded-xl p-5">
          <div className="font-bold mb-3">Top Cabang Bulan Ini</div>
          <div className="space-y-2">
            {kpi.top_branches.map((b, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="w-6 text-center mono text-[11px] text-ink-4 shrink-0">{i + 1}</span>
                <div className="flex-1 font-semibold text-sm">{b.branch_name}</div>
                <span className="chip bg-pop text-ink">{b.visitors} visit</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// TAB 2: Laporan Absensi
// ─────────────────────────────────────────────────────────────────────────
function TabReports() {
  const [data,       setData]       = useState(null)
  const [summary,    setSummary]    = useState(null)
  const [pagination, setPagination] = useState(null)
  const [branches,   setBranches]   = useState([])
  const [loading,    setLoading]    = useState(true)
  const [page,       setPage]       = useState(1)

  const today30    = new Date(); today30.setDate(today30.getDate() - 29)
  const todayStr   = new Date().toISOString().slice(0, 10)
  const [startDate, setStartDate] = useState(today30.toISOString().slice(0, 10))
  const [endDate,   setEndDate]   = useState(todayStr)
  const [branchId,  setBranchId]  = useState('')
  const [applied,   setApplied]   = useState({
    startDate: today30.toISOString().slice(0, 10), endDate: todayStr, branchId: '',
  })

  useEffect(() => {
    api.get('/api/admin/reports/branches').then(r => setBranches(r.data))
  }, [])

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams({ start_date: applied.startDate, end_date: applied.endDate, page })
    if (applied.branchId) params.set('branch_id', applied.branchId)
    api.get(`/api/admin/reports/attendance?${params}`)
      .then(r => {
        setData(r.data.data)
        setSummary(r.data.summary)
        setPagination(r.data.pagination)
      })
      .finally(() => setLoading(false))
  }, [applied, page])

  function applyFilter() {
    setPage(1)
    setApplied({ startDate, endDate, branchId })
  }

  function handleExport() {
    const params = new URLSearchParams({ start_date: applied.startDate, end_date: applied.endDate })
    if (applied.branchId) params.set('branch_id', applied.branchId)
    window.open(`/api/admin/reports/attendance/export?${params}`, '_blank')
  }

  return (
    <div className="space-y-5">
      {/* Filter bar */}
      <div className="bg-white hairline rounded-xl p-4 flex flex-wrap gap-3 items-end">
        <div>
          <div className="micro text-ink-4 mb-1">DARI</div>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
            className="h-9 px-3 hairline rounded-lg text-sm focus:outline-none focus-ring" />
        </div>
        <div>
          <div className="micro text-ink-4 mb-1">SAMPAI</div>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
            className="h-9 px-3 hairline rounded-lg text-sm focus:outline-none focus-ring" />
        </div>
        <div>
          <div className="micro text-ink-4 mb-1">CABANG</div>
          <select value={branchId} onChange={e => setBranchId(e.target.value)}
            className="h-9 px-3 hairline rounded-lg text-sm bg-white focus:outline-none cursor-pointer">
            <option value="">Semua Cabang</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div className="flex gap-2 ml-auto">
          <button onClick={applyFilter} className="px-4 h-9 bg-ink text-white rounded-lg text-sm font-bold hover:bg-ink-2 transition">
            Apply
          </button>
          <button onClick={handleExport} className="flex items-center gap-1.5 px-4 h-9 bg-pop hover:bg-pop-2 text-ink rounded-lg text-sm font-bold transition">
            <I.Download size={13} /> Export CSV
          </button>
        </div>
      </div>

      {/* Summary */}
      {summary && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white hairline rounded-lg p-4 text-center">
            <div className="micro text-ink-4 mb-1">TOTAL CHECK-INS</div>
            <div className="text-2xl font-extrabold">{summary.total_check_ins}</div>
          </div>
          <div className="bg-white hairline rounded-lg p-4 text-center">
            <div className="micro text-ink-4 mb-1">MEMBER UNIK</div>
            <div className="text-2xl font-extrabold">{summary.unique_members}</div>
          </div>
          <div className="bg-white hairline rounded-lg p-4 text-center">
            <div className="micro text-ink-4 mb-1">METODE</div>
            <div className="text-sm font-bold mt-1">
              <span className="text-ink">QR: {summary.by_method?.qr_scan ?? 0}</span>
              <span className="text-ink-4 mx-1">|</span>
              <span className="text-warn">Manual: {summary.by_method?.manual ?? 0}</span>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white hairline rounded-xl overflow-hidden">
        {loading && (
          <div className="py-12 flex justify-center">
            <div className="w-6 h-6 border-2 border-pop border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {!loading && data?.length === 0 && (
          <p className="text-center text-ink-4 text-sm py-12">Tidak ada data untuk filter ini.</p>
        )}
        {!loading && data?.length > 0 && (
          <>
            <div className="hidden md:grid grid-cols-[auto_1fr_1fr_auto_auto_auto] gap-x-4 px-4 py-2.5 hairline-b micro text-ink-4 bg-bone-2">
              <span>#</span><span>Member</span><span>Cabang</span>
              <span>Waktu (WIB)</span><span>Metode</span><span>Kasir</span>
            </div>
            <div className="divide-y divide-ink/5">
              {data.map((item, i) => (
                <div key={item.id} className="px-4 py-3 flex flex-col md:grid md:grid-cols-[auto_1fr_1fr_auto_auto_auto] md:items-center gap-1 md:gap-x-4">
                  <span className="mono text-[11px] text-ink-4 hidden md:block">{(page - 1) * 25 + i + 1}</span>
                  <div className="flex items-center gap-2">
                    <Avatar name={item.member_name} size={32} />
                    <div>
                      <div className="font-semibold text-sm">{item.member_name}</div>
                      <div className="mono text-[10px] text-ink-4">{item.member_code}</div>
                    </div>
                  </div>
                  <div className="text-sm text-ink-4 ml-10 md:ml-0">{item.branch_name ?? '—'}</div>
                  <div className="mono text-sm font-semibold ml-10 md:ml-0">{formatDateTimeWIB(item.checked_in_at)}</div>
                  <div>
                    <Badge tone={item.method === 'qr_scan' ? 'pop' : 'warn'}>
                      {item.method === 'qr_scan' ? 'QR' : 'Manual'}
                    </Badge>
                  </div>
                  <div className="text-xs text-ink-4">{item.kasir_name ?? '—'}</div>
                </div>
              ))}
            </div>
            {pagination && pagination.last_page > 1 && (
              <div className="p-4 hairline-t flex items-center justify-between">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}
                  className="px-3 h-8 rounded-lg text-sm font-semibold hover:bg-bone-2 disabled:opacity-40 transition"
                >
                  ← Prev
                </button>
                <span className="text-xs text-ink-4 mono">
                  Halaman {pagination.current_page} / {pagination.last_page}
                </span>
                <button
                  disabled={page >= pagination.last_page}
                  onClick={() => setPage(p => p + 1)}
                  className="px-3 h-8 rounded-lg text-sm font-semibold hover:bg-bone-2 disabled:opacity-40 transition"
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// TAB 3: Audit Log
// ─────────────────────────────────────────────────────────────────────────

const ACTION_LABEL = {
  qr_regenerated:              'QR Regenerated',
  qr_invalid_signature:        'QR Invalid Signature',
  manual_checkin:              'Manual Check-in',
  member_deactivated:          'Member Deactivated',
  member_reactivated:          'Member Reactivated',
  expired_member_scan_attempt: 'Expired Scan Attempt',
}

const SEVERITY_CFG = {
  info: { dot: 'bg-ink-4', badge: 'outline', label: 'Info'     },
  warn: { dot: 'bg-warn',  badge: 'warn',    label: 'Warning'  },
  bad:  { dot: 'bg-bad',   badge: 'bad',     label: 'Critical' },
}

function TabAudit() {
  const [data,       setData]       = useState(null)
  const [pagination, setPagination] = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [page,       setPage]       = useState(1)
  const [action,     setAction]     = useState('all')
  const [severity,   setSeverity]   = useState('all')
  const [stats,      setStats]      = useState(null)

  useEffect(() => {
    api.get('/api/admin/audit-logs/stats').then(r => setStats(r.data)).catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams({ page })
    if (action !== 'all')   params.set('action', action)
    if (severity !== 'all') params.set('severity', severity)
    api.get(`/api/admin/audit-logs?${params}`)
      .then(r => {
        setData(r.data.data)
        setPagination(r.data.pagination)
      })
      .finally(() => setLoading(false))
  }, [page, action, severity])

  return (
    <div className="space-y-5">
      {/* Security stats highlight */}
      {stats && (
        <div className="bg-bad/5 border border-bad/20 rounded-xl p-4">
          <div className="text-sm font-bold text-bad mb-1">Deteksi Keamanan (30 hari terakhir)</div>
          <div className="text-xs text-ink-4 space-y-0.5">
            <div>• <strong>{stats.invalid_qr_30d}</strong> percobaan scan QR invalid — bukti sistem deteksi pemalsuan QR</div>
            <div>• <strong>{stats.manual_checkin_30d}</strong> manual check-in — transparansi penggunaan fallback</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white hairline rounded-xl p-4 flex flex-wrap gap-3">
        <div>
          <div className="micro text-ink-4 mb-1">EVENT</div>
          <select value={action} onChange={e => { setAction(e.target.value); setPage(1) }}
            className="h-9 px-3 hairline rounded-lg text-sm bg-white focus:outline-none cursor-pointer">
            <option value="all">Semua Event</option>
            <option value="qr">QR Events</option>
            <option value="member">Member Events</option>
            <option value="security">Security Events</option>
          </select>
        </div>
        <div>
          <div className="micro text-ink-4 mb-1">SEVERITY</div>
          <select value={severity} onChange={e => { setSeverity(e.target.value); setPage(1) }}
            className="h-9 px-3 hairline rounded-lg text-sm bg-white focus:outline-none cursor-pointer">
            <option value="all">Semua Level</option>
            <option value="info">Info</option>
            <option value="warn">Warning</option>
            <option value="bad">Critical</option>
          </select>
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-white hairline rounded-xl overflow-hidden">
        {loading && (
          <div className="py-12 flex justify-center">
            <div className="w-6 h-6 border-2 border-pop border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {!loading && data?.length === 0 && (
          <p className="text-center text-ink-4 text-sm py-12">Tidak ada audit log untuk filter ini.</p>
        )}
        {!loading && data?.length > 0 && (
          <div className="divide-y divide-ink/5">
            {data.map(log => {
              const cfg = SEVERITY_CFG[log.severity] ?? SEVERITY_CFG.info
              return (
                <div key={log.id} className="p-4 flex gap-3">
                  <div className="flex flex-col items-center gap-1 pt-1">
                    <span className={cls('w-2.5 h-2.5 rounded-full shrink-0', cfg.dot)} />
                    <span className="w-px flex-1 bg-ink/8 min-h-[16px]" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center flex-wrap gap-2">
                      <span className="mono text-[11px] text-ink-4">{formatDateTimeWIB(log.created_at)}</span>
                      <Badge tone={cfg.badge}>{cfg.label}</Badge>
                    </div>
                    <div className="font-semibold text-sm">
                      {log.user ? `${log.user.name} (${log.user.role})` : 'System'}
                      {' · '}
                      <span className="uppercase tracking-wide text-[11px]">{ACTION_LABEL[log.action] ?? log.action}</span>
                    </div>
                    {log.details && Object.keys(log.details).length > 0 && (
                      <div className="text-xs text-ink-4 mono bg-bone-2 rounded-md px-2 py-1.5 space-y-0.5">
                        {Object.entries(log.details).map(([k, v]) => (
                          <div key={k}><span className="opacity-60">{k}:</span> {String(v)}</div>
                        ))}
                      </div>
                    )}
                    {log.ip_address && (
                      <div className="text-[11px] text-ink-4 mono">IP: {log.ip_address}</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
        {!loading && pagination && pagination.last_page > 1 && (
          <div className="p-4 hairline-t flex items-center justify-between">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
              className="px-3 h-8 rounded-lg text-sm font-semibold hover:bg-bone-2 disabled:opacity-40 transition">
              ← Prev
            </button>
            <span className="text-xs text-ink-4 mono">
              {pagination.current_page} / {pagination.last_page}
            </span>
            <button disabled={page >= pagination.last_page} onClick={() => setPage(p => p + 1)}
              className="px-3 h-8 rounded-lg text-sm font-semibold hover:bg-bone-2 disabled:opacity-40 transition">
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────
// TAB 4: Member Management
// ─────────────────────────────────────────────────────────────────────────
function TabMembers() {
  const [data,       setData]       = useState(null)
  const [pagination, setPagination] = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [page,       setPage]       = useState(1)
  const [search,     setSearch]     = useState('')
  const [status,     setStatus]     = useState('')
  const [tier,       setTier]       = useState('')
  const [confirm,    setConfirm]    = useState(null)
  const [toast,      setToast]      = useState(null)
  const toastTimer = useRef(null)

  function showToast(msg, tone = 'ok') {
    clearTimeout(toastTimer.current)
    setToast({ message: msg, tone })
    toastTimer.current = setTimeout(() => setToast(null), 2500)
  }

  function loadData(pg = page) {
    setLoading(true)
    const params = new URLSearchParams({ page: pg })
    if (search) params.set('search', search)
    if (status) params.set('status', status)
    if (tier)   params.set('tier', tier)
    api.get(`/api/admin/members?${params}`)
      .then(r => {
        setData(r.data.data)
        setPagination(r.data.pagination)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadData() }, [page, status, tier]) // eslint-disable-line

  function handleSearchSubmit(e) {
    e.preventDefault()
    setPage(1)
    loadData(1)
  }

  async function execRegenQr(id, name) {
    try {
      await api.post(`/api/admin/members/${id}/regenerate-qr`)
      showToast(`QR ${name} berhasil di-regenerate.`)
      loadData()
    } catch {
      showToast('Gagal regenerate QR.', 'bad')
    }
    setConfirm(null)
  }

  async function execToggleStatus(id, name, newStatus) {
    try {
      await api.patch(`/api/admin/members/${id}/status`, { status: newStatus })
      showToast(`${name} berhasil ${newStatus === 'inactive' ? 'dinonaktifkan' : 'diaktifkan'}.`)
      loadData()
    } catch {
      showToast('Gagal update status.', 'bad')
    }
    setConfirm(null)
  }

  const STATUS_BADGE = {
    active:   { tone: 'ok',      label: 'Active'   },
    expired:  { tone: 'bad',     label: 'Expired'  },
    inactive: { tone: 'outline', label: 'Inactive' },
  }

  return (
    <div className="space-y-5">
      {/* Filter */}
      <form onSubmit={handleSearchSubmit} className="bg-white hairline rounded-xl p-4 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[180px]">
          <div className="micro text-ink-4 mb-1">CARI MEMBER</div>
          <div className="relative">
            <I.Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-4" />
            <input
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Nama atau member code…"
              className="w-full h-9 pl-8 pr-3 hairline rounded-lg text-sm focus:outline-none focus-ring"
            />
          </div>
        </div>
        <div>
          <div className="micro text-ink-4 mb-1">STATUS</div>
          <select value={status} onChange={e => { setStatus(e.target.value); setPage(1) }}
            className="h-9 px-3 hairline rounded-lg text-sm bg-white focus:outline-none cursor-pointer">
            <option value="">Semua</option>
            <option value="active">Active</option>
            <option value="expired">Expired</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <div>
          <div className="micro text-ink-4 mb-1">TIER</div>
          <select value={tier} onChange={e => { setTier(e.target.value); setPage(1) }}
            className="h-9 px-3 hairline rounded-lg text-sm bg-white focus:outline-none cursor-pointer">
            <option value="">Semua Tier</option>
            <option value="Basic">Basic</option>
            <option value="Premium">Premium</option>
            <option value="VIP">VIP</option>
          </select>
        </div>
        <button type="submit" className="px-4 h-9 bg-ink text-white rounded-lg text-sm font-bold hover:bg-ink-2 transition">
          Cari
        </button>
      </form>

      {/* Member list */}
      <div className="bg-white hairline rounded-xl overflow-hidden">
        {loading && (
          <div className="py-12 flex justify-center">
            <div className="w-6 h-6 border-2 border-pop border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {!loading && data?.length === 0 && (
          <p className="text-center text-ink-4 text-sm py-12">Tidak ada member ditemukan.</p>
        )}
        {!loading && data?.length > 0 && (
          <div className="divide-y divide-ink/5">
            {data.map(m => {
              const sbadge = STATUS_BADGE[m.status] ?? STATUS_BADGE.active
              return (
                <div key={m.id} className="p-4 flex items-center gap-3 flex-wrap">
                  <Avatar name={m.name} size={40} />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{m.name}</div>
                    <div className="mono text-[11px] text-ink-4">{m.member_code}</div>
                  </div>
                  <div className="hidden md:block text-xs text-ink-4 min-w-[80px]">{m.tier}</div>
                  <div className="hidden md:block text-xs text-ink-4 min-w-[120px] truncate">{m.branch_name ?? '—'}</div>
                  <div className="text-xs text-ink-4 hidden md:block min-w-[90px]">
                    exp: {formatDateWIB(m.expires_date)}
                  </div>
                  <Badge tone={sbadge.tone}>{sbadge.label}</Badge>
                  <div className="flex gap-1 ml-auto">
                    <button
                      title="Regenerate QR"
                      onClick={() => setConfirm({
                        type: 'regen', id: m.id, name: m.name,
                        title: 'Regenerate QR?',
                        body: `Generate ulang QR untuk ${m.name}? QR lama akan langsung invalid.`,
                      })}
                      className="w-8 h-8 rounded-lg hover:bg-bone-2 flex items-center justify-center transition"
                    >
                      <I.Qr size={15} />
                    </button>
                    <button
                      title={m.status === 'inactive' ? 'Aktifkan' : 'Nonaktifkan'}
                      onClick={() => setConfirm({
                        type: 'status', id: m.id, name: m.name,
                        newStatus: m.status === 'inactive' ? 'active' : 'inactive',
                        title: m.status === 'inactive' ? `Aktifkan ${m.name}?` : `Nonaktifkan ${m.name}?`,
                        body: m.status === 'inactive'
                          ? `${m.name} akan bisa check-in kembali.`
                          : `${m.name} tidak bisa check-in sampai diaktifkan lagi.`,
                        danger: m.status !== 'inactive',
                      })}
                      className={cls(
                        'w-8 h-8 rounded-lg flex items-center justify-center transition',
                        m.status === 'inactive' ? 'hover:bg-ok/10 text-ok' : 'hover:bg-bad/10 text-bad',
                      )}
                    >
                      {m.status === 'inactive' ? <I.Check size={15} /> : <I.Stop size={15} />}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
        {!loading && pagination && pagination.last_page > 1 && (
          <div className="p-4 hairline-t flex items-center justify-between">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
              className="px-3 h-8 rounded-lg text-sm font-semibold hover:bg-bone-2 disabled:opacity-40 transition">
              ← Prev
            </button>
            <span className="text-xs text-ink-4 mono">
              {pagination.current_page} / {pagination.last_page}
            </span>
            <button disabled={page >= pagination.last_page} onClick={() => setPage(p => p + 1)}
              className="px-3 h-8 rounded-lg text-sm font-semibold hover:bg-bone-2 disabled:opacity-40 transition">
              Next →
            </button>
          </div>
        )}
      </div>

      {confirm && (
        <ConfirmModal
          title={confirm.title}
          body={confirm.body}
          danger={confirm.danger}
          onClose={() => setConfirm(null)}
          onConfirm={() =>
            confirm.type === 'regen'
              ? execRegenQr(confirm.id, confirm.name)
              : execToggleStatus(confirm.id, confirm.name, confirm.newStatus)
          }
        />
      )}

      {toast && <Toast message={toast.message} tone={toast.tone} />}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const { activeTab } = useShellTab() ?? {}
  const tab = activeTab ?? 'overview'

  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-4 md:py-6 pb-24 lg:pb-6">

      <div className="pt-4 md:pt-5">
        {tab === 'overview' && <TabOverview />}
        {tab === 'reports'  && <TabReports  />}
        {tab === 'audit'    && <TabAudit    />}
        {tab === 'members'  && <TabMembers  />}
      </div>
    </div>
  )
}
