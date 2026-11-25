const Bill = require('../models/Bill');
const Payment = require('../models/Payment');
const Patient = require('../models/Patient');
const Appointment = require('../models/Appointment');
const { logAction } = require('../services/auditService');
const { createNotification } = require('../services/notificationService');

// @desc    Get all bills with filtering & pagination
// @route   GET /api/billing/bills
// @access  Private
exports.getBills = async (req, res, next) => {
  try {
    const { paymentStatus, patientId, page = 1, limit = 10, search } = req.query;

    const query = {};

    if (req.user.role === 'patient') {
      if (!req.user.patientProfile) {
        return res.status(200).json({ success: true, count: 0, bills: [] });
      }
      query.patient = req.user.patientProfile;
    }

    if (paymentStatus && paymentStatus !== 'all') {
      query.paymentStatus = paymentStatus;
    }

    if (patientId) {
      query.patient = patientId;
    }

    if (search) {
      query.billId = new RegExp(search, 'i');
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Bill.countDocuments(query);
    const bills = await Bill.find(query)
      .populate('patient', 'patientId name phone email')
      .populate('appointment', 'appointmentId date')
      .populate('payments')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      count: bills.length,
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
      bills,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single bill by ID
// @route   GET /api/billing/bills/:id
// @access  Private
exports.getBillById = async (req, res, next) => {
  try {
    const bill = await Bill.findById(req.params.id)
      .populate('patient')
      .populate({
        path: 'appointment',
        populate: [
          { path: 'doctor', select: 'name specialization' },
          { path: 'department', select: 'name code' }
        ]
      })
      .populate({
        path: 'payments',
        populate: { path: 'receivedBy', select: 'name role' }
      });

    if (!bill) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found',
      });
    }

    // Role check
    if (req.user.role === 'patient') {
      if (bill.patient._id.toString() !== req.user.patientProfile.toString()) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    }

    res.status(200).json({
      success: true,
      bill,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Generate a new bill
// @route   POST /api/billing/bills
// @access  Private (Admin, Receptionist)
exports.createBill = async (req, res, next) => {
  try {
    const {
      patientId,
      appointmentId,
      items,
      taxRate = 5,
      discount = 0,
      dueDate,
      notes,
    } = req.body;

    if (!patientId || !items || !items.length) {
      return res.status(400).json({
        success: false,
        message: 'Patient ID and at least one item are required.',
      });
    }

    const patient = await Patient.findById(patientId).populate('user');
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found',
      });
    }

    // Calculate subtotal
    let subtotal = 0;
    const computedItems = items.map(item => {
      const itemTotal = (Number(item.quantity) || 1) * Number(item.unitPrice);
      subtotal += itemTotal;
      return {
        description: item.description,
        category: item.category || 'Consultation',
        quantity: Number(item.quantity) || 1,
        unitPrice: Number(item.unitPrice),
        total: itemTotal,
      };
    });

    const taxAmount = (subtotal * (Number(taxRate) || 0)) / 100;
    const totalAmount = Math.max(0, subtotal + taxAmount - (Number(discount) || 0));

    const count = await Bill.countDocuments();
    const currentYear = new Date().getFullYear();
    const billId = `INV-${currentYear}-${String(count + 1).padStart(4, '0')}`;

    const bill = await Bill.create({
      billId,
      patient: patientId,
      appointment: appointmentId || null,
      items: computedItems,
      subtotal,
      taxRate,
      taxAmount,
      discount,
      totalAmount,
      paidAmount: 0,
      balanceDue: totalAmount,
      paymentStatus: 'Unpaid',
      dueDate: dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Default 7 days
      notes: notes || '',
    });

    // Notify patient
    if (patient.user) {
      await createNotification({
        recipient: patient.user._id,
        title: 'New Hospital Invoice Generated',
        message: `Invoice #${bill.billId} for ₹${totalAmount.toLocaleString()} has been generated. Due date: ${new Date(bill.dueDate).toLocaleDateString()}.`,
        type: 'billing',
        relatedEntity: { entityType: 'Bill', entityId: bill._id },
      });
    }

    await logAction({
      action: 'BILL_GENERATED',
      performedBy: req.user._id,
      performedByName: req.user.name,
      userRole: req.user.role,
      details: `Invoice ${bill.billId} generated for ${patient.name} - Total: ₹${totalAmount}`,
      entityType: 'Bill',
      entityId: bill._id.toString(),
      ipAddress: req.ip,
    });

    res.status(201).json({
      success: true,
      message: 'Invoice created successfully',
      bill,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Record payment for a bill (includes Demo Gateway workflow)
// @route   POST /api/billing/bills/:id/payments
// @access  Private (Admin, Receptionist, Patient)
exports.recordPayment = async (req, res, next) => {
  try {
    const { amount, paymentMethod = 'Demo Gateway', notes } = req.body;
    const paymentAmount = Number(amount);

    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid payment amount.',
      });
    }

    const bill = await Bill.findById(req.params.id).populate('patient');
    if (!bill) {
      return res.status(404).json({
        success: false,
        message: 'Bill not found',
      });
    }

    if (bill.paymentStatus === 'Paid') {
      return res.status(400).json({
        success: false,
        message: 'This bill is already fully paid.',
      });
    }

    if (paymentAmount > bill.balanceDue) {
      return res.status(400).json({
        success: false,
        message: `Payment amount (₹${paymentAmount}) exceeds remaining balance due (₹${bill.balanceDue}).`,
      });
    }

    // Generate transaction reference
    const timestamp = Date.now();
    const transactionReference = `TXN-${paymentMethod.toUpperCase().replace(/\s+/g, '')}-${timestamp}`;

    const paymentCount = await Payment.countDocuments();
    const paymentId = `PAY-${new Date().getFullYear()}-${String(paymentCount + 1).padStart(4, '0')}`;

    const payment = await Payment.create({
      paymentId,
      bill: bill._id,
      patient: bill.patient._id,
      amount: paymentAmount,
      paymentMethod,
      transactionReference,
      status: 'Success',
      notes: notes || `Payment recorded via ${paymentMethod}`,
      receivedBy: req.user._id,
    });

    // Update bill
    bill.payments.push(payment._id);
    bill.paidAmount += paymentAmount;
    bill.balanceDue = Math.max(0, bill.totalAmount - bill.paidAmount);

    if (bill.balanceDue === 0) {
      bill.paymentStatus = 'Paid';
    } else {
      bill.paymentStatus = 'Partially paid';
    }

    await bill.save();

    // Patient notification
    const patientUser = await Patient.findById(bill.patient._id).populate('user');
    if (patientUser?.user) {
      await createNotification({
        recipient: patientUser.user._id,
        title: 'Payment Received',
        message: `Payment of ₹${paymentAmount.toLocaleString()} received for invoice #${bill.billId}. Status: ${bill.paymentStatus}.`,
        type: 'billing',
        relatedEntity: { entityType: 'Payment', entityId: payment._id },
      });
    }

    await logAction({
      action: 'PAYMENT_RECORDED',
      performedBy: req.user._id,
      performedByName: req.user.name,
      userRole: req.user.role,
      details: `Payment of ₹${paymentAmount} recorded for invoice ${bill.billId} via ${paymentMethod} (${transactionReference})`,
      entityType: 'Payment',
      entityId: payment._id.toString(),
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      message: 'Payment recorded successfully',
      payment,
      bill,
    });
  } catch (err) {
    next(err);
  }
};
