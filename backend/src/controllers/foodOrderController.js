const FoodOrder = require('../models/FoodOrder');
const FoodOrderItem = require('../models/FoodOrderItem');
const FoodItem = require('../models/FoodItem');
const Cart = require('../models/Cart');
const Coupon = require('../models/Coupon');
const referenceGeneratorService = require('../services/referenceGeneratorService');
const refundService = require('../services/refundService');
const notificationService = require('../services/notificationService');
const invoiceService = require('../services/invoiceService');
const env = require('../config/env');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @desc    Place a new food order
 * @route   POST /api/food-orders
 * @access  Guest (session created/reused via ensureGuestSession)
 * Body: { guestInfo, items: [{ foodItemId, quantity, specialInstructions? }],
 *         roomNumber?, bookingId?, deliveryType?, couponCode? }
 */
const createFoodOrder = asyncHandler(async (req, res) => {
  const { guestInfo, items, roomNumber, bookingId, deliveryType, couponCode } = req.body;

  if (!items || items.length === 0) {
    return ApiResponse.error(res, 400, 'At least one food item is required');
  }

  let subtotalAmount = 0;
  const orderItemDocs = [];

  for (const entry of items) {
    const foodItem = await FoodItem.findById(entry.foodItemId);
    if (!foodItem || !foodItem.isAvailable) {
      return ApiResponse.error(res, 404, `Food item ${entry.foodItemId} not found or unavailable`);
    }

    const unitPrice = foodItem.discountedPrice || foodItem.price;
    const quantity = entry.quantity || 1;
    const subtotal = unitPrice * quantity;
    subtotalAmount += subtotal;

    orderItemDocs.push({
      name: foodItem.name,
      unitPrice,
      quantity,
      subtotal,
      specialInstructions: entry.specialInstructions || null,
      foodItemId: foodItem._id,
    });
  }

  let discountAmount = 0;
  if (couponCode) {
    const coupon = await Coupon.findOne({ code: couponCode.toUpperCase().trim(), isActive: true });
    if (coupon && coupon.applicableTo !== 'room') {
      const now = new Date();
      if (now >= coupon.validFrom && now <= coupon.validUntil) {
        if (coupon.usageLimit === null || coupon.usedCount < coupon.usageLimit) {
          if (subtotalAmount >= coupon.minOrderAmount) {
            discountAmount =
              coupon.discountType === 'percentage'
                ? Math.round((subtotalAmount * coupon.discountValue) / 100)
                : coupon.discountValue;
            if (coupon.maxDiscountAmount !== null) {
              discountAmount = Math.min(discountAmount, coupon.maxDiscountAmount);
            }
            coupon.usedCount += 1;
            await coupon.save();
          }
        }
      }
    }
  }

  const totalAmount = subtotalAmount - discountAmount;
  const orderReference = await referenceGeneratorService.generateFoodOrderReference();

  const order = await FoodOrder.create({
    orderReference,
    guestId: req.guestId,
    guestInfo,
    booking: bookingId || null,
    roomNumber: roomNumber || null,
    deliveryType: deliveryType || 'room_delivery',
    subtotalAmount,
    discountAmount,
    couponCode: couponCode || null,
    totalAmount,
    status: 'placed',
    paymentStatus: 'pending',
  });

  const orderItems = await FoodOrderItem.insertMany(
    orderItemDocs.map((doc) => ({
      foodOrder: order._id,
      foodItem: doc.foodItemId,
      name: doc.name,
      unitPrice: doc.unitPrice,
      quantity: doc.quantity,
      subtotal: doc.subtotal,
      specialInstructions: doc.specialInstructions,
    }))
  );

  await Cart.updateMany({ guestId: req.guestId, status: 'active' }, { status: 'converted' });

  await notificationService.notifyAllAdmins({
    type: 'food_order_placed',
    title: 'New Food Order',
    message: `A new food order ${order.orderReference} has been placed.`,
    foodOrderId: order._id,
  });

  return ApiResponse.success(res, 201, 'Food order placed successfully', { order, orderItems });
});

/**
 * @desc    Get a single food order by ID (guest, must own it)
 * @route   GET /api/food-orders/:id
 * @access  Guest (session required)
 */
const getFoodOrderById = asyncHandler(async (req, res) => {
  const order = await FoodOrder.findById(req.params.id);

  if (!order) {
    return ApiResponse.error(res, 404, 'Food order not found');
  }

  if (order.guestId !== req.guestId) {
    return ApiResponse.error(res, 403, 'You do not have access to this order');
  }

  const orderItems = await FoodOrderItem.find({ foodOrder: order._id });

  return ApiResponse.success(res, 200, 'Food order fetched successfully', { order, orderItems });
});

/**
 * @desc    Get all active food orders for the current guest session
 * @route   GET /api/food-orders/my-active
 * @access  Guest (session required)
 */
const getMyActiveFoodOrders = asyncHandler(async (req, res) => {
  const orders = await FoodOrder.find({
    guestId: req.guestId,
    status: { $nin: ['delivered', 'cancelled'] },
  }).sort({ createdAt: -1 });

  return ApiResponse.success(res, 200, 'Active food orders fetched successfully', orders);
});

/**
 * @desc    Cancel a food order (guest-initiated, within allowed window).
 *          Triggers an automatic refund request if an online payment exists.
 * @route   POST /api/food-orders/cancel
 * @access  Public (verified via Order Reference + CNIC)
 * Body: { orderReference, cnic, reason? }
 */
const cancelFoodOrder = asyncHandler(async (req, res) => {
  const { orderReference, cnic, reason } = req.body;

  const order = await FoodOrder.findOne({
    orderReference: orderReference.trim(),
    'guestInfo.cnic': cnic,
  });

  if (!order) {
    return ApiResponse.error(res, 404, 'No food order found with the provided reference and CNIC');
  }

  if (order.isCancelled) {
    return ApiResponse.error(res, 400, 'This order is already cancelled');
  }

  if (['on_the_way', 'delivered'].includes(order.status)) {
    return ApiResponse.error(res, 400, 'This order can no longer be cancelled as it is already out for delivery or delivered');
  }

  const cancellationDeadline = new Date(
    new Date(order.createdAt).getTime() + env.CANCELLATION_WINDOW_MINUTES * 60 * 1000
  );

  if (new Date() > cancellationDeadline) {
    return ApiResponse.error(res, 400, 'Cancellation window has expired for this order');
  }

  order.status = 'cancelled';
  order.isCancelled = true;
  order.cancelledAt = new Date();
  order.cancellationReason = reason || null;
  await order.save();

  const refund = await refundService.createAutomaticRefundRequest({
    guestId: order.guestId,
    orderId: order._id,
  });

  return ApiResponse.success(res, 200, 'Food order cancelled successfully', { order, refund });
});

/**
 * @desc    Generate the invoice PDF for a paid food order
 * @route   POST /api/food-orders/:id/invoice
 * @access  Guest (session required, must own the order)
 */
const generateFoodOrderInvoice = asyncHandler(async (req, res) => {
  const order = await FoodOrder.findById(req.params.id);

  if (!order) {
    return ApiResponse.error(res, 404, 'Food order not found');
  }

  if (order.guestId !== req.guestId) {
    return ApiResponse.error(res, 403, 'You do not have access to this order');
  }

  if (order.paymentStatus !== 'paid') {
    return ApiResponse.error(res, 400, 'Invoice can only be generated after payment is confirmed');
  }

  const invoice = await invoiceService.generateInvoiceForFoodOrder(order._id);

  return ApiResponse.success(res, 201, 'Invoice generated successfully', invoice);
});

/**
 * @desc    Get all food orders (admin only), with optional status filter
 * @route   GET /api/admin/food-orders
 * @access  Private (Admin)
 */
const adminGetAllFoodOrders = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;

  const filter = {};
  if (status) filter.status = status;

  const skip = (Number(page) - 1) * Number(limit);

  const [orders, total] = await Promise.all([
    FoodOrder.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    FoodOrder.countDocuments(filter),
  ]);

  return ApiResponse.success(res, 200, 'Food orders fetched successfully', orders, {
    total,
    page: Number(page),
    limit: Number(limit),
    totalPages: Math.ceil(total / Number(limit)),
  });
});

/**
 * @desc    Update food order status (preparing/cooking/on_the_way/delivered) - admin only
 * @route   PATCH /api/admin/food-orders/:id/status
 * @access  Private (Admin)
 * Body: { status }
 */
const adminUpdateFoodOrderStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const allowedStatuses = ['preparing', 'cooking', 'on_the_way', 'delivered'];

  if (!allowedStatuses.includes(status)) {
    return ApiResponse.error(res, 400, `Status must be one of: ${allowedStatuses.join(', ')}`);
  }

  const order = await FoodOrder.findById(req.params.id);

  if (!order) {
    return ApiResponse.error(res, 404, 'Food order not found');
  }

  order.status = status;
  if (status === 'delivered') {
    order.deliveredAt = new Date();
  }
  await order.save();

  await notificationService.notifyGuest({
    guestId: order.guestId,
    type: 'food_order_status_update',
    title: 'Order Status Updated',
    message: `Your food order ${order.orderReference} is now: ${status.replace('_', ' ')}.`,
    foodOrderId: order._id,
  });

  return ApiResponse.success(res, 200, 'Food order status updated successfully', order);
});

module.exports = {
  createFoodOrder,
  getFoodOrderById,
  getMyActiveFoodOrders,
  cancelFoodOrder,
  generateFoodOrderInvoice,
  adminGetAllFoodOrders,
  adminUpdateFoodOrderStatus,
};
