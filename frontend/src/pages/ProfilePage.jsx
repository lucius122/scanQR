import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import api from '../lib/axios'
import { Avatar, Badge, Button, Modal } from '../components/ui'
import * as I from '../components/icons'
import { cls } from '../lib/utils'

const ROLE_LABEL = { admin: 'Admin', kasir: 'Kasir', member: 'Member', trainer: 'Trainer' }
const TIER_TONE  = { Basic: 'outline', Premium: 'pop', VIP: 'ink' }

// ── Komponen field readonly dengan ikon 🔒 ───────────────────────────────────
function ReadonlyField({ label, value, children }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-[11px] font-bold tracking-widest text-ink-4 uppercase">{label}</span>
        <I.Lock size={11} className="text-ink-4" />
      </div>
      {children ?? (
        <div className="h-10 px-3 flex items-center bg-bone-2 border border-ink/10 rounded-lg text-sm text-ink-3 select-none">
          {value ?? '—'}
        </div>
      )}
    </div>
  )
}

// ── Modal ubah password ───────────────────────────────────────────────────────
function ChangePasswordModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({
    current_password:          '',
    new_password:              '',
    new_password_confirmation: '',
  })
  const [errors,  setErrors]  = useState({})
  const [loading, setLoading] = useState(false)
  const [showCur, setShowCur] = useState(false)
  const [showNew, setShowNew] = useState(false)

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
      await api.put('/api/profile/password', form)
      onSuccess()
    } catch (err) {
      if (err.response?.status === 422) {
        setErrors(err.response.data.errors ?? {})
      } else {
        setErrors({ _general: err.response?.data?.message ?? 'Gagal mengubah password.' })
      }
    } finally {
      setLoading(false)
    }
  }

  const inputCls = 'w-full h-10 px-3 bg-white hairline rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pop/30'

  return (
    <Modal title="Ubah Password" onClose={onClose} size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        {errors._general && (
          <div className="text-sm text-bad bg-bad/5 border border-bad/20 rounded-lg px-3 py-2">
            {errors._general}
          </div>
        )}

        {/* Password lama */}
        <div>
          <label className="micro text-ink-4 mb-1.5 block">PASSWORD LAMA</label>
          <div className="relative">
            <input
              type={showCur ? 'text' : 'password'}
              value={form.current_password}
              onChange={field('current_password')}
              className={cls(inputCls, errors.current_password && 'border-bad ring-1 ring-bad/30')}
              placeholder="Password saat ini"
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowCur(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-4 hover:text-ink"
            >
              {showCur ? <I.EyeOff size={15} /> : <I.Eye size={15} />}
            </button>
          </div>
          {errors.current_password && (
            <p className="text-bad text-xs mt-1">{errors.current_password[0]}</p>
          )}
        </div>

        {/* Password baru */}
        <div>
          <label className="micro text-ink-4 mb-1.5 block">PASSWORD BARU</label>
          <div className="relative">
            <input
              type={showNew ? 'text' : 'password'}
              value={form.new_password}
              onChange={field('new_password')}
              className={cls(inputCls, errors.new_password && 'border-bad ring-1 ring-bad/30')}
              placeholder="Minimal 8 karakter"
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowNew(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-4 hover:text-ink"
            >
              {showNew ? <I.EyeOff size={15} /> : <I.Eye size={15} />}
            </button>
          </div>
          {errors.new_password && (
            <p className="text-bad text-xs mt-1">{errors.new_password[0]}</p>
          )}
        </div>

        {/* Konfirmasi */}
        <div>
          <label className="micro text-ink-4 mb-1.5 block">KONFIRMASI PASSWORD BARU</label>
          <input
            type="password"
            value={form.new_password_confirmation}
            onChange={field('new_password_confirmation')}
            className={cls(inputCls, errors.new_password_confirmation && 'border-bad ring-1 ring-bad/30')}
            placeholder="Ulangi password baru"
            autoComplete="new-password"
          />
          {errors.new_password_confirmation && (
            <p className="text-bad text-xs mt-1">{errors.new_password_confirmation[0]}</p>
          )}
        </div>

        <div className="flex gap-2 justify-end pt-1">
          <Button variant="outline" onClick={onClose} type="button" size="sm">Batal</Button>
          <Button variant="pop" type="submit" disabled={loading} size="sm">
            {loading ? 'Menyimpan…' : 'Ubah Password'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

// ── Halaman utama ─────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const { user, refreshUser } = useAuth()

  const [profile, setProfile] = useState(null)
  const [loadingProfile, setLoadingProfile] = useState(true)

  const [form, setForm] = useState({ name: '', phone: '', address: '' })
  const [errors, setErrors]   = useState({})
  const [saving, setSaving]   = useState(false)
  const [toast,  setToast]    = useState(null)
  const toastTimer = useRef(null)

  const [showPasswordModal, setShowPasswordModal] = useState(false)

  function showToast(message, tone = 'ok') {
    clearTimeout(toastTimer.current)
    setToast({ message, tone })
    toastTimer.current = setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    api.get('/api/profile')
      .then(r => {
        setProfile(r.data.data)
        setForm({
          name:    r.data.data.name    ?? '',
          phone:   r.data.data.phone   ?? '',
          address: r.data.data.address ?? '',
        })
      })
      .catch(() => showToast('Gagal memuat data profil.', 'bad'))
      .finally(() => setLoadingProfile(false))
  }, [])

  function fieldHandler(key) {
    return e => {
      setForm(f => ({ ...f, [key]: e.target.value }))
      setErrors(er => ({ ...er, [key]: undefined }))
    }
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setErrors({})
    try {
      await api.put('/api/profile', form)
      await refreshUser()
      setProfile(p => ({ ...p, ...form }))
      showToast('Profil berhasil diperbarui.')
    } catch (err) {
      if (err.response?.status === 422) {
        setErrors(err.response.data.errors ?? {})
      } else {
        showToast('Gagal menyimpan profil.', 'bad')
      }
    } finally {
      setSaving(false)
    }
  }

  async function handlePasswordSuccess() {
    setShowPasswordModal(false)
    await refreshUser()
    showToast('Password berhasil diubah.')
  }

  const inputCls = 'w-full h-10 px-3 bg-white hairline rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pop/30'

  if (loadingProfile) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-pop border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-[680px] mx-auto px-4 md:px-6 py-6 pb-24 lg:pb-8">

      {/* ── Header card ── */}
      <div className="bg-ink on-dark text-white rounded-xl p-5 mb-5 flex items-center gap-4">
        <Avatar name={profile?.name ?? user?.name ?? '?'} size={56} accent />
        <div className="flex-1 min-w-0">
          <div className="text-xl font-black truncate">{profile?.name ?? user?.name}</div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <Badge tone="pop">{ROLE_LABEL[profile?.role] ?? profile?.role}</Badge>
            {profile?.branch && (
              <span className="text-white/50 text-xs">{profile.branch.name}</span>
            )}
          </div>
        </div>
        {profile?.must_change_password && (
          <div className="shrink-0">
            <Badge tone="bad">Password Default</Badge>
          </div>
        )}
      </div>

      {/* ── Member card (hanya untuk role member) ── */}
      {profile?.member && (
        <div className="bg-white hairline rounded-xl p-4 mb-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-pop/10 flex items-center justify-center shrink-0">
            <I.Qr size={20} className="text-pop" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-ink-4 font-bold tracking-widest mb-0.5">MEMBER CODE</div>
            <div className="font-mono font-bold">{profile.member.member_code}</div>
          </div>
          <div className="text-right shrink-0">
            <Badge tone={TIER_TONE[profile.member.tier] ?? 'outline'}>{profile.member.tier}</Badge>
            <div className="text-xs text-ink-4 mt-1">s/d {profile.member.expires_date}</div>
          </div>
        </div>
      )}

      {/* ── Form edit ── */}
      <form onSubmit={handleSave} className="bg-white hairline rounded-xl overflow-hidden mb-5">
        <div className="p-4 hairline-b flex items-center gap-2">
          <I.User size={16} className="text-ink-4" />
          <span className="font-bold text-sm">Data Pribadi</span>
        </div>

        <div className="p-4 md:p-5 space-y-4">
          {/* Nama */}
          <div>
            <label className="micro text-ink-4 mb-1.5 block">NAMA LENGKAP</label>
            <input
              type="text"
              value={form.name}
              onChange={fieldHandler('name')}
              className={cls(inputCls, errors.name && 'border-bad ring-1 ring-bad/30')}
              placeholder="Nama lengkap"
            />
            {errors.name && <p className="text-bad text-xs mt-1">{errors.name[0]}</p>}
          </div>

          {/* No. Telepon */}
          <div>
            <label className="micro text-ink-4 mb-1.5 block">NO. TELEPON</label>
            <input
              type="tel"
              value={form.phone}
              onChange={fieldHandler('phone')}
              className={cls(inputCls, errors.phone && 'border-bad ring-1 ring-bad/30')}
              placeholder="08xxxxxxxxxx"
            />
            {errors.phone && <p className="text-bad text-xs mt-1">{errors.phone[0]}</p>}
          </div>

          {/* Alamat */}
          <div>
            <label className="micro text-ink-4 mb-1.5 block">ALAMAT</label>
            <textarea
              value={form.address}
              onChange={fieldHandler('address')}
              rows={3}
              className={cls(
                'w-full px-3 py-2 bg-white hairline rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-pop/30',
                errors.address && 'border-bad ring-1 ring-bad/30',
              )}
              placeholder="Alamat lengkap (opsional)"
            />
            {errors.address && <p className="text-bad text-xs mt-1">{errors.address[0]}</p>}
          </div>

          {/* Readonly fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 hairline-t">
            <ReadonlyField label="Email" value={profile?.email} />
            <ReadonlyField label="Role">
              <div className="h-10 px-3 flex items-center bg-bone-2 border border-ink/10 rounded-lg">
                <Badge tone={profile?.role === 'member' ? 'pop' : 'outline'}>
                  {ROLE_LABEL[profile?.role] ?? profile?.role}
                </Badge>
              </div>
            </ReadonlyField>
            {profile?.branch && (
              <ReadonlyField label="Cabang" value={profile.branch.name} />
            )}
            {profile?.photo_url && (
              <ReadonlyField label="Foto Profil">
                <div className="h-10 px-3 flex items-center bg-bone-2 border border-ink/10 rounded-lg gap-2">
                  <img
                    src={profile.photo_url}
                    alt="foto"
                    className="w-6 h-6 rounded-full object-cover"
                  />
                  <span className="text-xs text-ink-3 truncate">Dikelola admin</span>
                </div>
              </ReadonlyField>
            )}
          </div>
        </div>

        <div className="px-4 md:px-5 py-3 hairline-t bg-bone-2 flex justify-end">
          <Button variant="pop" type="submit" disabled={saving} size="sm">
            {saving ? 'Menyimpan…' : 'Simpan Perubahan'}
          </Button>
        </div>
      </form>

      {/* ── Keamanan ── */}
      <div className="bg-white hairline rounded-xl overflow-hidden">
        <div className="p-4 hairline-b flex items-center gap-2">
          <I.Shield size={16} className="text-ink-4" />
          <span className="font-bold text-sm">Keamanan</span>
        </div>
        <div className="p-4 md:p-5 flex items-center justify-between gap-4">
          <div>
            <div className="font-semibold text-sm">Password Akun</div>
            <div className="text-xs text-ink-4 mt-0.5">
              {profile?.must_change_password
                ? 'Masih menggunakan password default — segera ganti.'
                : 'Ubah password secara berkala untuk keamanan akun.'}
            </div>
          </div>
          <Button
            variant={profile?.must_change_password ? 'pop' : 'outline'}
            size="sm"
            onClick={() => setShowPasswordModal(true)}
          >
            Ubah Password
          </Button>
        </div>
      </div>

      {/* ── Modal ubah password ── */}
      {showPasswordModal && (
        <ChangePasswordModal
          onClose={() => setShowPasswordModal(false)}
          onSuccess={handlePasswordSuccess}
        />
      )}

      {/* ── Toast ── */}
      {toast && (
        <div className={cls(
          'fixed bottom-24 right-4 md:bottom-6 md:right-6 z-[70]',
          'flex items-center gap-2.5 px-4 py-3 rounded-xl text-white text-sm font-semibold shadow-xl',
          'animate-toast-in',
          toast.tone === 'ok' ? 'bg-ok' : 'bg-bad',
        )}>
          {toast.tone === 'ok' ? <I.Check size={16} /> : <I.X size={16} />}
          {toast.message}
        </div>
      )}
    </div>
  )
}
