import { cls } from '../../lib/utils'

const TONE = {
  ink:     'bg-ink text-white',
  bone:    'bg-bone-2 text-ink hairline',
  pop:     'bg-pop text-ink',
  ok:      'bg-ok/10 text-ok',
  bad:     'bg-bad/10 text-bad',
  warn:    'bg-warn/15 text-warn',
  outline: 'hairline text-ink',
}

export default function Badge({ tone = 'ink', children, dot = false }) {
  return (
    <span className={cls('chip', TONE[tone] ?? TONE.ink)}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
      {children}
    </span>
  )
}
