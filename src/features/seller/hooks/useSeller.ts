import { useQuery } from '@tanstack/react-query'
import { useMockAction } from '../../../shared/mock/useMockAction'
import type { ProductStatus, SellerApplication, SellerProduct, Storefront } from '../data/seller.fixtures'
import { sellerService, type PendingProductMedia } from '../services/seller.service'

export const sellerKeys = {
  all: ['seller'] as const,
  application: ['seller', 'application'] as const,
  subscription: ['seller', 'subscription'] as const,
  storefront: ['seller', 'storefront'] as const,
  products: ['seller', 'products'] as const,
  product: (id: number) => ['seller', 'products', id] as const,
  inventory: ['seller', 'inventory'] as const,
  disputes: ['seller', 'disputes'] as const,
  dispute: (id: string) => ['seller', 'disputes', id] as const,
  earnings: ['seller', 'earnings'] as const,
  earning: (id: string) => ['seller', 'earnings', id] as const,
  payouts: (page = 0, size = 50) => ['seller', 'payouts', page, size] as const,
  walletLedgers: (page = 0, size = 50) => ['seller', 'wallet-ledgers', page, size] as const,
}

export const useApplication = () => useQuery({ queryKey: sellerKeys.application, queryFn: sellerService.application })
export const useSubscription = () => useQuery({ queryKey: sellerKeys.subscription, queryFn: sellerService.subscription })
export const useStorefront = () => useQuery({ queryKey: sellerKeys.storefront, queryFn: sellerService.storefront })
export const useSellerProducts = () => useQuery({ queryKey: sellerKeys.products, queryFn: sellerService.products })
export const useSellerProduct = (id: number) =>
  useQuery({ queryKey: sellerKeys.product(id), queryFn: () => sellerService.product(id), enabled: Number.isFinite(id) })
export const useDisputes = () => useQuery({ queryKey: sellerKeys.disputes, queryFn: sellerService.disputes })
export const useDispute = (id: string) => useQuery({ queryKey: sellerKeys.dispute(id), queryFn: () => sellerService.dispute(id) })
export const useEarnings = () => useQuery({ queryKey: sellerKeys.earnings, queryFn: sellerService.earnings })
export const useEarning = (id: string) => useQuery({ queryKey: sellerKeys.earning(id), queryFn: () => sellerService.earning(id) })
export const usePayoutHistory = (page = 0, size = 50) =>
  useQuery({ queryKey: sellerKeys.payouts(page, size), queryFn: () => sellerService.payouts(page, size) })
export const useWalletLedgers = (page = 0, size = 50) =>
  useQuery({ queryKey: sellerKeys.walletLedgers(page, size), queryFn: () => sellerService.ledgers(page, size) })

const ALL = [sellerKeys.all]

export const useSubmitApplication = () =>
  useMockAction(
    (
      patch: Pick<SellerApplication, 'storefrontName' | 'description' | 'address' | 'technologies'> & {
        evidence?: string
        phone?: string
      },
    ) => sellerService.submitApplication(patch),
    ALL,
    'Đã nộp hồ sơ xét duyệt — chờ Admin xác minh SĐT, ngân hàng và hồ sơ xưởng.',
  )
export const useCreateStorefront = () =>
  useMockAction(
    (input: { name: string; description?: string }) => sellerService.createStorefront(input),
    ALL,
    'Đã tạo gian hàng — thanh toán gói để kích hoạt.',
  )
export const useRenew = () =>
  useMockAction(() => sellerService.renew(), ALL, 'Đang chuyển sang ZaloPay để thanh toán gói…')
export const useUploadProductMedia = () =>
  useMockAction(
    ({ productId, file, sortOrder, variantId }: { productId: number; file: File; sortOrder?: number; variantId?: number }) =>
      sellerService.uploadMedia(productId, file, sortOrder, variantId),
    ALL,
    'Đã tải ảnh lên — sản phẩm cần nộp duyệt lại.',
  )
export const useRemoveProductMedia = () =>
  useMockAction(
    ({ productId, mediaId }: { productId: number; mediaId: number }) => sellerService.removeMedia(productId, mediaId),
    ALL,
    'Đã gỡ ảnh.',
  )
export const useUpdateStorefront = () =>
  useMockAction((patch: Partial<Storefront>) => sellerService.updateStorefront(patch), ALL, 'Đã lưu hồ sơ gian hàng.')
export const useSaveProduct = () =>
  useMockAction(
    ({ input, submit, pendingMedia = [] }: {
      input: Parameters<typeof sellerService.saveProduct>[0]
      submit: boolean
      pendingMedia?: PendingProductMedia[]
    }) => sellerService.saveProduct(input, submit, pendingMedia),
    ALL,
    (p: SellerProduct) => (p.status === 'PENDING_REVIEW' ? 'Đã gửi duyệt sản phẩm.' : 'Đã lưu sản phẩm.'),
  )
export const useSetProductStatus = () =>
  useMockAction(
    ({ id, status, note }: { id: number; status: ProductStatus; note: string }) => sellerService.setProductStatus(id, status, note),
    ALL,
    'Đã cập nhật trạng thái sản phẩm.',
  )
export const useAdjustStock = () =>
  useMockAction(
    ({ variantId, delta, reason }: { variantId: number; delta: number; reason: string }) => sellerService.adjustStock(variantId, delta, reason),
    ALL,
    'Đã điều chỉnh tồn kho & ghi log.',
  )
export const useChangePrice = () =>
  useMockAction(
    ({ variantId, price }: { variantId: number; price: number }) => sellerService.changePrice(variantId, price),
    ALL,
    'Đã cập nhật giá.',
  )
export const useRequestPayout = () =>
  useMockAction(
    (input: { amount: number; bankAccountId: number; reason: string; idempotencyKey: string }) =>
      sellerService.requestPayout(input),
    [sellerKeys.earnings, ['seller', 'payouts'], ['seller', 'wallet-ledgers']],
    (result) =>
      result.status === 'COMPLETED'
        ? 'Rút tiền thành công.'
        : result.status === 'FAILED'
          ? 'Chuyển khoản không thành công, số dư đã được hoàn lại.'
          : 'Lệnh rút tiền đang được xử lý tự động.',
  )
export const useRespondDispute = () =>
  useMockAction(
    ({ id, response, proposal }: { id: string; response: string; proposal: 'REPRINT' | 'REFUND' | 'CONTEST' }) =>
      sellerService.respondDispute(id, response, proposal),
    ALL,
    'Đã gửi phản hồi tranh chấp.',
  )
