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

vi.mock('../src/services/auth', () => ({
  registerUser: vi.fn(),
}))

vi.mock('../src/components/Header', () => ({ default: () => <div data-testid="header" /> }))
vi.mock('../src/components/Footer', () => ({ default: () => <div data-testid="footer" /> }))

import RegisterPage from '../src/pages/RegisterPage'
import { registerUser } from '../src/services/auth'

describe('RegisterPage', () => {
  beforeEach(() => {
    navigateMock.mockReset()
    vi.mocked(registerUser).mockReset()
  })

  it('validates missing required fields', async () => {
    render(<RegisterPage />)

    fireEvent.click(screen.getByRole('button', { name: 'Create Account' }))

    expect(await screen.findByText('Please fill in all required fields')).toBeInTheDocument()
  })

  it('submits registration and redirects to login', async () => {
    registerUser.mockResolvedValue({ success: true })

    render(<RegisterPage />)

    fireEvent.change(screen.getByPlaceholderText('Username'), { target: { name: 'username', value: 'newuser' } })
    fireEvent.change(screen.getByPlaceholderText('Email Address'), { target: { name: 'email', value: 'new@example.com' } })
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { name: 'password', value: 'password123' } })
    fireEvent.change(screen.getByPlaceholderText('Confirm Password'), { target: { name: 'confirmPassword', value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create Account' }))

    await waitFor(() => expect(registerUser).toHaveBeenCalled())
    expect(await screen.findByText('Registration successful. Redirecting to login...')).toBeInTheDocument()

    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/login', { replace: true }), { timeout: 2000 })
  })
})
