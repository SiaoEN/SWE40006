import React, { useState, useEffect } from 'react';
import { FaUserCircle, FaBell, FaFilter, FaMapMarkerAlt, FaEnvelope, FaFacebook, FaInstagram, FaTwitter, FaSync, FaSpinner, FaWalking } from "react-icons/fa";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css"
import "../styles//MainPage.css";
import "../styles/LocationBanner.css";
import FoodWheel from './FoodWheel';
import { getUserLocation } from '../services/geolocation';
import { saveUserLocation } from '../services/api';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import Footer from '../components/Footer';

export default function MainPage() {
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
					const userId = localStorage.getItem("user") ? JSON.parse(localStorage.getItem("user")).id : "anonymous";
					await saveUserLocation(userId, location.latitude, location.longitude);
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
				const userId = localStorage.getItem("user") ? JSON.parse(localStorage.getItem("user")).id : "anonymous";
				await saveUserLocation(userId, location.latitude, location.longitude);
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

	const menuItems = ["Profile", "Feedback", "Community", "Log In / Register"];

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
						<input type="text" placeholder="Search for food..." className="search-input" />
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
						</MapContainer>
					</div>
				</section>
			</main>

			<Footer />
		</div>
	);
}
