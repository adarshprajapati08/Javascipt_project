const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  appointmentId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: [true, 'Patient is required'],
  },
  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: [true, 'Doctor is required'],
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    required: [true, 'Department is required'],
  },
  date: {
    type: String, // Format: YYYY-MM-DD
    required: [true, 'Appointment date is required'],
  },
  timeSlot: {
    startTime: {
      type: String, // e.g. "09:30"
      required: [true, 'Start time is required'],
    },
    endTime: {
      type: String, // e.g. "10:00"
      required: [true, 'End time is required'],
    }
  },
  reason: {
    type: String,
    required: [true, 'Reason for appointment is required'],
    trim: true,
  },
  status: {
    type: String,
    enum: ['Pending', 'Confirmed', 'Checked-in', 'In consultation', 'Completed', 'Cancelled', 'Declined'],
    default: 'Pending',
  },
  consultationFee: {
    type: Number,
    default: 0,
  },
  checkedInAt: {
    type: Date,
  },
  cancellationReason: {
    type: String,
    default: '',
  },
  rescheduledFrom: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment',
  },
  bookedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  notes: {
    type: String,
    default: '',
  }
}, {
  timestamps: true,
});

// Compound index to help query appointment conflicts quickly
appointmentSchema.index({ doctor: 1, date: 1, 'timeSlot.startTime': 1 });
appointmentSchema.index({ patient: 1, date: 1 });

module.exports = mongoose.model('Appointment', appointmentSchema);
