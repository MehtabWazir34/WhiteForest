const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, 'Coupon code is required'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    discountType: {
      type: String,
      enum: ['percentage', 'flat'],
      required: true,
    },
    discountValue: {
      type: Number,
      required: [true, 'Discount value is required'],
      min: 0,
    },
    applicableTo: {
      type: String,
      enum: ['room', 'food', 'both'],
      default: 'both',
    },
    minOrderAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    maxDiscountAmount: {
      type: Number,
      default: null,
      // Caps the discount when discountType = 'percentage'
    },
    usageLimit: {
      type: Number,
      default: null,
      // null = unlimited uses
    },
    usedCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    perGuestLimit: {
      type: Number,
      default: 1,
      // Max times a single guestId can use this coupon
    },
    validFrom: {
      type: Date,
      default: Date.now,
    },
    validUntil: {
      type: Date,
      required: [true, 'Expiry date is required'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

couponSchema.index({ code: 1, isActive: 1 });

module.exports = mongoose.model('Coupon', couponSchema);
