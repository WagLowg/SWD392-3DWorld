import { describe, expect, it } from 'vitest'
import { toQueryString } from './query'

describe('toQueryString', () => {
  it('keeps meaningful values and removes empty values', () => {
    expect(
      toQueryString({
        keyword: 'dragon',
        page: 0,
        active: false,
        category: '',
        optional: undefined,
      }),
    ).toBe('?keyword=dragon&page=0&active=false')
  })
})
