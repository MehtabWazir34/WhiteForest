const { body } = require('express-validator');

const VALID_PAYMENT_METHODS = [
  'cash_on_arrival',
  'bank_transfer',
  'jazzcash',
  'easypaisa',
  'raast',
  'stripe',
  'paypal',
];

/**
 * createPaymentValidator
 * Validates payment initiation: { bookingId? , orderId?, amount, paymentMethod, currency? }
 * Exactly one of bookingId / orderId must be present.
 */
const createPaymentValidator = [
  body('bookingId')
    .optional({ checkFalsy: true })
    .isMongoId()
    .withMessage('Booking ID must be a valid identifier'),

  body('orderId')
    .optional({ checkFalsy: true })
    .isMongoId()
    .withMessage('Order ID must be a valid identifier'),

  body().custom((value) => {
    if (!value.bookingId && !value.orderId) {
      throw new Error('Either bookingId or orderId is required');
    }
    if (value.bookingId && value.orderId) {
      throw new Error('Provide only one of bookingId or orderId, not both');
    }
    return true;
  }),

  body('amount')
    .exists({ checkFalsy: true })
    .withMessage('Amount is required')
    .bail()
    .isFloat({ gt: 0 })
    .withMessage('Amount must be a positive number'),

  body('currency')
    .optional()
    .isIn(['PKR', 'USD', 'AED', 'GBP', 'EUR'])
    .withMessage('Unsupported currency'),

  body('paymentMethod')
    .exists({ checkFalsy: true })
    .withMessage('Payment method is required')
    .bail()
    .isIn(VALID_PAYMENT_METHODS)
    .withMessage(`Payment method must be one of: ${VALID_PAYMENT_METHODS.join(', ')}`),

  body('paymentType')
    .optional()
    .isIn(['advance', 'full', 'remaining_balance', 'food_order'])
    .withMessage('Invalid payment type'),
];

/**
 * uploadProofOfPaymentValidator
 * Validates the bank transfer proof submission: { paymentId, proofOfPaymentUrl, transactionId? }
 */
const uploadProofOfPaymentValidator = [
  body('paymentId')
    .exists({ checkFalsy: true })
    .withMessage('Payment ID is required')
    .bail()
    .isMongoId()
    .withMessage('Payment ID must be a valid identifier'),

  body('proofOfPaymentUrl')
    .exists({ checkFalsy: true })
    .withMessage('Proof of payment (receipt/screenshot URL) is required')
    .bail()
    .trim()
    .isString(),

  body('transactionId')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage('Transaction ID is too long'),
];

/**
 * verifyPaymentValidator
 * Validates admin verification action: { paymentId }
 */
const verifyPaymentValidator = [
  body('paymentId')
    .exists({ checkFalsy: true })
    .withMessage('Payment ID is required')
    .bail()
    .isMongoId()
    .withMessage('Payment ID must be a valid identifier'),
];

module.exports = {
  VALID_PAYMENT_METHODS,
  createPaymentValidator,
  uploadProofOfPaymentValidator,
  verifyPaymentValidator,
};
