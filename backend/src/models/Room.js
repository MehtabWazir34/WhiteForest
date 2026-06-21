const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema(
  {
    roomNumber: {
      type: String,
      required: [true, 'Room number is required'],
      unique: true,
      trim: true,
    },
    roomType: {
      type: String,
      required: [true, 'Room type is required'],
      enum: ['Standard', 'Deluxe', 'VIP Suite', 'Family Room', 'Honeymoon Suite'],
    },
    title: {
      type: String,
      required: [true, 'Room title is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Room description is required'],
    },
    images: [
      {
        url: { type: String, required: true },
        alt: { type: String, default: '' },
      },
    ],
    pricePerNight: {
      type: Number,
      required: [true, 'Price per night is required'],
      min: 0,
    },
    seasonalPricing: [
      {
        label: { type: String }, // e.g. "Winter Season", "Eid Special"
        startDate: { type: Date },
        endDate: { type: Date },
        pricePerNight: { type: Number, min: 0 },
      },
    ],
    capacity: {
      adults: { type: Number, default: 2, min: 1 },
      children: { type: Number, default: 0, min: 0 },
    },
    bedType: {
      type: String,
      enum: ['Single', 'Double', 'Queen', 'King', 'Twin'],
      default: 'Double',
    },
    sizeSqft: {
      type: Number,
      default: null,
    },
    amenities: [
      {
        type: String, // e.g. "Free WiFi", "Mountain View", "AC", "Mini Bar"
      },
    ],
    floor: {
      type: Number,
      default: 1,
    },
    isActive: {
      type: Boolean,
      default: true, // soft-disable a room (renovation, decommission) without deleting it
    },
    isUnderMaintenance: {
      type: Boolean,
      default: false,
    },
    totalUnits: {
      type: Number,
      default: 1,
      min: 1,
      // NOTE: this is informational room-type inventory count only.
      // Actual date-by-date availability is governed by RoomAvailability,
      // never derived from (totalUnits - bookedCount).
    },
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    totalReviews: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

roomSchema.index({ roomType: 1, isActive: 1 });

module.exports = mongoose.model('Room', roomSchema);
