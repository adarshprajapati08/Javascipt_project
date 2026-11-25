const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  message: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['appointment', 'prescription', 'lab', 'billing', 'system'],
    default: 'system',
  },
  relatedEntity: {
    entityType: { type: String }, // e.g. 'Appointment', 'Prescription', 'Bill', 'LabTest'
    entityId: { type: mongoose.Schema.Types.ObjectId },
  },
  isRead: {
    type: Boolean,
    default: false,
  }
}, {
  timestamps: true,
});

module.exports = mongoose.model('Notification', notificationSchema);
