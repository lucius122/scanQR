import { useEffect, useRef, useState } from 'react'
import api from '../../lib/axios'
import { Avatar } from '../../components/ui'
import * as I from '../../components/icons'
import { cls } from '../../lib/utils'

const ROLES = ['admin', 'kasir', 'member', 'trainer']

const ROLE_CHIP = {
  admin:   'bg-pop text-ink',
  kasir:   'bg-ink text-white',
  member:  'bg-ok/15 text-ok',
  trainer: 'bg-blue-100 text-blue-700',
}
const STATUS_CHIP = {
  active:   'bg-ok/15 text-ok',
  inactive: 'bg-bad/15 text-bad',
}

// ── Toast ─────────────────────────────────────────────────────────────────
function Toast({ message, tone = 'ok' }) {
  const bg = tone === 'ok' ? 'bg-ok' : tone === 'bad' ? 'bg-bad' : 'bg-warn'
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

// ── Row Actions Dropdown ───────────────────────────────────────────────────
function RowActions({ user, onEdit, onResetPassword, onToggleStatus }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    function close(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={e => { e.stopPropagation(); setOpen(o => !o) }}
        className="w-8 h-8 rounded-md hover:bg-bone-2 flex items-center justify-center transition"
        title="Aksi"
      >
        <I.MoreH size={16} />
      </button>

      {open && (
        <div className="absolute right-0 top-9 z-50 bg-white hairline rounded-xl shadow-xl w-44 py-1 text-sm">
          <button
            onClick={() => { setOpen(false); onEdit(user) }}
            className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-bone-2 transition text-left"
          >
            <I.Edit size={14} className="text-ink-4 shrink-0" /> Edit
          </button>
          <button
            onClick={() => { setOpen(false); onResetPassword(user) }}
            className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-bone-2 transition text-left"
          >
            <I.Lock size={14} className="text-warn shrink-0" /> Reset Password
          </button>
          <div className="my-1 border-t border-ink/5" />
          <button
            onClick={() => { setOpen(false); onToggleStatus(user) }}
            className={cls(
              'w-full flex items-center gap-2.5 px-3 py-2 hover:bg-bone-2 transition text-left font-semibold',
              user.status === 'active' ? 'text-bad' : 'text-ok',
            )}
          >
            {user.status === 'active'
              ? <><I.Stop  size={14} className="shrink-0" /> Nonaktifkan</>
              : <><I.Check size={14} className="shrink-0" /> Aktifkan</>
            }
          </button>
        </div>
      )}
    </div>
  )
}

// ── Add User Modal ─────────────────────────────────────────────────────────
function AddUserModal({ branches, onSave, onClose }) {
  const [form, setForm] = useState({
    name: '', email: '', password: '', phone: '',
    role: 'kasir', branch_id: '', status: 'active',
    duration: '1m',
  })
  const [showPw,   setShowPw]   = useState(false)
  const [errors,   setErrors]   = useState({})
  const [loading,  setLoading]  = useState(false)
  const [success,  setSuccess]  = useState(null)

  // Tier auto from selected branch
  const selectedBranch = branches.find(b => String(b.id) === String(form.branch_id))
  const branchTierName  = selectedBranch?.tier_name ?? null
  const branchTierPrice = selectedBranch?.tier_price ?? 0

  function field(key) {
    return e => {
      setForm(f => ({ ...f, [key]: e.target.value }))
      setErrors(er => ({ ...er, [key]: undefined, _general: undefined }))
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setErrors({})

    const payload = {
      name:      form.name,
      email:     form.email,
      password:  form.password,
      role:      form.role,
      status:    form.status,
      ...(form.phone     && { phone:     form.phone }),
      ...(form.branch_id && { branch_id: Number(form.branch_id) }),
      ...(form.role === 'member' && {
        duration: form.duration,
      }),
    }

    try {
      const res = await api.post('/api/admin/users', payload)
      setSuccess(res.data.data)
    } catch (err) {
      setErrors(err.response?.status === 422
        ? (err.response.data.errors ?? {})
        : { _general: err.response?.data?.message ?? 'Terjadi kesalahan.' }
      )
    } finally {
      setLoading(false)
    }
  }

  /* ── Success screen ── */
  if (success) {
    return (
      <div className="fixed inset-0 z-50 bg-ink/60 flex items-center justify-center p-4" onClick={onClose}>
        <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4" onClick={e => e.stopPropagation()}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-ok/15 flex items-center justify-center shrink-0">
              <I.Check size={20} className="text-ok" />
            </div>
            <div>
              <div className="font-bold">User berhasil dibuat</div>
              <div className="text-xs text-ink-4">{success.name} · {success.role}</div>
            </div>
          </div>
          {success.member_code && (
            <div className="bg-bone rounded-lg p-4 space-y-1.5 text-sm">
              <div><span className="micro text-ink-4">MEMBER CODE</span><div className="font-mono font-bold">{success.member_code}</div></div>
              <div><span className="micro text-ink-4">TIER</span><div className="font-semibold">{success.tier}</div></div>
              <div><span className="micro text-ink-4">BERLAKU S/D</span><div className="font-semibold">{success.expires_date}</div></div>
            </div>
          )}
          <div className="flex gap-2 pt-1">
            <button onClick={() => { setSuccess(null); setForm({ name: '', email: '', password: '', phone: '', role: 'kasir', branch_id: '', status: 'active', duration: '1m' }) }}
              className="flex-1 h-9 rounded-lg hairline text-sm font-semibold hover:bg-bone-2 transition"
            >
              Tambah lagi
            </button>
            <button onClick={onSave} className="flex-1 h-9 rounded-lg bg-ink text-white text-sm font-bold hover:bg-ink-2 transition">
              Selesai
            </button>
          </div>
        </div>
      </div>
    )
  }

  const needsBranch = ['kasir', 'trainer', 'member'].includes(form.role)
  const DURATION_LABELS = { '1d': '1 Hari', '1w': '1 Minggu', '1m': '1 Bulan', '3m': '3 Bulan' }

  return (
    <div className="fixed inset-0 z-50 bg-ink/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="hairline-b px-6 py-4 flex items-center justify-between shrink-0">
          <div className="font-bold text-lg">Tambah User</div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-bone-2 flex items-center justify-center">
            <I.X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto">
          <div className="p-6 space-y-4">
            {errors._general && (
              <div className="bg-bad/10 text-bad text-sm rounded-lg px-3 py-2">{errors._general}</div>
            )}

            {/* Role selector */}
            <div>
              <div className="micro text-ink-4 mb-2">ROLE</div>
              <div className="grid grid-cols-4 gap-2">
                {ROLES.map(r => (
                  <button key={r} type="button"
                    onClick={() => { setForm(f => ({ ...f, role: r, branch_id: '' })); setErrors({}) }}
                    className={cls(
                      'h-9 rounded-lg text-sm font-semibold transition border capitalize',
                      form.role === r ? 'bg-ink text-white border-ink' : 'bg-white border-ink/10 hover:bg-bone-2',
                    )}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Basic info */}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <div className="micro text-ink-4 mb-1">NAMA LENGKAP *</div>
                <input value={form.name} onChange={field('name')} required placeholder="Nama lengkap"
                  className="w-full h-9 px-3 hairline rounded-lg text-sm focus:outline-none focus-ring" />
                {errors.name && <p className="text-bad text-xs mt-1">{errors.name[0]}</p>}
              </div>
              <div className="col-span-2">
                <div className="micro text-ink-4 mb-1">EMAIL *</div>
                <input type="email" value={form.email} onChange={field('email')} required
                  className="w-full h-9 px-3 hairline rounded-lg text-sm focus:outline-none focus-ring" />
                {errors.email && <p className="text-bad text-xs mt-1">{errors.email[0]}</p>}
              </div>
              <div>
                <div className="micro text-ink-4 mb-1">PASSWORD *</div>
                <div className="relative">
                  <input type={showPw ? 'text' : 'password'} value={form.password} onChange={field('password')} required minLength={8}
                    className="w-full h-9 pl-3 pr-9 hairline rounded-lg text-sm focus:outline-none focus-ring" />
                  <button type="button" onClick={() => setShowPw(s => !s)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-4 hover:text-ink">
                    {showPw ? <I.EyeOff size={14} /> : <I.Eye size={14} />}
                  </button>
                </div>
                {errors.password && <p className="text-bad text-xs mt-1">{errors.password[0]}</p>}
              </div>
              <div>
                <div className="micro text-ink-4 mb-1">TELEPON</div>
                <input value={form.phone} onChange={field('phone')} placeholder="+628..."
                  className="w-full h-9 px-3 hairline rounded-lg text-sm focus:outline-none focus-ring" />
              </div>
            </div>

            {/* Branch */}
            {needsBranch && (
              <div>
                <div className="micro text-ink-4 mb-1">CABANG *</div>
                <select value={form.branch_id} onChange={field('branch_id')} required
                  className="w-full h-9 px-3 hairline rounded-lg text-sm bg-white focus:outline-none focus-ring">
                  <option value="">Pilih cabang...</option>
                  {branches.map(b => <option key={b.id} value={String(b.id)}>{b.name}</option>)}
                </select>
                {errors.branch_id && <p className="text-bad text-xs mt-1">{errors.branch_id[0]}</p>}
              </div>
            )}

            {/* Member-only: tier + duration */}
            {form.role === 'member' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="micro text-ink-4 mb-1">TIER</div>
                  {!branchTierName ? (
                    <div className="text-xs text-ink-4 py-2">Pilih cabang terlebih dahulu</div>
                  ) : (
                    <div className="h-9 px-3 bg-bone-2 hairline rounded-lg text-sm flex items-center justify-between font-semibold">
                      <span>{branchTierName}</span>
                      <span className="text-ink-4 text-xs">Rp {Number(branchTierPrice).toLocaleString('id-ID')}</span>
                    </div>
                  )}
                </div>
                <div>
                  <div className="micro text-ink-4 mb-1">DURASI KEANGGOTAAN *</div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {Object.entries(DURATION_LABELS).map(([key, label]) => (
                      <button key={key} type="button"
                        onClick={() => setForm(f => ({ ...f, duration: key }))}
                        className={cls(
                          'py-2 rounded-lg text-xs font-semibold hairline transition',
                          form.duration === key ? 'bg-ink text-white border-ink' : 'hover:bg-bone-2',
                        )}>
                        {label}
                      </button>
                    ))}
                  </div>
                  {errors.duration && <p className="text-bad text-xs mt-1">{errors.duration[0]}</p>}
                </div>
                {branchTierPrice > 0 && (
                  <div className="col-span-2 bg-pop/15 rounded-lg px-3 py-2 text-sm font-bold">
                    Harga Tier: Rp {Number(branchTierPrice).toLocaleString('id-ID')} / bln
                  </div>
                )}
              </div>
            )}

            {/* Status */}
            <div className="flex items-center gap-3">
              <span className="micro text-ink-4">STATUS</span>
              <div className="flex gap-2">
                {['active', 'inactive'].map(s => (
                  <button key={s} type="button"
                    onClick={() => setForm(f => ({ ...f, status: s }))}
                    className={cls(
                      'px-3 h-7 rounded-full text-xs font-semibold transition border',
                      form.status === s
                        ? (s === 'active' ? 'bg-ok text-white border-ok' : 'bg-bad text-white border-bad')
                        : 'bg-white border-ink/10 hover:bg-bone-2',
                    )}
                  >
                    {s === 'active' ? 'Aktif' : 'Nonaktif'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="hairline-t px-6 py-4 flex gap-2 shrink-0">
            <button type="button" onClick={onClose} className="flex-1 h-9 rounded-lg hairline text-sm font-semibold hover:bg-bone-2 transition">
              Batal
            </button>
            <button type="submit" disabled={loading} className="flex-1 h-9 rounded-lg bg-ink text-white text-sm font-bold hover:bg-ink-2 transition disabled:opacity-60">
              {loading ? 'Menyimpan...' : 'Tambah User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Edit User Modal ────────────────────────────────────────────────────────
function EditUserModal({ user, branches, onSave, onClose }) {
  const [form, setForm] = useState({
    name:      user.name,
    email:     user.email,
    phone:     user.phone ?? '',
    role:      user.role,
    branch_id: user.branch?.id ? String(user.branch.id) : '',
    status:    user.status,
  })
  const [errors,  setErrors]  = useState({})
  const [loading, setLoading] = useState(false)

  function field(key) {
    return e => {
      setForm(f => ({ ...f, [key]: e.target.value }))
      setErrors(er => ({ ...er, [key]: undefined, _general: undefined }))
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setErrors({})

    try {
      await api.put(`/api/admin/users/${user.id}`, {
        name:      form.name,
        email:     form.email,
        phone:     form.phone || undefined,
        role:      form.role,
        branch_id: form.branch_id ? Number(form.branch_id) : undefined,
        status:    form.status,
      })
      onSave()
    } catch (err) {
      setErrors(err.response?.status === 422
        ? (err.response.data.errors ?? {})
        : { _general: err.response?.data?.message ?? 'Terjadi kesalahan.' }
      )
    } finally {
      setLoading(false)
    }
  }

  const needsBranch = ['kasir', 'trainer', 'member'].includes(form.role)

  return (
    <div className="fixed inset-0 z-50 bg-ink/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="hairline-b px-6 py-4 flex items-center justify-between">
          <div className="font-bold text-lg">Edit User</div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-bone-2 flex items-center justify-center">
            <I.X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errors._general && (
            <div className="bg-bad/10 text-bad text-sm rounded-lg px-3 py-2">{errors._general}</div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <div className="micro text-ink-4 mb-1">NAMA LENGKAP *</div>
              <input value={form.name} onChange={field('name')} required
                className="w-full h-9 px-3 hairline rounded-lg text-sm focus:outline-none focus-ring" />
              {errors.name && <p className="text-bad text-xs mt-1">{errors.name[0]}</p>}
            </div>
            <div className="col-span-2">
              <div className="micro text-ink-4 mb-1">EMAIL *</div>
              <input type="email" value={form.email} onChange={field('email')} required
                className="w-full h-9 px-3 hairline rounded-lg text-sm focus:outline-none focus-ring" />
              {errors.email && <p className="text-bad text-xs mt-1">{errors.email[0]}</p>}
            </div>
            <div>
              <div className="micro text-ink-4 mb-1">TELEPON</div>
              <input value={form.phone} onChange={field('phone')}
                className="w-full h-9 px-3 hairline rounded-lg text-sm focus:outline-none focus-ring" />
            </div>
            <div>
              <div className="micro text-ink-4 mb-1">ROLE</div>
              <select value={form.role} onChange={e => { field('role')(e); setForm(f => ({ ...f, branch_id: '' })) }}
                className="w-full h-9 px-3 hairline rounded-lg text-sm bg-white focus:outline-none focus-ring">
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>

          {needsBranch && (
            <div>
              <div className="micro text-ink-4 mb-1">CABANG *</div>
              <select value={form.branch_id} onChange={field('branch_id')} required
                className="w-full h-9 px-3 hairline rounded-lg text-sm bg-white focus:outline-none focus-ring">
                <option value="">Pilih cabang...</option>
                {branches.map(b => <option key={b.id} value={String(b.id)}>{b.name}</option>)}
              </select>
              {errors.branch_id && <p className="text-bad text-xs mt-1">{errors.branch_id[0]}</p>}
            </div>
          )}

          <div>
            <div className="micro text-ink-4 mb-2">STATUS</div>
            <div className="flex gap-2">
              {['active', 'inactive'].map(s => (
                <button key={s} type="button"
                  onClick={() => setForm(f => ({ ...f, status: s }))}
                  className={cls(
                    'px-3 h-7 rounded-full text-xs font-semibold transition border',
                    form.status === s
                      ? (s === 'active' ? 'bg-ok text-white border-ok' : 'bg-bad text-white border-bad')
                      : 'bg-white border-ink/10 hover:bg-bone-2',
                  )}
                >
                  {s === 'active' ? 'Aktif' : 'Nonaktif'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 h-9 rounded-lg hairline text-sm font-semibold hover:bg-bone-2 transition">
              Batal
            </button>
            <button type="submit" disabled={loading} className="flex-1 h-9 rounded-lg bg-ink text-white text-sm font-bold hover:bg-ink-2 transition disabled:opacity-60">
              {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Reset Password Modal ───────────────────────────────────────────────────
function ResetPasswordModal({ user, onClose, showToast }) {
  const [mode,        setMode]        = useState('generate')
  const [password,    setPassword]    = useState('')
  const [showPw,      setShowPw]      = useState(false)
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState('')
  const [result,      setResult]      = useState(null)
  const [copied,      setCopied]      = useState(false)

  async function handleReset() {
    if (mode === 'manual' && password.length < 8) {
      setError('Password minimal 8 karakter.')
      return
    }
    setLoading(true)
    setError('')

    try {
      const res = await api.post(`/api/admin/users/${user.id}/reset-password`, {
        mode,
        ...(mode === 'manual' && { password }),
      })
      if (mode === 'generate') {
        setResult(res.data.new_password)
      } else {
        showToast('Password berhasil direset.')
        onClose()
      }
    } catch (err) {
      setError(err.response?.data?.message ?? 'Terjadi kesalahan.')
    } finally {
      setLoading(false)
    }
  }

  function copyPassword() {
    navigator.clipboard.writeText(result).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="fixed inset-0 z-50 bg-ink/60 flex items-center justify-center p-4" onClick={result ? undefined : onClose}>
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="hairline-b px-6 py-4 flex items-center justify-between">
          <div className="font-bold text-lg">Reset Password</div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-bone-2 flex items-center justify-center">
            <I.X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* User info */}
          <div className="flex items-center gap-3 p-3 bg-bone rounded-lg">
            <Avatar name={user.name} size={36} />
            <div>
              <div className="font-semibold text-sm">{user.name}</div>
              <div className="text-xs text-ink-4">{user.email}</div>
            </div>
          </div>

          {result !== null ? (
            /* Generated password result */
            <div className="space-y-3">
              <div className="bg-ok/10 rounded-lg px-4 py-3">
                <div className="micro text-ink-4 mb-2">PASSWORD BARU</div>
                <div className="flex items-center gap-2">
                  <div className="font-mono font-bold text-base flex-1 tracking-wider break-all">{result}</div>
                  <button
                    onClick={copyPassword}
                    className={cls(
                      'flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-semibold transition shrink-0',
                      copied ? 'bg-ok text-white' : 'bg-ink/10 hover:bg-ink/20',
                    )}
                  >
                    <I.Copy size={12} /> {copied ? 'Tersalin!' : 'Salin'}
                  </button>
                </div>
              </div>
              <p className="text-xs text-ink-4">Catat password baru ini sebelum menutup dialog.</p>
              <button onClick={onClose} className="w-full h-9 rounded-lg bg-ink text-white text-sm font-bold hover:bg-ink-2 transition">
                Tutup
              </button>
            </div>
          ) : (
            /* Mode selection + input */
            <>
              <div>
                <div className="micro text-ink-4 mb-2">MODE RESET</div>
                <div className="grid grid-cols-2 gap-2">
                  {[['generate', 'Auto-generate'], ['manual', 'Manual']].map(([v, label]) => (
                    <button key={v} type="button"
                      onClick={() => { setMode(v); setError(''); setPassword('') }}
                      className={cls(
                        'h-9 rounded-lg text-sm font-semibold transition border',
                        mode === v ? 'bg-ink text-white border-ink' : 'bg-white border-ink/10 hover:bg-bone-2',
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {mode === 'manual' && (
                <div>
                  <div className="micro text-ink-4 mb-1">PASSWORD BARU *</div>
                  <div className="relative">
                    <input
                      type={showPw ? 'text' : 'password'}
                      value={password}
                      onChange={e => { setPassword(e.target.value); setError('') }}
                      placeholder="Min. 8 karakter"
                      className="w-full h-9 pl-3 pr-9 hairline rounded-lg text-sm focus:outline-none focus-ring"
                    />
                    <button type="button" onClick={() => setShowPw(s => !s)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-4 hover:text-ink">
                      {showPw ? <I.EyeOff size={14} /> : <I.Eye size={14} />}
                    </button>
                  </div>
                </div>
              )}

              {error && <p className="text-bad text-sm">{error}</p>}

              <div className="flex gap-2">
                <button type="button" onClick={onClose} className="flex-1 h-9 rounded-lg hairline text-sm font-semibold hover:bg-bone-2 transition">
                  Batal
                </button>
                <button
                  onClick={handleReset}
                  disabled={loading}
                  className="flex-1 h-9 rounded-lg bg-warn text-white text-sm font-bold hover:bg-warn/80 transition disabled:opacity-60"
                >
                  {loading ? 'Mereset...' : 'Reset Password'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function AdminUsersPage() {
  const [users,      setUsers]      = useState([])
  const [branches,   setBranches]   = useState([])  // pre-fetched untuk dropdown
  const [pagination, setPagination] = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [page,       setPage]       = useState(1)
  const [q,          setQ]          = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statFilter, setStatFilter] = useState('')
  const [toast,      setToast]      = useState(null)
  const [tick,       setTick]       = useState(0)
  const [addModal,   setAddModal]   = useState(false)
  const [editUser,   setEditUser]   = useState(null)
  const [resetUser,  setResetUser]  = useState(null)

  const timerRef = useRef(null)

  // Pre-fetch branches (includes tier info) untuk dropdown
  useEffect(() => {
    api.get('/api/branches/options')
      .then(r => {
        const list = Array.isArray(r.data?.data) ? r.data.data : []
        setBranches(list)
      })
      .catch(() => {})
  }, [])

  function showToast(message, tone = 'ok') {
    setToast({ message, tone })
    setTimeout(() => setToast(null), 3000)
  }

  function reload() { setTick(t => t + 1) }

  useEffect(() => {
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      setLoading(true)
      const qs = new URLSearchParams({ page: String(page) })
      if (q)          qs.set('q',        q)
      if (roleFilter) qs.set('role',     roleFilter)
      if (statFilter) qs.set('status',   statFilter)

      api.get(`/api/admin/users?${qs}`)
        .then(r => {
          setUsers(r.data.data)
          setPagination(r.data.pagination)
        })
        .finally(() => setLoading(false))
    }, q ? 400 : 0)
  }, [q, roleFilter, statFilter, page, tick])

  async function handleToggleStatus(user) {
    const next = user.status === 'active' ? 'inactive' : 'active'
    try {
      await api.patch(`/api/admin/users/${user.id}/status`, { status: next })
      showToast(`User ${next === 'active' ? 'diaktifkan' : 'dinonaktifkan'}.`)
      reload()
    } catch {
      showToast('Gagal mengubah status.', 'bad')
    }
  }

  function clearFilters() { setQ(''); setRoleFilter(''); setStatFilter(''); setPage(1) }
  const hasFilter = q || roleFilter || statFilter

  return (
    <div className="p-4 md:p-6 space-y-5 pb-24 lg:pb-6">

      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="text-xl font-black">Staff &amp; Members</div>
          <div className="text-sm text-ink-4">Kelola akun, reset password, dan status akses.</div>
        </div>
        <button
          onClick={() => setAddModal(true)}
          className="flex items-center gap-2 px-4 h-9 bg-ink text-white rounded-lg text-sm font-bold hover:bg-ink-2 transition"
        >
          <I.Plus size={14} /> Tambah User
        </button>
      </div>

      {/* Filter bar */}
      <div className="bg-white hairline rounded-xl p-3 flex flex-wrap gap-2 items-center">
        <div className="flex-1 min-w-[180px] relative">
          <I.Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-4 pointer-events-none" />
          <input
            value={q}
            onChange={e => { setQ(e.target.value); setPage(1) }}
            placeholder="Cari nama atau email..."
            className="w-full h-9 pl-8 pr-3 hairline rounded-lg text-sm focus:outline-none focus-ring"
          />
        </div>
        <select value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(1) }}
          className="h-9 px-3 hairline rounded-lg text-sm bg-white focus:outline-none cursor-pointer">
          <option value="">Semua Role</option>
          {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <select value={statFilter} onChange={e => { setStatFilter(e.target.value); setPage(1) }}
          className="h-9 px-3 hairline rounded-lg text-sm bg-white focus:outline-none cursor-pointer">
          <option value="">Semua Status</option>
          <option value="active">Aktif</option>
          <option value="inactive">Nonaktif</option>
        </select>
        {hasFilter && (
          <button onClick={clearFilters} className="text-xs text-ink-4 hover:text-ink underline px-1">
            Reset filter
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white hairline rounded-xl overflow-hidden">
        {loading ? (
          <div className="py-12 flex justify-center">
            <div className="w-6 h-6 border-2 border-pop border-t-transparent rounded-full animate-spin" />
          </div>
        ) : users.length === 0 ? (
          <div className="py-12 text-center text-ink-4 text-sm">
            {hasFilter ? 'Tidak ada user yang cocok dengan filter.' : 'Belum ada user.'}
          </div>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="hairline-b bg-bone-2 text-ink-4">
                    <th className="text-left px-4 py-2.5 micro font-medium">USER</th>
                    <th className="text-left px-4 py-2.5 micro font-medium">ROLE</th>
                    <th className="text-left px-4 py-2.5 micro font-medium">CABANG</th>
                    <th className="text-left px-4 py-2.5 micro font-medium">STATUS</th>
                    <th className="px-4 py-2.5 w-12" />
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} className="hairline-b last:border-0 hover:bg-bone-2/40 transition">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={u.name} size={32} />
                          <div>
                            <div className="font-semibold">{u.name}</div>
                            <div className="text-xs text-ink-4">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cls('chip text-xs font-bold capitalize', ROLE_CHIP[u.role] ?? 'bg-bone-2')}>{u.role}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-ink-4">{u.branch?.name ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className={cls('chip text-xs font-bold', STATUS_CHIP[u.status])}>
                          {u.status === 'active' ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <RowActions
                          user={u}
                          onEdit={setEditUser}
                          onResetPassword={setResetUser}
                          onToggleStatus={handleToggleStatus}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-ink/5">
              {users.map(u => (
                <div key={u.id} className="flex items-center gap-3 px-4 py-3">
                  <Avatar name={u.name} size={36} />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">{u.name}</div>
                    <div className="text-xs text-ink-4 truncate">{u.email}</div>
                    <div className="flex gap-1.5 mt-1">
                      <span className={cls('chip text-[10px] font-bold capitalize', ROLE_CHIP[u.role] ?? 'bg-bone-2')}>{u.role}</span>
                      <span className={cls('chip text-[10px] font-bold', STATUS_CHIP[u.status])}>
                        {u.status === 'active' ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </div>
                  </div>
                  <RowActions
                    user={u}
                    onEdit={setEditUser}
                    onResetPassword={setResetUser}
                    onToggleStatus={handleToggleStatus}
                  />
                </div>
              ))}
            </div>

            {/* Pagination */}
            {pagination && pagination.last_page > 1 && (
              <div className="flex items-center justify-between px-4 py-3 hairline-t">
                <div className="text-xs text-ink-4">
                  {pagination.total} user · hal. {pagination.current_page}/{pagination.last_page}
                </div>
                <div className="flex gap-1">
                  {Array.from({ length: pagination.last_page }, (_, i) => i + 1).map(p => (
                    <button key={p} onClick={() => setPage(p)}
                      className={cls(
                        'w-8 h-8 rounded-md text-xs font-semibold transition',
                        p === pagination.current_page ? 'bg-ink text-white' : 'hover:bg-bone-2',
                      )}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Toast */}
      {toast && <Toast {...toast} />}

      {/* Modals */}
      {addModal && (
        <AddUserModal
          branches={branches}
          onSave={() => { setAddModal(false); showToast('User berhasil ditambahkan.'); reload() }}
          onClose={() => setAddModal(false)}
        />
      )}
      {editUser && (
        <EditUserModal
          user={editUser}
          branches={branches}
          onSave={() => { setEditUser(null); showToast('User berhasil diupdate.'); reload() }}
          onClose={() => setEditUser(null)}
        />
      )}
      {resetUser && (
        <ResetPasswordModal
          user={resetUser}
          onClose={() => setResetUser(null)}
          showToast={showToast}
        />
      )}
    </div>
  )
}
