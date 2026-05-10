import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaUserCircle, FaBell, FaFilter, FaMapMarkerAlt, FaEnvelope, FaFacebook, FaInstagram, FaTwitter, FaSync, FaSpinner, FaWalking } from "react-icons/fa";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css"
import "../styles//MainPage.css";
import "../styles/LocationBanner.css";
import FoodWheel from './FoodWheel';
import { getUserLocation } from '../services/geolocation';
import { saveUserLocation } from '../services/api';
import api from '../services/api';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import Footer from '../components/Footer';

export default function MainPage() {
	const navigate = useNavigate();
	const [isSidebarOpen, setIsSidebarOpen] = useState(false);
	const [isDropdownOpen, setIsDropdownOpen] = useState(false);
	const [selectedCategories, setSelectedCategories] = useState([]);
	const [distance, setDistance] = useState(10);
	const [operationHours, setOperationHours] = useState("open-now");
	const [specificTime, setSpecificTime] = useState("12:00");
	const [rating, setRating] = useState("4");

	// Location-related states
	const [userLocation, setUserLocation] = useState(null);
	const [locationLoading, setLocationLoading] = useState(false);
	const [locationError, setLocationError] = useState(null);
	const [mapCenter, setMapCenter] = useState([1.5533, 110.3592]);
	const [restaurants, setRestaurants] = useState([]);
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedRestaurant, setSelectedRestaurant] = useState(null);

	const getStoredUserId = () => {
		const isValid = (value) => {
			const text = String(value || "").trim();
			return Boolean(text) && !["anonymous", "user_temp", "null", "undefined"].includes(text.toLowerCase());
		};

		const fromSimpleKey = localStorage.getItem("userId");
		if (isValid(fromSimpleKey)) {
			return String(fromSimpleKey).trim();
		}

		try {
			const storedUser = JSON.parse(localStorage.getItem("user") || "null");
			const candidateId = storedUser?.id || storedUser?._id || storedUser?.userId;
			if (isValid(candidateId)) {
				return String(candidateId).trim();
			}
		} catch {
			// ignore invalid JSON and fall through
		}

		try {
			const token = localStorage.getItem("token");
			if (token) {
				const payload = JSON.parse(atob(token.split('.')[1]));
				if (isValid(payload?.userId)) {
					return String(payload.userId).trim();
				}
			}
		} catch {
			// ignore invalid token payload and fall through
		}

		return null;
	};

	// Get user location on component mount
	useEffect(() => {
		const initializeLocation = async () => {
			setLocationLoading(true);
			setLocationError(null);
			try {
				const location = await getUserLocation();
				setUserLocation(location);
				setMapCenter([location.latitude, location.longitude]);

				// Try to save location to backend
				try {
					const userId = getStoredUserId();
					if (userId) {
						await saveUserLocation(userId, location.latitude, location.longitude);
					}
				} catch (apiError) {
					console.warn('Could not save location to backend:', apiError.message);
				}
			} catch (error) {
				setLocationError(error.message);
				console.warn('Geolocation not available, using default location');
			} finally {
				setLocationLoading(false);
			}
		};

		initializeLocation();

		// Fetch restaurants list for searching
		const fetchRestaurants = async () => {
			try {
				const resp = await api.get('/restaurants');
				if (resp && resp.data && Array.isArray(resp.data.restaurants)) {
					setRestaurants(resp.data.restaurants);
				}
			} catch (err) {
				console.warn('Failed to fetch restaurants for search:', err.message || err);
			}
		};

		fetchRestaurants();
	}, []);

	const toggleCategory = (category) => {
		setSelectedCategories((currentCategories) =>
			currentCategories.includes(category)
				? currentCategories.filter((item) => item !== category)
				: [...currentCategories, category]
		);
	};

	const clearFilters = () => {
		setSelectedCategories([]);
		setDistance(10);
		setOperationHours("open-now");
		setSpecificTime("12:00");
		setRating("4");
	};

	const handleUseMyLocation = async () => {
		setLocationLoading(true);
		setLocationError(null);
		try {
			const location = await getUserLocation();
			setUserLocation(location);
			setMapCenter([location.latitude, location.longitude]);

			// Save location to backend
			try {
				const userId = getStoredUserId();
				if (userId) {
					await saveUserLocation(userId, location.latitude, location.longitude);
				}
			} catch (apiError) {
				console.warn('Could not save location to backend:', apiError.message);
			}
		} catch (error) {
			setLocationError(error.message);
		} finally {
			setLocationLoading(false);
		}
	};

	const handleLogout = () => {
		localStorage.removeItem("token");
		localStorage.removeItem("user");
		window.location.href = "/login";
	}

	const openRestaurantPage = (restaurant) => {
		if (!restaurant) return;

		const restaurantId = restaurant.id || restaurant._id;
		if (!restaurantId) return;

		navigate(`/restaurant/${restaurantId}`, {
			state: { restaurant },
		});
	};

	const performSearch = (query) => {
		if (!query || !restaurants.length) return;

		const normalize = (s) => {
			return String(s || "")
				.toLowerCase()
				.replace(/[^a-z0-9]/g, "");
		};

		const q = normalize(query);
		if (!q) return;

		// Find exact normalized name first, then a broader includes match
		let found = restaurants.find((r) => normalize(r.name || '') === q);
		if (!found) {
			found = restaurants.find((r) => {
				const nameNorm = normalize(r.name || '');
				if (nameNorm && nameNorm.includes(q)) return true;
				const addrNorm = normalize(r.address || '');
				if (addrNorm && addrNorm.includes(q)) return true;
				if (Array.isArray(r.tags)) {
					for (const t of r.tags) {
						if (normalize(t).includes(q)) return true;
					}
				}
				return false;
			});
		}

		if (!found) {
			setSelectedRestaurant(null);
			return;
		}

		// helper to extract lat/lng from possible shapes
		const extractLatLng = (r) => {
			if (!r) return null;
			// GeoJSON location: { type: 'Point', coordinates: [lng, lat] }
			if (r.location && Array.isArray(r.location.coordinates) && r.location.coordinates.length >= 2) {
				const [a, b] = r.location.coordinates.map(Number);
				if (Number.isFinite(a) && Number.isFinite(b)) {
					// try interpret as [lng, lat]
					const lng = a; const lat = b;
					if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) return { lat, lng };
					// try reverse [lat, lng]
					if (Math.abs(a) <= 90 && Math.abs(b) <= 180) return { lat: a, lng: b };
				}
			}

			// top-level fields
			const latKeys = ['lat', 'latitude'];
			const lngKeys = ['lng', 'lon', 'long', 'longitude'];
			for (const lk of latKeys) {
				for (const gk of lngKeys) {
					if (r[lk] != null && r[gk] != null) {
						const lat = Number(r[lk]);
						const lng = Number(r[gk]);
						if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
					}
				}
			}

			return null;
		};

		const coords = extractLatLng(found);
		if (coords) {
			setSelectedRestaurant(found);
			setMapCenter([Number(coords.lat), Number(coords.lng)]);
			console.log('performSearch: matched restaurant', found.name, 'coords:', coords);
		} else {
			// no usable coordinates found in DB entry
			setSelectedRestaurant(null);
			console.warn('Found restaurant but no coordinates present:', found);
		}
	}

	const menuItems = [
		{ label: 'Profile', to: '/profile' },
		{ label: 'Feedback', to: '/feedback' },
		{ label: 'Community', to: '/community' },
		{ label: 'Log In / Register', to: '/login' },
	];

	return (
		<div className="main-page">
			<Header
				title="Welcome to KCH Bites!"
				subtitle="Your go-to food finder..."
				isSidebarOpen={isSidebarOpen}
				setIsSidebarOpen={setIsSidebarOpen}
			/>

			<Sidebar
				isSidebarOpen={isSidebarOpen}
				setIsSidebarOpen={setIsSidebarOpen}
				handleLogout={handleLogout}
				menuItems={menuItems}
			/>

			<main className="page-content">
				<section className="content-shell">
					<div className="search-section">
						<input
							type="text"
							placeholder="Search for food or restaurant name..."
							className="search-input"
							value={searchQuery}
							onChange={(e) => {
								const v = e.target.value;
								setSearchQuery(v);
								if (!String(v).trim()) {
									setSelectedRestaurant(null);
								}
							}}
							onKeyDown={(e) => {
								if (e.key === 'Enter') performSearch(searchQuery);
							}}
						/>
						<button
							type="button"
							className="icon-button filter-toggle"
							onClick={() => setIsDropdownOpen((open) => !open)}
							aria-expanded={isDropdownOpen}
							aria-label="Toggle filters"
						>
							<FaFilter className="filter-icon" />
						</button>

						{isDropdownOpen && (
							<div className="dropdown-menu">
								<div className="dropdown-body">
									<div className="dropdown-header">
										<h5>Filter Search</h5>
										<p>Refine results by category, distance, time, and rating.</p>
									</div>

									{locationError && (
										<div className="location-error-banner">
											<p className="error-text">{locationError}</p>
											<button
												className="retry-btn"
												onClick={handleUseMyLocation}
												disabled={locationLoading}
											>
												{locationLoading ? <FaSpinner className="spinner" /> : 'Retry'}
											</button>
										</div>
									)}

									{userLocation && (
										<div className="location-info-banner">
											<FaMapMarkerAlt className="location-icon" />
											<span className="location-text">
												📍 Your Location: {userLocation.latitude.toFixed(4)}, {userLocation.longitude.toFixed(4)}
											</span>
											<button
												className="refresh-location-btn"
												onClick={handleUseMyLocation}
												disabled={locationLoading}
												title="Refresh your location"
											>
												{locationLoading ? <FaSpinner className="spinner" /> : <FaSync />}
											</button>
										</div>
									)}

									<div className="filter-group">
										<div className="filter-label">Categories</div>
										<div className="category-chips" role="group" aria-label="Restaurant categories">
											{["Western", "Chinese", "Korean", "Local"].map((category) => (
												<button
													type="button"
													key={category}
													className={`filter-chip ${selectedCategories.includes(category) ? "filter-chip--active" : ""}`}
													onClick={() => toggleCategory(category)}
													aria-pressed={selectedCategories.includes(category)}
												>
													{category}
												</button>
											))}
										</div>
									</div>

									<div className="filter-group">
										<div className="filter-row">
											<div className="filter-label">Distance</div>
											<span className="filter-value">{distance} km</span>
										</div>
										<input
											type="range"
											className="distance-slider"
											min="0"
											max="10"
											step="1"
											value={distance}
											onChange={(event) => setDistance(Number(event.target.value))}
											aria-label="Distance filter in kilometers"
										/>
										<div className="slider-scale">
											<span>0 km</span>
											<span>10 km</span>
										</div>
									</div>

									<div className="filter-group">
										<div className="filter-label">Operation hours</div>
										<label className="filter-option">
											<input
												type="radio"
												name="operation-hours"
												value="open-now"
												checked={operationHours === "open-now"}
												onChange={() => setOperationHours("open-now")}
											/>
											<span>Open Now</span>
										</label>
										<label className="filter-option">
											<input
												type="radio"
												name="operation-hours"
												value="open-today"
												checked={operationHours === "open-today"}
												onChange={() => setOperationHours("open-today")}
											/>
											<span>Open Today</span>
										</label>
										<label className="filter-option">
											<input
												type="radio"
												name="operation-hours"
												value="specific-time"
												checked={operationHours === "specific-time"}
												onChange={() => setOperationHours("specific-time")}
											/>
											<span>Choose specific time</span>
										</label>
										{operationHours === "specific-time" && (
											<label className="time-picker-row">
												<span className="filter-value">Time</span>
												<input
													type="time"
													className="time-picker"
													value={specificTime}
													onChange={(event) => setSpecificTime(event.target.value)}
													aria-label="Specific time filter"
												/>
											</label>
										)}
									</div>

									<div className="filter-group">
										<div className="filter-label">Rating</div>
										<label className="filter-option">
											<input
												type="radio"
												name="rating"
												value="4"
												checked={rating === "4"}
												onChange={() => setRating("4")}
											/>
											<span>4★ and above</span>
										</label>
										<label className="filter-option">
											<input
												type="radio"
												name="rating"
												value="3"
												checked={rating === "3"}
												onChange={() => setRating("3")}
											/>
											<span>3★ and above</span>
										</label>
									</div>
								</div>

								<div className="dropdown-actions">
									<button type="button" className="filter-action filter-action--ghost" onClick={clearFilters}>
										Clear
									</button>
									<button type="button" className="filter-action" onClick={() => setIsDropdownOpen(false)}>
										Apply
									</button>
								</div>
							</div>
						)}
					</div>

					<FoodWheel />

					<div className="map-section">
						<MapContainer
							center={mapCenter}
							zoom={13}
							className="map-box"
							key={mapCenter.join('-')}
						>
							<TileLayer
								attribution="&copy; OpenStreetMap contributors"
								url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
							/>

							{/* User Location Marker */}
							{userLocation && (
								<Marker
									position={[userLocation.latitude, userLocation.longitude]}
								>
									<Popup>
										<div className="marker-popup">
											<strong>📍 Your Location</strong>
											<p>Latitude: {userLocation.latitude.toFixed(6)}</p>
											<p>Longitude: {userLocation.longitude.toFixed(6)}</p>
										</div>
									</Popup>
								</Marker>
							)}

							{/* Selected restaurant marker from search */}
							{selectedRestaurant && selectedRestaurant.location && Array.isArray(selectedRestaurant.location.coordinates) && (
								(() => {
									const [lng, lat] = selectedRestaurant.location.coordinates;
									return (
										<Marker
											position={[Number(lat), Number(lng)]}
											eventHandlers={{
												click: () => openRestaurantPage(selectedRestaurant),
											}}
										>
											<Popup>
												<div className="marker-popup">
													<strong>{selectedRestaurant.name}</strong>
													{selectedRestaurant.address && <p>{selectedRestaurant.address}</p>}
													{(selectedRestaurant.location && Array.isArray(selectedRestaurant.location.coordinates)) && (
														<p>Lat: {Number(selectedRestaurant.location.coordinates[1]).toFixed(6)}, Lng: {Number(selectedRestaurant.location.coordinates[0]).toFixed(6)}</p>
													)}
													{/* fallback top-level fields if present */}
													{(selectedRestaurant.latitude || selectedRestaurant.lat || selectedRestaurant.lng || selectedRestaurant.longitude) && (
														<p>
															Lat: {Number(selectedRestaurant.latitude || selectedRestaurant.lat || selectedRestaurant.latitude || 0).toFixed(6)},
															Lng: {Number(selectedRestaurant.longitude || selectedRestaurant.lng || selectedRestaurant.long || 0).toFixed(6)}
														</p>
													)}
												</div>
											</Popup>
										</Marker>
									);
								})()
							)}
						</MapContainer>
					</div>
				</section>
			</main>

			<Footer />
		</div>
	);
}
