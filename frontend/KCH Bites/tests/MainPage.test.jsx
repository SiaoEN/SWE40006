import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'

// -------------------- Router mocks --------------------
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: vi.fn(),
  }
})

// -------------------- API mock --------------------
vi.mock('../src/services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
  // named export used by MainPage
  saveUserLocation: vi.fn(),
  UPLOADS_BASE_URL: 'http://localhost/uploads',
}))

// -------------------- Geolocation mock (mutable) --------------------
let geolocationGet = vi.fn(() => Promise.resolve({ latitude: 1.5533, longitude: 110.3592 }))
vi.mock('../src/services/geolocation', () => ({
  getUserLocation: (...args) => geolocationGet(...args),
}))

// -------------------- Leaflet mock --------------------
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }) => <div data-testid="map">{children}</div>,
  TileLayer: () => <div data-testid="tilelayer" />,
  Marker: ({ children }) => <div data-testid="marker">{children}</div>,
  Popup: ({ children }) => <div data-testid="popup">{children}</div>,
  useMap: () => ({
    setView: () => {},
    fitBounds: () => {},
    getZoom: () => 13,
  }),
}))

// -------------------- Component mocks --------------------
vi.mock('../src/components/Header', () => ({
  default: () => <div data-testid="header" />,
}))
vi.mock('../src/components/Sidebar', () => ({
  default: () => <div data-testid="sidebar" />,
}))
vi.mock('../src/components/Footer', () => ({
  default: () => <div data-testid="footer" />,
}))

// -------------------- Import after mocks --------------------
import MainPage from '../src/pages/MainPage'
import api, { saveUserLocation } from '../src/services/api'

describe('MainPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('fetches restaurants and shows popup hint', async () => {
    const restaurants = [
      {
        _id: 'r1',
        id: 'r1',
        name: 'Resto 1',
        lat: 1.55,
        lng: 110.35,
        tags: ['a'],
      },
    ]

    // Mock API responses
    api.get.mockImplementation((path) => {
      if (path === '/restaurants') {
        return Promise.resolve({ data: { restaurants } })
      }
      if (path === '/reviews') {
        return Promise.resolve({ data: { success: true, reviews: [] } })
      }
      return Promise.resolve({ data: {} })
    })

    // ✅ FIX: wrap with MemoryRouter
    render(
      <MemoryRouter>
        <MainPage />
      </MemoryRouter>
    )

    // Wait for API call
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/restaurants')
    })

    // Check popup UI
    expect(screen.getByText(/Your Location/i)).toBeInTheDocument()
  })

  it('performSearch finds restaurant by exact name and shows preview', async () => {
    const restaurants = [
      { id: 'r1', name: 'Resto 1', lat: 1.55, lng: 110.35, tags: ['Western'] },
    ]

    // Mock API responses
    api.get.mockImplementation((path) => {
      if (path === '/restaurants') return Promise.resolve({ data: { restaurants } })
      if (path === '/reviews') return Promise.resolve({ data: { success: true, reviews: [] } })
      return Promise.resolve({ data: {} })
    })

    render(
      <MemoryRouter>
        <MainPage />
      </MemoryRouter>
    )

    const input = await screen.findByPlaceholderText(/Search for food or restaurant name.../i)
    fireEvent.change(input, { target: { value: 'Resto 1' } })
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' })

    // Restaurant preview should appear inside popup content (preview name element)
    await waitFor(() => {
      const previewEl = document.querySelector('.restaurant-preview-name-text')
      expect(previewEl).toBeTruthy()
      expect(previewEl.textContent).toMatch(/Resto 1/i)
    })
  })

  it('toggles category chips and clears filters', async () => {
    api.get.mockImplementation((path) => {
      if (path === '/restaurants') return Promise.resolve({ data: { restaurants: [] } })
      if (path === '/reviews') return Promise.resolve({ data: { success: true, reviews: [] } })
      return Promise.resolve({ data: {} })
    })

    render(
      <MemoryRouter>
        <MainPage />
      </MemoryRouter>
    )

    // open filters
    const toggle = screen.getByRole('button', { name: /Toggle filters/i })
    fireEvent.click(toggle)

    // find the category chip inside the category-chips container
    await waitFor(() => {
      const chipsContainer = document.querySelector('.category-chips')
      expect(chipsContainer).toBeTruthy()
      const chipBtns = Array.from(chipsContainer.querySelectorAll('.filter-chip'))
      const western = chipBtns.find((el) => el.textContent.trim() === 'Western')
      expect(western).toBeTruthy()
      fireEvent.click(western)
      expect(western).toHaveAttribute('aria-pressed', 'true')

      // click Clear
      const clearBtn = screen.getByText('Clear')
      fireEvent.click(clearBtn)
      expect(western).toHaveAttribute('aria-pressed', 'false')
    })
  })

  it('persists user location by calling saveUserLocation when userId exists', async () => {
    localStorage.setItem('userId', 'user-42')

    // make geolocation resolve to new coords
    geolocationGet.mockImplementation(() => Promise.resolve({ latitude: 2.2, longitude: 3.3 }))

    api.get.mockImplementation((path) => {
      if (path === '/restaurants') return Promise.resolve({ data: { restaurants: [] } })
      if (path === '/reviews') return Promise.resolve({ data: { success: true, reviews: [] } })
      return Promise.resolve({ data: {} })
    })

    render(
      <MemoryRouter>
        <MainPage />
      </MemoryRouter>
    )

    await waitFor(() => expect(saveUserLocation).toHaveBeenCalledWith('user-42', 2.2, 3.3))
  })

  it('shows location error banner when geolocation rejects', async () => {
    geolocationGet.mockImplementation(() => Promise.reject(new Error('Location denied')))

    api.get.mockImplementation((path) => {
      if (path === '/restaurants') return Promise.resolve({ data: { restaurants: [] } })
      if (path === '/reviews') return Promise.resolve({ data: { success: true, reviews: [] } })
      return Promise.resolve({ data: {} })
    })

    render(
      <MemoryRouter>
        <MainPage />
      </MemoryRouter>
    )

    // open filters to reveal location error area
    const toggle = screen.getByRole('button', { name: /Toggle filters/i })
    fireEvent.click(toggle)

    const err = await screen.findByText(/Geolocation not available|Location denied/i)
    expect(err).toBeInTheDocument()
  })
})