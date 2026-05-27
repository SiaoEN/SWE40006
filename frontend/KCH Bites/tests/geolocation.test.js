import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getUserLocation,
  stopWatchingLocation,
  watchUserLocation,
} from '../src/services/geolocation'

const originalGeolocation = navigator.geolocation

function setGeolocation(mockGeolocation) {
  Object.defineProperty(navigator, 'geolocation', {
    value: mockGeolocation,
    configurable: true,
  })
}

describe('geolocation service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    if (originalGeolocation === undefined) {
      delete navigator.geolocation
      return
    }

    setGeolocation(originalGeolocation)
  })

  it('returns the current coordinates when geolocation succeeds', async () => {
    const getCurrentPosition = vi.fn((success) => {
      success({ coords: { latitude: 1.5533, longitude: 110.3592 } })
    })

    setGeolocation({ getCurrentPosition })

    await expect(getUserLocation()).resolves.toEqual({
      latitude: 1.5533,
      longitude: 110.3592,
    })

    expect(getCurrentPosition).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(Function),
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
      }
    )
  })

  it('rejects with a helpful message when permission is denied', async () => {
    const getCurrentPosition = vi.fn((success, errorCallback) => {
      errorCallback({
        code: 1,
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      })
    })

    setGeolocation({ getCurrentPosition })

    await expect(getUserLocation()).rejects.toThrow(
      'Location permission denied. Please enable location access in your browser settings.'
    )
  })

  it.each([
    [2, 'Location information is unavailable.'],
    [3, 'The request to get user location timed out.'],
    [99, 'An error occurred while retrieving your location.'],
  ])('rejects with the correct message for getUserLocation error code %s', async (code, message) => {
    const getCurrentPosition = vi.fn((success, errorCallback) => {
      errorCallback({
        code,
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      })
    })

    setGeolocation({ getCurrentPosition })

    await expect(getUserLocation()).rejects.toThrow(message)
  })

  it('rejects when the browser does not support geolocation', async () => {
    delete navigator.geolocation

    await expect(getUserLocation()).rejects.toThrow(
      'Geolocation is not supported by your browser'
    )
  })

  it('calls the error callback when watchUserLocation is unsupported', () => {
    const onSuccess = vi.fn()
    const onError = vi.fn()

    delete navigator.geolocation

    const watchId = watchUserLocation(onSuccess, onError)

    expect(watchId).toBeNull()
    expect(onSuccess).not.toHaveBeenCalled()
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Geolocation is not supported by your browser' })
    )
  })

  it('watches position updates and clears the watch id', () => {
    const watchPosition = vi.fn((success) => {
      success({ coords: { latitude: 2.5, longitude: 101.1 } })
      return 42
    })
    const clearWatch = vi.fn()
    const onSuccess = vi.fn()
    const onError = vi.fn()

    setGeolocation({ watchPosition, clearWatch })

    const watchId = watchUserLocation(onSuccess, onError)

    expect(watchId).toBe(42)
    expect(onSuccess).toHaveBeenCalledWith({ latitude: 2.5, longitude: 101.1 })
    expect(onError).not.toHaveBeenCalled()

    stopWatchingLocation(watchId)

    expect(clearWatch).toHaveBeenCalledWith(42)
  })

  it.each([
    [1, 'Location permission denied.'],
    [2, 'Location information is unavailable.'],
    [3, 'The request to get user location timed out.'],
    [99, 'An error occurred while watching your location.'],
  ])('routes watchUserLocation errors for code %s', (code, message) => {
    const watchPosition = vi.fn((success, errorCallback) => {
      errorCallback({
        code,
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      })
      return 7
    })
    const clearWatch = vi.fn()
    const onSuccess = vi.fn()
    const onError = vi.fn()

    setGeolocation({ watchPosition, clearWatch })

    const watchId = watchUserLocation(onSuccess, onError)

    expect(watchId).toBe(7)
    expect(onSuccess).not.toHaveBeenCalled()
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message }))
  })

  it('does not clear the watch when stopWatchingLocation receives a nullish id', () => {
    const clearWatch = vi.fn()

    setGeolocation({ clearWatch })

    stopWatchingLocation(null)
    stopWatchingLocation(undefined)

    expect(clearWatch).not.toHaveBeenCalled()
  })
})
