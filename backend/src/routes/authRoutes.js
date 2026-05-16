const express = require('express');
const { register, login, updateProfile, verifyCurrentPassword } = require('../controllers/authController');
const authenticateToken = require('../middleware/auth');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/verify-password', authenticateToken, verifyCurrentPassword);
router.put('/profile', authenticateToken, updateProfile);

module.exports = router;
