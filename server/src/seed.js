import { Batch } from './models/Batch.js';
import { Inspection } from './models/Inspection.js';

export const seedInitialData = async () => {
  if (process.env.SEED_DEMO_DATA === 'false') {
    console.log('[Seed] SEED_DEMO_DATA is explicitly disabled. Skipping demo data initialization.');
    return;
  }

  const existingBatchesCount = await Batch.countDocuments();
  const existingInspectionsCount = await Inspection.countDocuments();

  if (existingBatchesCount > 0) {
    console.log(`✓ [Seed] Persistent data verified: Database contains ${existingBatchesCount} batches and ${existingInspectionsCount} inspection records.`);
    console.log(`✓ [Seed] Preserving user data, QA sign-offs, and certificates. Re-seeding SKIPPED.`);
    return;
  }

  console.log('[Seed] Database is empty. Running one-time onboarding seed for demo batches and checklists...');

  // 1. Batch 1: Titanium Flange (Passed)
  const batch1 = await Batch.create({
    batchNumber: 'BAT-2026-001',
    sku: 'SKU-AERO-01',
    productName: 'Titanium Flange Fitting 32mm',
    totalQuantity: 30,
    sampleSize: 5,
    productionLine: 'CNC Cell 2 - 5 Axis',
    operator: 'Marcus Vance',
    inspector: 'Sarah Chen (Lead QA)',
    priority: 'High',
    status: 'Passed',
    notes: 'High-precision batch for aerospace delivery. 100% deburred.',
    checkpoints: [
      {
        name: 'Outer Flange Diameter',
        type: 'quantitative',
        unit: 'mm',
        nominal: 32.00,
        minTolerance: 31.95,
        maxTolerance: 32.05,
        critical: true,
        instructions: 'Measure at 3 orthogonal points with micrometric gauge.'
      },
      {
        name: 'Bore Internal Diameter',
        type: 'quantitative',
        unit: 'mm',
        nominal: 18.00,
        minTolerance: 17.97,
        maxTolerance: 18.03,
        critical: true,
        instructions: 'Check with three-point internal bore micrometer.'
      },
      {
        name: 'Face Flatness Runout',
        type: 'quantitative',
        unit: 'μm',
        nominal: 10.0,
        minTolerance: 0.0,
        maxTolerance: 15.0,
        critical: false,
        instructions: 'Dial test indicator on granite surface plate.'
      },
      {
        name: 'Visual Surface Integrity & Thread',
        type: 'qualitative',
        unit: 'Pass/Fail',
        nominal: 1,
        minTolerance: 1,
        maxTolerance: 1,
        critical: true,
        instructions: 'No chatter marks or thread micro-burrs.'
      }
    ]
  });

  // Inspection for Batch 1 (All Passed)
  await Inspection.create({
    batchId: batch1._id,
    inspectorName: 'Sarah Chen (Lead QA)',
    inspectionDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
    overallResult: 'PASS',
    passRate: 100,
    firstPassYield: true,
    certificateNumber: 'CERT-BAT-2026-001-9812',
    qaApprovedBy: 'David Miller (QA Director)',
    qaApprovedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000 + 3600000),
    summaryNotes: 'All 5 samples conformed strictly within aerospace 50-micron tolerance bands.',
    samples: [
      {
        sampleNumber: 1,
        samplePass: true,
        results: [
          { checkpointName: 'Outer Flange Diameter', type: 'quantitative', unit: 'mm', nominal: 32.0, minTolerance: 31.95, maxTolerance: 32.05, value: 32.01, isPass: true, deviation: 0.01 },
          { checkpointName: 'Bore Internal Diameter', type: 'quantitative', unit: 'mm', nominal: 18.0, minTolerance: 17.97, maxTolerance: 18.03, value: 17.99, isPass: true, deviation: -0.01 },
          { checkpointName: 'Face Flatness Runout', type: 'quantitative', unit: 'μm', nominal: 10.0, minTolerance: 0.0, maxTolerance: 15.0, value: 8.5, isPass: true, deviation: -1.5 },
          { checkpointName: 'Visual Surface Integrity & Thread', type: 'qualitative', unit: 'Pass/Fail', nominal: 1, minTolerance: 1, maxTolerance: 1, value: true, isPass: true, deviation: 0 }
        ]
      },
      {
        sampleNumber: 2,
        samplePass: true,
        results: [
          { checkpointName: 'Outer Flange Diameter', type: 'quantitative', unit: 'mm', nominal: 32.0, minTolerance: 31.95, maxTolerance: 32.05, value: 31.98, isPass: true, deviation: -0.02 },
          { checkpointName: 'Bore Internal Diameter', type: 'quantitative', unit: 'mm', nominal: 18.0, minTolerance: 17.97, maxTolerance: 18.03, value: 18.01, isPass: true, deviation: 0.01 },
          { checkpointName: 'Face Flatness Runout', type: 'quantitative', unit: 'μm', nominal: 10.0, minTolerance: 0.0, maxTolerance: 15.0, value: 9.0, isPass: true, deviation: -1.0 },
          { checkpointName: 'Visual Surface Integrity & Thread', type: 'qualitative', unit: 'Pass/Fail', nominal: 1, minTolerance: 1, maxTolerance: 1, value: true, isPass: true, deviation: 0 }
        ]
      },
      {
        sampleNumber: 3,
        samplePass: true,
        results: [
          { checkpointName: 'Outer Flange Diameter', type: 'quantitative', unit: 'mm', nominal: 32.0, minTolerance: 31.95, maxTolerance: 32.05, value: 32.02, isPass: true, deviation: 0.02 },
          { checkpointName: 'Bore Internal Diameter', type: 'quantitative', unit: 'mm', nominal: 18.0, minTolerance: 17.97, maxTolerance: 18.03, value: 18.00, isPass: true, deviation: 0.0 },
          { checkpointName: 'Face Flatness Runout', type: 'quantitative', unit: 'μm', nominal: 10.0, minTolerance: 0.0, maxTolerance: 15.0, value: 7.0, isPass: true, deviation: -3.0 },
          { checkpointName: 'Visual Surface Integrity & Thread', type: 'qualitative', unit: 'Pass/Fail', nominal: 1, minTolerance: 1, maxTolerance: 1, value: true, isPass: true, deviation: 0 }
        ]
      }
    ],
    defects: []
  });

  // 2. Batch 2: SMT Controller Board (Passed)
  const batch2 = await Batch.create({
    batchNumber: 'BAT-2026-002',
    sku: 'SKU-PCB-08',
    productName: 'SMT Controller Board Rev 2',
    totalQuantity: 40,
    sampleSize: 8,
    productionLine: 'SMD Pick & Place Line 1',
    operator: 'Elena Rostova',
    inspector: 'Sarah Chen (Lead QA)',
    priority: 'Medium',
    status: 'Passed',
    notes: 'Micro-controller batch for industrial robotics.',
    checkpoints: [
      {
        name: 'Supply Rail 3.3V Output',
        type: 'quantitative',
        unit: 'V',
        nominal: 3.30,
        minTolerance: 3.20,
        maxTolerance: 3.40,
        critical: true,
        instructions: 'Probe across test points TP1 and GND under 500mA load.'
      },
      {
        name: 'Quiescent Standby Current',
        type: 'quantitative',
        unit: 'mA',
        nominal: 12.0,
        minTolerance: 8.0,
        maxTolerance: 16.0,
        critical: false,
        instructions: 'Measure using calibrated digital multimeter.'
      },
      {
        name: 'Solder Joint Fillet & Polarity Check',
        type: 'qualitative',
        unit: 'Pass/Fail',
        nominal: 1,
        minTolerance: 1,
        maxTolerance: 1,
        critical: true,
        instructions: 'AOI camera verification for bridging or tombstoning.'
      }
    ]
  });

  await Inspection.create({
    batchId: batch2._id,
    inspectorName: 'Sarah Chen (Lead QA)',
    inspectionDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    overallResult: 'PASS',
    passRate: 100,
    firstPassYield: true,
    certificateNumber: 'CERT-BAT-2026-002-4412',
    qaApprovedBy: 'David Miller (QA Director)',
    qaApprovedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 2400000),
    summaryNotes: 'All rails within operational envelope. Clean solder joints.',
    samples: [
      {
        sampleNumber: 1,
        samplePass: true,
        results: [
          { checkpointName: 'Supply Rail 3.3V Output', type: 'quantitative', unit: 'V', nominal: 3.30, minTolerance: 3.20, maxTolerance: 3.40, value: 3.32, isPass: true, deviation: 0.02 },
          { checkpointName: 'Quiescent Standby Current', type: 'quantitative', unit: 'mA', nominal: 12.0, minTolerance: 8.0, maxTolerance: 16.0, value: 11.8, isPass: true, deviation: -0.2 },
          { checkpointName: 'Solder Joint Fillet & Polarity Check', type: 'qualitative', unit: 'Pass/Fail', nominal: 1, minTolerance: 1, maxTolerance: 1, value: true, isPass: true, deviation: 0 }
        ]
      },
      {
        sampleNumber: 2,
        samplePass: true,
        results: [
          { checkpointName: 'Supply Rail 3.3V Output', type: 'quantitative', unit: 'V', nominal: 3.30, minTolerance: 3.20, maxTolerance: 3.40, value: 3.28, isPass: true, deviation: -0.02 },
          { checkpointName: 'Quiescent Standby Current', type: 'quantitative', unit: 'mA', nominal: 12.0, minTolerance: 8.0, maxTolerance: 16.0, value: 13.2, isPass: true, deviation: 1.2 },
          { checkpointName: 'Solder Joint Fillet & Polarity Check', type: 'qualitative', unit: 'Pass/Fail', nominal: 1, minTolerance: 1, maxTolerance: 1, value: true, isPass: true, deviation: 0 }
        ]
      }
    ],
    defects: []
  });

  // 3. Batch 3: Medical Grade Luer Adapter (Quarantined due to dimension out of tolerance)
  const batch3 = await Batch.create({
    batchNumber: 'BAT-2026-003',
    sku: 'SKU-MED-14',
    productName: 'Medical Grade Luer Adapter 4mm',
    totalQuantity: 50,
    sampleSize: 10,
    productionLine: 'Cleanroom Injection Cell 4',
    operator: 'Kenji Takahashi',
    inspector: 'Alex Rivera (QA Tech)',
    priority: 'Critical',
    status: 'Quarantined',
    notes: 'Quarantined due to tapered wall thickness breach on sample #4 and flash on parting line.',
    disposition: {
      type: 'Rework',
      notes: 'Quarantine tag placed in Bay Q-3. Requires tool recalibration and mold deburring.',
      decidedBy: 'David Miller (QA Director)',
      decidedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
    },
    checkpoints: [
      {
        name: 'Taper Wall Thickness',
        type: 'quantitative',
        unit: 'mm',
        nominal: 1.20,
        minTolerance: 1.15,
        maxTolerance: 1.25,
        critical: true,
        instructions: 'Optical comparator measurement.'
      },
      {
        name: 'Luer Taper Angle',
        type: 'quantitative',
        unit: 'deg',
        nominal: 6.0,
        minTolerance: 5.9,
        maxTolerance: 6.1,
        critical: true,
        instructions: 'Goniometer measurement on cleanroom bench.'
      },
      {
        name: 'Flash & Parting Line Cleanliness',
        type: 'qualitative',
        unit: 'Pass/Fail',
        nominal: 1,
        minTolerance: 1,
        maxTolerance: 1,
        critical: true,
        instructions: 'Zero mold flash allowed under 10x microscope.'
      }
    ]
  });

  await Inspection.create({
    batchId: batch3._id,
    inspectorName: 'Alex Rivera (QA Tech)',
    inspectionDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    overallResult: 'FAIL',
    passRate: 77.8,
    firstPassYield: false,
    certificateNumber: 'CERT-BAT-2026-003-7721',
    summaryNotes: 'Sample #4 breached minimum wall thickness limit (1.11mm < 1.15mm min). Parting line flash observed.',
    samples: [
      {
        sampleNumber: 1,
        samplePass: true,
        results: [
          { checkpointName: 'Taper Wall Thickness', type: 'quantitative', unit: 'mm', nominal: 1.20, minTolerance: 1.15, maxTolerance: 1.25, value: 1.19, isPass: true, deviation: -0.01 },
          { checkpointName: 'Luer Taper Angle', type: 'quantitative', unit: 'deg', nominal: 6.0, minTolerance: 5.9, maxTolerance: 6.1, value: 6.02, isPass: true, deviation: 0.02 },
          { checkpointName: 'Flash & Parting Line Cleanliness', type: 'qualitative', unit: 'Pass/Fail', nominal: 1, minTolerance: 1, maxTolerance: 1, value: true, isPass: true, deviation: 0 }
        ]
      },
      {
        sampleNumber: 2,
        samplePass: false,
        results: [
          { checkpointName: 'Taper Wall Thickness', type: 'quantitative', unit: 'mm', nominal: 1.20, minTolerance: 1.15, maxTolerance: 1.25, value: 1.11, isPass: false, deviation: -0.09 },
          { checkpointName: 'Luer Taper Angle', type: 'quantitative', unit: 'deg', nominal: 6.0, minTolerance: 5.9, maxTolerance: 6.1, value: 6.05, isPass: true, deviation: 0.05 },
          { checkpointName: 'Flash & Parting Line Cleanliness', type: 'qualitative', unit: 'Pass/Fail', nominal: 1, minTolerance: 1, maxTolerance: 1, value: false, isPass: false, deviation: 0 }
        ]
      }
    ],
    defects: [
      {
        sampleNumber: 2,
        checkpointName: 'Taper Wall Thickness',
        category: 'Dimensional',
        severity: 'Critical',
        description: 'Wall thickness measured 1.11 mm, breaching lower tolerance limit of 1.15 mm.',
        actionTaken: 'Batch quarantined. Mold pressure adjustment requested.'
      },
      {
        sampleNumber: 2,
        checkpointName: 'Flash & Parting Line Cleanliness',
        category: 'Cosmetic',
        severity: 'Major',
        description: 'Visible parting line excess resin flash exceeding 0.08mm.',
        actionTaken: 'Flagged for trimming rework.'
      }
    ]
  });

  // 4. Batch 4: Titanium Flange Second Lot (Passed)
  const batch4 = await Batch.create({
    batchNumber: 'BAT-2026-004',
    sku: 'SKU-AERO-01',
    productName: 'Titanium Flange Fitting 32mm',
    totalQuantity: 25,
    sampleSize: 5,
    productionLine: 'CNC Cell 2 - 5 Axis',
    operator: 'Marcus Vance',
    inspector: 'Alex Rivera (QA Tech)',
    priority: 'High',
    status: 'Passed',
    notes: 'Consecutive batch following BAT-2026-001.',
    checkpoints: batch1.checkpoints
  });

  await Inspection.create({
    batchId: batch4._id,
    inspectorName: 'Alex Rivera (QA Tech)',
    inspectionDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    overallResult: 'PASS',
    passRate: 100,
    firstPassYield: true,
    certificateNumber: 'CERT-BAT-2026-004-1102',
    qaApprovedBy: 'David Miller (QA Director)',
    qaApprovedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 4000000),
    summaryNotes: 'Second lot passed with exceptional process stability.',
    samples: [
      {
        sampleNumber: 1,
        samplePass: true,
        results: [
          { checkpointName: 'Outer Flange Diameter', type: 'quantitative', unit: 'mm', nominal: 32.0, minTolerance: 31.95, maxTolerance: 32.05, value: 32.00, isPass: true, deviation: 0.0 },
          { checkpointName: 'Bore Internal Diameter', type: 'quantitative', unit: 'mm', nominal: 18.0, minTolerance: 17.97, maxTolerance: 18.03, value: 17.99, isPass: true, deviation: -0.01 },
          { checkpointName: 'Face Flatness Runout', type: 'quantitative', unit: 'μm', nominal: 10.0, minTolerance: 0.0, maxTolerance: 15.0, value: 6.0, isPass: true, deviation: -4.0 },
          { checkpointName: 'Visual Surface Integrity & Thread', type: 'qualitative', unit: 'Pass/Fail', nominal: 1, minTolerance: 1, maxTolerance: 1, value: true, isPass: true, deviation: 0 }
        ]
      }
    ],
    defects: []
  });

  // 5. Batch 5: Optical Sensor Enclosure (In Progress)
  await Batch.create({
    batchNumber: 'BAT-2026-005',
    sku: 'SKU-OPT-03',
    productName: 'Optical Sensor Aluminum Enclosure',
    totalQuantity: 20,
    sampleSize: 5,
    productionLine: 'Anodizing & Milling Bay',
    operator: 'Kenji Takahashi',
    inspector: 'Sarah Chen (Lead QA)',
    priority: 'Medium',
    status: 'In Progress',
    notes: 'Awaiting visual anodizing layer thickness testing.',
    checkpoints: [
      {
        name: 'Anodized Coating Thickness',
        type: 'quantitative',
        unit: 'μm',
        nominal: 20.0,
        minTolerance: 15.0,
        maxTolerance: 25.0,
        critical: true,
        instructions: 'Eddy-current coating gauge testing.'
      },
      {
        name: 'Bezel Depth',
        type: 'quantitative',
        unit: 'mm',
        nominal: 4.50,
        minTolerance: 4.40,
        maxTolerance: 4.60,
        critical: false,
        instructions: 'Depth micrometer check.'
      },
      {
        name: 'Lens Seal O-Ring Groove Check',
        type: 'qualitative',
        unit: 'Pass/Fail',
        nominal: 1,
        minTolerance: 1,
        maxTolerance: 1,
        critical: true,
        instructions: 'Inspect for pitting or tool chatter in O-ring seat.'
      }
    ]
  });

  // 6. Batch 6: Micro Planetary Gearhead (Pending)
  await Batch.create({
    batchNumber: 'BAT-2026-006',
    sku: 'SKU-DRV-90',
    productName: 'Micro Planetary Gearhead 12mm',
    totalQuantity: 15,
    sampleSize: 4,
    productionLine: 'Precision Assembly Cell 1',
    operator: 'Elena Rostova',
    inspector: 'Alex Rivera (QA Tech)',
    priority: 'High',
    status: 'Pending',
    notes: 'Scheduled for afternoon gear meshing torque inspection.',
    checkpoints: [
      {
        name: 'No-Load Backlash Angle',
        type: 'quantitative',
        unit: 'arcmin',
        nominal: 15.0,
        minTolerance: 5.0,
        maxTolerance: 20.0,
        critical: true,
        instructions: 'Measure backlash with rotary encoder fixture.'
      },
      {
        name: 'Breakaway Starting Torque',
        type: 'quantitative',
        unit: 'mNm',
        nominal: 2.5,
        minTolerance: 1.0,
        maxTolerance: 4.0,
        critical: false,
        instructions: 'Torque gauge testing on input pinion.'
      },
      {
        name: 'Shaft Concentricity',
        type: 'qualitative',
        unit: 'Pass/Fail',
        nominal: 1,
        minTolerance: 1,
        maxTolerance: 1,
        critical: true,
        instructions: 'Zero binding through 360-degree continuous rotation.'
      }
    ]
  });

  console.log('✓ [Seed] Successfully seeded 6 batches and inspection history!');
};

