import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Shell from './components/layout/Shell'
import LoginPage from './pages/LoginPage'
import AdminDashboard from './pages/admin/AdminDashboard'
import KasirDashboard from './pages/kasir/KasirDashboard'
import RegisterMemberPage from './pages/kasir/RegisterMemberPage'
import MemberDashboard from './pages/member/MemberDashboard'
import TrainerDashboard from './pages/trainer/TrainerDashboard'

function RootRedirect() {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div className="min-h-screen bg-bone flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-pop border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }
  return user
    ? <Navigate to={`/${user.role}`} replace />
    : <Navigate to="/login" replace />
}

/* Wraps a protected page with Shell so sidebar/topbar renders after auth */
function ShellRoute({ role, children }) {
  return (
    <ProtectedRoute role={role}>
      <Shell>{children}</Shell>
    </ProtectedRoute>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/"        element={<RootRedirect />} />
          <Route path="/login"   element={<LoginPage />} />

          <Route path="/admin"   element={<ShellRoute role="admin">  <AdminDashboard />   </ShellRoute>} />
          <Route path="/kasir"                  element={<ShellRoute role="kasir">  <KasirDashboard />      </ShellRoute>} />
          <Route path="/kasir/register-member" element={<ShellRoute role="kasir">  <RegisterMemberPage />  </ShellRoute>} />
          <Route path="/member"  element={<ShellRoute role="member"> <MemberDashboard />  </ShellRoute>} />
          <Route path="/trainer" element={<ShellRoute role="trainer"><TrainerDashboard /> </ShellRoute>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
