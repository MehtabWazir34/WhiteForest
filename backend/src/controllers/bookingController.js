const Booking = require('../models/Booking');
const BookingRoom = require('../models/BookingRoom');
const Cart = require('../models/Cart');
const bookingService = require('../services/bookingService');
const refundService = require('../services/refundService');
const invoiceService = require('../services/invoiceService');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @desc    Create a new booking (checkout)
 * @route   POST /api/bookings
 * @access  Guest (session created/reused via ensureGuestSession)
 * Body: { guestInfo, roomSelections, foodAmount?, couponCode?, discountAmount?, specialRequests? }
 */
const createBooking = asyncHandler(async (req, res) => {
  const { guestInfo, roomSelections, foodAmount, couponCode, discountAmount, specialRequests } = req.body;

  const { booking, bookingRooms } = await bookingService.createBooking({
    guestId: req.guestId,
    guestInfo,
    roomSelections,
    foodAmount: foodAmount || 0,
    couponCode: couponCode || null,
    discountAmount: discountAmount || 0,
    specialRequests: specialRequests || null,
    source: 'website',
  });

  // If the guest had an active cart, mark it converted so it's not reused
  await Cart.updateMany({ guestId: req.guestId, status: 'active' }, { status: 'converted' });

  return ApiResponse.success(res, 201, 'Booking created successfully. Please proceed to payment.', {
    booking,
    bookingRooms,
  });
});

/**
 * @desc    Get a single booking by ID (used right after checkout for summary/payment screen)
 * @route   GET /api/bookings/:id
 * @access  Guest (session required, must own the booking)
 */
const getBookingById = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);

  if (!booking) {
    return ApiResponse.error(res, 404, 'Booking not found');
  }

  if (booking.guestId !== req.guestId) {
    return ApiResponse.error(res, 403, 'You do not have access to this booking');
  }

  const bookingRooms = await BookingRoom.find({ booking: booking._id });

  return ApiResponse.success(res, 200, 'Booking fetched successfully', { booking, bookingRooms });
});

/**
 * @desc    Get all active bookings for the current guest session
 * @route   GET /api/bookings/my-active
 * @access  Guest (session required)
 */
const getMyActiveBookings = asyncHandler(async (req, res) => {
  const bookings = await Booking.find({
    guestId: req.guestId,
    status: { $in: ['pending_payment', 'confirmed', 'checked_in'] },
  }).sort({ createdAt: -1 });

  return ApiResponse.success(res, 200, 'Active bookings fetched successfully', bookings);
});

/**
 * @desc    Cancel a booking (guest-initiated, within allowed window). Triggers
 *          an automatic refund request if an online payment exists.
 * @route   POST /api/bookings/cancel
 * @access  Public (verified via Booking Reference + CNIC)
 * Body: { bookingReference, cnic, reason? }
 */
const cancelBooking = asyncHandler(async (req, res) => {
  const { bookingReference, cnic, reason } = req.body;

  const booking = await Booking.findOne({
    bookingReference: bookingReference.trim(),
    'guestInfo.cnic': cnic,
  });

  if (!booking) {
    return ApiResponse.error(res, 404, 'No booking found with the provided reference and CNIC');
  }

  const cancelledBooking = await bookingService.cancelBooking(booking._id, reason);

  const refund = await refundService.createAutomaticRefundRequest({
    guestId: booking.guestId,
    bookingId: booking._id,
  });

  return ApiResponse.success(res, 200, 'Booking cancelled successfully', {
    booking: cancelledBooking,
    refund,
  });
});

/**
 * @desc    Generate/fetch the invoice PDF for a confirmed booking
 * @route   POST /api/bookings/:id/invoice
 * @access  Guest (session required, must own the booking)
 */
const generateBookingInvoice = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);

  if (!booking) {
    return ApiResponse.error(res, 404, 'Booking not found');
  }

  if (booking.guestId !== req.guestId) {
    return ApiResponse.error(res, 403, 'You do not have access to this booking');
  }

  if (booking.paymentStatus !== 'paid') {
    return ApiResponse.error(res, 400, 'Invoice can only be generated after payment is confirmed');
  }

  const invoice = await invoiceService.generateInvoiceForBooking(booking._id);

  return ApiResponse.success(res, 201, 'Invoice generated successfully', invoice);
});

/**
 * @desc    Get all bookings (admin only), with optional status filter
 * @route   GET /api/admin/bookings
 * @access  Private (Admin)
 */
const adminGetAllBookings = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;

  const filter = {};
  if (status) filter.status = status;

  const skip = (Number(page) - 1) * Number(limit);

  const [bookings, total] = await Promise.all([
    Booking.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    Booking.countDocuments(filter),
  ]);

  return ApiResponse.success(res, 200, 'Bookings fetched successfully', bookings, {
    total,
    page: Number(page),
    limit: Number(limit),
    totalPages: Math.ceil(total / Number(limit)),
  });
});

/**
 * @desc    Get a single booking with full details (admin only)
 * @route   GET /api/admin/bookings/:id
 * @access  Private (Admin)
 */
const adminGetBookingById = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id);

  if (!booking) {
    return ApiResponse.error(res, 404, 'Booking not found');
  }

  const bookingRooms = await BookingRoom.find({ booking: booking._id });

  return ApiResponse.success(res, 200, 'Booking fetched successfully', { booking, bookingRooms });
});

/**
 * @desc    Update booking status (e.g. checked_in, checked_out, completed) - admin only
 * @route   PATCH /api/admin/bookings/:id/status
 * @access  Private (Admin)
 * Body: { status }
 */
const adminUpdateBookingStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const allowedStatuses = ['checked_in', 'checked_out', 'completed'];

  if (!allowedStatuses.includes(status)) {
    return ApiResponse.error(res, 400, `Status must be one of: ${allowedStatuses.join(', ')}`);
  }

  const booking = await Booking.findByIdAndUpdate(req.params.id, { status }, { new: true });

  if (!booking) {
    return ApiResponse.error(res, 404, 'Booking not found');
  }

  return ApiResponse.success(res, 200, 'Booking status updated successfully', booking);
});

module.exports = {
  createBooking,
  getBookingById,
  getMyActiveBookings,
  cancelBooking,
  generateBookingInvoice,
  adminGetAllBookings,
  adminGetBookingById,
  adminUpdateBookingStatus,
};
