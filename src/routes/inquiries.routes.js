const express = require('express');
const {
  listActive,
  listCompleted,
  listDeleted,
  exportInquiries,
  listTasks,
  listCompletedYears,
  listCompletedMonths,
  getStats,
  getStatsByUser,
  getAnalytics,
  getAnalyticsExport,
  getUnseenSummary,
  getNotifications,
  getLoginAlerts,
  getNewlyAssigned,
  listAssignableUsers,
  createInquiry,
  updateInquiry,
  deleteInquiry,
  restoreInquiry,
  permanentlyDeleteInquiry,
  markInquiryViewed,
} = require('../controllers/inquiries.controller');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);

// Visibility filtering happens inside the controller based on req.user's
// role — every role hits the same routes, the data returned differs.
// Order matters: static/nested paths must come before the generic
// '/:id' style routes so e.g. '/completed/years' isn't swallowed as an id.
router.get('/active', listActive);
router.get('/tasks', listTasks);
router.get('/completed/years', listCompletedYears);
router.get('/completed/years/:year/months', listCompletedMonths);
router.get('/completed', listCompleted);
router.get('/deleted', listDeleted);
router.get('/export', exportInquiries);
router.get('/stats', getStats);
router.get('/stats/by-user', getStatsByUser);
router.get('/analytics', getAnalytics);
router.get('/analytics/export', getAnalyticsExport);
router.get('/unseen-summary', getUnseenSummary);
router.get('/notifications', getNotifications);
router.get('/login-alerts', getLoginAlerts);
router.get('/newly-assigned', getNewlyAssigned);
router.get('/assignable-users', listAssignableUsers);

router.post('/', createInquiry);
router.patch('/:id', updateInquiry);
router.post('/:id/view', markInquiryViewed);
router.delete('/:id/permanent', permanentlyDeleteInquiry);
router.delete('/:id', deleteInquiry);
router.post('/:id/restore', restoreInquiry);

module.exports = router;
