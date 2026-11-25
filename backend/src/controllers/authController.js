const User = require('../models/User');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const jwt = require('jsonwebtoken');
const { logAction } = require('../services/auditService');

const generateToken = (id) => {
  return jwt.sign(
    { id },
    process.env.JWT_SECRET || 'meditrack_super_secure_jwt_secret_key_2026',
    { expiresIn: '7d' }
  );
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, role = 'patient', phone, dateOfBirth, gender, bloodGroup, address } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'A user with this email address already exists.',
      });
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      role: role === 'admin' ? 'patient' : role, // Prevent public registration of admin
      phone,
    });

    // If registering as a patient, automatically generate a Patient profile
    if (user.role === 'patient') {
      const patientCount = await Patient.countDocuments();
      const currentYear = new Date().getFullYear();
      const patientId = `PT-${currentYear}-${String(patientCount + 1).padStart(4, '0')}`;

      const patient = await Patient.create({
        patientId,
        user: user._id,
        name: user.name,
        dateOfBirth: dateOfBirth || new Date('1990-01-01'),
        gender: gender || 'other',
        bloodGroup: bloodGroup || 'Unknown',
        phone: phone || 'N/A',
        email: user.email,
        address: address || {},
      });

      user.patientProfile = patient._id;
      await user.save();
    }

    const token = generateToken(user._id);

    await logAction({
      action: 'USER_REGISTERED',
      performedBy: user._id,
      performedByName: user.name,
      userRole: user.role,
      details: `New ${user.role} account registered: ${user.email}`,
      entityType: 'User',
      entityId: user._id.toString(),
      ipAddress: req.ip || req.connection?.remoteAddress,
    });

    const userObj = user.toObject();
    delete userObj.password;

    res.status(201).json({
      success: true,
      message: 'Account registered successfully',
      token,
      user: userObj,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Login user & get token
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password.',
      });
    }

    const user = await User.findOne({ email }).select('+password').populate('doctorProfile').populate('patientProfile');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'Your account is deactivated. Please contact the administrator.',
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user._id);

    await logAction({
      action: 'USER_LOGIN',
      performedBy: user._id,
      performedByName: user.name,
      userRole: user.role,
      details: `User logged in: ${user.email} (${user.role})`,
      entityType: 'User',
      entityId: user._id.toString(),
      ipAddress: req.ip || req.connection?.remoteAddress,
    });

    const userObj = user.toObject();
    delete userObj.password;

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: userObj,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .populate({
        path: 'doctorProfile',
        populate: { path: 'department', select: 'name code' }
      })
      .populate('patientProfile');

    res.status(200).json({
      success: true,
      user,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
exports.updateProfile = async (req, res, next) => {
  try {
    const { name, phone, avatar } = req.body;
    const user = await User.findById(req.user._id);

    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (avatar !== undefined) user.avatar = avatar;

    await user.save();

    // If patient, also update patient record name & phone
    if (user.role === 'patient' && user.patientProfile) {
      await Patient.findByIdAndUpdate(user.patientProfile, {
        name: user.name,
        phone: user.phone,
      });
    }

    // If doctor, also update doctor record name
    if (user.role === 'doctor' && user.doctorProfile) {
      await Doctor.findByIdAndUpdate(user.doctorProfile, {
        name: user.name,
      });
    }

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide current and new password.',
      });
    }

    const user = await User.findById(req.user._id).select('+password');
    const isMatch = await user.comparePassword(currentPassword);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect.',
      });
    }

    user.password = newPassword;
    await user.save();

    await logAction({
      action: 'PASSWORD_CHANGED',
      performedBy: user._id,
      performedByName: user.name,
      userRole: user.role,
      details: `User changed password for: ${user.email}`,
      entityType: 'User',
      entityId: user._id.toString(),
      ipAddress: req.ip || req.connection?.remoteAddress,
    });

    res.status(200).json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (err) {
    next(err);
  }
};
