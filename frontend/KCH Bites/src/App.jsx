import { Navigate, Route, Routes } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import MainPage from "./pages/MainPage";
import AdminMain from "./pages/AdminMain";
import CommunityPage from "./pages/CommunityPage";
import CommunityPageAdmin from "./pages/CommunityPageAdmin";
import FeedbackPage from "./pages/FeedbackPage";
import FeedbackPageAdmin from "./pages/FeedbackPageAdmin";
import NewsPage from "./pages/NewsPage";
import AdminNewsPage from "./pages/AdminNewsPage";
import RestaurantPage from "./pages/RestaurantPage";
import RestaurantPageAdmin from "./pages/RestaurantPageAdmin";
import ProfilePage from "./pages/ProfilePage";
import AdminProfilePage from "./pages/AdminProfilePage";
import ProtectedRoute from "./routes/ProtectedRoute";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/main" replace />} />
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
          <ProtectedRoute>
            <AdminNewsPage />
          </ProtectedRoute>
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
          <ProtectedRoute>
            <AdminProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/community"
        element={
            <CommunityPage />
        }
      />
      <Route
        path="/admin/community"
        element={
          <ProtectedRoute>
            <CommunityPageAdmin />
          </ProtectedRoute>
        }
      />
      <Route
        path="/feedback"
        element={
            <FeedbackPage />
        }
      />
      <Route
        path="/admin/feedback"
        element={
          <ProtectedRoute>
            <FeedbackPageAdmin />
          </ProtectedRoute>
        }
      />
       <Route
        path="/restaurant/:restaurantId"
        element={
        <RestaurantPage />
      }
      />
      <Route
        path="/admin/restaurant"
        element={
          <ProtectedRoute>
            <RestaurantPageAdmin />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/main"
        element={
          <ProtectedRoute requireAdmin>
            <AdminMain />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}