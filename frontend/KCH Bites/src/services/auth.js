import { requestJson } from "./api";

function decodeTokenPayload(token) {
  if (!token) return null;

  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return null;
  }
}

export function getAuthToken() {
  return localStorage.getItem("token");
}

export function setAuthToken(token) {
  localStorage.setItem("token", token);

  const payload = decodeTokenPayload(token);
  if (payload?.role) {
    localStorage.setItem("role", payload.role);
  }
  if (payload?.userId) {
    localStorage.setItem("userId", payload.userId);
  }
  if (payload?.username) {
    localStorage.setItem("username", payload.username);
  }
}

export function setUser(user) {
  if (user) {
    localStorage.setItem("user", JSON.stringify(user));
    // Keep commonly-used simple keys in sync so other pages (e.g. Feedback) can read them
    try {
      if (user.username) localStorage.setItem("username", user.username);
      if (user._id) localStorage.setItem("userId", user._id);
      if (user.role) localStorage.setItem("role", user.role);
      if (user.email) localStorage.setItem("userEmail", user.email);
      if (user.avatar) {
        localStorage.setItem("avatar", user.avatar);
      } else {
        localStorage.removeItem("avatar");
      }
    } catch (e) {
      // ignore
    }
    try {
      window.dispatchEvent(new CustomEvent('userUpdated', { detail: user }));
    } catch (e) {
      // ignore in non-browser environments
    }
  }
}

export function getUser() {
  const userStr = localStorage.getItem("user");
  if (userStr) {
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  }
  return null;
}

export function clearAuthToken() {
  localStorage.removeItem("token");
  localStorage.removeItem("role");
  localStorage.removeItem("userId");
  localStorage.removeItem("username");
  localStorage.removeItem("userFullName");
  localStorage.removeItem("avatar");
  localStorage.removeItem("user");
  try {
    window.dispatchEvent(new CustomEvent('userUpdated', { detail: null }));
  } catch (e) {
    // ignore
  }
}

export function isLoggedIn() {
  return Boolean(getAuthToken());
}

export async function registerUser({ username, email, password }) {
  return requestJson("/auth/register", {
    method: "POST",
    body: JSON.stringify({ username, email, password }),
  });
}

export async function loginUser({ username, password }) {
  return requestJson("/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export function getUserRole() {
  const token = getAuthToken();
  if (!token) return null;

  const payload = decodeTokenPayload(token);
  return payload?.role || localStorage.getItem("role") || null;
}

export function isAdmin() {
  return getUserRole() === 'admin';
}

export function isRegisteredUser() {
  return getUserRole() === 'user';
}

export async function updateUserProfile({ username, email, avatar, bio, oldPassword, newPassword, confirmNewPassword }) {
  const token = getAuthToken();
  if (!token) {
    throw new Error("No token found");
  }

  return requestJson("/auth/profile", {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ username, email, avatar, bio, oldPassword, newPassword, confirmNewPassword }),
  });
}

export async function verifyCurrentPassword(oldPassword) {
  const token = getAuthToken();
  if (!token) {
    throw new Error("No token found");
  }

  return requestJson("/auth/verify-password", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ oldPassword }),
  });
}
