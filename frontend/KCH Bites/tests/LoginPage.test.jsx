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
  loginUser: vi.fn(),
  setAuthToken: vi.fn(),
  setUser: vi.fn(),
  isAdmin: vi.fn(),
}))

vi.mock('../src/components/Header', () => ({ default: () => <div data-testid="header" /> }))
vi.mock('../src/components/Footer', () => ({ default: () => <div data-testid="footer" /> }))

import LoginPage from '../src/pages/LoginPage'
import { loginUser, setAuthToken, setUser, isAdmin } from '../src/services/auth'

describe('LoginPage', () => {
  beforeEach(() => {
    navigateMock.mockReset()
    vi.mocked(loginUser).mockReset()
    vi.mocked(setAuthToken).mockReset()
    vi.mocked(setUser).mockReset()
    vi.mocked(isAdmin).mockReset()
  })

  it('shows validation error when fields are missing', async () => {
    render(<LoginPage />)

    fireEvent.click(screen.getByRole('button', { name: 'Login' }))

    expect(await screen.findByText('Please fill in all fields')).toBeInTheDocument()
  })

  it('logs in and redirects admins to admin main', async () => {
    loginUser.mockResolvedValue({ token: 'token-value', user: { username: 'admin' } })
    isAdmin.mockReturnValue(true)

    render(<LoginPage />)

    fireEvent.change(screen.getByPlaceholderText('Username'), { target: { name: 'username', value: 'admin' } })
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { name: 'password', value: 'secret' } })
    fireEvent.click(screen.getByRole('button', { name: 'Login' }))

    await waitFor(() => expect(loginUser).toHaveBeenCalled())
    expect(setAuthToken).toHaveBeenCalledWith('token-value')
    expect(setUser).toHaveBeenCalledWith({ username: 'admin' })
    expect(navigateMock).toHaveBeenCalledWith('/admin/main', { replace: true })
  })
})
