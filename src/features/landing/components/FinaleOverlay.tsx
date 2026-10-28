import { Link } from '../lib/PageLink'
import { WORLDS } from '../config/content'
import { ROUTES } from '../config/routes'
import { Logo } from './LandingNavigation'

export function FinaleOverlay() {
  return (
    <section aria-labelledby="fin-title" className="world-layer">
      <div className="fin-head absolute inset-x-0 top-0 px-5 pt-24 text-center sm:pt-28">
        <h2 id="fin-title" className="rise display mx-auto text-[clamp(2.4rem,6.4vw,6rem)] font-bold">
          One World.
          <br />
          <span className="bg-gradient-to-r from-violet via-[#FF8A3D] to-[#16A37B] bg-clip-text text-transparent">Endless Possibilities.</span>
        </h2>
        <p className="rise mt-4 font-nav text-sm font-semibold uppercase tracking-[0.18em] text-ink/60 sm:text-base">
          Create it. Customize it. Discover it. Print it.
        </p>
      </div>

      <footer className="fin-footer interactive absolute inset-x-0 bottom-0 px-3 pb-3 sm:px-5 sm:pb-5">
        <div className="glass mx-auto flex max-w-6xl flex-col gap-4 rounded-[1.75rem] px-5 py-4 font-nav text-sm md:flex-row md:items-center md:justify-between">
          <Logo />
          <nav aria-label="Footer">
            <ul className="flex flex-wrap gap-x-5 gap-y-2">
              {WORLDS.map((w) => (
                <li key={w.id}>
                  <Link to={w.route} className="font-semibold text-ink/70 hover:text-ink">
                    {w.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link to={ROUTES.signIn} className="font-semibold text-ink/70 hover:text-ink">
                  Sign In
                </Link>
              </li>
            </ul>
          </nav>
          <p className="text-xs text-ink/50">© {new Date().getFullYear()} 3DWorld · Sản phẩm demo, dữ liệu mẫu</p>
        </div>
      </footer>
    </section>
  )
}
