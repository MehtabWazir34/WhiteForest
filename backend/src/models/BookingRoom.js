const mongoose = require('mongoose');

const bookingRoomSchema = new mongoose.Schema(
  {
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
      index: true,
    },
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: true,
    },
    roomNumber: {
      type: String,
      required: true,
      trim: true,
    },
    roomType: {
      type: String,
      required: true,
    },
    checkIn: {
      type: Date,
      required: true,
    },
    checkOut: {
      type: Date,
      required: true,
    },
    nights: {
      type: Number,
      required: true,
      min: 1,
    },
    pricePerNight: {
      type: Number,
      required: true,
      min: 0,
      // Snapshot of the price at time of booking (protects against
      // future price changes affecting historical bookings/invoices)
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
      // pricePerNight * nights
    },
    guestsCount: {
      adults: { type: Number, default: 1, min: 1 },
      children: { type: Number, default: 0, min: 0 },
    },
    status: {
      type: String,
      enum: ['reserved', 'confirmed', 'checked_in', 'checked_out', 'cancelled'],
      default: 'reserved',
    },
  },
  { timestamps: true }
);

bookingRoomSchema.index({ room: 1, checkIn: 1, checkOut: 1 });

module.exports = mongoose.model('BookingRoom', bookingRoomSchema);
