const { getDb } = require("../../config/db");

/**
 * Store or validate user location
 */
exports.saveUserLocation = async (req, res) => {
  try {
    const { userId, latitude, longitude } = req.body;

    if (!userId || latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        success: false,
        message: "userId, latitude, and longitude are required",
      });
    }

    const userLat = parseFloat(latitude);
    const userLon = parseFloat(longitude);

    if (isNaN(userLat) || isNaN(userLon)) {
      return res.status(400).json({
        success: false,
        message: "Invalid coordinates",
      });
    }

    // Validate coordinates are valid lat/lon
    if (userLat < -90 || userLat > 90 || userLon < -180 || userLon > 180) {
      return res.status(400).json({
        success: false,
        message: "Coordinates out of valid range",
      });
    }

    res.status(200).json({
      success: true,
      message: "Location received successfully",
      location: {
        userId,
        latitude: userLat,
        longitude: userLon,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error saving user location",
      error: error.message,
    });
  }
};

/**
 * Get Kuching city center location (default)
 */
exports.getKuchingLocation = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      location: {
        name: "Kuching, Sarawak",
        latitude: 1.5533,
        longitude: 110.3592,
        description: "Kuching City Center",
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching Kuching location",
      error: error.message,
    });
  }
};

