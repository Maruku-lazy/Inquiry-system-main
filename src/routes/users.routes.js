const express = require('express');
const {
  listUsers,
  createUser,
  updateUser,
  deactivateUser,
  deleteUserAccount,
} = require('../controllers/users.controller');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// Every route here is admin-only, per the spec.
router.use(requireAuth, requireRole('admin'));

router.get('/', listUsers);
router.post('/', createUser);
router.patch('/:id', updateUser);
router.delete('/:id', deactivateUser);
router.post('/:id/delete-account', deleteUserAccount);

module.exports = router;
