const express = require('express');
const router = express.Router();
const {
  createConsultation,
  getConsultationByAppointment,
} = require('../controllers/consultationController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');

router.use(protect);

router.post('/', authorize('doctor', 'admin'), createConsultation);
router.get('/appointment/:appointmentId', getConsultationByAppointment);

module.exports = router;
