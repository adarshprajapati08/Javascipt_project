const AuditLog = require('../models/AuditLog');

const logAction = async ({
  action,
  performedBy = null,
  performedByName = 'System',
  userRole = 'system',
  details,
  entityType = '',
  entityId = '',
  ipAddress = '127.0.0.1'
}) => {
  try {
    await AuditLog.create({
      action,
      performedBy,
      performedByName,
      userRole,
      details,
      entityType,
      entityId,
      ipAddress
    });
  } catch (err) {
    console.error('[AuditService Error]:', err.message);
  }
};

module.exports = { logAction };
