const Doctor = require('../models/Doctor');
const Department = require('../models/Department');
const Appointment = require('../models/Appointment');
const User = require('../models/User');
const { logAction } = require('../services/auditService');

// Helper to convert "HH:MM" to minutes from midnight
const timeToMinutes = (timeStr) => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

// Helper to convert minutes from midnight to "HH:MM"
const minutesToTime = (totalMinutes) => {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

// @desc    Get all doctors with filtering & search
// @route   GET /api/doctors
// @access  Public
exports.getDoctors = async (req, res, next) => {
  try {
    const { department, specialization, search, status = 'active' } = req.query;

    const query = {};

    if (status && status !== 'all') {
      query.status = status;
    }

    if (department && department !== 'all') {
      query.department = department;
    }

    if (specialization) {
      query.specialization = new RegExp(specialization, 'i');
    }

    if (search) {
      query.$or = [
        { name: new RegExp(search, 'i') },
        { specialization: new RegExp(search, 'i') },
      ];
    }

    const doctors = await Doctor.find(query)
      .populate('department', 'name code location')
      .populate('user', 'email avatar phone')
      .sort({ name: 1 });

    res.status(200).json({
      success: true,
      count: doctors.length,
      doctors,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single doctor by ID
// @route   GET /api/doctors/:id
// @access  Public
exports.getDoctorById = async (req, res, next) => {
  try {
    const doctor = await Doctor.findById(req.params.id)
      .populate('department', 'name code location description contactPhone')
      .populate('user', 'email avatar phone');

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found',
      });
    }

    res.status(200).json({
      success: true,
      doctor,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Calculate dynamic available slots for a doctor on a specific date
// @route   GET /api/doctors/:id/available-slots
// @access  Public
exports.getDoctorAvailableSlots = async (req, res, next) => {
  try {
    const { date } = req.query; // Format: YYYY-MM-DD
    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Date is required (format: YYYY-MM-DD)',
      });
    }

    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found',
      });
    }

    // Check if doctor is active
    if (doctor.status !== 'active') {
      return res.status(200).json({
        success: true,
        isDoctorAvailable: false,
        message: `Dr. ${doctor.name} is currently ${doctor.status}.`,
        slots: [],
      });
    }

    // Determine day of the week
    const targetDate = new Date(`${date}T00:00:00Z`);
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayOfWeek = dayNames[targetDate.getUTCDay()];

    // Check if doctor works on this day
    const isWorkingDay = doctor.availableDays.includes(dayOfWeek);
    if (!isWorkingDay) {
      return res.status(200).json({
        success: true,
        isDoctorAvailable: false,
        dayOfWeek,
        message: `Dr. ${doctor.name} does not have scheduled consultations on ${dayOfWeek}s.`,
        slots: [],
      });
    }

    // Check if date is in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    const isPastDate = checkDate < today;

    if (isPastDate) {
      return res.status(200).json({
        success: true,
        isDoctorAvailable: false,
        dayOfWeek,
        message: 'Cannot schedule appointments on a past date.',
        slots: [],
      });
    }

    // Fetch existing booked appointments on this date for this doctor that are not cancelled
    const bookedAppointments = await Appointment.find({
      doctor: doctor._id,
      date: date,
      status: { $nin: ['Cancelled', 'Declined'] }
    });

    const bookedSlotStarts = new Set(bookedAppointments.map(a => a.timeSlot.startTime));

    // Generate slots from doctor's available time ranges
    const slotDuration = doctor.slotDurationMinutes || 30;
    const generatedSlots = [];

    // Current time for same-day bookings
    const now = new Date();
    const isToday = checkDate.getTime() === today.getTime();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    for (const range of doctor.availableTimeSlots) {
      const startMin = timeToMinutes(range.startTime);
      const endMin = timeToMinutes(range.endTime);

      for (let min = startMin; min + slotDuration <= endMin; min += slotDuration) {
        const slotStart = minutesToTime(min);
        const slotEnd = minutesToTime(min + slotDuration);

        const isBooked = bookedSlotStarts.has(slotStart);
        const isPastSlot = isToday && (min <= currentMinutes);

        let available = true;
        let reason = 'Available';

        if (isBooked) {
          available = false;
          reason = 'Booked';
        } else if (isPastSlot) {
          available = false;
          reason = 'Time Passed';
        }

        generatedSlots.push({
          startTime: slotStart,
          endTime: slotEnd,
          isAvailable: available,
          reason,
        });
      }
    }

    res.status(200).json({
      success: true,
      isDoctorAvailable: true,
      dayOfWeek,
      slotDuration,
      totalSlots: generatedSlots.length,
      availableSlotsCount: generatedSlots.filter(s => s.isAvailable).length,
      slots: generatedSlots,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Create doctor profile & associated user account (Admin only)
// @route   POST /api/doctors
// @access  Private (Admin)
exports.createDoctor = async (req, res, next) => {
  try {
    const {
      name,
      email,
      password = 'Doctor@123',
      department,
      specialization,
      qualifications,
      experience,
      consultationFee,
      availableDays,
      availableTimeSlots,
      slotDurationMinutes = 30,
      bio,
      phone,
    } = req.body;

    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({
        success: false,
        message: 'A user with this email already exists.',
      });
    }

    user = await User.create({
      name,
      email,
      password,
      role: 'doctor',
      phone: phone || '',
    });

    const doctor = await Doctor.create({
      user: user._id,
      name,
      department,
      specialization,
      qualifications: Array.isArray(qualifications) ? qualifications : [qualifications],
      experience: experience || 1,
      consultationFee,
      availableDays: availableDays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      availableTimeSlots: availableTimeSlots || [
        { startTime: '09:00', endTime: '13:00' },
        { startTime: '14:00', endTime: '17:00' }
      ],
      slotDurationMinutes,
      bio: bio || '',
    });

    user.doctorProfile = doctor._id;
    await user.save();

    await logAction({
      action: 'DOCTOR_CREATED',
      performedBy: req.user._id,
      performedByName: req.user.name,
      userRole: req.user.role,
      details: `New doctor profile created: Dr. ${doctor.name} (${specialization})`,
      entityType: 'Doctor',
      entityId: doctor._id.toString(),
      ipAddress: req.ip,
    });

    res.status(201).json({
      success: true,
      message: 'Doctor created successfully',
      doctor,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update doctor profile (Admin or Doctor themselves)
// @route   PUT /api/doctors/:id
// @access  Private (Admin, Doctor)
exports.updateDoctor = async (req, res, next) => {
  try {
    let doctor = await Doctor.findById(req.params.id);
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found',
      });
    }

    // Role check: If doctor, can only update their own profile
    if (req.user.role === 'doctor' && req.user.doctorProfile.toString() !== doctor._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You can only edit your own doctor profile.',
      });
    }

    Object.assign(doctor, req.body);
    await doctor.save();

    await logAction({
      action: 'DOCTOR_UPDATED',
      performedBy: req.user._id,
      performedByName: req.user.name,
      userRole: req.user.role,
      details: `Doctor profile updated: Dr. ${doctor.name}`,
      entityType: 'Doctor',
      entityId: doctor._id.toString(),
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      message: 'Doctor profile updated successfully',
      doctor,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete doctor (Admin only)
// @route   DELETE /api/doctors/:id
// @access  Private (Admin)
exports.deleteDoctor = async (req, res, next) => {
  try {
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found',
      });
    }

    // Delete associated appointments
    await Appointment.deleteMany({ doctor: doctor._id });

    // If user account linked, delete user
    if (doctor.user) {
      await User.findByIdAndDelete(doctor.user);
    }

    await Doctor.findByIdAndDelete(req.params.id);

    await logAction({
      action: 'DOCTOR_DELETED',
      performedBy: req.user._id,
      performedByName: req.user.name,
      userRole: req.user.role,
      details: `Doctor deleted: Dr. ${doctor.name} (${doctor.specialization})`,
      entityType: 'Doctor',
      entityId: doctor._id.toString(),
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      message: 'Doctor and associated records deleted successfully',
    });
  } catch (err) {
    next(err);
  }
};
