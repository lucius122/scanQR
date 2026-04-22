import { createContext, useContext, useEffect, useState } from 'react'
import api from '../lib/axios'

/*
 * AuthContext — menyimpan state autentikasi global.
 *
 * Mengapa pakai Context?
 * Supaya data user (nama, role, cabang) bisa diakses dari komponen mana saja
 * tanpa perlu prop-drilling (melempar props dari parent ke child bertingkat).
 *
 * State:
 *   user    → object user yang login, atau null jika belum login
 *   loading → true saat pertama kali app cek session (GET /api/me)
 */

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)

  /*
   * Saat app pertama kali dibuka, cek ke backend apakah session masih valid.
   * Jika valid (cookie sesi masih ada di browser) → isi state user.
   * Jika tidak (401) → user belum login, state user tetap null.
   */
  useEffect(() => {
    api.get('/api/me')
      .then(res => setUser(res.data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  /*
   * login()
   * Langkah:
   * 1. GET /sanctum/csrf-cookie → Laravel set cookie XSRF-TOKEN di browser
   * 2. Axios baca XSRF-TOKEN dan kirim sebagai header X-XSRF-TOKEN otomatis
   * 3. POST /api/login → server verifikasi & buat session
   * 4. Simpan user ke state
   */
  async function login(email, password) {
    await api.get('/sanctum/csrf-cookie')
    const res = await api.post('/api/login', { email, password })
    setUser(res.data.user)
    return res.data.user
  }

  async function refreshUser() {
    const res = await api.get('/api/me')
    setUser(res.data.user)
  }

  async function logout() {
    try {
      await api.post('/api/logout')
    } finally {
      /*
       * User state dibersihkan di finally — bukan di try — agar tetap
       * ter-clear meskipun request gagal (misal: koneksi terputus).
       * Akibatnya frontend akan redirect ke /login dan session browser
       * dianggap berakhir dari sisi client.
       */
      setUser(null)
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth harus dipakai di dalam AuthProvider')
  return ctx
}
