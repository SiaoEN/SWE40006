/**
 * Geolocation utility service for getting user's current location
 */

/**
 * Get user's current location using browser Geolocation API
 * @returns {Promise<{latitude: number, longitude: number}>}
 */
export const getUserLocation = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        resolve({ latitude, longitude });
      },
      (error) => {
        let errorMessage = 'Unable to get your location';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location permission denied. Please enable location access in your browser settings.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information is unavailable.';
            break;
          case error.TIMEOUT:
            errorMessage = 'The request to get user location timed out.';
            break;
          default:
            errorMessage = 'An error occurred while retrieving your location.';
        }
        
        reject(new Error(errorMessage));
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
      }
    );
  });
};

/**
 * Watch user's location continuously
 * @param {Function} onSuccess - Callback when location is updated
 * @param {Function} onError - Callback on error
 * @returns {number} Watch ID to stop watching
 */
export const watchUserLocation = (onSuccess, onError) => {
  if (!navigator.geolocation) {
    onError(new Error('Geolocation is not supported by your browser'));
    return null;
  }

  return navigator.geolocation.watchPosition(
    (position) => {
      const { latitude, longitude } = position.coords;
      onSuccess({ latitude, longitude });
    },
    (error) => {
      let errorMessage = 'Unable to watch location';
      
      switch (error.code) {
        case error.PERMISSION_DENIED:
          errorMessage = 'Location permission denied.';
          break;
        case error.POSITION_UNAVAILABLE:
          errorMessage = 'Location information is unavailable.';
          break;
        case error.TIMEOUT:
          errorMessage = 'The request to get user location timed out.';
          break;
        default:
          errorMessage = 'An error occurred while watching your location.';
      }
      
      onError(new Error(errorMessage));
    },
    {
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 0,
    }
  );
};

/**
 * Stop watching user's location
 * @param {number} watchId - Watch ID returned from watchUserLocation
 */
export const stopWatchingLocation = (watchId) => {
  if (watchId !== null && watchId !== undefined) {
    navigator.geolocation.clearWatch(watchId);
  }
};
