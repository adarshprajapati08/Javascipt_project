const express = require('express');
const router = express.Router();
const {
  getPrescriptions,
  getPrescriptionById,
  createPrescription,
} = require('../controllers/prescriptionController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');

router.use(protect);

router.get('/', getPrescriptions);
router.get('/:id', getPrescriptionById);
router.post('/', authorize('doctor', 'admin'), createPrescription);

module.exports = router;
