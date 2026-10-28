import { beforeEach, describe, expect, it } from 'vitest'
import { tokenStore } from './token'
import type { SessionUser } from './types'

const user: SessionUser = {
  id: '17',
  email: 'buyer@3dworld.test',
  name: 'Buyer 3DWorld',
  role: 'CUSTOMER',
  roles: ['CUSTOMER'],
  capabilities: ['ORDER_CREATE'],
}

describe('tokenStore session snapshot', () => {
  beforeEach(() => {
    sessionStorage.clear()
  })

  it('hydrates the cached user while the token is valid', () => {
    tokenStore.set('jwt-token', new Date(Date.now() + 60_000).toISOString())
    tokenStore.setUser(user)

    expect(tokenStore.get()).toBe('jwt-token')
    expect(tokenStore.getUser()).toEqual(user)
  })

  it('never exposes a cached user without a token', () => {
    sessionStorage.setItem('3dworld.sessionUser', JSON.stringify({ version: 1, user }))

    expect(tokenStore.getUser()).toBeNull()
  })

  it('clears both token and cached user on expiration', () => {
    tokenStore.set('jwt-token', new Date(Date.now() + 60_000).toISOString())
    tokenStore.setUser(user)
    tokenStore.expire()

    expect(tokenStore.get()).toBeNull()
    expect(tokenStore.getUser()).toBeNull()
    expect(tokenStore.wasExpired()).toBe(true)
  })
})
