import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaUserCircle, FaBell, FaFilter, FaMapMarkerAlt, FaEnvelope, FaFacebook, FaInstagram, FaTwitter, FaSync, FaSpinner, FaWalking, FaStar } from "react-icons/fa";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { icon as createLeafletIcon } from "leaflet";
import "leaflet/dist/leaflet.css"
import "../styles//MainPage.css";
import "../styles/LocationBanner.css";
import FoodWheel from './FoodWheel';
import { getUserLocation } from '../services/geolocation';
import { saveUserLocation } from '../services/api';
import api from '../services/api';
import { clearAuthToken } from '../services/auth';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import Footer from '../components/Footer';

const DEFAULT_FILTERS = {
	selectedCategories: [],
	distance: 10,
	operationHours: "any",
	specificTime: "12:00",
	specificDate: new Date().toISOString().split('T')[0],
	rating: "none",
};

const DAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

function createColoredMarkerIcon(fillColor) {
	const svg = `
		<svg xmlns="http://www.w3.org/2000/svg" width="25" height="41" viewBox="0 0 25 41">
			<path fill="${fillColor}" stroke="#ffffff" stroke-width="1.5" d="M12.5 0C6.2 0 1 5.2 1 11.5c0 8.9 11.5 29.5 11.5 29.5S24 20.4 24 11.5C24 5.2 18.8 0 12.5 0z"/>
			<circle cx="12.5" cy="11.5" r="4.5" fill="#ffffff" opacity="0.95"/>
		</svg>
	`;

	return createLeafletIcon({
		iconUrl: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
		iconSize: [25, 41],
		iconAnchor: [12, 41],
		popupAnchor: [1, -34],
		title: "restaurant-marker",
	});
}

const userLocationIcon = createColoredMarkerIcon("#2563eb");
const restaurantIcon = createColoredMarkerIcon("#f97316");

function normalizeText(value) {
	return String(value || "")
		.toLowerCase()
		.replace(/[^a-z0-9]/g, "");
}

function parseCoordinates(restaurant) {
	if (!restaurant) return null;

	if (restaurant.location && Array.isArray(restaurant.location.coordinates) && restaurant.location.coordinates.length >= 2) {
		const [first, second] = restaurant.location.coordinates.map(Number);
		if (Number.isFinite(first) && Number.isFinite(second)) {
			if (Math.abs(second) <= 90 && Math.abs(first) <= 180) {
				return { lat: second, lng: first };
			}

			if (Math.abs(first) <= 90 && Math.abs(second) <= 180) {
				return { lat: first, lng: second };
			}
		}
	}

	const lat = restaurant.latitude ?? restaurant.lat;
	const lng = restaurant.longitude ?? restaurant.lng ?? restaurant.lon ?? restaurant.long;
	if (lat == null || lng == null) {
		return null;
	}

	const parsedLat = Number(lat);
	const parsedLng = Number(lng);
	if (!Number.isFinite(parsedLat) || !Number.isFinite(parsedLng)) {
		return null;
	}

	return { lat: parsedLat, lng: parsedLng };
}

function getRestaurantRating(restaurant) {
	const candidates = [restaurant?.rating, restaurant?.averageRating, restaurant?.avgRating];
	for (const value of candidates) {
		const parsed = Number(value);
		if (Number.isFinite(parsed)) {
			return parsed;
		}
	}

	return null;
}

function getRestaurantMedia(restaurant) {
	const rawMedia = Array.isArray(restaurant?.images) && restaurant.images.length > 0
		? restaurant.images
		: Array.isArray(restaurant?.photos) && restaurant.photos.length > 0
			? restaurant.photos
			: [];

	return rawMedia
		.map((item, index) => {
			if (typeof item === "string") {
				return {
					src: item,
					alt: `${restaurant?.name || "Restaurant"} photo ${index + 1}`,
				};
			}

			const resolvedSrc =
				item?.src ||
				item?.url ||
				item?.path ||
				(item?.filename ? `http://localhost:5000/uploads/feedback/${item.filename}` : "");

			if (!resolvedSrc) {
				return null;
			}

			return {
				...item,
				src: resolvedSrc,
				alt: item?.alt || item?.originalName || `${restaurant?.name || "Restaurant"} photo ${index + 1}`,
			};
		})
		.filter(Boolean);
}

function getRestaurantPreviewImage(restaurant) {
	return getRestaurantMedia(restaurant)[0]?.src || null;
}

function getRestaurantPreviewTags(restaurant) {
	if (!Array.isArray(restaurant?.tags)) {
		return [];
	}

	return restaurant.tags
		.map((tag) => String(tag || "").trim())
		.filter(Boolean)
		.slice(0, 3);
}

function getRestaurantPreviewDescription(restaurant) {
	const description = String(restaurant?.description || "").trim();
	if (!description) {
		return restaurant?.address ? String(restaurant.address).trim() : "Hover to preview this restaurant.";
	}

	return description.length > 110 ? `${description.slice(0, 107)}...` : description;
}

function formatRestaurantRating(restaurant) {
	const rating = getRestaurantRating(restaurant);
	return rating == null ? "No rating yet" : `${rating.toFixed(1)} / 5`;
}

function RestaurantPreviewPopup({ restaurant, coordinates }) {
	const previewImage = getRestaurantPreviewImage(restaurant);
	const previewTags = getRestaurantPreviewTags(restaurant);
	const previewDescription = getRestaurantPreviewDescription(restaurant);
	const ratingText = formatRestaurantRating(restaurant);
	const initial = String(restaurant?.name || "R").trim().charAt(0).toUpperCase() || "R";

	return (
		<Popup
			direction="top"
			offset={[0, -20]}
			className="restaurant-preview-popup"
			autoPan={true}
			autoPanPadding={[48, 48]}
			keepInView={true}
			closeButton={false}
			closeOnClick={false}
			maxWidth={240}
		>
			<div className="restaurant-preview-card">
				<div className="restaurant-preview-media">
					{previewImage ? (
						<img src={previewImage} alt={restaurant?.name ? `${restaurant.name} preview` : "Restaurant preview"} className="restaurant-preview-image" />
					) : (
						<div className="restaurant-preview-fallback" aria-hidden="true">
							<span>{initial}</span>
						</div>
					)}
				</div>

				<div className="restaurant-preview-content">
					<p className="restaurant-preview-kicker">Restaurant preview</p>
					<div className="restaurant-preview-title-row">
						<h4>{restaurant?.name || "Unnamed restaurant"}</h4>
						<span className="restaurant-preview-rating">
							<FaStar aria-hidden="true" />
							{ratingText}
						</span>
					</div>

					{restaurant?.address && <p className="restaurant-preview-address">{restaurant.address}</p>}
					<p className="restaurant-preview-description">{previewDescription}</p>

					{previewTags.length > 0 && (
						<div className="restaurant-preview-tags" aria-label="Restaurant tags">
							{previewTags.map((tag) => (
								<span key={tag} className="restaurant-preview-tag">{tag}</span>
							))}
						</div>
					)}

					<p className="restaurant-preview-hint">
						Click to open details{coordinates ? ` • ${coordinates.lat.toFixed(4)}, ${coordinates.lng.toFixed(4)}` : ""}
					</p>
				</div>
			</div>
		</Popup>
	);
}

function parseTimeToMinutes(value) {
	if (!value) return null;
	const match = String(value).trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
	if (!match) return null;

	let hours = Number(match[1]);
	const minutes = Number(match[2] || 0);
	const meridiem = String(match[3] || "").toLowerCase();

	if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
		return null;
	}

	if (meridiem === "pm" && hours < 12) hours += 12;
	if (meridiem === "am" && hours === 12) hours = 0;

	return hours * 60 + minutes;
}

function parseHoursEntry(entry) {
	if (!entry) return null;
	if (typeof entry === "string") {
		const trimmed = entry.trim();
		if (!trimmed) return null;
		if (/closed/i.test(trimmed)) {
			return { closed: true };
		}

		if (/24\s*hours?|open\s*24\s*hours?|always\s*open|open\s*daily|open\s*all\s*day/i.test(trimmed)) {
			return { openAllDay: true, raw: trimmed };
		}

		const rangeMatch = trimmed.match(/(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s*[-–to]+\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i);
		if (rangeMatch) {
			return {
				start: parseTimeToMinutes(rangeMatch[1]),
				end: parseTimeToMinutes(rangeMatch[2]),
			};
		}

		return { raw: trimmed };
	}

	if (typeof entry === "object") {
		return {
			closed: Boolean(entry.closed),
			openAllDay: Boolean(entry.openAllDay),
			start: parseTimeToMinutes(entry.start || entry.open || entry.from),
			end: parseTimeToMinutes(entry.end || entry.close || entry.to),
			raw: entry.raw || null,
		};
	}

	return null;
}

function getOperatingHoursForDay(operatingHours, dayIndex) {
	if (!operatingHours) return null;

	if (Array.isArray(operatingHours)) {
		return parseHoursEntry(operatingHours[dayIndex]);
	}

	if (typeof operatingHours === "object") {
		const dayKey = DAY_NAMES[dayIndex];
		const entries = Object.entries(operatingHours);
		const matchedEntry = entries.find(([key]) => normalizeText(key).includes(dayKey) || normalizeText(key).startsWith(dayKey.slice(0, 3)));
		if (matchedEntry) {
			return parseHoursEntry(matchedEntry[1]);
		}

		return null;
	}

	if (typeof operatingHours === "string") {
		const segments = operatingHours.split(/[|\n]/).map((segment) => segment.trim()).filter(Boolean);
		const dayKey = DAY_NAMES[dayIndex];
		const matchedSegment = segments.find((segment) => normalizeText(segment).includes(dayKey) || normalizeText(segment).includes(dayKey.slice(0, 3)));
		if (matchedSegment) {
			const hoursPart = matchedSegment.split(/[:=]/).slice(1).join(":").trim();
			return parseHoursEntry(hoursPart || matchedSegment);
		}

		return parseHoursEntry(operatingHours);
	}

	return null;
}

function isRestaurantOpenAt(restaurant, mode, dateValue, timeValue, referenceDate = new Date()) {
	const operatingHours = restaurant?.operatingHours;
	if (!operatingHours) {
		return false;
	}

	const targetDate = dateValue ? new Date(`${dateValue}T${timeValue || "12:00"}:00`) : referenceDate;
	if (Number.isNaN(targetDate.getTime())) {
		return false;
	}

	const dayEntry = getOperatingHoursForDay(operatingHours, targetDate.getDay());
	if (!dayEntry) {
		return false;
	}

	if (dayEntry.closed) {
		return false;
	}

	if (dayEntry.openAllDay) {
		return true;
	}

	const currentMinutes = targetDate.getHours() * 60 + targetDate.getMinutes();
	const entryIsOpenAt = (entry) => {
		if (!entry || entry.closed) {
			return false;
		}

		if (entry.openAllDay) {
			return true;
		}

		if (entry.start != null && entry.end != null) {
			if (entry.start <= entry.end) {
				return currentMinutes >= entry.start && currentMinutes <= entry.end;
			}

			return currentMinutes >= entry.start || currentMinutes <= entry.end;
		}

		if (typeof entry.raw === "string") {
			const cleaned = normalizeText(entry.raw);
			return cleaned ? !cleaned.includes("closed") : true;
		}

		return Boolean(entry.raw) && /open|available|daily|all day|24 hours?/i.test(String(entry.raw));
	};

	if (mode === "open-now") {
		if (entryIsOpenAt(dayEntry)) {
			return true;
		}

		const previousDay = new Date(targetDate);
		previousDay.setDate(previousDay.getDate() - 1);
		const previousDayEntry = getOperatingHoursForDay(operatingHours, previousDay.getDay());
		if (previousDayEntry?.start != null && previousDayEntry?.end != null && previousDayEntry.start > previousDayEntry.end) {
			return currentMinutes <= previousDayEntry.end;
		}

		return false;
	}

	if (mode === "open-today") {
		return Boolean(dayEntry.start != null || dayEntry.end != null || dayEntry.raw);
	}

	const targetMinutes = parseTimeToMinutes(timeValue);
	if (targetMinutes == null) {
		return false;
	}

	if (dayEntry.start != null && dayEntry.end != null) {
		if (dayEntry.start <= dayEntry.end) {
			return targetMinutes >= dayEntry.start && targetMinutes <= dayEntry.end;
		}

		return targetMinutes >= dayEntry.start || targetMinutes <= dayEntry.end;
	}

	if (typeof dayEntry.raw === "string") {
		const cleaned = normalizeText(dayEntry.raw);
		return cleaned ? !cleaned.includes("closed") : true;
	}

	return Boolean(dayEntry.raw) && /open|available|daily|all day|24 hours?/i.test(String(dayEntry.raw));
}

function haversineDistanceKm(from, to) {
	if (!from || !to) return Infinity;

	const toRadians = (value) => (value * Math.PI) / 180;
	const earthRadiusKm = 6371;
	const deltaLat = toRadians(to.lat - from.lat);
	const deltaLng = toRadians(to.lng - from.lng);
	const lat1 = toRadians(from.lat);
	const lat2 = toRadians(to.lat);
	const a = Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
	return 2 * earthRadiusKm * Math.asin(Math.min(1, Math.sqrt(a)));
}

function FitRestaurantBounds({ restaurants, fallbackCenter }) {
	const map = useMap();

	useEffect(() => {
		const points = restaurants
			.map((restaurant) => parseCoordinates(restaurant))
			.filter(Boolean);

		if (points.length === 0) {
			if (fallbackCenter && Array.isArray(fallbackCenter) && fallbackCenter.length === 2) {
				map.setView(fallbackCenter, map.getZoom(), { animate: true });
			}
			return;
		}

		if (points.length === 1) {
			map.setView([points[0].lat, points[0].lng], 15, { animate: true });
			return;
		}

		const bounds = points.map((point) => [point.lat, point.lng]);
		map.fitBounds(bounds, { padding: [40, 40] });
	}, [fallbackCenter, map, restaurants]);

	return null;
}

export default function MainPage() {
	const navigate = useNavigate();
	const [isSidebarOpen, setIsSidebarOpen] = useState(false);
	const [isDropdownOpen, setIsDropdownOpen] = useState(false);
	const [selectedCategories, setSelectedCategories] = useState([]);
	const [distance, setDistance] = useState(10);
	const [operationHours, setOperationHours] = useState("any");
	const [specificTime, setSpecificTime] = useState("12:00");
	const [specificDate, setSpecificDate] = useState(new Date().toISOString().split('T')[0]);
	const [rating, setRating] = useState("none");
	const [appliedFilters, setAppliedFilters] = useState(null);
	const [currentDateTime, setCurrentDateTime] = useState(() => new Date());

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

	useEffect(() => {
		const syncClock = () => setCurrentDateTime(new Date());
		syncClock();
		const timerId = window.setInterval(syncClock, 30000);
		return () => window.clearInterval(timerId);
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
		setOperationHours("any");
		setSpecificTime("12:00");
		setSpecificDate(new Date().toISOString().split('T')[0]);
		setRating("none");
		setAppliedFilters(null);
	};

	const handleApplyFilters = () => {
		setAppliedFilters({
			selectedCategories: [...selectedCategories],
			distance,
			operationHours,
			specificTime,
			specificDate,
			rating,
		});
		setIsDropdownOpen(false);
	};

	const handleOperationHoursChange = (nextOperationHours) => {
		setOperationHours(nextOperationHours);
		if (nextOperationHours === "open-now") {
			setSelectedRestaurant(null);
		}
		setAppliedFilters({
			selectedCategories: [...selectedCategories],
			distance,
			operationHours: nextOperationHours,
			specificTime,
			specificDate,
			rating,
		});
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
		clearAuthToken();
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

	const filteredRestaurants = useMemo(() => {
		if (!restaurants.length || !appliedFilters) {
			return [];
		}

		const normalizedSelectedCategories = appliedFilters.selectedCategories.map((category) => normalizeText(category));
		const selectedRating = Number(appliedFilters.rating);
		const userPoint = userLocation ? { lat: userLocation.latitude, lng: userLocation.longitude } : null;

		return restaurants.filter((restaurant) => {
			const restaurantCategories = Array.isArray(restaurant.tags) ? restaurant.tags.map((tag) => normalizeText(tag)) : [];
			if (normalizedSelectedCategories.length > 0) {
				const matchesCategory = normalizedSelectedCategories.some((category) => restaurantCategories.includes(category));
				if (!matchesCategory) return false;
			}

			if (appliedFilters.operationHours !== "open-now" && userPoint && Number.isFinite(appliedFilters.distance)) {
				const restaurantPoint = parseCoordinates(restaurant);
				if (restaurantPoint) {
					const restaurantDistance = haversineDistanceKm(userPoint, restaurantPoint);
					if (restaurantDistance > Number(appliedFilters.distance)) {
						return false;
					}
				}
			}

			if (appliedFilters.operationHours === "open-now") {
				if (!isRestaurantOpenAt(restaurant, "open-now", null, null, currentDateTime)) return false;
			}

			if (appliedFilters.operationHours === "open-today") {
				if (!isRestaurantOpenAt(restaurant, "open-today", appliedFilters.specificDate, null)) return false;
			}

			if (appliedFilters.operationHours === "specific-time") {
				if (!isRestaurantOpenAt(restaurant, "specific-time", appliedFilters.specificDate, appliedFilters.specificTime)) return false;
			}

			if (appliedFilters.rating !== "none") {
				const restaurantRating = getRestaurantRating(restaurant);
				if (restaurantRating == null || restaurantRating < selectedRating) {
					return false;
				}
			}

			return true;
		});
	}, [appliedFilters, restaurants, userLocation, currentDateTime]);

	const mapRestaurants = useMemo(() => {
		if (appliedFilters?.operationHours === "open-now") {
			return filteredRestaurants;
		}

		if (selectedRestaurant) {
			return [selectedRestaurant];
		}

		return filteredRestaurants;
	}, [filteredRestaurants, selectedRestaurant]);

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
											{["Western", "Chinese", "Korean", "Local", "Japanese", "Indian", "Halal", "Vegetarian", "Desserts"].map((category) => (
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
												value="any"
												checked={operationHours === "any"}
												onChange={() => handleOperationHoursChange("any")}
											/>
											<span>Any time</span>
										</label>
										<label className="filter-option">
											<input
												type="radio"
												name="operation-hours"
												value="open-now"
												checked={operationHours === "open-now"}
												onChange={() => handleOperationHoursChange("open-now")}
											/>
											<span>Open Now</span>
										</label>
										<label className="filter-option">
											<input
												type="radio"
												name="operation-hours"
												value="open-today"
												checked={operationHours === "open-today"}
												onChange={() => handleOperationHoursChange("open-today")}
											/>
											<span>Open Today</span>
										</label>
										<label className="filter-option">
											<input
												type="radio"
												name="operation-hours"
												value="specific-time"
												checked={operationHours === "specific-time"}
												onChange={() => handleOperationHoursChange("specific-time")}
											/>
											<span>Choose specific date & time</span>
										</label>
										{operationHours === "specific-time" && (
											<div className="date-time-picker-row">
												<div className="date-time-group">
													<label className="date-time-label">Date</label>
													<input
														type="date"
														className="date-picker"
														value={specificDate}
														onChange={(event) => {
															const nextSpecificDate = event.target.value;
															setSpecificDate(nextSpecificDate);
															if (operationHours === "specific-time") {
																setAppliedFilters({
																	selectedCategories: [...selectedCategories],
																	distance,
																	operationHours,
																	specificTime,
																	specificDate: nextSpecificDate,
																	rating,
																});
															}
														}}
														aria-label="Specific date filter"
													/>
												</div>
												<div className="date-time-group">
													<label className="date-time-label">Time</label>
													<input
														type="time"
														className="time-picker"
														value={specificTime}
														onChange={(event) => {
															const nextSpecificTime = event.target.value;
															setSpecificTime(nextSpecificTime);
															if (operationHours === "specific-time") {
																setAppliedFilters({
																	selectedCategories: [...selectedCategories],
																	distance,
																	operationHours,
																	specificTime: nextSpecificTime,
																	specificDate,
																	rating,
																});
															}
														}}
														aria-label="Specific time filter"
													/>
												</div>
											</div>
										)}
									</div>

									<div className="filter-group">
										<div className="filter-label">Rating</div>
										<label className="filter-option">
											<input
												type="radio"
												name="rating"
												value="none"
												checked={rating === "none"}
												onChange={() => setRating("none")}
											/>
											<span>Don't filter by rating</span>
										</label>
										<label className="filter-option">
											<input
												type="radio"
												name="rating"
												value="5"
												checked={rating === "5"}
												onChange={() => setRating("5")}
											/>
											<span>5★ and above</span>
										</label>
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
										<label className="filter-option">
											<input
												type="radio"
												name="rating"
												value="2"
												checked={rating === "2"}
												onChange={() => setRating("2")}
											/>
											<span>2★ and above</span>
										</label>
										<label className="filter-option">
											<input
												type="radio"
												name="rating"
												value="1"
												checked={rating === "1"}
												onChange={() => setRating("1")}
											/>
											<span>1★ and above</span>
										</label>
									</div>
								</div>

								<div className="dropdown-actions">
									<button type="button" className="filter-action filter-action--ghost" onClick={clearFilters}>
										Clear
									</button>
									<button type="button" className="filter-action" onClick={handleApplyFilters}>
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
							<FitRestaurantBounds restaurants={mapRestaurants} fallbackCenter={mapCenter} />
							<TileLayer
								attribution="&copy; OpenStreetMap contributors"
								url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
							/>

							{/* User Location Marker */}
							{userLocation && (
								<Marker
									position={[userLocation.latitude, userLocation.longitude]}
									icon={userLocationIcon}
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

							{mapRestaurants.map((restaurant) => {
								const coordinates = parseCoordinates(restaurant);
								if (!coordinates) return null;

								const restaurantKey = String(restaurant.id || restaurant._id || restaurant.name || "");
								return (
									<Marker
										key={restaurantKey}
										position={[coordinates.lat, coordinates.lng]}
										icon={restaurantIcon}
										eventHandlers={{
											mouseover: (event) => {
												event.target.openPopup();
											},
											mouseout: (event) => {
												event.target.closePopup();
											},
											click: () => openRestaurantPage(restaurant),
										}}
									>
										<RestaurantPreviewPopup restaurant={restaurant} coordinates={coordinates} />
										<Popup>
											<div className="marker-popup">
												<strong>{restaurant.name}</strong>
												{restaurant.address && <p>{restaurant.address}</p>}
												<p>
													Lat: {coordinates.lat.toFixed(6)}, Lng: {coordinates.lng.toFixed(6)}
												</p>
											</div>
										</Popup>
									</Marker>
								);
							})}
						</MapContainer>
					</div>
				</section>
			</main>

			<Footer />
		</div>
	);
}
