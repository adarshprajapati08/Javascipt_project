const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true,
    trim: true,
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  performedByName: {
    type: String,
    default: 'System',
  },
  userRole: {
    type: String,
    default: 'system',
  },
  details: {
    type: String,
    required: true,
  },
  entityType: {
    type: String,
    default: '',
  },
  entityId: {
    type: String,
    default: '',
  },
  ipAddress: {
    type: String,
    default: '127.0.0.1',
  }
}, {
  timestamps: true,
});

module.exports = mongoose.model('AuditLog', auditLogSchema);
