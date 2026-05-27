const express = require('express');
const { register, login, updateProfile, verifyCurrentPassword, getFavorites, updateFavorites } = require('../controllers/authController');
const authenticateToken = require('../middleware/auth');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/verify-password', authenticateToken, verifyCurrentPassword);
router.put('/profile', authenticateToken, updateProfile);
router.get('/favorites', authenticateToken, getFavorites);
router.put('/favorites', authenticateToken, updateFavorites);

module.exports = router;
