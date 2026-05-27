import { requestJson } from "./api";
import { getUser } from "./auth";

function getCurrentFavoriteOwnerId() {
  const storedUser = getUser();
  return String(storedUser?._id || localStorage.getItem("userId") || "").trim();
}

export function getFavoriteRestaurantsStorageKey() {
  const userId = getCurrentFavoriteOwnerId();
  return userId ? `favoriteRestaurants:${userId}` : "favoriteRestaurants:guest";
}

export function getFavoriteRestaurantDetailsStorageKey() {
  return `${getFavoriteRestaurantsStorageKey()}:details`;
}

export function getFavoriteRestaurantIds() {
  try {
    const parsed = JSON.parse(localStorage.getItem(getFavoriteRestaurantsStorageKey()) || "[]");
    const localIds = Array.isArray(parsed) ? parsed.map((id) => String(id)).filter(Boolean) : [];

    if (localIds.length > 0) {
      return Array.from(new Set(localIds));
    }

    const storedUserFavorites = Array.isArray(getUser()?.favorites)
      ? getUser().favorites.map((id) => String(id)).filter(Boolean)
      : [];

    if (storedUserFavorites.length > 0) {
      localStorage.setItem(getFavoriteRestaurantsStorageKey(), JSON.stringify(storedUserFavorites));
      return Array.from(new Set(storedUserFavorites));
    }

    return [];
  } catch {
    return [];
  }
}

function syncStoredUserFavorites(favoriteIds) {
  const storedUser = getUser();
  if (!storedUser) {
    return;
  }

  const normalizedFavorites = Array.from(new Set((favoriteIds || []).map((id) => String(id)).filter(Boolean)));

  const existingFavorites = Array.isArray(storedUser.favorites)
    ? Array.from(new Set(storedUser.favorites.map((id) => String(id)).filter(Boolean)))
    : [];

  // If the favorites haven't actually changed, avoid writing and emitting events to prevent
  // unnecessary re-renders or potential event loops (ProfilePage listens for userUpdated).
  const areEqual = normalizedFavorites.length === existingFavorites.length &&
    normalizedFavorites.every((id) => existingFavorites.includes(id));

  if (areEqual) {
    return;
  }

  const nextUser = {
    ...storedUser,
    favorites: normalizedFavorites,
  };

  localStorage.setItem("user", JSON.stringify(nextUser));

  try {
    window.dispatchEvent(new CustomEvent("userUpdated", { detail: nextUser }));
  } catch {
    // ignore in non-browser environments
  }
}

export function setFavoriteRestaurantIds(favoriteIds) {
  const normalizedIds = Array.from(new Set((favoriteIds || []).map((id) => String(id))));
  localStorage.setItem(getFavoriteRestaurantsStorageKey(), JSON.stringify(normalizedIds));
  syncStoredUserFavorites(normalizedIds);

  try {
    window.dispatchEvent(new CustomEvent("favoritesUpdated", { detail: normalizedIds }));
  } catch {
    // ignore in non-browser environments
  }

  return normalizedIds;
}

export async function fetchFavoriteRestaurantIdsFromServer() {
  const localFavorites = getFavoriteRestaurantIds();

  try {
    const response = await requestJson("/auth/favorites", {
      method: "GET",
    });

    const serverFavorites = Array.isArray(response?.favorites)
      ? response.favorites.map((id) => String(id)).filter(Boolean)
      : [];

    const mergedFavorites = Array.from(new Set([...serverFavorites, ...localFavorites]));

    if (mergedFavorites.length > 0 && mergedFavorites.length !== serverFavorites.length) {
      try {
        await requestJson("/auth/favorites", {
          method: "PUT",
          body: JSON.stringify({ favorites: mergedFavorites }),
        });
      } catch {
        // Keep the merged local view even if the backend sync fails here.
      }
    }

    if (mergedFavorites.length > 0) {
      localStorage.setItem(getFavoriteRestaurantsStorageKey(), JSON.stringify(mergedFavorites));
      syncStoredUserFavorites(mergedFavorites);
      return mergedFavorites;
    }
  } catch {
    // Fall back to local cache when offline or unauthenticated.
  }

  return localFavorites;
}

export async function saveFavoriteRestaurantIdsToServer(favoriteIds) {
  const normalizedIds = Array.from(new Set((favoriteIds || []).map((id) => String(id)).filter(Boolean)));

  localStorage.setItem(getFavoriteRestaurantsStorageKey(), JSON.stringify(normalizedIds));
  syncStoredUserFavorites(normalizedIds);

  const response = await requestJson("/auth/favorites", {
    method: "PUT",
    body: JSON.stringify({ favorites: normalizedIds }),
  });

  const serverFavorites = Array.isArray(response?.favorites)
    ? response.favorites.map((id) => String(id)).filter(Boolean)
    : normalizedIds;

  localStorage.setItem(getFavoriteRestaurantsStorageKey(), JSON.stringify(serverFavorites));
  syncStoredUserFavorites(serverFavorites);

  return serverFavorites;
}

function extractFavoriteRestaurantId(restaurant) {
  if (!restaurant || typeof restaurant !== "object") {
    return "";
  }

  const rawId = restaurant.id ?? restaurant._id;
  if (rawId && typeof rawId === "object") {
    if (rawId.$oid) {
      return String(rawId.$oid).trim();
    }

    return String(rawId).trim();
  }

  return String(rawId || "").trim();
}

function normalizeFavoriteRestaurant(restaurant) {
  const id = extractFavoriteRestaurantId(restaurant);
  if (!id) {
    return null;
  }

  return {
    ...restaurant,
    id,
    _id: restaurant._id && typeof restaurant._id === "object" && restaurant._id.$oid
      ? String(restaurant._id.$oid)
      : restaurant._id
        ? String(restaurant._id)
        : restaurant._id,
  };
}

export function getFavoriteRestaurantDetails() {
  try {
    const parsed = JSON.parse(localStorage.getItem(getFavoriteRestaurantDetailsStorageKey()) || "[]");
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.map(normalizeFavoriteRestaurant).filter(Boolean);
  } catch {
    return [];
  }
}

export function setFavoriteRestaurantDetails(restaurants) {
  const normalizedRestaurants = [];
  const seenIds = new Set();

  for (const restaurant of restaurants || []) {
    const normalizedRestaurant = normalizeFavoriteRestaurant(restaurant);
    if (!normalizedRestaurant || seenIds.has(normalizedRestaurant.id)) {
      continue;
    }

    seenIds.add(normalizedRestaurant.id);
    normalizedRestaurants.push(normalizedRestaurant);
  }

  localStorage.setItem(getFavoriteRestaurantDetailsStorageKey(), JSON.stringify(normalizedRestaurants));

  return normalizedRestaurants;
}
