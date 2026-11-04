export type PendingSellerSubmission = {
  userId?: number
  storefrontName: string
  description: string
  address: string
  technologies: string[]
  evidence?: string
  bankAccountId: number
  phoneSnapshot?: string
  submittedAt: number
}

export type RegisteredStorefrontProfile = {
  userId?: number
  name: string
  description: string
  address?: string
  technologies?: string[]
  evidence?: string
  updatedAt: number
}

const STORAGE_KEY = '3dw_pending_seller_submissions'
const REGISTERED_STOREFRONT_STORAGE_KEY = '3dw_registered_storefront_profiles'

export function getAllRegisteredStorefronts(): RegisteredStorefrontProfile[] {
  try {
    const raw = localStorage.getItem(REGISTERED_STOREFRONT_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function getRegisteredStorefront(userId?: number): RegisteredStorefrontProfile | null {
  const all = getAllRegisteredStorefronts()
  if (!all.length) return null
  if (userId) {
    return all.find((item) => item.userId === userId) ?? null
  }
  return all[0] ?? null
}

export function saveRegisteredStorefront(profile: RegisteredStorefrontProfile) {
  const all = getAllRegisteredStorefronts().filter(
    (item) => (profile.userId ? item.userId !== profile.userId : false),
  )
  all.unshift(profile)
  try {
    localStorage.setItem(REGISTERED_STOREFRONT_STORAGE_KEY, JSON.stringify(all))
  } catch {
    // ignore
  }
}

export function getAllPendingSubmissions(): PendingSellerSubmission[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function getPendingSubmission(userId?: number): PendingSellerSubmission | null {
  const all = getAllPendingSubmissions()
  if (!all.length) return null
  if (userId) {
    return all.find((item) => item.userId === userId) ?? null
  }
  return all[0] ?? null
}

export function savePendingSubmission(submission: PendingSellerSubmission) {
  const all = getAllPendingSubmissions().filter(
    (item) => (submission.userId ? item.userId !== submission.userId : false),
  )
  all.unshift(submission)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
  } catch {
    // ignore
  }

  // Luu kem vao ho so xuong de khong bao gio bi mat thong tin sau khi Admin duyet
  saveRegisteredStorefront({
    userId: submission.userId,
    name: submission.storefrontName,
    description: submission.description,
    address: submission.address,
    technologies: submission.technologies,
    evidence: submission.evidence,
    updatedAt: Date.now(),
  })
}

export function clearPendingSubmission(userId?: number) {
  if (!userId) {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // ignore
    }
    return
  }
  const all = getAllPendingSubmissions().filter((item) => item.userId !== userId)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
  } catch {
    // ignore
  }
}

