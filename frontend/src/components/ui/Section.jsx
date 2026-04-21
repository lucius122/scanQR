import { cls } from '../../lib/utils'

export default function Section({ eyebrow, title, action, children, className }) {
  return (
    <div className={cls('bg-white hairline rounded-lg', className)}>
      <div className="flex items-center justify-between px-4 md:px-5 py-3 md:py-4 hairline-b">
        <div>
          {eyebrow && <div className="micro text-ink-4">{eyebrow}</div>}
          <div className="text-base md:text-lg font-bold tracking-tight">{title}</div>
        </div>
        {action}
      </div>
      <div>{children}</div>
    </div>
  )
}
