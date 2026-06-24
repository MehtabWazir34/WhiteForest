const Invoice = require('../models/Invoice');
const Booking = require('../models/Booking');
const FoodOrder = require('../models/FoodOrder');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @desc    Get the invoice for a booking (guest, must own the booking)
 * @route   GET /api/invoices/booking/:bookingId
 * @access  Guest (session required)
 */
const getInvoiceByBookingId = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.bookingId);
  if (!booking) return ApiResponse.error(res, 404, 'Booking not found');
  if (booking.guestId !== req.guestId) {
    return ApiResponse.error(res, 403, 'You do not have access to this booking');
  }

  const invoice = await Invoice.findOne({ booking: req.params.bookingId }).sort({ createdAt: -1 });

  if (!invoice) {
    return ApiResponse.error(res, 404, 'No invoice has been generated for this booking yet');
  }

  return ApiResponse.success(res, 200, 'Invoice fetched successfully', invoice);
});

/**
 * @desc    Get the invoice for a food order (guest, must own the order)
 * @route   GET /api/invoices/order/:orderId
 * @access  Guest (session required)
 */
const getInvoiceByOrderId = asyncHandler(async (req, res) => {
  const order = await FoodOrder.findById(req.params.orderId);
  if (!order) return ApiResponse.error(res, 404, 'Food order not found');
  if (order.guestId !== req.guestId) {
    return ApiResponse.error(res, 403, 'You do not have access to this order');
  }

  const invoice = await Invoice.findOne({ foodOrder: req.params.orderId }).sort({ createdAt: -1 });

  if (!invoice) {
    return ApiResponse.error(res, 404, 'No invoice has been generated for this order yet');
  }

  return ApiResponse.success(res, 200, 'Invoice fetched successfully', invoice);
});

/**
 * @desc    Verify an invoice by its number (public - this is what the QR code resolves to)
 * @route   GET /api/invoices/verify/:invoiceNumber
 * @access  Public
 */
const verifyInvoiceByNumber = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findOne({ invoiceNumber: req.params.invoiceNumber });

  if (!invoice) {
    return ApiResponse.error(res, 404, 'Invoice not found or invalid verification code');
  }

  // Return only verification-safe fields - not full guest PII
  return ApiResponse.success(res, 200, 'Invoice verified successfully', {
    invoiceNumber: invoice.invoiceNumber,
    guestName: invoice.guestSnapshot.fullName,
    totalAmount: invoice.totalAmount,
    issuedAt: invoice.issuedAt,
    hotelName: invoice.hotelInfoSnapshot.name,
    isValid: true,
  });
});

/**
 * @desc    Get all invoices (admin only)
 * @route   GET /api/admin/invoices
 * @access  Private (Admin)
 */
const adminGetAllInvoices = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const skip = (Number(page) - 1) * Number(limit);

  const [invoices, total] = await Promise.all([
    Invoice.find().sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    Invoice.countDocuments(),
  ]);

  return ApiResponse.success(res, 200, 'Invoices fetched successfully', invoices, {
    total,
    page: Number(page),
    limit: Number(limit),
    totalPages: Math.ceil(total / Number(limit)),
  });
});

module.exports = {
  getInvoiceByBookingId,
  getInvoiceByOrderId,
  verifyInvoiceByNumber,
  adminGetAllInvoices,
};
