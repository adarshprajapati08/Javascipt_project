const Medicine = require('../models/Medicine');
const InventoryTransaction = require('../models/InventoryTransaction');
const { logAction } = require('../services/auditService');

// @desc    Get all medicines with search, category & stock filters
// @route   GET /api/pharmacy/medicines
// @access  Private (Admin, Doctor, Receptionist)
exports.getMedicines = async (req, res, next) => {
  try {
    const { search, category, status, page = 1, limit = 10, sortBy = 'name', sortOrder = 'asc' } = req.query;

    const query = {};

    if (search) {
      query.$or = [
        { name: new RegExp(search, 'i') },
        { genericName: new RegExp(search, 'i') },
        { batchNumber: new RegExp(search, 'i') },
      ];
    }

    if (category && category !== 'all') {
      query.category = category;
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    const total = await Medicine.countDocuments(query);
    const medicines = await Medicine.find(query)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      count: medicines.length,
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
      medicines,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single medicine with its transaction history
// @route   GET /api/pharmacy/medicines/:id
// @access  Private
exports.getMedicineById = async (req, res, next) => {
  try {
    const medicine = await Medicine.findById(req.params.id);

    if (!medicine) {
      return res.status(404).json({
        success: false,
        message: 'Medicine not found',
      });
    }

    const transactions = await InventoryTransaction.find({ medicine: medicine._id })
      .populate('performedBy', 'name role')
      .sort({ createdAt: -1 })
      .limit(20);

    res.status(200).json({
      success: true,
      medicine,
      transactions,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Add new medicine to pharmacy
// @route   POST /api/pharmacy/medicines
// @access  Private (Admin)
exports.addMedicine = async (req, res, next) => {
  try {
    const {
      name,
      genericName,
      category,
      stockQuantity,
      unit,
      batchNumber,
      expiryDate,
      supplier,
      purchasePrice,
      sellingPrice,
      minStockThreshold,
    } = req.body;

    const medicine = await Medicine.create({
      name,
      genericName,
      category,
      stockQuantity: Number(stockQuantity) || 0,
      unit: unit || 'Tablets',
      batchNumber,
      expiryDate,
      supplier,
      purchasePrice: Number(purchasePrice) || 0,
      sellingPrice: Number(sellingPrice) || 0,
      minStockThreshold: Number(minStockThreshold) || 20,
    });

    // Record initial purchase/stock transaction
    await InventoryTransaction.create({
      medicine: medicine._id,
      medicineName: medicine.name,
      type: 'purchase',
      quantity: medicine.stockQuantity,
      previousStock: 0,
      currentStock: medicine.stockQuantity,
      reason: 'Initial stock intake',
      performedBy: req.user._id,
      referenceId: medicine.batchNumber,
    });

    await logAction({
      action: 'MEDICINE_ADDED',
      performedBy: req.user._id,
      performedByName: req.user.name,
      userRole: req.user.role,
      details: `New medicine added: ${medicine.name} (${medicine.stockQuantity} ${medicine.unit}, Batch: ${medicine.batchNumber})`,
      entityType: 'Medicine',
      entityId: medicine._id.toString(),
      ipAddress: req.ip,
    });

    res.status(201).json({
      success: true,
      message: 'Medicine added to inventory successfully',
      medicine,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Adjust stock quantity (dispense, restock, discard, adjustment)
// @route   POST /api/pharmacy/medicines/:id/adjust-stock
// @access  Private (Admin, Receptionist, Doctor)
exports.adjustStock = async (req, res, next) => {
  try {
    const { type, quantity, reason, referenceId } = req.body;
    const qty = Number(quantity);

    if (!type || isNaN(qty) || qty <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid adjustment type and positive quantity are required.',
      });
    }

    const medicine = await Medicine.findById(req.params.id);
    if (!medicine) {
      return res.status(404).json({
        success: false,
        message: 'Medicine not found',
      });
    }

    const previousStock = medicine.stockQuantity;
    let newStock = previousStock;

    if (['purchase', 'return'].includes(type)) {
      newStock += qty;
    } else if (['dispense', 'discard'].includes(type)) {
      if (previousStock < qty) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock. Current stock is ${previousStock}, attempted to ${type} ${qty}.`,
        });
      }
      newStock -= qty;
    } else if (type === 'adjustment') {
      newStock = qty; // Direct overwrite for inventory count reconciliation
    }

    medicine.stockQuantity = newStock;
    await medicine.save();

    const transaction = await InventoryTransaction.create({
      medicine: medicine._id,
      medicineName: medicine.name,
      type,
      quantity: qty,
      previousStock,
      currentStock: newStock,
      reason: reason || `Manual stock ${type}`,
      performedBy: req.user._id,
      referenceId: referenceId || '',
    });

    await logAction({
      action: 'INVENTORY_STOCK_ADJUSTED',
      performedBy: req.user._id,
      performedByName: req.user.name,
      userRole: req.user.role,
      details: `${type.toUpperCase()} ${qty} units of ${medicine.name}. Stock changed from ${previousStock} to ${newStock}`,
      entityType: 'Medicine',
      entityId: medicine._id.toString(),
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      message: 'Stock updated successfully',
      medicine,
      transaction,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get pharmacy alerts (low stock and expiring soon)
// @route   GET /api/pharmacy/alerts
// @access  Private (Admin, Doctor, Receptionist)
exports.getAlerts = async (req, res, next) => {
  try {
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);

    const [lowStock, expiringSoon, expired] = await Promise.all([
      Medicine.find({
        $expr: { $lte: ['$stockQuantity', '$minStockThreshold'] },
        status: { $ne: 'expired' }
      }).limit(10),
      Medicine.find({
        expiryDate: { $gte: now, $lte: thirtyDaysFromNow }
      }).limit(10),
      Medicine.find({
        expiryDate: { $lt: now }
      }).limit(10),
    ]);

    res.status(200).json({
      success: true,
      alerts: {
        lowStockCount: lowStock.length,
        expiringSoonCount: expiringSoon.length,
        expiredCount: expired.length,
        lowStock,
        expiringSoon,
        expired,
      }
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get inventory audit transactions
// @route   GET /api/pharmacy/transactions
// @access  Private (Admin)
exports.getTransactions = async (req, res, next) => {
  try {
    const { page = 1, limit = 15 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const total = await InventoryTransaction.countDocuments();
    const transactions = await InventoryTransaction.find()
      .populate('performedBy', 'name role')
      .populate('medicine', 'unit')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      count: transactions.length,
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
      transactions,
    });
  } catch (err) {
    next(err);
  }
};
