import { Eye, EyeOff } from 'lucide-react'
import { forwardRef, type InputHTMLAttributes, useState } from 'react'
import { inputClass } from '../../../shared/ui/form'

/** Ô mật khẩu có nút hiện/ẩn. */
export const PasswordInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function PasswordInput(props, ref) {
    const [visible, setVisible] = useState(false)
    return (
      <div className="relative">
        <input {...props} ref={ref} type={visible ? 'text' : 'password'} className={`${inputClass} pr-12`} />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
          className="absolute inset-y-0 right-2 my-auto grid h-9 w-9 place-items-center rounded-full text-ink-soft hover:bg-surface-high"
        >
          {visible ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </div>
    )
  },
)
