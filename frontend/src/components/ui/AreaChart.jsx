export default function AreaChart({ labels, values, height = 180, color = '#0A0A0A', accent = '#FACC15' }) {
  const W   = 600
  const H   = height
  const pad = { l: 32, r: 12, t: 12, b: 22 }
  const min = Math.min(...values) * 0.9
  const max = Math.max(...values) * 1.05
  const span = max - min
  const xs = (i) => pad.l + (i / (values.length - 1)) * (W - pad.l - pad.r)
  const ys = (v) => pad.t + (H - pad.t - pad.b) * (1 - (v - min) / span)
  const pts  = values.map((v, i) => [xs(i), ys(v)])
  const line = pts.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(' ')
  const area = `${line} L${pts.at(-1)[0]},${H - pad.b} L${pts[0][0]},${H - pad.b} Z`
  const GRID = 4
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full block" preserveAspectRatio="none" style={{ height }}>
      {[...Array(GRID + 1)].map((_, i) => {
        const y = pad.t + i * ((H - pad.t - pad.b) / GRID)
        return <line key={i} x1={pad.l} x2={W - pad.r} y1={y} y2={y} stroke="#0A0A0A" strokeOpacity="0.06" />
      })}
      <path d={area} fill={accent} opacity="0.18" />
      <path d={line} fill="none" stroke={color} strokeWidth="2" />
      {pts.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r="3" fill="#fff" stroke={color} strokeWidth="1.5" />
      ))}
      {labels?.map((l, i) => (
        <text key={i} x={xs(i)} y={H - 6} textAnchor="middle" fontSize="10" fill="#0A0A0A" opacity="0.55"
          style={{ fontFamily: 'JetBrains Mono, monospace' }}>
          {l}
        </text>
      ))}
    </svg>
  )
}
