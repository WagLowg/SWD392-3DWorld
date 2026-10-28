import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiClientError, http } from '../api'
import { fetchMe, getCachedSessionUser } from './session'
import { tokenStore } from './token'

const user = { id: '17', email: 'buyer@example.com', name: 'Buyer', role: 'CUSTOMER' }

describe('shared session after merging auth changes', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    sessionStorage.clear()
  })

  it('does not fetch a profile without a token', async () => {
    const get = vi.spyOn(http, 'get')
    expect(await fetchMe()).toBeNull()
    expect(get).not.toHaveBeenCalled()
  })

  it('keeps the cached profile during a temporary network failure', async () => {
    tokenStore.set('token')
    tokenStore.setUser(user)
    vi.spyOn(http, 'get').mockRejectedValue(new Error('Network unavailable'))
    expect(await fetchMe()).toEqual(user)
    expect(tokenStore.get()).toBe('token')
  })

  it.each([401, 403])('clears the cached profile when the server rejects the session with %s', async (status) => {
    tokenStore.set('token')
    tokenStore.setUser(user)
    vi.spyOn(http, 'get').mockRejectedValue(new ApiClientError(status, { code: 'UNAUTHORIZED', message: 'Unauthorized' }))
    expect(await fetchMe()).toBeNull()
    expect(getCachedSessionUser()).toBeNull()
    expect(tokenStore.wasExpired()).toBe(true)
  })

  it('updates the cached profile from the backend response', async () => {
    tokenStore.set('token')
    vi.spyOn(http, 'get').mockResolvedValue({
      data: { userId: 17, email: user.email, fullName: user.name, roles: ['CUSTOMER'], capabilities: [] },
    })
    const current = await fetchMe()
    expect(current).toMatchObject(user)
    expect(getCachedSessionUser()).toEqual(current)
  })
})
