const express = require('express');
const router = express.Router();
const {
  getAppointments,
  getAppointmentById,
  bookAppointment,
  rescheduleAppointment,
  cancelAppointment,
  checkInPatient,
  updateAppointmentStatus,
} = require('../controllers/appointmentController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');

router.use(protect);

router.get('/', getAppointments);
router.post('/', bookAppointment);
router.get('/:id', getAppointmentById);
router.put('/:id/reschedule', rescheduleAppointment);
router.put('/:id/cancel', cancelAppointment);
router.put('/:id/check-in', authorize('admin', 'receptionist', 'doctor'), checkInPatient);
router.put('/:id/status', authorize('admin', 'doctor', 'receptionist'), updateAppointmentStatus);

module.exports = router;
