import { ArrowUpRight, CheckCircle2, CircleDashed, LockKeyhole } from 'lucide-react'
import { Link } from 'react-router-dom'
import { features, relativePortalRoute, screens, type ScreenStatus } from '../requirements'
import { StatusBadge } from '../components/StatusBadge'

const statusIcon: Record<ScreenStatus, typeof CheckCircle2> = {
  existing: CheckCircle2,
  skeleton: CircleDashed,
  blocked: LockKeyhole,
}

export function OverviewPage() {
  const counts = {
    existing: screens.filter((item) => item.status === 'existing').length,
    skeleton: screens.filter((item) => item.status === 'skeleton').length,
    blocked: screens.filter((item) => item.status === 'blocked').length,
  }

  return (
    <div className="page-stack">
      <section className="hero-panel">
        <p className="eyebrow">Frontend foundation</p>
        <h1>Khung phát triển nghiệp vụ 3DWorld</h1>
        <p>
          Route map này chuyển FRD thành các điểm phát triển rõ ràng mà không thay đổi code Landing, AI Generator hoặc
          3D Studio hiện tại.
        </p>
        <div className="metric-grid">
          <Metric label="Màn hình trong FRD" value={screens.length} />
          <Metric label="Đã có nền" value={counts.existing} />
          <Metric label="Chờ phát triển" value={counts.skeleton} />
          <Metric label="Bị chặn schema" value={counts.blocked} />
        </div>
      </section>

      <section>
        <div className="section-heading">
          <div>
            <p className="eyebrow">W0 → W4</p>
            <h2>Feature map</h2>
          </div>
          <p>Nhấn vào một màn hình để xem phạm vi, mã FR và checklist trạng thái UI.</p>
        </div>

        <div className="feature-grid">
          {features.map((feature) => (
            <article className="feature-card" key={feature.id}>
              <div className="feature-card__heading">
                <div>
                  <span>{feature.wave}</span>
                  <h3>{feature.title}</h3>
                </div>
                <span className="feature-card__count">{feature.screens.length} màn hình</span>
              </div>
              <div className="screen-list">
                {feature.screens.map((item) => {
                  const Icon = statusIcon[item.status]
                  const internal = item.route.startsWith('/portal/')
                  const content = (
                    <>
                      <Icon size={16} />
                      <span>
                        <strong>{item.id}</strong>
                        {item.title}
                      </span>
                      <StatusBadge status={item.status} />
                      <ArrowUpRight size={15} />
                    </>
                  )

                  return internal ? (
                    <Link className="screen-link" to={relativePortalRoute(item.route)} key={item.id}>
                      {content}
                    </Link>
                  ) : (
                    <a className="screen-link" href={item.route} key={item.id}>
                      {content}
                    </a>
                  )
                })}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="metric">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  )
}
