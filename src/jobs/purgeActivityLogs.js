const cron = require('node-cron');
const prisma = require('../config/db');

const RETENTION_DAYS = 30;

async function purgeOldActivityLogs() {
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const { count } = await prisma.activityLog.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });
  if (count > 0) {
    console.log(`[activity-log-retention] purged ${count} entries older than ${RETENTION_DAYS} days`);
  }
}

// Runs once at startup (covers the "server was down for a while" case) and
// then every day at 2 AM local server time.
//
// This is an app-level (node-cron) job, not a DB-level (pg_cron) one: the
// standard PostgreSQL Windows installer this project targets doesn't ship
// pg_cron, and requiring a manual extension install would add real friction
// to local setup for comparatively little benefit at this data volume. The
// tradeoff is that this only runs while the Express process is up — fine
// for a server managed by PM2, which is expected to be running continuously.
function startActivityLogRetentionJob() {
  purgeOldActivityLogs().catch((err) => console.error('[activity-log-retention] startup purge failed:', err));
  cron.schedule('0 2 * * *', () => {
    purgeOldActivityLogs().catch((err) => console.error('[activity-log-retention] scheduled purge failed:', err));
  });
}

module.exports = { startActivityLogRetentionJob, purgeOldActivityLogs };
