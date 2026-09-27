const express = require('express');
const { login, logout, me } = require('../controllers/auth.controller');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/login', login);
router.post('/logout', requireAuth, logout);
router.get('/me', requireAuth, me);

module.exports = router;
