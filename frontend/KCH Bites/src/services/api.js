export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export async function requestJson(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
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
  return requestJson("/location/save", {
    method: "POST",
    body: JSON.stringify({
      userId,
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

export default {
  requestJson,
  saveUserLocation,
  getKuchingLocation,
};