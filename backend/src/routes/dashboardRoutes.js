const express = require('express');
const router = express.Router();
const {
  getAdminDashboard,
  getDoctorDashboard,
  getPatientDashboard,
  getReceptionistDashboard,
} = require('../controllers/dashboardController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');

router.use(protect);

router.get('/admin', authorize('admin'), getAdminDashboard);
router.get('/doctor', authorize('doctor', 'admin'), getDoctorDashboard);
router.get('/patient', authorize('patient'), getPatientDashboard);
router.get('/receptionist', authorize('receptionist', 'admin'), getReceptionistDashboard);

module.exports = router;
