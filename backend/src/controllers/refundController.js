const Refund = require('../models/Refund');
const refundService = require('../services/refundService');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @desc    Get all refund requests for the current guest session
 * @route   GET /api/refunds/my-refunds
 * @access  Guest (session required)
 */
const getMyRefunds = asyncHandler(async (req, res) => {
  const refunds = await Refund.find({ guestId: req.guestId }).sort({ createdAt: -1 });
  return ApiResponse.success(res, 200, 'Refunds fetched successfully', refunds);
});

/**
 * @desc    Get a single refund by its reference (guest, must own it)
 * @route   GET /api/refunds/:refundReference
 * @access  Guest (session required)
 */
const getRefundByReference = asyncHandler(async (req, res) => {
  const refund = await Refund.findOne({ refundReference: req.params.refundReference });

  if (!refund) {
    return ApiResponse.error(res, 404, 'Refund not found');
  }

  if (refund.guestId !== req.guestId) {
    return ApiResponse.error(res, 403, 'You do not have access to this refund');
  }

  return ApiResponse.success(res, 200, 'Refund fetched successfully', refund);
});

/**
 * @desc    Get all refund requests (admin only), with optional status filter
 * @route   GET /api/admin/refunds
 * @access  Private (Admin)
 */
const adminGetAllRefunds = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const filter = status ? { status } : {};

  const refunds = await refundService.getAllRefundRequests(filter);
  return ApiResponse.success(res, 200, 'Refunds fetched successfully', refunds);
});

/**
 * @desc    Mark a refund request as processing (admin only)
 * @route   PATCH /api/admin/refunds/:id/processing
 * @access  Private (Admin)
 * Body: { notes? }
 */
const adminMarkProcessing = asyncHandler(async (req, res) => {
  const refund = await refundService.markRefundProcessing(req.params.id, req.admin._id, req.body.notes);
  return ApiResponse.success(res, 200, 'Refund marked as processing', refund);
});

/**
 * @desc    Mark a refund as completed (admin only)
 * @route   PATCH /api/admin/refunds/:id/complete
 * @access  Private (Admin)
 * Body: { transactionId?, notes? }
 */
const adminCompleteRefund = asyncHandler(async (req, res) => {
  const { transactionId, notes } = req.body;
  const refund = await refundService.completeRefund(req.params.id, { transactionId, notes });
  return ApiResponse.success(res, 200, 'Refund completed successfully', refund);
});

/**
 * @desc    Mark a refund as failed (admin only)
 * @route   PATCH /api/admin/refunds/:id/fail
 * @access  Private (Admin)
 * Body: { notes? }
 */
const adminMarkFailed = asyncHandler(async (req, res) => {
  const refund = await refundService.markRefundFailed(req.params.id, req.body.notes);
  return ApiResponse.success(res, 200, 'Refund marked as failed', refund);
});

module.exports = {
  getMyRefunds,
  getRefundByReference,
  adminGetAllRefunds,
  adminMarkProcessing,
  adminCompleteRefund,
  adminMarkFailed,
};
