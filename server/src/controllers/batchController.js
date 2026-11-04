import { Batch } from '../models/Batch.js';
import { Inspection } from '../models/Inspection.js';

// Get all batches with optional query filters (status, sku, search)
export const getBatches = async (req, res) => {
  try {
    const { status, sku, search, priority } = req.query;
    const filter = {};

    if (status && status !== 'All') {
      filter.status = status;
    }
    if (sku && sku !== 'All') {
      filter.sku = sku;
    }
    if (priority && priority !== 'All') {
      filter.priority = priority;
    }
    if (search) {
      filter.$or = [
        { batchNumber: { $regex: search, $options: 'i' } },
        { productName: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { productionLine: { $regex: search, $options: 'i' } }
      ];
    }

    const batches = await Batch.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, count: batches.length, data: batches });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get single batch by ID, populated with its inspections
export const getBatchById = async (req, res) => {
  try {
    const batch = await Batch.findById(req.params.id);
    if (!batch) {
      return res.status(404).json({ success: false, message: 'Batch not found' });
    }

    const inspections = await Inspection.find({ batchId: batch._id }).sort({ inspectionDate: -1 });

    res.json({ success: true, data: { ...batch.toObject(), inspections } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create a new batch
export const createBatch = async (req, res) => {
  try {
    const {
      batchNumber,
      sku,
      productName,
      totalQuantity,
      sampleSize,
      productionLine,
      operator,
      inspector,
      priority,
      checkpoints,
      notes
    } = req.body;

    if (!batchNumber || !sku || !productName || !totalQuantity || !sampleSize) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: batchNumber, sku, productName, totalQuantity, sampleSize are mandatory.'
      });
    }

    // Check unique batchNumber
    const existing = await Batch.findOne({ batchNumber: batchNumber.toUpperCase().trim() });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `Batch Number "${batchNumber.toUpperCase().trim()}" already exists.`
      });
    }

    // Default checkpoints if none provided
    const defaultCheckpoints = (checkpoints && checkpoints.length > 0) ? checkpoints : [
      {
        name: 'Critical Dimension 1 (OD)',
        type: 'quantitative',
        unit: 'mm',
        nominal: 25.0,
        minTolerance: 24.8,
        maxTolerance: 25.2,
        critical: true,
        instructions: 'Measure using calibrated digital vernier caliper at midpoint.'
      },
      {
        name: 'Critical Dimension 2 (Length)',
        type: 'quantitative',
        unit: 'mm',
        nominal: 50.0,
        minTolerance: 49.7,
        maxTolerance: 50.3,
        critical: false,
        instructions: 'Overall part length check.'
      },
      {
        name: 'Surface Finish & Deburring',
        type: 'qualitative',
        unit: 'Pass/Fail',
        nominal: 1,
        minTolerance: 1,
        maxTolerance: 1,
        critical: true,
        instructions: 'Visual inspection under 1000 lux illumination. No burrs or gouges.'
      }
    ];

    const newBatch = await Batch.create({
      batchNumber: batchNumber.toUpperCase().trim(),
      sku: sku.toUpperCase().trim(),
      productName,
      totalQuantity: Number(totalQuantity),
      sampleSize: Number(sampleSize),
      productionLine: productionLine || 'Line 1',
      operator: operator || 'Operator A',
      inspector: inspector || 'Lead QA',
      priority: priority || 'Medium',
      checkpoints: defaultCheckpoints,
      notes: notes || '',
      status: 'Pending'
    });

    res.status(201).json({ success: true, data: newBatch });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update an existing batch
export const updateBatch = async (req, res) => {
  try {
    const updated = await Batch.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Batch not found' });
    }

    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete a batch
export const deleteBatch = async (req, res) => {
  try {
    const batch = await Batch.findByIdAndDelete(req.params.id);
    if (!batch) {
      return res.status(404).json({ success: false, message: 'Batch not found' });
    }

    // Also delete associated inspections
    await Inspection.deleteMany({ batchId: req.params.id });

    res.json({ success: true, message: 'Batch and its inspections removed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update disposition for quarantined or rejected batches
export const updateDisposition = async (req, res) => {
  try {
    const { type, notes, decidedBy } = req.body;
    const batch = await Batch.findById(req.params.id);

    if (!batch) {
      return res.status(404).json({ success: false, message: 'Batch not found' });
    }

    batch.disposition = {
      type: type || 'None',
      notes: notes || '',
      decidedBy: decidedBy || 'QA Supervisor',
      decidedAt: new Date()
    };

    // Update batch status based on disposition decision
    if (type === 'Rework') {
      batch.status = 'Reworked';
    } else if (type === 'Scrap') {
      batch.status = 'Rejected';
    } else if (type === 'Concession' || type === 'Released') {
      batch.status = 'Passed';
    }

    await batch.save();
    res.json({ success: true, data: batch });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

