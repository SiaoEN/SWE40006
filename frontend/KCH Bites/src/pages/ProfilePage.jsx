import '../styles/ProfilePage.css';
import { useState, useEffect } from 'react';
import { getUser, setUser, updateUserProfile } from '../services/auth';
import Header from "../components/Header";
import Sidebar from '../components/Sidebar';
import Footer from "../components/Footer";

export default function ProfilePage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('reviews');
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [user, setUserState] = useState({
    username: "User",
    email: "",
    bio: "Food explorer around Kuching. Always hunting for the next best meal.",
    avatar: "https://i.ytimg.com/vi/8BYa0U1h5Fs/sddefault.jpg",
    stats: {
      reviews: 1,
      favorites: 5,
      ratings: 4.6,
    },
  });

  const [formData, setFormData] = useState({
    username: user.username,
    email: user.email,
    bio: user.bio,
    avatar: user.avatar,
  });

  // Load user data from localStorage on mount
  useEffect(() => {
    const storedUser = getUser();
    if (storedUser) {
      setUserState(prevUser => ({
        ...prevUser,
        username: storedUser.username || prevUser.username,
        email: storedUser.email || prevUser.email,
      }));
      setFormData(prevForm => ({
        ...prevForm,
        username: storedUser.username || prevForm.username,
        email: storedUser.email || prevForm.email,
      }));
    }
  }, []);

  const openEditProfile = () => {
    setError('');
    setFormData({
      username: user.username,
      email: user.email,
      bio: user.bio,
      avatar: user.avatar,
    });
    setIsEditing(true);
  };

  const reviews = [
    {
      id: 1,
      restaurant: "Harbourview Grill",
      rating: 5,
      comment: "Amazing lamb and great atmosphere.",
      date: "20 May 2026",
    },
  ];

  const averageRating = reviews.length
    ? (reviews.reduce((total, review) => total + review.rating, 0) / reviews.length).toFixed(1)
    : '0.0';

  const favorites = [
    {
      id: 1,
      name: "Sibu Spice House",
      cuisine: "Bornean / Chinese",
    },
  ];

  const handleChange = (e) => {
    setError('');
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({
          ...formData,
          avatar: reader.result, // Store as data URL
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!formData.username || !formData.email) {
      setError('Username and email are required');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const response = await updateUserProfile({
        username: formData.username,
        email: formData.email,
        avatar: formData.avatar,
        bio: formData.bio,
      });

      if (response.success && response.user) {
        // Update localStorage with new user data
        setUser(response.user);

        // Update component state with returned fields
        setUserState(prevUser => ({
          ...prevUser,
          username: response.user.username,
          email: response.user.email,
          avatar: response.user.avatar || prevUser.avatar,
          bio: response.user.bio || prevUser.bio,
        }));

        setFormData({
          username: response.user.username,
          email: response.user.email,
          bio: response.user.bio || formData.bio,
          avatar: response.user.avatar || formData.avatar,
        });

        setIsEditing(false);
      } else {
        setError(response.message || 'Failed to update profile');
      }
    } catch (err) {
      setError(err.message || 'Error updating profile');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  const menuItems = [
    { label: 'Profile', to: '/profile' },
    { label: 'Feedback', to: '/feedback' },
    { label: 'Community', to: '/community' },
    { label: 'Log In / Register', to: '/login' },
  ];

  return (
    <main className="profile-page">
      {/* HEADER */}
      <Header
        title="Profile"
        subtitle="View and edit your profile information, reviews, and favorites."
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
      />

      <Sidebar
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        handleLogout={handleLogout}
        menuItems={menuItems}
      />
      <div className="profile-header">
        <img src={user.avatar} alt="avatar" className="avatar" />
        <h2 className="username">{user.username}</h2>
        <p className="bio">{user.bio}</p>

        <button className="edit-btn" onClick={openEditProfile}>
          Edit Profile
        </button>

        <div className="profile-stats">
          <div>
            <strong>{user.stats.reviews}</strong>
            <span>Reviews</span>
          </div>
          <div>
            <strong>{user.stats.favorites}</strong>
            <span>Favorites</span>
          </div>
          <div>
            <strong>{averageRating} ★</strong>
            <span>Avg Rating</span>
          </div>
        </div>
      </div>

      {/* TABS */}
      <div className="profile-tabs">
        <button
          className={activeTab === 'reviews' ? 'active' : ''}
          onClick={() => setActiveTab('reviews')}
        >
          Reviews
        </button>
        <button
          className={activeTab === 'favorites' ? 'active' : ''}
          onClick={() => setActiveTab('favorites')}
        >
          Favorites
        </button>
      </div>

      {/* CONTENT */}
      <div className="profile-content">
        {activeTab === 'reviews' && (
          <div className="card-list">
            {reviews.map((r) => (
              <div className="card" key={r.id}>
                <div className="card-header">
                  <strong>{r.restaurant}</strong>
                  <span>{r.rating} ★</span>
                </div>
                <p className="card-text">{r.comment}</p>
                <span className="card-date">{r.date}</span>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'favorites' && (
          <div className="card-list">
            {favorites.map((f) => (
              <div className="card" key={f.id}>
                <strong>{f.name}</strong>
                <p className="card-text">{f.cuisine}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* EDIT MODAL */}
      {isEditing && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Edit Profile</h3>

            {error && <div className="error-message" style={{ color: 'red', marginBottom: '10px' }}>{error}</div>}

            <label>Username</label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              disabled={loading}
            />

            <label>Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              disabled={loading}
            />

            <label>Bio</label>
            <textarea
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              disabled={loading}
            />

            <label>Profile Image</label>
            <div className="image-input-row">
              <input
                type="text"
                name="avatar"
                placeholder="Enter image URL"
                value={formData.avatar}
                onChange={handleChange}
                className="url-input"
                disabled={loading}
              />
              <label className="file-upload-label-small">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="file-input"
                  disabled={loading}
                />
                <span>Choose Image</span>
              </label>
            </div>

            <div className="modal-actions">
              <button
                onClick={() => {
                  setError('');
                  setIsEditing(false);
                }}
                disabled={loading}
              >
                Cancel
              </button>
              <button 
                className="save-btn" 
                onClick={handleSave}
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
      <Footer />
    </main>
  );
}