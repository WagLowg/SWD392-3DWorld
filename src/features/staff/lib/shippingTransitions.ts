import type { ShipmentStatus } from '../types/staff.types'

export const SHIPMENT_STATUS_LABELS: Record<ShipmentStatus, string> = {
  PENDING: 'Chờ vận chuyển',
  SHIPPED: 'Đang vận chuyển',
  DELIVERED: 'Giao thành công',
  FAILED: 'Giao thất bại',
  RETURNED: 'Đã chuyển hoàn',
}

export const VALID_SHIPMENT_TRANSITIONS: Record<ShipmentStatus, ShipmentStatus[]> = {
  PENDING: ['SHIPPED'],
  SHIPPED: ['DELIVERED', 'FAILED', 'RETURNED'],
  FAILED: ['RETURNED'],
  DELIVERED: [],
  RETURNED: [],
}

export function isValidShipmentTransition(from: ShipmentStatus, to: ShipmentStatus): boolean {
  const allowed = VALID_SHIPMENT_TRANSITIONS[from] || []
  return allowed.includes(to)
}

export function isReasonRequiredForTransition(to: ShipmentStatus): boolean {
  return to === 'FAILED' || to === 'RETURNED'
}

