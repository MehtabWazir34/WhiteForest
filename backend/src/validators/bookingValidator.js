const { body } = require('express-validator');
const { cnicBodyValidator, cnicQueryValidator } = require('./cnicValidator');
const { phoneBodyValidator } = require('./phoneValidator');

/**
 * createBookingValidator
 * Validates the full booking creation payload:
 * {
 *   guestInfo: { cnic, fullName, contactNumber, email?, address? },
 *   roomSelections: [{ roomId, checkIn, checkOut, guestsCount? }]
 * }
 */
const createBookingValidator = [
  cnicBodyValidator('guestInfo.cnic'),
  phoneBodyValidator('guestInfo.contactNumber'),

  body('guestInfo.fullName')
    .exists({ checkFalsy: true })
    .withMessage('Full name is required')
    .bail()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Full name must be between 2 and 100 characters'),

  body('guestInfo.email')
    .optional({ checkFalsy: true })
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),

  body('guestInfo.address')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 250 })
    .withMessage('Address must not exceed 250 characters'),

  body('roomSelections')
    .isArray({ min: 1 })
    .withMessage('At least one room selection is required'),

  body('roomSelections.*.roomId')
    .exists({ checkFalsy: true })
    .withMessage('Room ID is required for each selection')
    .bail()
    .isMongoId()
    .withMessage('Room ID must be a valid identifier'),

  body('roomSelections.*.checkIn')
    .exists({ checkFalsy: true })
    .withMessage('Check-in date is required for each selection')
    .bail()
    .isISO8601()
    .withMessage('Check-in date must be a valid date'),

  body('roomSelections.*.checkOut')
    .exists({ checkFalsy: true })
    .withMessage('Check-out date is required for each selection')
    .bail()
    .isISO8601()
    .withMessage('Check-out date must be a valid date')
    .custom((value, { req, path }) => {
      const index = path.match(/\d+/)?.[0];
      const checkIn = req.body.roomSelections?.[index]?.checkIn;
      if (checkIn && new Date(value) <= new Date(checkIn)) {
        throw new Error('Check-out date must be after check-in date');
      }
      return true;
    }),

  body('roomSelections.*.guestsCount.adults')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Adults count must be at least 1'),

  body('roomSelections.*.guestsCount.children')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Children count cannot be negative'),

  body('couponCode')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 30 })
    .withMessage('Coupon code is invalid'),

  body('specialRequests')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 500 })
    .withMessage('Special requests must not exceed 500 characters'),
];

/**
 * trackBookingValidator
 * Validates the guest tracking request: { bookingReference, cnic }
 */
const trackBookingValidator = [
  body('bookingReference')
    .exists({ checkFalsy: true })
    .withMessage('Booking reference is required')
    .bail()
    .trim()
    .matches(/^WF-\d{4}-\d{4,6}$/)
    .withMessage('Booking reference format is invalid (expected e.g. WF-2026-87452)'),

  cnicQueryValidator('cnic'),
];

/**
 * cancelBookingValidator
 * Validates the guest-initiated cancellation request.
 */
const cancelBookingValidator = [
  body('bookingReference')
    .exists({ checkFalsy: true })
    .withMessage('Booking reference is required')
    .bail()
    .trim(),

  cnicQueryValidator('cnic'),

  body('reason')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 300 })
    .withMessage('Cancellation reason must not exceed 300 characters'),
];

module.exports = {
  createBookingValidator,
  trackBookingValidator,
  cancelBookingValidator,
};
