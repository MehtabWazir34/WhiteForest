const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');

/**
 * sanitizeInput is an array of middlewares applied globally in app.js:
 * 1. mongoSanitize - strips keys starting with "$" or containing "." from
 *    req.body, req.query, req.params to prevent NoSQL operator injection.
 * 2. xss - cleans user input from malicious HTML/JS content (XSS payloads).
 */
const sanitizeInput = [
  mongoSanitize(),
  xss(),
];

module.exports = sanitizeInput;
