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

export type PrintRequest = {
  printRequestId: number
  status: string
  customerNotes?: string | null
  createdAt?: string | null
  updatedAt?: string | null
  lockedAt?: string | null
  items?: PrintRequestItem[]
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
