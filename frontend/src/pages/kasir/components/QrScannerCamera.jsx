import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader } from '@zxing/browser'
import { NotFoundException } from '@zxing/library'

/*
 * QrScannerCamera — komponen kamera live untuk scan QR.
 *
 * Props:
 *   onScan(text)  → dipanggil SEKALI saat QR berhasil terbaca
 *   active        → boolean, false = hentikan kamera (saat menunggu hasil API)
 *
 * Cara kerja @zxing:
 *   BrowserMultiFormatReader terus membaca frame dari video element.
 *   Saat QR ditemukan, callback dipanggil dengan hasil.
 *   NotFoundException diabaikan (artinya frame saat ini tidak ada QR — normal).
 *
 * React 18 StrictMode menjalankan effect DUA KALI (mount → unmount → mount).
 * Kita handle ini dengan `controls` variable di dalam effect dan cleanup function.
 */
export default function QrScannerCamera({ onScan, active = true }) {
  const videoRef    = useRef(null)
  const scannedRef  = useRef(false)   // mencegah callback ganda dari frame berurutan
  const [error, setError] = useState(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!active) return

    let controls = null
    scannedRef.current = false

    const reader = new BrowserMultiFormatReader()

    reader
      .decodeFromVideoDevice(null, videoRef.current, (result, err) => {
        if (result && !scannedRef.current) {
          scannedRef.current = true
          onScan(result.getText())
        }
        // NotFoundException = tidak ada QR di frame saat ini — bukan error
        if (err && !(err instanceof NotFoundException)) {
          console.warn('[ZXing]', err.message)
        }
      })
      .then(c => {
        controls = c
        setReady(true)
        setError(null)
      })
      .catch(err => {
        const msg = err?.name === 'NotAllowedError'
          ? 'Izin kamera ditolak. Aktifkan akses kamera di pengaturan browser.'
          : err?.name === 'NotFoundError'
          ? 'Kamera tidak ditemukan di perangkat ini.'
          : 'Kamera tidak bisa diakses. Coba refresh halaman.'
        setError(msg)
      })

    return () => {
      controls?.stop()
      setReady(false)
    }
  }, [active]) // re-run saat active berubah

  if (error) {
    return (
      <div className="aspect-square bg-ink-3 rounded-2xl flex flex-col items-center justify-center gap-3 p-6 text-center border border-ink-4">
        <div className="text-3xl">📷</div>
        <p className="text-bone/60 text-sm">{error}</p>
      </div>
    )
  }

  return (
    <div className="relative aspect-square bg-black rounded-2xl overflow-hidden">
      {/* Video feed */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        muted
        playsInline
      />

      {/* Loading overlay saat kamera belum ready */}
      {!ready && (
        <div className="absolute inset-0 bg-ink flex items-center justify-center">
          <div className="text-center space-y-2">
            <div className="w-6 h-6 border-2 border-pop border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-bone/40 text-xs">Mengaktifkan kamera...</p>
          </div>
        </div>
      )}

      {/* Overlay gelap di tepi (vignette) */}
      {ready && (
        <div className="absolute inset-0 bg-gradient-radial from-transparent to-black/50 pointer-events-none" />
      )}

      {/* ── Corner markers — 4 sudut kuning ── */}
      {ready && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="relative w-56 h-56">

            {/* Sudut kiri atas */}
            <span className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-pop rounded-tl-md" />
            {/* Sudut kanan atas */}
            <span className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-pop rounded-tr-md" />
            {/* Sudut kiri bawah */}
            <span className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-pop rounded-bl-md" />
            {/* Sudut kanan bawah */}
            <span className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-pop rounded-br-md" />

            {/* Laser scan line */}
            <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-pop to-transparent animate-laser-scan" />
          </div>
        </div>
      )}

      {/* Badge SCANNING */}
      {ready && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
          <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-full">
            <span className="w-1.5 h-1.5 bg-pop rounded-full animate-pulse" />
            <span className="text-pop text-xs font-mono font-semibold tracking-widest">SCANNING</span>
          </div>
        </div>
      )}
    </div>
  )
}
