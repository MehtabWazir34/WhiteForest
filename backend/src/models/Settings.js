const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema(
  {
    singletonKey: {
      type: String,
      default: 'GLOBAL_SETTINGS',
      unique: true,
      // Ensures only ONE settings document ever exists in the collection
    },
    advancePaymentRequired: {
      type: Boolean,
      default: true,
    },
    advancePaymentPercent: {
      type: Number,
      default: 30,
      min: 0,
      max: 100,
    },
    cancellationWindowMinutes: {
      type: Number,
      default: 20,
      min: 0,
    },
    defaultCurrency: {
      type: String,
      default: 'PKR',
    },
    supportedCurrencies: [
      {
        type: String,
        default: ['PKR', 'USD'],
      },
    ],
    supportedLanguages: [
      {
        type: String,
        default: ['en', 'ur'],
      },
    ],
    taxPercent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    paymentMethodsEnabled: {
      cashOnArrival: { type: Boolean, default: true },
      bankTransfer: { type: Boolean, default: true },
      jazzCash: { type: Boolean, default: false },
      easypaisa: { type: Boolean, default: false },
      raast: { type: Boolean, default: false },
      stripe: { type: Boolean, default: false },
      paypal: { type: Boolean, default: false },
    },
    hotelInfo: {
      name: { type: String, default: 'White Forest Hotel' },
      address: { type: String, default: 'Murree, Punjab, Pakistan' },
      phone: { type: String, default: '+92-300-0000000' },
      email: { type: String, default: 'info@whiteforest.com' },
      whatsappNumber: { type: String, default: '+92-300-0000000' },
      checkInTime: { type: String, default: '2:00 PM' },
      checkOutTime: { type: String, default: '12:00 PM' },
    },
    socialLinks: {
      facebook: { type: String, default: null },
      instagram: { type: String, default: null },
      whatsapp: { type: String, default: null },
      googleMaps: { type: String, default: null },
    },
    maintenanceMode: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Settings', settingsSchema);
