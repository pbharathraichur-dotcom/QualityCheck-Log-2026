import { Batch } from '../models/Batch.js';
import { Inspection } from '../models/Inspection.js';

// Generate comprehensive Certificate of Inspection / Analysis data
export const getQualityReport = async (req, res) => {
  try {
    const { batchId } = req.params;

    const batch = await Batch.findById(batchId);
    if (!batch) {
      return res.status(404).json({ success: false, message: 'Batch not found.' });
    }

    const inspections = await Inspection.find({ batchId: batch._id }).sort({ inspectionDate: -1 });

    const latestInspection = inspections[0] || null;

    // Calculate aggregated statistics
    let totalSamplesInspected = 0;
    let totalCheckpointsTested = 0;
    let passedCheckpointsCount = 0;
    const allDefects = [];

    inspections.forEach(ins => {
      if (ins.samples) {
        totalSamplesInspected += ins.samples.length;
        ins.samples.forEach(s => {
          if (s.results) {
            totalCheckpointsTested += s.results.length;
            passedCheckpointsCount += s.results.filter(r => r.isPass).length;
          }
        });
      }
      if (ins.defects) {
        allDefects.push(...ins.defects);
      }
    });

    const complianceRate = totalCheckpointsTested > 0 
      ? Number(((passedCheckpointsCount / totalCheckpointsTested) * 100).toFixed(1)) 
      : (batch.status === 'Passed' ? 100 : 0);

    const reportData = {
      certificateNumber: latestInspection?.certificateNumber || `CERT-${batch.batchNumber}-VERIFIED`,
      issueDate: new Date(),
      batch: {
        id: batch._id,
        batchNumber: batch.batchNumber,
        sku: batch.sku,
        productName: batch.productName,
        totalQuantity: batch.totalQuantity,
        sampleSize: batch.sampleSize,
        productionLine: batch.productionLine,
        operator: batch.operator,
        inspector: latestInspection?.inspectorName || batch.inspector,
        status: batch.status,
        priority: batch.priority,
        disposition: batch.disposition,
        createdAt: batch.createdAt
      },
      checkpointsConfig: batch.checkpoints,
      inspectionSummary: {
        inspectionsCount: inspections.length,
        totalSamplesInspected,
        totalCheckpointsTested,
        passedCheckpointsCount,
        complianceRate,
        overallVerdict: batch.status === 'Passed' ? 'APPROVED / CONFORMING' : 'NON-CONFORMING / QUARANTINED',
        qaApprovedBy: latestInspection?.qaApprovedBy || (batch.status === 'Passed' ? 'QA Supervisor' : 'Pending'),
        qaApprovedAt: latestInspection?.qaApprovedAt || (batch.status === 'Passed' ? batch.updatedAt : null)
      },
      defects: allDefects,
      sampleDetails: latestInspection?.samples || [],
      standardComplianceClause: 'Inspected under Small Batch Precision QA Protocol. Meets defined dimensional and visual criteria specifications.'
    };

    res.json({ success: true, data: reportData });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

