import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

/*
 * ProtectedRoute — komponen pembungkus untuk halaman yang butuh login.
 *
 * Props:
 *   children  → komponen halaman yang dilindungi
 *   role      → role yang diizinkan mengakses halaman ini (string)
 *               contoh: role="kasir" berarti hanya kasir yang boleh masuk
 *
 * Logika:
 *   1. Selagi loading (cek session) → tampilkan layar kosong
 *   2. User belum login              → redirect ke /login
 *   3. Role tidak cocok              → redirect ke dashboard role user tersebut
 *      (mencegah kasir akses /admin, dst.)
 *   4. Semua OK                      → render children (halaman asli)
 */
export default function ProtectedRoute({ children, role }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-ink flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-pop border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  // role=null → semua role yang sudah login boleh akses (contoh: /profile)
  if (role !== null && user.role !== role) {
    return <Navigate to={`/${user.role}`} replace />
  }

  return children
}
