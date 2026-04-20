import { useAuth } from '../../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'

export default function AdminDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-ink text-bone p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <span className="text-pop text-xs font-bold tracking-widest uppercase">Admin</span>
            <h1 className="text-2xl font-bold mt-1">Dashboard Admin</h1>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-bone/10 hover:bg-bone/20 rounded-lg text-sm transition-colors cursor-pointer"
          >
            Logout
          </button>
        </div>

        <div className="bg-bone/5 border border-bone/10 rounded-xl p-6">
          <p className="text-bone/60 text-sm mb-1">Login sebagai</p>
          <p className="font-semibold">{user?.name}</p>
          <p className="text-bone/40 text-sm">{user?.email}</p>
        </div>

        <p className="text-bone/30 text-sm mt-8 text-center">
          Modul admin — akan dikembangkan di tahap berikutnya.
        </p>
      </div>
    </div>
  )
}
