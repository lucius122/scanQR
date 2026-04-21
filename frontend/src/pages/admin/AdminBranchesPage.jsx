import { useEffect, useRef, useState } from 'react'
import api from '../../lib/axios'
import { Badge } from '../../components/ui'
import * as I from '../../components/icons'
import { cls } from '../../lib/utils'

const TIERS = ['Basic', 'Premium', 'VIP']

function formatRupiah(n) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n)
}

// ── Toast ─────────────────────────────────────────────────────────────────
function Toast({ message, tone = 'ok' }) {
  const bg = tone === 'ok' ? 'bg-ok' : tone === 'bad' ? 'bg-bad' : 'bg-warn'
  return (
    <div className={cls('fixed bottom-6 right-6 z-[70] flex items-center gap-2.5 px-4 py-3 rounded-xl text-white text-sm font-semibold shadow-xl', bg)}>
      {tone === 'ok' ? <I.Check size={16} /> : <I.X size={16} />}
      {message}
    </div>
  )
}

// ── Confirm Modal ─────────────────────────────────────────────────────────
function ConfirmModal({ title, body, onConfirm, onClose, danger = false }) {
  return (
    <div className="fixed inset-0 z-50 bg-ink/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <h3 className="font-bold text-lg">{title}</h3>
        <p className="text-sm text-ink-4">{body}</p>
        <div className="flex gap-2 justify-end pt-2">
          <button onClick={onClose} className="px-4 h-9 rounded-lg text-sm font-semibold hover:bg-bone-2 transition">Batal</button>
          <button
            onClick={onConfirm}
            className={cls('px-4 h-9 rounded-lg text-sm font-bold transition text-white', danger ? 'bg-bad hover:bg-bad/80' : 'bg-ink hover:bg-ink-2')}
          >
            Konfirmasi
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Branch Form Modal ─────────────────────────────────────────────────────
function BranchModal({ initial, onSave, onClose }) {
  const isEdit = Boolean(initial?.id)
  const tiersInit = {}
  TIERS.forEach(t => { tiersInit[t] = '' });
  (initial?.tiers ?? []).forEach(({ tier, price }) => { tiersInit[tier] = String(price) })

  const [form, setForm] = useState({
    name:          initial?.name          ?? '',
    address:       initial?.address       ?? '',
    phone:         initial?.phone         ?? '',
    opening_hours: initial?.opening_hours ?? '06:00-22:00',
  })
  const [tiers,   setTiers]   = useState(tiersInit)
  const [errors,  setErrors]  = useState({})
  const [loading, setLoading] = useState(false)

  function set(field) {
    return e => {
      setForm(f => ({ ...f, [field]: e.target.value }))
      setErrors(er => ({ ...er, [field]: undefined }))
    }
  }

  function setTier(tier) {
    return e => setTiers(t => ({ ...t, [tier]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setErrors({})

    const payload = {
      ...form,
      tiers: Object.fromEntries(
        Object.entries(tiers).filter(([, v]) => v !== '').map(([k, v]) => [k, Number(v)])
      ),
    }

    try {
      if (isEdit) {
        await api.put(`/api/admin/branches/${initial.id}`, payload)
      } else {
        await api.post('/api/admin/branches', payload)
      }
      onSave()
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

  const inputCls = (field) =>
    cls('w-full h-10 px-3 hairline rounded-md text-sm focus:outline-none focus-ring bg-white', errors[field] ? 'border-bad' : '')

  return (
    <div className="fixed inset-0 z-50 bg-ink/60 flex items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl my-6" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 hairline-b">
          <h2 className="font-black text-lg">{isEdit ? 'Edit Cabang' : 'Tambah Cabang'}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-bone-2 flex items-center justify-center transition">
            <I.X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {errors._general && (
            <div className="bg-bad/10 border border-bad/25 rounded-lg px-4 py-2.5 text-bad text-sm">
              {errors._general}
            </div>
          )}

          {/* Info cabang */}
          <div className="space-y-3">
            <div className="micro text-ink-4 pb-1 hairline-b">INFO CABANG</div>

            <div>
              <div className="micro text-ink-4 mb-1">NAMA CABANG</div>
              <input value={form.name} onChange={set('name')} placeholder="88 STRONG GYM Cabang 3"
                className={inputCls('name')} />
              {errors.name && <p className="text-[11px] text-bad mt-1">{errors.name[0]}</p>}
            </div>

            <div>
              <div className="micro text-ink-4 mb-1">ALAMAT</div>
              <textarea value={form.address} onChange={set('address')} rows={2}
                placeholder="Jl. Contoh No. 1, Jakarta"
                className={cls('w-full px-3 py-2 hairline rounded-md text-sm focus:outline-none focus-ring bg-white resize-none', errors.address ? 'border-bad' : '')} />
              {errors.address && <p className="text-[11px] text-bad mt-1">{errors.address[0]}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="micro text-ink-4 mb-1">TELEPON</div>
                <input value={form.phone} onChange={set('phone')} placeholder="021-xxxxxxx"
                  className={inputCls('phone')} />
                {errors.phone && <p className="text-[11px] text-bad mt-1">{errors.phone[0]}</p>}
              </div>
              <div>
                <div className="micro text-ink-4 mb-1">JAM OPERASIONAL</div>
                <input value={form.opening_hours} onChange={set('opening_hours')} placeholder="06:00-22:00"
                  className={inputCls('opening_hours')} />
              </div>
            </div>
          </div>

          {/* Tier pricing */}
          <div className="space-y-3">
            <div className="micro text-ink-4 pb-1 hairline-b">HARGA TIER (Rp)</div>
            {TIERS.map(t => (
              <div key={t} className="flex items-center gap-3">
                <span className="w-20 text-sm font-semibold shrink-0">{t}</span>
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-4 text-sm">Rp</span>
                  <input
                    type="number"
                    min="0"
                    value={tiers[t]}
                    onChange={setTier(t)}
                    placeholder="0"
                    className="w-full h-10 pl-9 pr-3 hairline rounded-md text-sm focus:outline-none focus-ring bg-white"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 h-10 rounded-xl hairline text-sm font-semibold hover:bg-bone-2 transition">
              Batal
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 h-10 rounded-xl bg-ink text-white text-sm font-bold hover:bg-ink-2 disabled:opacity-50 transition">
              {loading ? 'Menyimpan…' : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Branch Card ───────────────────────────────────────────────────────────
function BranchCard({ branch, onEdit, onToggleStatus, onDelete }) {
  const isActive = branch.status === 'active'
  return (
    <div className="bg-white hairline rounded-xl p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-bold text-[15px] leading-tight">{branch.name}</div>
          <div className="text-xs text-ink-4 mt-0.5">{branch.address}</div>
        </div>
        <Badge tone={isActive ? 'ok' : 'outline'}>{isActive ? 'Aktif' : 'Nonaktif'}</Badge>
      </div>

      <div className="flex flex-wrap gap-3 text-xs text-ink-4">
        <span className="flex items-center gap-1"><I.Clock size={12} /> {branch.opening_hours}</span>
        <span className="flex items-center gap-1"><I.Users size={12} /> {branch.member_count} member</span>
        {branch.phone && <span>{branch.phone}</span>}
      </div>

      {branch.tiers?.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {branch.tiers.map(t => (
            <span key={t.tier} className="mono text-[10px] bg-bone-2 rounded-md px-2 py-0.5">
              {t.tier}: {formatRupiah(t.price)}
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-2 pt-1 hairline-t">
        <button onClick={onEdit}
          className="flex items-center gap-1.5 px-3 h-8 text-xs font-semibold rounded-lg hover:bg-bone-2 transition">
          <I.Edit size={13} /> Edit
        </button>
        <button
          onClick={onToggleStatus}
          className={cls('flex items-center gap-1.5 px-3 h-8 text-xs font-semibold rounded-lg transition',
            isActive ? 'hover:bg-warn/10 text-warn' : 'hover:bg-ok/10 text-ok')}
        >
          {isActive ? <><I.Stop size={13} /> Nonaktifkan</> : <><I.Check size={13} /> Aktifkan</>}
        </button>
        <button onClick={onDelete}
          className="ml-auto flex items-center gap-1.5 px-3 h-8 text-xs font-semibold rounded-lg hover:bg-bad/10 text-bad transition">
          <I.Trash size={13} /> Hapus
        </button>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────
export default function AdminBranchesPage() {
  const [branches, setBranches] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [modal,    setModal]    = useState(null) // null | { mode: 'add' } | { mode: 'edit', data }
  const [confirm,  setConfirm]  = useState(null)
  const [toast,    setToast]    = useState(null)
  const toastTimer = useRef(null)

  function showToast(message, tone = 'ok') {
    clearTimeout(toastTimer.current)
    setToast({ message, tone })
    toastTimer.current = setTimeout(() => setToast(null), 2500)
  }

  async function load() {
    setLoading(true)
    try {
      const res = await api.get('/api/admin/branches')
      setBranches(res.data.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleToggleStatus(branch) {
    const newStatus = branch.status === 'active' ? 'inactive' : 'active'
    try {
      await api.patch(`/api/admin/branches/${branch.id}/status`, { status: newStatus })
      showToast(`${branch.name} berhasil ${newStatus === 'inactive' ? 'dinonaktifkan' : 'diaktifkan'}.`)
      load()
    } catch (err) {
      showToast(err.response?.data?.message ?? 'Gagal update status.', 'bad')
    }
    setConfirm(null)
  }

  async function handleDelete(branch) {
    try {
      await api.delete(`/api/admin/branches/${branch.id}`)
      showToast(`${branch.name} berhasil dihapus.`)
      load()
    } catch (err) {
      showToast(err.response?.data?.message ?? 'Gagal menghapus cabang.', 'bad')
    }
    setConfirm(null)
  }

  return (
    <div className="max-w-[1200px] mx-auto px-4 md:px-6 py-4 md:py-6 pb-24 lg:pb-6">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="micro text-ink-4">ADMIN</div>
          <h1 className="text-xl font-black tracking-tight">Kelola Cabang</h1>
        </div>
        <button
          onClick={() => setModal({ mode: 'add' })}
          className="flex items-center gap-2 px-4 h-9 bg-ink text-white text-sm font-bold rounded-xl hover:bg-ink-2 transition"
        >
          <I.Plus size={15} /> Tambah Cabang
        </button>
      </div>

      {/* Content */}
      {loading && (
        <div className="py-20 flex justify-center">
          <div className="w-7 h-7 border-2 border-pop border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && branches.length === 0 && (
        <div className="text-center py-20 text-ink-4">
          <I.Building size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Belum ada cabang. Tambahkan cabang pertama.</p>
        </div>
      )}

      {!loading && branches.length > 0 && (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {branches.map(b => (
            <BranchCard
              key={b.id}
              branch={b}
              onEdit={() => setModal({ mode: 'edit', data: b })}
              onToggleStatus={() => setConfirm({
                type: 'status', branch: b,
                title: b.status === 'active' ? `Nonaktifkan ${b.name}?` : `Aktifkan ${b.name}?`,
                body: b.status === 'active'
                  ? 'Cabang ini tidak akan muncul di dropdown pilihan user baru.'
                  : 'Cabang akan aktif kembali dan muncul di dropdown.',
                danger: b.status === 'active',
              })}
              onDelete={() => setConfirm({
                type: 'delete', branch: b,
                title: `Hapus ${b.name}?`,
                body: `Cabang ini akan dihapus permanen. Hanya bisa dihapus jika tidak ada user terdaftar.`,
                danger: true,
              })}
            />
          ))}
        </div>
      )}

      {/* Branch Form Modal */}
      {modal && (
        <BranchModal
          initial={modal.mode === 'edit' ? modal.data : null}
          onSave={() => {
            setModal(null)
            showToast(modal.mode === 'edit' ? 'Cabang berhasil diupdate.' : 'Cabang berhasil ditambahkan.')
            load()
          }}
          onClose={() => setModal(null)}
        />
      )}

      {/* Confirm Modal */}
      {confirm && (
        <ConfirmModal
          title={confirm.title}
          body={confirm.body}
          danger={confirm.danger}
          onClose={() => setConfirm(null)}
          onConfirm={() =>
            confirm.type === 'delete'
              ? handleDelete(confirm.branch)
              : handleToggleStatus(confirm.branch)
          }
        />
      )}

      {toast && <Toast message={toast.message} tone={toast.tone} />}
    </div>
  )
}
