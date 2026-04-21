import { cls } from '../../lib/utils'

export default function Field({ label, hint, children, className }) {
  return (
    <label className={cls('block', className)}>
      {label && <span className="micro text-ink-4 block mb-1.5">{label}</span>}
      {children}
      {hint && <span className="text-[11px] text-ink-4 mt-1 block">{hint}</span>}
    </label>
  )
}
