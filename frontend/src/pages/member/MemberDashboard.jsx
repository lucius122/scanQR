import { useEffect, useRef, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../lib/axios'

/*
 * Format tanggal ke bahasa Indonesia tanpa jam.
 * Parsing manual (YYYY-MM-DD) menghindari masalah timezone — tanpa ini,
 * "2026-07-20" di-parse sebagai UTC midnight lalu dikonversi ke timezone
 * lokal bisa bergeser satu hari.
 */
function formatDateID(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric',
  }).format(new Date(year, month - 1, day))
}

const TIER_STYLE = {
  Basic:   'bg-bone/15 text-bone border border-bone/20',
  Premium: 'bg-pop/15 text-pop border border-pop/30',
  VIP:     'bg-purple-500/15 text-purple-300 border border-purple-500/30',
}

export default function MemberDashboard() {
  const { user, logout }    = useAuth()
  const navigate             = useNavigate()
  const [qrData, setQrData] = useState(null)
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)
  const [fullscreen, setFullscreen] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [regenSuccess, setRegenSuccess] = useState(false)

  useEffect(() => { fetchQr() }, [])

  // Tutup fullscreen dengan tombol Escape
  useEffect(() => {
    if (!fullscreen) return
    const onKey = (e) => { if (e.key === 'Escape') setFullscreen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [fullscreen])

  async function fetchQr() {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get('/api/member/qr')
      setQrData(res.data)
    } catch {
      setError('Gagal memuat QR code. Pastikan koneksi ke server aktif.')
    } finally {
      setLoading(false)
    }
  }

  async function handleRegenerate() {
    setRegenerating(true)
    setRegenSuccess(false)
    try {
      const res = await api.post('/api/member/qr/regenerate')
      setQrData(res.data)
      setRegenSuccess(true)
      setTimeout(() => setRegenSuccess(false), 3000)
    } catch {
      setError('Gagal generate QR baru.')
    } finally {
      setRegenerating(false)
    }
  }

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  const isActive    = qrData?.status === 'active'
  const initials    = user?.name?.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()

  // ─── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-ink flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-pop border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-bone/40 text-sm">Memuat QR code...</p>
        </div>
      </div>
    )
  }

  // ─── Error ────────────────────────────────────────────────────────────────
  if (error && !qrData) {
    return (
      <div className="min-h-screen bg-ink flex items-center justify-center p-6">
        <div className="text-center space-y-4 max-w-sm">
          <p className="text-bad text-sm">{error}</p>
          <button
            onClick={fetchQr}
            className="px-5 py-2.5 bg-bone/10 hover:bg-bone/20 rounded-lg text-sm text-bone transition-colors cursor-pointer"
          >
            Coba Lagi
          </button>
        </div>
      </div>
    )
  }

  // ─── Main ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-ink font-sans">

      {/* Header */}
      <header className="flex items-center justify-between px-5 py-4 border-b border-ink-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-pop rounded-md flex items-center justify-center">
            <span className="text-ink text-xs font-black">F</span>
          </div>
          <span className="text-bone/60 text-sm font-medium">FORGE Gym OS</span>
        </div>
        <button
          onClick={handleLogout}
          className="text-bone/40 hover:text-bone/70 text-sm transition-colors cursor-pointer"
        >
          Keluar
        </button>
      </header>

      {/* Content */}
      <main className="max-w-sm mx-auto px-4 py-8 space-y-5">

        {/* ── QR Hero Card ── */}
        <div className="bg-ink-2 rounded-2xl p-6 border border-ink-3 space-y-6">

          {/* QR Code + pulse */}
          <div className="flex flex-col items-center gap-5">
            <div
              className={`rounded-2xl ${isActive ? 'qr-pulse-active' : ''}`}
              style={isActive ? {} : { border: '2px solid #DC2626' }}
            >
              <div className="bg-white p-4 rounded-xl">
                {qrData?.qr_payload ? (
                  <QRCodeSVG
                    value={qrData.qr_payload}
                    size={220}
                    level="L"
                    /*
                     * level="L" → 7% error correction.
                     * Dipilih karena payload cukup panjang (~170 karakter),
                     * level rendah menghasilkan QR lebih sederhana dan mudah di-scan.
                     * Gunakan level="M" jika lingkungan scan sering buram.
                     */
                  />
                ) : (
                  <div className="w-[220px] h-[220px] bg-bone-2 rounded flex items-center justify-center">
                    <span className="text-ink/30 text-sm">No QR</span>
                  </div>
                )}
              </div>
            </div>

            {/* Status badge */}
            <div className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold
              ${isActive
                ? 'bg-ok/15 text-ok border border-ok/30'
                : 'bg-bad/15 text-bad border border-bad/30'}
            `}>
              <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-ok' : 'bg-bad'}`} />
              {isActive ? 'AKTIF' : 'EXPIRED'}
            </div>
          </div>

          {/* Member info */}
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="w-12 h-12 bg-pop rounded-xl flex items-center justify-center shrink-0">
              <span className="text-ink text-lg font-black">{initials}</span>
            </div>

            {/* Nama + kode */}
            <div className="flex-1 min-w-0">
              <p className="text-bone font-semibold truncate">{qrData?.name ?? user?.name}</p>
              <p className="font-mono text-bone/50 text-xs mt-0.5 tracking-wide">
                {qrData?.member_code}
              </p>
              {qrData?.branch && (
                <p className="text-bone/40 text-xs mt-0.5">{qrData.branch}</p>
              )}
            </div>

            {/* Tier badge */}
            <span className={`
              text-xs font-semibold px-2.5 py-1 rounded-full shrink-0
              ${TIER_STYLE[qrData?.tier] ?? TIER_STYLE.Basic}
            `}>
              {qrData?.tier}
            </span>
          </div>

          {/* Validity info */}
          <div className={`
            rounded-xl p-4 border space-y-1
            ${isActive
              ? 'bg-ok/5 border-ok/15'
              : 'bg-bad/5 border-bad/15'}
          `}>
            <p className={`text-xs font-medium ${isActive ? 'text-ok' : 'text-bad'}`}>
              {isActive ? 'Berlaku sampai' : 'Keanggotaan berakhir'}
            </p>
            <p className="text-bone text-sm font-semibold">
              {qrData?.expires_date ? formatDateID(qrData.expires_date) : '—'}
            </p>
            {isActive && (
              <p className="text-bone/40 text-xs">
                {qrData?.days_left === 0
                  ? 'Berakhir hari ini'
                  : `${qrData?.days_left} hari lagi`}
              </p>
            )}
          </div>

          {/* Notif regenerate sukses */}
          {regenSuccess && (
            <div className="bg-ok/10 border border-ok/25 rounded-lg px-4 py-2.5 text-center">
              <p className="text-ok text-xs font-medium">
                ✓ QR baru berhasil dibuat — QR lama tidak berlaku.
              </p>
            </div>
          )}

          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setFullscreen(true)}
              className="py-3 bg-bone/8 hover:bg-bone/15 border border-bone/15
                         rounded-xl text-bone text-sm font-medium
                         transition-colors cursor-pointer"
            >
              ⛶  Layar Penuh
            </button>
            <button
              onClick={handleRegenerate}
              disabled={regenerating}
              className="py-3 bg-pop/10 hover:bg-pop/20 border border-pop/25
                         rounded-xl text-pop text-sm font-medium
                         disabled:opacity-50 transition-colors cursor-pointer"
            >
              {regenerating ? '...' : '↻  QR Baru'}
            </button>
          </div>
        </div>

        {/* Info hint */}
        <p className="text-bone/25 text-xs text-center px-2">
          Tunjukkan QR code ini ke kasir untuk check-in.
          {!isActive && ' Perpanjang keanggotaan Anda di kasir.'}
        </p>

      </main>

      {/* ── Fullscreen Modal ── */}
      {fullscreen && (
        <div
          className="fixed inset-0 z-50 bg-ink/96 flex flex-col items-center justify-center gap-6 p-6"
          onClick={() => setFullscreen(false)}
        >
          {/* Mencegah klik di dalam QR box menutup modal */}
          <div
            className="flex flex-col items-center gap-5"
            onClick={e => e.stopPropagation()}
          >
            {/* QR besar */}
            <div className={`rounded-2xl ${isActive ? 'qr-pulse-active' : ''}`}>
              <div className="bg-white p-5 rounded-xl shadow-2xl">
                <QRCodeSVG
                  value={qrData?.qr_payload ?? ''}
                  size={280}
                  level="L"
                />
              </div>
            </div>

            {/* Info singkat */}
            <div className="text-center">
              <p className="text-bone font-semibold">{qrData?.name}</p>
              <p className="font-mono text-bone/50 text-sm mt-1 tracking-wide">
                {qrData?.member_code}
              </p>
            </div>
          </div>

          {/* Hint tutup */}
          <p className="text-bone/25 text-xs">Tap di luar atau tekan Esc untuk tutup</p>
        </div>
      )}

    </div>
  )
}
