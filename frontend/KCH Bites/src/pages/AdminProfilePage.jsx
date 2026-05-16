import '../styles/ProfilePage.css';
import { useState, useEffect } from 'react';
import { clearAuthToken, getUser, setUser, updateUserProfile, verifyCurrentPassword } from '../services/auth';
import Header from "../components/Header";
import Sidebar from '../components/Sidebar';
import Footer from "../components/Footer";

export default function AdminProfilePage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [oldPasswordChecking, setOldPasswordChecking] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState({
    oldPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  });

  const [admin, setAdminState] = useState({
    username: 'Admin',
    email: '',
    avatar: '',
  });

  const [formData, setFormData] = useState({
    username: admin.username,
    email: admin.email,
    avatar: admin.avatar,
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
          oldPassword: '',
          newPassword: '',
          confirmNewPassword: '',
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
    setPasswordErrors({
      oldPassword: '',
      newPassword: '',
      confirmNewPassword: '',
    });
    setFormData({
      username: admin.username,
      email: admin.email,
      avatar: admin.avatar,
      oldPassword: '',
      newPassword: '',
      confirmNewPassword: '',
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

    if (name === 'oldPassword' || name === 'newPassword' || name === 'confirmNewPassword') {
      setPasswordErrors((currentErrors) => ({
        ...currentErrors,
        [name]: '',
      }));
    }
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

    const compressImage = (fileToCompress, maxWidth = 1024, maxHeight = 1024, quality = 0.8) => {
      return new Promise((resolve, reject) => {
      const reader = new FileReader();
        reader.onload = () => {
          const img = new Image();
          img.onload = () => {
            let { width, height } = img;
            if (width > maxWidth || height > maxHeight) {
              const scale = Math.min(maxWidth / width, maxHeight / height);
              width = Math.round(width * scale);
              height = Math.round(height * scale);
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', quality));
          };
          img.onerror = reject;
          img.src = reader.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(fileToCompress);
      });
    };

    (async () => {
      try {
        if (file.size > 200 * 1024) {
          const compressed = await compressImage(file);
          setFormData((currentForm) => ({ ...currentForm, avatar: compressed }));
          return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
          setFormData((currentForm) => ({
            ...currentForm,
            avatar: reader.result,
          }));
        };
        reader.readAsDataURL(file);
      } catch (err) {
        console.error('Image processing failed', err);
        const fallbackReader = new FileReader();
        fallbackReader.onloadend = () => {
          setFormData((currentForm) => ({
            ...currentForm,
            avatar: fallbackReader.result,
          }));
        };
        fallbackReader.readAsDataURL(file);
      }
    })();
  };

  const recompressDataUrl = (dataUrl, maxWidth = 800, maxHeight = 800, quality = 0.6) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxWidth || height > maxHeight) {
          const scale = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = dataUrl;
    });
  };

  const prepareAvatarForSave = async (avatar) => {
    const isDataUrl = typeof avatar === 'string' && avatar.startsWith('data:');
    const maxChars = 3_800_000;

    if (!isDataUrl || avatar.length <= maxChars) {
      return avatar;
    }

    const compressed = await recompressDataUrl(avatar, 800, 800, 0.55);
    return compressed.length > maxChars
      ? recompressDataUrl(compressed, 600, 600, 0.45)
      : compressed;
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
      const avatarForSave = await prepareAvatarForSave(formData.avatar);
      if (avatarForSave !== formData.avatar) {
        setFormData((currentForm) => ({ ...currentForm, avatar: avatarForSave }));
      }

      const response = await updateUserProfile({
        username: formData.username,
        email: formData.email,
        avatar: avatarForSave,
        oldPassword: formData.oldPassword,
        newPassword: formData.newPassword,
        confirmNewPassword: formData.confirmNewPassword,
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
          oldPassword: '',
          newPassword: '',
          confirmNewPassword: '',
        });

        // Show confirmation immediately (inside modal or page)
        setSaveSuccess('Changes saved!');
        setTimeout(() => setSaveSuccess(''), 2500);
        setIsEditing(false);
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
      const message = err.message || 'Error updating profile';
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
