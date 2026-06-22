const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const BookingRoom = require('../models/BookingRoom');
const Room = require('../models/Room');
const Settings = require('../models/Settings');
const env = require('../config/env');
const availabilityService = require('./availabilityService');
const referenceGeneratorService = require('./referenceGeneratorService');
const notificationService = require('./notificationService');

/**
 * getActiveSettings
 * Fetches the singleton Settings doc, falling back to env defaults if not yet created.
 */
const getActiveSettings = async () => {
  const settings = await Settings.findOne({ singletonKey: 'GLOBAL_SETTINGS' }).lean();
  if (settings) return settings;
  return {
    advancePaymentRequired: true,
    advancePaymentPercent: env.DEFAULT_ADVANCE_PAYMENT_PERCENT,
    cancellationWindowMinutes: env.CANCELLATION_WINDOW_MINUTES,
    taxPercent: 0,
  };
};

/**
 * calculateNights
 */
const calculateNights = (checkIn, checkOut) => {
  const msPerDay = 1000 * 60 * 60 * 24;
  const nights = Math.round((new Date(checkOut) - new Date(checkIn)) / msPerDay);
  if (nights < 1) {
    throw new Error('Check-out date must be at least one night after check-in date');
  }
  return nights;
};

/**
 * createBooking
 * roomSelections: [{ roomId, checkIn, checkOut, guestsCount: { adults, children } }]
 * guestInfo: { cnic, fullName, contactNumber, email, address }
 * Holds availability for every room/date combination atomically. If any
 * room fails to lock, all previously locked rooms in this request are
 * released before throwing.
 */
const createBooking = async ({ guestId, guestInfo, roomSelections, foodAmount = 0, couponCode = null, discountAmount = 0, specialRequests = null, source = 'website' }) => {
  if (!roomSelections || roomSelections.length === 0) {
    throw new Error('At least one room selection is required');
  }

  const settings = await getActiveSettings();
  const bookingReference = await referenceGeneratorService.generateBookingReference();

  const overallCheckIn = roomSelections.reduce(
    (min, r) => (new Date(r.checkIn) < min ? new Date(r.checkIn) : min),
    new Date(roomSelections[0].checkIn)
  );
  const overallCheckOut = roomSelections.reduce(
    (max, r) => (new Date(r.checkOut) > max ? new Date(r.checkOut) : max),
    new Date(roomSelections[0].checkOut)
  );

  const heldRoomIds = [];
  let subtotalAmount = 0;
  const bookingRoomDocs = [];

  // Create the Booking shell first so we have an ID to attach holds to
  const cancellationEligibleUntil = new Date(
    Date.now() + settings.cancellationWindowMinutes * 60 * 1000
  );

  const booking = await Booking.create({
    bookingReference,
    guestId,
    guestInfo,
    checkIn: overallCheckIn,
    checkOut: overallCheckOut,
    totalNights: calculateNights(overallCheckIn, overallCheckOut),
    roomsCount: roomSelections.length,
    subtotalAmount: 0, // patched below
    foodAmount,
    discountAmount,
    couponCode,
    totalAmount: 0, // patched below
    advancePaymentRequired: settings.advancePaymentRequired,
    advancePaymentPercent: settings.advancePaymentPercent,
    cancellationEligibleUntil,
    specialRequests,
    source,
    status: 'pending_payment',
  });

  try {
    for (const selection of roomSelections) {
      const room = await Room.findById(selection.roomId).lean();
      if (!room || !room.isActive) {
        throw new Error('Selected room is not available for booking');
      }

      const isFree = await availabilityService.checkRoomAvailability(
        selection.roomId,
        selection.checkIn,
        selection.checkOut
      );

      if (!isFree) {
        throw new Error(`Room ${room.roomNumber} is no longer available for the selected dates`);
      }

      await availabilityService.holdRoomDates(
        selection.roomId,
        selection.checkIn,
        selection.checkOut,
        booking._id
      );
      heldRoomIds.push(selection.roomId);

      const nights = calculateNights(selection.checkIn, selection.checkOut);
      const pricePerNight = room.pricePerNight;
      const subtotal = pricePerNight * nights;
      subtotalAmount += subtotal;

      bookingRoomDocs.push({
        booking: booking._id,
        room: room._id,
        roomNumber: room.roomNumber,
        roomType: room.roomType,
        checkIn: selection.checkIn,
        checkOut: selection.checkOut,
        nights,
        pricePerNight,
        subtotal,
        guestsCount: selection.guestsCount || { adults: 1, children: 0 },
        status: 'reserved',
      });
    }

    await BookingRoom.insertMany(bookingRoomDocs);

    const taxAmount = Math.round((subtotalAmount * (settings.taxPercent || 0)) / 100);
    const totalAmount = subtotalAmount + foodAmount + taxAmount - discountAmount;
    const advanceAmountDue = settings.advancePaymentRequired
      ? Math.round((totalAmount * settings.advancePaymentPercent) / 100)
      : totalAmount;
    const remainingAmountDue = totalAmount - advanceAmountDue;

    booking.subtotalAmount = subtotalAmount;
    booking.taxAmount = taxAmount;
    booking.totalAmount = totalAmount;
    booking.advanceAmountDue = advanceAmountDue;
    booking.remainingAmountDue = remainingAmountDue;
    await booking.save();

    await notificationService.notifyAllAdmins({
      type: 'new_booking_admin_alert',
      title: 'New Booking Received',
      message: `A new booking ${booking.bookingReference} was created and is awaiting payment.`,
      bookingId: booking._id,
    });

    return { booking, bookingRooms: bookingRoomDocs };
  } catch (error) {
    // Roll back: release any rooms we already held, delete the booking shell
    for (const roomId of heldRoomIds) {
      // eslint-disable-next-line no-await-in-loop
      await availabilityService.releaseRoomDates(booking._id);
    }
    await BookingRoom.deleteMany({ booking: booking._id });
    await Booking.findByIdAndDelete(booking._id);
    throw error;
  }
};

/**
 * confirmBookingAfterPayment
 * Called once Payment status flips to 'paid' (verified). Confirms the
 * RoomAvailability holds permanently and updates the booking status.
 */
const confirmBookingAfterPayment = async (bookingId) => {
  const booking = await Booking.findById(bookingId);
  if (!booking) throw new Error('Booking not found');

  await availabilityService.confirmRoomDates(bookingId);

  booking.status = 'confirmed';
  booking.paymentStatus = 'paid';
  await booking.save();

  await BookingRoom.updateMany({ booking: bookingId }, { $set: { status: 'confirmed' } });

  await notificationService.notifyGuest({
    guestId: booking.guestId,
    type: 'booking_confirmed',
    title: 'Booking Confirmed',
    message: `Your booking ${booking.bookingReference} has been confirmed. We look forward to hosting you!`,
    bookingId: booking._id,
  });

  return booking;
};

/**
 * isCancellationEligible
 */
const isCancellationEligible = (booking) => {
  return !booking.isCancelled && new Date() <= new Date(booking.cancellationEligibleUntil);
};

/**
 * cancelBooking
 * Releases RoomAvailability holds, marks booking cancelled. Refund
 * initiation (if an online payment exists) is handled by refundService,
 * called from the controller after this resolves.
 */
const cancelBooking = async (bookingId, reason = null) => {
  const booking = await Booking.findById(bookingId);
  if (!booking) throw new Error('Booking not found');

  if (booking.isCancelled) {
    throw new Error('Booking is already cancelled');
  }

  if (!isCancellationEligible(booking)) {
    throw new Error('Cancellation window has expired for this booking');
  }

  await availabilityService.releaseRoomDates(bookingId);
  await BookingRoom.updateMany({ booking: bookingId }, { $set: { status: 'cancelled' } });

  booking.status = 'cancelled';
  booking.isCancelled = true;
  booking.cancelledAt = new Date();
  booking.cancellationReason = reason;
  await booking.save();

  await notificationService.notifyGuest({
    guestId: booking.guestId,
    type: 'booking_cancelled',
    title: 'Booking Cancelled',
    message: `Your booking ${booking.bookingReference} has been cancelled as requested.`,
    bookingId: booking._id,
  });

  return booking;
};

module.exports = {
  getActiveSettings,
  calculateNights,
  createBooking,
  confirmBookingAfterPayment,
  isCancellationEligible,
  cancelBooking,
};
