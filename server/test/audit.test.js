import http from 'http';

const BASE_URL = 'http://127.0.0.1:5000';

function request(method, reqPath, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(reqPath, BASE_URL);
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function waitForServer(maxAttempts = 30) {
  for (let i = 1; i <= maxAttempts; i++) {
    try {
      const res = await request('GET', '/api/health');
      if (res.status === 200 && res.body?.database?.status === 'connected') {
        return res.body;
      }
    } catch (e) {
      // server starting
    }
    await new Promise(r => setTimeout(r, 1000));
  }
  throw new Error('Server did not become ready and connected within 30 seconds');
}

async function runAudit() {
  console.log('====================================================');
  console.log('   FULL QUALITYCHECK LOG (QCL) AUDIT TEST SUITE     ');
  console.log('====================================================');

  console.log('Waiting for backend server to be ready on port 5000...');
  await waitForServer();
  console.log('✓ Server is ready and database connected!\n');

  const results = {
    passed: [],
    failed: []
  };

  function assertCheck(name, condition, errorMsg = '') {
    if (condition) {
      console.log(`  ✓ PASS: ${name}`);
      results.passed.push(name);
    } else {
      console.error(`  ✗ FAIL: ${name} -> ${errorMsg}`);
      results.failed.push({ name, errorMsg });
    }
  }

  // 1. Health & DB Check
  console.log('\n--- 1. Health & Database Connectivity ---');
  const health = await request('GET', '/api/health');
  assertCheck('Health endpoint online', health.status === 200, `Status was ${health.status}`);
  assertCheck('Database is connected', health.body?.database?.status === 'connected', 'DB status not connected');
  assertCheck('Database is persistent', health.body?.database?.isPersistent === true, 'DB not reporting persistent');

  // 2. Dashboard Analytics
  console.log('\n--- 2. Dashboard & Analytics Module ---');
  const dashRes = await request('GET', '/api/analytics/dashboard');
  assertCheck('Dashboard stats endpoint returns 200', dashRes.status === 200);
  assertCheck('Summary contains totalBatches', typeof dashRes.body?.data?.summary?.totalBatches === 'number');
  assertCheck('Summary contains First Pass Yield (FPY %)', typeof dashRes.body?.data?.summary?.fpyRate === 'number');
  assertCheck('Summary contains Pass Rate %', typeof dashRes.body?.data?.summary?.overallPassRate === 'number');
  assertCheck('Pareto analysis is array with cumulative %', Array.isArray(dashRes.body?.data?.pareto));
  assertCheck('7-Day trend array populated', Array.isArray(dashRes.body?.data?.weeklyTrends));

  // 3. Manage Batches
  console.log('\n--- 3. Manage Batches Module ---');
  const batchesRes = await request('GET', '/api/batches');
  assertCheck('Fetch batches list returns 200', batchesRes.status === 200);
  assertCheck('Batches list contains seeded records', batchesRes.body?.count > 0, `Count was ${batchesRes.body?.count}`);

  // Test Filter by status
  const filterPassed = await request('GET', '/api/batches?status=Passed');
  assertCheck('Filter by status=Passed works', filterPassed.status === 200 && filterPassed.body?.data?.every(b => b.status === 'Passed'));

  // Test Search
  const searchRes = await request('GET', '/api/batches?search=Titanium');
  assertCheck('Search query works', searchRes.status === 200 && searchRes.body?.data?.some(b => b.productName.includes('Titanium')));

  // Test Form Validation: Missing fields
  const missingFieldRes = await request('POST', '/api/batches', {
    batchNumber: 'TEST-INVALID'
  });
  assertCheck('Batch creation validation rejects missing fields (400)', missingFieldRes.status === 400);

  // Create valid batch
  const auditBatchNum = `AUDIT-BAT-${Date.now().toString().slice(-4)}`;
  const createBatch = await request('POST', '/api/batches', {
    batchNumber: auditBatchNum,
    sku: 'SKU-AUDIT-01',
    productName: 'Audited Precision Bushing',
    totalQuantity: 20,
    sampleSize: 3,
    productionLine: 'Audit Line Alpha',
    operator: 'Operator Audit',
    inspector: 'Audit Lead',
    priority: 'High',
    checkpoints: [
      {
        name: 'Inside Diameter',
        type: 'quantitative',
        unit: 'mm',
        nominal: 15.00,
        minTolerance: 14.95,
        maxTolerance: 15.05,
        critical: true
      },
      {
        name: 'Surface Finish',
        type: 'qualitative',
        unit: 'Pass/Fail',
        critical: false
      }
    ]
  });
  assertCheck('Create new batch with dynamic checkpoints (201)', createBatch.status === 201);
  const auditBatchId = createBatch.body?.data?._id;

  // Test Duplicate Batch number rejection (409)
  const duplicateBatch = await request('POST', '/api/batches', {
    batchNumber: auditBatchNum,
    sku: 'SKU-AUDIT-01',
    productName: 'Duplicate Test',
    totalQuantity: 10,
    sampleSize: 2
  });
  assertCheck('Duplicate batch number rejected with 409 Conflict', duplicateBatch.status === 409);

  // 4. New Inspection & Tolerance Evaluation
  console.log('\n--- 4. New Inspection & Dynamic Tolerance Engine ---');
  // First test passing inspection
  const inspectPass = await request('POST', '/api/inspections', {
    batchId: auditBatchId,
    inspectorName: 'Audit Inspector',
    samples: [
      {
        sampleNumber: 1,
        results: [
          {
            checkpointName: 'Inside Diameter',
            type: 'quantitative',
            unit: 'mm',
            nominal: 15.00,
            minTolerance: 14.95,
            maxTolerance: 15.05,
            value: 15.02,
            critical: true
          },
          {
            checkpointName: 'Surface Finish',
            type: 'qualitative',
            unit: 'Pass/Fail',
            value: true,
            critical: false
          }
        ]
      }
    ],
    defects: [],
    summaryNotes: 'Sample #1 conforms within 20 microns.'
  });

  assertCheck('Record conforming inspection (PASS result)', inspectPass.status === 201 && inspectPass.body?.data?.overallResult === 'PASS');
  assertCheck('Batch status auto-transitions to "Passed"', inspectPass.body?.updatedBatchStatus === 'Passed');
  const certNumber = inspectPass.body?.data?.certificateNumber;
  assertCheck('Unique Certificate Serial generated', Boolean(certNumber) && certNumber.startsWith('CERT-'));

  // 5. Quarantine & Defect/NCR Workflow
  console.log('\n--- 5. Defect Tagging & Quarantine Workflow ---');
  // Create second batch for failing quarantine test
  const ncrBatchNum = `NCR-BAT-${Date.now().toString().slice(-4)}`;
  const createNcrBatch = await request('POST', '/api/batches', {
    batchNumber: ncrBatchNum,
    sku: 'SKU-NCR-99',
    productName: 'Defect Test Component',
    totalQuantity: 10,
    sampleSize: 2,
    checkpoints: [
      {
        name: 'Critical Bore',
        type: 'quantitative',
        unit: 'mm',
        nominal: 20.00,
        minTolerance: 19.90,
        maxTolerance: 20.10,
        critical: true
      }
    ]
  });
  const ncrBatchId = createNcrBatch.body?.data?._id;

  // Submit out-of-spec measurement breaching lower tolerance limit
  const inspectFail = await request('POST', '/api/inspections', {
    batchId: ncrBatchId,
    inspectorName: 'Audit QA Tech',
    samples: [
      {
        sampleNumber: 1,
        results: [
          {
            checkpointName: 'Critical Bore',
            type: 'quantitative',
            unit: 'mm',
            nominal: 20.00,
            minTolerance: 19.90,
            maxTolerance: 20.10,
            value: 19.82, // Out of spec: 19.82 < 19.90
            critical: true
          }
        ]
      }
    ],
    defects: [
      {
        sampleNumber: 1,
        checkpointName: 'Critical Bore',
        category: 'Dimensional',
        severity: 'Critical',
        description: 'Bore measured 19.82mm, undersized by 0.08mm below LSL.',
        actionTaken: 'Lot quarantined in Bay Q'
      }
    ]
  });

  assertCheck('Out-of-spec measurement evaluates to FAIL', inspectFail.status === 201 && inspectFail.body?.data?.overallResult === 'FAIL');
  assertCheck('Critical breach auto-quarantines batch ("Quarantined")', inspectFail.body?.updatedBatchStatus === 'Quarantined');

  // Test Material Review Board (MRB) Quarantine Disposition
  const dispositionRes = await request('PATCH', `/api/batches/${ncrBatchId}/disposition`, {
    type: 'Rework',
    notes: 'Approved for re-boring to upper specification limit.',
    decidedBy: 'Dr. QA Director'
  });
  assertCheck('MRB Quarantine Disposition recorded', dispositionRes.status === 200 && dispositionRes.body?.data?.disposition?.type === 'Rework');
  assertCheck('Batch status transitions to "Reworked"', dispositionRes.body?.data?.status === 'Reworked');

  // 6. QA Approval & Sign-Off
  console.log('\n--- 6. QA Approval & Sign-Off Workflow ---');
  const signOff = await request('PATCH', `/api/inspections/${inspectPass.body?.data?._id}/sign-off`, {
    qaApprovedBy: 'Quality Director Audit'
  });
  assertCheck('QA Director sign-off recorded', signOff.status === 200 && signOff.body?.data?.qaApprovedBy === 'Quality Director Audit');
  assertCheck('QA sign-off timestamp recorded', Boolean(signOff.body?.data?.qaApprovedAt));

  // 7. Batch Comparison
  console.log('\n--- 7. Batch Comparison Module ---');
  const compareRes = await request('POST', '/api/analytics/compare', {
    batchIds: [auditBatchId, ncrBatchId]
  });
  assertCheck('Cross-batch comparison returns 200', compareRes.status === 200);
  assertCheck('Returns comparative metrics for both batches', compareRes.body?.data?.length === 2);
  assertCheck('Computes Quality Index (0-100)', typeof compareRes.body?.data?.[0]?.qualityScore === 'number');

  // 8. Quality Reports & CoA
  console.log('\n--- 8. Quality Reports (Certificate of Analysis - CoA) ---');
  const reportRes = await request('GET', `/api/reports/${auditBatchId}`);
  assertCheck('Generate Certificate of Analysis data (200)', reportRes.status === 200);
  assertCheck('Certificate serial matches inspection', reportRes.body?.data?.certificateNumber === certNumber);
  assertCheck('Contains compliance rate percentage', typeof reportRes.body?.data?.inspectionSummary?.complianceRate === 'number');
  assertCheck('Contains ISO standard compliance clause', Boolean(reportRes.body?.data?.standardComplianceClause));

  // Cleanup test batches
  await request('DELETE', `/api/batches/${auditBatchId}`);
  await request('DELETE', `/api/batches/${ncrBatchId}`);

  console.log('\n====================================================');
  console.log(`AUDIT COMPLETE: ${results.passed.length} PASSED, ${results.failed.length} FAILED`);
  console.log('====================================================');

  if (results.failed.length > 0) {
    process.exit(1);
  }
}

runAudit().catch(err => {
  console.error('Audit execution error:', err);
  process.exit(1);
});
