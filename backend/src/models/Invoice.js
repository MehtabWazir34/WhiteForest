const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      // Format: INV-2026-00123
    },
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      default: null,
    },
    foodOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FoodOrder',
      default: null,
    },
    guestSnapshot: {
      cnic: { type: String, required: true },
      fullName: { type: String, required: true },
      contactNumber: { type: String, required: true },
      email: { type: String, default: null },
      address: { type: String, default: null },
    },
    roomDetailsSnapshot: [
      {
        roomNumber: String,
        roomType: String,
        checkIn: Date,
        checkOut: Date,
        nights: Number,
        pricePerNight: Number,
        subtotal: Number,
      },
    ],
    foodItemsSnapshot: [
      {
        name: String,
        unitPrice: Number,
        quantity: Number,
        subtotal: Number,
      },
    ],
    paymentDetailsSnapshot: {
      paymentMethod: String,
      transactionId: String,
      amountPaid: Number,
      advancePaymentPercent: Number,
      remainingAmountDue: Number,
      paidAt: Date,
    },
    hotelInfoSnapshot: {
      name: { type: String, required: true },
      address: { type: String, required: true },
      phone: { type: String, required: true },
      email: { type: String, required: true },
    },
    subtotalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    taxAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    qrCodeData: {
      type: String,
      default: null,
      // Encoded verification string/URL embedded in the QR code
    },
    pdfUrl: {
      type: String,
      default: null,
      // Path/URL to the generated PDF file
    },
    issuedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

invoiceSchema.index({ booking: 1 });
invoiceSchema.index({ foodOrder: 1 });

module.exports = mongoose.model('Invoice', invoiceSchema);
