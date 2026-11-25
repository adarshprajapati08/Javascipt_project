const mongoose = require('mongoose');

const inventoryTransactionSchema = new mongoose.Schema({
  medicine: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Medicine',
    required: true,
  },
  medicineName: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['purchase', 'dispense', 'adjustment', 'return', 'discard'],
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
  },
  previousStock: {
    type: Number,
    required: true,
  },
  currentStock: {
    type: Number,
    required: true,
  },
  reason: {
    type: String,
    default: '',
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  referenceId: {
    type: String, // e.g. Prescription ID, PO Number, or invoice
  }
}, {
  timestamps: true,
});

module.exports = mongoose.model('InventoryTransaction', inventoryTransactionSchema);
