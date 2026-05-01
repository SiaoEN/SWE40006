import React, { useState } from 'react';
import { FaUserCircle, FaBell, FaFilter, FaWalking, FaEnvelope, FaFacebook, FaInstagram, FaTwitter } from "react-icons/fa";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css"
import logo from "../assets/kch-bites-logo.png";
import logoutIcon from "../assets/logout.png";
import "../styles//MainPage.css";
import FoodWheel from './FoodWheel';

export default function MainPage() {
	const [isSidebarOpen, setIsSidebarOpen] = useState(false);
	const [isDropdownOpen, setIsDropdownOpen] = useState(false);
	const [selectedCategories, setSelectedCategories] = useState([]);
	const [distance, setDistance] = useState(10);
	const [operationHours, setOperationHours] = useState("open-now");
	const [specificTime, setSpecificTime] = useState("12:00");
	const [rating, setRating] = useState("4");

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

	const handleLogout = () => {
		localStorage.removeItem("token");
		localStorage.removeItem("user");

		window.location.href = "/login";
	}

	return (
		<div className="main-page">
			<header className="page-header">
				<div className="header-left">
					<button
						type="button"
						className="icon-button profile-toggle"
						onClick={() => setIsSidebarOpen((open) => !open)}
						aria-expanded={isSidebarOpen}
						aria-label="Toggle profile sidebar"
					>
						<FaUserCircle className="user-icon" />
					</button>
				</div>

				<div className="header-title">
					<p className="content-kicker">Kuching Food Finder</p>
					<h1 className="header-main">Welcome to KCH Bites!</h1>
					<p className="header-subtitle">Your go-to food finder in Kuching — discover nearby restaurants, filter by distance & budget, and share honest reviews with fellow food lovers.</p>
				</div>

				<div className="header-actions">
					<button type="button" className="icon-button header-icon-button" aria-label="Notifications">
						<FaBell className="bell-icon" />
					</button>
					<div className="header-logo-badge" aria-hidden="true">
						<img src={logo} alt="" className="header-logo header-logo--badge" />
					</div>
				</div>
			</header>
			{isSidebarOpen && (
				<div className="sidebar-overlay"
					onClick={() => setIsSidebarOpen(false)}
				/>
			)}
			<aside className={`sidebar ${isSidebarOpen ? "sidebar--open" : ""}`} aria-label="Main navigation">
				<div className="profile-section">
					<button
						type="button"
						className="sidebar-profile-button"
						onClick={() => setIsSidebarOpen(false)}
						aria-label="Close sidebar"
					>
						<img src={logo} alt="Logo" className="sidebar-logo" />
					</button>
					<h3>Name</h3>
				</div>

				<div className="side-menu-wrap">
					<nav className="side-menu">
						<p className="side-menu-item">Profile</p>
						<p className="side-menu-item">Feedback</p>
						<p className="side-menu-item">Community</p>
					</nav>
				</div>

				<button type="button" className="logout-button" onClick={handleLogout}>
					<img src={logoutIcon} alt="Logout" className="logout-icon" />
					<span>LogOut</span>
				</button>
			</aside>

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
								<div className="dropdown-header">
									<h5>Filter Search</h5>
									<p>Refine results by category, distance, time, and rating.</p>
								</div>

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
							center={[1.5533, 110.3592]}
							zoom={13}
							className="map-box"
						>
							<TileLayer
								attribution="&copy; OpenStreetMap contributors"
								url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
							/>
							<Marker position={[1.5533, 110.3592]}>
								<Popup>
									Kuching Area
								</Popup>
							</Marker>
						</MapContainer>
					</div>
				</section>
			</main>

			<footer className="site-footer">
				<div className="footer-container">
					<div className="footer-grid">
						{/* Brand */}
						<div className="footer-col footer-brand">
							<img src={logo} alt="KCH Bites" className="footer-logo" />
							<h4>KCH Bites</h4>
							<p className="footer-tag">Your Food Finder in Kuching</p>
						</div>

						{/* Quick Links */}
						<nav className="footer-col footer-links-col" aria-label="Quick links">
							<h5>Quick Links</h5>
							<ul>
								<li><a href="#">Home</a></li>
								<li><a href="#">About Us</a></li>
								<li><a href="#">Contact</a></li>
								<li><a href="#">Privacy / Terms</a></li>
							</ul>
						</nav>

						{/* Contact */}
						<div className="footer-col footer-contact">
							<h5>Contact</h5>
							<div className="socials">
								<a href="mailto:support@kchbites.com" className="social-link" title="Email">
									<FaEnvelope />
									<span>support@kchbites.com</span>
								</a>
								<a href="#" aria-label="Facebook" className="social-link" title="Facebook">
									<FaFacebook />
									<span>Facebook</span>
								</a>
								<a href="#" aria-label="Instagram" className="social-link" title="Instagram">
									<FaInstagram />
									<span>Instagram</span>
								</a>
								<a href="#" aria-label="Twitter" className="social-link" title="Twitter">
									<FaTwitter />
									<span>Twitter</span>
								</a>
							</div>
						</div>
					</div>

					<hr className="footer-divider" />

					<div className="footer-bottom">
						<div className="credits-inline">
							<span>Powered by Zenzic Team</span>
							<span>Made with ❤️ in Kuching</span>
							<span>© 2026 KCH Bites. All rights reserved.</span>
						</div>
					</div>
				</div>
			</footer>
		</div>
	);
}
