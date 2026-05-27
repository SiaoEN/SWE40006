import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'

// Mock navigate so we can assert redirects
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

vi.mock('../src/services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
  UPLOADS_BASE_URL: 'http://localhost/uploads',
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

// controllable auth mock
let role = null
vi.mock('../src/services/auth', () => ({
  getUserRole: () => role,
  clearAuthToken: vi.fn(),
}))

describe('CommunityPage', () => {
  afterEach(() => {
    vi.resetAllMocks()
  })

  beforeEach(() => {
    // clear localStorage state between tests
    localStorage.clear()
    mockNavigate.mockClear()
    role = null
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

  it('shows no reviews message when API returns none', async () => {
    api.get.mockImplementation((path) => {
      if (path === '/reviews') return Promise.resolve({ data: { success: true, reviews: [] } })
      if (path === '/restaurants') return Promise.resolve({ data: { success: true, restaurants: [] } })
      return Promise.resolve({ data: {} })
    })

    render(
      <MemoryRouter>
        <CommunityPage />
      </MemoryRouter>
    )

    const noReviewsText = await screen.findByText(/No reviews yet. Be the first to share your experience!/i)
    expect(noReviewsText).toBeInTheDocument()
  })

  it('redirects to login when clicking write review while not registered', async () => {
    api.get.mockImplementation((path) => {
      if (path === '/reviews') return Promise.resolve({ data: { success: true, reviews: [] } })
      if (path === '/restaurants') return Promise.resolve({ data: { success: true, restaurants: [] } })
      return Promise.resolve({ data: {} })
    })

    render(
      <MemoryRouter>
        <CommunityPage />
      </MemoryRouter>
    )

    const writeBtn = await screen.findByText(/Write a Review/i)
    fireEvent.click(writeBtn)

    expect(mockNavigate).toHaveBeenCalledWith('/login')
  })

  it('opens review dialog for registered user and allows restaurant selection and file upload', async () => {
    // Simulate registered user
    role = 'user'
    localStorage.setItem('userId', 'user-1')
    localStorage.setItem('username', 'Tester')

    api.get.mockImplementation((path) => {
      if (path === '/reviews') return Promise.resolve({ data: { success: true, reviews: [] } })
      if (path === '/restaurants') return Promise.resolve({ data: { success: true, restaurants: [ { id: 'r1', name: 'Resto 1' } ] } })
      return Promise.resolve({ data: {} })
    })

    render(
      <MemoryRouter>
        <CommunityPage />
      </MemoryRouter>
    )

    const writeBtn = await screen.findByText(/Write a Review/i)
    fireEvent.click(writeBtn)

    // Dialog should appear (check dialog container)
    expect(document.querySelector('.review-dialog')).toBeInTheDocument()

    // Type into restaurant search (wait for input to exist)
    const input = await screen.findByPlaceholderText(/Search restaurants.../i)
    fireEvent.change(input, { target: { value: 'Resto' } })

    // Dropdown option should appear
    const option = await screen.findByText(/Resto 1/i)
    fireEvent.click(option)

    // The search input should now contain the restaurant name
    expect(input.value).toBe('Resto 1')

    // File upload preview
    const file = new File(['dummy'], 'test.png', { type: 'image/png' })
    const fileInput = document.getElementById('photos')
    fireEvent.change(fileInput, { target: { files: [file] } })

    expect(await screen.findByText('test.png')).toBeInTheDocument()
    role = null
  })

  it('opens lightbox when clicking a review photo', async () => {
    api.get.mockImplementation((path) => {
      if (path === '/reviews') return Promise.resolve({ data: { success: true, reviews: [ { _id: 'r1', id: 'r1', username: 'A', userId: 'user-2', restaurantId: 'rid', restaurantName: 'R', rating: 4, comment: 'ok', createdAt: new Date().toISOString(), likes: [], dislikes: [], reports: [], attachments: [ { filename: 'test.png', originalName: 'test.png' } ] } ] } })
      if (path === '/restaurants') return Promise.resolve({ data: { success: true, restaurants: [] } })
      return Promise.resolve({ data: {} })
    })

    render(
      <MemoryRouter>
        <CommunityPage />
      </MemoryRouter>
    )

    const thumb = await screen.findByAltText('test.png')
    fireEvent.click(thumb)

    // Lightbox overlay should exist
    expect(document.querySelector('.lightbox-overlay')).toBeInTheDocument()
  })

  it('prompts login when liking a review while not registered', async () => {
    api.get.mockImplementation((path) => {
      if (path === '/reviews') return Promise.resolve({ data: { success: true, reviews: [ { _id: 'r2', id: 'r2', username: 'B', userId: 'user-3', restaurantId: 'rid', restaurantName: 'R', rating: 3, comment: 'meh', createdAt: new Date().toISOString(), likes: [], dislikes: [], reports: [], attachments: [] } ] } })
      if (path === '/restaurants') return Promise.resolve({ data: { success: true, restaurants: [] } })
      return Promise.resolve({ data: {} })
    })

    render(
      <MemoryRouter>
        <CommunityPage />
      </MemoryRouter>
    )

    const likeBtns = await screen.findAllByText(/Helpful/i)
    fireEvent.click(likeBtns[0])

    expect(mockNavigate).toHaveBeenCalledWith('/login')
  })

  it('filters reviews by My Reviews', async () => {
    role = 'user'
    localStorage.setItem('userId', 'user-1')

    const reviews = [
      { _id: 'own1', id: 'own1', username: 'Me', userId: 'user-1', restaurantName: 'Mine', rating: 5, comment: 'Mine!', createdAt: new Date().toISOString(), likes: [], dislikes: [], reports: [], attachments: [] },
      { _id: 'oth1', id: 'oth1', username: 'Other', userId: 'user-2', restaurantName: 'Other R', rating: 4, comment: 'Good', createdAt: new Date().toISOString(), likes: [], dislikes: [], reports: [], attachments: [] },
    ]

    api.get.mockImplementation((path) => {
      if (path === '/reviews') return Promise.resolve({ data: { success: true, reviews } })
      if (path === '/restaurants') return Promise.resolve({ data: { success: true, restaurants: [] } })
      return Promise.resolve({ data: {} })
    })

    const { container } = render(
      <MemoryRouter>
        <CommunityPage />
      </MemoryRouter>
    )

    const myReviewsBtn = await screen.findByText(/My Reviews/i)
    fireEvent.click(myReviewsBtn)

    expect(container.querySelectorAll('.review-card').length).toBe(1)
    expect(screen.getByText(/Mine!/i)).toBeInTheDocument()
  })

  it('likes another user review as registered user', async () => {
    role = 'user'
    localStorage.setItem('userId', 'user-1')

    const reviews = [
      { _id: 'oth1', id: 'oth1', username: 'Other', userId: 'user-2', restaurantName: 'Other R', rating: 4, comment: 'Good', createdAt: new Date().toISOString(), likes: [], dislikes: [], reports: [], attachments: [] },
    ]

    api.get.mockImplementation((path) => {
      if (path === '/reviews') return Promise.resolve({ data: { success: true, reviews } })
      if (path === '/restaurants') return Promise.resolve({ data: { success: true, restaurants: [] } })
      return Promise.resolve({ data: {} })
    })

    api.post.mockResolvedValue({ data: { success: true } })

    const { container } = render(
      <MemoryRouter>
        <CommunityPage />
      </MemoryRouter>
    )

    await screen.findByText(/Other R/i, {
      selector: '.restaurant-link',
    })

    const otherCard = container.querySelector('#review-oth1')
    const likeBtn = otherCard.querySelector('.btn-like')

    fireEvent.click(likeBtn)

    expect(api.post).toHaveBeenCalledWith('/reviews/oth1/like', expect.any(Object))
  })

  it('opens lightbox and navigates photos', async () => {
    role = 'user'

    const reviews = [
      {
        _id: 'oth1',
        id: 'oth1',
        username: 'Other',
        userId: 'user-2',
        restaurantName: 'Other R',
        rating: 4,
        comment: 'Good',
        createdAt: new Date().toISOString(),
        likes: [],
        dislikes: [],
        reports: [],
        attachments: [
          { filename: 'a.png', originalName: 'a.png' },
          { filename: 'b.png', originalName: 'b.png' },
        ],
      },
    ]

    api.get.mockImplementation((path) => {
      if (path === '/reviews') return Promise.resolve({ data: { success: true, reviews } })
      if (path === '/restaurants') return Promise.resolve({ data: { success: true, restaurants: [] } })
      return Promise.resolve({ data: {} })
    })

    render(
      <MemoryRouter>
        <CommunityPage />
      </MemoryRouter>
    )

    const thumb = await screen.findByAltText('a.png')
    fireEvent.click(thumb)

    expect(document.querySelector('.lightbox-overlay')).toBeInTheDocument()

    fireEvent.click(document.querySelector('.lightbox-nav-next'))
    fireEvent.click(document.querySelector('.lightbox-nav-prev'))
  })

  it('deletes own review after confirmation', async () => {
    role = 'user'
    localStorage.setItem('userId', 'user-1')

    const reviews = [
      { _id: 'own1', id: 'own1', username: 'Me', userId: 'user-1', restaurantName: 'Mine', rating: 5, comment: 'Mine!', createdAt: new Date().toISOString(), likes: [], dislikes: [], reports: [], attachments: [] },
    ]

    api.get.mockImplementation((path) => {
      if (path === '/reviews') return Promise.resolve({ data: { success: true, reviews } })
      if (path === '/restaurants') return Promise.resolve({ data: { success: true, restaurants: [] } })
      return Promise.resolve({ data: {} })
    })

    api.delete.mockResolvedValue({ data: { success: true } })

    const originalConfirm = window.confirm
    window.confirm = () => true

    const { container } = render(
      <MemoryRouter>
        <CommunityPage />
      </MemoryRouter>
    )

    await screen.findByText(/Mine!/i)

    const ownCard = container.querySelector('#review-own1')
    const deleteBtn = ownCard.querySelector('.btn-delete')

    fireEvent.click(deleteBtn)

    expect(api.delete).toHaveBeenCalledWith('/reviews/own1', {
      data: { userId: 'user-1' },
    })

    await screen.findByText(/Your review has been deleted./i)

    window.confirm = originalConfirm
  })

  it('submits a new review', async () => {
    role = 'user'
    localStorage.setItem('userId', 'user-1')
    localStorage.setItem('username', 'Tester')

    api.get.mockImplementation((path) => {
      if (path === '/reviews') return Promise.resolve({ data: { success: true, reviews: [] } })
      if (path === '/restaurants') {
        return Promise.resolve({
          data: {
            success: true,
            restaurants: [{ id: 'rX', name: 'Mine' }],
          },
        })
      }
      return Promise.resolve({ data: {} })
    })

    api.post.mockResolvedValue({ data: { success: true } })

    render(
      <MemoryRouter>
        <CommunityPage />
      </MemoryRouter>
    )

    fireEvent.click(await screen.findByText(/Write a Review/i))

    const input = await screen.findByPlaceholderText(/Search restaurants.../i)
    fireEvent.change(input, { target: { value: 'Mine' } })

    const option = await screen.findByText(/Mine/i)
    fireEvent.click(option)

    const stars = screen.getAllByText('★')
    fireEvent.click(stars[3])

    const commentBox = screen.getByPlaceholderText(/Share your experience at this restaurant.../i)
    fireEvent.change(commentBox, { target: { value: 'Awesome' } })

    const file = new File(['x'], 'pic.png', { type: 'image/png' })
    fireEvent.change(document.getElementById('photos'), {
      target: { files: [file] },
    })

    fireEvent.click(screen.getByText(/Post Review/i))

    await waitFor(() => {
      expect(api.post).toHaveBeenCalled()
    })
  })

  it('navigates to restaurant page when restaurant link is clicked', async () => {
    role = 'user'

    const reviews = [
      { _id: 'oth1', id: 'oth1', username: 'Other', userId: 'user-2', restaurantId: 'rY', restaurantName: 'Other R', rating: 4, comment: 'Good', createdAt: new Date().toISOString(), likes: [], dislikes: [], reports: [], attachments: [] },
    ]

    api.get.mockImplementation((path) => {
      if (path === '/reviews') return Promise.resolve({ data: { success: true, reviews } })
      if (path === '/restaurants') {
        return Promise.resolve({
          data: {
            success: true,
            restaurants: [{ id: 'rY', name: 'Other R' }],
          },
        })
      }
      return Promise.resolve({ data: {} })
    })

    const { container } = render(
      <MemoryRouter>
        <CommunityPage />
      </MemoryRouter>
    )

    await screen.findByText(/Other R/i, {
      selector: '.restaurant-link',
    })

    const restLink = container.querySelector('#review-oth1 .restaurant-link')
    fireEvent.click(restLink)

    expect(mockNavigate).toHaveBeenCalled()
  })
})
