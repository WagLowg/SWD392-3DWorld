import { AlertTriangle, ArrowLeft, Braces, Check, ExternalLink } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { ScreenDefinition } from '../requirements'
import { StatusBadge } from '../components/StatusBadge'

const uiStates = [
  'Loading / progress',
  'Empty state',
  'Error + retry',
  'Permission denied',
  'Expired / stale data',
  'Success feedback',
]

export function ScreenPage({ screen }: { screen: ScreenDefinition & { featureTitle: string; wave: string } }) {
  const isBlocked = screen.status === 'blocked'

  return (
    <div className="page-stack screen-page">
      <Link className="back-link" to="/">
        <ArrowLeft size={16} /> Tổng quan
      </Link>

      <section className="screen-hero">
        <div>
          <div className="screen-meta">
            <span>{screen.id}</span>
            <span>{screen.wave}</span>
            <StatusBadge status={screen.status} />
          </div>
          <h1>{screen.title}</h1>
          <p>{screen.description}</p>
        </div>
        {screen.status === 'existing' && !screen.route.startsWith('/portal/') && (
          <a className="primary-link" href={screen.route}>
            Mở module hiện có <ExternalLink size={16} />
          </a>
        )}
      </section>

      {isBlocked && (
        <div className="callout callout--warning">
          <AlertTriangle size={20} />
          <div>
            <strong>Chưa được triển khai persistence</strong>
            <p>
              FRD yêu cầu duyệt migration và API contract trước. Không tái sử dụng bảng POD hoặc nguồn transaction khác
              để lách schema.
            </p>
          </div>
        </div>
      )}

      <div className="detail-grid">
        <section className="detail-card">
          <p className="eyebrow">Traceability</p>
          <h2>Requirement coverage</h2>
          <div className="tag-row">
            {screen.requirements.map((item) => (
              <span className="tag" key={item}>
                {item}
              </span>
            ))}
          </div>
          <dl className="definition-list">
            <div>
              <dt>Feature</dt>
              <dd>{screen.featureTitle}</dd>
            </div>
            <div>
              <dt>Delivery wave</dt>
              <dd>{screen.wave}</dd>
            </div>
            <div>
              <dt>Canonical route</dt>
              <dd>
                <code>{screen.route}</code>
              </dd>
            </div>
          </dl>
        </section>

        <section className="detail-card">
          <p className="eyebrow">Definition of ready</p>
          <h2>UI states bắt buộc</h2>
          <ul className="check-list">
            {uiStates.map((state) => (
              <li key={state}>
                <Check size={16} />
                {state}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="detail-card contract-card">
        <Braces size={22} />
        <div>
          <p className="eyebrow">API boundary</p>
          <h2>Chốt contract trước khi nối dữ liệu thật</h2>
          <p>
            Request/response, validation, enum state, paging, capability, error code và ví dụ success/failure phải được
            thống nhất. Amount, owner, role, approval và trạng thái thanh toán luôn do backend quyết định.
          </p>
          <code>src/shared/api/client.ts</code>
        </div>
      </section>
    </div>
  )
}
