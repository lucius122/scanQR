import { cls } from '../../lib/utils'
import { X } from '../icons'

const SIZES = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }

export default function Modal({ title, onClose, children, size = 'md' }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-ink/60 backdrop-blur-sm flex items-end md:items-center justify-center md:p-6"
      onClick={onClose}
    >
      <div
        className={cls(
          'bg-white w-full md:rounded-xl overflow-hidden max-h-[92vh] md:max-h-[85vh] flex flex-col',
          SIZES[size],
        )}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 hairline-b shrink-0">
          <div className="font-bold text-[15px]">{title}</div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-bone-2"
          >
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}
