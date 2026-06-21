class ApiResponse {
  static success(res, statusCode = 200, message = 'Success', data = null, meta = null) {
    const payload = {
      success: true,
      message,
    };

    if (data !== null) payload.data = data;
    if (meta !== null) payload.meta = meta;

    return res.status(statusCode).json(payload);
  }

  static error(res, statusCode = 500, message = 'Something went wrong', errors = null) {
    const payload = {
      success: false,
      message,
    };

    if (errors !== null) payload.errors = errors;

    return res.status(statusCode).json(payload);
  }
}

module.exports = ApiResponse;
