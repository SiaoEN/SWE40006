import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaUserCircle, FaBell, FaTimes } from "react-icons/fa";
import logo from "../assets/kch-bites-logo.png";
import { API_BASE_URL } from "../services/api";
import { isLoggedIn } from "../services/auth";
import { getAllNotifications, markNotificationAsRead, markAllNotificationsAsRead } from "../services/notifications";
import "../styles/NotificationDrawer.css";

export default function Header({ title, subtitle, isSidebarOpen, setIsSidebarOpen, bellTo = '/news', notificationMode = 'drawer' }) {
    const navigate = useNavigate();
    const [showNotifications, setShowNotifications] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [latestNews, setLatestNews] = useState([]);
    const [loading, setLoading] = useState(false);
    const [readNewsIds, setReadNewsIds] = useState(() => {
        try {
            const storage = isLoggedIn() ? localStorage : sessionStorage;
            const storageKey = getReadNewsStorageKey();
            return JSON.parse(storage.getItem(storageKey) || "[]");
        } catch (_error) {
            return [];
        }
    });

    function getReadNewsStorageKey() {
        const userId = localStorage.getItem("userId") || "guest";
        return `kchbites_read_news:${userId}`;
    }

    function getNewsItemId(newsItem) {
        return String(newsItem?._id || newsItem?.id || "");
    }

    const persistReadNewsIds = (nextReadNewsIds) => {
        const storage = isLoggedIn() ? localStorage : sessionStorage;
        const storageKey = getReadNewsStorageKey();
        storage.setItem(storageKey, JSON.stringify(nextReadNewsIds));
        setReadNewsIds(nextReadNewsIds);
    };

    useEffect(() => {
        fetchLatestNews();

        if (isLoggedIn()) {
            fetchNotifications();
        }

        const interval = setInterval(() => {
            fetchLatestNews();
            if (isLoggedIn()) {
                fetchNotifications();
            }
        }, 30000);

        return () => clearInterval(interval);
    }, []);

    const fetchNotifications = async () => {
        if (!isLoggedIn()) {
            setNotifications([]);
            return;
        }

        try {
            const result = await getAllNotifications(1, 100);
            if (result.success) {
                setNotifications(Array.isArray(result.notifications) ? result.notifications : []);
            }
        } catch (error) {
            console.error("Error fetching notifications:", error);
            setNotifications([]);
        }
    };

    const fetchLatestNews = async () => {
        try {
            const response = await fetch(`${API_BASE_URL.replace(/\/$/, "")}/news`);
            if (!response.ok) {
                return;
            }

            const data = await response.json();
            const items = Array.isArray(data?.news) ? data.news : [];
            setLatestNews(items.slice(0, 5));
        } catch (error) {
            console.error("Error fetching latest news:", error);
        }
    };

    const handleBellClick = async () => {
        if (notificationMode === 'navigate') {
            navigate(bellTo);
            return;
        }

        setShowNotifications(!showNotifications);
        if (!showNotifications) {
            await fetchNotifications();
            await fetchLatestNews();
        }
    };

    const newsUnreadCount = useMemo(() => {
        return latestNews.filter((newsItem) => !readNewsIds.includes(getNewsItemId(newsItem))).length;
    }, [latestNews, readNewsIds]);

    const totalUnreadCount = notificationMode === 'navigate'
        ? 0
        : newsUnreadCount + notifications.filter((notification) => !notification.isRead).length;

    const drawerItems = useMemo(() => {
        const newsItems = latestNews.map((newsItem) => {
            const newsId = getNewsItemId(newsItem);
            return {
                key: `news-${newsId}`,
                type: 'news',
                title: newsItem.title || 'News update',
                message: newsItem.summary || newsItem.description || 'New news has been posted by the admin.',
                createdAt: newsItem.publishedAt || newsItem.createdAt || newsItem.date || new Date().toISOString(),
                isRead: readNewsIds.includes(newsId),
                raw: newsItem,
            };
        });

        const notificationItems = notifications.map((notification) => ({
            key: `noti-${notification._id}`,
            type: notification.type || 'notification',
            title: notification.title || 'Notification',
            message: notification.message || '',
            createdAt: notification.createdAt,
            isRead: Boolean(notification.isRead),
            raw: notification,
        }));

        return [...newsItems, ...notificationItems].sort(
            (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
        );
    }, [latestNews, notifications, readNewsIds]);

    const markNewsAsRead = (newsItem) => {
        const newsId = getNewsItemId(newsItem);
        if (!newsId) {
            return;
        }

        setReadNewsIds((currentReadNewsIds) => {
            if (currentReadNewsIds.includes(newsId)) {
                return currentReadNewsIds;
            }

            const nextReadNewsIds = [...currentReadNewsIds, newsId];
            localStorage.setItem(getReadNewsStorageKey(), JSON.stringify(nextReadNewsIds));
            return nextReadNewsIds;
        });
    };

    const handleNotificationClick = async (notification) => {
        if (notification.type === 'news') {
            markNewsAsRead(notification.raw);
        } else if (!notification.isRead) {
            try {
                await markNotificationAsRead(notification.raw._id);
                setNotifications((prev) =>
                    prev.map((n) =>
                        n._id === notification.raw._id
                            ? { ...n, isRead: true }
                            : n
                    )
                );
            } catch (error) {
                console.error("Error marking notification as read:", error);
            }
        }

        // Navigate based on notification type
        setShowNotifications(false);
        if (notification.type === "review_like" || notification.type === "review_dislike") {
            const reviewId = notification.raw.relatedId;
            navigate(reviewId ? `/community?reviewId=${reviewId}` : "/community");
        } else if (notification.type === "feedback_reply") {
            navigate("/feedback");
        } else if (notification.type === "news") {
            navigate("/news");
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            setLoading(true);

            persistReadNewsIds(latestNews.map((newsItem) => getNewsItemId(newsItem)).filter(Boolean));

            if (isLoggedIn()) {
                const result = await markAllNotificationsAsRead();
                if (result.success) {
                    setNotifications((prev) => prev.map((notification) => ({ ...notification, isRead: true })));
                }
            } else {
                setNotifications([]);
            }

            await fetchLatestNews();
        } catch (error) {
            console.error("Error marking all as read:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
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
                    <div className="notification-button-wrapper">
                        <button
                            type="button"
                            className="icon-button header-icon-button notification-bell"
                            onClick={handleBellClick}
                            aria-label={notificationMode === 'navigate' ? "Admin news" : "Notifications and news"}
                        >
                            <FaBell className="bell-icon" />
                            {notificationMode !== 'navigate' && totalUnreadCount > 0 && (
                                <span className="notification-badge">{totalUnreadCount}</span>
                            )}
                        </button>
                    </div>
                    <Link to="/main" className="header-logo-badge" aria-label="Go to main page">
                        <img src={logo} alt="KCH Bites logo" className="header-logo header-logo--badge" />
                    </Link>
                </div>
            </header>

            {notificationMode !== 'navigate' && showNotifications && (
                <div className="notification-drawer-overlay" onClick={() => setShowNotifications(false)}>
                    <div className="notification-drawer" onClick={(e) => e.stopPropagation()}>
                        <div className="notification-drawer-header">
                            <h2>Notifications and News</h2>
                            <button
                                type="button"
                                className="btn-close-drawer"
                                onClick={() => setShowNotifications(false)}
                                aria-label="Close notifications"
                            >
                                <FaTimes />
                            </button>
                        </div>

                        {totalUnreadCount > 0 && (
                            <div className="notification-drawer-actions">
                                <button
                                    type="button"
                                    className="btn-mark-all-read"
                                    onClick={handleMarkAllAsRead}
                                    disabled={loading}
                                >
                                    {loading ? "Marking..." : "Mark all as read"}
                                </button>
                            </div>
                        )}

                        <div className="notification-list">
                            {drawerItems.length === 0 ? (
                                <div className="notification-empty">
                                    <p>No notifications yet</p>
                                </div>
                            ) : (
                                drawerItems.map((item) => (
                                    <div
                                        key={item.key}
                                        className={`notification-item ${!item.isRead ? "unread" : ""}`}
                                        onClick={() => handleNotificationClick(item)}
                                        role="button"
                                        tabIndex={0}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter" || e.key === " ") {
                                                handleNotificationClick(item);
                                            }
                                        }}
                                    >
                                        <div className="notification-content">
                                            <h3 className="notification-title">{item.title}</h3>
                                            <p className="notification-message">{item.message}</p>
                                            <span className="notification-time">
                                                {new Date(item.createdAt).toLocaleString()}
                                            </span>
                                        </div>
                                        {!item.isRead && <div className="notification-unread-indicator" />}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}