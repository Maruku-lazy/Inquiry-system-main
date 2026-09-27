const prisma = require('../config/db');

// Fire-and-record helper for Logs -> Activity. Called from controllers
// after a successful write — never blocks the main response if it fails
// (a logging failure shouldn't fail the user's actual request), but is
// awaited so ordering/tests are deterministic.
async function logActivity({ actorId, action, targetType, targetId, metadata }) {
  try {
    await prisma.activityLog.create({
      data: { actorId, action, targetType, targetId, metadata: metadata ?? undefined },
    });
  } catch (err) {
    // Deliberately swallowed — see comment above. Still surface it in the
    // server log so it's not silently invisible in dev.
    console.error('Failed to write activity log:', err);
  }
}

module.exports = { logActivity };
