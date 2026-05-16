import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getUser } from '../services/auth';
import logo from "../assets/kch-bites-logo.png";
import logoutIcon from "../assets/logout.png";

export default function Sidebar({ isSidebarOpen, setIsSidebarOpen, handleLogout, menuItems = [], profileTo = '/profile' }) {
    const navigate = useNavigate();
    const [userState, setUserState] = useState(() => getUser());
    const userName = userState?.username || '';

    useEffect(() => {
        const handler = (e) => {
            setUserState(() => getUser());
        };
        window.addEventListener('userUpdated', handler);
        return () => window.removeEventListener('userUpdated', handler);
    }, []);

    const renderItem = (item, idx) => {
        // support either string labels or objects { label, to }
        if (typeof item === 'string') {
            const label = item;
            const to = '/' + label.toLowerCase().replace(/\s+/g, '-');
            return (
                <Link key={idx} to={to} className="side-menu-item" style={{ textDecoration: 'none' }} onClick={() => setIsSidebarOpen(false)}>
                    {label}
                </Link>
            );
        }

        const { label, to } = item;
        return (
            <Link key={idx} to={to} className="side-menu-item" style={{ textDecoration: 'none' }} onClick={() => setIsSidebarOpen(false)}>
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
                    <Link to={profileTo} className="sidebar-profile-link" onClick={() => setIsSidebarOpen(false)}>
                        {(userState && userState.avatar)
                            ? (
                                <img
                                    src={userState.avatar}
                                    alt={userName ? `${userName} avatar` : 'Profile'}
                                    className="sidebar-avatar"
                                />
                              )
                            : (
                                <div className="sidebar-avatar-empty" aria-hidden="true" />
                              )
                        }
                    </Link>
                    {userName ? <h3>{userName}</h3> : null}
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