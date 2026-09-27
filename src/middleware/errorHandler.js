const { ZodError } = require('zod');

// Placed after all routes in index.js. Keeps error shape/handling out of
// every controller so controllers can just `next(err)` or throw inside
// async handlers wrapped with asyncHandler.
function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Validation failed',
      details: err.errors.map((e) => ({ path: e.path.join('.'), message: e.message })),
    });
  }

  if (err && err.code === 'P2002') {
    // Prisma unique constraint violation
    return res.status(409).json({ error: 'A record with that value already exists (e.g. email in use)' });
  }

  if (err && err.code === 'P2025') {
    // Prisma "record not found" on update/delete
    return res.status(404).json({ error: 'Record not found' });
  }

  console.error(err);
  res.status(err.status || 500).json({ error: err.expose ? err.message : 'Internal server error' });
}

// Wraps an async route handler so rejected promises reach errorHandler
// instead of crashing the process.
function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

module.exports = { errorHandler, asyncHandler };
