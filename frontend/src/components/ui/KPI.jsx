import { cls } from '../../lib/utils'

export default function KPI({ label, value, unit, delta, icon, tone = 'light' }) {
  const dark = tone === 'dark'
  const pop  = tone === 'pop'
  return (
    <div className={cls(
      'rounded-lg p-4 md:p-5 relative overflow-hidden flex flex-col gap-3 min-h-[120px]',
      dark && 'bg-ink text-white',
      pop  && 'bg-pop text-ink',
      !dark && !pop && 'bg-white hairline',
    )}>
      <div className="flex items-start justify-between">
        <span className="micro opacity-70">{label}</span>
        {icon && (
          <span className={cls(
            'w-7 h-7 rounded-md flex items-center justify-center',
            dark ? 'bg-white/10' : pop ? 'bg-ink text-pop' : 'bg-bone-2',
          )}>
            {icon}
          </span>
        )}
      </div>
      <div className="mt-auto">
        <div className="flex items-baseline gap-1.5">
          <span className="text-3xl font-extrabold tracking-tight">{value}</span>
          {unit && <span className={cls('text-xs mono', dark || pop ? 'opacity-60' : 'opacity-50')}>{unit}</span>}
        </div>
        {delta && (
          <div className={cls('text-[11px] mono mt-1', dark || pop ? 'opacity-70' : 'opacity-60')}>{delta}</div>
        )}
      </div>
    </div>
  )
}
