import { forwardRef } from 'react'
import { cls } from '../../lib/utils'

const Input = forwardRef(({ className, ...p }, ref) => (
  <input
    ref={ref}
    {...p}
    className={cls(
      'w-full h-10 px-3 bg-white hairline rounded-md text-sm focus-ring placeholder:text-ink-4',
      className,
    )}
  />
))

Input.displayName = 'Input'
export default Input
