const express = require('express');
const router = express.Router();
const {
  getDoctors,
  getDoctorById,
  getDoctorAvailableSlots,
  createDoctor,
  updateDoctor,
  deleteDoctor,
} = require('../controllers/doctorController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');

router.get('/', getDoctors);
router.get('/:id', getDoctorById);
router.get('/:id/available-slots', getDoctorAvailableSlots);
router.post('/', protect, authorize('admin'), createDoctor);
router.put('/:id', protect, authorize('admin', 'doctor'), updateDoctor);
router.delete('/:id', protect, authorize('admin'), deleteDoctor);

module.exports = router;
