const { verifyToken } = require('../utils/jwt');
const prisma = require('../config/db');

// Verifies the bearer token and attaches the CURRENT database record for
// the user to req.user. We deliberately re-fetch on every request (instead
// of trusting the JWT payload) so that a role change or account
// deactivation by the admin takes effect immediately, not at next login.
async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');

    if (scheme !== 'Bearer' || !token) {
      return res.status(401).json({ error: 'Missing or malformed Authorization header' });
    }

    let payload;
    try {
      payload = verifyToken(token);
    } catch (err) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Account not found or deactivated' });
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

// Route guard factory: requireRole('admin'), requireRole('admin', 'manager'), etc.
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'You do not have permission to perform this action' });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
