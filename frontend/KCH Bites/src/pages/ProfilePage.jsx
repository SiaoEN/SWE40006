import '../styles/ProfilePage.css';
import { useState, useEffect } from 'react';
import { clearAuthToken, getUser, setUser, updateUserProfile, verifyCurrentPassword } from '../services/auth';
import { fetchFavoriteRestaurantIdsFromServer, getFavoriteRestaurantIds } from '../services/favorites';
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
  const [oldPasswordChecking, setOldPasswordChecking] = useState(false);
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
    avatar: '',
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

  const getPasswordFieldFromMessage = (message) => {
    const normalizedMessage = String(message || '').toLowerCase();

    if (
      normalizedMessage.includes('old password') ||
      normalizedMessage.includes('current password') ||
      normalizedMessage.includes('wrong password') ||
      normalizedMessage.includes('incorrect password') ||
      normalizedMessage.includes('invalid credentials')
    ) {
      return 'oldPassword';
    }

    if (
      normalizedMessage.includes('confirmation password') ||
      normalizedMessage.includes('confirm new password') ||
      normalizedMessage.includes('password does not match')
    ) {
      return 'confirmNewPassword';
    }

    return '';
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
          const usernameFallbackMatch =
            !normalizedUserId &&
            !reviewUserId &&
            normalizedUsername &&
            reviewUsername &&
            reviewUsername === normalizedUsername;

          return userIdMatch || usernameFallbackMatch;
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

  const loadFavoriteRestaurants = async () => {
    setFavoritesLoading(true);
    setFavoritesError('');

    try {
      const favoriteIds = await fetchFavoriteRestaurantIdsFromServer();
      const fallbackFavoriteIds = favoriteIds.length > 0 ? favoriteIds : getFavoriteRestaurantIds();

      if (fallbackFavoriteIds.length === 0) {
        setFavoriteRestaurants([]);
        return;
      }

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

      const orderedFavorites = fallbackFavoriteIds
        .map((id) => restaurantById.get(id))
        .filter(Boolean);

      setFavoriteRestaurants(orderedFavorites);
    } catch (err) {
      console.error('Error loading favorites:', err);
      const favoriteIds = getFavoriteRestaurantIds();

      if (favoriteIds.length === 0) {
        setFavoritesError('Unable to load your favorite restaurants right now');
        setFavoriteRestaurants([]);
        return;
      }

      try {
        const response = await api.get('/restaurants');
        const restaurants = Array.isArray(response.data?.restaurants) ? response.data.restaurants : [];
        const restaurantById = new Map(
          restaurants.map((restaurant) => [getRestaurantKey(restaurant), restaurant])
        );

        const orderedFavorites = favoriteIds
          .map((id) => restaurantById.get(id))
          .filter(Boolean);

        setFavoriteRestaurants(orderedFavorites);
        setFavoritesError('');
      } catch (fallbackErr) {
        console.error('Fallback favorites load failed:', fallbackErr);
        setFavoritesError('Unable to load your favorite restaurants right now');
        setFavoriteRestaurants([]);
      }
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
        loadFavoriteRestaurants();
      } else {
        setUserReviews([]);
        loadFavoriteRestaurants();
      }
    };
    
    loadUserData();
    
    // Listen for profile updates
    const handler = () => {
      loadUserData();
    };

    const favoritesStorageHandler = (event) => {
      if (!event.key || event.key.startsWith('favoriteRestaurants')) {
        loadFavoriteRestaurants();
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
        setPasswordErrors((currentErrors) => ({
          ...currentErrors,
          [name]: '',
        }));
      }

      return nextForm;
    });
  };

  const validateOldPassword = async () => {
    const oldPassword = formData.oldPassword.trim();

    if (!oldPassword) {
      return false;
    }

    try {
      setOldPasswordChecking(true);
      await verifyCurrentPassword(oldPassword);
      setPasswordErrors((currentErrors) => ({
        ...currentErrors,
        oldPassword: '',
      }));
      return true;
    } catch (err) {
      const message = err.message || 'Old password is incorrect';
      setPasswordErrors((currentErrors) => ({
        ...currentErrors,
        oldPassword: message,
      }));
      return false;
    } finally {
      setOldPasswordChecking(false);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Compress large images client-side to avoid oversized JSON payloads
    const compressImage = (fileToCompress, maxWidth = 1024, maxHeight = 1024, quality = 0.8) => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const img = new Image();
          img.onload = () => {
            let { width, height } = img;
            let scale = 1;
            if (width > maxWidth || height > maxHeight) {
              scale = Math.min(maxWidth / width, maxHeight / height);
              width = Math.round(width * scale);
              height = Math.round(height * scale);
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            try {
              const dataUrl = canvas.toDataURL('image/jpeg', quality);
              resolve(dataUrl);
            } catch (err) {
              // Fallback: return original data URL
              resolve(reader.result);
            }
          };
          img.onerror = (err) => reject(err);
          img.src = reader.result;
        };
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(fileToCompress);
      });
    };

    (async () => {
      try {
        const shouldCompress = file.size > 200 * 1024; // compress files larger than 200KB
        if (shouldCompress) {
          const compressed = await compressImage(file, 1024, 1024, 0.8);
          setFormData(prev => ({ ...prev, avatar: compressed }));
        } else {
          // small files: just read as data URL
          const reader = new FileReader();
          reader.onloadend = () => setFormData(prev => ({ ...prev, avatar: reader.result }));
          reader.readAsDataURL(file);
        }
      } catch (err) {
        console.error('Image processing failed', err);
        // fallback to raw data URL
        const fallbackReader = new FileReader();
        fallbackReader.onloadend = () => setFormData(prev => ({ ...prev, avatar: fallbackReader.result }));
        fallbackReader.readAsDataURL(file);
      }
    })();
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

    if (formData.oldPassword) {
      const oldPasswordValid = await validateOldPassword();
      if (!oldPasswordValid) {
        return;
      }
    }

    try {
      setLoading(true);
      setError('');
      let avatarForSave = formData.avatar;

      // Ensure avatar data-URL isn't too large for server JSON limits. Try to recompress if needed.
      const isDataUrl = (val) => typeof val === 'string' && val.startsWith('data:');
      const maxChars = 3_800_000; // ~3.8MB threshold for safety against server 5MB limit
      const recompressDataUrl = (dataUrl, maxWidth = 800, maxHeight = 800, quality = 0.6) => {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => {
            let { width, height } = img;
            let scale = 1;
            if (width > maxWidth || height > maxHeight) {
              scale = Math.min(maxWidth / width, maxHeight / height);
              width = Math.round(width * scale);
              height = Math.round(height * scale);
            }
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            try {
              const newDataUrl = canvas.toDataURL('image/jpeg', quality);
              resolve(newDataUrl);
            } catch (err) {
              reject(err);
            }
          };
          img.onerror = (err) => reject(err);
          img.src = dataUrl;
        });
      };

      if (isDataUrl(avatarForSave) && avatarForSave.length > maxChars) {
        try {
          const compressed = await recompressDataUrl(avatarForSave, 800, 800, 0.55);
          // If still too large try lower quality
          avatarForSave = compressed.length > maxChars
            ? await recompressDataUrl(compressed, 600, 600, 0.45)
            : compressed;
          setFormData((f) => ({ ...f, avatar: avatarForSave }));
        } catch (err) {
          console.warn('Recompression failed', err);
          setError('Selected image is too large. Please choose a smaller image.');
          setLoading(false);
          return;
        }
      }

      const response = await updateUserProfile({
        username: formData.username,
        email: formData.email,
        avatar: avatarForSave,
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
        const message = response.message || 'Failed to update profile';
        const passwordField = getPasswordFieldFromMessage(message);

        if (passwordField) {
          setPasswordErrors((currentErrors) => ({
            ...currentErrors,
            [passwordField]: message,
          }));
        }

        setError(message);
      }
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Error updating profile';
      const lowerMessage = String(message).toLowerCase();
      const passwordField = getPasswordFieldFromMessage(lowerMessage);

      if (passwordField === 'oldPassword') {
        setPasswordErrors((currentErrors) => ({
          ...currentErrors,
          oldPassword: message,
        }));
        setError(message);
        return;
      }

      if (passwordField === 'confirmNewPassword') {
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
        {user.avatar ? (
          <img src={user.avatar} alt="avatar" className="avatar" />
        ) : (
          <div className="avatar-empty" />
        )}
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
              onBlur={validateOldPassword}
              disabled={loading || oldPasswordChecking}
              aria-invalid={Boolean(passwordErrors.oldPassword)}
            />
            {oldPasswordChecking && (
              <div className="validation-message" style={{ marginBottom: '10px' }}>
                Checking old password...
              </div>
            )}
            {passwordErrors.oldPassword && (
              <div className="error-message validation-message" style={{ color: 'red', marginBottom: '10px' }}>
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
              aria-invalid={Boolean(passwordErrors.newPassword)}
            />
            {passwordErrors.newPassword && (
              <div className="error-message validation-message" style={{ color: 'red', marginBottom: '10px' }}>
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
              aria-invalid={Boolean(passwordErrors.confirmNewPassword)}
            />
            {passwordErrors.confirmNewPassword && (
              <div className="error-message validation-message" style={{ color: 'red', marginBottom: '10px' }}>
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
