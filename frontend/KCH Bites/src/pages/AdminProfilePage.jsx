import '../styles/ProfilePage.css';
import { useState, useEffect } from 'react';
import { clearAuthToken, getUser, setUser, updateUserProfile } from '../services/auth';
import Header from "../components/Header";
import Sidebar from '../components/Sidebar';
import Footer from "../components/Footer";

export default function AdminProfilePage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const [admin, setAdminState] = useState({
    username: 'Admin',
    email: '',
    avatar: '',
  });

  const [formData, setFormData] = useState({
    username: admin.username,
    email: admin.email,
    avatar: admin.avatar,
  });

  // Load user data from localStorage on mount and subscribe to updates
  useEffect(() => {
    const loadUserData = () => {
      const storedUser = getUser();
      if (storedUser) {
        setAdminState(prevAdmin => ({
          ...prevAdmin,
          username: storedUser.username || prevAdmin.username,
          email: storedUser.email || prevAdmin.email,
          avatar: storedUser.avatar || prevAdmin.avatar,
        }));
        setFormData(prevForm => ({
          ...prevForm,
          username: storedUser.username || prevForm.username,
          email: storedUser.email || prevForm.email,
          avatar: storedUser.avatar || prevForm.avatar,
        }));
      }
    };
    
    loadUserData();
    
    // Listen for profile updates
    const handler = (e) => {
      loadUserData();
    };
    window.addEventListener('userUpdated', handler);
    return () => window.removeEventListener('userUpdated', handler);
  }, []);

  const openEditProfile = () => {
    setError('');
    setSaveSuccess('');
    setFormData({
      username: admin.username,
      email: admin.email,
      avatar: admin.avatar,
    });
    setIsEditing(true);
  };

  const handleChange = (event) => {
    setError('');
    const { name, value } = event.target;

    setFormData((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
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
      });

      if (response.success && response.user) {
        // Update localStorage with new user data
        setUser(response.user);

        // Update component state
        setAdminState(prevAdmin => ({
          ...prevAdmin,
          username: response.user.username,
          email: response.user.email,
          avatar: response.user.avatar || prevAdmin.avatar,
        }));

        setFormData({
          username: response.user.username,
          email: response.user.email,
          avatar: response.user.avatar || formData.avatar,
        });

        // Show confirmation immediately (inside modal or page)
        setSaveSuccess('Changes saved!');
        setTimeout(() => setSaveSuccess(''), 2500);
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
    clearAuthToken();
    window.location.href = "/login";
  };

  const menuItems = [
    { label: 'Profile', to: '/admin/profile' }
  ];

  return (
    <main className="profile-page admin-profile-page">
      {/* HEADER */}
      <Header
        title="Profile"
        subtitle="View and edit your profile information"
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        bellTo="/admin/news"
        notificationMode="navigate"
      />

      <Sidebar
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        handleLogout={handleLogout}
        menuItems={menuItems}
        profileTo="/admin/profile"
      />
      {saveSuccess && <div className="alert alert-success">{saveSuccess}</div>}
      <div className="admin-profile-header">
        {admin.avatar ? (
          <img src={admin.avatar} alt="admin avatar" className="avatar" />
        ) : (
          <div className="avatar-empty" />
        )}
        <h2 className="username">{admin.username}</h2>

        <button className="edit-btn" onClick={openEditProfile}>
          Edit Profile
        </button>
      </div>

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

            <label>Profile Image URL</label>
            <div className="image-input-row">
              <input 
                type="text" 
                name="avatar" 
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
                type="button"
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
                type="button" 
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
