const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  name: {
    type: String,
    required: [true, 'Doctor name is required'],
    trim: true,
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    required: [true, 'Department is required'],
  },
  specialization: {
    type: String,
    required: [true, 'Specialization is required'],
    trim: true,
  },
  qualifications: [{
    type: String,
    trim: true,
  }],
  experience: {
    type: Number,
    default: 1, // in years
  },
  consultationFee: {
    type: Number,
    required: [true, 'Consultation fee is required'],
    min: 0,
  },
  availableDays: [{
    type: String,
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
  }],
  availableTimeSlots: [{
    startTime: { type: String, required: true }, // e.g. "09:00"
    endTime: { type: String, required: true },   // e.g. "13:00"
  }],
  slotDurationMinutes: {
    type: Number,
    default: 30,
  },
  bio: {
    type: String,
    default: '',
  },
  profilePicture: {
    type: String,
    default: '',
  },
  status: {
    type: String,
    enum: ['active', 'on-leave', 'inactive'],
    default: 'active',
  }
}, {
  timestamps: true,
});

module.exports = mongoose.model('Doctor', doctorSchema);
