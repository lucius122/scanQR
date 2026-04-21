import api from './axios'

/*
 * fetchList — untuk endpoint options/dropdown (non-paginated).
 * Handles kedua format: array langsung [...] dan wrapped {data: [...]}.
 * Selalu return array, tidak pernah throw saat data kosong.
 */
export async function fetchList(url, params = {}) {
  const res = await api.get(url, { params })
  const d   = res.data
  if (Array.isArray(d))            return d
  if (d && Array.isArray(d.data)) return d.data
  return []
}

/*
 * fetchPaginated — untuk endpoint list halaman (paginated).
 * Return { data, pagination } dengan safe fallback.
 */
export async function fetchPaginated(url, params = {}) {
  const res = await api.get(url, { params })
  const d   = res.data
  return {
    data:       Array.isArray(d.data) ? d.data : [],
    pagination: d.pagination ?? d.meta ?? {},
  }
}
