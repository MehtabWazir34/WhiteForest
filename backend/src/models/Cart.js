const mongoose = require('mongoose');

const cartRoomItemSchema = new mongoose.Schema(
  {
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: true,
    },
    roomNumber: { type: String, required: true },
    roomType: { type: String, required: true },
    checkIn: { type: Date, required: true },
    checkOut: { type: Date, required: true },
    nights: { type: Number, required: true, min: 1 },
    pricePerNight: { type: Number, required: true, min: 0 },
    quantity: { type: Number, default: 1, min: 1 },
    subtotal: { type: Number, required: true, min: 0 },
  },
  { _id: true }
);

const cartFoodItemSchema = new mongoose.Schema(
  {
    foodItem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FoodItem',
      required: true,
    },
    name: { type: String, required: true },
    unitPrice: { type: Number, required: true, min: 0 },
    quantity: { type: Number, default: 1, min: 1 },
    subtotal: { type: Number, required: true, min: 0 },
    specialInstructions: { type: String, default: null },
  },
  { _id: true }
);

const cartSchema = new mongoose.Schema(
  {
    guestId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      // One active cart per guest session
    },
    rooms: [cartRoomItemSchema],
    foodItems: [cartFoodItemSchema],
    couponCode: {
      type: String,
      default: null,
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    grandTotal: {
      type: Number,
      default: 0,
      min: 0,
      // Sum of all room subtotals + food subtotals - discountAmount
      // Recalculated on every add/update/remove via cartService
    },
    status: {
      type: String,
      enum: ['active', 'converted', 'abandoned'],
      default: 'active',
      // 'converted' once checkout creates a Booking/FoodOrder from this cart
    },
    expiresAt: {
      type: Date,
      default: null,
      // Optional TTL for abandoned cart cleanup
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Cart', cartSchema);
