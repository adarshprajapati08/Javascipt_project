const Consultation = require('../models/Consultation');
const Appointment = require('../models/Appointment');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const { logAction } = require('../services/auditService');

// @desc    Record consultation notes
// @route   POST /api/consultations
// @access  Private (Doctor)
exports.createConsultation = async (req, res, next) => {
  try {
    const {
      appointmentId,
      symptoms,
      diagnosis,
      clinicalNotes,
      vitalSigns,
      followUpDate,
    } = req.body;

    if (!appointmentId || !diagnosis) {
      return res.status(400).json({
        success: false,
        message: 'Appointment ID and Diagnosis are required.',
      });
    }

    const appointment = await Appointment.findById(appointmentId)
      .populate('patient')
      .populate('doctor');

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found',
      });
    }

    // Role check: doctor can only consult their own appointments
    if (req.user.role === 'doctor' && req.user.doctorProfile.toString() !== appointment.doctor._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You are not assigned to this appointment.',
      });
    }

    const consultation = await Consultation.create({
      appointment: appointment._id,
      patient: appointment.patient._id,
      doctor: appointment.doctor._id,
      symptoms: symptoms || [],
      diagnosis,
      clinicalNotes: clinicalNotes || '',
      vitalSigns: vitalSigns || {},
      followUpDate: followUpDate || null,
    });

    // Update appointment status to Completed
    appointment.status = 'Completed';
    await appointment.save();

    await logAction({
      action: 'CONSULTATION_CREATED',
      performedBy: req.user._id,
      performedByName: req.user.name,
      userRole: req.user.role,
      details: `Consultation recorded for ${appointment.patient.name} by Dr. ${appointment.doctor.name}. Diagnosis: ${diagnosis}`,
      entityType: 'Consultation',
      entityId: consultation._id.toString(),
      ipAddress: req.ip,
    });

    res.status(201).json({
      success: true,
      message: 'Consultation notes saved successfully',
      consultation,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get consultation for an appointment or patient
// @route   GET /api/consultations/appointment/:appointmentId
// @access  Private
exports.getConsultationByAppointment = async (req, res, next) => {
  try {
    const consultation = await Consultation.findOne({ appointment: req.params.appointmentId })
      .populate('patient', 'name patientId phone email gender dateOfBirth')
      .populate('doctor', 'name specialization qualifications')
      .populate('prescription')
      .populate('labTestsRequested');

    if (!consultation) {
      return res.status(404).json({
        success: false,
        message: 'No consultation record found for this appointment.',
      });
    }

    res.status(200).json({
      success: true,
      consultation,
    });
  } catch (err) {
    next(err);
  }
};
