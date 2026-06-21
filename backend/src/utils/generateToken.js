const jwt = require('jsonwebtoken');
const env = require('../config/env');

/**
 * Generates a JWT for an authenticated Admin user.
 * @param {string} userId - Mongo _id of the admin User document
 * @returns {string} signed JWT
 */
const generateAdminToken = (userId) => {
  return jwt.sign({ id: userId, role: 'admin' }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  });
};

/**
 * Generates a Guest session token (no account, no password).
 * Used to let a guest revisit their active booking/order/receipt.
 * @param {string} guestId - a generated guest identifier (nanoid/uuid)
 * @returns {string} signed JWT
 */
const generateGuestToken = (guestId) => {
  return jwt.sign({ guestId, role: 'guest' }, env.GUEST_TOKEN_SECRET, {
    expiresIn: env.GUEST_TOKEN_EXPIRES_IN,
  });
};

/**
 * Verifies an Admin JWT.
 * @param {string} token
 * @returns {object} decoded payload
 */
const verifyAdminToken = (token) => {
  return jwt.verify(token, env.JWT_SECRET);
};

/**
 * Verifies a Guest token.
 * @param {string} token
 * @returns {object} decoded payload
 */
const verifyGuestToken = (token) => {
  return jwt.verify(token, env.GUEST_TOKEN_SECRET);
};

module.exports = {
  generateAdminToken,
  generateGuestToken,
  verifyAdminToken,
  verifyGuestToken,
};
