const Notification = require('../models/Notification');
const User = require('../models/User');

/**
 * notifyGuest
 * Creates a notification tied to a guestId (no login required - the guest
 * sees it when they revisit using their guest token).
 */
const notifyGuest = async ({ guestId, type, title, message, bookingId = null, foodOrderId = null }) => {
  return Notification.create({
    recipientType: 'guest',
    guestId,
    type,
    title,
    message,
    relatedBooking: bookingId,
    relatedFoodOrder: foodOrderId,
  });
};

/**
 * notifyAllAdmins
 * Creates a notification for every active admin user (e.g. new booking alert,
 * new refund request, new review pending moderation).
 */
const notifyAllAdmins = async ({ type, title, message, bookingId = null, foodOrderId = null }) => {
  const admins = await User.find({ isActive: true }).select('_id').lean();

  if (!admins.length) return [];

  const docs = admins.map((admin) => ({
    recipientType: 'admin',
    admin: admin._id,
    type,
    title,
    message,
    relatedBooking: bookingId,
    relatedFoodOrder: foodOrderId,
  }));

  return Notification.insertMany(docs);
};

/**
 * markAsRead
 */
const markAsRead = async (notificationId) => {
  return Notification.findByIdAndUpdate(
    notificationId,
    { isRead: true, readAt: new Date() },
    { new: true }
  );
};

/**
 * getGuestNotifications
 */
const getGuestNotifications = async (guestId, limit = 20) => {
  return Notification.find({ recipientType: 'guest', guestId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
};

/**
 * getAdminNotifications
 */
const getAdminNotifications = async (adminId, limit = 50) => {
  return Notification.find({ recipientType: 'admin', admin: adminId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
};

module.exports = {
  notifyGuest,
  notifyAllAdmins,
  markAsRead,
  getGuestNotifications,
  getAdminNotifications,
};
