const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const Department = require('../models/Department');
const Appointment = require('../models/Appointment');
const Consultation = require('../models/Consultation');
const Prescription = require('../models/Prescription');
const LabTest = require('../models/LabTest');
const Medicine = require('../models/Medicine');
const Bill = require('../models/Bill');
const Payment = require('../models/Payment');
const AuditLog = require('../models/AuditLog');
const Notification = require('../models/Notification');

// Helper to get formatted date string "YYYY-MM-DD"
const getTodayString = () => {
  const now = new Date();
  return now.toISOString().split('T')[0];
};

// @desc    Get Admin Dashboard metrics & charts data
// @route   GET /api/dashboard/admin
// @access  Private (Admin)
exports.getAdminDashboard = async (req, res, next) => {
  try {
    const today = getTodayString();

    // 1. High-level metric counts
    const [
      totalPatients,
      totalDoctors,
      totalDepartments,
      todayAppointments,
      completedToday,
      pendingToday,
      checkedInToday,
      lowStockMeds,
      recentLogs,
    ] = await Promise.all([
      Patient.countDocuments(),
      Doctor.countDocuments({ status: 'active' }),
      Department.countDocuments({ status: 'active' }),
      Appointment.countDocuments({ date: today }),
      Appointment.countDocuments({ date: today, status: 'Completed' }),
      Appointment.countDocuments({ date: today, status: { $in: ['Pending', 'Confirmed'] } }),
      Appointment.countDocuments({ date: today, status: 'Checked-in' }),
      Medicine.find({ status: { $in: ['low-stock', 'out-of-stock'] } }).limit(5),
      AuditLog.find().sort({ createdAt: -1 }).limit(8),
    ]);

    // 2. Financial Metrics
    const bills = await Bill.find();
    let totalBilled = 0;
    let totalCollected = 0;
    let totalDue = 0;

    bills.forEach(b => {
      totalBilled += b.totalAmount || 0;
      totalCollected += b.paidAmount || 0;
      totalDue += b.balanceDue || 0;
    });

    // 3. Appointment Trends for the last 7 days
    const past7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const count = await Appointment.countDocuments({ date: dateStr });
      const completed = await Appointment.countDocuments({ date: dateStr, status: 'Completed' });
      past7Days.push({
        date: dateStr,
        day: d.toLocaleDateString('en-US', { weekday: 'short' }),
        appointments: count,
        completed,
      });
    }

    // 4. Department Distribution
    const departments = await Department.find({ status: 'active' });
    const departmentStats = await Promise.all(
      departments.map(async (dept) => {
        const count = await Appointment.countDocuments({ department: dept._id });
        const docCount = await Doctor.countDocuments({ department: dept._id, status: 'active' });
        return {
          name: dept.name,
          code: dept.code,
          appointments: count,
          doctors: docCount,
        };
      })
    );

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalPatients,
          totalDoctors,
          totalDepartments,
          todayAppointments,
          completedToday,
          pendingToday,
          checkedInToday,
          totalBilled,
          totalCollected,
          totalDue,
        },
        trends: past7Days,
        departmentStats,
        lowStockAlerts: lowStockMeds,
        recentActivity: recentLogs,
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get Doctor Dashboard metrics
// @route   GET /api/dashboard/doctor
// @access  Private (Doctor)
exports.getDoctorDashboard = async (req, res, next) => {
  try {
    const doctorId = req.user.doctorProfile;
    if (!doctorId) {
      return res.status(400).json({ success: false, message: 'Doctor profile missing' });
    }

    const today = getTodayString();

    const [
      doctor,
      todayAppointments,
      checkedInQueue,
      pendingApprovals,
      upcomingAppointments,
      totalConsultations,
      pendingLabReviews,
    ] = await Promise.all([
      Doctor.findById(doctorId).populate('department', 'name'),
      Appointment.find({ doctor: doctorId, date: today })
        .populate('patient', 'patientId name phone gender dateOfBirth age')
        .sort({ 'timeSlot.startTime': 1 }),
      Appointment.find({ doctor: doctorId, date: today, status: 'Checked-in' })
        .populate('patient', 'patientId name phone gender dateOfBirth age')
        .sort({ checkedInAt: 1 }),
      Appointment.find({ doctor: doctorId, status: 'Pending' })
        .populate('patient', 'patientId name phone')
        .sort({ date: 1, 'timeSlot.startTime': 1 })
        .limit(10),
      Appointment.find({ doctor: doctorId, date: { $gt: today }, status: { $nin: ['Cancelled', 'Declined'] } })
        .populate('patient', 'patientId name phone')
        .sort({ date: 1, 'timeSlot.startTime': 1 })
        .limit(5),
      Consultation.countDocuments({ doctor: doctorId }),
      LabTest.countDocuments({ doctor: doctorId, status: 'Completed' }),
    ]);

    const completedToday = todayAppointments.filter(a => a.status === 'Completed').length;
    const pendingToday = todayAppointments.filter(a => ['Confirmed', 'Pending'].includes(a.status)).length;

    res.status(200).json({
      success: true,
      data: {
        doctor,
        stats: {
          todayCount: todayAppointments.length,
          completedToday,
          pendingToday,
          waitingInQueue: checkedInQueue.length,
          pendingApprovals: pendingApprovals.length,
          totalConsultations,
          pendingLabReviews,
        },
        todaySchedule: todayAppointments,
        patientQueue: checkedInQueue,
        pendingApprovals,
        upcoming: upcomingAppointments,
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get Patient Dashboard metrics
// @route   GET /api/dashboard/patient
// @access  Private (Patient)
exports.getPatientDashboard = async (req, res, next) => {
  try {
    const patientId = req.user.patientProfile;
    if (!patientId) {
      return res.status(400).json({ success: false, message: 'Patient profile missing' });
    }

    const today = getTodayString();

    const [
      patient,
      nextAppointment,
      recentAppointments,
      latestPrescriptions,
      recentLabReports,
      pendingBills,
      unreadNotifications,
    ] = await Promise.all([
      Patient.findById(patientId),
      Appointment.findOne({
        patient: patientId,
        date: { $gte: today },
        status: { $in: ['Confirmed', 'Pending', 'Checked-in'] }
      })
        .populate('doctor', 'name specialization consultationFee')
        .populate('department', 'name location')
        .sort({ date: 1, 'timeSlot.startTime': 1 }),
      Appointment.find({ patient: patientId })
        .populate('doctor', 'name specialization')
        .populate('department', 'name')
        .sort({ date: -1 })
        .limit(5),
      Prescription.find({ patient: patientId })
        .populate('doctor', 'name specialization')
        .sort({ createdAt: -1 })
        .limit(3),
      LabTest.find({ patient: patientId })
        .populate('doctor', 'name')
        .populate('report')
        .sort({ requestedDate: -1 })
        .limit(4),
      Bill.find({ patient: patientId, paymentStatus: { $ne: 'Paid' } })
        .sort({ createdAt: -1 }),
      Notification.countDocuments({ recipient: req.user._id, isRead: false }),
    ]);

    let totalDue = 0;
    pendingBills.forEach(b => { totalDue += b.balanceDue || 0; });

    res.status(200).json({
      success: true,
      data: {
        patient,
        nextAppointment,
        recentAppointments,
        latestPrescriptions,
        recentLabReports,
        billingSummary: {
          pendingBillsCount: pendingBills.length,
          totalDue,
          bills: pendingBills,
        },
        unreadNotifications,
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get Receptionist Dashboard metrics
// @route   GET /api/dashboard/receptionist
// @access  Private (Receptionist, Admin)
exports.getReceptionistDashboard = async (req, res, next) => {
  try {
    const today = getTodayString();

    const [
      todayAppointments,
      totalPatientsCount,
      activeDoctorsCount,
      checkedInCount,
      completedCount,
      recentPatients,
    ] = await Promise.all([
      Appointment.find({ date: today })
        .populate('patient', 'patientId name phone gender')
        .populate('doctor', 'name specialization')
        .populate('department', 'name')
        .sort({ 'timeSlot.startTime': 1 }),
      Patient.countDocuments(),
      Doctor.countDocuments({ status: 'active' }),
      Appointment.countDocuments({ date: today, status: 'Checked-in' }),
      Appointment.countDocuments({ date: today, status: 'Completed' }),
      Patient.find().sort({ createdAt: -1 }).limit(5),
    ]);

    res.status(200).json({
      success: true,
      data: {
        stats: {
          todayAppointmentsCount: todayAppointments.length,
          checkedInCount,
          completedCount,
          pendingCheckInCount: todayAppointments.filter(a => a.status === 'Confirmed').length,
          totalPatientsCount,
          activeDoctorsCount,
        },
        todaySchedule: todayAppointments,
        recentRegistrations: recentPatients,
      }
    });
  } catch (err) {
    next(err);
  }
};
