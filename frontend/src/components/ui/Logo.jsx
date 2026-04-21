import { useState } from 'react'

export default function Logo({ size = 28, on = 'light' }) {
  const [imgFailed, setImgFailed] = useState(false)
  const ink = on === 'dark' ? '#FAFAF7' : '#0A0A0A'

  return (
    <div className="flex items-center gap-2 shrink-0">
      <div style={{ width: size, height: size }} className="shrink-0">
        {!imgFailed ? (
          <img
            src="/logo/logo.png"
            width={size}
            height={size}
            onError={() => setImgFailed(true)}
            className="object-contain rounded-md"
            alt="88 STRONG GYM"
            style={{ width: size, height: size }}
          />
        ) : (
          <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="6" fill={ink} />
            <text x="16" y="21" textAnchor="middle"
              fill="#FACC15" fontSize="12" fontWeight="900"
              fontFamily="system-ui, sans-serif">88</text>
          </svg>
        )}
      </div>
      <div className="leading-none">
        <div className="font-black tracking-tight" style={{ color: ink, fontSize: size * 0.48 }}>
          88 STRONG
        </div>
        <div className="text-[9px]"
          style={{ color: on === 'dark' ? 'rgba(255,255,255,0.45)' : 'rgba(10,10,10,0.45)' }}>
          GYM
        </div>
      </div>
    </div>
  )
}
