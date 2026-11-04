import { Inspection } from '../models/Inspection.js';
import { Batch } from '../models/Batch.js';

// Get list of inspections
export const getInspections = async (req, res) => {
  try {
    const { batchId, result, inspector, startDate, endDate } = req.query;
    const filter = {};

    if (batchId) filter.batchId = batchId;
    if (result && result !== 'All') filter.overallResult = result;
    if (inspector && inspector !== 'All') filter.inspectorName = { $regex: inspector, $options: 'i' };
    
    if (startDate || endDate) {
      filter.inspectionDate = {};
      if (startDate) filter.inspectionDate.$gte = new Date(startDate);
      if (endDate) filter.inspectionDate.$lte = new Date(endDate);
    }

    const inspections = await Inspection.find(filter)
      .populate('batchId', 'batchNumber sku productName totalQuantity sampleSize status productionLine')
      .sort({ inspectionDate: -1 });

    res.json({ success: true, count: inspections.length, data: inspections });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get single inspection by ID
export const getInspectionById = async (req, res) => {
  try {
    const inspection = await Inspection.findById(req.params.id)
      .populate('batchId');

    if (!inspection) {
      return res.status(404).json({ success: false, message: 'Inspection not found' });
    }

    res.json({ success: true, data: inspection });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create a new inspection record
export const createInspection = async (req, res) => {
  try {
    const {
      batchId,
      inspectorName,
      samples,
      defects,
      summaryNotes
    } = req.body;

    if (!batchId || !inspectorName || !samples || samples.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payload: batchId, inspectorName, and inspected samples are required.'
      });
    }

    const batch = await Batch.findById(batchId);
    if (!batch) {
      return res.status(404).json({ success: false, message: 'Referenced batch does not exist.' });
    }

    // Process and evaluate each sample & checkpoint
    let totalCheckpointsEvaluated = 0;
    let totalCheckpointsPassed = 0;
    let hasCriticalFailure = false;
    let anySampleFailed = false;

    const evaluatedSamples = samples.map((sample, sIndex) => {
      let sampleAllPass = true;

      const evaluatedResults = (sample.results || []).map(cp => {
        totalCheckpointsEvaluated++;
        let isPass = false;
        let deviation = 0;

        if (cp.type === 'quantitative') {
          const numVal = parseFloat(cp.value);
          const min = parseFloat(cp.minTolerance);
          const max = parseFloat(cp.maxTolerance);
          const nominal = parseFloat(cp.nominal) || min;

          isPass = !isNaN(numVal) && numVal >= min && numVal <= max;
          deviation = !isNaN(numVal) ? Number((numVal - nominal).toFixed(4)) : 0;
        } else {
          // Qualitative check
          isPass = cp.value === true || cp.value === 'Pass' || cp.value === 'pass' || cp.value === 1 || cp.value === '1';
          deviation = 0;
        }

        if (isPass) {
          totalCheckpointsPassed++;
        } else {
          sampleAllPass = false;
          if (cp.critical) {
            hasCriticalFailure = true;
          }
        }

        return {
          checkpointId: cp.checkpointId,
          checkpointName: cp.checkpointName,
          type: cp.type || 'quantitative',
          unit: cp.unit || 'mm',
          nominal: cp.nominal,
          minTolerance: cp.minTolerance,
          maxTolerance: cp.maxTolerance,
          value: cp.value,
          isPass,
          deviation
        };
      });

      if (!sampleAllPass) {
        anySampleFailed = true;
      }

      return {
        sampleNumber: sample.sampleNumber || (sIndex + 1),
        results: evaluatedResults,
        samplePass: sampleAllPass,
        notes: sample.notes || ''
      };
    });

    // Check defect list severity
    const defectsList = Array.isArray(defects) ? defects : [];
    const hasCriticalDefect = defectsList.some(d => d.severity === 'Critical');
    const hasMajorDefect = defectsList.some(d => d.severity === 'Major');

    // Overall decision logic
    const overallResult = (!anySampleFailed && !hasCriticalFailure && !hasCriticalDefect) ? 'PASS' : 'FAIL';
    const passRate = totalCheckpointsEvaluated > 0 
      ? Number(((totalCheckpointsPassed / totalCheckpointsEvaluated) * 100).toFixed(1)) 
      : 0;

    // Check if this was First Pass (batch was not reworked)
    const isFirstPass = batch.status !== 'Reworked';

    // Unique certificate serial
    const certSerial = `CERT-${batch.batchNumber}-${Date.now().toString().slice(-4)}`;

    const inspection = await Inspection.create({
      batchId: batch._id,
      inspectorName,
      inspectionDate: new Date(),
      samples: evaluatedSamples,
      defects: defectsList,
      overallResult,
      passRate,
      firstPassYield: isFirstPass && overallResult === 'PASS',
      certificateNumber: certSerial,
      summaryNotes: summaryNotes || '',
      qaApprovedBy: '',
      qaApprovedAt: null
    });

    // Update batch status automatically
    if (overallResult === 'PASS') {
      batch.status = 'Passed';
    } else {
      // If critical checkpoint failed or critical defect, Quarantine
      if (hasCriticalFailure || hasCriticalDefect || hasMajorDefect) {
        batch.status = 'Quarantined';
      } else {
        batch.status = 'Rejected';
      }
    }
    await batch.save();

    res.status(201).json({
      success: true,
      message: `Inspection completed with result: ${overallResult}`,
      data: inspection,
      updatedBatchStatus: batch.status
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Sign-off inspection by QA Manager / Supervisor
export const signOffInspection = async (req, res) => {
  try {
    const { qaApprovedBy } = req.body;
    const inspection = await Inspection.findById(req.params.id);

    if (!inspection) {
      return res.status(404).json({ success: false, message: 'Inspection not found' });
    }

    inspection.qaApprovedBy = qaApprovedBy || 'QA Lead';
    inspection.qaApprovedAt = new Date();
    await inspection.save();

    res.json({
      success: true,
      message: 'Quality Sign-Off recorded successfully',
      data: inspection
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

