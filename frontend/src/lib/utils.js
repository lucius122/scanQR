/** Join truthy class strings — identical to clsx for simple cases. */
export const cls = (...xs) => xs.filter(Boolean).join(' ')
