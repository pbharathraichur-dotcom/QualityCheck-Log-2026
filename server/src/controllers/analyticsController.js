import { Batch } from '../models/Batch.js';
import { Inspection } from '../models/Inspection.js';

// Get comprehensive dashboard analytics
export const getDashboardStats = async (req, res) => {
  try {
    const totalBatches = await Batch.countDocuments();
    const passedBatches = await Batch.countDocuments({ status: 'Passed' });
    const quarantinedBatches = await Batch.countDocuments({ status: 'Quarantined' });
    const rejectedBatches = await Batch.countDocuments({ status: 'Rejected' });
    const inProgressBatches = await Batch.countDocuments({ status: 'In Progress' });
    const pendingBatches = await Batch.countDocuments({ status: 'Pending' });

    const totalCompleted = passedBatches + quarantinedBatches + rejectedBatches;
    const overallPassRate = totalCompleted > 0 ? Number(((passedBatches / totalCompleted) * 100).toFixed(1)) : 100;

    // FPY (First Pass Yield)
    const fpyPassCount = await Inspection.countDocuments({ firstPassYield: true });
    const totalInspections = await Inspection.countDocuments();
    const fpyRate = totalInspections > 0 ? Number(((fpyPassCount / totalInspections) * 100).toFixed(1)) : 100;

    // Defect Pareto Analysis
    const inspections = await Inspection.find({}, 'defects inspectionDate overallResult');
    const defectCategoryMap = {
      Dimensional: 0,
      Cosmetic: 0,
      Functional: 0,
      Material: 0,
      Packaging: 0,
      Assembly: 0
    };

    let totalDefectsCount = 0;
    inspections.forEach(ins => {
      if (Array.isArray(ins.defects)) {
        ins.defects.forEach(d => {
          totalDefectsCount++;
          const cat = d.category || 'Other';
          defectCategoryMap[cat] = (defectCategoryMap[cat] || 0) + 1;
        });
      }
    });

    // Format Pareto items sorted descending
    const paretoData = Object.entries(defectCategoryMap)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);

    let cumulative = 0;
    const paretoWithCumulative = paretoData.map(item => {
      cumulative += item.count;
      const percentage = totalDefectsCount > 0 ? Number(((item.count / totalDefectsCount) * 100).toFixed(1)) : 0;
      const cumulativePercentage = totalDefectsCount > 0 ? Number(((cumulative / totalDefectsCount) * 100).toFixed(1)) : 0;
      return {
        ...item,
        percentage,
        cumulativePercentage
      };
    });

    // Recent 7 Days Trend
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
    
    // Group recent inspections by day
    const trendMap = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000));
      const dateKey = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      trendMap[dateKey] = { date: dateKey, pass: 0, fail: 0 };
    }

    inspections.forEach(ins => {
      const d = new Date(ins.inspectionDate);
      if (d >= sevenDaysAgo) {
        const dateKey = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        if (trendMap[dateKey]) {
          if (ins.overallResult === 'PASS') {
            trendMap[dateKey].pass += 1;
          } else {
            trendMap[dateKey].fail += 1;
          }
        }
      }
    });

    const weeklyTrends = Object.values(trendMap);

    // Recent 5 inspections
    const recentInspections = await Inspection.find()
      .populate('batchId', 'batchNumber sku productName')
      .sort({ inspectionDate: -1 })
      .limit(6);

    res.json({
      success: true,
      data: {
        summary: {
          totalBatches,
          passedBatches,
          quarantinedBatches,
          rejectedBatches,
          pendingBatches,
          inProgressBatches,
          totalCompleted,
          overallPassRate,
          fpyRate,
          totalDefectsCount
        },
        pareto: paretoWithCumulative,
        weeklyTrends,
        recentInspections
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Compare two or more batches side-by-side
export const compareBatches = async (req, res) => {
  try {
    const { batchIds } = req.body;

    if (!Array.isArray(batchIds) || batchIds.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Please provide an array with at least 2 batch IDs to compare.'
      });
    }

    const batches = await Batch.find({ _id: { $in: batchIds } });
    if (batches.length < 2) {
      return res.status(404).json({
        success: false,
        message: 'Could not find enough matching batches for comparison.'
      });
    }

    // Retrieve all inspections for these batches
    const inspections = await Inspection.find({ batchId: { $in: batchIds } });

    // Build comparison metrics per batch
    const batchComparisonData = batches.map(batch => {
      const batchInspections = inspections.filter(i => i.batchId.toString() === batch._id.toString());
      
      let totalSamplesInspected = 0;
      let totalPassedSamples = 0;
      let totalDefects = 0;
      const defectCategories = {};
      const checkpointMetrics = {};

      batchInspections.forEach(ins => {
        if (ins.samples) {
          totalSamplesInspected += ins.samples.length;
          ins.samples.forEach(s => {
            if (s.samplePass) totalPassedSamples++;
            if (s.results) {
              s.results.forEach(r => {
                const cpName = r.checkpointName;
                if (!checkpointMetrics[cpName]) {
                  checkpointMetrics[cpName] = {
                    name: cpName,
                    unit: r.unit,
                    nominal: r.nominal,
                    minTolerance: r.minTolerance,
                    maxTolerance: r.maxTolerance,
                    type: r.type,
                    values: [],
                    passCount: 0,
                    failCount: 0
                  };
                }
                if (r.type === 'quantitative' && typeof r.value === 'number') {
                  checkpointMetrics[cpName].values.push(r.value);
                }
                if (r.isPass) {
                  checkpointMetrics[cpName].passCount++;
                } else {
                  checkpointMetrics[cpName].failCount++;
                }
              });
            }
          });
        }

        if (ins.defects) {
          totalDefects += ins.defects.length;
          ins.defects.forEach(d => {
            defectCategories[d.category] = (defectCategories[d.category] || 0) + 1;
          });
        }
      });

      // Calculate averages and variance for quantitative checkpoints
      const processedCheckpoints = Object.values(checkpointMetrics).map(cp => {
        if (cp.values.length > 0) {
          const sum = cp.values.reduce((a, b) => a + b, 0);
          const avg = Number((sum / cp.values.length).toFixed(3));
          const minVal = Math.min(...cp.values);
          const maxVal = Math.max(...cp.values);
          const range = Number((maxVal - minVal).toFixed(3));
          return {
            name: cp.name,
            unit: cp.unit,
            nominal: cp.nominal,
            minTolerance: cp.minTolerance,
            maxTolerance: cp.maxTolerance,
            type: cp.type,
            average: avg,
            min: minVal,
            max: maxVal,
            range,
            passRate: cp.passCount + cp.failCount > 0 
              ? Number(((cp.passCount / (cp.passCount + cp.failCount)) * 100).toFixed(1)) 
              : 100
          };
        }
        return {
          name: cp.name,
          unit: cp.unit,
          type: cp.type,
          passRate: cp.passCount + cp.failCount > 0 
            ? Number(((cp.passCount / (cp.passCount + cp.failCount)) * 100).toFixed(1)) 
            : 100
        };
      });

      const samplePassRate = totalSamplesInspected > 0 
        ? Number(((totalPassedSamples / totalSamplesInspected) * 100).toFixed(1)) 
        : (batch.status === 'Passed' ? 100 : 0);

      // Quality Index Score (0-100)
      const defectDeduction = totalDefects * 15;
      const statusBonus = batch.status === 'Passed' ? 20 : (batch.status === 'Quarantined' ? -20 : -35);
      const qualityScore = Math.max(0, Math.min(100, Math.round(samplePassRate * 0.8 + statusBonus - defectDeduction)));

      return {
        batchId: batch._id,
        batchNumber: batch.batchNumber,
        sku: batch.sku,
        productName: batch.productName,
        totalQuantity: batch.totalQuantity,
        sampleSize: batch.sampleSize,
        productionLine: batch.productionLine,
        status: batch.status,
        inspector: batch.inspector,
        createdAt: batch.createdAt,
        totalSamplesInspected,
        totalPassedSamples,
        samplePassRate,
        totalDefects,
        defectCategories,
        qualityScore,
        checkpoints: processedCheckpoints
      };
    });

    res.json({
      success: true,
      count: batchComparisonData.length,
      data: batchComparisonData
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

