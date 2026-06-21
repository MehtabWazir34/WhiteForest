const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    recipientType: {
      type: String,
      enum: ['guest', 'admin'],
      required: true,
    },
    guestId: {
      type: String,
      default: null,
      // Set when recipientType = 'guest'
    },
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      // Set when recipientType = 'admin'
    },
    type: {
      type: String,
      enum: [
        'booking_confirmed',
        'booking_cancelled',
        'payment_received',
        'payment_failed',
        'refund_requested',
        'refund_completed',
        'food_order_placed',
        'food_order_status_update',
        'new_booking_admin_alert',
        'new_review_admin_alert',
        'general',
      ],
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Notification title is required'],
    },
    message: {
      type: String,
      required: [true, 'Notification message is required'],
    },
    relatedBooking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      default: null,
    },
    relatedFoodOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FoodOrder',
      default: null,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

notificationSchema.index({ guestId: 1, isRead: 1 });
notificationSchema.index({ admin: 1, isRead: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
