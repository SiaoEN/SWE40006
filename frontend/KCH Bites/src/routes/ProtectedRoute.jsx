import React from "react";
import { Navigate } from "react-router-dom";
import { isLoggedIn, getUserRole } from "../services/auth";

export default function ProtectedRoute({
  children,
  requireAdmin = false,
  requireAuth = true,
  blockAdmin = false,
  redirectIfLoggedIn = false,
  userRedirect = "/main",
  adminRedirect = "/admin/main",
}) {
  const role = getUserRole();

  if (redirectIfLoggedIn && isLoggedIn()) {
    return <Navigate to={role === "admin" ? adminRedirect : userRedirect} replace />;
  }

  if (requireAuth && !isLoggedIn()) return <Navigate to="/login" replace />;
  if (requireAdmin && role !== 'admin') return <Navigate to="/main" replace />;
  if (blockAdmin && role === 'admin') return <Navigate to={adminRedirect} replace />;
  return children;
}