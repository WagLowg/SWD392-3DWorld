const token = (value: string, limit: number, fallback: string) => value
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'D')
  .toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, limit) || fallback

const COLORS: Record<string, string> = {
  NGUYENBANCHUASON: 'RAW', TRANG: 'WHITE', DEN: 'BLACK', XAM: 'GRAY', DO: 'RED',
  CAM: 'ORANGE', VANG: 'YELLOW', XANHLA: 'GREEN', XANHDUONG: 'BLUE', TIM: 'PURPLE',
  HONG: 'PINK', TRONGSUOT: 'CLEAR', DAMAU: 'MULTI', THEOYEUCAU: 'CUSTOM',
}

/** Product code stays fixed while the selected options change. */
export function productSku(title: string, material: string, color: string, size: string, code: string, duplicate = '') {
  const materialName = token(material, 30, 'MAT')
  const technology = materialName.startsWith('FDM') ? 'FDM' : materialName.startsWith('RESIN') ? 'RESIN' : materialName.slice(0, 5)
  const colorName = token(color, 50, 'COLOR')
  const colorCode = COLORS[colorName] ?? colorName.slice(0, 6)
  const sizeCode = token(size, 3, 'SZ')
  const suffix = `${token(code, 8, '000000')}${duplicate ? `-${duplicate}` : ''}`
  const tail = `${technology}-${colorCode}-${sizeCode}-${suffix}`
  return `${token(title, Math.max(1, 31 - tail.length), 'SP')}-${tail}`
}
