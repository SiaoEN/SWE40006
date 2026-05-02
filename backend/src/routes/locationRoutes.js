const express = require("express");
const {
  saveUserLocation,
  getKuchingLocation,
} = require("../controllers/locationController");

const router = express.Router();

/**
 * Save/validate user location
 * Body: { userId, latitude, longitude }
 */
router.post("/save", saveUserLocation);

/**
 * Get Kuching city center location (default location)
 */
router.get("/kuching", getKuchingLocation);

module.exports = router;
