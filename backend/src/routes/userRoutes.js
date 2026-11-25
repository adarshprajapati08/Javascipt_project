const express = require('express');
const router = express.Router();
const {
  getUsers,
  createUser,
  toggleUserStatus,
} = require('../controllers/userController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/role');

router.use(protect);
router.use(authorize('admin'));

router.get('/', getUsers);
router.post('/', createUser);
router.put('/:id/status', toggleUserStatus);

module.exports = router;
