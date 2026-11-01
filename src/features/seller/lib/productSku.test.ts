import { expect, it } from 'vitest'
import { productSku } from './productSku'

it('generates readable ASCII SKUs from Vietnamese names and selected options', () => {
  expect(productSku('Huggy', 'FDM PLA', 'Đỏ', 'S', '123456')).toBe('HUGGY-FDM-RED-S-123456')
  expect(productSku('Huggy', 'Resin SLA', 'Đỏ', 'S', '123456')).toBe('HUGGY-RESIN-RED-S-123456')
})

it('stays within the SKU format for empty and very long inputs', () => {
  for (const text of ['', 'Sản phẩm có tên rất dài '.repeat(10), '🎨']) {
    const sku = productSku(text, text, text, text, 'abcd1234-xyz')
    expect(sku).toMatch(/^[A-Z0-9-]{3,32}$/)
  }
})

it('is stable per variant and distinguishes duplicate options', () => {
  const sku = productSku('Huggy', 'FDM PLA', 'Đen', 'L', 'abcd1234')
  expect(productSku('Huggy', 'FDM PLA', 'Đen', 'L', 'abcd1234')).toBe(sku)
  expect(productSku('Huggy', 'FDM PLA', 'Đen', 'L', 'efgh5678')).not.toBe(sku)
  expect(productSku('Huggy', 'FDM PLA', 'Trắng', 'L', 'abcd1234')).not.toBe(sku)
  expect(productSku('Huggy', 'FDM PLA', 'Đen', 'S', 'abcd1234')).toBe('HUGGY-FDM-BLACK-S-ABCD1234')
  expect(productSku('Huggy', 'FDM PLA', 'Đen', 'L', 'abcd1234', '02')).not.toBe(sku)
})
