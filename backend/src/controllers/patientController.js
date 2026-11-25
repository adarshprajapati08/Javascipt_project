const Patient = require('../models/Patient');
const User = require('../models/User');
const Appointment = require('../models/Appointment');
const Consultation = require('../models/Consultation');
const Prescription = require('../models/Prescription');
const LabTest = require('../models/LabTest');
const Bill = require('../models/Bill');
const { logAction } = require('../services/auditService');

// @desc    Get all patients with search, filtering & pagination
// @route   GET /api/patients
// @access  Private (Admin, Doctor, Receptionist)
exports.getPatients = async (req, res, next) => {
  try {
    const { search, bloodGroup, gender, page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    const query = {};

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { patientId: searchRegex },
        { name: searchRegex },
        { phone: searchRegex },
        { email: searchRegex },
      ];
    }

    if (bloodGroup && bloodGroup !== 'all') {
      query.bloodGroup = bloodGroup;
    }

    if (gender && gender !== 'all') {
      query.gender = gender;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const total = await Patient.countDocuments(query);
    const patients = await Patient.find(query)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      count: patients.length,
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
      patients,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single patient by ID with full EHR data
// @route   GET /api/patients/:id
// @access  Private
exports.getPatientById = async (req, res, next) => {
  try {
    const patient = await Patient.findById(req.params.id);

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found',
      });
    }

    // Role check: If patient role, they can only see their own profile
    if (req.user.role === 'patient') {
      if (!req.user.patientProfile || req.user.patientProfile.toString() !== patient._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You can only view your own medical records.',
        });
      }
    }

    // Fetch related records concurrently
    const [appointments, consultations, prescriptions, labTests, bills] = await Promise.all([
      Appointment.find({ patient: patient._id })
        .populate('doctor', 'name specialization')
        .populate('department', 'name')
        .sort({ date: -1 }),
      Consultation.find({ patient: patient._id })
        .populate('doctor', 'name specialization')
        .sort({ date: -1 }),
      Prescription.find({ patient: patient._id })
        .populate('doctor', 'name specialization')
        .sort({ date: -1 }),
      LabTest.find({ patient: patient._id })
        .populate('doctor', 'name')
        .populate('report')
        .sort({ requestedDate: -1 }),
      Bill.find({ patient: patient._id })
        .sort({ createdAt: -1 })
    ]);

    res.status(200).json({
      success: true,
      patient,
      records: {
        appointments,
        consultations,
        prescriptions,
        labTests,
        bills,
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Create / Register a new patient
// @route   POST /api/patients
// @access  Private (Admin, Receptionist, Doctor)
exports.createPatient = async (req, res, next) => {
  try {
    const {
      name,
      dateOfBirth,
      gender,
      bloodGroup,
      phone,
      email,
      address,
      emergencyContact,
      allergies,
      chronicConditions,
      medicalHistoryNotes
    } = req.body;

    // Check duplicate phone
    const existingPatient = await Patient.findOne({ phone });
    if (existingPatient) {
      return res.status(400).json({
        success: false,
        message: `A patient with phone number ${phone} is already registered (Patient ID: ${existingPatient.patientId}).`,
      });
    }

    const patientCount = await Patient.countDocuments();
    const currentYear = new Date().getFullYear();
    const patientId = `PT-${currentYear}-${String(patientCount + 1).padStart(4, '0')}`;

    const patient = await Patient.create({
      patientId,
      name,
      dateOfBirth,
      gender,
      bloodGroup: bloodGroup || 'Unknown',
      phone,
      email: email || '',
      address: address || {},
      emergencyContact: emergencyContact || {},
      allergies: allergies || [],
      chronicConditions: chronicConditions || [],
      medicalHistoryNotes: medicalHistoryNotes || '',
    });

    await logAction({
      action: 'PATIENT_REGISTERED',
      performedBy: req.user._id,
      performedByName: req.user.name,
      userRole: req.user.role,
      details: `New patient registered: ${patient.name} (${patient.patientId})`,
      entityType: 'Patient',
      entityId: patient._id.toString(),
      ipAddress: req.ip,
    });

    res.status(201).json({
      success: true,
      message: 'Patient registered successfully',
      patient,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update patient information
// @route   PUT /api/patients/:id
// @access  Private (Admin, Receptionist, Doctor, or Patient for personal info)
exports.updatePatient = async (req, res, next) => {
  try {
    let patient = await Patient.findById(req.params.id);

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found',
      });
    }

    // Role check: If patient role, they can only update their own profile and not medical fields
    if (req.user.role === 'patient') {
      if (!req.user.patientProfile || req.user.patientProfile.toString() !== patient._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: You can only edit your own details.',
        });
      }
      // Patients cannot modify allergies/chronicConditions directly
      const { name, phone, address, emergencyContact } = req.body;
      if (name) patient.name = name;
      if (phone) patient.phone = phone;
      if (address) patient.address = { ...patient.address, ...address };
      if (emergencyContact) patient.emergencyContact = { ...patient.emergencyContact, ...emergencyContact };
    } else {
      // Staff / Doctor / Admin can update all fields
      Object.assign(patient, req.body);
    }

    await patient.save();

    await logAction({
      action: 'PATIENT_UPDATED',
      performedBy: req.user._id,
      performedByName: req.user.name,
      userRole: req.user.role,
      details: `Patient record updated: ${patient.name} (${patient.patientId})`,
      entityType: 'Patient',
      entityId: patient._id.toString(),
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      message: 'Patient updated successfully',
      patient,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete patient (Admin only)
// @route   DELETE /api/patients/:id
// @access  Private (Admin)
exports.deletePatient = async (req, res, next) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found',
      });
    }

    // Delete associated appointments
    await Appointment.deleteMany({ patient: patient._id });
    
    // If user account linked, delete or deactivate user
    if (patient.user) {
      await User.findByIdAndDelete(patient.user);
    }

    await Patient.findByIdAndDelete(req.params.id);

    await logAction({
      action: 'PATIENT_DELETED',
      performedBy: req.user._id,
      performedByName: req.user.name,
      userRole: req.user.role,
      details: `Patient deleted: ${patient.name} (${patient.patientId})`,
      entityType: 'Patient',
      entityId: patient._id.toString(),
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      message: 'Patient and associated records deleted successfully',
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get aggregated chronological medical timeline
// @route   GET /api/patients/:id/timeline
// @access  Private
exports.getPatientTimeline = async (req, res, next) => {
  try {
    const patientId = req.params.id;

    const [appointments, consultations, prescriptions, labTests] = await Promise.all([
      Appointment.find({ patient: patientId })
        .populate('doctor', 'name specialization')
        .populate('department', 'name')
        .lean(),
      Consultation.find({ patient: patientId })
        .populate('doctor', 'name specialization')
        .lean(),
      Prescription.find({ patient: patientId })
        .populate('doctor', 'name specialization')
        .lean(),
      LabTest.find({ patient: patientId })
        .populate('doctor', 'name')
        .populate('report')
        .lean(),
    ]);

    // Aggregate into a single chronological array
    const events = [];

    appointments.forEach(apt => {
      events.push({
        type: 'APPOINTMENT',
        date: new Date(apt.date),
        title: `Appointment - ${apt.department?.name || 'Consultation'}`,
        description: `With Dr. ${apt.doctor?.name || 'Specialist'}: ${apt.reason} (Status: ${apt.status})`,
        data: apt,
      });
    });

    consultations.forEach(c => {
      events.push({
        type: 'CONSULTATION',
        date: new Date(c.date || c.createdAt),
        title: `Clinical Consultation: ${c.diagnosis}`,
        description: `Dr. ${c.doctor?.name || 'Doctor'} - Notes: ${c.clinicalNotes || 'General review'}`,
        data: c,
      });
    });

    prescriptions.forEach(p => {
      events.push({
        type: 'PRESCRIPTION',
        date: new Date(p.date || p.createdAt),
        title: `Prescription Issued (${p.prescriptionId})`,
        description: `${p.medicines?.length || 0} medicines prescribed by Dr. ${p.doctor?.name || 'Doctor'}`,
        data: p,
      });
    });

    labTests.forEach(l => {
      events.push({
        type: 'LAB_TEST',
        date: new Date(l.completedAt || l.requestedDate || l.createdAt),
        title: `Lab Test: ${l.testName}`,
        description: `Status: ${l.status} - Category: ${l.category}`,
        data: l,
      });
    });

    // Sort descending by date
    events.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.status(200).json({
      success: true,
      timeline: events,
    });
  } catch (err) {
    next(err);
  }
};
