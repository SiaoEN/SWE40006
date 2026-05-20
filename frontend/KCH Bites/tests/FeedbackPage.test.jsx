import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { vi } from 'vitest'

const navigateMock = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => navigateMock,
  }
})

vi.mock('../src/services/api', () => ({
  default: { get: vi.fn(), post: vi.fn() },
}))

vi.mock('../src/services/auth', () => ({
  clearAuthToken: vi.fn(),
  getUserRole: vi.fn(),
}))

vi.mock('../src/components/Header', () => ({ default: () => <div data-testid="header" /> }))
vi.mock('../src/components/Sidebar', () => ({ default: () => <div data-testid="sidebar" /> }))
vi.mock('../src/components/Footer', () => ({ default: () => <div data-testid="footer" /> }))

import FeedbackPage from '../src/pages/FeedbackPage'
import api from '../src/services/api'
import { getUserRole } from '../src/services/auth'

describe('FeedbackPage', () => {
  beforeEach(() => {
    navigateMock.mockReset()
    vi.mocked(api.get).mockReset()
    vi.mocked(api.post).mockReset()
    vi.mocked(getUserRole).mockReset()
    localStorage.clear()
    localStorage.setItem('userId', 'user-1')
    localStorage.setItem('username', 'Aina')
  })

  it('opens the detailed feedback dialog and submits successfully', async () => {
    getUserRole.mockReturnValue('user')
    api.get.mockResolvedValue({ data: { success: true, feedback: [] } })
    api.post.mockResolvedValue({ data: { success: true } })

    render(<FeedbackPage />)

    fireEvent.click(screen.getByRole('button', { name: 'Anything else you want to say?' }))
    expect(screen.getByText('Share Your Feedback')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Your Feedback*'), { target: { value: 'Great app' } })
    // Click the dialog submit button
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }))

    await waitFor(() => expect(api.post).toHaveBeenCalled(), { timeout: 2000 })
  })
})
