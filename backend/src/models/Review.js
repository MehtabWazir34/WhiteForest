const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    guestId: {
      type: String,
      required: true,
      index: true,
    },
    guestName: {
      type: String,
      required: [true, 'Guest name is required'],
      trim: true,
    },
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      default: null,
    },
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      default: null,
    },
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: 1,
      max: 5,
    },
    title: {
      type: String,
      default: null,
      trim: true,
    },
    comment: {
      type: String,
      required: [true, 'Review comment is required'],
      trim: true,
    },
    images: [
      {
        type: String,
      },
    ],
    isApproved: {
      type: Boolean,
      default: false,
      // Admin moderates before it shows publicly as a testimonial
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    adminResponse: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

reviewSchema.index({ room: 1, isApproved: 1 });

module.exports = mongoose.model('Review', reviewSchema);
