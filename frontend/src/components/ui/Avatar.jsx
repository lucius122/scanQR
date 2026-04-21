import { cls } from '../../lib/utils'

export default function Avatar({ name, size = 36, square = false, accent = false }) {
  const parts = (name || '??').split(' ')
  const ini   = ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase()
  const hue   = (name || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 360
  const bg    = accent ? '#FACC15' : `hsl(${hue} 28% 22%)`
  const fg    = accent ? '#0A0A0A' : '#FAFAF7'
  return (
    <div
      className={cls(
        'flex items-center justify-center font-bold shrink-0',
        square ? 'rounded-md' : 'rounded-full',
      )}
      style={{ width: size, height: size, background: bg, color: fg, fontSize: size * 0.38 }}
    >
      {ini}
    </div>
  )
}
