const mongoose = require('mongoose');
const RoomAvailability = require('../models/RoomAvailability');
const Room = require('../models/Room');

const DEFAULT_HOLD_MINUTES = 15;

/**
 * Normalizes a date to midnight UTC so each calendar day maps to exactly
 * one RoomAvailability document per room.
 */
const normalizeDate = (date) => {
  const d = new Date(date);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
};

/**
 * Builds an array of normalized dates for every night between checkIn
 * (inclusive) and checkOut (exclusive) - i.e. the nights actually stayed.
 */
const getDateRange = (checkIn, checkOut) => {
  const dates = [];
  const start = normalizeDate(checkIn);
  const end = normalizeDate(checkOut);

  const cursor = new Date(start);
  while (cursor < end) {
    dates.push(new Date(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
};

/**
 * checkRoomAvailability
 * Checks whether a single room is free ('available' status, or no document
 * exists yet meaning it has never been touched / defaults to available)
 * for every night in the given range.
 *
 * @returns {Promise<boolean>}
 */
const checkRoomAvailability = async (roomId, checkIn, checkOut) => {
  const dates = getDateRange(checkIn, checkOut);

  const blockingDocs = await RoomAvailability.find({
    room: roomId,
    date: { $in: dates },
    status: { $in: ['held', 'booked', 'maintenance'] },
  }).lean();

  return blockingDocs.length === 0;
};

/**
 * checkMultipleRoomsAvailability
 * Returns a map of roomId -> boolean availability for a batch of rooms,
 * useful for the room listing page's "X rooms left" counter.
 */
const checkMultipleRoomsAvailability = async (roomIds, checkIn, checkOut) => {
  const dates = getDateRange(checkIn, checkOut);

  const blockingDocs = await RoomAvailability.find({
    room: { $in: roomIds },
    date: { $in: dates },
    status: { $in: ['held', 'booked', 'maintenance'] },
  })
    .select('room')
    .lean();

  const blockedRoomIds = new Set(blockingDocs.map((doc) => doc.room.toString()));

  const result = {};
  roomIds.forEach((id) => {
    result[id.toString()] = !blockedRoomIds.has(id.toString());
  });
  return result;
};

/**
 * holdRoomDates
 * Atomically places a 'held' lock on every night of the stay for a room.
 * Uses findOneAndUpdate with a status filter so two simultaneous requests
 * can NEVER both succeed for the same room+date - the unique index plus
 * the conditional filter guarantees only one write wins per date.
 *
 * If ANY date in the range fails to lock (already held/booked/maintenance),
 * all dates that were successfully locked in this attempt are rolled back
 * immediately to avoid partial holds.
 *
 * @throws {Error} if the room is unavailable for any date in the range
 */
const holdRoomDates = async (roomId, checkIn, checkOut, bookingId, holdMinutes = DEFAULT_HOLD_MINUTES) => {
  const room = await Room.findById(roomId).lean();
  if (!room) {
    throw new Error('Room not found');
  }

  const dates = getDateRange(checkIn, checkOut);
  const holdExpiresAt = new Date(Date.now() + holdMinutes * 60 * 1000);
  const lockedDates = [];

  try {
    for (const date of dates) {
      // eslint-disable-next-line no-await-in-loop
      const result = await RoomAvailability.findOneAndUpdate(
        {
          room: roomId,
          date,
          status: { $nin: ['held', 'booked', 'maintenance'] },
        },
        {
          $set: {
            room: roomId,
            roomNumber: room.roomNumber,
            date,
            status: 'held',
            booking: bookingId,
            holdExpiresAt,
          },
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        }
      );

      if (!result) {
        throw new Error(`Room ${room.roomNumber} is no longer available on ${date.toISOString().slice(0, 10)}`);
      }

      lockedDates.push(date);
    }

    return { success: true, lockedDates };
  } catch (error) {
    // Roll back any dates this attempt managed to lock before the failure
    if (lockedDates.length > 0) {
      await RoomAvailability.updateMany(
        {
          room: roomId,
          date: { $in: lockedDates },
          booking: bookingId,
          status: 'held',
        },
        {
          $set: { status: 'available', booking: null, holdExpiresAt: null },
        }
      );
    }
    throw error;
  }
};

/**
 * confirmRoomDates
 * Flips 'held' -> 'booked' for every date tied to a booking, called once
 * payment has been verified. Clears holdExpiresAt since it's now permanent
 * until checkout/cancellation.
 */
const confirmRoomDates = async (bookingId) => {
  await RoomAvailability.updateMany(
    { booking: bookingId, status: 'held' },
    { $set: { status: 'booked', holdExpiresAt: null } }
  );
};

/**
 * releaseRoomDates
 * Releases all RoomAvailability rows tied to a booking back to 'available'.
 * Used on cancellation, expiry, or rollback.
 */
const releaseRoomDates = async (bookingId) => {
  await RoomAvailability.updateMany(
    { booking: bookingId, status: { $in: ['held', 'booked'] } },
    { $set: { status: 'available', booking: null, holdExpiresAt: null } }
  );
};

/**
 * blockForMaintenance
 * Admin-initiated block of a room for a date range (cleaning, repairs).
 */
const blockForMaintenance = async (roomId, startDate, endDate, reason) => {
  const room = await Room.findById(roomId).lean();
  if (!room) {
    throw new Error('Room not found');
  }

  const dates = getDateRange(startDate, endDate);

  const operations = dates.map((date) => ({
    updateOne: {
      filter: { room: roomId, date },
      update: {
        $set: {
          room: roomId,
          roomNumber: room.roomNumber,
          date,
          status: 'maintenance',
          blockedReason: reason || 'Maintenance',
        },
      },
      upsert: true,
    },
  }));

  await RoomAvailability.bulkWrite(operations);
};

/**
 * unblockMaintenance
 * Reverts maintenance-blocked dates back to available.
 */
const unblockMaintenance = async (roomId, startDate, endDate) => {
  const dates = getDateRange(startDate, endDate);
  await RoomAvailability.updateMany(
    { room: roomId, date: { $in: dates }, status: 'maintenance' },
    { $set: { status: 'available', blockedReason: null } }
  );
};

/**
 * getRoomAvailabilityCalendar
 * Returns availability rows for a room within a date range, for the
 * admin calendar widget.
 */
const getRoomAvailabilityCalendar = async (roomId, startDate, endDate) => {
  return RoomAvailability.find({
    room: roomId,
    date: { $gte: normalizeDate(startDate), $lte: normalizeDate(endDate) },
  })
    .sort({ date: 1 })
    .lean();
};

module.exports = {
  normalizeDate,
  getDateRange,
  checkRoomAvailability,
  checkMultipleRoomsAvailability,
  holdRoomDates,
  confirmRoomDates,
  releaseRoomDates,
  blockForMaintenance,
  unblockMaintenance,
  getRoomAvailabilityCalendar,
};
