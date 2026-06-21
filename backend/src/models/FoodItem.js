const mongoose = require('mongoose');

const foodItemSchema = new mongoose.Schema(
  {
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FoodCategory',
      required: true,
    },
    name: {
      type: String,
      required: [true, 'Food item name is required'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    image: {
      type: String,
      default: null,
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: 0,
    },
    discountedPrice: {
      type: Number,
      default: null,
      min: 0,
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    isVegetarian: {
      type: Boolean,
      default: false,
    },
    spiceLevel: {
      type: String,
      enum: ['none', 'mild', 'medium', 'hot'],
      default: 'none',
    },
    prepTimeMinutes: {
      type: Number,
      default: 20,
      min: 1,
    },
    tags: [
      {
        type: String, // e.g. "Bestseller", "Chef Special", "New"
      },
    ],
    sortOrder: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

foodItemSchema.index({ category: 1, isAvailable: 1 });
foodItemSchema.index({ name: 'text', description: 'text' });

module.exports = mongoose.model('FoodItem', foodItemSchema);
