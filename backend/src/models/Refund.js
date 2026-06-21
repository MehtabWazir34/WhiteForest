const mongoose = require('mongoose');

const refundSchema = new mongoose.Schema(
  {
    refundReference: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      // Format: RF-2026-00123
    },
    guestId: {
      type: String,
      required: true,
      index: true,
    },
    payment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
      required: true,
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
      required: [true, 'Refund amount is required'],
      min: 0,
    },
    currency: {
      type: String,
      default: 'PKR',
    },
    reason: {
      type: String,
      required: [true, 'Refund reason is required'],
      enum: [
        'cancelled_within_window',
        'admin_initiated',
        'overbooking_correction',
        'service_issue',
        'other',
      ],
      default: 'cancelled_within_window',
    },
    refundMethod: {
      type: String,
      enum: ['original_payment_method', 'bank_transfer', 'manual'],
      default: 'original_payment_method',
    },
    status: {
      type: String,
      enum: ['refund_requested', 'refund_processing', 'refund_completed', 'refund_failed'],
      default: 'refund_requested',
    },
    transactionId: {
      type: String,
      default: null,
      // Gateway refund transaction ID once processed
    },
    requestedAt: {
      type: Date,
      default: Date.now,
    },
    processedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    processedByAdmin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    adminNotes: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

refundSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Refund', refundSchema);
