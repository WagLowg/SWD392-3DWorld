export type PodScreenGroup = 'public' | 'account' | 'request' | 'finance' | 'staff' | 'system'

export type PodScreenDefinition = {
  id: number
  route: string
  title: string
  eyebrow: string
  description: string
  group: PodScreenGroup
  apiState: 'connected' | 'partial' | 'missing' | 'shared-auth'
}

export type PrintMaterial = {
  materialId: number
  materialName: string
  technologyCode: string
  unit: string
  estimatedCost?: number
  active?: boolean
}

export type PrintRequestItem = {
  printRequestItemId: number
  materialId?: number | null
  modelVersionId?: number | null
  sourceType?: string | null
  color?: string | null
  quality?: string | null
  infillPercent?: number | null
  widthMm?: number | null
  heightMm?: number | null
  depthMm?: number | null
  quantity?: number | null
  notes?: string | null
  productionStatus?: string | null
}

export type PodAllowedActions = {
  editFile: boolean
  editSpecification: boolean
  confirmPreview: boolean
  submit: boolean
  requestRevision: boolean
  acceptQuote: boolean
  pay: boolean
  cancel: boolean
}

export type PodWorkflow = {
  displayStatus: string
  quoteDeadline?: string | null
  paymentExpiresAt?: string | null
  remainingRevisions?: number | null
  currentFileVersion?: number | null
  currentSpecVersion?: number | null
  allowedActions: PodAllowedActions
}

export type PodProductionSummary = {
  totalItems: number
  queuedItems: number
  printingItems: number
  completedItems: number
  productionDisplayStatus: string
}

export type PodShippingReadiness = {
  shippingReady: boolean
  shippingBlockers: string[]
  completedItems: number
  totalItems: number
  shipmentExists: boolean
}

export type PrintRequest = {
  printRequestId: number
  status: string
  customerNotes?: string | null
  createdAt?: string | null
  updatedAt?: string | null
  lockedAt?: string | null
  items?: PrintRequestItem[]
  workflow?: PodWorkflow | null
  production?: PodProductionSummary | null
  shipping?: PodShippingReadiness | null
}

export type PrintFileVersion = {
  printRequestId: number
  version: number
  fileName: string
  fileSize: number
  fileType: string
  uploadedAt: string
  current: boolean
  downloadPath: string
}

export type PrintSpecificationVersion = {
  specVersionId: number
  version: number
  specificationData: Record<string, unknown>
  createdAt: string
  createdByUserId: number
  isCurrent: boolean
}

export type PrintStatusHistory = {
  historyId: number
  fromStatus?: string | null
  toStatus: string
  changedAt: string
  changedByUserId?: number | null
  reason?: string | null
}

export type PrintQuoteItem = {
  printQuoteItemId: number
  printRequestItemId: number
  fileVersionSnapshot: number
  specificationVersionSnapshot: number
  specificationSnapshot?: Record<string, unknown> | null
  quantitySnapshot: number
  materialCostSnapshot: number
  laborCostSnapshot: number
  optionFeeSnapshot: number
  lineTotal: number
}

export type PrintQuote = {
  printQuoteId: number
  printRequestId: number
  versionNumber: number
  fileVersionSnapshot: number
  specificationVersionSnapshot: number
  totalAmount: number
  depositAmount: number
  remainingAmount: number
  etaAt?: string | null
  issuedAt: string
  expiresAt: string
  acceptedAt?: string | null
  quoteStatus: string
  current: boolean
  postQuoteRevisionsUsed: number
  remainingRevisions: number
  items: PrintQuoteItem[]
}

export type PodPayment = {
  transactionId: number
  attemptId: number
  appTransId: string
  amount: number
  status: string
  orderUrl: string
  zpTransToken: string
}

export type PodPaymentStatus = {
  transactionId: number
  printRequestId: number
  quoteId: number
  financialStatus: string
  fulfillmentStatus: string
  amount: number
  currency: string
  latestAttemptId?: number | null
  latestAttemptStatus?: string | null
  attemptReconciliationPending: boolean
  attemptExpiresAt?: string | null
  createdAt: string
  updatedAt: string
  completedAt?: string | null
}

export type UpdatePrintSpecificationInput = {
  expectedCurrentSpecVersion: number
  items: Array<{
    printRequestItemId: number
    materialId: number
    color?: string | null
    quality?: string | null
    infillPercent?: number | null
    widthMm?: number | null
    heightMm?: number | null
    depthMm?: number | null
    quantity: number
    notes?: string | null
  }>
}

export type PodProfile = {
  userId: number
  email: string
  fullName: string
  phone?: string | null
  dateOfBirth?: string | null
  avatarUrl?: string | null
  emailVerified?: boolean
}

export type PodAddress = {
  id?: number
  addressId?: number
  recipientName: string
  phone?: string | null
  addressLine: string
  city?: string | null
  province?: string | null
  district?: string | null
  ward?: string | null
  isDefault?: boolean
}
