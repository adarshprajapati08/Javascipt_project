const User = require('../models/User');
const { logAction } = require('../services/auditService');

// @desc    Get all users (Admin only)
// @route   GET /api/users
// @access  Private (Admin)
exports.getUsers = async (req, res, next) => {
  try {
    const { role, status, search, page = 1, limit = 15 } = req.query;

    const query = {};

    if (role && role !== 'all') {
      query.role = role;
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { name: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .select('-password')
      .populate('doctorProfile', 'specialization')
      .populate('patientProfile', 'patientId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      count: users.length,
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
      users,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Create staff / user (Admin only)
// @route   POST /api/users
// @access  Private (Admin)
exports.createUser = async (req, res, next) => {
  try {
    const { name, email, password, role, phone } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'A user with this email already exists.',
      });
    }

    const user = await User.create({
      name,
      email,
      password: password || 'Hospital@123',
      role: role || 'receptionist',
      phone: phone || '',
    });

    await logAction({
      action: 'USER_CREATED_BY_ADMIN',
      performedBy: req.user._id,
      performedByName: req.user.name,
      userRole: req.user.role,
      details: `Admin created user: ${user.name} (${user.email}) as ${user.role}`,
      entityType: 'User',
      entityId: user._id.toString(),
      ipAddress: req.ip,
    });

    const userObj = user.toObject();
    delete userObj.password;

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: userObj,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Toggle user active/inactive status (Admin only)
// @route   PUT /api/users/:id/status
// @access  Private (Admin)
exports.toggleUserStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Prevent deactivating own account
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot deactivate your own account.',
      });
    }

    user.status = user.status === 'active' ? 'inactive' : 'active';
    await user.save();

    await logAction({
      action: 'USER_STATUS_TOGGLED',
      performedBy: req.user._id,
      performedByName: req.user.name,
      userRole: req.user.role,
      details: `User ${user.email} status changed to ${user.status}`,
      entityType: 'User',
      entityId: user._id.toString(),
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      message: `User status changed to ${user.status}`,
      user,
    });
  } catch (err) {
    next(err);
  }
};
