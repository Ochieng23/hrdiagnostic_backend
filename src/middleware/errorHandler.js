/**
 * Global error handler middleware.
 * Must be registered AFTER all routes.
 */
function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  // Log in development
  if (process.env.NODE_ENV !== 'production') {
    console.error('[Error]', err);
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      success: false,
      error: {
        message: messages.join('; '),
        code: 'VALIDATION_ERROR',
        details: messages,
      },
    });
  }

  // Mongoose cast error (invalid ObjectId etc.)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      error: {
        message: `Invalid value for field '${err.path}': ${err.value}`,
        code: 'CAST_ERROR',
      },
    });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return res.status(409).json({
      success: false,
      error: {
        message: `Duplicate value for '${field}'`,
        code: 'DUPLICATE_KEY',
      },
    });
  }

  // Express body-parser errors (malformed JSON)
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Malformed JSON in request body',
        code: 'PARSE_ERROR',
      },
    });
  }

  // Custom application errors with a statusCode
  if (err.statusCode) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        message: err.message || 'An error occurred',
        code: err.code || 'APP_ERROR',
      },
    });
  }

  // Generic 500
  return res.status(500).json({
    success: false,
    error: {
      message: process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : (err.message || 'Internal server error'),
      code: 'INTERNAL_ERROR',
    },
  });
}

module.exports = errorHandler;
