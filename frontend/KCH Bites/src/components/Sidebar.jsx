import React from 'react';
import { Link } from 'react-router-dom';
import logo from "../assets/kch-bites-logo.png";
import logoutIcon from "../assets/logout.png";

export default function Sidebar({ isSidebarOpen, setIsSidebarOpen, handleLogout, menuItems = [] }) {
    const renderItem = (item, idx) => {
        // support either string labels or objects { label, to }
        if (typeof item === 'string') {
            const label = item;
            const to = '/' + label.toLowerCase().replace(/\s+/g, '-');
            return (
                <Link key={idx} to={to} className="side-menu-item" onClick={() => setIsSidebarOpen(false)}>
                    {label}
                </Link>
            );
        }

        const { label, to } = item;
        return (
            <Link key={idx} to={to} className="side-menu-item" onClick={() => setIsSidebarOpen(false)}>
                {label}
            </Link>
        );
    };

    return (
        <>
            {isSidebarOpen && (
                <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)} />
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
                        {menuItems.map((item, idx) => renderItem(item, idx))}
                    </nav>
                </div>

                <button type="button" className="logout-button" onClick={handleLogout}>
                    <img src={logoutIcon} alt="Logout" className="logout-icon" />
                    <span>LogOut</span>
                </button>
            </aside>
        </>
    );
}