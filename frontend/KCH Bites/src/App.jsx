import { Navigate, Route, Routes } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import MainPage from "./pages/MainPage";
import CommunityPage from "./pages/CommunityPage";
import EditProfilePage from "./pages/EditProfilePage";
import FeedbackPage from "./pages/FeedbackPage";
import NewsPage from "./pages/NewsPage";
import AdminNewsPage from "./pages/AdminNewsPage";
import ProfilePage from "./pages/ProfilePage";
import AdminProfilePage from "./pages/AdminProfilePage";
import ProtectedRoute from "./routes/ProtectedRoute";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route
        path="/main"
        element={
            <MainPage />
        }
      />
      <Route
        path="/news"
        element={
            <NewsPage />
        }
      />
      <Route
        path="/admin/news"
        element={
            <AdminNewsPage />
        }
      />
      <Route
        path="/profile"
        element={
            <ProfilePage />
        }
      />
      <Route
        path="/admin/profile"
        element={
            <AdminProfilePage />
        }
      />
      <Route
        path="/community"
        element={
          <ProtectedRoute>
            <CommunityPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/edit-profile"
        element={
          <ProtectedRoute>
            <EditProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/feedback"
        element={
          <ProtectedRoute>
            <FeedbackPage />
          </ProtectedRoute>
        }
      />

    </Routes>
  );
}