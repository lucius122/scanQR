export default function Sparkline({ values, w = 120, h = 36, color = '#0A0A0A' }) {
  if (!values?.length) return null
  const min  = Math.min(...values)
  const max  = Math.max(...values)
  const span = (max - min) || 1
  const pts  = values.map((v, i) => [
    (i / (values.length - 1)) * w,
    h - ((v - min) / span) * (h - 4) - 2,
  ])
  const path = pts.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(' ')
  const area = `${path} L${w},${h} L0,${h} Z`
  return (
    <svg width={w} height={h} className="block">
      <path d={area} fill={color} opacity="0.08" />
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" />
    </svg>
  )
}
