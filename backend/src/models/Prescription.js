const mongoose = require('mongoose');

const prescriptionSchema = new mongoose.Schema({
  prescriptionId: {
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
  date: {
    type: Date,
    default: Date.now,
  },
  diagnosis: {
    type: String,
    required: [true, 'Diagnosis is required'],
    trim: true,
  },
  clinicalNotes: {
    type: String,
    default: '',
  },
  medicines: [{
    name: { type: String, required: true },
    dosage: { type: String, required: true },       // e.g. "500 mg"
    frequency: { type: String, required: true },    // e.g. "1-0-1 (Twice daily)"
    duration: { type: String, required: true },     // e.g. "5 days"
    instructions: { type: String, default: 'Take after meal' }
  }],
  dietaryAdvice: {
    type: String,
    default: '',
  },
  followUpDate: {
    type: Date,
  }
}, {
  timestamps: true,
});

module.exports = mongoose.model('Prescription', prescriptionSchema);
