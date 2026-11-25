const express = require('express');
const router = express.Router();
const {
  getPatients,
  getPatientById,
  createPatient,
  updatePatient,
  getPatientTimeline,
  deletePatient,
} = require('../controllers/patientController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');

router.use(protect);

router.get('/', authorize('admin', 'doctor', 'receptionist'), getPatients);
router.post('/', authorize('admin', 'doctor', 'receptionist'), createPatient);
router.get('/:id', getPatientById);
router.put('/:id', updatePatient);
router.delete('/:id', authorize('admin'), deletePatient);
router.get('/:id/timeline', getPatientTimeline);

module.exports = router;
