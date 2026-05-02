import '../styles/ProfilePage.css';
import { useState } from 'react';

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState('reviews');
  const [isEditing, setIsEditing] = useState(false);
  const [passwordError, setPasswordError] = useState({ field: '', message: '' });

  const [user, setUser] = useState({
    username: "Alex Tan",
    email: "alex@email.com",
    bio: "Food explorer around Kuching. Always hunting for the next best meal.",
    avatar: "https://i.ytimg.com/vi/8BYa0U1h5Fs/sddefault.jpg",
    password: "password123",
    stats: {
      reviews: 12,
      favorites: 8,
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

  const openEditProfile = () => {
    setPasswordError({ field: '', message: '' });
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
    if (passwordError.message) {
      setPasswordError({ field: '', message: '' });
    }

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

  const handleSave = () => {
    const passwordChangeRequested =
      formData.oldPassword || formData.newPassword || formData.confirmNewPassword;

    if (passwordChangeRequested) {
      if (!formData.oldPassword) {
        setPasswordError({
          field: 'oldPassword',
          message: 'Enter your old password to change it.',
        });
        return;
      }

      if (formData.oldPassword !== user.password) {
        setPasswordError({ field: 'oldPassword', message: 'Old password is incorrect.' });
        return;
      }

      if (!formData.newPassword || !formData.confirmNewPassword) {
        setPasswordError({
          field: !formData.newPassword ? 'newPassword' : 'confirmNewPassword',
          message: 'Enter and confirm your new password.',
        });
        return;
      }

      if (formData.newPassword !== formData.confirmNewPassword) {
        setPasswordError({
          field: 'confirmNewPassword',
          message: 'New password and confirmation do not match.',
        });
        return;
      }
    }

    const { newPassword, confirmNewPassword, oldPassword, ...updatedUser } = formData;

    setUser((currentUser) => ({
      ...currentUser,
      ...updatedUser,
      password: passwordChangeRequested ? newPassword : currentUser.password,
    }));

    setFormData({
      ...updatedUser,
      oldPassword: '',
      newPassword: '',
      confirmNewPassword: '',
    });
    setPasswordError({ field: '', message: '' });
    setIsEditing(false);
  };

  return (
    <main className="profile-page">
      {/* HEADER */}
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

            <label>Username</label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
            />

            <label>Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
            />

            <label>Old Password</label>
            <div className="password-section">
              <div className="password-row">
                <input
                  type="password"
                  name="oldPassword"
                  value={formData.oldPassword}
                  onChange={handleChange}
                />
                {passwordError.field === 'oldPassword' && (
                  <span className="error-message">{passwordError.message}</span>
                )}
              </div>

              <label>New Password</label>
              <div className="password-row">
                <input
                  type="password"
                  name="newPassword"
                  value={formData.newPassword}
                  onChange={handleChange}
                />
                {passwordError.field === 'newPassword' && (
                  <span className="error-message">{passwordError.message}</span>
                )}
              </div>

              <label>Confirm New Password</label>
              <div className="password-row">
                <input
                  type="password"
                  name="confirmNewPassword"
                  value={formData.confirmNewPassword}
                  onChange={handleChange}
                />
                {passwordError.field === 'confirmNewPassword' && (
                  <span className="error-message">{passwordError.message}</span>
                )}
              </div>
            </div>

            <label>Bio</label>
            <textarea
              name="bio"
              value={formData.bio}
              onChange={handleChange}
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
              />
              <label className="file-upload-label-small">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="file-input"
                />
                <span>Choose Image</span>
              </label>
            </div>

            <div className="modal-actions">
              <button
                onClick={() => {
                  setPasswordError({ field: '', message: '' });
                  setIsEditing(false);
                }}
              >
                Cancel
              </button>
              <button className="save-btn" onClick={handleSave}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}