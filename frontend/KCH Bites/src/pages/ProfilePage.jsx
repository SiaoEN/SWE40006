import '../styles/ProfilePage.css';
import { useState, useEffect } from 'react';
import { clearAuthToken, getUser, setUser, updateUserProfile } from '../services/auth';
import { getFavoriteRestaurantIds } from '../services/favorites';
import api from '../services/api';
import Header from "../components/Header";
import Sidebar from '../components/Sidebar';
import Footer from "../components/Footer";

export default function ProfilePage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('reviews');
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');
  const [passwordErrors, setPasswordErrors] = useState({
    oldPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState('');
  const [userReviews, setUserReviews] = useState([]);
  const [favoritesLoading, setFavoritesLoading] = useState(false);
  const [favoritesError, setFavoritesError] = useState('');
  const [favoriteRestaurants, setFavoriteRestaurants] = useState([]);

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
    oldPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  });

  const buildPasswordErrors = (data) => {
    const nextErrors = {
      oldPassword: '',
      newPassword: '',
      confirmNewPassword: '',
    };

    const hasAnyPasswordInput =
      Boolean(data.oldPassword) || Boolean(data.newPassword) || Boolean(data.confirmNewPassword);

    if (!hasAnyPasswordInput) return nextErrors;

    if (!data.oldPassword) {
      nextErrors.oldPassword = 'Old password is required';
    }
    if (!data.newPassword) {
      nextErrors.newPassword = 'New password is required';
    }
    if (!data.confirmNewPassword) {
      nextErrors.confirmNewPassword = 'Please confirm your new password';
    }

    if (data.newPassword && data.confirmNewPassword && data.newPassword !== data.confirmNewPassword) {
      const mismatchMessage = 'New password and confirmation password does not match';
      nextErrors.newPassword = mismatchMessage;
      nextErrors.confirmNewPassword = mismatchMessage;
    }

    return nextErrors;
  };

  const getReviewKey = (review) => {
    const rawId = review?.id || review?._id || (review?._id && (review._id.$oid || String(review._id)));
    return rawId ? String(rawId) : '';
  };

  const getRestaurantKey = (restaurant) => {
    const rawId = restaurant?.id || restaurant?._id || (restaurant?._id && (restaurant._id.$oid || String(restaurant._id)));
    return rawId ? String(rawId) : '';
  };

  const formatReviewDate = (dateString) => {
    if (!dateString) return '';

    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '';

    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const fetchUserReviews = async (profileUser = null) => {
    const storedProfile = profileUser || getUser();
    const normalizedUserId = String(storedProfile?._id || localStorage.getItem('userId') || '').trim();
    const normalizedUsername = String(storedProfile?.username || localStorage.getItem('username') || '').trim().toLowerCase();

    if (!normalizedUserId && !normalizedUsername) {
      setUserReviews([]);
      return;
    }

    try {
      setReviewsLoading(true);
      setReviewsError('');

      const response = await api.get('/reviews');
      if (!response.data?.success) {
        setReviewsError('Failed to load your reviews');
        setUserReviews([]);
        return;
      }

      const allReviews = Array.isArray(response.data.reviews) ? response.data.reviews : [];
      const filtered = allReviews
        .filter((review) => {
          const reviewUserId = String(review?.userId || '').trim();
          const reviewUsername = String(review?.username || '').trim().toLowerCase();

          const userIdMatch = normalizedUserId && reviewUserId && reviewUserId === normalizedUserId;
          const usernameMatch = normalizedUsername && reviewUsername && reviewUsername === normalizedUsername;

          return userIdMatch || usernameMatch;
        })
        .map((review) => ({
          ...review,
          id: getReviewKey(review),
          rating: Number(review?.rating) || 0,
        }))
        .sort((a, b) => {
          const left = new Date(b.createdAt || 0).getTime();
          const right = new Date(a.createdAt || 0).getTime();
          return left - right;
        });

      setUserReviews(filtered);
    } catch (err) {
      console.error('Error fetching profile reviews:', err);
      setReviewsError('Unable to load your posted reviews right now');
      setUserReviews([]);
    } finally {
      setReviewsLoading(false);
    }
  };

  const fetchFavoriteRestaurants = async () => {
    let favoriteIds = [];
    favoriteIds = getFavoriteRestaurantIds();

    if (favoriteIds.length === 0) {
      setFavoriteRestaurants([]);
      setFavoritesError('');
      setFavoritesLoading(false);
      return;
    }

    try {
      setFavoritesLoading(true);
      setFavoritesError('');

      const response = await api.get('/restaurants');
      if (!response.data?.success) {
        setFavoritesError('Failed to load favorite restaurants');
        setFavoriteRestaurants([]);
        return;
      }

      const restaurants = Array.isArray(response.data.restaurants) ? response.data.restaurants : [];
      const restaurantById = new Map(
        restaurants.map((restaurant) => [getRestaurantKey(restaurant), restaurant])
      );

      const orderedFavorites = favoriteIds
        .map((id) => restaurantById.get(id))
        .filter(Boolean);

      setFavoriteRestaurants(orderedFavorites);
    } catch (err) {
      console.error('Error fetching favorite restaurants:', err);
      setFavoritesError('Unable to load your favorite restaurants right now');
      setFavoriteRestaurants([]);
    } finally {
      setFavoritesLoading(false);
    }
  };

  // Load user data from localStorage on mount and subscribe to updates
  useEffect(() => {
    const loadUserData = () => {
      const storedUser = getUser();
      if (storedUser) {
        setUserState(prevUser => ({
          ...prevUser,
          username: storedUser.username || prevUser.username,
          email: storedUser.email || prevUser.email,
          avatar: storedUser.avatar || prevUser.avatar,
          bio: storedUser.bio || prevUser.bio,
        }));
        setFormData(prevForm => ({
          ...prevForm,
          username: storedUser.username || prevForm.username,
          email: storedUser.email || prevForm.email,
          avatar: storedUser.avatar || prevForm.avatar,
          bio: storedUser.bio || prevForm.bio,
          oldPassword: '',
          newPassword: '',
          confirmNewPassword: '',
        }));

        fetchUserReviews(storedUser);
        fetchFavoriteRestaurants();
      } else {
        setUserReviews([]);
        fetchFavoriteRestaurants();
      }
    };
    
    loadUserData();
    
    // Listen for profile updates
    const handler = () => {
      loadUserData();
    };

    const favoritesStorageHandler = (event) => {
      if (!event.key || event.key.startsWith('favoriteRestaurants')) {
        fetchFavoriteRestaurants();
      }
    };

    window.addEventListener('userUpdated', handler);
    window.addEventListener('favoritesUpdated', favoritesStorageHandler);
    window.addEventListener('storage', favoritesStorageHandler);
    return () => {
      window.removeEventListener('userUpdated', handler);
      window.removeEventListener('favoritesUpdated', favoritesStorageHandler);
      window.removeEventListener('storage', favoritesStorageHandler);
    };
  }, []);

  const openEditProfile = () => {
    setError('');
    setSaveSuccess('');
    setPasswordErrors({
      oldPassword: '',
      newPassword: '',
      confirmNewPassword: '',
    });
    setFormData({
      username: user.username,
      email: user.email,
      bio: user.bio,
      avatar: user.avatar,
      oldPassword: '',
      newPassword: '',
      confirmNewPassword: '',
    });
    setIsEditing(true);
  };

  const averageRating = userReviews.length
    ? (userReviews.reduce((total, review) => total + review.rating, 0) / userReviews.length).toFixed(1)
    : '0.0';

  const handleChange = (e) => {
    setError('');
    const { name, value } = e.target;

    setFormData((currentForm) => {
      const nextForm = {
        ...currentForm,
        [name]: value,
      };

      if (name === 'oldPassword' || name === 'newPassword' || name === 'confirmNewPassword') {
        setPasswordErrors(buildPasswordErrors(nextForm));
      }

      return nextForm;
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
    setPasswordErrors({
      oldPassword: '',
      newPassword: '',
      confirmNewPassword: '',
    });

    if (!formData.username || !formData.email) {
      setError('Username and email are required');
      return;
    }

    const nextPasswordErrors = buildPasswordErrors(formData);
    if (nextPasswordErrors.oldPassword || nextPasswordErrors.newPassword || nextPasswordErrors.confirmNewPassword) {
      setPasswordErrors(nextPasswordErrors);
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
        oldPassword: formData.oldPassword,
        newPassword: formData.newPassword,
        confirmNewPassword: formData.confirmNewPassword,
      });

      if (response.success && response.user) {
        // Update localStorage with new user data
        console.log('Profile update response:', response.user);
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
          oldPassword: '',
          newPassword: '',
          confirmNewPassword: '',
        });

        // Show confirmation immediately (inside modal or page)
        setSaveSuccess('Changes saved!');
        setTimeout(() => setSaveSuccess(''), 2500);
        setIsEditing(false);
        fetchUserReviews(response.user);
      } else {
        setError(response.message || 'Failed to update profile');
      }
    } catch (err) {
      const message = err.message || 'Error updating profile';
      const lowerMessage = String(message).toLowerCase();

      if (lowerMessage.includes('old password')) {
        setPasswordErrors((currentErrors) => ({
          ...currentErrors,
          oldPassword: message,
        }));
        setError(message);
        return;
      }

      if (lowerMessage.includes('confirmation password') || lowerMessage.includes('password does not match')) {
        setPasswordErrors((currentErrors) => ({
          ...currentErrors,
          newPassword: message,
          confirmNewPassword: message,
        }));
        setError(message);
        return;
      }

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    clearAuthToken();
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
      {saveSuccess && <div className="alert alert-success">{saveSuccess}</div>}
      <div className="profile-header">
        <img src={user.avatar} alt="avatar" className="avatar" />
        <h2 className="username">{user.username}</h2>
        <p className="bio">{user.bio}</p>

        <button className="edit-btn" onClick={openEditProfile}>
          Edit Profile
        </button>

        <div className="profile-stats">
          <div>
            <strong>{userReviews.length}</strong>
            <span>Reviews</span>
          </div>
          <div>
            <strong>{favoriteRestaurants.length}</strong>
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
            {reviewsLoading && <p className="card-text">Loading your reviews...</p>}
            {!reviewsLoading && reviewsError && <p className="card-text">{reviewsError}</p>}
            {!reviewsLoading && !reviewsError && userReviews.length === 0 && (
              <p className="card-text">You have not posted any reviews yet.</p>
            )}
            {!reviewsLoading && !reviewsError && userReviews.map((review) => (
              <div className="card" key={review.id || `${review.restaurantId}-${review.createdAt}`}>
                <div className="card-header">
                  <strong>{review.restaurantName || 'Unknown Restaurant'}</strong>
                  <span>{review.rating} ★</span>
                </div>
                <p className="card-text">{review.comment || 'No comment provided.'}</p>
                <span className="card-date">{formatReviewDate(review.createdAt)}</span>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'favorites' && (
          <div className="card-list">
            {favoritesLoading && <p className="card-text">Loading your favorites...</p>}
            {!favoritesLoading && favoritesError && <p className="card-text">{favoritesError}</p>}
            {!favoritesLoading && !favoritesError && favoriteRestaurants.length === 0 && (
              <p className="card-text">You have no favorite restaurants yet.</p>
            )}
            {!favoritesLoading && !favoritesError && favoriteRestaurants.map((restaurant) => (
              <div className="card" key={getRestaurantKey(restaurant) || restaurant.name}>
                <strong>{restaurant.name || 'Unnamed Restaurant'}</strong>
                <p className="card-text">
                  {Array.isArray(restaurant.tags) && restaurant.tags.length > 0
                    ? restaurant.tags.join(' / ')
                    : restaurant.address || 'No additional info available.'}
                </p>
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
            {saveSuccess && <div className="alert alert-success">{saveSuccess}</div>}

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

            <label>Old Password</label>
            <input
              type="password"
              name="oldPassword"
              value={formData.oldPassword}
              onChange={handleChange}
              disabled={loading}
            />
            {passwordErrors.oldPassword && (
              <div className="error-message" style={{ color: 'red', marginBottom: '10px' }}>
                {passwordErrors.oldPassword}
              </div>
            )}

            <label>New Password</label>
            <input
              type="password"
              name="newPassword"
              value={formData.newPassword}
              onChange={handleChange}
              disabled={loading}
            />
            {passwordErrors.newPassword && (
              <div className="error-message" style={{ color: 'red', marginBottom: '10px' }}>
                {passwordErrors.newPassword}
              </div>
            )}

            <label>Confirm New Password</label>
            <input
              type="password"
              name="confirmNewPassword"
              value={formData.confirmNewPassword}
              onChange={handleChange}
              disabled={loading}
            />
            {passwordErrors.confirmNewPassword && (
              <div className="error-message" style={{ color: 'red', marginBottom: '10px' }}>
                {passwordErrors.confirmNewPassword}
              </div>
            )}

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
