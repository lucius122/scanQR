import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Logo } from '../components/ui'
import * as I from '../components/icons'
import { cls } from '../lib/utils'

export default function LoginPage() {
  const { login }  = useAuth()
  const navigate   = useNavigate()

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error,    setError]    = useState(null)
  const [loading,  setLoading]  = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const user = await login(email, password)
      navigate(`/${user.role}`, { replace: true })
    } catch (err) {
      setError(err.response?.data?.message ?? 'Email atau password salah.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-[1.05fr_1fr] bg-bone">

      {/* ── Branding panel (desktop) ── */}
      <div className="bg-ink text-white relative overflow-hidden p-6 md:p-10 lg:p-14 flex flex-col min-h-[200px] lg:min-h-screen on-dark">
        {/* dot grid */}
        <div
          className="absolute inset-0 opacity-[0.18] pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.8) 1px, transparent 1px)', backgroundSize: '14px 14px' }}
        />
        {/* Yellow accent circle */}
        <div className="absolute -right-10 -top-10 w-64 h-64 bg-pop rounded-full opacity-90 hidden lg:block" />
        <div
          className="absolute right-16 bottom-20 w-48 h-48 rounded-full hidden lg:block"
          style={{ border: '1px solid rgba(255,255,255,0.15)' }}
        />

        {/* Logo */}
        <div className="relative z-10">
          <Logo size={34} on="dark" />
        </div>

        {/* Copy — desktop */}
        <div className="relative z-10 mt-8 lg:mt-auto hidden lg:block">
          <div className="micro text-pop mb-4">88 STRONG GYM · Cabang 2</div>
          <h1 className="text-5xl xl:text-6xl font-black tracking-tight leading-[1.02]">
            Train hard.<br />
            <span className="text-pop">Run smart.</span>
          </h1>
          <p className="mt-5 max-w-md text-white/60 text-[15px] leading-relaxed">
            Satu dashboard untuk member, kasir, trainer, dan manajemen.
            Absensi QR, keanggotaan, dan laporan dalam satu tempat.
          </p>
          <div className="grid grid-cols-3 gap-3 mt-10 max-w-md">
            {[['4', 'Cabang'], ['1.1k', 'Active members'], ['06:00–22:00', 'WIB']].map(([v, l]) => (
              <div key={l} className="hairline rounded-lg p-3">
                <div className="text-2xl font-extrabold">{v}</div>
                <div className="micro text-white/50">{l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Copy — mobile */}
        <div className="relative z-10 mt-4 lg:hidden">
          <div className="micro text-pop mb-1">GYM OS</div>
          <h1 className="text-2xl font-black tracking-tight">Train hard. Run smart.</h1>
        </div>
      </div>

      {/* ── Form panel ── */}
      <div className="flex items-center justify-center p-6 md:p-10 lg:p-14">
        <form className="w-full max-w-md" onSubmit={handleSubmit}>
          <div className="micro text-ink-4 mb-2">WELCOME BACK</div>
          <h2 className="text-3xl md:text-4xl font-black tracking-tight">Masuk ke 88 STRONG GYM</h2>
          <p className="text-ink-4 mt-2 text-sm">
            Gunakan akun 88 STRONG GYM Anda. Role terdeteksi otomatis setelah masuk.
          </p>

          <div className="mt-8 space-y-4">
            {/* Email */}
            <div>
              <div className="micro text-ink-4 mb-1.5">EMAIL</div>
              <div className="relative">
                <I.Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-4" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="nama@88stronggym.id"
                  className={cls(
                    'w-full h-11 pl-9 pr-4 hairline bg-white rounded-md text-sm focus-ring placeholder:text-ink-4/60',
                    'focus:outline-none',
                  )}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="micro text-ink-4 mb-1.5">PASSWORD</div>
              <div className="relative">
                <I.Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-4" />
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className={cls(
                    'w-full h-11 pl-9 pr-10 hairline bg-white rounded-md text-sm focus-ring placeholder:text-ink-4/60',
                    'focus:outline-none',
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-4 hover:text-ink"
                >
                  <I.Eye size={16} />
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-bad/8 border border-bad/20 rounded-md px-4 py-3">
                <p className="text-bad text-sm">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className={cls(
                'w-full h-12 bg-pop hover:bg-pop-2 text-ink font-bold rounded-md text-[15px]',
                'transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 mt-2',
              )}
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-ink border-t-transparent rounded-full animate-spin" />
              ) : (
                <>Masuk <I.Chevron size={16} /></>
              )}
            </button>

            <p className="text-center text-xs text-ink-4 pt-2">
              Dengan masuk, Anda menyetujui <u>Ketentuan</u> & <u>Privasi</u> 88 STRONG GYM.
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}
