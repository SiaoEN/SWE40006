const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { ObjectId } = require('mongodb');
const { jwtSecret, jwtExpiresIn } = require('../../config/auth');
const { getDb } = require('../../config/db');

exports.register = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password are required' });
    }

    const db = getDb();
    const usersCollection = db.collection('User');

    // Check if user already exists
    const existing = await usersCollection.findOne({ name: username });
    if (existing) {
      return res.status(409).json({ success: false, message: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create new user
    const newUser = {
      name: username,
      email: email || '',
      password: passwordHash,
      role: 'user',
      createdAt: new Date(),
    };

    const result = await usersCollection.insertOne(newUser);

    // Return user without password
    const { password: _, ...safe } = newUser;
    res.status(201).json({ success: true, user: { ...safe, _id: result.insertedId } });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ success: false, message: 'Registration error', error: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password are required' });
    }

    const db = getDb();
    const usersCollection = db.collection('User');

    // Find user by name (matching your schema)
    const user = await usersCollection.findOne({ name: username });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Compare passwords - handle both hashed and plain text (for legacy data)
    let match = false;
    if (user.password.startsWith('$2')) {
      // bcrypt hashed password
      match = await bcrypt.compare(password, user.password);
    } else {
      // Plain text password (legacy - for your existing admin user)
      match = password === user.password;
    }

    if (!match) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id.toString(), username: user.name },
      jwtSecret,
      { expiresIn: jwtExpiresIn }
    );

    res.status(200).json({ success: true, token });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Login error', error: err.message });
  }
};
