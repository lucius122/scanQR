import { useEffect, useRef, useState } from 'react'

import { useAuth } from '../../contexts/AuthContext'
import { useShellTab } from '../../contexts/ShellContext'
import api from '../../lib/axios'
import { formatDateWIB, formatTimeWIB } from '../../lib/datetime'
import QrScannerCamera from './components/QrScannerCamera'
import { Avatar, Badge, Button } from '../../components/ui'
import * as I from '../../components/icons'
import { cls } from '../../lib/utils'

const TIER_TONE = { Basic: 'outline', Premium: 'pop', VIP: 'ink' }

// Beep via Web Audio API — tidak butuh file audio eksternal
function playBeep(success = true) {
  try {
    const ctx  = new (window.AudioContext || window.webkitAudioContext)()
    const osc  = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type            = 'sine'
    osc.frequency.value = success ? 1200 : 440
    gain.gain.setValueAtTime(0.25, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.12)
  } catch (_) { /* AudioContext tidak tersedia */ }
}

// ── Status config (untuk label & warna) ──────────────────────────────────
const STATUS_CFG = {
  success:           { badge: 'ok',      dot: true,  label: '✓ AKTIF',        actionLabel: '✓ Konfirmasi Check-in', actionVariant: 'pop'     },
  expired:           { badge: 'bad',     dot: false, label: '✗ EXPIRED',      actionLabel: null,                   actionVariant: null      },
  invalid:           { badge: 'outline', dot: false, label: 'TIDAK VALID',    actionLabel: null,                   actionVariant: null      },
  invalid_qr:        { badge: 'bad',     dot: false, label: 'QR PALSU',       actionLabel: null,                   actionVariant: null      },
}

// ── Toast ─────────────────────────────────────────────────────────────────
function Toast({ message, tone = 'ok' }) {
  const bg = tone === 'ok' ? 'bg-ok' : tone === 'warn' ? 'bg-warn' : 'bg-bad'
  return (
    <div className={cls(
      'fixed bottom-24 right-4 md:bottom-6 md:right-6 z-[70]',
      'flex items-center gap-2.5 px-4 py-3 rounded-xl text-white text-sm font-semibold shadow-xl',
      'animate-toast-in',
      bg,
    )}>
      {tone === 'ok' ? <I.Check size={16} /> : <I.X size={16} />}
      {message}
    </div>
  )
}

// ── Scan Result Modal ─────────────────────────────────────────────────────
function ScanResultModal({ result, onConfirm, onClose }) {
  const cfg    = STATUS_CFG[result.status] ?? STATUS_CFG.invalid
  const member = result.member

  return (
    <div
      className="fixed inset-0 z-50 bg-ink/60 flex items-center justify-center p-4 md:p-6 animate-overlay-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-[420px] md:max-w-[480px] overflow-hidden shadow-2xl animate-modal-in"
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header strip ── */}
        <div className={cls(
          'px-5 py-3 flex items-center justify-between',
          result.status === 'success'            ? 'bg-ok/10'   :
          result.status === 'already_checked_in' ? 'bg-warn/10' :
          result.status === 'expired'            ? 'bg-bad/10'  : 'bg-bone-2',
        )}>
          <div className="flex items-center gap-2">
            <Badge tone={cfg.badge} dot={cfg.dot}>{cfg.label}</Badge>
            <span className="text-xs text-ink-4">{result.message}</span>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-black/5"
          >
            <I.X size={16} />
          </button>
        </div>

        <div className="p-5 md:p-6">
          {/* ── Photo hero ── */}
          <div className="flex justify-center mb-4">
            {member?.photo_url ? (
              /*
               * Rasio 3:4 portrait (seperti foto KTP) untuk memudahkan kasir
               * verifikasi visual bahwa orang yang datang sesuai foto di akun.
               * Mencegah kecurangan "akun titipan" antar member.
               */
              <div className="w-[180px] md:w-[220px] aspect-[3/4] rounded-xl overflow-hidden border-2 border-pop shadow-md">
                <img
                  src={member.photo_url}
                  alt={member.name}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-[180px] md:w-[220px] aspect-[3/4] rounded-xl bg-bone-2 border-2 border-bone-3 flex flex-col items-center justify-center gap-2 text-ink-4">
                <I.User size={48} />
                <span className="text-xs">Foto tidak tersedia</span>
              </div>
            )}
          </div>

          {/* ── Identity ── */}
          <div className="text-center mb-4">
            <div className="text-2xl font-black tracking-tight leading-tight">
              {member?.name ?? 'Member tidak ditemukan'}
            </div>
            {member?.member_code && (
              <div className="mono text-sm text-ink-4 mt-0.5">{member.member_code}</div>
            )}
          </div>

          {/* ── Info grid ── */}
          {member && (
            <div className="grid grid-cols-2 gap-2 mb-5 hairline-t pt-4">
              <div className="bg-bone-2 rounded-lg p-3">
                <div className="micro text-ink-4 mb-1">TIER</div>
                <Badge tone={TIER_TONE[member.tier] ?? 'outline'}>{member.tier}</Badge>
              </div>
              <div className="bg-bone-2 rounded-lg p-3">
                <div className="micro text-ink-4 mb-1">CABANG</div>
                <div className="text-sm font-semibold truncate">{member.branch ?? '—'}</div>
              </div>
              <div className="bg-bone-2 rounded-lg p-3">
                <div className="micro text-ink-4 mb-1">BERLAKU S/D</div>
                <div className="text-sm font-semibold">{formatDateWIB(member.expires_date)}</div>
              </div>
              <div className="bg-bone-2 rounded-lg p-3">
                <div className="micro text-ink-4 mb-1">SISA HARI</div>
                <div className="text-sm font-semibold">
                  {member.days_left === 0 ? 'Hari ini' : `${member.days_left} hari`}
                </div>
              </div>
            </div>
          )}

          {/* ── Action buttons ── */}
          <div className="space-y-2">
            {cfg.actionLabel && (
              <button
                onClick={onConfirm}
                className={cls(
                  'w-full h-12 rounded-xl font-bold text-sm transition',
                  cfg.actionVariant === 'pop'
                    ? 'bg-pop text-ink hover:bg-pop-2'
                    : cfg.actionVariant === 'danger'
                    ? 'border-2 border-bad text-bad hover:bg-bad/5'
                    : 'border-2 border-ink/20 text-ink hover:bg-bone-2',
                )}
              >
                {cfg.actionLabel}
              </button>
            )}
            <button
              onClick={onClose}
              className="w-full h-10 rounded-xl text-sm font-semibold text-ink-4 hover:bg-bone-2 transition"
            >
              {cfg.actionLabel ? 'Batal / Scan Ulang' : '← Scan Ulang'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Tab: Scan QR ──────────────────────────────────────────────────────────
function TabScan() {
  const { user } = useAuth()

  const [scanKey,       setScanKey]       = useState(0)
  const [cameraActive,  setCameraActive]  = useState(true)
  const [result,        setResult]        = useState(null)
  const [modalOpen,     setModalOpen]     = useState(false)
  const [scanning,      setScanning]      = useState(false)
  const [toast,         setToast]         = useState(null)
  const [manualCode,    setManualCode]    = useState('')
  const [manualReason,  setManualReason]  = useState('')
  const [manualLoading, setManualLoading] = useState(false)
  const toastTimer = useRef(null)

  function showToast(message, tone = 'ok') {
    clearTimeout(toastTimer.current)
    setToast({ message, tone })
    toastTimer.current = setTimeout(() => setToast(null), 2500)
  }

  async function handleQrScan(payload) {
    if (scanning) return
    playBeep(true)                // feedback instan saat QR terdeteksi
    setCameraActive(false)
    setScanning(true)

    console.time('qr:api_call')
    let data
    try {
      const res = await api.post('/api/kasir/scan', { qr_payload: payload })
      data = res.data
    } catch (err) {
      data = err.response?.data ?? { status: 'invalid_qr', message: 'Terjadi kesalahan.', member: null, check_in: null }
      if (data.status !== 'success') playBeep(false)
    } finally {
      console.timeEnd('qr:api_call')
      setScanning(false)
    }

    // Preload foto member sebelum modal muncul — eliminasi flash kosong
    console.time('qr:photo_load')
    const photoUrl = data?.member?.photo_url
    if (photoUrl) {
      await new Promise(resolve => {
        const img = new Image()
        img.onload = img.onerror = resolve
        img.src = photoUrl
      })
    }
    console.timeEnd('qr:photo_load')

    setResult(data)
    setModalOpen(true)
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
      setModalOpen(true)
      setCameraActive(false)
    } catch (err) {
      const data = err.response?.data
      setResult(data ?? { status: 'invalid', message: 'Member tidak ditemukan.', member: null, check_in: null })
      setModalOpen(true)
    } finally {
      setManualLoading(false)
    }
  }

  function handleReset() {
    setModalOpen(false)
    setResult(null)
    setManualCode('')
    setManualReason('')
    setCameraActive(true)
    setScanKey(k => k + 1)
  }

  function handleConfirm() {
    const status = result?.status
    if (status === 'success') {
      showToast('Check-in berhasil dicatat ✓')
    } else if (status === 'expired') {
      showToast('Member ditolak — keanggotaan expired.', 'bad')
    }
    handleReset()
  }

  const cameraStatus = scanning ? 'VERIFYING' : cameraActive ? 'SCANNING' : result ? 'SELESAI' : 'IDLE'

  return (
    <div className="max-w-[600px]">

      {/* Camera card (dark) */}
      <div className="bg-ink on-dark text-white rounded-xl overflow-hidden">
        {/* Camera header */}
        <div className="p-4 flex items-center justify-between hairline-b">
          <div className="flex items-center gap-2">
            <I.Camera size={16} className="text-pop" />
            <span className="font-semibold text-[13px]">Live camera · Front desk</span>
          </div>
          <Badge tone={cameraActive && !scanning ? 'pop' : 'outline'} dot>
            {cameraStatus}
          </Badge>
        </div>

        {/* Camera feed */}
        <div className="relative">
          {!scanning && cameraActive && (
            <QrScannerCamera
              key={scanKey}
              active={cameraActive}
              onScan={handleQrScan}
            />
          )}
          {scanning && (
            <div className="aspect-square bg-ink-2 flex items-center justify-center">
              <div className="text-center space-y-3">
                <div className="w-8 h-8 border-2 border-pop border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-white/40 text-sm">Memverifikasi QR…</p>
              </div>
            </div>
          )}
          {!scanning && !cameraActive && (
            <div className="aspect-square bg-ink-2 flex items-center justify-center">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto">
                  <I.Scan size={20} className="text-white/30" />
                </div>
                <p className="text-white/30 text-sm">Kamera berhenti</p>
              </div>
            </div>
          )}
        </div>

        {/* Camera footer */}
        <div className="p-4 flex items-center justify-between hairline-t">
          <div className="mono text-[11px] text-white/60">
            {user?.name} · {user?.branch?.name ?? 'FORGE'}
          </div>
          <Button variant="pop" size="sm" icon={<I.Scan size={14} />} onClick={handleReset}>
            Re-scan
          </Button>
        </div>

        {/* Manual check-in form */}
        <div className="p-4 hairline-t">
          <div className="micro text-white/40 mb-3">MANUAL CHECK-IN</div>
          <form onSubmit={handleManualSubmit} className="space-y-3">
            <input
              type="text"
              value={manualCode}
              onChange={e => setManualCode(e.target.value.toUpperCase())}
              placeholder="FG-2026-00001"
              className="w-full h-10 px-3 bg-ink-3 hairline rounded-md mono text-sm text-white placeholder:text-white/20 focus-ring focus:outline-none"
            />
            <select
              value={manualReason}
              onChange={e => setManualReason(e.target.value)}
              className="w-full h-10 px-3 bg-ink-3 hairline rounded-md text-sm text-white focus-ring focus:outline-none cursor-pointer"
            >
              <option value="">— Alasan manual (opsional) —</option>
              <option value="HP mati">HP mati</option>
              <option value="QR rusak">QR rusak / tidak bisa di-scan</option>
              <option value="Member baru daftar">Member baru daftar</option>
              <option value="Lainnya">Lainnya</option>
            </select>
            <button
              type="submit"
              disabled={!manualCode.trim() || manualLoading}
              className="w-full h-10 bg-ink-3 hover:bg-ink-4 disabled:opacity-40 hairline text-white font-semibold rounded-md text-sm transition cursor-pointer"
            >
              {manualLoading ? 'Memproses…' : 'Check-in Manual'}
            </button>
          </form>
        </div>
      </div>

      {/* ── Modal: scan result + photo verification ── */}
      {modalOpen && result && (
        <ScanResultModal
          result={result}
          onConfirm={handleConfirm}
          onClose={handleReset}
        />
      )}

      {/* ── Toast notification ── */}
      {toast && <Toast message={toast.message} tone={toast.tone} />}
    </div>
  )
}

// ── Tab: Pengunjung ────────────────────────────────────────────────────────
function TabVisitors() {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/api/kasir/visitors/today')
      .then(r  => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [])

  function handleExport() {
    const today = new Date().toISOString().slice(0, 10)
    window.location.href = `/api/kasir/visitors/export?date=${today}`
  }

  return (
    <div>
      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-5">
        <div className="bg-pop rounded-lg p-4 flex flex-col gap-2 min-h-[100px]">
          <span className="micro opacity-70">HARI INI</span>
          <span className="text-3xl font-extrabold mt-auto">
            {loading ? '…' : (data?.total ?? 0)}
          </span>
          <span className="text-xs mono opacity-60">pengunjung</span>
        </div>
        <div className="bg-white hairline rounded-lg p-4 flex flex-col gap-2 min-h-[100px]">
          <span className="micro text-ink-4">TANGGAL</span>
          <span className="text-lg font-black mt-auto">
            {data?.date ?? new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
          </span>
        </div>
        <div className="bg-white hairline rounded-lg p-4 flex flex-col gap-2 min-h-[100px] md:col-span-2">
          <span className="micro text-ink-4">CABANG</span>
          <span className="text-lg font-black mt-auto">{data?.branch ?? '—'}</span>
        </div>
      </div>

      {/* Visitor list */}
      <div className="bg-white hairline rounded-xl overflow-hidden">
        <div className="p-4 flex items-center justify-between hairline-b gap-3">
          <div className="font-bold">Pengunjung hari ini</div>
          <div className="flex items-center gap-2">
            {data && <span className="chip bg-pop text-ink">{data.total} orang</span>}
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 h-8 bg-pop hover:bg-pop-2 text-ink text-xs font-bold rounded-lg transition"
            >
              <I.Download size={13} /> Export CSV
            </button>
          </div>
        </div>

        {loading && (
          <div className="py-10 text-center">
            <div className="w-6 h-6 border-2 border-pop border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        )}

        {!loading && !data && (
          <p className="text-ink-4 text-sm text-center py-8">Gagal memuat data.</p>
        )}

        {!loading && data?.items?.length === 0 && (
          <p className="text-ink-4 text-sm text-center py-10">Belum ada check-in hari ini.</p>
        )}

        {!loading && data?.items?.length > 0 && (
          <div className="divide-y divide-ink/5">
            {data.items.map((item, i) => (
              <div key={item.id} className="p-3 md:p-4 flex items-center gap-3 hover:bg-bone-2/40">
                <span className="w-6 text-center mono text-[11px] text-ink-4 shrink-0">{i + 1}</span>
                <Avatar name={item.name} size={40} />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{item.name}</div>
                  <div className="mono text-[11px] text-ink-4">{item.member_code}</div>
                </div>
                <Badge tone={TIER_TONE[item.tier] ?? 'outline'}>{item.tier}</Badge>
                <div className="text-right ml-2 shrink-0">
                  <div className="mono text-sm font-bold">{item.checked_in_at ?? '—'}</div>
                  <div className={cls(
                    'text-[10px] mono',
                    item.method === 'manual' ? 'text-warn' : 'text-ink-4',
                  )}>
                    {item.method === 'manual' ? 'manual' : 'qr'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────
export default function KasirDashboard() {
  const { activeTab } = useShellTab() ?? {}
  const tab = activeTab ?? 'scan'

  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-4 md:py-6 pb-24 lg:pb-6">

      <div className="pt-4 md:pt-5">
        {tab === 'scan'     && <TabScan />}
        {tab === 'visitors' && <TabVisitors />}
      </div>
    </div>
  )
}
