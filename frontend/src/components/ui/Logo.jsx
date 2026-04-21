export default function Logo({ size = 28, on = 'light' }) {
  const ink = on === 'dark' ? '#FAFAF7' : '#0A0A0A'
  return (
    <div className="flex items-center gap-2 shrink-0">
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
        <rect x="1" y="1" width="30" height="30" rx="6" fill={ink} />
        <path
          d="M8 21V11h8v2.4h-5.2v1.7h4.6v2.4h-4.6V21zM17.6 21l3-10h2.6l3 10h-2.6l-.5-1.8h-2.4L20.2 21zm3.2-4h1.6l-.8-3.2z"
          fill="#FACC15"
        />
      </svg>
      <div className="leading-none">
        <div
          className="font-black tracking-tight"
          style={{ color: ink, fontSize: size * 0.55 }}
        >
          FORGE
        </div>
        <div
          className="micro text-[9px]"
          style={{ color: on === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(10,10,10,0.5)' }}
        >
          GYM OS
        </div>
      </div>
    </div>
  )
}
