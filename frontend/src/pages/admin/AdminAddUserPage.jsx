import { useEffect, useRef, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { useNavigate } from 'react-router-dom'
import api from '../../lib/axios'
import { fetchList } from '../../lib/api'
import { Avatar, Badge, Field, Input } from '../../components/ui'
import * as I from '../../components/icons'
import { cls } from '../../lib/utils'

const ROLES = [
  { value: 'member',  label: 'Member',   desc: 'Pelanggan gym aktif' },
  { value: 'kasir',   label: 'Kasir',    desc: 'Petugas scan & registrasi' },
  { value: 'trainer', label: 'Trainer',  desc: 'Instruktur gym' },
  { value: 'admin',   label: 'Admin',    desc: 'Akses penuh sistem' },
]

const TIER_TONE = { Basic: 'outline', Premium: 'pop', VIP: 'ink' }

function formatRupiah(n) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
}

function formatDateID(dateStr) {
  if (!dateStr) return '—'
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(y, m - 1, d))
}

// ── Success Card (untuk member) ───────────────────────────────────────────
function SuccessCard({ result, onAddAnother }) {
  const [fullscreen, setFullscreen] = useState(false)
  const nav = useNavigate()

  useEffect(() => {
    if (!fullscreen) return
    const fn = e => { if (e.key === 'Escape') setFullscreen(false) }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [fullscreen])

  if (result.role !== 'member') {
    return (
      <div className="space-y-4">
        <div className="bg-ok/10 border border-ok/25 rounded-lg px-4 py-3 flex items-center gap-3">
          <span className="text-ok text-lg">✓</span>
          <div>
            <p className="font-bold text-ok text-sm">User berhasil didaftarkan!</p>
            <p className="text-ink-4 text-xs">{result.name} ({result.role}) sudah bisa login.</p>
          </div>
        </div>
        <div className="bg-white hairline rounded-xl p-4 flex items-center gap-3">
          <Avatar name={result.name} size={44} accent />
          <div>
            <div className="font-bold">{result.name}</div>
            <div className="text-xs text-ink-4">{result.email} · {result.role}</div>
            {result.branch && <div className="text-xs text-ink-4">{result.branch}</div>}
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={onAddAnother} className="flex-1 h-10 rounded-xl hairline text-sm font-semibold hover:bg-bone-2 transition">
            + Tambah User Lagi
          </button>
          <button onClick={() => nav('/admin')} className="flex-1 h-10 rounded-xl bg-ink text-white text-sm font-bold hover:bg-ink-2 transition">
            Kembali ke Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="bg-ok/10 border border-ok/25 rounded-lg px-4 py-3 flex items-center gap-3">
        <span className="text-ok text-lg">✓</span>
        <div>
          <p className="font-bold text-ok text-sm">Member berhasil didaftarkan!</p>
          <p className="text-ink-4 text-xs">QR Code sudah siap digunakan untuk check-in.</p>
        </div>
      </div>

      <div className="bg-ink text-white rounded-xl overflow-hidden relative">
        <div className="absolute inset-0 opacity-20 dotbg pointer-events-none" />
        <div className="relative p-5 md:p-7 flex flex-col items-center">
          <div className="flex items-center justify-between w-full">
            <div className="micro text-pop">MEMBER BARU · QR CODE</div>
            <button onClick={() => setFullscreen(true)} className="text-white/70 hover:text-white text-[12px] transition">
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

      <div className="flex gap-3">
        <button onClick={onAddAnother} className="flex-1 h-10 rounded-xl hairline text-sm font-semibold hover:bg-bone-2 transition">
          + Tambah User Lagi
        </button>
        <button onClick={() => nav('/admin')} className="flex-1 h-10 rounded-xl bg-ink text-white text-sm font-bold hover:bg-ink-2 transition">
          Dashboard
        </button>
      </div>

      {fullscreen && (
        <div className="fixed inset-0 z-50 bg-ink flex items-center justify-center p-6" onClick={() => setFullscreen(false)}>
          <button className="absolute top-5 right-5 text-white/70 hover:text-white text-2xl" onClick={() => setFullscreen(false)}>✕</button>
          <div className="w-full max-w-md text-center text-white" onClick={e => e.stopPropagation()}>
            <div className="micro text-pop mb-3">QR CODE MEMBER BARU</div>
            <div className="bg-white p-5 rounded-xl inline-block">
              <QRCodeSVG value={result.qr_payload} size={300} level="L" />
            </div>
            <div className="mt-5 flex items-center justify-center gap-3">
              <Avatar name={result.name} size={44} accent />
              <div className="text-left">
                <div className="font-bold">{result.name}</div>
                <div className="mono text-[11px] text-white/60">{result.member_code} · {result.tier}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────
export default function AdminAddUserPage() {
  const [role,     setRole]     = useState('member')
  const [branches, setBranches] = useState([])

  const [form, setForm] = useState({
    name: '', email: '', password: '', phone: '',
    branch_id: '', status: 'active',
    duration: '1m',
  })

  const [photo,   setPhoto]   = useState(null)
  const [preview, setPreview] = useState(null)
  const [errors,  setErrors]  = useState({})
  const [loading, setLoading] = useState(false)
  const [result,  setResult]  = useState(null)
  const fileRef = useRef()

  // Load branches (includes tier info)
  useEffect(() => {
    fetchList('/api/branches/options').then(list => {
      setBranches(list)
      if (list.length > 0) setForm(f => ({ ...f, branch_id: String(list[0].id) }))
    }).catch(() => {})
  }, [])

  function set(field) {
    return e => {
      setForm(f => ({ ...f, [field]: e.target.value }))
      setErrors(er => ({ ...er, [field]: undefined }))
    }
  }

  function handlePhotoChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhoto(file)
    setPreview(URL.createObjectURL(file))
  }

  // Tier auto from selected branch
  const selectedBranch = branches.find(b => String(b.id) === String(form.branch_id))
  const branchTierName  = selectedBranch?.tier_name ?? null
  const branchTierPrice = selectedBranch?.tier_price ?? 0

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setErrors({})

    const fd = new FormData()
    fd.append('name',      form.name)
    fd.append('email',     form.email)
    fd.append('password',  form.password)
    fd.append('role',      role)
    fd.append('status',    form.status)
    if (form.phone)     fd.append('phone',     form.phone)
    if (form.branch_id && (role !== 'admin' || form.branch_id !== 'hq'))
      fd.append('branch_id', form.branch_id)
    if (role === 'member') {
      fd.append('duration', form.duration)
    }
    if (photo) fd.append('photo', photo)

    try {
      const res = await api.post('/api/admin/users', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setResult(res.data.data)
    } catch (err) {
      if (err.response?.status === 422) {
        setErrors(err.response.data.errors ?? {})
      } else {
        setErrors({ _general: err.response?.data?.message ?? 'Terjadi kesalahan.' })
      }
    } finally {
      setLoading(false)
    }
  }

  function reset() {
    setResult(null)
    setPhoto(null)
    setPreview(null)
    setErrors({})
    setForm({ name: '', email: '', password: '', phone: '', branch_id: (branches ?? [])[0]?.id ? String(branches[0].id) : '', status: 'active', duration: '1m' })
  }

  if (result) {
    return (
      <div className="max-w-[540px] mx-auto px-4 md:px-6 py-6">
        <div className="mb-5">
          <div className="micro text-ink-4">ADMIN</div>
          <div className="text-xl font-black tracking-tight">User Terdaftar</div>
        </div>
        <SuccessCard result={{ ...result, role }} onAddAnother={reset} />
      </div>
    )
  }

  return (
    <div className="max-w-[680px] mx-auto px-4 md:px-6 py-4 md:py-6 pb-24 lg:pb-6">

      {/* Header */}
      <div className="mb-5">
        <div className="micro text-ink-4">ADMIN</div>
        <div className="text-xl font-black tracking-tight">Tambah User Baru</div>
      </div>

      {errors._general && (
        <div className="mb-4 bg-bad/10 border border-bad/25 rounded-lg px-4 py-2.5 text-bad text-sm">
          {errors._general}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* ── Step 1: Pilih Role ── */}
        <div className="bg-white hairline rounded-xl p-5">
          <div className="micro text-ink-4 pb-1 hairline-b mb-4">PILIH ROLE</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {ROLES.map(r => (
              <label key={r.value} className="cursor-pointer">
                <input type="radio" name="role" value={r.value}
                  checked={role === r.value} onChange={() => setRole(r.value)} className="sr-only" />
                <div className={cls(
                  'text-center py-3 px-2 rounded-xl text-sm hairline transition',
                  role === r.value ? 'bg-ink text-white border-ink' : 'hover:bg-bone-2'
                )}>
                  <div className="font-bold">{r.label}</div>
                  <div className={cls('text-[10px] mt-0.5', role === r.value ? 'text-white/60' : 'text-ink-4')}>
                    {r.desc}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* ── Step 2: Data Akun ── */}
        <div className="bg-white hairline rounded-xl p-5 space-y-4">
          <div className="micro text-ink-4 pb-1 hairline-b">DATA AKUN</div>

          <Field label="Nama Lengkap" hint={errors.name?.[0]}>
            <Input value={form.name} onChange={set('name')} placeholder="Nama lengkap"
              className={errors.name ? 'border-bad' : ''} autoComplete="off" />
          </Field>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Email" hint={errors.email?.[0]}>
              <Input type="email" value={form.email} onChange={set('email')}
                placeholder="email@contoh.com" className={errors.email ? 'border-bad' : ''} autoComplete="off" />
            </Field>
            <Field label="Password" hint={errors.password?.[0]}>
              <Input type="password" value={form.password} onChange={set('password')}
                placeholder="Min. 8 karakter" className={errors.password ? 'border-bad' : ''} autoComplete="new-password" />
            </Field>
          </div>

          <Field label="No. Telepon (opsional)" hint={errors.phone?.[0]}>
            <Input type="tel" value={form.phone} onChange={set('phone')} placeholder="08123456789" />
          </Field>

          {/* Foto */}
          <div>
            <span className="micro text-ink-4 block mb-1.5">FOTO {role === 'member' ? '(wajib untuk verifikasi visual)' : '(opsional)'}</span>
            <div className="flex items-center gap-4">
              {preview ? (
                <img src={preview} alt="preview" className="w-16 h-16 rounded-full object-cover hairline" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-bone-2 flex items-center justify-center text-ink-4 text-xs">Foto</div>
              )}
              <div className="flex-1 space-y-1.5">
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                <button type="button" onClick={() => fileRef.current?.click()}
                  className="h-9 px-4 text-sm hairline rounded-md hover:bg-bone-2 transition">
                  Pilih foto…
                </button>
                {photo && <p className="text-[11px] text-ink-4 truncate max-w-[200px]">{photo.name}</p>}
              </div>
            </div>
          </div>

          {/* Status */}
          <Field label="Status Akun">
            <select value={form.status} onChange={set('status')}
              className="w-full h-10 px-3 bg-white hairline rounded-md text-sm focus:outline-none focus-ring cursor-pointer">
              <option value="active">Aktif</option>
              <option value="inactive">Nonaktif</option>
            </select>
          </Field>
        </div>

        {/* ── Step 3: Cabang ── */}
        <div className="bg-white hairline rounded-xl p-5 space-y-4">
          <div className="micro text-ink-4 pb-1 hairline-b">ASSIGNMENT CABANG</div>

          <Field label="Cabang" hint={errors.branch_id?.[0]}>
            <select value={form.branch_id} onChange={set('branch_id')}
              className="w-full h-10 px-3 bg-white hairline rounded-md text-sm focus:outline-none focus-ring cursor-pointer">
              {role === 'admin' && <option value="hq">HQ (tidak terikat cabang)</option>}
              {branches.length === 0 && <option value="">Memuat cabang…</option>}
              {branches.map(b => (
                <option key={b.id} value={b.id}>{b.name}{b.address ? ` — ${b.address.substring(0, 30)}` : ''}</option>
              ))}
            </select>
          </Field>
        </div>

        {/* ── Step 4: Keanggotaan (hanya member) ── */}
        {role === 'member' && (
          <div className="bg-white hairline rounded-xl p-5 space-y-4">
            <div className="micro text-ink-4 pb-1 hairline-b">KEANGGOTAAN</div>

            {/* Tier — auto from branch */}
            <div>
              <span className="micro text-ink-4 block mb-2">TIER</span>
              {!branchTierName ? (
                <div className="bg-bad/10 border border-bad/25 rounded-lg px-4 py-2.5 text-bad text-sm">
                  Cabang ini belum memiliki tier. Silakan atur di halaman Kelola Cabang.
                </div>
              ) : (
                <div className="bg-bone-2 rounded-lg p-3 flex justify-between items-center">
                  <span className="font-semibold text-sm">{branchTierName}</span>
                  <span className="font-bold text-ink">{formatRupiah(branchTierPrice)} / bln</span>
                </div>
              )}
            </div>

            {/* Duration — preset buttons */}
            <div>
              <span className="micro text-ink-4 block mb-2">DURASI KEANGGOTAAN</span>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { key: '1d', label: '1 Hari' },
                  { key: '1w', label: '1 Minggu' },
                  { key: '1m', label: '1 Bulan' },
                  { key: '3m', label: '3 Bulan' },
                ].map(d => (
                  <button key={d.key} type="button"
                    onClick={() => setForm(f => ({ ...f, duration: d.key }))}
                    className={cls(
                      'py-2.5 rounded-lg text-sm font-semibold hairline transition',
                      form.duration === d.key ? 'bg-ink text-white border-ink' : 'bg-white text-ink hover:bg-bone-2'
                    )}>
                    {d.label}
                  </button>
                ))}
              </div>
              {errors.duration && <p className="text-[11px] text-bad mt-1">{errors.duration[0]}</p>}
            </div>

            {/* Preview harga */}
            {branchTierPrice > 0 && (
              <div className="bg-pop/10 rounded-lg p-3 flex justify-between items-center">
                <span className="text-sm text-ink-4">{branchTierName} · {selectedBranch?.name}</span>
                <span className="font-black text-ink">{formatRupiah(branchTierPrice)} / bln</span>
              </div>
            )}
          </div>
        )}

        {/* Submit */}
        <button type="submit" disabled={loading || (role === 'member' && !branchTierName)}
          className="w-full h-12 bg-ink text-white font-bold rounded-xl hover:bg-ink-2 disabled:opacity-50 transition text-sm">
          {loading ? 'Mendaftarkan…' : `Daftarkan ${ROLES.find(r => r.value === role)?.label ?? 'User'}`}
        </button>

      </form>
    </div>
  )
}
