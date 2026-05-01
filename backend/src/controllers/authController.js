const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { jwtSecret, jwtExpiresIn } = require('../../config/auth');

// Simple in-memory user store for demo purposes. Replace with DB in production.
const users = [];

exports.register = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password are required' });
    }

    const existing = users.find((u) => u.username === username);
    if (existing) {
      return res.status(409).json({ success: false, message: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    const user = { id: Date.now().toString(), username, passwordHash: hash };
    users.push(user);

    // Do not return password hash
    const { passwordHash, ...safe } = user;
    res.status(201).json({ success: true, user: safe });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Registration error', error: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password are required' });
    }

    const user = users.find((u) => u.username === username);
    if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    // Sign JWT using centralized secret
    const token = jwt.sign({ userId: user.id, username: user.username }, jwtSecret, { expiresIn: jwtExpiresIn });

    res.status(200).json({ success: true, token });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Login error', error: err.message });
  }
};
