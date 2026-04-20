import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import LoginPage from './pages/LoginPage'
import AdminDashboard from './pages/admin/AdminDashboard'
import KasirDashboard from './pages/kasir/KasirDashboard'
import MemberDashboard from './pages/member/MemberDashboard'
import TrainerDashboard from './pages/trainer/TrainerDashboard'

/*
 * RootRedirect — menangani "/" berdasarkan status login.
 * - Belum login → /login
 * - Sudah login → /[role]  (kasir, admin, member, trainer)
 */
function RootRedirect() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-ink flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-pop border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return user
    ? <Navigate to={`/${user.role}`} replace />
    : <Navigate to="/login" replace />
}

/*
 * App — router utama aplikasi.
 *
 * Struktur route:
 *   /          → RootRedirect (auto ke login atau dashboard)
 *   /login     → LoginPage (publik)
 *   /admin     → AdminDashboard  (hanya role 'admin')
 *   /kasir     → KasirDashboard  (hanya role 'kasir')
 *   /member    → MemberDashboard (hanya role 'member')
 *   /trainer   → TrainerDashboard(hanya role 'trainer')
 *   *          → redirect ke /
 *
 * AuthProvider membungkus seluruh app agar useAuth() bisa dipakai
 * di komponen manapun di dalam tree.
 */
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<LoginPage />} />

          <Route
            path="/admin"
            element={
              <ProtectedRoute role="admin">
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/kasir"
            element={
              <ProtectedRoute role="kasir">
                <KasirDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/member"
            element={
              <ProtectedRoute role="member">
                <MemberDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/trainer"
            element={
              <ProtectedRoute role="trainer">
                <TrainerDashboard />
              </ProtectedRoute>
            }
          />

          {/* Fallback — route tak dikenal kembali ke root */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
