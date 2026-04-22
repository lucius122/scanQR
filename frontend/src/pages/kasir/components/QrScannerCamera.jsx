import { useEffect, useRef, useState } from 'react'
import QrScanner from 'qr-scanner'

/*
 * QrScannerCamera — kamera live untuk scan QR.
 *
 * Props:
 *   onScan(text)  → dipanggil SEKALI saat QR berhasil terbaca
 *   active        → boolean, false = hentikan kamera
 *
 * Menggunakan qr-scanner (Nimiq) — lebih cepat dari @zxing karena:
 *   1. Decoding di WebWorker (tidak block main thread)
 *   2. Khusus QR code saja (tidak coba decode semua format barcode)
 *   3. Resolusi kamera dikunci 720p — sweet spot antara kualitas & performa
 */
export default function QrScannerCamera({ onScan, active = true }) {
  const videoRef   = useRef(null)
  const scannerRef = useRef(null)
  const scannedRef = useRef(false)
  const [error, setError] = useState(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!active) return

    const videoElem = videoRef.current
    if (!videoElem) return

    scannedRef.current = false

    const scanner = new QrScanner(
      videoElem,
      (result) => {
        if (scannedRef.current) return
        scannedRef.current = true
        onScan(result.data)
      },
      {
        highlightScanRegion: false,
        highlightCodeOutline: false,
        maxScansPerSecond: 15,
        preferredCamera: 'environment',
        returnDetailedScanResult: true,
        videoConstraints: {
          width:     { ideal: 1280 },
          height:    { ideal: 720  },
          frameRate: { ideal: 30, min: 15 },
        },
      },
    )

    scannerRef.current = scanner

    scanner.start()
      .then(() => {
        setReady(true)
        setError(null)
      })
      .catch(err => {
        const msg =
          err?.name === 'NotAllowedError'
            ? 'Izin kamera ditolak. Aktifkan akses kamera di pengaturan browser.'
            : err?.name === 'NotFoundError'
            ? 'Kamera tidak ditemukan di perangkat ini.'
            : 'Kamera tidak bisa diakses. Coba refresh halaman.'
        setError(msg)
      })

    return () => {
      scanner.stop()
      scanner.destroy()
      scannerRef.current = null
      setReady(false)
    }
  }, [active])

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
            <span className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-pop rounded-tl-md" />
            <span className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-pop rounded-tr-md" />
            <span className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-pop rounded-bl-md" />
            <span className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-pop rounded-br-md" />
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
