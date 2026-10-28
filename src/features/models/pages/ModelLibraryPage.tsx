import { ArrowRight, Boxes, History, Lock, Search, Sparkles, Upload } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { formatDate } from '../../../shared/format'
import { Pagination } from '../../../shared/ui/Pagination'
import { ApiNote, PageHeading } from '../../../shared/ui/primitives'
import { QueryState } from '../../../shared/ui/QueryState'
import { StatusBlock } from '../../../shared/ui/StatusBlock'
import { useMyModels } from '../hooks/useModels'
import { modelCode, ORIGIN } from '../lib/labels'
import type { ModelSummary, OriginType } from '../types/model.types'

const PAGE_SIZE = 12
const STAGES = [
  'from-violet-soft to-[#f4f0ff]',
  'from-peach to-[#fff3ea]',
  'from-teal-soft to-[#eef9ff]',
  'from-mint to-[#effcf4]',
  'from-butter to-[#fff8e0]',
]

/** MP 036 · Thư Viện Tệp 3D (mô hình riêng tư của tôi). */
export function ModelLibraryPage() {
  const [params, setParams] = useSearchParams()
  const page = Math.max(0, Number(params.get('page') ?? 1) - 1) || 0
  const models = useMyModels(page, PAGE_SIZE)
  const [origin, setOrigin] = useState<OriginType | ''>('')
  const [q, setQ] = useState('')

  useEffect(() => {
    document.title = 'Thư viện tệp 3D · 3DWorld'
  }, [])

  const items = models.data?.content ?? []
  const term = q.trim().toLowerCase()
  const visible = items.filter(
    (m) =>
      (!origin || m.originType === origin) &&
      (!term || m.modelName.toLowerCase().includes(term) || m.description?.toLowerCase().includes(term)),
  )
  const count = (o: OriginType) => items.filter((m) => m.originType === o).length

  return (
    <>
      <PageHeading
        eyebrow="Tác phẩm sáng tạo 3D · riêng tư"
        title="Thư Viện Tệp 3D"
        accent="Không Gian Lưu Trữ & Sáng Tác Cá Nhân."
        description="Mô hình bạn tải lên, dựng trong 3D Studio hoặc tạo bằng AI. Tệp được lưu riêng tư, chỉ bạn tải xuống được và có thể gửi đi đặt in 3D."
        aside={
          <div className="flex flex-wrap gap-2">
            <Link
              to="/models/upload"
              className="inline-flex items-center gap-2 rounded-full bg-ink py-2 pl-5 pr-2 font-label text-sm font-semibold text-white hover:bg-violet"
            >
              Tải lên tệp 3D
              <span className="grid h-8 w-8 place-items-center rounded-full bg-orange">
                <Upload size={15} />
              </span>
            </Link>
            <a
              href="/ai/studio"
              className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 font-label text-sm font-semibold shadow-soft"
            >
              <Sparkles size={15} className="text-violet" /> Tạo với AI
            </a>
          </div>
        }
      />

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Tổng mô hình"
          value={models.data?.totalElements ?? 0}
          icon={Boxes}
          tone="bg-violet-soft text-violet"
        />
        <Stat label="Tải lên trực tiếp" value={count('UPLOAD')} icon={Upload} tone="bg-teal-soft text-teal" />
        <Stat label="Tạo bởi AI" value={count('AI')} icon={Sparkles} tone="bg-peach text-orange-deep" />
        <Stat label="Dựng trong 3D Studio" value={count('EDITOR')} icon={History} tone="bg-mint text-[#0f5132]" />
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3 rounded-[2rem] bg-white/90 p-4 shadow-soft">
        <div className="flex min-w-[240px] flex-1 items-center gap-3 rounded-full bg-surface-low px-4">
          <Search size={18} className="text-ink-soft" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm theo tên mô hình hoặc mô tả"
            aria-label="Tìm mô hình"
            className="h-11 w-full bg-transparent text-sm outline-none"
          />
        </div>
        {(['', 'UPLOAD', 'AI', 'EDITOR'] as const).map((o) => (
          <button
            key={o || 'all'}
            type="button"
            aria-pressed={origin === o}
            onClick={() => setOrigin(o)}
            className={`rounded-full px-4 py-2 font-label text-xs font-semibold ${origin === o ? 'bg-ink text-white' : 'bg-surface-low text-ink-soft hover:bg-surface-high'}`}
          >
            {o ? ORIGIN[o].label : 'Tất cả nguồn gốc'}
          </button>
        ))}
      </div>
      {(origin || term) && (
        <ApiNote className="mt-3">
          Lọc nguồn gốc / tìm kiếm áp dụng trên trang hiện tại — API /api/models/getAll chỉ hỗ trợ phân trang.
        </ApiNote>
      )}

      <div className="mt-6">
        <QueryState isLoading={models.isLoading} error={models.error} onRetry={() => models.refetch()}>
          {!visible.length ? (
            <StatusBlock
              tone="empty"
              title={items.length ? 'Không có mô hình phù hợp' : 'Chưa có mô hình nào trong thư viện'}
              body={
                items.length
                  ? 'Thử bộ lọc khác.'
                  : 'Tải lên tệp STL / OBJ / GLB / 3MF hoặc tạo mô hình mới bằng AI Studio.'
              }
              action={
                <Link
                  to="/models/upload"
                  className="rounded-full bg-ink px-6 py-3 font-label text-sm font-semibold text-white"
                >
                  Tải lên tệp 3D đầu tiên
                </Link>
              }
            />
          ) : (
            <div className={`grid gap-5 sm:grid-cols-2 lg:grid-cols-3 ${models.isPlaceholderData ? 'opacity-60' : ''}`}>
              {visible.map((m) => (
                <ModelCard key={m.modelId} model={m} />
              ))}
            </div>
          )}
          {models.data && (
            <Pagination
              page={models.data.page}
              totalPages={models.data.totalPages}
              onChange={(p) => setParams(p > 0 ? { page: String(p + 1) } : {})}
            />
          )}
        </QueryState>
      </div>
    </>
  )
}

function ModelCard({ model: m }: { model: ModelSummary }) {
  const origin = ORIGIN[m.originType] ?? { label: m.originType, tone: 'bg-surface-high text-ink-soft' }
  return (
    <article className="group flex flex-col rounded-[2rem] bg-white/95 p-3 shadow-soft transition hover:-translate-y-1 hover:shadow-lift">
      <Link
        to={`/models/${m.modelId}`}
        className={`relative grid aspect-[4/3] place-items-center rounded-[1.6rem] bg-gradient-to-br ${STAGES[m.modelId % STAGES.length]}`}
      >
        <span className="grid h-20 w-20 place-items-center rounded-3xl bg-white/85 text-violet shadow-soft transition group-hover:-translate-y-1">
          <Boxes size={34} strokeWidth={1.5} />
        </span>
        <span
          className={`absolute left-3 top-3 rounded-full px-2.5 py-1 font-label text-[11px] font-semibold ${origin.tone}`}
        >
          {origin.label}
        </span>
        <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 font-label text-[11px] font-semibold">
          <Lock size={11} /> {m.visibility === 'PRIVATE' ? 'Riêng tư' : m.visibility}
        </span>
      </Link>
      <div className="flex flex-1 flex-col px-2 pb-1.5 pt-4">
        <p className="font-mono text-[11px] text-ink-soft">model_id: {modelCode(m.modelId)}</p>
        <Link
          to={`/models/${m.modelId}`}
          className="mt-1 line-clamp-1 font-display text-xl font-bold hover:text-violet"
        >
          {m.modelName}
        </Link>
        <p className="mt-1 line-clamp-2 text-[13px] text-ink-soft">{m.description || 'Chưa có mô tả.'}</p>
        <p className="mt-3 font-label text-[11px] text-ink-soft">Tạo ngày {formatDate(m.createdAt)}</p>
        <div className="mt-auto flex flex-wrap gap-2 pt-4">
          <Link
            to={`/models/${m.modelId}/versions`}
            className="inline-flex items-center gap-1.5 rounded-full bg-surface-low px-3 py-2 font-label text-xs font-semibold hover:bg-surface-high"
          >
            <History size={13} /> Phiên bản
          </Link>
          <Link
            to={`/models/${m.modelId}`}
            className="ml-auto inline-flex items-center gap-2 rounded-full bg-ink py-1.5 pl-4 pr-1.5 font-label text-xs font-semibold text-white hover:bg-violet"
          >
            Chi tiết
            <span className="grid h-6 w-6 place-items-center rounded-full bg-orange">
              <ArrowRight size={12} />
            </span>
          </Link>
        </div>
      </div>
    </article>
  )
}

function Stat({ label, value, icon: Icon, tone }: { label: string; value: number; icon: typeof Boxes; tone: string }) {
  return (
    <div className="flex items-center gap-4 rounded-[1.75rem] bg-white/95 p-5 shadow-soft">
      <span className={`grid h-12 w-12 place-items-center rounded-2xl ${tone}`}>
        <Icon size={20} />
      </span>
      <span>
        <span className="block font-display text-3xl font-bold">{value}</span>
        <span className="block font-label text-xs text-ink-soft">{label}</span>
      </span>
    </div>
  )
}
