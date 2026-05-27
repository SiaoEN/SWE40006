const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { ObjectId } = require('mongodb');
const { jwtSecret, jwtExpiresIn } = require('../../config/auth');
const { getDb } = require('../../config/db');

function normalizeFavoriteIds(favorites) {
  if (!Array.isArray(favorites)) {
    return [];
  }

  return Array.from(
    new Set(
      favorites
        .map((favoriteId) => String(favoriteId || '').trim())
        .filter(Boolean)
    )
  );
}

function serializeUser(user) {
  if (!user) {
    return null;
  }

  return {
    _id: user._id.toString(),
    username: user.name,
    email: user.email,
    avatar: user.avatar || null,
    bio: user.bio || null,
    favorites: normalizeFavoriteIds(user.favorites),
    role: user.role,
    createdAt: user.createdAt,
  };
}

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
      favorites: [],
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
      { userId: user._id.toString(), username: user.name, role: user.role },
      jwtSecret,
      { expiresIn: jwtExpiresIn }
    );

    // Return user object without password
    const { password: _, ...userWithoutPassword } = user;
    res.status(200).json({ 
      success: true, 
      token,
      user: serializeUser(user)
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Login error', error: err.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { userId } = req.user; // From JWT token via middleware
    const body = req.body || {};
    const { username, email, avatar, bio, oldPassword, newPassword, confirmNewPassword } = body;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    if (!username && !email && typeof avatar === 'undefined' && typeof bio === 'undefined') {
      // Log for debugging when request body is unexpectedly empty
      console.warn('updateProfile called with empty body. headers=', req.headers, 'body=', req.body);
      return res.status(400).json({ success: false, message: 'At least one field is required' });
    }

    const db = getDb();
    const usersCollection = db.collection('User');
    const feedbackCollection = db.collection('Feedback');

    const existingUser = await usersCollection.findOne({ _id: new ObjectId(userId) });
    if (!existingUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const passwordChangeRequested =
      typeof newPassword === 'string' && newPassword.trim() !== '';

    if (passwordChangeRequested) {
      if (!oldPassword) {
        return res.status(400).json({ success: false, message: 'Old password is required' });
      }

      const currentPassword = existingUser.password || '';
      let oldPasswordMatches = false;
      if (currentPassword.startsWith('$2')) {
        oldPasswordMatches = await bcrypt.compare(oldPassword, currentPassword);
      } else {
        oldPasswordMatches = oldPassword === currentPassword;
      }

      if (!oldPasswordMatches) {
        return res.status(400).json({ success: false, message: 'Old password is incorrect' });
      }

      if (!confirmNewPassword || newPassword !== confirmNewPassword) {
        return res.status(400).json({ success: false, message: 'New password and confirmation password does not match' });
      }
    }

    // Build update object
    const updateData = {};
    if (username) updateData.name = username;
    if (email) updateData.email = email;
    if (typeof avatar !== 'undefined') updateData.avatar = avatar;
    if (typeof bio !== 'undefined') updateData.bio = bio;
    if (passwordChangeRequested) {
      updateData.password = await bcrypt.hash(newPassword, 10);
    }

    // Update user document
    const result = await usersCollection.findOneAndUpdate(
      { _id: new ObjectId(userId) },
      { $set: updateData },
      { returnDocument: 'after' }
    );

    // MongoDB drivers may return either { value: doc } or doc directly.
    const updatedUser = result?.value || result;

    if (!updatedUser || !updatedUser._id) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Migrate feedback history so renamed users keep the same history
    const feedbackUpdate = {
      $set: {
        userId: userId,
        username: updatedUser.name,
      },
    };

    await feedbackCollection.updateMany(
      {
        $or: [
          { userId },
          { username: existingUser.name },
        ],
      },
      feedbackUpdate
    );

    res.status(200).json({
      success: true,
      user: serializeUser(updatedUser)
    });
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).json({ success: false, message: 'Profile update error', error: err.message });
  }
};

exports.getFavorites = async (req, res) => {
  try {
    const { userId } = req.user;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const db = getDb();
    const usersCollection = db.collection('User');
    const user = await usersCollection.findOne({ _id: new ObjectId(userId) });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.status(200).json({
      success: true,
      favorites: normalizeFavoriteIds(user.favorites),
    });
  } catch (err) {
    console.error('Favorites fetch error:', err);
    return res.status(500).json({ success: false, message: 'Favorites fetch error', error: err.message });
  }
};

exports.updateFavorites = async (req, res) => {
  try {
    const { userId } = req.user;
    const body = req.body || {};
    const favorites = normalizeFavoriteIds(body.favorites || body.favoriteIds || []);

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const db = getDb();
    const usersCollection = db.collection('User');

    const result = await usersCollection.findOneAndUpdate(
      { _id: new ObjectId(userId) },
      { $set: { favorites } },
      { returnDocument: 'after' }
    );

    const updatedUser = result?.value || result;

    if (!updatedUser || !updatedUser._id) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.status(200).json({
      success: true,
      favorites: normalizeFavoriteIds(updatedUser.favorites),
      user: serializeUser(updatedUser),
    });
  } catch (err) {
    console.error('Favorites update error:', err);
    return res.status(500).json({ success: false, message: 'Favorites update error', error: err.message });
  }
};

exports.verifyCurrentPassword = async (req, res) => {
  try {
    const { userId } = req.user;
    const { oldPassword } = req.body || {};

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    if (!oldPassword) {
      return res.status(400).json({ success: false, message: 'Old password is required' });
    }

    const db = getDb();
    const usersCollection = db.collection('User');
    const user = await usersCollection.findOne({ _id: new ObjectId(userId) });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const currentPassword = user.password || '';
    const matches = currentPassword.startsWith('$2')
      ? await bcrypt.compare(oldPassword, currentPassword)
      : oldPassword === currentPassword;

    if (!matches) {
      return res.status(400).json({ success: false, message: 'Old password is incorrect' });
    }

    return res.status(200).json({ success: true, message: 'Old password is correct' });
  } catch (err) {
    console.error('Password verification error:', err);
    return res.status(500).json({ success: false, message: 'Password verification error', error: err.message });
  }
};
