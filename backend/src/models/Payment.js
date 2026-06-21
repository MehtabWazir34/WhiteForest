const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    paymentId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      // Human-readable payment reference, e.g. PAY-2026-00123
    },
    guestId: {
      type: String,
      required: true,
      index: true,
    },
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      default: null,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FoodOrder',
      default: null,
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: 0,
    },
    currency: {
      type: String,
      default: 'PKR',
      enum: ['PKR', 'USD', 'AED', 'GBP', 'EUR'],
    },
    paymentType: {
      type: String,
      enum: ['advance', 'full', 'remaining_balance', 'food_order'],
      default: 'full',
    },
    paymentMethod: {
      type: String,
      enum: [
        'cash_on_arrival',
        'bank_transfer',
        'jazzcash',
        'easypaisa',
        'raast',
        'stripe',
        'paypal',
      ],
      required: [true, 'Payment method is required'],
    },
    transactionId: {
      type: String,
      default: null,
      // External gateway transaction ID, or bank transfer slip ref
    },
    gatewayResponse: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
      // Raw response payload from JazzCash/Stripe/PayPal etc. for audit/debug
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded', 'partially_refunded', 'expired'],
      default: 'pending',
    },
    proofOfPaymentUrl: {
      type: String,
      default: null,
      // For bank transfer - uploaded receipt/screenshot
    },
    verifiedByAdmin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
    paidAt: {
      type: Date,
      default: null,
    },
    expiresAt: {
      type: Date,
      default: null,
      // For pending payments that should auto-expire if unconfirmed
    },
    notes: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

paymentSchema.index({ bookingId: 1 });
paymentSchema.index({ orderId: 1 });
paymentSchema.index({ paymentStatus: 1, createdAt: -1 });

module.exports = mongoose.model('Payment', paymentSchema);
