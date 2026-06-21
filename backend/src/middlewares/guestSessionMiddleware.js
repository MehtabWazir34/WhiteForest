const { generateGuestToken, verifyGuestToken } = require('../utils/generateToken');
const ApiResponse = require('../utils/apiResponse');
const { nanoid } = require('nanoid');

const GUEST_COOKIE_NAME = 'guest_token';
const GUEST_COOKIE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/**
 * resolveGuestSession
 * Reads guest token from cookie or X-Guest-Token header (mobile/local-storage clients).
 * If valid -> attaches req.guestId.
 * If missing/invalid -> req.guestId stays null (request is NOT blocked here).
 * Apply this globally in app.js so req.guestId is always available downstream.
 */
const resolveGuestSession = (req, res, next) => {
  try {
    const token = req.cookies?.[GUEST_COOKIE_NAME] || req.headers['x-guest-token'] || null;

    if (!token) {
      req.guestId = null;
      return next();
    }

    const decoded = verifyGuestToken(token);
    req.guestId = decoded.guestId;
    return next();
  } catch (error) {
    req.guestId = null;
    return next();
  }
};

/**
 * ensureGuestSession
 * Use on routes that START a guest journey (e.g. add to cart, create booking).
 * If req.guestId already exists (from resolveGuestSession), reuses it.
 * Otherwise generates a brand-new guestId + token, sets the cookie,
 * AND returns the token in the X-Guest-Token response header
 * (for clients using localStorage instead of cookies).
 */
const ensureGuestSession = (req, res, next) => {
  if (req.guestId) {
    return next();
  }

  const newGuestId = nanoid(16);
  const token = generateGuestToken(newGuestId);

  res.cookie(GUEST_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: GUEST_COOKIE_MAX_AGE_MS,
  });

  res.setHeader('X-Guest-Token', token);

  req.guestId = newGuestId;
  return next();
};

/**
 * requireGuestSession
 * Use on routes that REQUIRE an already-existing guest session
 * (e.g. "view my active booking", "track my cart"). Blocks if missing.
 */
const requireGuestSession = (req, res, next) => {
  if (!req.guestId) {
    return ApiResponse.error(res, 401, 'No active guest session found. Please start a new booking or order.');
  }
  return next();
};

module.exports = {
  resolveGuestSession,
  ensureGuestSession,
  requireGuestSession,
  GUEST_COOKIE_NAME,
};
