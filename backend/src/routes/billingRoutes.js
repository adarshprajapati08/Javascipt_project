const express = require('express');
const router = express.Router();
const {
  getBills,
  getBillById,
  createBill,
  recordPayment,
} = require('../controllers/billingController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');

router.use(protect);

router.get('/bills', getBills);
router.get('/bills/:id', getBillById);
router.post('/bills', authorize('admin', 'receptionist'), createBill);
router.post('/bills/:id/payments', recordPayment);

module.exports = router;
