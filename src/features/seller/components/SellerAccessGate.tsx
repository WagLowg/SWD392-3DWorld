import { BadgeCheck, CreditCard, LockKeyhole, Store } from 'lucide-react'
import type { ReactNode } from 'react'
import { Btn } from '../../../shared/ui/kit'
import { QueryState } from '../../../shared/ui/QueryState'
import type { SellerApplication } from '../data/seller.fixtures'
import { useApplication } from '../hooks/useSeller'

type SellerAccessLevel = 'verified' | 'storefront' | 'active'

type GateContent = {
  eyebrow: string
  title: string
  body: string
  action: string
  to: string
  icon: typeof Store
}

function requiredAction(app: SellerApplication, minimum: SellerAccessLevel): GateContent | null {
  if (app.status !== 'VERIFIED') {
    if (app.status === 'PENDING') {
      return {
        eyebrow: 'Hồ sơ đang được xét duyệt',
        title: 'Chưa thể sử dụng Kênh người bán',
        body: 'Hồ sơ người bán của bạn đang được chuyên viên kiểm tra. Bạn có thể theo dõi trạng thái và bổ sung thông tin khi được yêu cầu.',
        action: 'Xem trạng thái hồ sơ',
        to: '/seller/register',
        icon: BadgeCheck,
      }
    }

    const needsUpdate = app.status === 'NEEDS_INFO' || app.status === 'REJECTED'
    return {
      eyebrow: needsUpdate ? 'Hồ sơ cần được cập nhật' : 'Bạn chưa là người bán',
      title: needsUpdate ? 'Hoàn thiện hồ sơ người bán' : 'Đăng ký tài khoản bán hàng',
      body: needsUpdate
        ? 'Hồ sơ hiện chưa được duyệt. Hãy xem phản hồi, bổ sung thông tin và gửi lại để tiếp tục mở gian hàng.'
        : 'Để quản lý sản phẩm, tồn kho, đơn chế tác và doanh thu, bạn cần xác thực tài khoản người bán trước.',
      action: needsUpdate ? 'Bổ sung hồ sơ' : 'Đăng ký người bán',
      to: '/seller/register',
      icon: BadgeCheck,
    }
  }

  if (!app.pickupAddressReady) {
    return {
      eyebrow: 'Thiếu địa chỉ lấy hàng',
      title: 'Hoàn thiện địa chỉ GHTK',
      body: 'Gian hàng cần một địa chỉ mặc định có đủ người liên hệ, số điện thoại, tỉnh/thành, phường/xã và địa chỉ chi tiết để báo phí và hệ thống tự tạo vận đơn GHTK.',
      action: 'Cập nhật địa chỉ lấy hàng',
      to: '/seller/register',
      icon: Store,
    }
  }

  if (minimum === 'verified') return null

  if (!app.storefrontId) {
    return {
      eyebrow: 'Đã xác thực người bán',
      title: 'Tạo gian hàng của bạn',
      body: 'Tài khoản đã được duyệt. Hãy tạo hồ sơ gian hàng trước khi chọn gói và bắt đầu đăng bán sản phẩm.',
      action: 'Tạo gian hàng',
      to: '/seller/storefront',
      icon: Store,
    }
  }

  if (minimum === 'storefront') return null

  if (app.storefrontStatus === 'SUSPENDED') {
    return {
      eyebrow: 'Gian hàng đang tạm ngưng',
      title: 'Chưa thể truy cập khu vực vận hành',
      body: 'Gian hàng đang bị tạm ngưng. Vui lòng xem trạng thái gian hàng hoặc liên hệ quản trị viên trước khi tiếp tục.',
      action: 'Xem hồ sơ gian hàng',
      to: '/seller/storefront',
      icon: LockKeyhole,
    }
  }

  if (app.storefrontStatus !== 'ACTIVE' && app.storefrontStatus !== 'EXPIRING') {
    return {
      eyebrow: app.storefrontStatus === 'EXPIRED' ? 'Gói gian hàng đã hết hạn' : 'Gian hàng chưa được kích hoạt',
      title: 'Đăng ký gói để bắt đầu bán hàng',
      body: 'Bạn đã có gian hàng nhưng chưa có gói còn hiệu lực. Hoàn tất thanh toán gói thuê gian hàng để mở các chức năng quản lý bán hàng.',
      action: app.storefrontStatus === 'EXPIRED' ? 'Gia hạn gói gian hàng' : 'Chọn gói gian hàng',
      to: '/seller/subscription',
      icon: CreditCard,
    }
  }

  return null
}

/** Chặn API nghiệp vụ seller theo đúng tiến trình: xác thực → tạo gian hàng → kích hoạt gói. */
export function SellerAccessGate({ minimum, children }: { minimum: SellerAccessLevel; children: ReactNode }) {
  const application = useApplication()
  const gate = application.data ? requiredAction(application.data, minimum) : null

  return (
    <QueryState isLoading={application.isLoading} error={application.error} onRetry={() => application.refetch()}>
      {application.data && !gate ? (
        children
      ) : gate ? (
        <section className="overflow-hidden rounded-[2rem] bg-white/95 shadow-soft">
          <div className="h-2 bg-gradient-to-r from-violet via-orange to-teal" />
          <div className="grid gap-8 p-7 sm:p-10 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="font-label text-xs font-bold uppercase tracking-[.16em] text-orange-deep">{gate.eyebrow}</p>
              <h1 className="mt-3 max-w-2xl font-display text-3xl font-bold tracking-tight sm:text-4xl">
                {gate.title}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-ink-soft sm:text-base">{gate.body}</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Btn to={gate.to} variant="primary" icon={gate.icon}>
                  {gate.action}
                </Btn>
                <Btn to="/profile" variant="soft">
                  Quay lại tài khoản
                </Btn>
              </div>
            </div>
            <div className="grid h-28 w-28 place-items-center rounded-[2rem] bg-violet-soft text-violet sm:h-36 sm:w-36">
              <gate.icon size={48} strokeWidth={1.7} />
            </div>
          </div>
          <div className="grid gap-px border-t border-line bg-line text-xs sm:grid-cols-3">
            {[
              ['1', 'Xác thực người bán'],
              ['2', 'Tạo hồ sơ gian hàng'],
              ['3', 'Kích hoạt gói bán hàng'],
            ].map(([step, label]) => (
              <div key={step} className="flex items-center gap-3 bg-white px-6 py-4 text-ink-soft">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-surface-low font-display font-bold text-violet">
                  {step}
                </span>
                <span className="font-label font-semibold">{label}</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </QueryState>
  )
}
