import mongoose from 'mongoose';

const CheckpointResultSchema = new mongoose.Schema({
  checkpointId: { type: mongoose.Schema.Types.ObjectId },
  checkpointName: { type: String, required: true },
  type: { type: String, enum: ['quantitative', 'qualitative'], default: 'quantitative' },
  unit: { type: String, default: 'mm' },
  nominal: { type: Number, default: 0 },
  minTolerance: { type: Number, default: 0 },
  maxTolerance: { type: Number, default: 0 },
  value: { type: mongoose.Schema.Types.Mixed, required: true }, // Number for quantitative, boolean/string for qualitative
  isPass: { type: Boolean, required: true },
  deviation: { type: Number, default: 0 }
}, { _id: false });

const SampleInspectionSchema = new mongoose.Schema({
  sampleNumber: { type: Number, required: true },
  results: [CheckpointResultSchema],
  samplePass: { type: Boolean, required: true },
  notes: { type: String, default: '' }
}, { _id: false });

const DefectLogSchema = new mongoose.Schema({
  sampleNumber: { type: Number, default: 1 },
  checkpointName: { type: String, default: 'General' },
  category: { 
    type: String, 
    enum: ['Dimensional', 'Cosmetic', 'Functional', 'Material', 'Packaging', 'Assembly'], 
    default: 'Dimensional' 
  },
  severity: { 
    type: String, 
    enum: ['Minor', 'Major', 'Critical'], 
    default: 'Minor' 
  },
  description: { type: String, required: true },
  actionTaken: { type: String, default: 'Flagged for Review' }
}, { _id: true });

const InspectionSchema = new mongoose.Schema({
  batchId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Batch', 
    required: true,
    index: true 
  },
  inspectorName: { type: String, required: true },
  inspectionDate: { type: Date, default: Date.now },
  samples: [SampleInspectionSchema],
  defects: [DefectLogSchema],
  overallResult: { 
    type: String, 
    enum: ['PASS', 'FAIL'], 
    required: true,
    index: true 
  },
  passRate: { type: Number, default: 100 },
  firstPassYield: { type: Boolean, default: true },
  certificateNumber: { type: String, unique: true, sparse: true },
  summaryNotes: { type: String, default: '' },
  qaApprovedBy: { type: String, default: '' },
  qaApprovedAt: { type: Date, default: null }
}, {
  timestamps: true
});

export const Inspection = mongoose.model('Inspection', InspectionSchema);

