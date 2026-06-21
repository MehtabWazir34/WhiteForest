const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    bookingReference: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      // Format: WF-2026-87452
    },
    guestId: {
      type: String,
      required: true,
      index: true,
      // Guest token identifier (no account, no password)
    },
    guestInfo: {
      cnic: {
        type: String,
        required: [true, 'CNIC is required'],
        trim: true,
      },
      fullName: {
        type: String,
        required: [true, 'Full name is required'],
        trim: true,
      },
      contactNumber: {
        type: String,
        required: [true, 'Contact number is required'],
        trim: true,
      },
      email: {
        type: String,
        trim: true,
        lowercase: true,
        default: null,
      },
      address: {
        type: String,
        trim: true,
        default: null,
      },
    },
    checkIn: {
      type: Date,
      required: true,
    },
    checkOut: {
      type: Date,
      required: true,
    },
    totalNights: {
      type: Number,
      required: true,
      min: 1,
    },
    roomsCount: {
      type: Number,
      required: true,
      min: 1,
    },
    subtotalAmount: {
      type: Number,
      required: true,
      min: 0,
      // Sum of room charges only
    },
    foodAmount: {
      type: Number,
      default: 0,
      min: 0,
      // Sum of any food orders attached to this booking at checkout
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    couponCode: {
      type: String,
      default: null,
    },
    taxAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
      // subtotalAmount + foodAmount + taxAmount - discountAmount
    },
    advancePaymentRequired: {
      type: Boolean,
      default: true,
    },
    advancePaymentPercent: {
      type: Number,
      default: 30,
      min: 0,
      max: 100,
    },
    advanceAmountDue: {
      type: Number,
      default: 0,
      min: 0,
    },
    remainingAmountDue: {
      type: Number,
      default: 0,
      min: 0,
    },
    status: {
      type: String,
      enum: ['pending_payment', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'expired', 'completed'],
      default: 'pending_payment',
      // Booking only becomes 'confirmed' after payment verification
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded', 'partially_refunded', 'expired'],
      default: 'pending',
    },
    cancellationEligibleUntil: {
      type: Date,
      required: true,
      // createdAt + CANCELLATION_WINDOW_MINUTES, used to check refund eligibility
    },
    isCancelled: {
      type: Boolean,
      default: false,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    cancellationReason: {
      type: String,
      default: null,
    },
    specialRequests: {
      type: String,
      default: null,
    },
    source: {
      type: String,
      enum: ['website', 'whatsapp', 'admin', 'phone'],
      default: 'website',
    },
  },
  { timestamps: true }
);

bookingSchema.index({ 'guestInfo.cnic': 1 });
bookingSchema.index({ guestId: 1, status: 1 });
bookingSchema.index({ checkIn: 1, checkOut: 1 });

module.exports = mongoose.model('Booking', bookingSchema);
