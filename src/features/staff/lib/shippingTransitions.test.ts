import { describe, expect, it } from 'vitest'
import {
  isValidShipmentTransition,
  SHIPMENT_STATUS_LABELS,
  VALID_SHIPMENT_TRANSITIONS,
} from './shippingTransitions'

describe('shippingTransitions', () => {
  it('correctly defines human-readable Vietnamese labels for the shipment lifecycle', () => {
    expect(SHIPMENT_STATUS_LABELS.PENDING).toBe('Chờ seller bàn giao')
    expect(SHIPMENT_STATUS_LABELS.HANDED_TO_CARRIER).toBe('Đã bàn giao vận chuyển')
    expect(SHIPMENT_STATUS_LABELS.SHIPPED).toBe('Đã bàn giao vận chuyển')
    expect(SHIPMENT_STATUS_LABELS.IN_TRANSIT).toBe('Đang vận chuyển')
    expect(SHIPMENT_STATUS_LABELS.DELIVERED).toBe('Giao thành công')
    expect(SHIPMENT_STATUS_LABELS.RECEIVED).toBe('Đã nhận hàng')
    expect(SHIPMENT_STATUS_LABELS.RETURNED).toBe('Hoàn trả')
  })

  it('does not let Staff take over the seller handoff step', () => {
    expect(isValidShipmentTransition('PREPARING', 'SHIPPED')).toBe(false)
    expect(isValidShipmentTransition('PENDING', 'HANDED_TO_CARRIER')).toBe(false)
    expect(isValidShipmentTransition('PENDING', 'SHIPPED')).toBe(false)
    expect(isValidShipmentTransition('PENDING', 'IN_TRANSIT')).toBe(false)
    expect(isValidShipmentTransition('PENDING', 'DELIVERED')).toBe(false)
    expect(isValidShipmentTransition('PENDING', 'RETURNED')).toBe(false)
  })

  it('starts the Staff workflow from SHIPPED', () => {
    expect(isValidShipmentTransition('HANDED_TO_CARRIER', 'IN_TRANSIT')).toBe(true)
    expect(isValidShipmentTransition('SHIPPED', 'IN_TRANSIT')).toBe(true)
    expect(isValidShipmentTransition('SHIPPED', 'FAILED')).toBe(true)
    expect(isValidShipmentTransition('SHIPPED', 'RETURNED')).toBe(true)
    expect(isValidShipmentTransition('HANDED_TO_CARRIER', 'DELIVERED')).toBe(false)
    expect(isValidShipmentTransition('HANDED_TO_CARRIER', 'PENDING')).toBe(false)
  })

  it('requires arrival before delivery and supports failure/return branches', () => {
    expect(isValidShipmentTransition('IN_TRANSIT', 'ARRIVED_AT_DESTINATION')).toBe(true)
    expect(isValidShipmentTransition('IN_TRANSIT', 'DELIVERED')).toBe(false)
    expect(isValidShipmentTransition('IN_TRANSIT', 'FAILED')).toBe(true)
    expect(isValidShipmentTransition('IN_TRANSIT', 'RETURNED')).toBe(true)
    expect(isValidShipmentTransition('ARRIVED_AT_DESTINATION', 'DELIVERED')).toBe(true)
    expect(isValidShipmentTransition('ARRIVED_AT_DESTINATION', 'FAILED')).toBe(true)
    expect(isValidShipmentTransition('IN_TRANSIT', 'RECEIVED')).toBe(false)
    expect(isValidShipmentTransition('IN_TRANSIT', 'HANDED_TO_CARRIER')).toBe(false)
  })

  it('allows DELIVERED to close out with RECEIVED and treats terminal states as terminal', () => {
    expect(isValidShipmentTransition('DELIVERED', 'RECEIVED')).toBe(true)
    expect(VALID_SHIPMENT_TRANSITIONS.RECEIVED).toEqual([])
    expect(VALID_SHIPMENT_TRANSITIONS.RETURNED).toEqual([])
    expect(isValidShipmentTransition('DELIVERED', 'HANDED_TO_CARRIER')).toBe(false)
    expect(isValidShipmentTransition('RETURNED', 'HANDED_TO_CARRIER')).toBe(false)
  })
})
