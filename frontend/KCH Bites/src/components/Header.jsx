import React from 'react';
import { FaUserCircle, FaBell } from "react-icons/fa";
import logo from "../assets/kch-bites-logo.png";

export default function Header({ title, subtitle, isSidebarOpen, setIsSidebarOpen }) {
    return (
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
                <h1 className="header-main">{title}</h1>
                <p className="header-subtitle">{subtitle}</p>
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
    );
}