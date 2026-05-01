module.exports = {
  jwtSecret: process.env.JWT_SECRET || 'dev_fallback_secret_change_me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
};
