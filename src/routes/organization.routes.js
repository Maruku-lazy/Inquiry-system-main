const express = require('express');
const { getChart, getMyTeam, assignSalesToLeader } = require('../controllers/organization.controller');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);

// Team Chart — every authenticated role, scoped server-side per role.
router.get('/chart', getChart);

// Team Management — managers only.
router.get('/my-team', requireRole('manager'), getMyTeam);
router.patch('/assign-sales', requireRole('manager'), assignSalesToLeader);

module.exports = router;
