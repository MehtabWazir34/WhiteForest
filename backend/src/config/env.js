export default { jwtSecret: process.env.JWT_SECRET || "secret" };
const dotenv = require('dotenv');

dotenv.config();

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: process.env.PORT || 5000,

  MONGO_URI: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/white_forest',

  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',

  JWT_SECRET: process.env.JWT_SECRET || 'fallback_jwt_secret',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',

  GUEST_TOKEN_SECRET: process.env.GUEST_TOKEN_SECRET || 'fallback_guest_secret',
  GUEST_TOKEN_EXPIRES_IN: process.env.GUEST_TOKEN_EXPIRES_IN || '30d',

  COOKIE_SECRET: process.env.COOKIE_SECRET || 'fallback_cookie_secret',

  CANCELLATION_WINDOW_MINUTES: parseInt(process.env.CANCELLATION_WINDOW_MINUTES, 10) || 20,
  DEFAULT_ADVANCE_PAYMENT_PERCENT: parseInt(process.env.DEFAULT_ADVANCE_PAYMENT_PERCENT, 10) || 30,
  BOOKING_REFERENCE_PREFIX: process.env.BOOKING_REFERENCE_PREFIX || 'WF',
  FOOD_ORDER_REFERENCE_PREFIX: process.env.FOOD_ORDER_REFERENCE_PREFIX || 'FO',

  RATE_LIMIT_WINDOW_MINUTES: parseInt(process.env.RATE_LIMIT_WINDOW_MINUTES, 10) || 15,
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,

  JAZZCASH_MERCHANT_ID: process.env.JAZZCASH_MERCHANT_ID || '',
  JAZZCASH_PASSWORD: process.env.JAZZCASH_PASSWORD || '',
  JAZZCASH_INTEGRITY_SALT: process.env.JAZZCASH_INTEGRITY_SALT || '',

  EASYPAISA_STORE_ID: process.env.EASYPAISA_STORE_ID || '',
  EASYPAISA_HASH_KEY: process.env.EASYPAISA_HASH_KEY || '',

  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || '',
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || '',

  PAYPAL_CLIENT_ID: process.env.PAYPAL_CLIENT_ID || '',
  PAYPAL_CLIENT_SECRET: process.env.PAYPAL_CLIENT_SECRET || '',

  SMTP_HOST: process.env.SMTP_HOST || '',
  SMTP_PORT: parseInt(process.env.SMTP_PORT, 10) || 587,
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  SMTP_FROM: process.env.SMTP_FROM || 'White Forest Hotel <no-reply@whiteforest.com>',

  HOTEL_NAME: process.env.HOTEL_NAME || 'White Forest Hotel',
  HOTEL_ADDRESS: process.env.HOTEL_ADDRESS || 'Murree, Punjab, Pakistan',
  HOTEL_PHONE: process.env.HOTEL_PHONE || '+92-300-0000000',
  HOTEL_EMAIL: process.env.HOTEL_EMAIL || 'info@whiteforest.com',
};

module.exports = env;
