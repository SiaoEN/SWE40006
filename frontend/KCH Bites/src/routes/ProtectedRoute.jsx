import { Navigate } from "react-router-dom";
import { isLoggedIn, isAdmin } from "../services/auth";

export default function ProtectedRoute({ children, requireAdmin = false }) {
  if (!isLoggedIn()) return <Navigate to="/login" replace />;
  if (requireAdmin && !isAdmin()) return <Navigate to="/main" replace />;
  return children;
}