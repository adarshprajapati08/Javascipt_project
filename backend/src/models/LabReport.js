const mongoose = require('mongoose');

const labReportSchema = new mongoose.Schema({
  reportId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  labTest: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LabTest',
    required: true,
  },
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true,
  },
  technician: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  testName: {
    type: String,
    required: true,
  },
  resultSummary: {
    type: String,
    required: true,
  },
  detailedResults: [{
    parameter: { type: String, required: true },
    result: { type: String, required: true },
    unit: { type: String, default: '' },
    referenceRange: { type: String, default: '' },
    flag: {
      type: String,
      enum: ['Normal', 'High', 'Low', 'Abnormal'],
      default: 'Normal',
    }
  }],
  fileUrl: {
    type: String,
    default: '',
  },
  notes: {
    type: String,
    default: '',
  },
  completedDate: {
    type: Date,
    default: Date.now,
  }
}, {
  timestamps: true,
});

module.exports = mongoose.model('LabReport', labReportSchema);
