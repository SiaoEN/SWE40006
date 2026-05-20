import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
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
}))

// -------------------- Geolocation mock --------------------
vi.mock('../src/services/geolocation', () => ({
  getUserLocation: () =>
    Promise.resolve({ latitude: 1.5533, longitude: 110.3592 }),
  saveUserLocation: () => Promise.resolve({ success: true }),
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
import api from '../src/services/api'

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
})