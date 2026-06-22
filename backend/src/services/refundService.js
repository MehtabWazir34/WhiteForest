const Refund = require('../models/Refund');
const Payment = require('../models/Payment');
const referenceGeneratorService = require('./referenceGeneratorService');
const notificationService = require('./notificationService');

/**
 * createAutomaticRefundRequest
 * Called right after a booking/order is cancelled within the allowed window.
 * Checks if an online (already paid) payment exists for it - if so, creates
 * a Refund document in 'refund_requested' status automatically.
 * If no paid payment exists (e.g. Cash on Arrival, never paid), does nothing.
 */
const createAutomaticRefundRequest = async ({ guestId, bookingId = null, orderId = null }) => {
  const filter = { paymentStatus: 'paid' };
  if (bookingId) filter.bookingId = bookingId;
  if (orderId) filter.orderId = orderId;

  const paidPayment = await Payment.findOne(filter).sort({ paidAt: -1 });

  if (!paidPayment) {
    // No online/paid payment exists - nothing to refund (e.g. Cash on Arrival)
    return null;
  }

  const refundReference = await referenceGeneratorService.generateRefundReference();

  const refund = await Refund.create({
    refundReference,
    guestId,
    payment: paidPayment._id,
    bookingId,
    orderId,
    amount: paidPayment.amount,
    currency: paidPayment.currency,
    reason: 'cancelled_within_window',
    refundMethod: 'original_payment_method',
    status: 'refund_requested',
  });

  paidPayment.paymentStatus = 'refunded';
  await paidPayment.save();

  await notificationService.notifyAllAdmins({
    type: 'refund_requested',
    title: 'New Refund Request',
    message: `A refund request ${refund.refundReference} has been created for amount ${refund.amount} ${refund.currency}.`,
    bookingId,
    foodOrderId: orderId,
  });

  await notificationService.notifyGuest({
    guestId,
    type: 'refund_requested',
    title: 'Refund Requested',
    message: `Your refund request ${refund.refundReference} has been created and is being processed.`,
    bookingId,
    foodOrderId: orderId,
  });

  return refund;
};

/**
 * markRefundProcessing
 * Admin acknowledges the refund request and begins processing it
 * (e.g. initiating the bank/gateway reversal).
 */
const markRefundProcessing = async (refundId, adminId, notes = null) => {
  const refund = await Refund.findById(refundId);
  if (!refund) throw new Error('Refund not found');

  refund.status = 'refund_processing';
  refund.processedByAdmin = adminId;
  refund.processedAt = new Date();
  if (notes) refund.adminNotes = notes;
  await refund.save();

  return refund;
};

/**
 * completeRefund
 * Marks the refund as completed once funds have actually been returned.
 */
const completeRefund = async (refundId, { transactionId = null, notes = null } = {}) => {
  const refund = await Refund.findById(refundId);
  if (!refund) throw new Error('Refund not found');

  refund.status = 'refund_completed';
  refund.completedAt = new Date();
  if (transactionId) refund.transactionId = transactionId;
  if (notes) refund.adminNotes = notes;
  await refund.save();

  await Payment.findByIdAndUpdate(refund.payment, { paymentStatus: 'refunded' });

  await notificationService.notifyGuest({
    guestId: refund.guestId,
    type: 'refund_completed',
    title: 'Refund Completed',
    message: `Your refund ${refund.refundReference} of ${refund.amount} ${refund.currency} has been completed.`,
    bookingId: refund.bookingId,
    foodOrderId: refund.orderId,
  });

  return refund;
};

/**
 * markRefundFailed
 */
const markRefundFailed = async (refundId, notes = null) => {
  const refund = await Refund.findById(refundId);
  if (!refund) throw new Error('Refund not found');

  refund.status = 'refund_failed';
  if (notes) refund.adminNotes = notes;
  await refund.save();

  return refund;
};

/**
 * getAllRefundRequests
 * Used by the admin dashboard "Refund Requests" widget.
 */
const getAllRefundRequests = async (filter = {}) => {
  return Refund.find(filter).sort({ createdAt: -1 }).lean();
};

module.exports = {
  createAutomaticRefundRequest,
  markRefundProcessing,
  completeRefund,
  markRefundFailed,
  getAllRefundRequests,
};
