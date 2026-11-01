import { expect, it } from 'vitest'
import { colorSwatch } from './format'

it('renders Vietnamese color names with the same colors as English names', () => {
  for (const [vi, en] of [['Đen', 'black'], ['Trắng', 'white'], ['Đỏ', 'red'], ['Xanh dương', 'blue'], ['Xanh lá', 'green'], ['Tím', 'purple'], ['Hồng', 'pink'], ['Xám', 'gray']]) {
    expect(colorSwatch(vi)?.hex).toBe(colorSwatch(en)?.hex)
    expect(colorSwatch(vi)).toBeDefined()
  }
  expect(colorSwatch('  TRẮNG  ')?.hex).toBe('#ffffff')
  expect(colorSwatch('den')?.hex).toBe('#1b1b22')
})

it('handles custom hex values and leaves unknown colors labeled', () => {
  expect(colorSwatch('#123abc')?.hex).toBe('#123abc')
  expect(colorSwatch('Theo yêu cầu')).toBeUndefined()
})
