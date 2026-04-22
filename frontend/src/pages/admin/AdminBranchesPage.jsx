import { useEffect, useRef, useState } from 'react'
import api from '../../lib/axios'
import { Badge } from '../../components/ui'
import * as I from '../../components/icons'
import { cls } from '../../lib/utils'

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
          <button onClick={onConfirm}
            className={cls('px-4 h-9 rounded-lg text-sm font-bold transition text-white', danger ? 'bg-bad hover:bg-bad/80' : 'bg-ink hover:bg-ink-2')}>
            Konfirmasi
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Tier Management Panel ─────────────────────────────────────────────────
function TierPanel({ tiers, onReload, showToast }) {
  const [editing, setEditing] = useState(null) // null | { id?, name, price, sort_order }
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

  async function handleSave() {
    setLoading(true)
    setErrors({})
    try {
      if (editing.id) {
        await api.put(`/api/admin/tiers/${editing.id}`, editing)
        showToast(`Tier "${editing.name}" berhasil diupdate.`)
      } else {
        await api.post('/api/admin/tiers', editing)
        showToast(`Tier "${editing.name}" berhasil ditambahkan.`)
      }
      setEditing(null)
      onReload()
    } catch (err) {
      if (err.response?.status === 422) setErrors(err.response.data.errors ?? {})
      else showToast(err.response?.data?.message ?? 'Gagal menyimpan tier.', 'bad')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(tier) {
    if (!confirm(`Hapus tier "${tier.name}"?`)) return
    try {
      await api.delete(`/api/admin/tiers/${tier.id}`)
      showToast(`Tier "${tier.name}" berhasil dihapus.`)
      onReload()
    } catch (err) {
      showToast(err.response?.data?.message ?? 'Gagal menghapus tier.', 'bad')
    }
  }

  return (
    <div className="bg-white hairline rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-bold text-[15px]">Master Tier</div>
          <div className="text-xs text-ink-4">Template harga keanggotaan. Assign tier ke cabang saat tambah/edit cabang.</div>
        </div>
        <button onClick={() => setEditing({ name: '', price: '', sort_order: tiers.length + 1 })}
          className="flex items-center gap-1.5 px-3 h-8 text-xs font-bold bg-ink text-white rounded-lg hover:bg-ink-2 transition">
          <I.Plus size={13} /> Tambah
        </button>
      </div>

      {/* Tier list */}
      <div className="space-y-2">
        {tiers.map(t => (
          <div key={t.id} className="flex items-center gap-3 p-3 bg-bone rounded-lg">
            <div className="flex-1 min-w-0">
              <span className="font-semibold text-sm">{t.name}</span>
              <span className="text-ink-4 text-xs ml-2">{formatRupiah(t.price)}</span>
            </div>
            <span className="text-[10px] text-ink-4 mono">{t.branches_count} cabang</span>
            <button onClick={() => setEditing({ id: t.id, name: t.name, price: String(t.price), sort_order: t.sort_order })}
              className="w-7 h-7 rounded-md hover:bg-white flex items-center justify-center transition">
              <I.Edit size={13} />
            </button>
            <button onClick={() => handleDelete(t)}
              className="w-7 h-7 rounded-md hover:bg-bad/10 text-bad flex items-center justify-center transition">
              <I.Trash size={13} />
            </button>
          </div>
        ))}
        {tiers.length === 0 && <p className="text-sm text-ink-4 text-center py-4">Belum ada tier.</p>}
      </div>

      {/* Inline edit/add form */}
      {editing && (
        <div className="border-t border-ink/5 pt-4 space-y-3">
          <div className="micro text-ink-4">{editing.id ? 'EDIT TIER' : 'TAMBAH TIER BARU'}</div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="micro text-ink-4 mb-1">NAMA</div>
              <input value={editing.name} onChange={e => { setEditing(f => ({ ...f, name: e.target.value })); setErrors(er => ({ ...er, name: undefined })) }}
                placeholder="Platinum" className={cls('w-full h-9 px-3 hairline rounded-md text-sm focus:outline-none focus-ring', errors.name ? 'border-bad' : '')} />
              {errors.name && <p className="text-[11px] text-bad mt-1">{errors.name[0]}</p>}
            </div>
            <div>
              <div className="micro text-ink-4 mb-1">HARGA (Rp)</div>
              <input type="number" min="0" value={editing.price} onChange={e => setEditing(f => ({ ...f, price: e.target.value }))}
                placeholder="150000" className={cls('w-full h-9 px-3 hairline rounded-md text-sm focus:outline-none focus-ring', errors.price ? 'border-bad' : '')} />
              {errors.price && <p className="text-[11px] text-bad mt-1">{errors.price[0]}</p>}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setEditing(null)} className="px-4 h-8 rounded-lg hairline text-xs font-semibold hover:bg-bone-2 transition">Batal</button>
            <button onClick={handleSave} disabled={loading}
              className="px-4 h-8 rounded-lg bg-ink text-white text-xs font-bold hover:bg-ink-2 disabled:opacity-50 transition">
              {loading ? 'Menyimpan…' : 'Simpan'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Branch Form Modal ─────────────────────────────────────────────────────
function BranchModal({ initial, tiers, onSave, onClose }) {
  const isEdit = Boolean(initial?.id)

  const [form, setForm] = useState({
    name:          initial?.name          ?? '',
    address:       initial?.address       ?? '',
    phone:         initial?.phone         ?? '',
    opening_hours: initial?.opening_hours ?? '06:00-22:00',
    tier_id:       initial?.tier_id ? String(initial.tier_id) : (tiers[0]?.id ? String(tiers[0].id) : ''),
  })
  const [errors,  setErrors]  = useState({})
  const [loading, setLoading] = useState(false)

  function set(field) {
    return e => {
      setForm(f => ({ ...f, [field]: e.target.value }))
      setErrors(er => ({ ...er, [field]: undefined }))
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setErrors({})

    const payload = { ...form, tier_id: Number(form.tier_id) }

    try {
      if (isEdit) {
        await api.put(`/api/admin/branches/${initial.id}`, payload)
      } else {
        await api.post('/api/admin/branches', payload)
      }
      onSave()
    } catch (err) {
      if (err.response?.status === 422) setErrors(err.response.data.errors ?? {})
      else setErrors({ _general: err.response?.data?.message ?? 'Terjadi kesalahan.' })
    } finally {
      setLoading(false)
    }
  }

  const inputCls = (field) =>
    cls('w-full h-10 px-3 hairline rounded-md text-sm focus:outline-none focus-ring bg-white', errors[field] ? 'border-bad' : '')

  const selectedTier = tiers.find(t => String(t.id) === form.tier_id)

  return (
    <div className="fixed inset-0 z-50 bg-ink/60 flex items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl my-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 hairline-b">
          <h2 className="font-black text-lg">{isEdit ? 'Edit Cabang' : 'Tambah Cabang'}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-bone-2 flex items-center justify-center transition">
            <I.X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {errors._general && (
            <div className="bg-bad/10 border border-bad/25 rounded-lg px-4 py-2.5 text-bad text-sm">{errors._general}</div>
          )}

          {/* Info cabang */}
          <div className="space-y-3">
            <div className="micro text-ink-4 pb-1 hairline-b">INFO CABANG</div>
            <div>
              <div className="micro text-ink-4 mb-1">NAMA CABANG</div>
              <input value={form.name} onChange={set('name')} placeholder="88 STRONG GYM Cabang 3" className={inputCls('name')} />
              {errors.name && <p className="text-[11px] text-bad mt-1">{errors.name[0]}</p>}
            </div>
            <div>
              <div className="micro text-ink-4 mb-1">ALAMAT</div>
              <textarea value={form.address} onChange={set('address')} rows={2} placeholder="Jl. Contoh No. 1, Jakarta"
                className={cls('w-full px-3 py-2 hairline rounded-md text-sm focus:outline-none focus-ring bg-white resize-none', errors.address ? 'border-bad' : '')} />
              {errors.address && <p className="text-[11px] text-bad mt-1">{errors.address[0]}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="micro text-ink-4 mb-1">TELEPON</div>
                <input value={form.phone} onChange={set('phone')} placeholder="021-xxxxxxx" className={inputCls('phone')} />
                {errors.phone && <p className="text-[11px] text-bad mt-1">{errors.phone[0]}</p>}
              </div>
              <div>
                <div className="micro text-ink-4 mb-1">JAM OPERASIONAL</div>
                <input value={form.opening_hours} onChange={set('opening_hours')} placeholder="06:00-22:00" className={inputCls('opening_hours')} />
              </div>
            </div>
          </div>

          {/* Tier selection */}
          <div className="space-y-3">
            <div className="micro text-ink-4 pb-1 hairline-b">TIER KEANGGOTAAN</div>
            <div>
              <div className="micro text-ink-4 mb-1">PILIH TIER</div>
              <select value={form.tier_id} onChange={set('tier_id')}
                className="w-full h-10 px-3 hairline rounded-md text-sm focus:outline-none focus-ring bg-white">
                {tiers.map(t => (
                  <option key={t.id} value={String(t.id)}>{t.name} — {formatRupiah(t.price)}</option>
                ))}
              </select>
              {errors.tier_id && <p className="text-[11px] text-bad mt-1">{errors.tier_id[0]}</p>}
            </div>
            {selectedTier && (
              <div className="bg-pop/10 rounded-lg px-4 py-2.5 flex items-center justify-between">
                <span className="text-sm text-ink-4">Harga keanggotaan</span>
                <span className="font-bold text-ink">{formatRupiah(selectedTier.price)} / bln</span>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 h-10 rounded-xl hairline text-sm font-semibold hover:bg-bone-2 transition">Batal</button>
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

      {branch.tier && (
        <div className="flex items-center gap-2">
          <span className="mono text-[10px] bg-pop/15 text-ink rounded-md px-2 py-0.5 font-bold">
            {branch.tier.name}: {formatRupiah(branch.tier.price)}
          </span>
        </div>
      )}

      <div className="flex gap-2 pt-1 hairline-t">
        <button onClick={onEdit}
          className="flex items-center gap-1.5 px-3 h-8 text-xs font-semibold rounded-lg hover:bg-bone-2 transition">
          <I.Edit size={13} /> Edit
        </button>
        <button onClick={onToggleStatus}
          className={cls('flex items-center gap-1.5 px-3 h-8 text-xs font-semibold rounded-lg transition',
            isActive ? 'hover:bg-warn/10 text-warn' : 'hover:bg-ok/10 text-ok')}>
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
  const [tiers,    setTiers]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [tab,      setTab]      = useState('branches') // 'branches' | 'tiers'
  const [modal,    setModal]    = useState(null)
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
      const [bRes, tRes] = await Promise.all([
        api.get('/api/admin/branches'),
        api.get('/api/admin/tiers'),
      ])
      setBranches(bRes.data.data)
      setTiers(tRes.data.data)
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
          <h1 className="text-xl font-black tracking-tight">Kelola Cabang & Tier</h1>
        </div>
        <div className="flex gap-2">
          {/* Tab toggle */}
          <div className="flex bg-bone rounded-lg p-0.5">
            {[['branches', 'Cabang'], ['tiers', 'Tier']].map(([key, label]) => (
              <button key={key} onClick={() => setTab(key)}
                className={cls('px-3 h-8 rounded-md text-xs font-semibold transition',
                  tab === key ? 'bg-white shadow-sm text-ink' : 'text-ink-4 hover:text-ink')}>
                {label}
              </button>
            ))}
          </div>
          {tab === 'branches' && (
            <button onClick={() => setModal({ mode: 'add' })}
              className="flex items-center gap-2 px-4 h-9 bg-ink text-white text-sm font-bold rounded-xl hover:bg-ink-2 transition">
              <I.Plus size={15} /> Tambah Cabang
            </button>
          )}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="py-20 flex justify-center">
          <div className="w-7 h-7 border-2 border-pop border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Tier tab */}
      {!loading && tab === 'tiers' && (
        <TierPanel tiers={tiers} onReload={load} showToast={showToast} />
      )}

      {/* Branches tab */}
      {!loading && tab === 'branches' && branches.length === 0 && (
        <div className="text-center py-20 text-ink-4">
          <I.Building size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Belum ada cabang. Tambahkan cabang pertama.</p>
        </div>
      )}

      {!loading && tab === 'branches' && branches.length > 0 && (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {branches.map(b => (
            <BranchCard key={b.id} branch={b}
              onEdit={() => setModal({ mode: 'edit', data: b })}
              onToggleStatus={() => setConfirm({
                type: 'status', branch: b,
                title: b.status === 'active' ? `Nonaktifkan ${b.name}?` : `Aktifkan ${b.name}?`,
                body: b.status === 'active' ? 'Cabang ini tidak akan muncul di dropdown pilihan user baru.' : 'Cabang akan aktif kembali.',
                danger: b.status === 'active',
              })}
              onDelete={() => setConfirm({
                type: 'delete', branch: b,
                title: `Hapus ${b.name}?`,
                body: 'Cabang ini akan dihapus permanen. Hanya bisa dihapus jika tidak ada user terdaftar.',
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
          tiers={tiers}
          onSave={() => { setModal(null); showToast(modal.mode === 'edit' ? 'Cabang berhasil diupdate.' : 'Cabang berhasil ditambahkan.'); load() }}
          onClose={() => setModal(null)}
        />
      )}

      {confirm && (
        <ConfirmModal title={confirm.title} body={confirm.body} danger={confirm.danger}
          onClose={() => setConfirm(null)}
          onConfirm={() => confirm.type === 'delete' ? handleDelete(confirm.branch) : handleToggleStatus(confirm.branch)}
        />
      )}

      {toast && <Toast message={toast.message} tone={toast.tone} />}
    </div>
  )
}
