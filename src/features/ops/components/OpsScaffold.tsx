import { Download, RefreshCw } from 'lucide-react'
import { type ReactNode, useEffect, useState } from 'react'
import { formatVnd } from '../../../shared/format'
import {
  AuditTimeline,
  Btn,
  type Column,
  DataTable,
  DecisionForm,
  type DecisionOption,
  DetailLayout,
  FilterTabs,
  Hero,
  MockNotice,
  RuleBox,
  SearchInput,
  Section,
  StatCard,
  StatGrid,
  StatusPill,
  Toolbar,
} from '../../../shared/ui/kit'
import { QueryState } from '../../../shared/ui/QueryState'
import type { OpsCase, OpsDomain } from '../data/ops.fixtures'
import { useDecide, useOpsCase, useOpsList } from '../hooks/useOps'
import { REAL_OPS_DOMAINS } from '../services/ops.api'
import { OPS_STATUS } from '../lib/status'

/* ------------------------------------------------------------- queue page */

export type QueueConfig = {
  domain: OpsDomain
  code: string
  eyebrow: string
  title: string
  accent: string
  description?: string
  api: string
  columns: Column<OpsCase>[]
  kpis?: (rows: OpsCase[]) => { label: string; value: ReactNode; hint?: string; tone?: 'orange' | 'violet' | 'teal' | 'green' | 'danger' }[]
  rules?: { title: string; items: string[] }
  search?: string
}

/** Khung hàng chờ quản trị: KPI + lọc trạng thái + tìm kiếm + bảng + quy chuẩn. */
export function OpsQueue(cfg: QueueConfig) {
  const q = useOpsList(cfg.domain)
  const [tab, setTab] = useState('')
  const [term, setTerm] = useState('')
  const map = OPS_STATUS[cfg.domain]

  useEffect(() => {
    document.title = `${cfg.title} · Ops 3DWorld`
  }, [cfg.title])

  const all = q.data ?? []
  const t = term.trim().toLowerCase()
  const rows = all.filter((c) => (!tab || c.status === tab) && (!t || `${c.id} ${c.title} ${c.subtitle ?? ''}`.toLowerCase().includes(t)))

  return (
    <>
      {!REAL_OPS_DOMAINS.has(cfg.domain) && <MockNotice api={cfg.api} />}
      <Hero
        code={cfg.code}
        eyebrow={cfg.eyebrow}
        title={cfg.title}
        accent={cfg.accent}
        description={cfg.description}
        actions={
          <>
            <Btn variant="white" icon={RefreshCw} onClick={() => q.refetch()}>
              Làm mới
            </Btn>
            <Btn variant="white" icon={Download}>
              Xuất CSV
            </Btn>
          </>
        }
      />
      {cfg.kpis && (
        <StatGrid>
          {cfg.kpis(all).map((k) => (
            <StatCard key={k.label} label={k.label} value={k.value} hint={k.hint} tone={k.tone} />
          ))}
        </StatGrid>
      )}
      <Toolbar>
        <SearchInput value={term} onChange={setTerm} placeholder={cfg.search ?? 'Tìm theo mã hồ sơ, tên…'} />
        <FilterTabs
          value={tab}
          onChange={setTab}
          options={[
            { value: '', label: 'Tất cả', count: all.length },
            ...Object.keys(map).map((s) => ({ value: s, label: map[s].label, count: all.filter((c) => c.status === s).length })),
          ]}
        />
      </Toolbar>
      <QueryState isLoading={q.isLoading} error={q.error}>
        <DataTable rows={rows} rowKey={(c) => c.id} columns={cfg.columns} empty="Không có hồ sơ trong phân luồng này." />
      </QueryState>
      {cfg.rules && <RuleBox title={cfg.rules.title} rules={cfg.rules.items} />}
    </>
  )
}

/** Cột trạng thái chuẩn. */
export function statusColumn(domain: OpsDomain): Column<OpsCase> {
  return { key: 'status', header: 'Trạng thái', render: (c) => <StatusPill status={c.status} map={OPS_STATUS[domain]} /> }
}

export function moneyColumn(header = 'Số tiền'): Column<OpsCase> {
  return { key: 'amount', header, render: (c) => (c.amount !== undefined ? <strong>{formatVnd(c.amount)}</strong> : '—') }
}

/* ------------------------------------------------------------ review page */

export type ReviewConfig = {
  domain: OpsDomain
  id: string
  code: string
  eyebrow: string
  titlePrefix: string
  api: string
  main: (c: OpsCase) => ReactNode
  aside?: (c: OpsCase) => ReactNode
  decisions: (DecisionOption & { status: string })[]
  checklist?: string[]
  minReason?: number
  /** Ẩn form khi hồ sơ đã ở trạng thái kết thúc. */
  closed?: (c: OpsCase) => boolean
}

/** Khung trang thẩm định: thông tin + bằng chứng + form phán quyết ký số + audit log. */
export function OpsReview(cfg: ReviewConfig) {
  const q = useOpsCase(cfg.domain, cfg.id)
  const decide = useDecide()
  const [done, setDone] = useState<string | null>(null)

  useEffect(() => {
    document.title = `${cfg.titlePrefix} ${cfg.id} · Ops 3DWorld`
  }, [cfg.titlePrefix, cfg.id])

  return (
    <>
      {!REAL_OPS_DOMAINS.has(cfg.domain) && <MockNotice api={cfg.api} />}
      <QueryState isLoading={q.isLoading} error={q.error}>
        {q.data &&
          (() => {
            const c = q.data
            const closed = cfg.closed?.(c)
            return (
              <>
                <Hero code={cfg.code} eyebrow={cfg.eyebrow} title={`${cfg.titlePrefix} #${c.id}`} accent={c.title} description={c.subtitle} />
                <div className="mt-4">
                  <StatusPill status={c.status} map={OPS_STATUS[cfg.domain]} />
                </div>
                <DetailLayout
                  main={
                    <>
                      {cfg.main(c)}
                      {closed && !done ? (
                        <Section title="Hồ sơ đã có phán quyết">
                          <p className="text-sm text-ink-soft">Trạng thái hiện tại không cho phép ký thêm phán quyết. Xem sổ audit để biết chi tiết.</p>
                        </Section>
                      ) : (
                        <DecisionForm
                          options={cfg.decisions}
                          checklist={cfg.checklist}
                          minReason={cfg.minReason}
                          busy={decide.isPending}
                          done={done}
                          onSubmit={(value, reason) => {
                            const d = cfg.decisions.find((x) => x.value === value)
                            if (!d) return
                            decide.mutate(
                              { domain: cfg.domain, id: c.id, decision: d.label, status: d.status, reason },
                              { onSuccess: () => setDone(`Đã ký: ${d.label}. Hồ sơ chuyển sang “${OPS_STATUS[cfg.domain][d.status]?.label ?? d.status}”.`) },
                            )
                          }}
                        />
                      )}
                    </>
                  }
                  aside={
                    <>
                      {cfg.aside?.(c)}
                      <AuditTimeline entries={c.audit} />
                      {c.assignee && (
                        <Section title="Chuyên viên phụ trách">
                          <p className="font-semibold">{c.assignee}</p>
                          <p className="text-xs text-ink-soft">Ca trực Asia/Ho_Chi_Minh (UTC+7)</p>
                        </Section>
                      )}
                    </>
                  }
                />
              </>
            )
          })()}
      </QueryState>
    </>
  )
}

export function val(c: OpsCase, key: string) {
  const v = c.f[key]
  return v === undefined ? '—' : typeof v === 'number' && key.match(/price|amount|declared|settled|received|paid|refunded|escrow|wallet|available|held|expected|remitted|fee|refundedBefore/i) ? formatVnd(v) : String(v)
}
