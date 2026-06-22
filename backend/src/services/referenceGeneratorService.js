const env = require('../config/env');

/**
 * Generates a 5-digit random numeric suffix.
 */
const randomSuffix = () => {
  return Math.floor(10000 + Math.random() * 90000).toString();
};

const currentYear = () => new Date().getFullYear();

/**
 * Generic generator + uniqueness checker.
 * @param {string} prefix - e.g. 'WF', 'FO', 'PAY', 'INV', 'RF'
 * @param {mongoose.Model} Model - the model to check uniqueness against
 * @param {string} field - the field name holding the reference (e.g. 'bookingReference')
 * @param {number} maxAttempts
 */
const generateUniqueReference = async (prefix, Model, field, maxAttempts = 8) => {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const candidate = `${prefix}-${currentYear()}-${randomSuffix()}`;
    // eslint-disable-next-line no-await-in-loop
    const exists = await Model.exists({ [field]: candidate });
    if (!exists) {
      return candidate;
    }
  }
  throw new Error(`Failed to generate a unique reference for prefix ${prefix} after ${maxAttempts} attempts`);
};

/**
 * Booking Reference: WF-2026-87452
 */
const generateBookingReference = async () => {
  const Booking = require('../models/Booking');
  return generateUniqueReference(env.BOOKING_REFERENCE_PREFIX, Booking, 'bookingReference');
};

/**
 * Food Order Reference: FO-2026-98452
 */
const generateFoodOrderReference = async () => {
  const FoodOrder = require('../models/FoodOrder');
  return generateUniqueReference(env.FOOD_ORDER_REFERENCE_PREFIX, FoodOrder, 'orderReference');
};

/**
 * Payment Reference: PAY-2026-00123
 */
const generatePaymentReference = async () => {
  const Payment = require('../models/Payment');
  return generateUniqueReference('PAY', Payment, 'paymentId');
};

/**
 * Invoice Reference: INV-2026-00123
 */
const generateInvoiceReference = async () => {
  const Invoice = require('../models/Invoice');
  return generateUniqueReference('INV', Invoice, 'invoiceNumber');
};

/**
 * Refund Reference: RF-2026-00123
 */
const generateRefundReference = async () => {
  const Refund = require('../models/Refund');
  return generateUniqueReference('RF', Refund, 'refundReference');
};

module.exports = {
  generateBookingReference,
  generateFoodOrderReference,
  generatePaymentReference,
  generateInvoiceReference,
  generateRefundReference,
};
