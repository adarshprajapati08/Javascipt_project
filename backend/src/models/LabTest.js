const mongoose = require('mongoose');

const labTestSchema = new mongoose.Schema({
  testId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true,
  },
  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: true,
  },
  appointment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment',
  },
  consultation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Consultation',
  },
  testName: {
    type: String,
    required: [true, 'Test name is required'],
    trim: true,
  },
  category: {
    type: String,
    enum: ['Hematology', 'Biochemistry', 'Microbiology', 'Pathology', 'Radiology', 'Cardiology', 'Other'],
    default: 'Hematology',
  },
  price: {
    type: Number,
    required: true,
    default: 500,
  },
  status: {
    type: String,
    enum: ['Requested', 'Sample collected', 'Processing', 'Completed'],
    default: 'Requested',
  },
  requestedDate: {
    type: Date,
    default: Date.now,
  },
  sampleCollectedAt: {
    type: Date,
  },
  completedAt: {
    type: Date,
  },
  report: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LabReport',
  },
  clinicalNotes: {
    type: String,
    default: '',
  }
}, {
  timestamps: true,
});

module.exports = mongoose.model('LabTest', labTestSchema);
