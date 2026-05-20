import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'

const navigateMock = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useParams: () => ({ restaurantId: 'rest-1' }),
    useLocation: () => ({ state: null }),
    useNavigate: () => navigateMock,
  }
})

vi.mock('../src/services/api', () => ({
  default: { get: vi.fn(), post: vi.fn() },
}))

vi.mock('../src/services/favorites', () => ({
  getFavoriteRestaurantIds: vi.fn(),
  setFavoriteRestaurantIds: vi.fn(),
}))

// Mock react-leaflet to render children so map popups and markers appear in DOM
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }) => <div data-testid="map">{children}</div>,
  TileLayer: () => <div data-testid="tilelayer" />,
  Marker: ({ children }) => <div data-testid="marker">{children}</div>,
  Popup: ({ children }) => <div data-testid="popup">{children}</div>,
  useMap: () => ({ setView: () => {}, fitBounds: () => {}, getZoom: () => 13 }),
}))

vi.mock('../src/components/Header', () => ({ default: () => <div data-testid="header" /> }))
vi.mock('../src/components/Sidebar', () => ({ default: () => <div data-testid="sidebar" /> }))
vi.mock('../src/components/Footer', () => ({ default: () => <div data-testid="footer" /> }))

import api from '../src/services/api'
import { getFavoriteRestaurantIds, setFavoriteRestaurantIds } from '../src/services/favorites'

describe('RestaurantPage', () => {
  beforeEach(() => {
    navigateMock.mockReset()
    vi.mocked(api.get).mockReset()
    vi.mocked(api.post).mockReset()
    vi.mocked(getFavoriteRestaurantIds).mockReset()
    vi.mocked(setFavoriteRestaurantIds).mockReset()
    localStorage.clear()
  })

  it('renders restaurant details and toggles favorite and opens lightbox', async () => {
    const restaurant = {
      _id: 'rest-1',
      name: 'KCH Cafe',
      description: 'Nice place',
      tags: ['noodle'],
      images: ['http://example.com/photo1.jpg', 'http://example.com/photo2.jpg'],
      lat: 1.55,
      lng: 110.35,
    }

    api.get.mockImplementation((path) => {
      if (path === '/restaurants/rest-1') return Promise.resolve({ data: { success: true, restaurant } })
      if (path === '/reviews') return Promise.resolve({ data: { success: true, reviews: [] } })
      return Promise.resolve({ data: {} })
    })

    // simulate a logged-in user so favorites can be toggled
    localStorage.setItem('role', 'user')
    localStorage.setItem('userId', 'u1')
    getFavoriteRestaurantIds.mockReturnValue([])

    // import component after setting localStorage so module-level role detection picks it up
    const { default: RestaurantPage } = await import('../src/pages/RestaurantPage')
    render(<RestaurantPage />)

    const title = await screen.findByRole('heading', { name: /KCH Cafe/i })
    expect(title).toBeInTheDocument()

    // Favorite button should be present
    const favButton = screen.getByRole('button', { name: /Add to favorites/i })
    expect(favButton).toBeInTheDocument()

    fireEvent.click(favButton)

    // Gallery images present and open lightbox when clicked
    // click first gallery thumbnail (image inside button)
    const thumbImg = await screen.findByAltText(/KCH Cafe photo 1/i)
    const galleryItem = thumbImg.closest('button')
    expect(galleryItem).toBeTruthy()
    fireEvent.click(galleryItem)
    // lightbox should open; check close button exists
    const closeBtn = await screen.findByTitle(/Close \(Esc\)/i)
    expect(closeBtn).toBeInTheDocument()
  })
})
