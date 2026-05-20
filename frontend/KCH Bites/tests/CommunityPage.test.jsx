import React from 'react'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'

vi.mock('../src/services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}))

vi.mock('../src/components/Header', () => ({
  default: () => <div data-testid="mock-header" />,
}))

vi.mock('../src/components/Sidebar', () => ({
  default: () => <div data-testid="mock-sidebar" />,
}))

vi.mock('../src/components/Footer', () => ({
  default: () => <div data-testid="mock-footer" />,
}))

import CommunityPage from '../src/pages/CommunityPage'
import api from '../src/services/api'

describe('CommunityPage', () => {
  afterEach(() => {
    vi.resetAllMocks()
  })

  it('renders reviews count when API returns reviews', async () => {
    api.get.mockImplementation((path) => {
      if (path === '/reviews') {
        return Promise.resolve({ data: { success: true, reviews: [
          { _id: 'abc123def456abc123def456', username: 'Alice', rating: 5, comment: 'Great!', createdAt: new Date().toISOString(), likes: [], dislikes: [], reports: [], attachments: [] }
        ] } })
      }
      if (path === '/restaurants') {
        return Promise.resolve({ data: { success: true, restaurants: [] } })
      }
      return Promise.resolve({ data: {} })
    })

    render(
      <MemoryRouter>
        <CommunityPage />
      </MemoryRouter>
    )

    const heading = await screen.findByText(/Community Reviews \(1\)/i)
    expect(heading).toBeInTheDocument()
  })
})
