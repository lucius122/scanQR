import { useEffect, useRef, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import api from '../../lib/axios'
import { Avatar, Badge, Button, Field, Input } from '../../components/ui'

const TIERS = ['Basic', 'Premium', 'VIP']
const TIER_TONE = { Basic: 'outline', Premium: 'pop', VIP: 'ink' }

function formatDateID(dateStr) {
  if (!dateStr) return '—'
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric',
  }).format(new Date(year, month - 1, day))
}

// ── Success card — tampil setelah register berhasil ───────────────────────
function SuccessCard({ result, onRegisterAnother }) {
  const [fullscreen, setFullscreen] = useState(false)

  useEffect(() => {
    if (!fullscreen) return
    const fn = (e) => { if (e.key === 'Escape') setFullscreen(false) }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [fullscreen])

  return (
    <div className="space-y-4">
      {/* Success banner */}
      <div className="bg-ok/10 border border-ok/25 rounded-lg px-4 py-3 flex items-center gap-3">
        <span className="text-ok text-lg">✓</span>
        <div>
          <p className="font-bold text-ok text-sm">Member berhasil didaftarkan!</p>
          <p className="text-ink-4 text-xs">QR Code sudah siap digunakan untuk check-in.</p>
        </div>
      </div>

      {/* QR + member info */}
      <div className="bg-ink text-white rounded-xl overflow-hidden relative">
        <div className="absolute inset-0 opacity-20 dotbg pointer-events-none" />
        <div className="relative p-5 md:p-7 flex flex-col items-center">

          <div className="flex items-center justify-between w-full">
            <div className="micro text-pop">MEMBER BARU · QR CODE</div>
            <button
              onClick={() => setFullscreen(true)}
              className="text-white/70 hover:text-white text-[12px] transition"
            >
              ⛶ Fullscreen
            </button>
          </div>

          <div className="mt-4 bg-white p-3 md:p-4 rounded-lg">
            <QRCodeSVG value={result.qr_payload} size={220} level="L" />
          </div>

          <div className="w-full mt-5 grid grid-cols-[auto_1fr_auto] gap-3 items-center">
            <Avatar name={result.name} size={44} accent />
            <div>
              <div className="font-bold text-[15px] leading-tight">{result.name}</div>
              <div className="mono text-[11px] text-white/60">{result.member_code}</div>
            </div>
            <Badge tone={TIER_TONE[result.tier] ?? 'outline'}>{result.tier}</Badge>
          </div>

          <div className="w-full hairline-t mt-4 pt-4 flex justify-between text-[12px] mono text-white/60">
            <span>{result.branch ?? '—'}</span>
            <span>BERLAKU S/D {formatDateID(result.expires_date)}</span>
          </div>
        </div>
      </div>

      <Button variant="outline" className="w-full" onClick={onRegisterAnother}>
        + Daftarkan Member Baru
      </Button>

      {/* Fullscreen modal */}
      {fullscreen && (
        <div
          className="fixed inset-0 z-50 bg-ink flex items-center justify-center p-6"
          onClick={() => setFullscreen(false)}
        >
          <button
            className="absolute top-5 right-5 text-white/70 hover:text-white text-2xl"
            onClick={() => setFullscreen(false)}
          >
            ✕
          </button>
          <div
            className="w-full max-w-md text-center text-white"
            onClick={e => e.stopPropagation()}
          >
            <div className="micro text-pop mb-3">QR CODE MEMBER BARU</div>
            <div className="bg-white p-5 rounded-xl inline-block">
              <QRCodeSVG value={result.qr_payload} size={300} level="L" />
            </div>
            <div className="mt-5 flex items-center justify-center gap-3">
              <Avatar name={result.name} size={44} accent />
              <div className="text-left">
                <div className="font-bold">{result.name}</div>
                <div className="mono text-[11px] text-white/60">
                  {result.member_code} · {result.tier}
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

// ── Main page ─────────────────────────────────────────────────────────────
export default function RegisterMemberPage() {
  const [branches, setBranches] = useState([])
  const [form, setForm]         = useState({
    name: '', email: '', password: '', phone: '',
    branch_id: '', tier: 'Basic', duration_months: '1',
  })
  const [photo,    setPhoto]    = useState(null)
  const [preview,  setPreview]  = useState(null)
  const [errors,   setErrors]   = useState({})
  const [loading,  setLoading]  = useState(false)
  const [result,   setResult]   = useState(null)
  const fileRef = useRef()

  useEffect(() => {
    api.get('/api/branches').then(r => {
      setBranches(r.data)
      if (r.data.length > 0) setForm(f => ({ ...f, branch_id: String(r.data[0].id) }))
    }).catch(() => {})
  }, [])

  function set(field) {
    return (e) => {
      setForm(f => ({ ...f, [field]: e.target.value }))
      setErrors(er => ({ ...er, [field]: undefined }))
    }
  }

  function handlePhotoChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhoto(file)
    setPreview(URL.createObjectURL(file))
    setErrors(er => ({ ...er, photo: undefined }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setErrors({})

    const fd = new FormData()
    fd.append('name',            form.name)
    fd.append('email',           form.email)
    fd.append('password',        form.password)
    fd.append('phone',           form.phone)
    fd.append('branch_id',       form.branch_id)
    fd.append('tier',            form.tier)
    fd.append('duration_months', form.duration_months)
    if (photo) fd.append('photo', photo)

    try {
      const res = await api.post('/api/members', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setResult(res.data.data)
    } catch (err) {
      if (err.response?.status === 422) {
        setErrors(err.response.data.errors ?? {})
      } else {
        setErrors({ _general: err.response?.data?.message ?? 'Terjadi kesalahan. Coba lagi.' })
      }
    } finally {
      setLoading(false)
    }
  }

  function handleRegisterAnother() {
    setResult(null)
    setForm({ name: '', email: '', password: '', phone: '', branch_id: branches[0]?.id ? String(branches[0].id) : '', tier: 'Basic', duration_months: '1' })
    setPhoto(null)
    setPreview(null)
    setErrors({})
  }

  // ── Setelah sukses: tampilkan QR card ──────────────────────────────────
  if (result) {
    return (
      <div className="max-w-[520px] mx-auto px-4 md:px-6 py-6">
        <div className="mb-5">
          <div className="micro text-ink-4">KASIR</div>
          <div className="text-xl font-black tracking-tight">Member Terdaftar</div>
        </div>
        <SuccessCard result={result} onRegisterAnother={handleRegisterAnother} />
      </div>
    )
  }

  // ── Form ───────────────────────────────────────────────────────────────
  return (
    <div className="max-w-[640px] mx-auto px-4 md:px-6 py-4 md:py-6 pb-24">

      {/* Header */}
      <div className="mb-5">
        <div className="micro text-ink-4">KASIR</div>
        <div className="text-xl font-black tracking-tight">Daftar Member Baru</div>
      </div>

      {errors._general && (
        <div className="mb-4 bg-bad/10 border border-bad/25 rounded-lg px-4 py-2.5 text-bad text-sm">
          {errors._general}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* ── Section: Akun ── */}
        <div className="bg-white hairline rounded-xl p-5 space-y-4">
          <div className="micro text-ink-4 pb-1 hairline-b">INFORMASI AKUN</div>

          <Field label="Nama Lengkap" hint={errors.name?.[0]}>
            <Input
              value={form.name}
              onChange={set('name')}
              placeholder="Rania Adhiputra"
              className={errors.name ? 'border-bad' : ''}
              autoComplete="off"
            />
          </Field>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Email" hint={errors.email?.[0]}>
              <Input
                type="email"
                value={form.email}
                onChange={set('email')}
                placeholder="rania@email.com"
                className={errors.email ? 'border-bad' : ''}
                autoComplete="off"
              />
            </Field>
            <Field label="Password" hint={errors.password?.[0]}>
              <Input
                type="password"
                value={form.password}
                onChange={set('password')}
                placeholder="Min. 8 karakter"
                className={errors.password ? 'border-bad' : ''}
                autoComplete="new-password"
              />
            </Field>
          </div>

          <Field label="No. Telepon (opsional)" hint={errors.phone?.[0]}>
            <Input
              type="tel"
              value={form.phone}
              onChange={set('phone')}
              placeholder="08123456789"
            />
          </Field>

          {/* Photo upload */}
          <div>
            <span className="micro text-ink-4 block mb-1.5">FOTO (opsional, maks. 2MB)</span>
            <div className="flex items-center gap-4">
              {preview ? (
                <img
                  src={preview}
                  alt="preview"
                  className="w-16 h-16 rounded-full object-cover hairline"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-bone-2 flex items-center justify-center text-ink-4 text-xs">
                  Foto
                </div>
              )}
              <div className="flex-1 space-y-1.5">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoChange}
                />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="h-9 px-4 text-sm hairline rounded-md hover:bg-bone-2 transition"
                >
                  Pilih foto…
                </button>
                {photo && (
                  <p className="text-[11px] text-ink-4 truncate max-w-[200px]">{photo.name}</p>
                )}
                {errors.photo && (
                  <p className="text-[11px] text-bad">{errors.photo[0]}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Section: Keanggotaan ── */}
        <div className="bg-white hairline rounded-xl p-5 space-y-4">
          <div className="micro text-ink-4 pb-1 hairline-b">KEANGGOTAAN</div>

          <Field label="Cabang" hint={errors.branch_id?.[0]}>
            <select
              value={form.branch_id}
              onChange={set('branch_id')}
              className="w-full h-10 px-3 bg-white hairline rounded-md text-sm focus-ring focus:outline-none cursor-pointer"
            >
              {branches.length === 0 && (
                <option value="">Memuat cabang…</option>
              )}
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </Field>

          {/* Tier — radio cards */}
          <div>
            <span className="micro text-ink-4 block mb-2">TIER</span>
            <div className="grid grid-cols-3 gap-2">
              {TIERS.map(t => (
                <label key={t} className="cursor-pointer">
                  <input
                    type="radio"
                    name="tier"
                    value={t}
                    checked={form.tier === t}
                    onChange={set('tier')}
                    className="sr-only"
                  />
                  <div className={
                    `text-center py-2.5 rounded-lg text-sm font-semibold hairline transition ` +
                    (form.tier === t
                      ? 'bg-ink text-white border-ink'
                      : 'bg-white text-ink hover:bg-bone-2')
                  }>
                    {t}
                  </div>
                </label>
              ))}
            </div>
            {errors.tier && <p className="text-[11px] text-bad mt-1">{errors.tier[0]}</p>}
          </div>

          {/* Duration */}
          <Field label="Durasi (bulan)" hint={errors.duration_months?.[0]}>
            <div className="flex items-center gap-3">
              <Input
                type="number"
                min="1"
                max="36"
                value={form.duration_months}
                onChange={set('duration_months')}
                className={`w-24 ${errors.duration_months ? 'border-bad' : ''}`}
              />
              <div className="flex gap-1.5">
                {[1, 3, 6, 12].map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, duration_months: String(n) }))}
                    className={
                      `h-8 px-3 text-xs rounded-md hairline transition font-medium ` +
                      (form.duration_months === String(n)
                        ? 'bg-pop border-pop'
                        : 'hover:bg-bone-2')
                    }
                  >
                    {n}bln
                  </button>
                ))}
              </div>
            </div>
          </Field>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full h-12 bg-ink text-white font-bold rounded-xl hover:bg-ink-2 disabled:opacity-50 transition text-sm"
        >
          {loading ? 'Mendaftarkan…' : 'Daftarkan Member'}
        </button>

      </form>
    </div>
  )
}
