import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { vi, beforeEach, afterEach, describe, it, expect } from 'vitest'
import { act } from 'react'

// Mock confetti so we can observe calls
vi.mock('canvas-confetti', () => ({
  __esModule: true,
  default: vi.fn(),
}))

import confetti from 'canvas-confetti'
import FoodWheel from '../src/pages/FoodWheel'

describe('FoodWheel', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.spyOn(Math, 'random').mockReturnValue(0) // deterministic pick -> first item
    confetti.mockClear()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('opens wheel and shows spin button', () => {
    render(<FoodWheel />)

    // Floating button shown
    const openBtn = screen.getByRole('button', { name: /Open food wheel/i })
    expect(openBtn).toBeInTheDocument()

    fireEvent.click(openBtn)

    // Wheel dialog appears
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText(/Spin the Wheel/i)).toBeInTheDocument()
  })

  it('spins and shows result, triggers confetti, and closing works', async () => {
    // Use real timers for this test so we can spy on setTimeout/setInterval
    vi.useRealTimers()
    try {
      render(<FoodWheel />)

      // Open
      fireEvent.click(screen.getByRole('button', { name: /Open food wheel/i }))

      const spinBtn = screen.getByRole('button', { name: /Spin the Wheel/i })
      expect(spinBtn).toBeEnabled()

      // Spy on timers
      const setTimeoutSpy = vi.spyOn(window, 'setTimeout')
      const setIntervalSpy = vi.spyOn(window, 'setInterval')

      // Click spin - Math.random mocked to 0 so randomIndex = 0
      fireEvent.click(spinBtn)

      // After clicking, button should be disabled (spinning)
      expect(spinBtn).toBeDisabled()
      expect(spinBtn).toHaveTextContent(/Spinning.../i)

      // Grab the last setTimeout callback and invoke it to simulate timeout expiry
      expect(setTimeoutSpy).toHaveBeenCalled()
      const timeoutCall = setTimeoutSpy.mock.calls[setTimeoutSpy.mock.calls.length - 1]
      const timeoutCb = timeoutCall[0]
      // invoke callback (this will set selected) inside act
      act(() => {
        timeoutCb()
      })

      // Result modal should appear with the first food label (🍜 Noodles)
      const resultHeading = await screen.findByText(/You Got!/i)
      expect(resultHeading).toBeInTheDocument()
      const resultFood = document.querySelector('.result-food')
      expect(resultFood).toBeTruthy()
      expect(resultFood.textContent).toMatch(/Noodles/i)

      // Simulate a single interval tick to trigger confetti
      expect(setIntervalSpy).toHaveBeenCalled()
      const intervalCb = setIntervalSpy.mock.calls[0][0]
      act(() => {
        intervalCb()
      })
      expect(confetti).toHaveBeenCalled()

      // Close result by clicking overlay
      const overlay = document.querySelector('.result-modal-overlay')
      fireEvent.click(overlay)

      expect(screen.queryByText(/You Got!/i)).not.toBeInTheDocument()
    } finally {
      // restore fake timers and spies
      vi.useFakeTimers()
      try { vi.restoreAllMocks() } catch (e) {}
    }
  })

  it('prevents double spins while spinning', async () => {
    render(<FoodWheel />)
    fireEvent.click(screen.getByRole('button', { name: /Open food wheel/i }))
    const spinBtn = screen.getByRole('button', { name: /Spin the Wheel/i })

    // Click twice rapidly
    fireEvent.click(spinBtn)
    fireEvent.click(spinBtn)

    // Should still only complete one spin; advance timers
    act(() => {
      vi.advanceTimersByTime(3200)
    })

    // Result visible
    expect(screen.getByText(/You Got!/i)).toBeInTheDocument()
  })
})
