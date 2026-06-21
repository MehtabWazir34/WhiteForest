/**
 * Wraps an async route handler so any thrown error or rejected promise
 * is automatically passed to Express's next() error handler.
 *
 * Usage:
 *   router.get('/rooms', asyncHandler(roomController.getRooms));
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
