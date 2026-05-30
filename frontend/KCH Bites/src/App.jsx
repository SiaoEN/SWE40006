import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
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
      <Route
        path="/login"
        element={
          <ProtectedRoute redirectIfLoggedIn userRedirect="/main" adminRedirect="/admin/main" requireAuth={false}>
            <LoginPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/register"
        element={
          <ProtectedRoute redirectIfLoggedIn userRedirect="/main" adminRedirect="/admin/main" requireAuth={false}>
            <RegisterPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/main"
        element={
          <ProtectedRoute requireAuth={false} blockAdmin>
            <MainPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/news"
        element={
          <ProtectedRoute requireAuth={false} blockAdmin>
            <NewsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/news"
        element={
          <ProtectedRoute requireAdmin>
            <AdminNewsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute blockAdmin>
            <ProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/profile"
        element={
          <ProtectedRoute requireAdmin>
            <AdminProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/community"
        element={
          <ProtectedRoute requireAuth={false} blockAdmin>
            <CommunityPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/community"
        element={
          <ProtectedRoute requireAdmin>
            <CommunityPageAdmin />
          </ProtectedRoute>
        }
      />
      <Route
        path="/feedback"
        element={
          <ProtectedRoute requireAuth={false} blockAdmin>
            <FeedbackPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/feedback"
        element={
          <ProtectedRoute requireAdmin>
            <FeedbackPageAdmin />
          </ProtectedRoute>
        }
      />
       <Route
        path="/restaurant/:restaurantId"
        element={
          <ProtectedRoute requireAuth={false}>
            <RestaurantPage />
          </ProtectedRoute>
      }
      />
      <Route
        path="/admin/restaurant"
        element={
          <ProtectedRoute requireAdmin>
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