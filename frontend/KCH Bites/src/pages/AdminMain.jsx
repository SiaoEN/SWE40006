import React, { useState } from 'react';
import { FaUserCircle, FaBell, FaUsers, FaComments, FaNewspaper, FaWalking } from "react-icons/fa";
import logo from "../assets/kch-bites-logo.png";
import "../styles/MainPage.css";

export default function AdminPage() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [activeSection, setActiveSection] = useState(null);

    const adminSections = [
        {
            id: 'community',
            title: 'Community',
            icon: FaUsers,
            description: 'Manage community posts and member interactions',
        },
        {
            id: 'feedback',
            title: 'Feedback',
            icon: FaComments,
            description: 'Review user feedback and suggestions',
        },
        {
            id: 'news',
            title: 'News',
            icon: FaNewspaper,
            description: 'Manage news articles and updates',
        },
    ];

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
                    <h1 className="header-main">Admin Dashboard</h1>
                    <p className="header-subtitle">Manage community, feedback, and news content. Monitor platform activity and ensure quality standards.</p>
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

            <aside className={`sidebar ${isSidebarOpen ? "sidebar--open" : ""}`} aria-label="Admin navigation">
                <div className="profile-section">
                    <button
                        type="button"
                        className="sidebar-profile-button"
                        onClick={() => setIsSidebarOpen(false)}
                        aria-label="Close sidebar"
                    >
                        <img src={logo} alt="Logo" className="sidebar-logo" />
                    </button>
                    <h3>Admin</h3>
                </div>

                <nav className="side-menu">
                    <p className="side-menu-item">Profile</p>
                    <p className="side-menu-item">Settings</p>
                    <p className="side-menu-item">Reports</p>
                </nav>

                <FaWalking className="walking-icon" />
            </aside>

            <main className="page-content">
                <section className="content-shell">
                    <div className="admin-sections-grid">
                        {adminSections.map((section) => {
                            const IconComponent = section.icon;
                            return (
                                <button
                                    key={section.id}
                                    className={`admin-section-card ${activeSection === section.id ? 'active' : ''}`}
                                    onClick={() => setActiveSection(section.id)}
                                    aria-pressed={activeSection === section.id}
                                    type="button"
                                >
                                    <IconComponent className="admin-card-icon" />
                                    <h3>{section.title}</h3>
                                    <p>{section.description}</p>
                                </button>
                            );
                        })}
                    </div>

                    {activeSection && (
                        <div className="admin-content-area">
                            <div className="admin-content-header">
                                <h2>{adminSections.find(s => s.id === activeSection)?.title}</h2>
                                <button
                                    type="button"
                                    className="close-button"
                                    onClick={() => setActiveSection(null)}
                                    aria-label="Close section"
                                >
                                    ✕
                                </button>
                            </div>
                            <div className="admin-content-body">
                                <p>Content for {activeSection} section coming soon...</p>
                            </div>
                        </div>
                    )}
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
                                    support@kchbites.com
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
