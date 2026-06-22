const { body, param } = require('express-validator');

/**
 * Pakistani CNIC format: 13 digits, optionally formatted as XXXXX-XXXXXXX-X
 */
const CNIC_REGEX = /^\d{5}-?\d{7}-?\d{1}$/;

/**
 * normalizeCnic
 * Strips dashes so CNIC is stored in a consistent format: 1310112345671
 */
const normalizeCnic = (value) => value.replace(/-/g, '');

/**
 * Validation chain for CNIC supplied in request body (e.g. guestInfo.cnic)
 */
const cnicBodyValidator = (fieldPath = 'guestInfo.cnic') =>
  body(fieldPath)
    .exists({ checkFalsy: true })
    .withMessage('CNIC is required')
    .bail()
    .trim()
    .matches(CNIC_REGEX)
    .withMessage('CNIC must be a valid 13-digit Pakistani CNIC (e.g. 12345-1234567-1)')
    .customSanitizer(normalizeCnic);

/**
 * Validation chain for CNIC supplied as a query param (e.g. booking tracking)
 */
const cnicQueryValidator = (fieldName = 'cnic') =>
  body(fieldName)
    .exists({ checkFalsy: true })
    .withMessage('CNIC is required')
    .bail()
    .trim()
    .matches(CNIC_REGEX)
    .withMessage('CNIC must be a valid 13-digit Pakistani CNIC (e.g. 12345-1234567-1)')
    .customSanitizer(normalizeCnic);

module.exports = {
  CNIC_REGEX,
  normalizeCnic,
  cnicBodyValidator,
  cnicQueryValidator,
};
