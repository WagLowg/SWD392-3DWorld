import { useQuery } from '@tanstack/react-query'
import { useMockAction } from '../../../shared/mock/useMockAction'
import type { ProductStatus, SellerApplication, SellerProduct, Storefront } from '../data/seller.fixtures'
import { sellerService } from '../services/seller.service'

export const sellerKeys = {
  all: ['seller-mock'] as const,
  application: ['seller-mock', 'application'] as const,
  subscription: ['seller-mock', 'subscription'] as const,
  storefront: ['seller-mock', 'storefront'] as const,
  products: ['seller-mock', 'products'] as const,
  product: (id: number) => ['seller-mock', 'products', id] as const,
  inventory: ['seller-mock', 'inventory'] as const,
  disputes: ['seller-mock', 'disputes'] as const,
  dispute: (id: string) => ['seller-mock', 'disputes', id] as const,
  earnings: ['seller-mock', 'earnings'] as const,
  earning: (id: string) => ['seller-mock', 'earnings', id] as const,
}

export const useApplication = () => useQuery({ queryKey: sellerKeys.application, queryFn: sellerService.application })
export const useSubscription = () => useQuery({ queryKey: sellerKeys.subscription, queryFn: sellerService.subscription })
export const useStorefront = () => useQuery({ queryKey: sellerKeys.storefront, queryFn: sellerService.storefront })
export const useSellerProducts = () => useQuery({ queryKey: sellerKeys.products, queryFn: sellerService.products })
export const useSellerProduct = (id: number) =>
  useQuery({ queryKey: sellerKeys.product(id), queryFn: () => sellerService.product(id), enabled: Number.isFinite(id) })
export const useInventoryLogs = () => useQuery({ queryKey: sellerKeys.inventory, queryFn: sellerService.inventoryLogs })
export const useDisputes = () => useQuery({ queryKey: sellerKeys.disputes, queryFn: sellerService.disputes })
export const useDispute = (id: string) => useQuery({ queryKey: sellerKeys.dispute(id), queryFn: () => sellerService.dispute(id) })
export const useEarnings = () => useQuery({ queryKey: sellerKeys.earnings, queryFn: sellerService.earnings })
export const useEarning = (id: string) => useQuery({ queryKey: sellerKeys.earning(id), queryFn: () => sellerService.earning(id) })

const ALL = [sellerKeys.all]

export const useSubmitApplication = () =>
  useMockAction(
    (patch: Partial<Pick<SellerApplication, 'storefrontName' | 'description' | 'address' | 'technologies'>>) =>
      sellerService.submitApplication(patch),
    ALL,
    'Đã nộp hồ sơ — chờ chuyên viên xét duyệt.',
  )
export const useRenew = () => useMockAction((planId: string) => sellerService.renew(planId), ALL, 'Đã gia hạn gói xưởng.')
export const useUpdateStorefront = () =>
  useMockAction((patch: Partial<Storefront>) => sellerService.updateStorefront(patch), ALL, 'Đã lưu hồ sơ gian hàng.')
export const useSaveProduct = () =>
  useMockAction(
    ({ input, submit }: { input: Parameters<typeof sellerService.saveProduct>[0]; submit: boolean }) => sellerService.saveProduct(input, submit),
    ALL,
    (p: SellerProduct) => (p.status === 'PENDING_REVIEW' ? 'Đã gửi duyệt sản phẩm.' : 'Đã lưu bản nháp.'),
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
    ({ variantId, price, reason }: { variantId: number; price: number; reason: string }) => sellerService.changePrice(variantId, price, reason),
    ALL,
    'Đã cập nhật giá & ghi log.',
  )
export const useRespondDispute = () =>
  useMockAction(
    ({ id, response, proposal }: { id: string; response: string; proposal: 'REPRINT' | 'REFUND' | 'CONTEST' }) =>
      sellerService.respondDispute(id, response, proposal),
    ALL,
    'Đã gửi phản hồi tranh chấp.',
  )
