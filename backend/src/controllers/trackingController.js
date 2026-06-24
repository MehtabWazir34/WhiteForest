const Booking = require('../models/Booking');
const BookingRoom = require('../models/BookingRoom');
const FoodOrder = require('../models/FoodOrder');
const FoodOrderItem = require('../models/FoodOrderItem');
const bookingService = require('../services/bookingService');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @desc    Track a booking using Booking Reference + CNIC (no login required)
 * @route   POST /api/tracking/booking
 * @access  Public
 * Body: { bookingReference, cnic }
 * Returns: Booking Status, Payment Status, Room Information, Cancellation Eligibility
 */
const trackBooking = asyncHandler(async (req, res) => {
  const { bookingReference, cnic } = req.body;

  const booking = await Booking.findOne({
    bookingReference: bookingReference.trim(),
    'guestInfo.cnic': cnic,
  });

  if (!booking) {
    return ApiResponse.error(res, 404, 'No booking found with the provided reference and CNIC');
  }

  const bookingRooms = await BookingRoom.find({ booking: booking._id });

  return ApiResponse.success(res, 200, 'Booking found', {
    bookingReference: booking.bookingReference,
    status: booking.status,
    paymentStatus: booking.paymentStatus,
    checkIn: booking.checkIn,
    checkOut: booking.checkOut,
    totalAmount: booking.totalAmount,
    advanceAmountDue: booking.advanceAmountDue,
    remainingAmountDue: booking.remainingAmountDue,
    rooms: bookingRooms.map((r) => ({
      roomNumber: r.roomNumber,
      roomType: r.roomType,
      checkIn: r.checkIn,
      checkOut: r.checkOut,
      nights: r.nights,
      status: r.status,
    })),
    cancellationEligible: bookingService.isCancellationEligible(booking),
    cancellationEligibleUntil: booking.cancellationEligibleUntil,
  });
});

/**
 * @desc    Track food order(s) currently active for a given room number (no login required)
 * @route   POST /api/tracking/food-order/by-room
 * @access  Public
 * Body: { roomNumber }
 */
const trackFoodOrderByRoom = asyncHandler(async (req, res) => {
  const { roomNumber } = req.body;

  if (!roomNumber) {
    return ApiResponse.error(res, 400, 'Room number is required');
  }

  const orders = await FoodOrder.find({ roomNumber: roomNumber.trim() })
    .sort({ createdAt: -1 })
    .limit(10);

  if (!orders.length) {
    return ApiResponse.error(res, 404, 'No food orders found for this room number');
  }

  const ordersWithItems = await Promise.all(
    orders.map(async (order) => {
      const items = await FoodOrderItem.find({ foodOrder: order._id }).lean();
      return {
        orderReference: order.orderReference,
        status: order.status,
        paymentStatus: order.paymentStatus,
        totalAmount: order.totalAmount,
        estimatedDeliveryTime: order.estimatedDeliveryTime,
        deliveredAt: order.deliveredAt,
        createdAt: order.createdAt,
        items: items.map((i) => ({ name: i.name, quantity: i.quantity, subtotal: i.subtotal })),
      };
    })
  );

  return ApiResponse.success(res, 200, 'Food orders found for this room', ordersWithItems);
});

/**
 * @desc    Track a single food order by its Order Reference (no login required)
 * @route   POST /api/tracking/food-order/by-reference
 * @access  Public
 * Body: { orderReference }
 */
const trackFoodOrderByReference = asyncHandler(async (req, res) => {
  const { orderReference } = req.body;

  if (!orderReference) {
    return ApiResponse.error(res, 400, 'Order reference is required');
  }

  const order = await FoodOrder.findOne({ orderReference: orderReference.trim() });

  if (!order) {
    return ApiResponse.error(res, 404, 'No food order found with the provided reference');
  }

  const items = await FoodOrderItem.find({ foodOrder: order._id }).lean();

  return ApiResponse.success(res, 200, 'Food order found', {
    orderReference: order.orderReference,
    status: order.status,
    paymentStatus: order.paymentStatus,
    roomNumber: order.roomNumber,
    deliveryType: order.deliveryType,
    totalAmount: order.totalAmount,
    estimatedDeliveryTime: order.estimatedDeliveryTime,
    deliveredAt: order.deliveredAt,
    createdAt: order.createdAt,
    items: items.map((i) => ({ name: i.name, quantity: i.quantity, subtotal: i.subtotal })),
  });
});

module.exports = {
  trackBooking,
  trackFoodOrderByRoom,
  trackFoodOrderByReference,
};
