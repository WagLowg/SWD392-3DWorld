import type { ShipmentStatus } from '../types/staff.types'

export const SHIPMENT_STATUS_LABELS: Record<ShipmentStatus, string> = {
  PREPARING: 'Chuẩn bị giao hàng',
  HANDED_TO_CARRIER: 'Đã bàn giao vận chuyển',
  IN_TRANSIT: 'Đang vận chuyển',
  ARRIVED_AT_DESTINATION: 'Đến điểm giao',
  DELIVERED: 'Giao thành công',
  RECEIVED: 'Đã nhận hàng',
  RETURNED: 'Hoàn trả',
  FAILED: 'Giao thất bại',
  CANCELLED: 'Đã huỷ',
  PENDING: 'Chờ seller bàn giao',
  PENDING_PICKUP: 'Chờ seller bàn giao',
  SHIPPED: 'Đã bàn giao vận chuyển',
}

export const VALID_SHIPMENT_TRANSITIONS: Record<ShipmentStatus, ShipmentStatus[]> = {
  // PREPARING → SHIPPED thuộc quyền Seller, Staff không được nhận thay bước bàn giao này.
  PREPARING: [],
  HANDED_TO_CARRIER: ['IN_TRANSIT', 'FAILED', 'RETURNED'],
  IN_TRANSIT: ['ARRIVED_AT_DESTINATION', 'FAILED', 'RETURNED'],
  ARRIVED_AT_DESTINATION: ['DELIVERED', 'FAILED', 'RETURNED'],
  // RECEIVED chỉ do Buyer xác nhận hoặc Backend tự xác nhận sau thời hạn; Staff không được chuyển trạng thái này.
  DELIVERED: ['RETURNED'],
  RECEIVED: [],
  RETURNED: [],
  FAILED: ['IN_TRANSIT', 'RETURNED'],
  CANCELLED: [],
  PENDING: [],
  PENDING_PICKUP: [],
  SHIPPED: ['IN_TRANSIT', 'FAILED', 'RETURNED'],
}

export function isValidShipmentTransition(from: ShipmentStatus, to: ShipmentStatus): boolean {
  const allowed = VALID_SHIPMENT_TRANSITIONS[from] || []
  return allowed.includes(to)
}
