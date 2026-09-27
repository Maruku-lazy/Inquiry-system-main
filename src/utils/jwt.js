const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';

if (!JWT_SECRET) {
  // Fail loudly at startup rather than silently signing tokens with
  // `undefined` as the secret.
  throw new Error('JWT_SECRET is not set. Copy .env.example to .env and set one.');
}

function signToken(user) {
  // Keep the payload minimal — role/manager/leader are re-fetched fresh
  // from the DB on every request in the auth middleware, so a stale token
  // can't grant stale permissions (e.g. after a role change or deactivation).
  return jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

module.exports = { signToken, verifyToken };
