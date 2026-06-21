const { verifyAdminToken } = require('../utils/generateToken');
const ApiResponse = require('../utils/apiResponse');
const User = require('../models/User');

/**
 * protectAdmin
 * Verifies the JWT sent in the Authorization header (Bearer <token>)
 * and attaches the admin user to req.admin. Use on all /admin/* routes.
 */
const protectAdmin = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return ApiResponse.error(res, 401, 'Not authorized, no token provided');
    }

    const decoded = verifyAdminToken(token);

    if (decoded.role !== 'admin') {
      return ApiResponse.error(res, 403, 'Access denied. Admins only.');
    }

    const admin = await User.findById(decoded.id).select('-password');

    if (!admin) {
      return ApiResponse.error(res, 401, 'Admin account no longer exists');
    }

    if (admin.isActive === false) {
      return ApiResponse.error(res, 403, 'Admin account has been deactivated');
    }

    req.admin = admin;
    return next();
  } catch (error) {
    return ApiResponse.error(res, 401, 'Not authorized, invalid or expired token');
  }
};

/**
 * authorizeRoles
 * Restricts access further by admin sub-role (e.g. 'superadmin', 'manager').
 * Usage: protectAdmin, authorizeRoles('superadmin')
 */
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.admin || !roles.includes(req.admin.role)) {
      return ApiResponse.error(res, 403, 'You do not have permission to perform this action');
    }
    return next();
  };
};

module.exports = {
  protectAdmin,
  authorizeRoles,
};
