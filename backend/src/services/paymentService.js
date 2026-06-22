const Payment = require('../models/Payment');
const Booking = require('../models/Booking');
const FoodOrder = require('../models/FoodOrder');
const referenceGeneratorService = require('./referenceGeneratorService');
const bookingService = require('./bookingService');
const notificationService = require('./notificationService');

/**
 * createPayment
 * Creates a Payment document in 'pending' status. For offline methods
 * (Cash on Arrival, Bank Transfer) this stays pending until admin verifies.
 * For online gateways (Phase 2), the controller will update this record
 * once the gateway confirms/rejects the transaction.
 */
const createPayment = async ({
  guestId,
  bookingId = null,
  orderId = null,
  amount,
  currency = 'PKR',
  paymentType = 'full',
  paymentMethod,
  transactionId = null,
  proofOfPaymentUrl = null,
}) => {
  const paymentId = await referenceGeneratorService.generatePaymentReference();

  const payment = await Payment.create({
    paymentId,
    guestId,
    bookingId,
    orderId,
    amount,
    currency,
    paymentType,
    paymentMethod,
    transactionId,
    proofOfPaymentUrl,
    paymentStatus: 'pending',
  });

  return payment;
};

/**
 * markPaymentPaid
 * Marks a Payment as paid (after admin verification, or automatic gateway
 * confirmation in Phase 2). If the payment is tied to a Booking, confirms
 * the booking. If tied to a FoodOrder, updates its paymentStatus.
 */
const markPaymentPaid = async (paymentId, { transactionId = null, verifiedByAdmin = null, gatewayResponse = null } = {}) => {
  const payment = await Payment.findById(paymentId);
  if (!payment) throw new Error('Payment not found');

  payment.paymentStatus = 'paid';
  payment.paidAt = new Date();
  if (transactionId) payment.transactionId = transactionId;
  if (verifiedByAdmin) {
    payment.verifiedByAdmin = verifiedByAdmin;
    payment.verifiedAt = new Date();
  }
  if (gatewayResponse) payment.gatewayResponse = gatewayResponse;
  await payment.save();

  if (payment.bookingId) {
    await bookingService.confirmBookingAfterPayment(payment.bookingId);

    const booking = await Booking.findById(payment.bookingId);
    if (booking && payment.paymentType === 'advance') {
      booking.paymentStatus = 'paid';
      await booking.save();
    }
  }

  if (payment.orderId) {
    const order = await FoodOrder.findById(payment.orderId);
    if (order) {
      order.paymentStatus = 'paid';
      await order.save();

      await notificationService.notifyGuest({
        guestId: order.guestId,
        type: 'payment_received',
        title: 'Payment Received',
        message: `Payment for your food order ${order.orderReference} has been received.`,
        foodOrderId: order._id,
      });
    }
  }

  return payment;
};

/**
 * markPaymentFailed
 */
const markPaymentFailed = async (paymentId, { gatewayResponse = null } = {}) => {
  const payment = await Payment.findById(paymentId);
  if (!payment) throw new Error('Payment not found');

  payment.paymentStatus = 'failed';
  if (gatewayResponse) payment.gatewayResponse = gatewayResponse;
  await payment.save();

  await notificationService.notifyGuest({
    guestId: payment.guestId,
    type: 'payment_failed',
    title: 'Payment Failed',
    message: `Your payment ${payment.paymentId} could not be processed. Please try again or choose another method.`,
    bookingId: payment.bookingId,
    foodOrderId: payment.orderId,
  });

  return payment;
};

/**
 * expireStalePendingPayments
 * Called by the expirePendingPayments background job. Expires any
 * 'pending' payments past their expiresAt time and releases the related
 * booking's room holds (since the guest never completed payment).
 */
const expireStalePendingPayments = async () => {
  const now = new Date();
  const stalePayments = await Payment.find({
    paymentStatus: 'pending',
    expiresAt: { $lte: now },
  });

  const availabilityService = require('./availabilityService');

  for (const payment of stalePayments) {
    payment.paymentStatus = 'expired';
    // eslint-disable-next-line no-await-in-loop
    await payment.save();

    if (payment.bookingId) {
      // eslint-disable-next-line no-await-in-loop
      await availabilityService.releaseRoomDates(payment.bookingId);
      // eslint-disable-next-line no-await-in-loop
      await Booking.findByIdAndUpdate(payment.bookingId, {
        status: 'expired',
        paymentStatus: 'expired',
      });
    }
  }

  return stalePayments.length;
};

/**
 * getPaymentsForBooking
 */
const getPaymentsForBooking = async (bookingId) => {
  return Payment.find({ bookingId }).sort({ createdAt: -1 }).lean();
};

/**
 * getPaymentsForOrder
 */
const getPaymentsForOrder = async (orderId) => {
  return Payment.find({ orderId }).sort({ createdAt: -1 }).lean();
};

module.exports = {
  createPayment,
  markPaymentPaid,
  markPaymentFailed,
  expireStalePendingPayments,
  getPaymentsForBooking,
  getPaymentsForOrder,
};
