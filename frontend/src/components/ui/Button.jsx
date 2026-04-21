import { cls } from '../../lib/utils'

const SIZES = {
  sm: 'h-8 px-3 text-[13px]',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-5 text-[15px]',
}

const VARIANTS = {
  ink:     'bg-ink text-white hover:bg-ink-2',
  pop:     'bg-pop text-ink hover:bg-pop-2 font-bold',
  outline: 'hairline bg-white text-ink hover:bg-bone-2',
  ghost:   'text-ink hover:bg-bone-2',
  danger:  'bg-bad text-white hover:bg-bad/90',
}

export default function Button({ variant = 'ink', size = 'md', icon, className, children, ...p }) {
  return (
    <button
      {...p}
      className={cls(
        'inline-flex items-center justify-center gap-2 rounded-md font-semibold transition cursor-pointer disabled:opacity-50',
        SIZES[size],
        VARIANTS[variant] ?? VARIANTS.ink,
        className,
      )}
    >
      {icon}{children}
    </button>
  )
}
