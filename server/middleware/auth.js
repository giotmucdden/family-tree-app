// Middleware to check if user is authenticated
const ensureAuth = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'Not authenticated. Please log in.' });
};

const ensureGuest = (req, res, next) => {
  if (!req.isAuthenticated()) {
    return next();
  }
  res.redirect(process.env.CLIENT_URL || 'http://localhost:3000');
};

module.exports = { ensureAuth, ensureGuest };
