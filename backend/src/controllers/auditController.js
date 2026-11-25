const AuditLog = require('../models/AuditLog');

// @desc    Get system audit logs
// @route   GET /api/audit-logs
// @access  Private (Admin)
exports.getAuditLogs = async (req, res, next) => {
  try {
    const { action, role, search, page = 1, limit = 20 } = req.query;

    const query = {};

    if (action && action !== 'all') {
      query.action = action;
    }

    if (role && role !== 'all') {
      query.userRole = role;
    }

    if (search) {
      query.$or = [
        { details: new RegExp(search, 'i') },
        { performedByName: new RegExp(search, 'i') },
        { action: new RegExp(search, 'i') },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await AuditLog.countDocuments(query);
    const logs = await AuditLog.find(query)
      .populate('performedBy', 'name email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      count: logs.length,
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
      logs,
    });
  } catch (err) {
    next(err);
  }
};
