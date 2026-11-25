const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');
const Department = require('../models/Department');
const User = require('../models/User');
const { logAction } = require('../services/auditService');
const { createNotification } = require('../services/notificationService');

// @desc    Get appointments with filtering & pagination
// @route   GET /api/appointments
// @access  Private
exports.getAppointments = async (req, res, next) => {
  try {
    const {
      date,
      doctorId,
      departmentId,
      patientId,
      status,
      search,
      page = 1,
      limit = 10,
      sortBy = 'date',
      sortOrder = 'desc'
    } = req.query;

    const query = {};

    // Role-based scoping:
    if (req.user.role === 'patient') {
      if (!req.user.patientProfile) {
        return res.status(200).json({ success: true, count: 0, appointments: [], total: 0 });
      }
      query.patient = req.user.patientProfile;
    } else if (req.user.role === 'doctor') {
      if (!req.user.doctorProfile) {
        return res.status(200).json({ success: true, count: 0, appointments: [], total: 0 });
      }
      query.doctor = req.user.doctorProfile;
    }

    if (date) {
      query.date = date;
    }

    if (doctorId && doctorId !== 'all' && req.user.role !== 'doctor') {
      query.doctor = doctorId;
    }

    if (departmentId && departmentId !== 'all') {
      query.department = departmentId;
    }

    if (patientId && req.user.role !== 'patient') {
      query.patient = patientId;
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1, 'timeSlot.startTime': 1 };

    const total = await Appointment.countDocuments(query);
    const appointments = await Appointment.find(query)
      .populate('patient', 'patientId name phone email gender dateOfBirth')
      .populate('doctor', 'name specialization consultationFee')
      .populate('department', 'name code location')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      count: appointments.length,
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
      appointments,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single appointment by ID
// @route   GET /api/appointments/:id
// @access  Private
exports.getAppointmentById = async (req, res, next) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate('patient')
      .populate('doctor')
      .populate('department')
      .populate('bookedBy', 'name role email');

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found',
      });
    }

    // Role security
    if (req.user.role === 'patient') {
      if (appointment.patient._id.toString() !== req.user.patientProfile.toString()) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    } else if (req.user.role === 'doctor') {
      if (appointment.doctor._id.toString() !== req.user.doctorProfile.toString()) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    }

    res.status(200).json({
      success: true,
      appointment,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Book a new appointment
// @route   POST /api/appointments
// @access  Private
exports.bookAppointment = async (req, res, next) => {
  try {
    let { patientId, doctorId, departmentId, date, timeSlot, reason, notes } = req.body;

    // If patient is booking, assign patientId from profile
    if (req.user.role === 'patient') {
      if (!req.user.patientProfile) {
        return res.status(400).json({
          success: false,
          message: 'Patient profile not found for this account.',
        });
      }
      patientId = req.user.patientProfile;
    }

    if (!patientId || !doctorId || !date || !timeSlot || !timeSlot.startTime || !timeSlot.endTime || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Please provide patient, doctor, date, valid timeSlot, and reason.',
      });
    }

    // 1. Verify doctor exists and is active
    const doctor = await Doctor.findById(doctorId).populate('user');
    if (!doctor || doctor.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Doctor is currently not available for bookings.',
      });
    }

    // If departmentId wasn't passed, pull from doctor's department
    if (!departmentId) {
      departmentId = doctor.department;
    }

    // 2. Prevent booking in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const appointmentDate = new Date(date);
    appointmentDate.setHours(0, 0, 0, 0);

    if (appointmentDate < today) {
      return res.status(400).json({
        success: false,
        message: 'Cannot schedule appointments in the past.',
      });
    }

    // 3. Verify doctor working day
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const targetDate = new Date(`${date}T00:00:00Z`);
    const dayOfWeek = dayNames[targetDate.getUTCDay()];

    if (!doctor.availableDays.includes(dayOfWeek)) {
      return res.status(400).json({
        success: false,
        message: `Dr. ${doctor.name} is not available on ${dayOfWeek}s.`,
      });
    }

    // 4. Prevent double-booking: Check existing active appointment for doctor at that date & startTime
    const conflict = await Appointment.findOne({
      doctor: doctorId,
      date,
      'timeSlot.startTime': timeSlot.startTime,
      status: { $nin: ['Cancelled', 'Declined'] },
    });

    if (conflict) {
      return res.status(409).json({
        success: false,
        message: `Time slot ${timeSlot.startTime} on ${date} is already booked for Dr. ${doctor.name}. Please select another time.`,
      });
    }

    // 5. Generate unique Appointment ID
    const count = await Appointment.countDocuments();
    const currentYear = new Date().getFullYear();
    const appointmentId = `APT-${currentYear}-${String(count + 1).padStart(4, '0')}`;

    const appointment = await Appointment.create({
      appointmentId,
      patient: patientId,
      doctor: doctorId,
      department: departmentId,
      date,
      timeSlot,
      reason,
      status: 'Pending',
      consultationFee: doctor.consultationFee,
      bookedBy: req.user._id,
      notes: notes || '',
    });

    const populatedApt = await Appointment.findById(appointment._id)
      .populate('patient', 'name phone email user')
      .populate('doctor', 'name specialization user')
      .populate('department', 'name');

    // Notify patient
    if (populatedApt.patient?.user) {
      await createNotification({
        recipient: populatedApt.patient.user,
        title: 'Appointment Awaiting Approval',
        message: `Your appointment request with Dr. ${doctor.name} for ${date} at ${timeSlot.startTime} is awaiting the doctor's approval.`,
        type: 'appointment',
        relatedEntity: { entityType: 'Appointment', entityId: appointment._id },
      });
    }

    // Notify doctor
    if (doctor.user?._id) {
      await createNotification({
        recipient: doctor.user._id,
        title: 'Appointment Approval Requested',
        message: `${populatedApt.patient?.name} requested an appointment on ${date} at ${timeSlot.startTime}. Please confirm or decline it.`,
        type: 'appointment',
        relatedEntity: { entityType: 'Appointment', entityId: appointment._id },
      });
    }

    // Audit log
    await logAction({
      action: 'APPOINTMENT_BOOKED',
      performedBy: req.user._id,
      performedByName: req.user.name,
      userRole: req.user.role,
      details: `Appointment ${appointment.appointmentId} booked for ${populatedApt.patient?.name} with Dr. ${doctor.name} on ${date} at ${timeSlot.startTime}`,
      entityType: 'Appointment',
      entityId: appointment._id.toString(),
      ipAddress: req.ip,
    });

    res.status(201).json({
      success: true,
      message: 'Appointment request sent to the doctor for approval',
      appointment: populatedApt,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Reschedule appointment
// @route   PUT /api/appointments/:id/reschedule
// @access  Private
exports.rescheduleAppointment = async (req, res, next) => {
  try {
    const { date, timeSlot } = req.body;

    if (!date || !timeSlot || !timeSlot.startTime || !timeSlot.endTime) {
      return res.status(400).json({
        success: false,
        message: 'New date and timeSlot are required.',
      });
    }

    const appointment = await Appointment.findById(req.params.id)
      .populate('doctor')
      .populate('patient');

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found',
      });
    }

    if (['Completed', 'Cancelled', 'Declined'].includes(appointment.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot reschedule an appointment that is already ${appointment.status.toLowerCase()}.`,
      });
    }

    // Check conflict on new date/time
    const conflict = await Appointment.findOne({
      _id: { $ne: appointment._id },
      doctor: appointment.doctor._id,
      date,
      'timeSlot.startTime': timeSlot.startTime,
      status: { $nin: ['Cancelled', 'Declined'] },
    });

    if (conflict) {
      return res.status(409).json({
        success: false,
        message: `Dr. ${appointment.doctor.name} already has an appointment at ${timeSlot.startTime} on ${date}.`,
      });
    }

    const oldDate = appointment.date;
    const oldTime = appointment.timeSlot.startTime;

    appointment.date = date;
    appointment.timeSlot = timeSlot;
    const awaitingApproval = appointment.status === 'Pending';
    appointment.status = awaitingApproval ? 'Pending' : 'Confirmed';
    await appointment.save();

    // Notify patient
    if (appointment.patient?.user) {
      await createNotification({
        recipient: appointment.patient.user,
        title: 'Appointment Rescheduled',
        message: awaitingApproval
          ? `Your appointment request with Dr. ${appointment.doctor.name} was rescheduled to ${date} at ${timeSlot.startTime} and is awaiting approval.`
          : `Your appointment with Dr. ${appointment.doctor.name} was rescheduled to ${date} at ${timeSlot.startTime}.`,
        type: 'appointment',
        relatedEntity: { entityType: 'Appointment', entityId: appointment._id },
      });
    }

    if (awaitingApproval && appointment.doctor?.user) {
      await createNotification({
        recipient: appointment.doctor.user,
        title: 'Appointment Approval Requested',
        message: `${appointment.patient?.name} rescheduled an appointment request to ${date} at ${timeSlot.startTime}. Please confirm or decline it.`,
        type: 'appointment',
        relatedEntity: { entityType: 'Appointment', entityId: appointment._id },
      });
    }

    // Audit log
    await logAction({
      action: 'APPOINTMENT_RESCHEDULED',
      performedBy: req.user._id,
      performedByName: req.user.name,
      userRole: req.user.role,
      details: `Appointment ${appointment.appointmentId} rescheduled from ${oldDate} ${oldTime} to ${date} ${timeSlot.startTime}`,
      entityType: 'Appointment',
      entityId: appointment._id.toString(),
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      message: 'Appointment rescheduled successfully',
      appointment,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Cancel appointment
// @route   PUT /api/appointments/:id/cancel
// @access  Private
exports.cancelAppointment = async (req, res, next) => {
  try {
    const { cancellationReason = 'Cancelled by user' } = req.body;

    const appointment = await Appointment.findById(req.params.id)
      .populate('doctor')
      .populate('patient');

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found',
      });
    }

    if (appointment.status === 'Completed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel a completed appointment.',
      });
    }

    appointment.status = 'Cancelled';
    appointment.cancellationReason = cancellationReason;
    await appointment.save();

    // Notify patient
    if (appointment.patient?.user) {
      await createNotification({
        recipient: appointment.patient.user,
        title: 'Appointment Cancelled',
        message: `Your appointment with Dr. ${appointment.doctor.name} on ${appointment.date} was cancelled: ${cancellationReason}`,
        type: 'appointment',
        relatedEntity: { entityType: 'Appointment', entityId: appointment._id },
      });
    }

    // Audit log
    await logAction({
      action: 'APPOINTMENT_CANCELLED',
      performedBy: req.user._id,
      performedByName: req.user.name,
      userRole: req.user.role,
      details: `Appointment ${appointment.appointmentId} cancelled. Reason: ${cancellationReason}`,
      entityType: 'Appointment',
      entityId: appointment._id.toString(),
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      message: 'Appointment cancelled successfully',
      appointment,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Check-in patient for appointment
// @route   PUT /api/appointments/:id/check-in
// @access  Private (Receptionist, Admin, Doctor)
exports.checkInPatient = async (req, res, next) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate('patient')
      .populate('doctor');

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found',
      });
    }

    if (appointment.status !== 'Confirmed') {
      return res.status(400).json({
        success: false,
        message: 'Only doctor-approved appointments can be checked in.',
      });
    }

    appointment.status = 'Checked-in';
    appointment.checkedInAt = new Date();
    await appointment.save();

    // Notify doctor that patient has arrived in waiting room
    if (appointment.doctor?.user) {
      await createNotification({
        recipient: appointment.doctor.user,
        title: 'Patient Checked In',
        message: `${appointment.patient.name} has checked in for the ${appointment.timeSlot.startTime} appointment.`,
        type: 'appointment',
        relatedEntity: { entityType: 'Appointment', entityId: appointment._id },
      });
    }

    await logAction({
      action: 'PATIENT_CHECKED_IN',
      performedBy: req.user._id,
      performedByName: req.user.name,
      userRole: req.user.role,
      details: `Patient ${appointment.patient.name} checked in for appointment ${appointment.appointmentId}`,
      entityType: 'Appointment',
      entityId: appointment._id.toString(),
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      message: 'Patient checked in successfully',
      appointment,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update appointment status
// @route   PUT /api/appointments/:id/status
// @access  Private (Doctor, Receptionist, Admin)
exports.updateAppointmentStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const validStatuses = ['Pending', 'Confirmed', 'Checked-in', 'In consultation', 'Completed', 'Cancelled', 'Declined'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found',
      });
    }

    if (appointment.status === 'Declined' && status !== 'Declined') {
      return res.status(400).json({
        success: false,
        message: 'A declined appointment cannot be reactivated.',
      });
    }

    if (status === 'Confirmed' && !['Pending', 'Confirmed'].includes(appointment.status)) {
      return res.status(400).json({
        success: false,
        message: 'Only a pending appointment request can be confirmed.',
      });
    }

    if (req.user.role === 'doctor') {
      if (!req.user.doctorProfile || appointment.doctor.toString() !== req.user.doctorProfile.toString()) {
        return res.status(403).json({ success: false, message: 'You can only update appointments assigned to you.' });
      }

      if (appointment.status === 'Pending' && !['Confirmed', 'Declined'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Pending appointment requests can only be confirmed or declined by the assigned doctor.',
        });
      }

      if (appointment.status !== 'Pending' && ['Pending', 'Declined'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Only pending appointment requests can be confirmed or declined.',
        });
      }
    } else if (
      ['Pending', 'Declined'].includes(status) ||
      (appointment.status === 'Pending' && status !== 'Cancelled')
    ) {
      return res.status(403).json({
        success: false,
        message: 'Only the assigned doctor can confirm or decline an appointment request.',
      });
    }

    const wasPending = appointment.status === 'Pending';
    if (wasPending && status === 'Declined') {
      appointment.cancellationReason = req.body.reason || 'Declined by doctor';
    }
    appointment.status = status;
    await appointment.save();

    const patient = await Patient.findById(appointment.patient).select('user name');
    if (wasPending && patient?.user && ['Confirmed', 'Declined'].includes(status)) {
      await createNotification({
        recipient: patient.user,
        title: status === 'Confirmed' ? 'Appointment Confirmed' : 'Appointment Declined',
        message: status === 'Confirmed'
          ? `${req.user.name} confirmed your appointment for ${appointment.date} at ${appointment.timeSlot.startTime}.`
          : `${req.user.name} declined your appointment request for ${appointment.date} at ${appointment.timeSlot.startTime}.${appointment.cancellationReason ? ` Reason: ${appointment.cancellationReason}` : ''}`,
        type: 'appointment',
        relatedEntity: { entityType: 'Appointment', entityId: appointment._id },
      });
    }

    await logAction({
      action: 'APPOINTMENT_STATUS_UPDATED',
      performedBy: req.user._id,
      performedByName: req.user.name,
      userRole: req.user.role,
      details: `Appointment ${appointment.appointmentId} status changed to ${status}`,
      entityType: 'Appointment',
      entityId: appointment._id.toString(),
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      message: `Appointment status updated to ${status}`,
      appointment,
    });
  } catch (err) {
    next(err);
  }
};
