export type AdminDateRange = {
  from: string
  to: string
}

export type AdminPage<T> = {
  items: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export type DashboardMetrics = {
  realizedCommission: number
  provisionalCommission: number
  subscriptionIncome: number
  totalShippingDebt: number
}

export type CommissionRow = {
  id: string
  orderId: number | null
  orderCode: string
  shopId: number
  shopName: string
  orderValue: number
  commissionRate: number
  commissionAmount: number
  sellerNetAmount: number
  debtOffset: number
  creditedToShop: number
  status: string
  refundUnderReview: boolean
  createdAt: string | null
  releasedAt: string | null
}

export type EarningReconciliation = {
  orderId: number
  orderStatus: string
  totalAmount: number
  receivedAt: string | null
  refundDeadlineAt: string | null
  effectiveRefundDeadline: string | null
  earningId: number | null
  earningStatus: string | null
  commissionAmount: number
  netAmount: number
  platformFundsReceivedAt: string | null
  releaseEligibleAt: string | null
  releasedAt: string | null
  pendingBalance: number
  platformReceived: number
  blockingRefund: boolean
  blockers: string[]
  eligibleForRelease: boolean
  recognitionStatus: string
}

export type SubscriptionRow = {
  id: string
  userId: number | null
  userName: string
  shopId: number
  shopName: string
  packageName: string
  cycle: string
  amount: number
  paidAt: string | null
  activatedAt: string | null
  expiresAt: string | null
}

export type WalletRow = {
  shopId: number
  shopName: string
  ownerName: string
  availableBalance: number
  heldBalance: number
  retainedReserve: number
  shippingDebt: number
  signedShippingDebt: number
  shippingDebtSince: string | null
  debtAgeDays: number | null
  lastOrderAt: string | null
  withdrawalLocked: boolean
  suspensionCandidate: boolean
  storefrontStatus: string
}

export type ShopFinanceSummary = {
  shopId: number
  shopName: string
  storefrontStatus: string
  lifetimeSubscriptionIncome: number
  realizedCommission: number
  currentShippingDebt: number
  subscriptions: SubscriptionRow[]
}

export type DebtAssessment = {
  id: string
  orderId: number | null
  orderCode: string
  assessedAt: string | null
  outboundFee: number
  returnFee: number
  totalFee: number
  debitedFromBalance: number
  addedToDebt: number
  repaidAmount: number
  outstandingAmount: number
}

export type DebtLedgerEntry = {
  id: string
  createdAt: string | null
  type: string
  amount: number
  reference: string
  description: string
}

export type ShippingDebtDetail = {
  shopId: number
  shopName: string
  currentDebt: number
  debtSince: string | null
  assessments: DebtAssessment[]
  ledgerEntries: DebtLedgerEntry[]
}

export type WalletFilters = {
  debtOnly: boolean
  lockedOnly: boolean
  inactiveDays?: number
  page: number
  size: number
}
