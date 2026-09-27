const express = require('express');
const {
  listContacts,
  getContact,
  listContactInquiries,
  updateContact,
  deleteContact,
} = require('../controllers/customers.controller');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);

router.get('/', listContacts);
router.get('/:id', getContact);
router.get('/:id/inquiries', listContactInquiries);
router.patch('/:id', updateContact);
router.delete('/:id', deleteContact);

module.exports = router;
