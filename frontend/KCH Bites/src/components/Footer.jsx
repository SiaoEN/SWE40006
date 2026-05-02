import React from 'react';
import logo from "../assets/kch-bites-logo.png";
import { FaUserCircle, FaBell, FaFilter, FaMapMarkerAlt, FaEnvelope, FaFacebook, FaInstagram, FaTwitter, FaSync, FaSpinner, FaWalking } from "react-icons/fa";

export default function Footer() {
    return (
        <footer className="site-footer">
            <div className="footer-container">
                <div className="footer-grid">
                    <div className="footer-col footer-brand">
                        <img src={logo} alt="KCH Bites" className="footer-logo" />
                        <h4>KCH Bites</h4>
                        <p className="footer-tag">Your Food Finder in Kuching</p>
                    </div>

                    <nav className="footer-col footer-links-col" aria-label="Quick links">
                        <h5>Quick Links</h5>
                        <ul>
                            <li><a href="#">Home</a></li>
                            <li><a href="#">About Us</a></li>
                            <li><a href="#">Contact</a></li>
                            <li><a href="#">Privacy / Terms</a></li>
                        </ul>
                    </nav>

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
    );
}