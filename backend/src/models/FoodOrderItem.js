const mongoose = require('mongoose');

const foodOrderItemSchema = new mongoose.Schema(
  {
    foodOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FoodOrder',
      required: true,
      index: true,
    },
    foodItem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FoodItem',
      required: true,
    },
    name: {
      type: String,
      required: true,
      // Snapshot of item name at order time (protects history if item is renamed)
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
      // Snapshot of price at order time
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
      // unitPrice * quantity
    },
    specialInstructions: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('FoodOrderItem', foodOrderItemSchema);
