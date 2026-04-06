const jwt = require('jsonwebtoken');

/**
 * JWT token verification middleware
 */
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    req.companyId = decoded.companyId;
    req.role = decoded.role;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};

/**
 * Role-based authorization middleware
 */
const authorize = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.role || !allowedRoles.includes(req.role)) {
      return res.status(403).json({ 
        message: 'Access denied. Insufficient permissions.' 
      });
    }
    next();
  };
};

/**
 * Company data isolation middleware
 */
const companyFilter = (req, res, next) => {
  // Add companyId to request for use in data queries
  req.companyFilter = { companyId: req.companyId };
  next();
};

module.exports = {
  verifyToken,
  authorize,
  companyFilter,
};
