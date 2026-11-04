import mongoose from 'mongoose';

const CheckpointSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['quantitative', 'qualitative'], default: 'quantitative' },
  unit: { type: String, default: 'mm' },
  nominal: { type: Number, default: 0 },
  minTolerance: { type: Number, default: 0 }, // Lower Spec Limit (LSL)
  maxTolerance: { type: Number, default: 0 }, // Upper Spec Limit (USL)
  critical: { type: Boolean, default: false },
  instructions: { type: String, default: '' }
}, { _id: true });

const BatchSchema = new mongoose.Schema({
  batchNumber: { 
    type: String, 
    required: true, 
    unique: true, 
    uppercase: true, 
    trim: true,
    index: true 
  },
  sku: { 
    type: String, 
    required: true, 
    uppercase: true, 
    trim: true,
    index: true 
  },
  productName: { type: String, required: true },
  totalQuantity: { type: Number, required: true, min: 1 },
  sampleSize: { type: Number, required: true, min: 1 },
  productionLine: { type: String, default: 'Line A' },
  operator: { type: String, default: 'Operator 1' },
  inspector: { type: String, default: 'QA Inspector' },
  priority: { 
    type: String, 
    enum: ['Low', 'Medium', 'High', 'Critical'], 
    default: 'Medium' 
  },
  status: { 
    type: String, 
    enum: ['Pending', 'In Progress', 'Passed', 'Quarantined', 'Reworked', 'Rejected'], 
    default: 'Pending',
    index: true 
  },
  checkpoints: [CheckpointSchema],
  disposition: {
    type: { type: String, enum: ['Rework', 'Scrap', 'Concession', 'Released', 'None'], default: 'None' },
    notes: { type: String, default: '' },
    decidedBy: { type: String, default: '' },
    decidedAt: { type: Date, default: null }
  },
  notes: { type: String, default: '' }
}, {
  timestamps: true
});

export const Batch = mongoose.model('Batch', BatchSchema);

