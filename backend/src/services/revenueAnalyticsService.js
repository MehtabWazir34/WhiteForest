const Payment = require('../models/Payment');
const Refund = require('../models/Refund');
const BookingRoom = require('../models/BookingRoom');
const FoodOrderItem = require('../models/FoodOrderItem');
const FoodOrder = require('../models/FoodOrder');

const getStartOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const getStartOfMonth = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
};

/**
 * getTotalRevenue
 */
const getTotalRevenue = async () => {
  const result = await Payment.aggregate([
    { $match: { paymentStatus: 'paid' } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);
  return result[0]?.total || 0;
};

/**
 * getTodayRevenue
 */
const getTodayRevenue = async () => {
  const result = await Payment.aggregate([
    { $match: { paymentStatus: 'paid', paidAt: { $gte: getStartOfToday() } } },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);
  return result[0]?.total || 0;
};

/**
 * getMonthlyRevenue
 * Returns an array of { month: 'YYYY-MM', total } for the last 12 months.
 */
const getMonthlyRevenue = async () => {
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
  twelveMonthsAgo.setDate(1);
  twelveMonthsAgo.setHours(0, 0, 0, 0);

  const result = await Payment.aggregate([
    { $match: { paymentStatus: 'paid', paidAt: { $gte: twelveMonthsAgo } } },
    {
      $group: {
        _id: { year: { $year: '$paidAt' }, month: { $month: '$paidAt' } },
        total: { $sum: '$amount' },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
  ]);

  return result.map((r) => ({
    month: `${r._id.year}-${String(r._id.month).padStart(2, '0')}`,
    total: r.total,
  }));
};

/**
 * getPendingPaymentsSummary
 */
const getPendingPaymentsSummary = async () => {
  const result = await Payment.aggregate([
    { $match: { paymentStatus: 'pending' } },
    { $group: { _id: null, count: { $sum: 1 }, total: { $sum: '$amount' } } },
  ]);
  return { count: result[0]?.count || 0, total: result[0]?.total || 0 };
};

/**
 * getRefundRequestsSummary
 */
const getRefundRequestsSummary = async () => {
  const result = await Refund.aggregate([
    { $match: { status: { $in: ['refund_requested', 'refund_processing'] } } },
    { $group: { _id: '$status', count: { $sum: 1 }, total: { $sum: '$amount' } } },
  ]);

  const summary = { refund_requested: { count: 0, total: 0 }, refund_processing: { count: 0, total: 0 } };
  result.forEach((r) => {
    summary[r._id] = { count: r.count, total: r.total };
  });
  return summary;
};

/**
 * getRevenueByRoomType
 */
const getRevenueByRoomType = async () => {
  const result = await BookingRoom.aggregate([
    { $match: { status: { $in: ['confirmed', 'checked_in', 'checked_out'] } } },
    { $group: { _id: '$roomType', total: { $sum: '$subtotal' }, count: { $sum: 1 } } },
    { $sort: { total: -1 } },
  ]);

  return result.map((r) => ({ roomType: r._id, total: r.total, bookingsCount: r.count }));
};

/**
 * getRevenueByFoodSales
 */
const getRevenueByFoodSales = async () => {
  const paidOrderIds = await FoodOrder.find({ paymentStatus: 'paid' }).select('_id').lean();
  const orderIds = paidOrderIds.map((o) => o._id);

  const result = await FoodOrderItem.aggregate([
    { $match: { foodOrder: { $in: orderIds } } },
    { $group: { _id: '$name', total: { $sum: '$subtotal' }, quantitySold: { $sum: '$quantity' } } },
    { $sort: { total: -1 } },
  ]);

  return result.map((r) => ({ itemName: r._id, total: r.total, quantitySold: r.quantitySold }));
};

/**
 * getDashboardSummary
 * Convenience aggregator that returns everything the admin dashboard needs in one call.
 */
const getDashboardSummary = async () => {
  const [
    totalRevenue,
    todayRevenue,
    monthlyRevenue,
    pendingPayments,
    refundRequests,
    revenueByRoomType,
    revenueByFoodSales,
  ] = await Promise.all([
    getTotalRevenue(),
    getTodayRevenue(),
    getMonthlyRevenue(),
    getPendingPaymentsSummary(),
    getRefundRequestsSummary(),
    getRevenueByRoomType(),
    getRevenueByFoodSales(),
  ]);

  return {
    totalRevenue,
    todayRevenue,
    monthlyRevenue,
    pendingPayments,
    refundRequests,
    revenueByRoomType,
    revenueByFoodSales,
  };
};

module.exports = {
  getTotalRevenue,
  getTodayRevenue,
  getMonthlyRevenue,
  getPendingPaymentsSummary,
  getRefundRequestsSummary,
  getRevenueByRoomType,
  getRevenueByFoodSales,
  getDashboardSummary,
};
