const mongoose = require('mongoose');

/**
 * RoomAvailability
 * -----------------
 * One document represents ONE room, on ONE specific calendar date.
 *
 * This collection is the SINGLE SOURCE OF TRUTH for whether a room can be
 * booked on a given night. Availability is NEVER derived from
 * (Room.totalUnits - countOfActiveBookings). Instead, every booking
 * creation/cancellation explicitly reads and writes rows in this collection,
 * using atomic findOneAndUpdate operations to prevent race conditions when
 * two guests try to book the same room/date simultaneously.
 *
 * Status lifecycle:
 *  - available   : open for booking
 *  - held        : temporarily reserved while guest completes checkout/payment
 *                   (auto-released by a background job if not confirmed in time)
 *  - booked      : confirmed booking, payment verified
 *  - maintenance : blocked by admin (cleaning, repairs, renovation)
 */
const roomAvailabilitySchema = new mongoose.Schema(
  {
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
    date: {
      type: Date,
      required: true,
      // Always normalized to midnight UTC for the given calendar day
      // so each date has exactly one document per room.
    },
    status: {
      type: String,
      enum: ['available', 'held', 'booked', 'maintenance'],
      default: 'available',
    },
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      default: null,
    },
    holdExpiresAt: {
      type: Date,
      default: null,
      // Set when status = 'held'. A background job (releaseExpiredHolds.js)
      // flips this back to 'available' if checkout/payment isn't completed in time.
    },
    overridePrice: {
      type: Number,
      default: null,
      // Optional per-date price override (seasonal pricing, promo pricing)
      // takes priority over Room.pricePerNight / Room.seasonalPricing when set.
    },
    blockedReason: {
      type: String,
      default: null,
      // Used when status = 'maintenance', e.g. "Plumbing repair"
    },
  },
  { timestamps: true }
);

// CRITICAL: one room can only have ONE availability record per calendar date.
// This unique compound index is what makes atomic upsert-based locking safe.
roomAvailabilitySchema.index({ room: 1, date: 1 }, { unique: true });

roomAvailabilitySchema.index({ date: 1, status: 1 });
roomAvailabilitySchema.index({ roomNumber: 1, date: 1 });

module.exports = mongoose.model('RoomAvailability', roomAvailabilitySchema);
