import '../styles/ProfilePage.css';
import { useState } from 'react';
import Header from "../components/Header";
import Sidebar from '../components/Sidebar';
import Footer from "../components/Footer";

export default function AdminProfilePage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [admin, setAdmin] = useState({
    username: 'Admin User',
    avatar: 'https://i.ytimg.com/vi/8BYa0U1h5Fs/sddefault.jpg',
  });
  const [formData, setFormData] = useState({
    username: admin.username,
    avatar: admin.avatar,
  });

  const openEditProfile = () => {
    setFormData({
      username: admin.username,
      avatar: admin.avatar,
    });
    setIsEditing(true);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  };

  const handleSave = () => {
    setAdmin((currentAdmin) => ({
      ...currentAdmin,
      username: formData.username.trim() || currentAdmin.username,
      avatar: formData.avatar.trim() || currentAdmin.avatar,
    }));
    setIsEditing(false);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  const menuItems = [
    { label: 'Profile', to: '/profile' }
  ];

  return (
    <main className="profile-page admin-profile-page">
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
      <div className="admin-profile-header">
        <img src={admin.avatar} alt="admin avatar" className="avatar" />
        <h2 className="username">{admin.username}</h2>

        <button className="edit-btn" onClick={openEditProfile}>
          Edit Profile
        </button>
      </div>

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

            <label>Profile Image URL</label>
            <input type="text" name="avatar" value={formData.avatar} onChange={handleChange} />

            <div className="modal-actions">
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                }}
              >
                Cancel
              </button>
              <button className="save-btn" type="button" onClick={handleSave}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}
      <Footer />
    </main>
  );
}