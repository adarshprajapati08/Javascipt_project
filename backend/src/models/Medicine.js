const mongoose = require('mongoose');

const medicineSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Medicine name is required'],
    trim: true,
  },
  genericName: {
    type: String,
    default: '',
    trim: true,
  },
  category: {
    type: String,
    enum: ['Antibiotic', 'Analgesic', 'Antipyretic', 'Antihypertensive', 'Antidiabetic', 'Antihistamine', 'Antacid', 'Cardiovascular', 'Vitamin/Supplement', 'Other'],
    default: 'Other',
  },
  stockQuantity: {
    type: Number,
    required: true,
    min: 0,
    default: 0,
  },
  unit: {
    type: String,
    default: 'Tablets', // Tablets, Capsules, Syrups, Injections, Ointments
  },
  batchNumber: {
    type: String,
    required: [true, 'Batch number is required'],
    trim: true,
  },
  expiryDate: {
    type: Date,
    required: [true, 'Expiry date is required'],
  },
  supplier: {
    type: String,
    default: 'Direct Pharma Ltd.',
  },
  purchasePrice: {
    type: Number,
    required: true,
    min: 0,
  },
  sellingPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  minStockThreshold: {
    type: Number,
    default: 25,
  },
  status: {
    type: String,
    enum: ['in-stock', 'low-stock', 'out-of-stock', 'expired'],
    default: 'in-stock',
  }
}, {
  timestamps: true,
});

// Auto-update status before saving
medicineSchema.pre('save', function(next) {
  const now = new Date();
  if (this.expiryDate && new Date(this.expiryDate) < now) {
    this.status = 'expired';
  } else if (this.stockQuantity <= 0) {
    this.status = 'out-of-stock';
  } else if (this.stockQuantity <= this.minStockThreshold) {
    this.status = 'low-stock';
  } else {
    this.status = 'in-stock';
  }
  next();
});

module.exports = mongoose.model('Medicine', medicineSchema);
