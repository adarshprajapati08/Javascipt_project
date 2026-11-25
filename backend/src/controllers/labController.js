const LabTest = require('../models/LabTest');
const LabReport = require('../models/LabReport');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const { logAction } = require('../services/auditService');
const { createNotification } = require('../services/notificationService');

// Standard test catalog with reference ranges
const LAB_CATALOG = [
  {
    name: 'Complete Blood Count (CBC)',
    category: 'Hematology',
    price: 350,
    parameters: [
      { parameter: 'Hemoglobin', unit: 'g/dL', referenceRange: '13.5 - 17.5' },
      { parameter: 'RBC Count', unit: 'million/mcL', referenceRange: '4.5 - 5.9' },
      { parameter: 'WBC Count', unit: '/mcL', referenceRange: '4,500 - 11,000' },
      { parameter: 'Platelet Count', unit: '/mcL', referenceRange: '150,000 - 450,000' },
      { parameter: 'Hematocrit (PCV)', unit: '%', referenceRange: '41 - 50' },
    ]
  },
  {
    name: 'Comprehensive Metabolic Panel (CMP)',
    category: 'Biochemistry',
    price: 650,
    parameters: [
      { parameter: 'Fasting Blood Glucose', unit: 'mg/dL', referenceRange: '70 - 99' },
      { parameter: 'Serum Creatinine', unit: 'mg/dL', referenceRange: '0.7 - 1.3' },
      { parameter: 'Blood Urea Nitrogen (BUN)', unit: 'mg/dL', referenceRange: '7 - 20' },
      { parameter: 'Sodium', unit: 'mEq/L', referenceRange: '135 - 145' },
      { parameter: 'Potassium', unit: 'mEq/L', referenceRange: '3.5 - 5.0' },
    ]
  },
  {
    name: 'Lipid Profile',
    category: 'Biochemistry',
    price: 550,
    parameters: [
      { parameter: 'Total Cholesterol', unit: 'mg/dL', referenceRange: '< 200' },
      { parameter: 'Triglycerides', unit: 'mg/dL', referenceRange: '< 150' },
      { parameter: 'HDL (Good) Cholesterol', unit: 'mg/dL', referenceRange: '> 40' },
      { parameter: 'LDL (Bad) Cholesterol', unit: 'mg/dL', referenceRange: '< 100' },
    ]
  },
  {
    name: 'Liver Function Test (LFT)',
    category: 'Biochemistry',
    price: 600,
    parameters: [
      { parameter: 'Total Bilirubin', unit: 'mg/dL', referenceRange: '0.2 - 1.2' },
      { parameter: 'SGOT / AST', unit: 'U/L', referenceRange: '8 - 48' },
      { parameter: 'SGPT / ALT', unit: 'U/L', referenceRange: '7 - 55' },
      { parameter: 'Alkaline Phosphatase (ALP)', unit: 'U/L', referenceRange: '44 - 147' },
      { parameter: 'Serum Albumin', unit: 'g/dL', referenceRange: '3.4 - 5.4' },
    ]
  },
  {
    name: 'Thyroid Stimulating Hormone (TSH)',
    category: 'Pathology',
    price: 400,
    parameters: [
      { parameter: 'TSH Ultra-sensitive', unit: 'uIU/mL', referenceRange: '0.4 - 4.2' },
      { parameter: 'Free T3', unit: 'pg/mL', referenceRange: '2.0 - 4.4' },
      { parameter: 'Free T4', unit: 'ng/dL', referenceRange: '0.8 - 1.8' },
    ]
  },
  {
    name: 'HbA1c (Glycated Hemoglobin)',
    category: 'Biochemistry',
    price: 450,
    parameters: [
      { parameter: 'HbA1c Percentage', unit: '%', referenceRange: '< 5.7 (Normal), 5.7 - 6.4 (Prediabetes)' },
      { parameter: 'Estimated Average Glucose', unit: 'mg/dL', referenceRange: '< 117' },
    ]
  },
  {
    name: 'Chest X-Ray PA View',
    category: 'Radiology',
    price: 500,
    parameters: [
      { parameter: 'Lung Fields', unit: '', referenceRange: 'Clear, no active infiltrates' },
      { parameter: 'Cardiac Silhouette', unit: '', referenceRange: 'Normal CTR ratio' },
    ]
  }
];

// @desc    Get standard test catalog
// @route   GET /api/lab/catalog
// @access  Public
exports.getCatalog = (req, res) => {
  res.status(200).json({
    success: true,
    catalog: LAB_CATALOG,
  });
};

// @desc    Get all lab tests with filtering
// @route   GET /api/lab/tests
// @access  Private
exports.getLabTests = async (req, res, next) => {
  try {
    const { status, patientId, doctorId, category, page = 1, limit = 10 } = req.query;

    const query = {};

    if (req.user.role === 'patient') {
      if (!req.user.patientProfile) {
        return res.status(200).json({ success: true, count: 0, tests: [] });
      }
      query.patient = req.user.patientProfile;
    } else if (req.user.role === 'doctor') {
      if (!req.user.doctorProfile) {
        return res.status(200).json({ success: true, count: 0, tests: [] });
      }
      query.doctor = req.user.doctorProfile;
    }

    if (status && status !== 'all') query.status = status;
    if (patientId) query.patient = patientId;
    if (doctorId) query.doctor = doctorId;
    if (category && category !== 'all') query.category = category;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await LabTest.countDocuments(query);
    const tests = await LabTest.find(query)
      .populate('patient', 'patientId name phone email gender dateOfBirth age')
      .populate('doctor', 'name specialization')
      .populate('report')
      .sort({ requestedDate: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      count: tests.length,
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
      tests,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single lab test with report details
// @route   GET /api/lab/tests/:id
// @access  Private
exports.getLabTestById = async (req, res, next) => {
  try {
    const test = await LabTest.findById(req.params.id)
      .populate('patient')
      .populate('doctor')
      .populate('report');

    if (!test) {
      return res.status(404).json({
        success: false,
        message: 'Lab test not found',
      });
    }

    res.status(200).json({
      success: true,
      test,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Request a lab test for a patient
// @route   POST /api/lab/tests
// @access  Private (Doctor, Admin)
exports.requestLabTest = async (req, res, next) => {
  try {
    const {
      patientId,
      doctorId,
      appointmentId,
      consultationId,
      testName,
      category = 'Hematology',
      price = 500,
      clinicalNotes,
    } = req.body;

    const assignedDoctorId = req.user.role === 'doctor' ? req.user.doctorProfile : doctorId;

    if (!patientId || !testName || !assignedDoctorId) {
      return res.status(400).json({
        success: false,
        message: 'Patient, Doctor, and Test Name are required.',
      });
    }

    const patient = await Patient.findById(patientId).populate('user');
    const doctor = await Doctor.findById(assignedDoctorId);

    const count = await LabTest.countDocuments();
    const currentYear = new Date().getFullYear();
    const testId = `LAB-${currentYear}-${String(count + 1).padStart(4, '0')}`;

    const labTest = await LabTest.create({
      testId,
      patient: patientId,
      doctor: assignedDoctorId,
      appointment: appointmentId || null,
      consultation: consultationId || null,
      testName,
      category,
      price,
      clinicalNotes: clinicalNotes || '',
      status: 'Requested',
    });

    // Notify patient
    if (patient.user) {
      await createNotification({
        recipient: patient.user._id,
        title: 'Diagnostic Test Requested',
        message: `Dr. ${doctor?.name || 'Doctor'} requested ${testName} (${testId}). Please visit the hospital lab for sample collection.`,
        type: 'lab',
        relatedEntity: { entityType: 'LabTest', entityId: labTest._id },
      });
    }

    await logAction({
      action: 'LAB_TEST_REQUESTED',
      performedBy: req.user._id,
      performedByName: req.user.name,
      userRole: req.user.role,
      details: `Lab test ${testName} (${testId}) ordered for ${patient.name} by Dr. ${doctor?.name || 'Doctor'}`,
      entityType: 'LabTest',
      entityId: labTest._id.toString(),
      ipAddress: req.ip,
    });

    res.status(201).json({
      success: true,
      message: 'Lab test ordered successfully',
      test: labTest,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update lab test status (Sample collected, Processing, Completed)
// @route   PUT /api/lab/tests/:id/status
// @access  Private (Admin, Doctor, Receptionist)
exports.updateLabTestStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const test = await LabTest.findById(req.params.id).populate('patient');

    if (!test) {
      return res.status(404).json({
        success: false,
        message: 'Lab test not found',
      });
    }

    test.status = status;
    if (status === 'Sample collected') {
      test.sampleCollectedAt = new Date();
    } else if (status === 'Completed') {
      test.completedAt = new Date();
    }

    await test.save();

    await logAction({
      action: 'LAB_STATUS_UPDATED',
      performedBy: req.user._id,
      performedByName: req.user.name,
      userRole: req.user.role,
      details: `Lab test ${test.testId} status changed to ${status}`,
      entityType: 'LabTest',
      entityId: test._id.toString(),
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      message: `Test status updated to ${status}`,
      test,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Enter lab report results & complete test
// @route   POST /api/lab/tests/:id/report
// @access  Private (Admin, Doctor)
exports.enterLabReport = async (req, res, next) => {
  try {
    const { resultSummary, detailedResults, notes, fileUrl } = req.body;

    const test = await LabTest.findById(req.params.id)
      .populate('patient')
      .populate('doctor');

    if (!test) {
      return res.status(404).json({
        success: false,
        message: 'Lab test not found',
      });
    }

    const reportCount = await LabReport.countDocuments();
    const currentYear = new Date().getFullYear();
    const reportId = `REP-${currentYear}-${String(reportCount + 1).padStart(4, '0')}`;

    const report = await LabReport.create({
      reportId,
      labTest: test._id,
      patient: test.patient._id,
      technician: req.user._id,
      testName: test.testName,
      resultSummary,
      detailedResults: detailedResults || [],
      notes: notes || '',
      fileUrl: fileUrl || '',
      completedDate: new Date(),
    });

    test.status = 'Completed';
    test.completedAt = new Date();
    test.report = report._id;
    await test.save();

    // Notify patient
    if (test.patient?.user) {
      await createNotification({
        recipient: test.patient.user,
        title: 'Laboratory Report Ready',
        message: `Your test report for ${test.testName} (${reportId}) is now available to view.`,
        type: 'lab',
        relatedEntity: { entityType: 'LabReport', entityId: report._id },
      });
    }

    await logAction({
      action: 'LAB_REPORT_ENTERED',
      performedBy: req.user._id,
      performedByName: req.user.name,
      userRole: req.user.role,
      details: `Report ${reportId} entered for test ${test.testName} (${test.patient.name})`,
      entityType: 'LabReport',
      entityId: report._id.toString(),
      ipAddress: req.ip,
    });

    res.status(201).json({
      success: true,
      message: 'Laboratory report generated and test marked completed',
      report,
      test,
    });
  } catch (err) {
    next(err);
  }
};
