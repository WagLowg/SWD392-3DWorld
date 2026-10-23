import type { ReactNode } from 'react'
import { ApiClientError } from '../../services/http'
import { ErrorScreen, errorKindOf } from './ErrorScreen'
import { StatusBlock } from './StatusBlock'

/** Hiển thị loading / lỗi chuẩn cho một query; lỗi 401/403/404/5xx dùng màn MP 017/018/103/104. */
export function QueryState({
  isLoading,
  error,
  onRetry,
  skeleton,
  children,
}: {
  isLoading: boolean
  error: unknown
  onRetry?: () => void
  skeleton?: ReactNode
  children: ReactNode
}) {
  if (isLoading) {
    return (
      <>
        {skeleton ?? (
          <div className="space-y-4">
            <div className="h-40 animate-pulse rounded-[2rem] bg-white/70" />
            <div className="h-40 animate-pulse rounded-[2rem] bg-white/70" />
          </div>
        )}
      </>
    )
  }
  if (error) {
    const kind = errorKindOf(error)
    if (kind)
      return (
        <ErrorScreen
          kind={kind}
          detail={kind === '403' && error instanceof ApiClientError ? error.message : undefined}
          onRetry={onRetry}
        />
      )
    return (
      <StatusBlock
        tone="error"
        title="Không tải được dữ liệu"
        body={error instanceof ApiClientError ? error.message : 'Vui lòng thử lại.'}
        action={
          onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="rounded-full bg-ink px-6 py-3 font-label text-sm font-semibold text-white"
            >
              Thử lại
            </button>
          )
        }
      />
    )
  }
  return <>{children}</>
}

/** Khung trang trong portal: căn giữa + khoảng cách chuẩn. */
export function PageContainer({ children }: { children: ReactNode }) {
  return <div className="mx-auto max-w-[1320px] px-4 md:px-8">{children}</div>
}
