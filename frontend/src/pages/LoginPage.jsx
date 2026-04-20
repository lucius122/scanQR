import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

/*
 * LoginPage — halaman login FORGE Gym OS.
 *
 * Layout: split-screen (kiri branding, kanan form).
 * Tidak ada pilihan role — role dibaca dari database setelah login berhasil.
 * Setelah login, redirect otomatis ke dashboard sesuai role user.
 */
export default function LoginPage() {
  const { login } = useAuth()
  const navigate   = useNavigate()

  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState(null)
  const [loading, setLoading]   = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const user = await login(email, password)
      // Redirect ke dashboard sesuai role
      navigate(`/${user.role}`, { replace: true })
    } catch (err) {
      const msg = err.response?.data?.message ?? 'Terjadi kesalahan. Coba lagi.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row">

      {/* Panel kiri — branding (tampil di desktop) */}
      <div className="hidden md:flex md:w-1/2 bg-ink flex-col items-center justify-center gap-6 p-12">
        <div className="text-center">
          {/* Logo / ikon placeholder */}
          <div className="w-20 h-20 bg-pop rounded-2xl flex items-center justify-center mx-auto mb-6">
            <span className="text-ink text-4xl font-black">F</span>
          </div>
          <h1 className="text-bone text-4xl font-black tracking-tighter mb-2">
            FORGE
          </h1>
          <p className="text-bone/50 text-sm tracking-widest uppercase">
            Gym Operating System
          </p>
        </div>
        <div className="mt-12 text-bone/30 text-xs text-center">
          Sistem Informasi Manajemen Gym
        </div>
      </div>

      {/* Panel kanan — form login */}
      <div className="flex-1 bg-bone flex items-center justify-center p-8">
        <div className="w-full max-w-sm">

          {/* Header mobile (hanya tampil di mobile) */}
          <div className="md:hidden text-center mb-8">
            <div className="w-14 h-14 bg-ink rounded-xl flex items-center justify-center mx-auto mb-3">
              <span className="text-pop text-2xl font-black">F</span>
            </div>
            <h1 className="text-ink text-2xl font-black">FORGE Gym OS</h1>
          </div>

          <h2 className="text-ink text-2xl font-bold mb-1">Masuk</h2>
          <p className="text-ink/50 text-sm mb-8">
            Masukkan email dan password Anda.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-ink text-sm font-medium mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="nama@forge.test"
                className="w-full px-4 py-3 rounded-lg border border-ink/20 bg-white
                           text-ink placeholder-ink/30 text-sm
                           focus:outline-none focus:ring-2 focus:ring-pop focus:border-transparent
                           transition"
              />
            </div>

            <div>
              <label className="block text-ink text-sm font-medium mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-lg border border-ink/20 bg-white
                           text-ink placeholder-ink/30 text-sm
                           focus:outline-none focus:ring-2 focus:ring-pop focus:border-transparent
                           transition"
              />
            </div>

            {/* Error message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-ink hover:bg-ink/80 disabled:opacity-50
                         text-bone font-semibold rounded-lg text-sm
                         transition-colors cursor-pointer mt-2"
            >
              {loading ? 'Memproses...' : 'Masuk'}
            </button>
          </form>

          <p className="text-ink/30 text-xs text-center mt-8">
            FORGE Gym OS &copy; {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  )
}
