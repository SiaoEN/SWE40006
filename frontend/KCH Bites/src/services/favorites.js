import { getUser } from "./auth";

function getCurrentFavoriteOwnerId() {
  const storedUser = getUser();
  return String(storedUser?._id || localStorage.getItem("userId") || "").trim();
}

export function getFavoriteRestaurantsStorageKey() {
  const userId = getCurrentFavoriteOwnerId();
  return userId ? `favoriteRestaurants:${userId}` : "favoriteRestaurants:guest";
}

export function getFavoriteRestaurantIds() {
  try {
    const parsed = JSON.parse(localStorage.getItem(getFavoriteRestaurantsStorageKey()) || "[]");
    return Array.isArray(parsed) ? parsed.map((id) => String(id)) : [];
  } catch {
    return [];
  }
}

export function setFavoriteRestaurantIds(favoriteIds) {
  const normalizedIds = Array.from(new Set((favoriteIds || []).map((id) => String(id))));
  localStorage.setItem(getFavoriteRestaurantsStorageKey(), JSON.stringify(normalizedIds));

  try {
    window.dispatchEvent(new CustomEvent("favoritesUpdated", { detail: normalizedIds }));
  } catch {
    // ignore in non-browser environments
  }

  return normalizedIds;
}
