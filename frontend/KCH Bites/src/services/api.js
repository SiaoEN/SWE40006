import axios from "axios";

export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// Create axios instance with base URL
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach bearer token automatically for routes that require authentication
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export async function requestJson(path, options = {}) {
  const token = localStorage.getItem("token");
  const mergedHeaders = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (token && !mergedHeaders.Authorization) {
    mergedHeaders.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: mergedHeaders,
  });

  const isJson = response.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await response.json() : null;

  if (!response.ok) {
    const errorMessage = data?.message || `Request failed with status ${response.status}`;
    throw new Error(errorMessage);
  }

  return data;
}

/**
 * Save user location to backend
 * @param {string} userId - User ID
 * @param {number} latitude - User's latitude
 * @param {number} longitude - User's longitude
 * @returns {Promise<{success: boolean, location: Object}>}
 */
export async function saveUserLocation(userId, latitude, longitude) {
  const normalizedUserId = String(userId || "").trim();
  if (!normalizedUserId || ["anonymous", "user_temp", "null", "undefined"].includes(normalizedUserId.toLowerCase())) {
    return {
      success: false,
      skipped: true,
      message: "Skipped saving location because no valid userId was provided",
    };
  }

  return requestJson("/location/save", {
    method: "POST",
    body: JSON.stringify({
      userId: normalizedUserId,
      latitude,
      longitude,
    }),
  });
}

/**
 * Get Kuching location (default location)
 * @returns {Promise<{success: boolean, location: Object}>}
 */
export async function getKuchingLocation() {
  return requestJson("/location/kuching");
}
export default api;
