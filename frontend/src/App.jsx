import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Shell from './components/layout/Shell'
import ErrorBoundary from './components/ErrorBoundary'

// Halaman yang langsung diakses saat login — eager load
import LoginPage     from './pages/LoginPage'
import KasirDashboard from './pages/kasir/KasirDashboard'
import MemberDashboard from './pages/member/MemberDashboard'

// Halaman admin & fitur berat — lazy load (split ke chunk terpisah)
const AdminDashboard    = lazy(() => import('./pages/admin/AdminDashboard'))
const AdminBranchesPage = lazy(() => import('./pages/admin/AdminBranchesPage'))
const AdminUsersPage    = lazy(() => import('./pages/admin/AdminUsersPage'))
const RegisterMemberPage = lazy(() => import('./pages/kasir/RegisterMemberPage'))
const TrainerDashboard   = lazy(() => import('./pages/trainer/TrainerDashboard'))
const ProfilePage        = lazy(() => import('./pages/ProfilePage'))

function PageLoader() {
  return (
    <div className="min-h-screen bg-bone flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-pop border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

function RootRedirect() {
  const { user, loading } = useAuth()
  if (loading) return <PageLoader />
  return user
    ? <Navigate to={`/${user.role}`} replace />
    : <Navigate to="/login" replace />
}

function ShellRoute({ role, children }) {
  return (
    <ProtectedRoute role={role}>
      <Shell>
        <Suspense fallback={<PageLoader />}>
          {children}
        </Suspense>
      </Shell>
    </ProtectedRoute>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ErrorBoundary>
          <Routes>
            <Route path="/"      element={<RootRedirect />} />
            <Route path="/login" element={<LoginPage />} />

            <Route path="/admin"          element={<ShellRoute role="admin"><AdminDashboard /></ShellRoute>} />
            <Route path="/admin/branches" element={<ShellRoute role="admin"><AdminBranchesPage /></ShellRoute>} />
            <Route path="/admin/users"    element={<ShellRoute role="admin"><AdminUsersPage /></ShellRoute>} />

            <Route path="/kasir"                 element={<ShellRoute role="kasir"><KasirDashboard /></ShellRoute>} />
            <Route path="/kasir/register-member" element={<ShellRoute role="kasir"><RegisterMemberPage /></ShellRoute>} />

            <Route path="/member"  element={<ShellRoute role="member"><MemberDashboard /></ShellRoute>} />
            <Route path="/trainer" element={<ShellRoute role="trainer"><TrainerDashboard /></ShellRoute>} />

            {/* Profile — semua role bisa akses */}
            <Route path="/profile" element={<ShellRoute role={null}><ProfilePage /></ShellRoute>} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ErrorBoundary>
      </AuthProvider>
    </BrowserRouter>
  )
}
