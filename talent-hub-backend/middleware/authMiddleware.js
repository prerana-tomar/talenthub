const jwt = require('jsonwebtoken');

const protect = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // "Bearer <token>"

  if (!token) return res.status(401).json({ message: 'No token. Access denied.' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Map decoded.id → req.user._id so videos.js can use req.user._id correctly
    req.user = {
      _id: decoded.id,
      username: decoded.username,
    };

    next();
  } catch {
    res.status(403).json({ message: 'Invalid or expired token.' });
  }
};

module.exports = { protect };