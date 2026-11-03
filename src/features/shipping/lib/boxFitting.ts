/**
 * Logic tự động tính toán và chọn hộp đóng gói phù hợp (Fit Box Algorithm)
 * Mô phỏng thuật toán BoxPackingService và ShippingQuoteService từ Backend.
 */

export type ItemDimensions = {
  lengthCm: number
  widthCm: number
  heightCm: number
  weightGrams: number
  fragile?: boolean
  packingGroup?: string | null
}

export type PackagingBox = {
  id: number
  code: string
  name: string
  lengthCm: number
  widthCm: number
  heightCm: number
  maxProductWeightGrams: number
  supportsFragile: boolean
  allowedPackingGroups?: string | null
  boxCostVnd?: number
  paddingCostVnd?: number
}

/** Độ dày lớp đệm chống sốc (cm) theo cấu hình app.ghtk.padding-cm = 2cm, mỗi chiều + 2*padding = 4cm */
export const PACKING_PADDING_CM = 2

/** Danh sách kích thước hộp tiêu chuẩn của hệ thống 3DWorld */
export const DEFAULT_PACKAGING_BOXES: PackagingBox[] = [
  {
    id: 1,
    code: 'BOX_S',
    name: 'Hộp Nhỏ (Size S - 15×12×10cm)',
    lengthCm: 15,
    widthCm: 12,
    heightCm: 10,
    maxProductWeightGrams: 1000,
    supportsFragile: true,
    boxCostVnd: 2000,
    paddingCostVnd: 1000,
  },
  {
    id: 2,
    code: 'BOX_M',
    name: 'Hộp Vừa (Size M - 25×20×15cm)',
    lengthCm: 25,
    widthCm: 20,
    heightCm: 15,
    maxProductWeightGrams: 2500,
    supportsFragile: true,
    boxCostVnd: 4000,
    paddingCostVnd: 2000,
  },
  {
    id: 3,
    code: 'BOX_L',
    name: 'Hộp Lớn (Size L - 35×25×25cm)',
    lengthCm: 35,
    widthCm: 25,
    heightCm: 25,
    maxProductWeightGrams: 5000,
    supportsFragile: true,
    boxCostVnd: 7000,
    paddingCostVnd: 3000,
  },
  {
    id: 4,
    code: 'BOX_XL',
    name: 'Thùng Carton XL (Size XL - 50×40×35cm)',
    lengthCm: 50,
    widthCm: 40,
    heightCm: 35,
    maxProductWeightGrams: 10000,
    supportsFragile: true,
    boxCostVnd: 12000,
    paddingCostVnd: 5000,
  },
]

/**
 * Kiểm tra xem một mặt hàng có xếp vừa vào hộp cụ thể hay không.
 * Backend quy định:
 * 1. height + 4cm <= box.height
 * 2. floor rotation (length + 4, width + 4) <= (box.length, box.width) hoặc xoay 90 độ
 * 3. weight <= box.maxProductWeight
 * 4. if fragile -> box.supportsFragile
 */
export function canItemFitBox(
  item: ItemDimensions,
  box: {
    lengthCm: number
    widthCm: number
    heightCm: number
    maxProductWeightGrams: number
    supportsFragile: boolean
    allowedPackingGroups?: string | null
  },
  paddingCm = PACKING_PADDING_CM,
): boolean {
  const l = Number(item.lengthCm) || 0
  const w = Number(item.widthCm) || 0
  const h = Number(item.heightCm) || 0
  const weight = Number(item.weightGrams) || 0

  if (l <= 0 || w <= 0 || h <= 0 || weight <= 0) return false

  const extra = paddingCm * 2
  const requiredH = h + extra
  const requiredL = l + extra
  const requiredW = w + extra

  // Chiều cao phải vừa hộp
  if (requiredH > box.heightCm) return false

  // Trọng lượng không được vượt quá tải trọng hộp
  if (weight > box.maxProductWeightGrams) return false

  // Kiểm tra hàng dễ vỡ
  if (item.fragile && !box.supportsFragile) return false

  // Kiểm tra nhóm đóng gói (nếu có cấu hình)
  if (box.allowedPackingGroups) {
    try {
      const groups = JSON.parse(box.allowedPackingGroups)
      if (Array.isArray(groups) && groups.length > 0) {
        if (!item.packingGroup || !groups.includes(item.packingGroup)) return false
      }
    } catch {
      // Bỏ qua lỗi parse
    }
  }

  // Xoay mặt đáy (floor rotation 2D)
  const fitsNormal = requiredL <= box.lengthCm && requiredW <= box.widthCm
  const fitsRotated = requiredW <= box.lengthCm && requiredL <= box.widthCm

  return fitsNormal || fitsRotated
}

/**
 * Tìm hộp nhỏ nhất (tối ưu chi phí nhất) vừa khít với kích thước sản phẩm.
 */
export function findBestFittingBox<
  T extends {
    id: number
    code?: string
    name: string
    lengthCm: number
    widthCm: number
    heightCm: number
    maxProductWeightGrams: number
    supportsFragile: boolean
    allowedPackingGroups?: string | null
  },
>(item: ItemDimensions, boxes: T[], paddingCm = PACKING_PADDING_CM): T | null {
  const eligible = boxes.filter((b) => canItemFitBox(item, b, paddingCm))
  if (!eligible.length) return null

  // Sắp xếp ưu tiên hộp có thể tích nhỏ nhất
  eligible.sort((a, b) => {
    const volA = a.lengthCm * a.widthCm * a.heightCm
    const volB = b.lengthCm * b.widthCm * b.heightCm
    return volA - volB
  })

  return eligible[0]
}

/**
 * Tính nhanh hộp phù hợp cho Seller khi nhập kích thước biến thể
 */
export function getRecommendedBoxForDimensions(
  lengthCm: number | string | undefined,
  widthCm: number | string | undefined,
  heightCm: number | string | undefined,
  weightGrams: number | string | undefined,
  fragile = false,
  availableBoxes: PackagingBox[] = DEFAULT_PACKAGING_BOXES,
): { box: PackagingBox | null; status: 'VALID' | 'TOO_LARGE' | 'EMPTY' } {
  const l = Number(lengthCm) || 0
  const w = Number(widthCm) || 0
  const h = Number(heightCm) || 0
  const wt = Number(weightGrams) || 0

  if (!l || !w || !h || !wt) {
    return { box: null, status: 'EMPTY' }
  }

  const box = findBestFittingBox(
    { lengthCm: l, widthCm: w, heightCm: h, weightGrams: wt, fragile },
    availableBoxes,
  )

  return {
    box,
    status: box ? 'VALID' : 'TOO_LARGE',
  }
}

