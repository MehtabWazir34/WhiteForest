const mongoose = require('mongoose');

const foodOrderSchema = new mongoose.Schema(
  {
    orderReference: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      // Format: FO-2026-98452
    },
    guestId: {
      type: String,
      required: true,
      index: true,
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
    },
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      default: null,
      // Optional - links to an active room booking for in-room delivery
    },
    roomNumber: {
      type: String,
      default: null,
      trim: true,
    },
    deliveryType: {
      type: String,
      enum: ['room_delivery', 'pickup'],
      default: 'room_delivery',
    },
    subtotalAmount: {
      type: Number,
      required: true,
      min: 0,
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
    },
    status: {
      type: String,
      enum: ['placed', 'preparing', 'cooking', 'on_the_way', 'delivered', 'cancelled'],
      default: 'placed',
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded', 'partially_refunded', 'expired'],
      default: 'pending',
    },
    specialInstructions: {
      type: String,
      default: null,
    },
    estimatedDeliveryTime: {
      type: Date,
      default: null,
    },
    deliveredAt: {
      type: Date,
      default: null,
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
  },
  { timestamps: true }
);

foodOrderSchema.index({ 'guestInfo.cnic': 1 });
foodOrderSchema.index({ roomNumber: 1, status: 1 });
foodOrderSchema.index({ guestId: 1, status: 1 });

module.exports = mongoose.model('FoodOrder', foodOrderSchema);
