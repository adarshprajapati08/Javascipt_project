const Department = require('../models/Department');
const Doctor = require('../models/Doctor');
const { logAction } = require('../services/auditService');

// @desc    Get all departments
// @route   GET /api/departments
// @access  Public
exports.getDepartments = async (req, res, next) => {
  try {
    const departments = await Department.find()
      .populate('headDoctor', 'name specialization')
      .sort({ name: 1 });

    // Include doctor counts per department
    const departmentsWithCounts = await Promise.all(
      departments.map(async (dept) => {
        const doctorCount = await Doctor.countDocuments({ department: dept._id, status: 'active' });
        return {
          ...dept.toObject(),
          doctorCount,
        };
      })
    );

    res.status(200).json({
      success: true,
      count: departmentsWithCounts.length,
      departments: departmentsWithCounts,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single department with its doctors
// @route   GET /api/departments/:id
// @access  Public
exports.getDepartmentById = async (req, res, next) => {
  try {
    const department = await Department.findById(req.params.id)
      .populate('headDoctor', 'name specialization');

    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found',
      });
    }

    const doctors = await Doctor.find({ department: department._id, status: 'active' })
      .populate('user', 'email avatar');

    res.status(200).json({
      success: true,
      department,
      doctors,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Create department
// @route   POST /api/departments
// @access  Private (Admin)
exports.createDepartment = async (req, res, next) => {
  try {
    const { name, code, description, headDoctor, location, contactPhone } = req.body;

    const existing = await Department.findOne({ $or: [{ name }, { code }] });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'A department with this name or code already exists.',
      });
    }

    const department = await Department.create({
      name,
      code,
      description,
      headDoctor: headDoctor || null,
      location,
      contactPhone,
    });

    await logAction({
      action: 'DEPARTMENT_CREATED',
      performedBy: req.user._id,
      performedByName: req.user.name,
      userRole: req.user.role,
      details: `Department created: ${department.name} (${department.code})`,
      entityType: 'Department',
      entityId: department._id.toString(),
      ipAddress: req.ip,
    });

    res.status(201).json({
      success: true,
      message: 'Department created successfully',
      department,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update department
// @route   PUT /api/departments/:id
// @access  Private (Admin)
exports.updateDepartment = async (req, res, next) => {
  try {
    const department = await Department.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found',
      });
    }

    await logAction({
      action: 'DEPARTMENT_UPDATED',
      performedBy: req.user._id,
      performedByName: req.user.name,
      userRole: req.user.role,
      details: `Department updated: ${department.name}`,
      entityType: 'Department',
      entityId: department._id.toString(),
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      message: 'Department updated successfully',
      department,
    });
  } catch (err) {
    next(err);
  }
};
