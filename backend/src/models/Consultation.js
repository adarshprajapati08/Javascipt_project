const mongoose = require('mongoose');

const consultationSchema = new mongoose.Schema({
  appointment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment',
    required: true,
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
  date: {
    type: Date,
    default: Date.now,
  },
  symptoms: [{
    type: String,
    trim: true,
  }],
  diagnosis: {
    type: String,
    required: [true, 'Diagnosis is required'],
    trim: true,
  },
  clinicalNotes: {
    type: String,
    default: '',
  },
  vitalSigns: {
    bloodPressure: { type: String, default: '' }, // e.g. "120/80 mmHg"
    heartRate: { type: Number },                  // e.g. 72 bpm
    temperature: { type: Number },                // e.g. 98.6 F
    respiratoryRate: { type: Number },            // e.g. 16 /min
    weight: { type: Number },                     // kg
    height: { type: Number },                     // cm
    oxygenSaturation: { type: Number },           // % e.g. 98
  },
  prescription: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Prescription',
  },
  labTestsRequested: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LabTest',
  }],
  followUpDate: {
    type: Date,
  }
}, {
  timestamps: true,
});

module.exports = mongoose.model('Consultation', consultationSchema);
