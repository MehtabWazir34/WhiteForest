const { body } = require('express-validator');

/**
 * Pakistani mobile number format: 03XXXXXXXXX or +923XXXXXXXXX or 923XXXXXXXXX
 */
const PHONE_REGEX = /^(\+92|0092|92|0)?3\d{9}$/;

/**
 * normalizePhone
 * Converts any accepted format into a consistent +923XXXXXXXXX format.
 */
const normalizePhone = (value) => {
  let digits = value.replace(/[^\d+]/g, '');

  if (digits.startsWith('+92')) {
    return digits;
  }
  if (digits.startsWith('0092')) {
    return `+92${digits.slice(4)}`;
  }
  if (digits.startsWith('92')) {
    return `+${digits}`;
  }
  if (digits.startsWith('0')) {
    return `+92${digits.slice(1)}`;
  }
  return `+92${digits}`;
};

/**
 * Validation chain for contact number supplied in request body
 */
const phoneBodyValidator = (fieldPath = 'guestInfo.contactNumber') =>
  body(fieldPath)
    .exists({ checkFalsy: true })
    .withMessage('Contact number is required')
    .bail()
    .trim()
    .matches(PHONE_REGEX)
    .withMessage('Contact number must be a valid Pakistani mobile number (e.g. 03001234567)')
    .customSanitizer(normalizePhone);

/**
 * Optional phone validator - for fields like alternate contact, not required
 */
const optionalPhoneBodyValidator = (fieldPath) =>
  body(fieldPath)
    .optional({ checkFalsy: true })
    .trim()
    .matches(PHONE_REGEX)
    .withMessage('Contact number must be a valid Pakistani mobile number (e.g. 03001234567)')
    .customSanitizer(normalizePhone);

module.exports = {
  PHONE_REGEX,
  normalizePhone,
  phoneBodyValidator,
  optionalPhoneBodyValidator,
};
