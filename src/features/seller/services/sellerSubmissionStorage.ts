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

const STORAGE_KEY = '3dw_pending_seller_submissions'

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
    const found = all.find((item) => item.userId === userId)
    if (found) return found
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

