import { describe, expect, it } from 'vitest'
import {
  isReasonRequiredForTransition,
  isValidShipmentTransition,
  SHIPMENT_STATUS_LABELS,
  VALID_SHIPMENT_TRANSITIONS,
} from './shippingTransitions'

describe('shippingTransitions', () => {
  it('correctly defines human-readable Vietnamese labels for 5 statuses', () => {
    expect(SHIPMENT_STATUS_LABELS.PENDING).toBe('Chờ vận chuyển')
    expect(SHIPMENT_STATUS_LABELS.SHIPPED).toBe('Đang vận chuyển')
    expect(SHIPMENT_STATUS_LABELS.DELIVERED).toBe('Giao thành công')
    expect(SHIPMENT_STATUS_LABELS.FAILED).toBe('Giao thất bại')
    expect(SHIPMENT_STATUS_LABELS.RETURNED).toBe('Đã chuyển hoàn')
  })

  it('allows PENDING to transition only to SHIPPED', () => {
    expect(isValidShipmentTransition('PENDING', 'SHIPPED')).toBe(true)
    expect(isValidShipmentTransition('PENDING', 'DELIVERED')).toBe(false)
    expect(isValidShipmentTransition('PENDING', 'FAILED')).toBe(false)
    expect(isValidShipmentTransition('PENDING', 'RETURNED')).toBe(false)
  })

  it('allows SHIPPED to transition to DELIVERED, FAILED, and RETURNED', () => {
    expect(isValidShipmentTransition('SHIPPED', 'DELIVERED')).toBe(true)
    expect(isValidShipmentTransition('SHIPPED', 'FAILED')).toBe(true)
    expect(isValidShipmentTransition('SHIPPED', 'RETURNED')).toBe(true)
    expect(isValidShipmentTransition('SHIPPED', 'PENDING')).toBe(false)
  })

  it('allows FAILED to transition only to RETURNED', () => {
    expect(isValidShipmentTransition('FAILED', 'RETURNED')).toBe(true)
    expect(isValidShipmentTransition('FAILED', 'DELIVERED')).toBe(false)
    expect(isValidShipmentTransition('FAILED', 'SHIPPED')).toBe(false)
    expect(isValidShipmentTransition('FAILED', 'PENDING')).toBe(false)
  })

  it('treats DELIVERED and RETURNED as terminal states with no transitions', () => {
    expect(VALID_SHIPMENT_TRANSITIONS.DELIVERED).toEqual([])
    expect(VALID_SHIPMENT_TRANSITIONS.RETURNED).toEqual([])
    expect(isValidShipmentTransition('DELIVERED', 'SHIPPED')).toBe(false)
    expect(isValidShipmentTransition('RETURNED', 'SHIPPED')).toBe(false)
  })

  it('requires reason when transitioning to FAILED or RETURNED', () => {
    expect(isReasonRequiredForTransition('FAILED')).toBe(true)
    expect(isReasonRequiredForTransition('RETURNED')).toBe(true)
    expect(isReasonRequiredForTransition('SHIPPED')).toBe(false)
    expect(isReasonRequiredForTransition('DELIVERED')).toBe(false)
  })
})
