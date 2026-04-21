import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { useAuth } from '../../contexts/AuthContext'
import api from '../../lib/axios'
import { Avatar, Badge, Button } from '../../components/ui'
import * as I from '../../components/icons'

function formatDateID(dateStr) {
  if (!dateStr) return '—'
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric',
  }).format(new Date(year, month - 1, day))
}

const TIER_BADGE = {
  Basic:   { tone: 'outline' },
  Premium: { tone: 'pop'     },
  VIP:     { tone: 'ink'     },
}

export default function MemberDashboard() {
  const { user } = useAuth()

  const [qrData,       setQrData]       = useState(null)
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState(null)
  const [fullscreen,      setFullscreen]      = useState(false)
  const [regenerating,    setRegenerating]    = useState(false)
  const [regenSuccess,    setRegenSuccess]    = useState(false)
  const [confirmRegen,    setConfirmRegen]    = useState(false)

  useEffect(() => { fetchQr() }, [])

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
    setConfirmRegen(false)
    setRegenerating(true)
    setRegenSuccess(false)
    try {
      const res = await api.post('/api/member/qr/regenerate')
      setQrData(res.data)
      setRegenSuccess(true)
      setTimeout(() => setRegenSuccess(false), 3000)
    } catch {
      setError('Gagal membuat QR baru.')
    } finally {
      setRegenerating(false)
    }
  }

  const isActive = qrData?.status === 'active'
  const tierCfg  = TIER_BADGE[qrData?.tier] ?? TIER_BADGE.Basic

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-10 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-pop border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-ink-4 text-sm">Memuat QR code…</p>
        </div>
      </div>
    )
  }

  // ── Error ────────────────────────────────────────────────────────────────
  if (error && !qrData) {
    return (
      <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-10 flex items-center justify-center">
        <div className="text-center space-y-4 max-w-sm">
          <p className="text-bad text-sm">{error}</p>
          <Button variant="outline" onClick={fetchQr}>Coba Lagi</Button>
        </div>
      </div>
    )
  }

  const daysLeft = qrData?.days_left ?? 0

  return (
    <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-4 md:py-6 space-y-4 md:space-y-5 pb-24 lg:pb-6">

      {/* Greeting */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="micro text-ink-4">MEMBER DASHBOARD</div>
          <div className="text-xl md:text-2xl font-black tracking-tight">
            Hi, {user?.name?.split(' ')[0]}
          </div>
        </div>
        <Badge tone={isActive ? 'ok' : 'bad'} dot>
          {isActive ? 'AKTIF' : 'EXPIRED'}
        </Badge>
      </div>

      {/* ── Hero: QR + Membership card ── */}
      <div className="grid lg:grid-cols-[1.15fr_1fr] gap-4 md:gap-5">

        {/* QR Hero — dark card */}
        <div className="bg-ink on-dark text-white rounded-xl overflow-hidden relative">
          <div className="absolute inset-0 opacity-20 dotbg pointer-events-none" />
          <div className="relative p-5 md:p-7 flex flex-col items-center">

            {/* Header row */}
            <div className="flex items-center justify-between w-full">
              <div className="micro text-pop">ATTENDANCE · QR</div>
              <button
                onClick={() => setFullscreen(true)}
                className="text-white/70 hover:text-white flex items-center gap-1.5 text-[12px] transition"
              >
                <I.Maximize size={14} /> Fullscreen
              </button>
            </div>

            {/* QR code */}
            <div className={`mt-4 bg-white p-3 md:p-4 rounded-lg ${isActive ? 'pulse-ring' : ''}`}>
              {qrData?.qr_payload ? (
                <QRCodeSVG value={qrData.qr_payload} size={220} level="L" />
              ) : (
                <div className="w-[220px] h-[220px] bg-bone-2 rounded flex items-center justify-center">
                  <span className="text-ink/30 text-sm">No QR</span>
                </div>
              )}
            </div>

            {/* Member info row */}
            <div className="w-full mt-5 grid grid-cols-[auto_1fr_auto] gap-3 items-center">
              <Avatar name={user?.name ?? '?'} size={44} accent />
              <div>
                <div className="font-bold text-[15px] leading-tight">{user?.name}</div>
                <div className="mono text-[11px] text-white/60">{qrData?.member_code}</div>
              </div>
              <Badge tone={tierCfg.tone}>{qrData?.tier}</Badge>
            </div>

            {/* Footer row */}
            <div className="w-full hairline-t mt-4 pt-4 flex justify-between text-[12px] mono text-white/60">
              <span>{qrData?.branch ?? user?.branch?.name}</span>
              <span>SCAN AT FRONT DESK →</span>
            </div>
          </div>
        </div>

        {/* Membership card + stats */}
        <div className="flex flex-col gap-4 md:gap-5">

          {/* Membership card */}
          <div className="bg-white hairline rounded-xl p-5 md:p-6 relative overflow-hidden flex-1">
            {/* Yellow circle decoration */}
            <div className="absolute -right-8 -top-8 w-40 h-40 bg-pop rounded-full opacity-80" />
            <div className="absolute right-6 bottom-6 opacity-10 pointer-events-none">
              <I.Dumbbell size={90} />
            </div>
            <div className="relative">
              <div className="flex items-center justify-between">
                <div className="micro text-ink-4">MEMBERSHIP</div>
                <Badge tone={isActive ? 'ok' : 'bad'} dot>{isActive ? 'ACTIVE' : 'EXPIRED'}</Badge>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <div className="text-3xl md:text-4xl font-black tracking-tight">{qrData?.tier ?? '—'}</div>
                <div className="text-[13px] text-ink-4 font-medium">
                  @ {qrData?.branch ?? user?.branch?.name}
                </div>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-4">
                <div>
                  <div className="micro text-ink-4">BERLAKU SAMPAI</div>
                  <div className="text-[15px] font-bold mt-0.5">{formatDateID(qrData?.expires_date)}</div>
                </div>
                <div>
                  <div className="micro text-ink-4">SISA</div>
                  <div className="text-[15px] font-bold mt-0.5">
                    {isActive
                      ? daysLeft === 0 ? 'Hari ini' : `${daysLeft} hari`
                      : 'Expired'}
                  </div>
                </div>
              </div>
              {/* Days-left bar */}
              <div className="mt-3">
                <div className="h-1.5 bg-bone-2 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-ink rounded-full transition-all"
                    style={{ width: `${Math.min(100, Math.max(0, (daysLeft / 365) * 100))}%` }}
                  />
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <Button variant="ink" size="sm">Perpanjang</Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmRegen(true)}
                  disabled={regenerating}
                >
                  {regenerating ? '…' : '↻ QR Baru'}
                </Button>
              </div>
            </div>
          </div>

          {/* Regen success */}
          {regenSuccess && (
            <div className="bg-ok/10 border border-ok/25 rounded-md px-4 py-2.5 text-center">
              <p className="text-ok text-xs font-medium">
                ✓ QR baru berhasil dibuat — QR lama tidak berlaku.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Hint text */}
      <p className="text-ink-4 text-xs text-center px-2">
        Tunjukkan QR code ini ke kasir untuk check-in.
        {!isActive && ' Perpanjang keanggotaan Anda di kasir.'}
      </p>

      {/* ── Confirm dialog — regenerate QR ── */}
      {confirmRegen && (
        <div
          className="fixed inset-0 z-50 bg-ink/60 backdrop-blur-sm flex items-center justify-center p-6"
          onClick={() => setConfirmRegen(false)}
        >
          <div
            className="bg-white rounded-xl w-full max-w-sm p-6 shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="text-lg font-black mb-1">Generate QR Baru?</div>
            <p className="text-sm text-ink-4 mb-5">
              QR lama akan otomatis tidak valid. Tindakan ini tidak bisa dibatalkan.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setConfirmRegen(false)}>
                Batal
              </Button>
              <Button variant="ink" className="flex-1" onClick={handleRegenerate}>
                Ya, Generate Baru
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Fullscreen modal ── */}
      {fullscreen && (
        <div
          className="fixed inset-0 z-50 bg-ink flex items-center justify-center p-6"
          onClick={() => setFullscreen(false)}
        >
          <button
            className="absolute top-5 right-5 text-white/70 hover:text-white"
            onClick={() => setFullscreen(false)}
          >
            <I.X size={24} />
          </button>
          <div
            className="w-full max-w-md text-center text-white"
            onClick={e => e.stopPropagation()}
          >
            <div className="micro text-pop mb-3">TUNJUKKAN KE KASIR</div>
            <div className={`bg-white p-5 rounded-xl inline-block ${isActive ? 'pulse-ring' : ''}`}>
              <QRCodeSVG value={qrData?.qr_payload ?? ''} size={300} level="L" />
            </div>
            <div className="mt-5 flex items-center justify-center gap-3">
              <Avatar name={user?.name ?? '?'} size={44} accent />
              <div className="text-left">
                <div className="font-bold">{user?.name}</div>
                <div className="mono text-[11px] text-white/60">
                  {qrData?.member_code} · {qrData?.tier}
                </div>
              </div>
            </div>
            <p className="text-white/25 text-xs mt-4">Tap di luar atau tekan Esc untuk tutup</p>
          </div>
        </div>
      )}
    </div>
  )
}
