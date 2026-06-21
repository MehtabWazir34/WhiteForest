const rateLimit = require('express-rate-limit');
const env = require('../config/env');
const ApiResponse = require('../utils/apiResponse');

const buildLimiter = ({ windowMinutes, max, message }) =>
  rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      return ApiResponse.error(res, 429, message || 'Too many requests, please try again later.');
    },
  });

// General API limiter - applied globally
const generalLimiter = buildLimiter({
  windowMinutes: env.RATE_LIMIT_WINDOW_MINUTES,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  message: 'Too many requests from this device. Please try again later.',
});

// Stricter limiter for booking creation (anti duplicate-booking / spam)
const bookingLimiter = buildLimiter({
  windowMinutes: 15,
  max: 10,
  message: 'Too many booking attempts. Please wait a few minutes and try again.',
});

// Stricter limiter for payment initiation
const paymentLimiter = buildLimiter({
  windowMinutes: 15,
  max: 15,
  message: 'Too many payment attempts. Please wait a few minutes and try again.',
});

// Tracking lookup limiter (CNIC + Booking ID brute-force protection)
const trackingLimiter = buildLimiter({
  windowMinutes: 15,
  max: 20,
  message: 'Too many tracking attempts. Please wait a few minutes and try again.',
});

// Admin login limiter (brute-force protection)
const authLimiter = buildLimiter({
  windowMinutes: 15,
  max: 8,
  message: 'Too many login attempts. Please wait a few minutes and try again.',
});

module.exports = {
  generalLimiter,
  bookingLimiter,
  paymentLimiter,
  trackingLimiter,
  authLimiter,
};
