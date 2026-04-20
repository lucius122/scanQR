import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../lib/axios'
import QrScannerCamera from './components/QrScannerCamera'

function formatDateID(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric',
  }).format(new Date(year, month - 1, day))
}

const TIER_STYLE = {
  Basic:   'bg-bone/10 text-bone/70 border border-bone/20',
  Premium: 'bg-pop/15 text-pop border border-pop/30',
  VIP:     'bg-purple-400/15 text-purple-300 border border-purple-400/30',
}

const STATUS_CONFIG = {
  success: {
    border: 'border-ok/40',
    badge:  'bg-ok/15 text-ok border border-ok/30',
    icon:   '✓',
    label:  'Check-in Berhasil',
  },
  expired: {
    border: 'border-bad/40',
    badge:  'bg-bad/15 text-bad border border-bad/30',
    icon:   '✗',
    label:  'EXPIRED — Tolak Masuk',
  },
  already_checked_in: {
    border: 'border-warn/40',
    badge:  'bg-warn/15 text-warn border border-warn/30',
    icon:   '⚠',
    label:  'Sudah Check-in',
  },
  invalid: {
    border: 'border-ink-4',
    badge:  'bg-ink-3 text-bone/50 border border-ink-4',
    icon:   '?',
    label:  'Tidak Valid',
  },
  invalid_qr: {
    border: 'border-bad/40',
    badge:  'bg-bad/15 text-bad border border-bad/30',
    icon:   '✗',
    label:  'QR Palsu / Rusak',
  },
}

// ─── Sub-komponen: Kartu Hasil Scan ────────────────────────────────────────
function ScanResultCard({ result, onReset }) {
  const cfg      = STATUS_CONFIG[result.status] ?? STATUS_CONFIG.invalid
  const member   = result.member
  const initials = member?.name?.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()

  return (
    <div className={`bg-ink-2 rounded-2xl border-2 ${cfg.border} overflow-hidden`}>
      {/* Status banner */}
      <div className={`px-5 py-3 flex items-center gap-2 ${
        result.status === 'success' ? 'bg-ok/10' :
        result.status === 'expired' || result.status === 'invalid_qr' ? 'bg-bad/10' :
        result.status === 'already_checked_in' ? 'bg-warn/10' : 'bg-ink-3'
      }`}>
        <span className={`
          w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
          ${cfg.badge}
        `}>{cfg.icon}</span>
        <div>
          <p className={`text-sm font-semibold ${
            result.status === 'success' ? 'text-ok' :
            result.status === 'expired' || result.status === 'invalid_qr' ? 'text-bad' :
            result.status === 'already_checked_in' ? 'text-warn' : 'text-bone/60'
          }`}>{cfg.label}</p>
          <p className="text-bone/40 text-xs">{result.message}</p>
        </div>
      </div>

      {/* Member info — tampil kecuali invalid_qr */}
      {member && (
        <div className="p-5 space-y-4">
          {/* Avatar + nama + kode */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-pop rounded-xl flex items-center justify-center shrink-0 text-xl font-black text-ink">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-bone font-bold text-lg leading-tight truncate">{member.name}</p>
              <p className="font-mono text-bone/50 text-sm tracking-wide">{member.member_code}</p>
              {member.branch && (
                <p className="text-bone/40 text-xs mt-0.5">{member.branch}</p>
              )}
            </div>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${TIER_STYLE[member.tier] ?? TIER_STYLE.Basic}`}>
              {member.tier}
            </span>
          </div>

          {/* Grid data */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-ink-3 rounded-xl p-3">
              <p className="text-bone/40 text-xs mb-0.5">Berlaku sampai</p>
              <p className="text-bone text-sm font-medium">{formatDateID(member.expires_date)}</p>
              {result.status === 'success' && (
                <p className="text-bone/30 text-xs mt-0.5">
                  {member.days_left === 0 ? 'Hari terakhir' : `${member.days_left} hari lagi`}
                </p>
              )}
            </div>
            {result.check_in && (
              <div className="bg-ok/8 border border-ok/20 rounded-xl p-3">
                <p className="text-ok/60 text-xs mb-0.5">Waktu check-in</p>
                <p className="text-ok text-sm font-medium font-mono">
                  {result.check_in.checked_in_at.slice(11, 16)}
                </p>
                <p className="text-ok/40 text-xs mt-0.5 capitalize">{result.check_in.method}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tombol reset */}
      <div className="px-5 pb-5">
        <button
          onClick={onReset}
          className="w-full py-3 bg-pop hover:bg-pop-2 text-ink font-bold rounded-xl text-sm transition-colors cursor-pointer"
        >
          ↩ Scan Berikutnya
        </button>
      </div>
    </div>
  )
}

// ─── Sub-komponen: List Pengunjung Hari Ini ────────────────────────────────
function TodayVisitors({ branchName }) {
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/api/kasir/visitors/today')
      .then(r => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="py-8 text-center">
      <div className="w-5 h-5 border-2 border-pop border-t-transparent rounded-full animate-spin mx-auto" />
    </div>
  )

  if (!data) return (
    <p className="text-bone/30 text-sm text-center py-4">Gagal memuat data.</p>
  )

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-bone font-semibold text-sm">Pengunjung Hari Ini</h3>
        <span className="bg-pop/15 text-pop text-xs font-bold px-2 py-0.5 rounded-full">
          {data.total} orang
        </span>
      </div>

      {data.items.length === 0 ? (
        <p className="text-bone/25 text-sm text-center py-6">Belum ada check-in hari ini.</p>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {data.items.map(item => {
            const initials = item.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
            return (
              <div key={item.id} className="flex items-center gap-3 bg-ink-3 rounded-xl px-3 py-2.5">
                <div className="w-9 h-9 bg-ink-4 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold text-bone/60">
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-bone text-sm font-medium truncate">{item.name}</p>
                  <p className="font-mono text-bone/40 text-xs">{item.member_code}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-bone/60 text-sm font-mono">{item.checked_in_at}</p>
                  <p className={`text-xs ${item.method === 'manual' ? 'text-warn' : 'text-bone/25'}`}>
                    {item.method === 'manual' ? 'manual' : 'qr'}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Main: KasirDashboard ─────────────────────────────────────────────────
export default function KasirDashboard() {
  const { user, logout }    = useAuth()
  const navigate             = useNavigate()

  const [scanKey, setScanKey]       = useState(0)      // increment = remount camera
  const [cameraActive, setCameraActive] = useState(true)
  const [result, setResult]         = useState(null)
  const [scanning, setScanning]     = useState(false)  // API call in progress

  // Manual check-in state
  const [manualCode, setManualCode]     = useState('')
  const [manualReason, setManualReason] = useState('')
  const [manualLoading, setManualLoading] = useState(false)

  async function handleQrScan(payload) {
    if (scanning) return
    setCameraActive(false)
    setScanning(true)
    try {
      const res = await api.post('/api/kasir/scan', { qr_payload: payload })
      setResult(res.data)
    } catch (err) {
      // 400 = invalid_qr — masih ada data di response
      const data = err.response?.data
      setResult(data ?? { status: 'invalid_qr', message: 'Terjadi kesalahan.', member: null, check_in: null })
    } finally {
      setScanning(false)
    }
  }

  async function handleManualSubmit(e) {
    e.preventDefault()
    if (!manualCode.trim()) return
    setManualLoading(true)
    try {
      const res = await api.post('/api/kasir/check-in/manual', {
        member_code:   manualCode.trim().toUpperCase(),
        manual_reason: manualReason || null,
      })
      setResult(res.data)
      setCameraActive(false)
    } catch (err) {
      const data = err.response?.data
      setResult(data ?? { status: 'invalid', message: 'Member tidak ditemukan.', member: null, check_in: null })
    } finally {
      setManualLoading(false)
    }
  }

  function handleReset() {
    setResult(null)
    setManualCode('')
    setManualReason('')
    setCameraActive(true)
    setScanKey(k => k + 1)  // force remount camera untuk clear state ZXing
  }

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-ink font-sans">

      {/* Header */}
      <header className="flex items-center justify-between px-5 py-4 border-b border-ink-3">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-pop rounded-md flex items-center justify-center">
            <span className="text-ink text-xs font-black">F</span>
          </div>
          <div>
            <span className="text-bone font-semibold text-sm">Kasir</span>
            {user?.branch && (
              <span className="text-bone/40 text-xs ml-2">— {user.branch.name}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-bone/40 text-sm hidden sm:block">{user?.name}</span>
          <button
            onClick={handleLogout}
            className="text-bone/40 hover:text-bone/70 text-sm transition-colors cursor-pointer"
          >
            Keluar
          </button>
        </div>
      </header>

      {/* Main grid */}
      <main className="max-w-5xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* ── KOLOM KIRI: Scanner + Manual ── */}
          <div className="space-y-5">
            <div>
              <h2 className="text-bone font-bold text-lg mb-1">Scan QR Member</h2>
              <p className="text-bone/40 text-xs">Arahkan kamera ke QR code member</p>
            </div>

            {/* Kamera */}
            {!result && (
              <QrScannerCamera
                key={scanKey}
                active={cameraActive && !scanning}
                onScan={handleQrScan}
              />
            )}

            {/* Spinner saat API call */}
            {scanning && (
              <div className="aspect-square bg-ink-2 rounded-2xl flex items-center justify-center border border-ink-3">
                <div className="text-center space-y-3">
                  <div className="w-8 h-8 border-2 border-pop border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-bone/40 text-sm">Memverifikasi QR...</p>
                </div>
              </div>
            )}

            {/* ─── ATAU: Manual Check-in ─── */}
            <div className="relative">
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-ink-3" />
              <div className="relative flex justify-center">
                <span className="bg-ink px-3 text-bone/30 text-xs">ATAU</span>
              </div>
            </div>

            <form onSubmit={handleManualSubmit} className="space-y-3">
              <div>
                <label className="block text-bone/60 text-xs font-medium mb-1.5">
                  Member Code Manual
                </label>
                <input
                  type="text"
                  value={manualCode}
                  onChange={e => setManualCode(e.target.value.toUpperCase())}
                  placeholder="FG-2026-00001"
                  className="w-full px-4 py-3 bg-ink-2 border border-ink-4 rounded-xl
                             font-mono text-bone text-sm placeholder-bone/20
                             focus:outline-none focus:border-pop/60 transition-colors"
                />
              </div>
              <div>
                <label className="block text-bone/60 text-xs font-medium mb-1.5">
                  Alasan Manual <span className="text-bone/25">(opsional)</span>
                </label>
                <select
                  value={manualReason}
                  onChange={e => setManualReason(e.target.value)}
                  className="w-full px-4 py-3 bg-ink-2 border border-ink-4 rounded-xl
                             text-bone text-sm focus:outline-none focus:border-pop/60
                             transition-colors cursor-pointer"
                >
                  <option value="">— Pilih alasan —</option>
                  <option value="HP mati">HP mati</option>
                  <option value="QR rusak">QR rusak / tidak bisa di-scan</option>
                  <option value="Member baru daftar">Member baru daftar</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={!manualCode.trim() || manualLoading}
                className="w-full py-3 bg-ink-3 hover:bg-ink-4 disabled:opacity-40
                           text-bone font-medium rounded-xl text-sm
                           transition-colors cursor-pointer border border-ink-4"
              >
                {manualLoading ? 'Memproses...' : 'Check-in Manual'}
              </button>
            </form>
          </div>

          {/* ── KOLOM KANAN: Hasil Scan + Visitors ── */}
          <div className="space-y-5">
            <div>
              <h2 className="text-bone font-bold text-lg mb-1">Hasil Scan</h2>
              <p className="text-bone/40 text-xs">Status check-in akan tampil di sini</p>
            </div>

            {/* Hasil scan */}
            {result ? (
              <ScanResultCard result={result} onReset={handleReset} />
            ) : (
              <div className="bg-ink-2 rounded-2xl border border-dashed border-ink-4 flex flex-col items-center justify-center py-16 text-center gap-3">
                <div className="w-12 h-12 bg-ink-3 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">📋</span>
                </div>
                <p className="text-bone/30 text-sm">Menunggu scan...</p>
                <p className="text-bone/20 text-xs px-6">
                  Scan QR atau input kode member untuk melihat hasilnya di sini
                </p>
              </div>
            )}

            {/* Daftar pengunjung hari ini */}
            <div className="bg-ink-2 rounded-2xl border border-ink-3 p-4">
              <TodayVisitors branchName={user?.branch?.name} />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
