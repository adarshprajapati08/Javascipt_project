const mongoose = require('mongoose');
const User = require('../models/User');
const Department = require('../models/Department');
const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');
const Medicine = require('../models/Medicine');
const Appointment = require('../models/Appointment');
const Prescription = require('../models/Prescription');
const LabTest = require('../models/LabTest');
const LabReport = require('../models/LabReport');
const Bill = require('../models/Bill');
const Payment = require('../models/Payment');
const AuditLog = require('../models/AuditLog');
const Notification = require('../models/Notification');
const InventoryTransaction = require('../models/InventoryTransaction');

const seedInitialData = async () => {
  try {
    const userCount = await User.countDocuments();
    if (userCount > 0) {
      console.log('[Seed] Database already contains users. Skipping initial seed.');
      return;
    }

    console.log('[Seed] Seeding MediTrack with realistic healthcare data...');

    // 1. Create System Admin
    const adminUser = await User.create({
      name: 'Dr. Sarah Mitchell',
      email: 'admin@meditrack.com',
      password: 'AdminPassword123!',
      role: 'admin',
      phone: '+91 98765 43210',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
    });

    // 2. Create Receptionist
    const receptionistUser = await User.create({
      name: 'Michael Scott',
      email: 'reception@meditrack.com',
      password: 'ReceptionPassword123!',
      role: 'receptionist',
      phone: '+91 98765 43211',
      avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150',
    });

    // 3. Create Departments
    const departmentsData = [
      { name: 'Cardiology', code: 'CARD', description: 'Comprehensive heart care, cardiology diagnostics and cardiovascular surgery', location: 'Block A, 2nd Floor', contactPhone: '+91 80 4123 0001' },
      { name: 'Neurology', code: 'NEUR', description: 'Advanced neurological disorders, brain stroke, epilepsy, and neurosurgery', location: 'Block B, 3rd Floor', contactPhone: '+91 80 4123 0002' },
      { name: 'Orthopedics', code: 'ORTH', description: 'Bone and joint care, sports injuries, spine surgery and robotic joint replacements', location: 'Block A, 1st Floor', contactPhone: '+91 80 4123 0003' },
      { name: 'Dermatology', code: 'DERM', description: 'Clinical and cosmetic dermatology, skin pathology, and allergy treatments', location: 'Block C, 2nd Floor', contactPhone: '+91 80 4123 0004' },
      { name: 'Pediatrics', code: 'PEDI', description: 'Infant, child, and adolescent healthcare, neonatology, and immunization', location: 'Block D, Ground Floor', contactPhone: '+91 80 4123 0005' },
      { name: 'General Medicine', code: 'GMED', description: 'Internal medicine, chronic illness management, and preventative health', location: 'Block A, Ground Floor', contactPhone: '+91 80 4123 0006' },
      { name: 'Gynecology & Obstetrics', code: 'GYNE', description: 'Women health, prenatal care, advanced maternity, and reproductive health', location: 'Block C, 3rd Floor', contactPhone: '+91 80 4123 0007' },
      { name: 'Ophthalmology', code: 'OPHT', description: 'Eye health, cataract surgeries, refractive care, and retina diagnostics', location: 'Block B, 1st Floor', contactPhone: '+91 80 4123 0008' },
    ];

    const createdDepartments = await Department.insertMany(departmentsData);
    const deptMap = {};
    createdDepartments.forEach(d => { deptMap[d.code] = d._id; });

    // 4. Create Doctors (User + Doctor Profile)
    const doctorsInfo = [
      {
        name: 'Dr. James Wilson',
        email: 'doctor@meditrack.com', // Demo doctor
        password: 'DoctorPassword123!',
        phone: '+91 98765 43212',
        deptCode: 'CARD',
        specialization: 'Senior Cardiologist & Interventional Heart Specialist',
        qualifications: ['MBBS', 'MD (Cardiology)', 'DM (Interventional)'],
        experience: 14,
        consultationFee: 800,
        availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        availableTimeSlots: [{ startTime: '09:00', endTime: '13:00' }, { startTime: '14:30', endTime: '17:30' }],
        bio: 'Dr. James Wilson is a renowned cardiologist specializing in acute myocardial management and angiography with over 14 years of clinical excellence.',
        avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150',
      },
      {
        name: 'Dr. Priya Sharma',
        email: 'priya.sharma@meditrack.com',
        password: 'DoctorPassword123!',
        phone: '+91 98765 43213',
        deptCode: 'GMED',
        specialization: 'Consultant Physician & Diabetologist',
        qualifications: ['MBBS', 'MD (General Medicine)', 'FDiab'],
        experience: 11,
        consultationFee: 600,
        availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        availableTimeSlots: [{ startTime: '10:00', endTime: '14:00' }, { startTime: '16:00', endTime: '19:00' }],
        bio: 'Dr. Priya Sharma specializes in long-term diabetic glycemic control, hypertension, and preventative internal medicine.',
        avatar: 'https://images.unsplash.com/photo-1594824813633-898495034c56?w=150',
      },
      {
        name: 'Dr. Robert Chen',
        email: 'robert.chen@meditrack.com',
        password: 'DoctorPassword123!',
        phone: '+91 98765 43214',
        deptCode: 'ORTH',
        specialization: 'Orthopedic & Joint Reconstruction Surgeon',
        qualifications: ['MBBS', 'MS (Orthopedics)', 'MCh Orth'],
        experience: 16,
        consultationFee: 900,
        availableDays: ['Tuesday', 'Wednesday', 'Thursday', 'Saturday'],
        availableTimeSlots: [{ startTime: '09:30', endTime: '13:30' }],
        bio: 'Specialist in complex arthroplasty, robotic knee replacements, and sports injury rehabilitation.',
        avatar: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=150',
      },
      {
        name: 'Dr. Ananya Iyer',
        email: 'ananya.iyer@meditrack.com',
        password: 'DoctorPassword123!',
        phone: '+91 98765 43215',
        deptCode: 'PEDI',
        specialization: 'Pediatric Specialist & Neonatologist',
        qualifications: ['MBBS', 'DCH', 'DNB (Pediatrics)'],
        experience: 9,
        consultationFee: 500,
        availableDays: ['Monday', 'Wednesday', 'Friday', 'Saturday'],
        availableTimeSlots: [{ startTime: '09:00', endTime: '12:30' }, { startTime: '15:00', endTime: '18:00' }],
        bio: 'Compassionate pediatric specialist caring for child development, infant nutrition, and pediatric emergency medicine.',
        avatar: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=150',
      }
    ];

    const createdDoctors = [];
    for (const d of doctorsInfo) {
      const u = await User.create({
        name: d.name,
        email: d.email,
        password: d.password,
        role: 'doctor',
        phone: d.phone,
        avatar: d.avatar,
      });

      const doc = await Doctor.create({
        user: u._id,
        name: d.name,
        department: deptMap[d.deptCode],
        specialization: d.specialization,
        qualifications: d.qualifications,
        experience: d.experience,
        consultationFee: d.consultationFee,
        availableDays: d.availableDays,
        availableTimeSlots: d.availableTimeSlots,
        bio: d.bio,
        profilePicture: d.avatar,
      });

      u.doctorProfile = doc._id;
      await u.save();
      createdDoctors.push(doc);
    }

    // Assign head doctors to some departments
    await Department.findByIdAndUpdate(deptMap['CARD'], { headDoctor: createdDoctors[0]._id });
    await Department.findByIdAndUpdate(deptMap['GMED'], { headDoctor: createdDoctors[1]._id });
    await Department.findByIdAndUpdate(deptMap['ORTH'], { headDoctor: createdDoctors[2]._id });

    // 5. Create Registered Patients
    const patientsData = [
      {
        userName: 'John Doe',
        email: 'patient@meditrack.com', // Demo patient
        password: 'PatientPassword123!',
        phone: '+91 91234 56789',
        dateOfBirth: new Date('1988-04-12'),
        gender: 'male',
        bloodGroup: 'O+',
        patientId: 'PT-2026-0001',
        address: { street: '45 Palm Grove Road', city: 'Bengaluru', state: 'Karnataka', postalCode: '560034', country: 'India' },
        emergencyContact: { name: 'Mary Doe', relationship: 'Spouse', phone: '+91 91234 56780' },
        allergies: ['Penicillin', 'Peanuts'],
        chronicConditions: ['Hypertension', 'Mild Asthma'],
        medicalHistoryNotes: 'Treated for hypercholesterolemia in 2024. Routine yearly cardiology checks recommended.',
      },
      {
        userName: 'Amina Khatun',
        email: 'amina.khatun@example.com',
        password: 'PatientPassword123!',
        phone: '+91 91234 56790',
        dateOfBirth: new Date('1994-08-25'),
        gender: 'female',
        bloodGroup: 'B+',
        patientId: 'PT-2026-0002',
        address: { street: '12 Rose Lane', city: 'Bengaluru', state: 'Karnataka', postalCode: '560001', country: 'India' },
        emergencyContact: { name: 'Tariq Khatun', relationship: 'Brother', phone: '+91 91234 56781' },
        allergies: ['Sulfa drugs'],
        chronicConditions: ['Type 2 Diabetes'],
        medicalHistoryNotes: 'Diagnosed with Type 2 Diabetes in 2023. Currently managed with oral hypoglycemic agents.',
      },
      {
        userName: 'David Miller',
        email: 'david.miller@example.com',
        password: 'PatientPassword123!',
        phone: '+91 91234 56791',
        dateOfBirth: new Date('1976-11-03'),
        gender: 'male',
        bloodGroup: 'A+',
        patientId: 'PT-2026-0003',
        address: { street: '88 Lake View Heights', city: 'Bengaluru', state: 'Karnataka', postalCode: '560076', country: 'India' },
        emergencyContact: { name: 'Susan Miller', relationship: 'Wife', phone: '+91 91234 56782' },
        allergies: [],
        chronicConditions: ['Osteoarthritis'],
        medicalHistoryNotes: 'Right knee joint pain on extended walking.',
      }
    ];

    const createdPatients = [];
    for (const p of patientsData) {
      const u = await User.create({
        name: p.userName,
        email: p.email,
        password: p.password,
        role: 'patient',
        phone: p.phone,
      });

      const pt = await Patient.create({
        patientId: p.patientId,
        user: u._id,
        name: p.userName,
        dateOfBirth: p.dateOfBirth,
        gender: p.gender,
        bloodGroup: p.bloodGroup,
        phone: p.phone,
        email: p.email,
        address: p.address,
        emergencyContact: p.emergencyContact,
        allergies: p.allergies,
        chronicConditions: p.chronicConditions,
        medicalHistoryNotes: p.medicalHistoryNotes,
      });

      u.patientProfile = pt._id;
      await u.save();
      createdPatients.push(pt);
    }

    // 6. Create Pharmacy Inventory
    const medicinesData = [
      { name: 'Amoxicillin 500mg', genericName: 'Amoxicillin', category: 'Antibiotic', stockQuantity: 240, unit: 'Capsules', batchNumber: 'AMX-2026-08', expiryDate: new Date('2027-06-30'), supplier: 'Cipla Therapeutics', purchasePrice: 45, sellingPrice: 75, minStockThreshold: 40 },
      { name: 'Paracetamol 650mg', genericName: 'Acetaminophen', category: 'Antipyretic', stockQuantity: 650, unit: 'Tablets', batchNumber: 'PCM-2026-11', expiryDate: new Date('2028-01-15'), supplier: 'GlaxoSmithKline', purchasePrice: 15, sellingPrice: 30, minStockThreshold: 100 },
      { name: 'Atorvastatin 20mg', genericName: 'Atorvastatin Calcium', category: 'Cardiovascular', stockQuantity: 180, unit: 'Tablets', batchNumber: 'ATV-2026-03', expiryDate: new Date('2027-09-20'), supplier: 'Sun Pharmaceuticals', purchasePrice: 110, sellingPrice: 165, minStockThreshold: 35 },
      { name: 'Metformin 500mg SR', genericName: 'Metformin Hydrochloride', category: 'Antidiabetic', stockQuantity: 320, unit: 'Tablets', batchNumber: 'MET-2026-09', expiryDate: new Date('2027-11-30'), supplier: 'Dr. Reddys Labs', purchasePrice: 28, sellingPrice: 48, minStockThreshold: 50 },
      { name: 'Amlodipine 5mg', genericName: 'Amlodipine Besylate', category: 'Antihypertensive', stockQuantity: 190, unit: 'Tablets', batchNumber: 'AML-2026-05', expiryDate: new Date('2027-08-15'), supplier: 'Lupin Pharma', purchasePrice: 22, sellingPrice: 40, minStockThreshold: 30 },
      { name: 'Azithromycin 500mg', genericName: 'Azithromycin', category: 'Antibiotic', stockQuantity: 18, unit: 'Tablets', batchNumber: 'AZI-2026-01', expiryDate: new Date('2026-12-15'), supplier: 'Alembic Pharma', purchasePrice: 85, sellingPrice: 130, minStockThreshold: 30 }, // Low stock item
      { name: 'Pantoprazole 40mg', genericName: 'Pantoprazole Sodium', category: 'Antacid', stockQuantity: 410, unit: 'Tablets', batchNumber: 'PAN-2026-04', expiryDate: new Date('2027-10-10'), supplier: 'Alkem Laboratories', purchasePrice: 55, sellingPrice: 85, minStockThreshold: 60 },
      { name: 'Montelukast & Levocetirizine', genericName: 'Montelukast 10mg + Levo 5mg', category: 'Antihistamine', stockQuantity: 140, unit: 'Tablets', batchNumber: 'MON-2026-07', expiryDate: new Date('2027-04-25'), supplier: 'Mankind Pharma', purchasePrice: 90, sellingPrice: 145, minStockThreshold: 30 },
    ];

    const createdMedicines = await Medicine.insertMany(medicinesData);

    // Initial stock transactions
    for (const med of createdMedicines) {
      await InventoryTransaction.create({
        medicine: med._id,
        medicineName: med.name,
        type: 'purchase',
        quantity: med.stockQuantity,
        previousStock: 0,
        currentStock: med.stockQuantity,
        reason: 'Initial warehouse intake',
        performedBy: adminUser._id,
        referenceId: med.batchNumber,
      });
    }

    // 7. Create Realistic Appointments
    const todayStr = new Date().toISOString().split('T')[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    // Appointment 1: Today for John Doe with Dr. Wilson (Checked-in)
    const apt1 = await Appointment.create({
      appointmentId: 'APT-2026-0001',
      patient: createdPatients[0]._id,
      doctor: createdDoctors[0]._id,
      department: deptMap['CARD'],
      date: todayStr,
      timeSlot: { startTime: '10:00', endTime: '10:30' },
      reason: 'Routine annual cardiology checkup and blood pressure review',
      status: 'Checked-in',
      consultationFee: 800,
      checkedInAt: new Date(),
      bookedBy: receptionistUser._id,
    });

    // Appointment 2: Today for Amina with Dr. Priya Sharma (In consultation)
    const apt2 = await Appointment.create({
      appointmentId: 'APT-2026-0002',
      patient: createdPatients[1]._id,
      doctor: createdDoctors[1]._id,
      department: deptMap['GMED'],
      date: todayStr,
      timeSlot: { startTime: '10:30', endTime: '11:00' },
      reason: 'Blood glucose quarterly review and medication adjustment',
      status: 'In consultation',
      consultationFee: 600,
      checkedInAt: new Date(Date.now() - 30 * 60 * 1000),
      bookedBy: createdPatients[1].user,
    });

    // Appointment 3: Tomorrow for David Miller with Dr. Robert Chen (Confirmed)
    const apt3 = await Appointment.create({
      appointmentId: 'APT-2026-0003',
      patient: createdPatients[2]._id,
      doctor: createdDoctors[2]._id,
      department: deptMap['ORTH'],
      date: tomorrowStr,
      timeSlot: { startTime: '11:00', endTime: '11:30' },
      reason: 'Persistent right knee ache following morning walk',
      status: 'Confirmed',
      consultationFee: 900,
      bookedBy: createdPatients[2].user,
    });

    // 8. Create a Completed Consultation & Prescription for John Doe
    const prescription1 = await Prescription.create({
      prescriptionId: 'RX-2026-0001',
      patient: createdPatients[0]._id,
      doctor: createdDoctors[0]._id,
      appointment: apt1._id,
      date: new Date(),
      diagnosis: 'Stage 1 Essential Hypertension (Well Controlled)',
      clinicalNotes: 'Resting BP 130/84 mmHg. Normal heart sounds. ECG shows regular sinus rhythm without ST elevations.',
      medicines: [
        { name: 'Amlodipine 5mg', dosage: '5mg', frequency: '1-0-0 (Morning)', duration: '30 days', instructions: 'Take after breakfast with water' },
        { name: 'Atorvastatin 20mg', dosage: '20mg', frequency: '0-0-1 (Night)', duration: '30 days', instructions: 'Take post-dinner before bedtime' }
      ],
      dietaryAdvice: 'Maintain low-sodium diet (<2g sodium/day). Engage in 30 minutes of brisk walking 5 times weekly.',
      followUpDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    // 9. Create Lab Test & Completed Report for John Doe
    const labTest1 = await LabTest.create({
      testId: 'LAB-2026-0001',
      patient: createdPatients[0]._id,
      doctor: createdDoctors[0]._id,
      appointment: apt1._id,
      testName: 'Lipid Profile',
      category: 'Biochemistry',
      price: 550,
      status: 'Completed',
      requestedDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      sampleCollectedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      completedAt: new Date(),
    });

    const report1 = await LabReport.create({
      reportId: 'REP-2026-0001',
      labTest: labTest1._id,
      patient: createdPatients[0]._id,
      technician: adminUser._id,
      testName: 'Lipid Profile',
      resultSummary: 'Mildly elevated LDL cholesterol. Triglycerides and HDL within optimal range.',
      detailedResults: [
        { parameter: 'Total Cholesterol', result: '192', unit: 'mg/dL', referenceRange: '< 200', flag: 'Normal' },
        { parameter: 'Triglycerides', result: '135', unit: 'mg/dL', referenceRange: '< 150', flag: 'Normal' },
        { parameter: 'HDL (Good) Cholesterol', result: '48', unit: 'mg/dL', referenceRange: '> 40', flag: 'Normal' },
        { parameter: 'LDL (Bad) Cholesterol', result: '117', unit: 'mg/dL', referenceRange: '< 100', flag: 'High' },
      ],
      completedDate: new Date(),
    });

    labTest1.report = report1._id;
    await labTest1.save();

    // 10. Create Billing Records
    const bill1 = await Bill.create({
      billId: 'INV-2026-0001',
      patient: createdPatients[0]._id,
      appointment: apt1._id,
      items: [
        { description: 'Cardiology Specialist Consultation (Dr. James Wilson)', category: 'Consultation', quantity: 1, unitPrice: 800, total: 800 },
        { description: 'Lipid Profile Comprehensive Lab Panel', category: 'Lab Test', quantity: 1, unitPrice: 550, total: 550 },
      ],
      subtotal: 1350,
      taxRate: 5,
      taxAmount: 67.5,
      discount: 0,
      totalAmount: 1417.5,
      paidAmount: 1417.5,
      balanceDue: 0,
      paymentStatus: 'Paid',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    const payment1 = await Payment.create({
      paymentId: 'PAY-2026-0001',
      bill: bill1._id,
      patient: createdPatients[0]._id,
      amount: 1417.5,
      paymentMethod: 'UPI / NetBanking',
      transactionReference: 'TXN-UPI-9827341920',
      status: 'Success',
      receivedBy: receptionistUser._id,
    });

    bill1.payments.push(payment1._id);
    await bill1.save();

    // Pending Bill for Amina Khatun
    await Bill.create({
      billId: 'INV-2026-0002',
      patient: createdPatients[1]._id,
      appointment: apt2._id,
      items: [
        { description: 'Consultant Physician Visit (Dr. Priya Sharma)', category: 'Consultation', quantity: 1, unitPrice: 600, total: 600 },
        { description: 'HbA1c Glycated Hemoglobin Diagnostic', category: 'Lab Test', quantity: 1, unitPrice: 450, total: 450 },
      ],
      subtotal: 1050,
      taxRate: 5,
      taxAmount: 52.5,
      discount: 50,
      totalAmount: 1052.5,
      paidAmount: 0,
      balanceDue: 1052.5,
      paymentStatus: 'Unpaid',
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    });

    // 11. Initial In-App Notifications
    await Notification.create({
      recipient: createdPatients[0].user,
      title: 'Appointment Confirmed',
      message: `Your appointment with Dr. James Wilson is confirmed for today at 10:00 AM.`,
      type: 'appointment',
      relatedEntity: { entityType: 'Appointment', entityId: apt1._id },
    });

    await Notification.create({
      recipient: createdPatients[0].user,
      title: 'Digital Prescription Issued',
      message: `Dr. James Wilson has uploaded prescription #RX-2026-0001 for your records.`,
      type: 'prescription',
      relatedEntity: { entityType: 'Prescription', entityId: prescription1._id },
    });

    await Notification.create({
      recipient: createdPatients[0].user,
      title: 'Lab Report Ready',
      message: `Your Lipid Profile report is ready to download and view.`,
      type: 'lab',
      relatedEntity: { entityType: 'LabReport', entityId: report1._id },
    });

    // 12. Audit Logs
    await AuditLog.create({
      action: 'SYSTEM_INITIALIZATION',
      performedBy: adminUser._id,
      performedByName: adminUser.name,
      userRole: 'admin',
      details: 'MediTrack Smart Hospital Platform initialized with seeded clinical departments and demo staff.',
      entityType: 'System',
      entityId: 'SYSTEM-ROOT',
    });

    console.log('[Seed] Seeding completed successfully!');
    console.log('================================================================');
    console.log('DEMO ACCOUNTS READY FOR EVALUATION:');
    console.log('1. Admin:        admin@meditrack.com        / AdminPassword123!');
    console.log('2. Doctor:       doctor@meditrack.com       / DoctorPassword123!');
    console.log('3. Receptionist: reception@meditrack.com    / ReceptionPassword123!');
    console.log('4. Patient:      patient@meditrack.com      / PatientPassword123!');
    console.log('================================================================');
  } catch (err) {
    console.error('[Seed Error]:', err);
  }
};

module.exports = { seedInitialData };

// If run directly from command line (e.g. npm run seed)
if (require.main === module) {
  const { connectDB, disconnectDB } = require('../config/db');
  require('dotenv').config();

  (async () => {
    try {
      await connectDB();
      await seedInitialData();
      await disconnectDB();
      process.exit(0);
    } catch (e) {
      console.error(e);
      process.exit(1);
    }
  })();
}
