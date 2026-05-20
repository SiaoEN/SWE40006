import '@testing-library/jest-dom'

function createStorage() {
	const store = new Map()

	return {
		getItem(key) {
			return store.has(key) ? store.get(key) : null
		},
		setItem(key, value) {
			store.set(key, String(value))
		},
		removeItem(key) {
			store.delete(key)
		},
		clear() {
			store.clear()
		},
	}
}

if (!globalThis.localStorage || typeof globalThis.localStorage.getItem !== 'function') {
	Object.defineProperty(globalThis, 'localStorage', {
		value: createStorage(),
		configurable: true,
	})
}

if (!globalThis.sessionStorage || typeof globalThis.sessionStorage.getItem !== 'function') {
	Object.defineProperty(globalThis, 'sessionStorage', {
		value: createStorage(),
		configurable: true,
	})
}

