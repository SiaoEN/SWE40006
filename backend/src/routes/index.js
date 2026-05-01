const express = require("express");

const healthController = require("../controllers/healthController");
const authRoutes = require("./authRoutes");
const newsRoutes = require("./newsRoutes");

const router = express.Router();

router.get("/health", healthController.getHealth);
router.use("/auth", authRoutes);
router.use("/news", newsRoutes);

module.exports = router;
