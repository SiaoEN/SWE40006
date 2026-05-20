import React from 'react'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { vi } from 'vitest'

vi.mock('../src/services/auth', () => ({
  isLoggedIn: vi.fn(),
  getUserRole: vi.fn(),
}))

import ProtectedRoute from '../src/routes/ProtectedRoute'
import { isLoggedIn, getUserRole } from '../src/services/auth'

function renderRoute(element) {
  return render(
    <MemoryRouter initialEntries={['/']}> 
      <Routes>
        <Route path="/" element={element} />
        <Route path="/login" element={<div>Login Page</div>} />
        <Route path="/main" element={<div>Main Page</div>} />
        <Route path="/admin/main" element={<div>Admin Main Page</div>} />
      </Routes>
    </MemoryRouter>
  )
}

describe('ProtectedRoute', () => {
  it('redirects unauthenticated users to login', () => {
    isLoggedIn.mockReturnValue(false)
    getUserRole.mockReturnValue(null)

    renderRoute(
      <ProtectedRoute>
        <div>Secret</div>
      </ProtectedRoute>
    )

    expect(screen.getByText('Login Page')).toBeInTheDocument()
  })

  it('renders children for authenticated users', () => {
    isLoggedIn.mockReturnValue(true)
    getUserRole.mockReturnValue('user')

    renderRoute(
      <ProtectedRoute>
        <div>Secret</div>
      </ProtectedRoute>
    )

    expect(screen.getByText('Secret')).toBeInTheDocument()
  })
})
