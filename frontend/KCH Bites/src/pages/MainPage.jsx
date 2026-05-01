import React, { useState } from 'react';
import { FaUserCircle, FaBell, FaFilter, FaWalking, FaEnvelope, FaFacebook, FaInstagram, FaTwitter } from "react-icons/fa";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css"
import logo from "../assets/kch-bites-logo.png";
import "./MainPage.css";

export default function MainPage() {
	const [isSidebarOpen, setIsSidebarOpen] = useState(false);
	const [isDropdownOpen, setIsDropdownOpen] = useState(false);

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

				<nav className="side-menu">
					<p className="side-menu-item">Profile</p>
					<p className="side-menu-item">Feedback</p>
					<p className="side-menu-item">Community</p>
				</nav>

				<FaWalking className="walking-icon" />
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
								<h5>Dropdown Menu</h5>
								<p>Categories</p>
								<p>Distance</p>
								<p>Operation hours (days & time)</p>
								<p>Rating</p>
							</div>
						)}
					</div>

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
