import { describe, it, expect } from 'vitest'
import { saveUserLocation } from '../src/services/api'

describe('api service', () => {
  it('skips saving location for invalid userId', async () => {
    const res = await saveUserLocation('', 1.23, 4.56)
    expect(res.skipped).toBe(true)
  })
})
