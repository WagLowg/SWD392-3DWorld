import { http } from '../../../shared/api'
import { toQueryString } from '../../../shared/lib/query'
import type {
  AdminDateRange,
  AdminPage,
  CommissionRow,
  DashboardMetrics,
  DebtAssessment,
  DebtLedgerEntry,
  EarningReconciliation,
  ShippingDebtDetail,
  ShopFinanceSummary,
  SubscriptionRow,
  WalletFilters,
  WalletRow,
} from '../types/admin-finance.types'

type JsonRecord = Record<string, unknown>

const BASE = '/api/admin/dashboard'

function record(value: unknown): JsonRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as JsonRecord) : {}
}

function unwrap(value: unknown): unknown {
  const body = record(value)
  return 'data' in body ? body.data : value
}

function pick(source: JsonRecord, ...keys: string[]): unknown {
  for (const key of keys) if (source[key] !== undefined && source[key] !== null) return source[key]
  return undefined
}

function numberOf(source: JsonRecord, ...keys: string[]): number {
  const value = Number(pick(source, ...keys))
  return Number.isFinite(value) ? value : 0
}

function nullableNumberOf(source: JsonRecord, ...keys: string[]): number | null {
  const raw = pick(source, ...keys)
  if (raw === undefined || raw === null || raw === '') return null
  const value = Number(raw)
  return Number.isFinite(value) ? value : null
}

function stringOf(source: JsonRecord, ...keys: string[]): string {
  const value = pick(source, ...keys)
  return value === undefined || value === null ? '' : String(value)
}

function nullableStringOf(source: JsonRecord, ...keys: string[]): string | null {
  return stringOf(source, ...keys) || null
}

function booleanOf(source: JsonRecord, ...keys: string[]): boolean {
  const value = pick(source, ...keys)
  return value === true || value === 1 || String(value).toLowerCase() === 'true'
}

function arrayOf(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function pageOf<T>(
  value: unknown,
  map: (item: JsonRecord, index: number) => T,
  requestedPage = 0,
  requestedSize = 20,
): AdminPage<T> {
  const unwrapped = unwrap(value)
  const data = record(unwrapped)
  const rawItems = Array.isArray(unwrapped) ? unwrapped : pick(data, 'items', 'content', 'results')
  const items = arrayOf(rawItems).map((item, index) => map(record(item), index))
  const rowMetadata = record(arrayOf(rawItems)[0])
  const page = numberOf(data, 'page', 'number', 'pageNumber') || requestedPage
  const size = numberOf(data, 'size', 'pageSize') || requestedSize
  const totalElements =
    numberOf(data, 'totalElements', 'totalItems', 'total') ||
    numberOf(rowMetadata, 'totalElements', 'totalItems', 'total', 'total_elements', 'total_items') ||
    items.length
  const totalPages = numberOf(data, 'totalPages', 'pages') || Math.max(1, Math.ceil(totalElements / size))
  return { items, page, size, totalElements, totalPages }
}

function subscriptionOf(item: JsonRecord, index: number): SubscriptionRow {
  const shopId = numberOf(item, 'shopId', 'storefrontId', 'shop_id', 'storefront_id')
  return {
    id: stringOf(item, 'id', 'subscriptionId', 'subscription_id') || `${shopId}-${index}`,
    userId: nullableNumberOf(item, 'userId', 'ownerId', 'user_id', 'owner_id'),
    userName: stringOf(item, 'userName', 'ownerName', 'fullName', 'user_name', 'owner_name') || '—',
    shopId,
    shopName: stringOf(item, 'shopName', 'storefrontName', 'shop_name', 'storefront_name') || `Shop #${shopId}`,
    packageName: stringOf(item, 'packageName', 'planName', 'package_name', 'plan_name') || 'STOREFRONT_SUBSCRIPTION',
    cycle: stringOf(item, 'cycle', 'billingCycle', 'billing_cycle') || '30_DAYS',
    amount: numberOf(item, 'amount', 'fee', 'paidAmount', 'paid_amount'),
    paidAt: nullableStringOf(item, 'paidAt', 'paymentAt', 'paid_at', 'payment_at'),
    activatedAt: nullableStringOf(item, 'activatedAt', 'startAt', 'activationAt', 'activated_at', 'start_at'),
    expiresAt: nullableStringOf(item, 'expiresAt', 'endAt', 'expiryAt', 'expires_at', 'end_at'),
  }
}

function commissionOf(item: JsonRecord, index: number): CommissionRow {
  const shopId = numberOf(item, 'shopId', 'storefrontId', 'shop_id', 'storefront_id')
  const orderId = nullableNumberOf(item, 'orderId', 'order_id')
  return {
    id: stringOf(item, 'id', 'earningId', 'earning_id') || `${orderId ?? 'row'}-${index}`,
    orderId,
    orderCode:
      stringOf(item, 'orderCode', 'orderNumber', 'order_code', 'order_number') || (orderId ? `#${orderId}` : '—'),
    shopId,
    shopName: stringOf(item, 'shopName', 'storefrontName', 'shop_name', 'storefront_name') || `Shop #${shopId}`,
    orderValue: numberOf(item, 'orderValue', 'orderAmount', 'subtotal', 'order_value', 'order_amount'),
    commissionRate: numberOf(item, 'commissionRate', 'rate', 'commission_rate'),
    commissionAmount: numberOf(item, 'commissionAmount', 'commission', 'commission_amount'),
    sellerNetAmount: numberOf(item, 'sellerNetAmount', 'sellerEntitlement', 'seller_net_amount', 'seller_entitlement'),
    debtOffset: numberOf(item, 'debtOffset', 'shippingDebtOffset', 'debt_offset', 'shipping_debt_offset'),
    creditedToShop: numberOf(item, 'creditedToShop', 'creditedAmount', 'credited_to_shop', 'credited_amount'),
    status: stringOf(item, 'status', 'earningStatus', 'earning_status') || 'PENDING_REFUND_WINDOW',
    refundUnderReview: booleanOf(item, 'refundUnderReview', 'refund_under_review'),
    createdAt: nullableStringOf(item, 'createdAt', 'earningCreatedAt', 'created_at', 'earning_created_at'),
    releasedAt: nullableStringOf(item, 'releasedAt', 'recognizedAt', 'released_at', 'recognized_at'),
  }
}

function walletOf(item: JsonRecord): WalletRow {
  const shopId = numberOf(item, 'shopId', 'storefrontId', 'shop_id', 'storefront_id')
  const shippingDebt = numberOf(item, 'shippingDebt', 'returnShippingDebt', 'shipping_debt', 'return_shipping_debt')
  return {
    shopId,
    shopName: stringOf(item, 'shopName', 'storefrontName', 'shop_name', 'storefront_name') || `Shop #${shopId}`,
    ownerName: stringOf(item, 'ownerName', 'userName', 'owner_name', 'user_name') || '—',
    availableBalance: numberOf(item, 'availableBalance', 'balance', 'available_balance'),
    heldBalance: numberOf(item, 'heldBalance', 'held_balance'),
    retainedReserve:
      numberOf(item, 'retainedReserve', 'minimumRetainedBalance', 'retained_reserve', 'minimum_retained_balance') ||
      100_000,
    shippingDebt,
    signedShippingDebt:
      numberOf(item, 'signedShippingDebt', 'signed_shipping_debt') || (shippingDebt ? -shippingDebt : 0),
    shippingDebtSince: nullableStringOf(item, 'shippingDebtSince', 'debtSince', 'shipping_debt_since', 'debt_since'),
    debtAgeDays: nullableNumberOf(item, 'debtAgeDays', 'debtDays', 'debt_age_days', 'debt_days'),
    lastOrderAt: nullableStringOf(
      item,
      'lastOrderAt',
      'lastNonCancelledOrderAt',
      'last_order_at',
      'last_non_cancelled_order_at',
    ),
    withdrawalLocked: booleanOf(item, 'withdrawalLocked', 'payoutLocked', 'withdrawal_locked', 'payout_locked'),
    suspensionCandidate: booleanOf(
      item,
      'suspensionCandidate',
      'eligibleForSuspension',
      'suspension_candidate',
      'eligible_for_suspension',
    ),
    storefrontStatus: stringOf(item, 'storefrontStatus', 'shopStatus', 'storefront_status', 'shop_status') || 'UNKNOWN',
  }
}

function assessmentOf(item: JsonRecord, index: number): DebtAssessment {
  const orderId = nullableNumberOf(item, 'orderId', 'order_id')
  const outboundFee = numberOf(item, 'outboundFee', 'shippingFee', 'outbound_fee', 'shipping_fee')
  const returnFee = numberOf(item, 'returnFee', 'returnShippingFee', 'return_fee', 'return_shipping_fee')
  return {
    id: stringOf(item, 'id', 'assessmentId', 'assessment_id') || `assessment-${index}`,
    orderId,
    orderCode: stringOf(item, 'orderCode', 'order_code') || (orderId ? `#${orderId}` : '—'),
    assessedAt: nullableStringOf(item, 'assessedAt', 'createdAt', 'assessed_at', 'created_at'),
    outboundFee,
    returnFee,
    totalFee: numberOf(item, 'totalFee', 'assessedAmount', 'total_fee', 'assessed_amount') || outboundFee + returnFee,
    debitedFromBalance: numberOf(item, 'debitedFromBalance', 'balanceDebit', 'debited_from_balance', 'balance_debit'),
    addedToDebt: numberOf(item, 'addedToDebt', 'debtIncrease', 'added_to_debt', 'debt_increase'),
    repaidAmount: numberOf(item, 'repaidAmount', 'settledAmount', 'repaid_amount', 'settled_amount'),
    outstandingAmount: numberOf(item, 'outstandingAmount', 'remainingAmount', 'outstanding_amount', 'remaining_amount'),
  }
}

function ledgerOf(item: JsonRecord, index: number): DebtLedgerEntry {
  return {
    id: stringOf(item, 'id', 'ledgerId', 'ledger_id') || `ledger-${index}`,
    createdAt: nullableStringOf(item, 'createdAt', 'occurredAt', 'created_at', 'occurred_at'),
    type: stringOf(item, 'type', 'entryType', 'transactionType', 'entry_type', 'transaction_type') || 'ADJUSTMENT',
    amount: numberOf(item, 'amount', 'offsetAmount', 'settledAmount', 'offset_amount', 'settled_amount'),
    reference: stringOf(item, 'reference', 'referenceId', 'reference_id') || '—',
    description: stringOf(item, 'description', 'note', 'reason') || '—',
  }
}

function earningReconciliationOf(value: unknown, orderId: number): EarningReconciliation {
  const item = record(unwrap(value))
  return {
    orderId: numberOf(item, 'orderId', 'physicalOrderId', 'order_id', 'physical_order_id') || orderId,
    orderStatus: stringOf(item, 'orderStatus', 'order_status') || 'UNKNOWN',
    totalAmount: numberOf(item, 'totalAmount', 'total_amount'),
    receivedAt: nullableStringOf(item, 'receivedAt', 'received_at'),
    refundDeadlineAt: nullableStringOf(item, 'refundDeadlineAt', 'refund_deadline_at'),
    effectiveRefundDeadline: nullableStringOf(item, 'effectiveRefundDeadline', 'effective_refund_deadline'),
    earningId: nullableNumberOf(item, 'earningId', 'earning_id'),
    earningStatus: nullableStringOf(item, 'earningStatus', 'earning_status'),
    commissionAmount: numberOf(item, 'commissionAmount', 'commission_amount'),
    netAmount: numberOf(item, 'netAmount', 'net_amount'),
    platformFundsReceivedAt: nullableStringOf(item, 'platformFundsReceivedAt', 'platform_funds_received_at'),
    releaseEligibleAt: nullableStringOf(item, 'releaseEligibleAt', 'release_eligible_at'),
    releasedAt: nullableStringOf(item, 'releasedAt', 'released_at'),
    pendingBalance: numberOf(item, 'pendingBalance', 'pending_balance'),
    platformReceived: numberOf(item, 'platformReceived', 'platform_received'),
    blockingRefund: booleanOf(item, 'blockingRefund', 'blocking_refund'),
    blockers: arrayOf(pick(item, 'blockers')).map(String),
    eligibleForRelease: booleanOf(item, 'eligibleForRelease', 'eligible_for_release'),
    recognitionStatus: stringOf(item, 'recognitionStatus', 'recognition_status') || 'NOT_RECOGNIZED',
  }
}

export const adminFinanceService = {
  async metrics(range: AdminDateRange, signal?: AbortSignal): Promise<DashboardMetrics> {
    const raw = await http.get<unknown>(`${BASE}/metrics${toQueryString(range)}`, { signal })
    const data = record(unwrap(raw))
    return {
      realizedCommission: numberOf(
        data,
        'realizedCommission',
        'realizedRevenue',
        'realized_commission',
        'realized_revenue',
      ),
      provisionalCommission: numberOf(
        data,
        'provisionalCommission',
        'provisionalRevenue',
        'provisional_commission',
        'provisional_revenue',
      ),
      subscriptionIncome: numberOf(data, 'subscriptionIncome', 'rentalIncome', 'subscription_income', 'rental_income'),
      totalShippingDebt: numberOf(
        data,
        'totalShippingDebt',
        'currentTotalDebt',
        'shippingDebt',
        'total_shipping_debt',
        'current_total_debt',
      ),
    }
  },

  async commissions(range: AdminDateRange, page: number, size: number, shopId?: number, signal?: AbortSignal) {
    const raw = await http.get<unknown>(`${BASE}/commissions${toQueryString({ ...range, shopId, page, size })}`, {
      signal,
    })
    return pageOf(raw, commissionOf, page, size)
  },

  async earning(orderId: number, signal?: AbortSignal) {
    const raw = await http.get<unknown>(`/api/admin/finance/orders/${orderId}/earning`, { signal })
    return earningReconciliationOf(raw, orderId)
  },

  async reconcileEarning(orderId: number) {
    const raw = await http.post<unknown>(`/api/admin/finance/orders/${orderId}/earning/reconcile`)
    return earningReconciliationOf(raw, orderId)
  },

  async subscriptions(
    range: AdminDateRange,
    page: number,
    size: number,
    shopId?: number,
    userId?: number,
    signal?: AbortSignal,
  ) {
    const raw = await http.get<unknown>(
      `${BASE}/subscriptions${toQueryString({ ...range, shopId, userId, page, size })}`,
      { signal },
    )
    return pageOf(raw, subscriptionOf, page, size)
  },

  async wallets(filters: WalletFilters, signal?: AbortSignal) {
    const raw = await http.get<unknown>(`${BASE}/wallets${toQueryString(filters)}`, { signal })
    return pageOf(raw, walletOf, filters.page, filters.size)
  },

  async shop(shopId: number, signal?: AbortSignal): Promise<ShopFinanceSummary> {
    const raw = await http.get<unknown>(`${BASE}/shops/${shopId}`, { signal })
    const data = record(unwrap(raw))
    const subscriptions = arrayOf(pick(data, 'subscriptions', 'subscriptionPayments', 'subscription_payments')).map(
      (row, index) => subscriptionOf(record(row), index),
    )
    return {
      shopId: numberOf(data, 'shopId', 'storefrontId', 'shop_id', 'storefront_id') || shopId,
      shopName: stringOf(data, 'shopName', 'storefrontName', 'shop_name', 'storefront_name') || `Shop #${shopId}`,
      storefrontStatus: stringOf(data, 'storefrontStatus', 'status', 'storefront_status') || 'UNKNOWN',
      lifetimeSubscriptionIncome: numberOf(
        data,
        'lifetimeSubscriptionIncome',
        'subscriptionIncome',
        'lifetime_subscription_income',
        'subscription_income',
      ),
      realizedCommission: numberOf(
        data,
        'realizedCommission',
        'realizedRevenue',
        'realized_commission',
        'realized_revenue',
      ),
      currentShippingDebt: numberOf(
        data,
        'currentShippingDebt',
        'shippingDebt',
        'current_shipping_debt',
        'shipping_debt',
      ),
      subscriptions,
    }
  },

  async shippingDebt(shopId: number, signal?: AbortSignal): Promise<ShippingDebtDetail> {
    const raw = await http.get<unknown>(`${BASE}/shops/${shopId}/shipping-debt`, { signal })
    const data = record(unwrap(raw))
    return {
      shopId: numberOf(data, 'shopId', 'storefrontId', 'shop_id', 'storefront_id') || shopId,
      shopName: stringOf(data, 'shopName', 'storefrontName', 'shop_name', 'storefront_name') || `Shop #${shopId}`,
      currentDebt: numberOf(data, 'currentDebt', 'shippingDebt', 'current_debt', 'shipping_debt'),
      debtSince: nullableStringOf(data, 'debtSince', 'shippingDebtSince', 'debt_since', 'shipping_debt_since'),
      assessments: arrayOf(pick(data, 'assessments', 'feeAssessments', 'charges', 'fee_assessments')).map(
        (row, index) => assessmentOf(record(row), index),
      ),
      ledgerEntries: arrayOf(
        pick(data, 'ledgerEntries', 'settlements', 'repayments', 'ledgerHistory', 'ledger_entries', 'ledger_history'),
      ).map((row, index) => ledgerOf(record(row), index)),
    }
  },

  async suspend(shopId: number, inactiveDays: number, reason: string) {
    return http.post<unknown>(`${BASE}/shops/${shopId}/suspend-for-debt`, { inactiveDays, reason })
  },

  async restore(shopId: number, reason: string) {
    return http.post<unknown>(`${BASE}/shops/${shopId}/restore-after-debt`, { reason })
  },
}
