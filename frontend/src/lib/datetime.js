/*
 * datetime.js — helper format tanggal/jam konsisten WIB.
 * Semua komponen yang render timestamp harus pakai helper ini
 * agar tampilan selalu dalam zona waktu Asia/Jakarta (WIB, UTC+7).
 */

const TZ = 'Asia/Jakarta'

/** "07:42" */
export function formatTimeWIB(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleTimeString('id-ID', {
    timeZone: TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

/** "20 April 2026" */
export function formatDateWIB(dateStr) {
  if (!dateStr) return '—'
  // Date-only strings (YYYY-MM-DD) harus diparsing manual agar tidak
  // kena UTC midnight shift. Contoh: "2026-04-20" → new Date() = 19 Apr di UTC+7.
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, m, d] = dateStr.split('-').map(Number)
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric', month: 'long', year: 'numeric',
    }).format(new Date(y, m - 1, d))
  }
  return new Date(dateStr).toLocaleDateString('id-ID', {
    timeZone: TZ,
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

/** "20 April 2026, 07:42 WIB" */
export function formatDateTimeWIB(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  const date = d.toLocaleDateString('id-ID', { timeZone: TZ, day: 'numeric', month: 'long', year: 'numeric' })
  const time = d.toLocaleTimeString('id-ID', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false })
  return `${date}, ${time} WIB`
}

/** "20 Apr" — ringkas untuk label grafik */
export function formatShortDateWIB(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('id-ID', {
    timeZone: TZ,
    day: 'numeric', month: 'short',
  })
}
