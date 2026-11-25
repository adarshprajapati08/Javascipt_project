const express = require('express');
const router = express.Router();
const {
  getCatalog,
  getLabTests,
  getLabTestById,
  requestLabTest,
  updateLabTestStatus,
  enterLabReport,
} = require('../controllers/labController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');

router.get('/catalog', getCatalog);

router.use(protect);

router.get('/tests', getLabTests);
router.get('/tests/:id', getLabTestById);
router.post('/tests', authorize('doctor', 'admin'), requestLabTest);
router.put('/tests/:id/status', authorize('admin', 'doctor', 'receptionist'), updateLabTestStatus);
router.post('/tests/:id/report', authorize('admin', 'doctor'), enterLabReport);

module.exports = router;
