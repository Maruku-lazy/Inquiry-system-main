const { z } = require('zod');
const prisma = require('../config/db');
const { verifyPassword } = require('../utils/password');
const { signToken } = require('../utils/jwt');
const { asyncHandler } = require('../middleware/errorHandler');
const { logActivity } = require('../utils/activityLog');

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function toSafeUser(user) {
  const { passwordHash, ...safe } = user;
  return safe;
}

// POST /auth/login
const login = asyncHandler(async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);

  const user = await prisma.user.findUnique({ where: { email } });

  // Same generic error whether the email doesn't exist or the password is
  // wrong — don't leak which one it was.
  if (!user || !user.isActive) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  // Record the login time. Fire-and-forget from the response's perspective
  // isn't appropriate here since we want the returned user object to
  // reflect it — so we await and use the updated record.
  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  const token = signToken(updatedUser);

  await logActivity({
    actorId: updatedUser.id,
    action: 'login',
    targetType: 'user',
    targetId: updatedUser.id,
    metadata: { name: updatedUser.name },
  });

  res.json({ token, user: toSafeUser(updatedUser) });
});

// POST /auth/logout
// JWTs are stateless, so there's no server-side session to invalidate in
// Phase 1. The client is responsible for discarding the token. (A token
// blacklist / refresh-token rotation can be added later if immediate
// server-side revocation becomes a requirement.)
const logout = asyncHandler(async (req, res) => {
  res.json({ message: 'Logged out' });
});

// GET /auth/me
const me = asyncHandler(async (req, res) => {
  res.json({ user: toSafeUser(req.user) });
});

module.exports = { login, logout, me, toSafeUser };
