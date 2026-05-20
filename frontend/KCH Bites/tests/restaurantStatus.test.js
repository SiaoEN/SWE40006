import { describe, it, expect } from 'vitest'
import { getRestaurantOperatingStatus } from '../src/utils/restaurantStatus'

describe('getRestaurantOperatingStatus', () => {
	it('returns open-soon when the restaurant opens within the next hour', () => {
		const restaurant = {
			operatingHours: {
				monday: '10:00 AM - 8:00 PM',
			},
		}

		const referenceDate = new Date('2026-05-18T09:30:00')
		const status = getRestaurantOperatingStatus(restaurant, referenceDate)

		expect(status.status).toBe('open-soon')
		expect(status.label).toBe('Open soon')
		expect(status.minutesUntilOpen).toBe(30)
	})

	it('still returns closing-soon for restaurants about to close', () => {
		const restaurant = {
			operatingHours: {
				monday: '10:00 AM - 8:00 PM',
			},
		}

		const referenceDate = new Date('2026-05-18T19:30:00')
		const status = getRestaurantOperatingStatus(restaurant, referenceDate)

		expect(status.status).toBe('closing-soon')
		expect(status.label).toBe('Closing soon')
		expect(status.minutesUntilClose).toBe(30)
	})
})