const express = require('express');
const router = express.Router();
const {
  getMedicines,
  getMedicineById,
  addMedicine,
  adjustStock,
  getAlerts,
  getTransactions,
} = require('../controllers/pharmacyController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');

router.use(protect);

router.get('/medicines', getMedicines);
router.get('/medicines/:id', getMedicineById);
router.post('/medicines', authorize('admin'), addMedicine);
router.post('/medicines/:id/adjust-stock', authorize('admin', 'receptionist'), adjustStock);
router.get('/alerts', getAlerts);
router.get('/transactions', authorize('admin'), getTransactions);

module.exports = router;
