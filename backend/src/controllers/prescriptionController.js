const Prescription = require('../models/Prescription');
const Consultation = require('../models/Consultation');
const Appointment = require('../models/Appointment');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const { logAction } = require('../services/auditService');
const { createNotification } = require('../services/notificationService');

// @desc    Get prescriptions with filtering
// @route   GET /api/prescriptions
// @access  Private
exports.getPrescriptions = async (req, res, next) => {
  try {
    const { patientId, doctorId, search, page = 1, limit = 10 } = req.query;

    const query = {};

    if (req.user.role === 'patient') {
      if (!req.user.patientProfile) {
        return res.status(200).json({ success: true, count: 0, prescriptions: [] });
      }
      query.patient = req.user.patientProfile;
    } else if (req.user.role === 'doctor') {
      if (!req.user.doctorProfile) {
        return res.status(200).json({ success: true, count: 0, prescriptions: [] });
      }
      query.doctor = req.user.doctorProfile;
    }

    if (patientId) query.patient = patientId;
    if (doctorId) query.doctor = doctorId;

    if (search) {
      query.$or = [
        { prescriptionId: new RegExp(search, 'i') },
        { diagnosis: new RegExp(search, 'i') },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Prescription.countDocuments(query);
    const prescriptions = await Prescription.find(query)
      .populate('patient', 'patientId name phone email gender dateOfBirth age')
      .populate('doctor', 'name specialization qualifications department')
      .populate('appointment', 'appointmentId date')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      count: prescriptions.length,
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
      prescriptions,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single prescription by ID
// @route   GET /api/prescriptions/:id
// @access  Private
exports.getPrescriptionById = async (req, res, next) => {
  try {
    const prescription = await Prescription.findById(req.params.id)
      .populate('patient', 'patientId name phone email gender dateOfBirth age address')
      .populate({
        path: 'doctor',
        populate: { path: 'department', select: 'name code' }
      })
      .populate('appointment');

    if (!prescription) {
      return res.status(404).json({
        success: false,
        message: 'Prescription not found',
      });
    }

    res.status(200).json({
      success: true,
      prescription,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Create prescription
// @route   POST /api/prescriptions
// @access  Private (Doctor, Admin)
exports.createPrescription = async (req, res, next) => {
  try {
    const {
      patientId,
      doctorId,
      appointmentId,
      consultationId,
      diagnosis,
      clinicalNotes,
      medicines,
      dietaryAdvice,
      followUpDate,
    } = req.body;

    const assignedDoctorId = req.user.role === 'doctor' ? req.user.doctorProfile : doctorId;

    if (!patientId || !assignedDoctorId || !diagnosis || !medicines || !medicines.length) {
      return res.status(400).json({
        success: false,
        message: 'Patient, Doctor, Diagnosis, and at least one medicine are required.',
      });
    }

    const patient = await Patient.findById(patientId).populate('user');
    const doctor = await Doctor.findById(assignedDoctorId);

    if (!patient || !doctor) {
      return res.status(404).json({
        success: false,
        message: 'Patient or Doctor record not found.',
      });
    }

    const count = await Prescription.countDocuments();
    const currentYear = new Date().getFullYear();
    const prescriptionId = `RX-${currentYear}-${String(count + 1).padStart(4, '0')}`;

    const prescription = await Prescription.create({
      prescriptionId,
      patient: patientId,
      doctor: assignedDoctorId,
      appointment: appointmentId || null,
      consultation: consultationId || null,
      diagnosis,
      clinicalNotes: clinicalNotes || '',
      medicines,
      dietaryAdvice: dietaryAdvice || '',
      followUpDate: followUpDate || null,
    });

    // If consultationId provided, link prescription to consultation
    if (consultationId) {
      await Consultation.findByIdAndUpdate(consultationId, {
        prescription: prescription._id,
      });
    }

    // In-app notification to patient
    if (patient.user) {
      await createNotification({
        recipient: patient.user._id,
        title: 'New Digital Prescription Available',
        message: `Dr. ${doctor.name} has issued prescription #${prescription.prescriptionId} for ${diagnosis}.`,
        type: 'prescription',
        relatedEntity: { entityType: 'Prescription', entityId: prescription._id },
      });
    }

    await logAction({
      action: 'PRESCRIPTION_CREATED',
      performedBy: req.user._id,
      performedByName: req.user.name,
      userRole: req.user.role,
      details: `Prescription ${prescription.prescriptionId} issued for ${patient.name} by Dr. ${doctor.name} (${medicines.length} items)`,
      entityType: 'Prescription',
      entityId: prescription._id.toString(),
      ipAddress: req.ip,
    });

    res.status(201).json({
      success: true,
      message: 'Prescription created successfully',
      prescription,
    });
  } catch (err) {
    next(err);
  }
};
