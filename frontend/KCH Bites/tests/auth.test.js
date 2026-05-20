import { describe, it, expect, beforeEach } from 'vitest'
import {
  clearAuthToken,
  getAuthToken,
  getUserRole,
  isAdmin,
  isLoggedIn,
  isRegisteredUser,
  setAuthToken,
  setUser,
} from '../src/services/auth'

describe('auth service', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('stores token details and exposes role helpers', () => {
    const payload = { role: 'admin', userId: 'user-1', username: 'admin-user' }
    const token = `header.${btoa(JSON.stringify(payload))}.signature`

    setAuthToken(token)

    expect(getAuthToken()).toBe(token)
    expect(getUserRole()).toBe('admin')
    expect(isAdmin()).toBe(true)
    expect(isRegisteredUser()).toBe(false)
    expect(isLoggedIn()).toBe(true)
  })

  it('syncs user profile data and clears auth state', () => {
    setUser({ _id: 'user-2', username: 'Aina', role: 'user', email: 'aina@example.com' })

    expect(localStorage.getItem('userId')).toBe('user-2')
    expect(localStorage.getItem('username')).toBe('Aina')
    expect(localStorage.getItem('role')).toBe('user')

    clearAuthToken()

    expect(getAuthToken()).toBeNull()
    expect(isLoggedIn()).toBe(false)
    expect(localStorage.getItem('user')).toBeNull()
  })
})
