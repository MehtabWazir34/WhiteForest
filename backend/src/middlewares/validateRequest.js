const { validationResult } = require('express-validator');
const ApiResponse = require('../utils/apiResponse');

/**
 * Runs after an array of express-validator check(...) rules on a route.
 * If validation fails, responds with 422 and a clean list of field errors.
 *
 * Usage:
 *   router.post('/booking', [cnicValidator, phoneValidator], validateRequest, controller.create);
 */
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((err) => ({
      field: err.path,
      message: err.msg,
    }));

    return ApiResponse.error(res, 422, 'Validation failed', formattedErrors);
  }

  return next();
};

module.exports = validateRequest;
