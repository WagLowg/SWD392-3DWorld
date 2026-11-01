import type { CodPayment } from '../types/order.types'

export function canRecordCodCollection(fulfillmentStatus: string, payment: CodPayment) {
  return ['DELIVERED', 'RECEIVED'].includes(fulfillmentStatus) && payment.collectionStatus === 'PENDING_COLLECTION'
}

export function canRecordCodSettlement(admin: boolean, payment: CodPayment) {
  return admin && payment.collectionStatus === 'PENDING_SETTLEMENT'
}

