module.exports = {
  // How many full calendar days an inquiry can go without an update before
  // it's treated as stale/needs-attention (see src/utils/staleness.js for
  // the exact day-boundary math). Change this single number to retune the
  // whole app — nothing else should hardcode "2 days" anywhere.
  STALE_THRESHOLD_DAYS: 2,

  // Phase 3 notifications: how many full calendar days without an update
  // before an inquiry is "overdue" enough to trigger the desktop
  // notification and the daily email digest. Deliberately a SEPARATE,
  // longer threshold from STALE_THRESHOLD_DAYS above — the "FOLLOW UP
  // NOW!" UI badge and the overdue notification are related but distinct
  // concepts with their own tuning. See src/utils/overdue.js.
  NOTIFICATION_OVERDUE_DAYS: 3,
};
