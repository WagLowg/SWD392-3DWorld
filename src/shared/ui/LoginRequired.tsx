import { LogIn } from 'lucide-react'
import { goLogin } from '../../features/auth/services/session'

export function LoginRequired({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-col items-center rounded-[2rem] bg-white/90 px-6 py-16 text-center shadow-soft">
      <div className="grid h-20 w-20 place-items-center rounded-full bg-violet-soft text-violet">
        <LogIn size={30} />
      </div>
      <h2 className="mt-5 font-display text-2xl font-bold">{title}</h2>
      <p className="mt-2 max-w-md text-sm text-ink-soft">{body}</p>
      <button
        type="button"
        onClick={() => goLogin()}
        className="mt-6 rounded-full bg-ink px-6 py-3 font-label text-sm font-semibold text-white hover:bg-violet"
      >
        Đăng nhập
      </button>
    </div>
  )
}
