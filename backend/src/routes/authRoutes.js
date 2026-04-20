const express = require("express");

const router = express.Router();

router.post("/register", (_req, res) => {
  res.status(501).json({ message: "Register endpoint not implemented yet" });
});

router.post("/login", (_req, res) => {
  res.status(501).json({ message: "Login endpoint not implemented yet" });
});

module.exports = router;
