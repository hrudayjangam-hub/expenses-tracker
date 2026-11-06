const ApiError = require('../utils/ApiError');

/**
 * Validates req[source] against a zod schema and stores the parsed value
 * on req.valid[source] so controllers only ever see sanitized data.
 */
const validate = (schema, source = 'body') => (req, _res, next) => {
  const result = schema.safeParse(req[source] ?? {});
  if (!result.success) {
    const details = result.error.errors.reduce((acc, e) => {
      const key = e.path.join('.') || '_';
      acc[key] = e.message;
      return acc;
    }, {});
    return next(new ApiError(400, 'Validation failed', details));
  }
  req.valid = req.valid || {};
  req.valid[source] = result.data;
  return next();
};

module.exports = validate;
