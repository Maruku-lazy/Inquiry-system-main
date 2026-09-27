const express = require('express');
const { listActivity, listInquiriesLog } = require('../controllers/logs.controller');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth, requireRole('admin'));

router.get('/activity', listActivity);
router.get('/inquiries', listInquiriesLog);

module.exports = router;
