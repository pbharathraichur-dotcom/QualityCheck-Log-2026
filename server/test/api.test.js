import http from 'http';

const BASE_URL = 'http://localhost:5000';

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
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

async function waitForServer(maxAttempts = 15) {
  for (let i = 1; i <= maxAttempts; i++) {
    try {
      const res = await request('GET', '/api/health');
      if (res.status === 200) {
        return true;
      }
    } catch (e) {
      // server still starting
    }
    await new Promise(r => setTimeout(r, 1000));
  }
  throw new Error('Server did not become ready in time');
}

async function runTests() {
  console.log('--- Starting QCL Backend Verification Tests ---');

  console.log('Waiting for server to be ready on port 5000...');
  await waitForServer();
  console.log('✓ Server is ready! Beginning test suite...');

  // 1. Health check
  console.log('1. Testing Health Endpoint...');
  const health = await request('GET', '/api/health');
  console.assert(health.status === 200, `Health check failed: ${health.status}`);
  console.log('   ✓ Health check status 200, system online');

  // 2. Fetch Batches
  console.log('2. Testing GET /api/batches...');
  const batchesRes = await request('GET', '/api/batches');
  console.assert(batchesRes.status === 200, 'Batches fetch failed');
  console.assert(batchesRes.body.count >= 6, `Expected at least 6 batches, got ${batchesRes.body.count}`);
  console.log(`   ✓ Found ${batchesRes.body.count} batches in database`);

  const firstBatch = batchesRes.body.data[0];

  // 3. Fetch Single Batch
  console.log(`3. Testing GET /api/batches/${firstBatch._id}...`);
  const singleBatchRes = await request('GET', `/api/batches/${firstBatch._id}`);
  console.assert(singleBatchRes.status === 200, 'Single batch fetch failed');
  console.log(`   ✓ Retrieved batch details for: ${singleBatchRes.body.data.batchNumber}`);

  // 4. Create New Batch
  console.log('4. Testing POST /api/batches (Create New Batch)...');
  const testBatchNumber = `TEST-${Date.now().toString().slice(-5)}`;
  const createBatchRes = await request('POST', '/api/batches', {
    batchNumber: testBatchNumber,
    sku: 'SKU-TST-01',
    productName: 'Automated Test Part 50mm',
    totalQuantity: 20,
    sampleSize: 3,
    productionLine: 'Test Cell 1',
    operator: 'Automated Tester',
    inspector: 'Test QA',
    priority: 'Medium',
    checkpoints: [
      {
        name: 'Diameter',
        type: 'quantitative',
        unit: 'mm',
        nominal: 50.0,
        minTolerance: 49.5,
        maxTolerance: 50.5,
        critical: true
      },
      {
        name: 'Visual Polish',
        type: 'qualitative',
        unit: 'Pass/Fail',
        critical: false
      }
    ]
  });
  console.assert(createBatchRes.status === 201, `Create batch failed: ${JSON.stringify(createBatchRes.body)}`);
  const createdBatchId = createBatchRes.body.data._id;
  console.log(`   ✓ Created test batch: ${testBatchNumber} with ID: ${createdBatchId}`);

  // 5. Submit Inspection on Created Batch (Passing sample)
  console.log('5. Testing POST /api/inspections (Execute Inspection)...');
  const inspectionRes = await request('POST', '/api/inspections', {
    batchId: createdBatchId,
    inspectorName: 'Quality Bot',
    samples: [
      {
        sampleNumber: 1,
        results: [
          {
            checkpointName: 'Diameter',
            type: 'quantitative',
            unit: 'mm',
            nominal: 50.0,
            minTolerance: 49.5,
            maxTolerance: 50.5,
            value: 49.95,
            critical: true
          },
          {
            checkpointName: 'Visual Polish',
            type: 'qualitative',
            unit: 'Pass/Fail',
            value: true,
            critical: false
          }
        ]
      }
    ],
    defects: [],
    summaryNotes: 'Automated inspection test sample verified.'
  });
  console.assert(inspectionRes.status === 201, `Inspection creation failed: ${JSON.stringify(inspectionRes.body)}`);
  console.assert(inspectionRes.body.data.overallResult === 'PASS', 'Expected overallResult PASS');
  console.assert(inspectionRes.body.updatedBatchStatus === 'Passed', 'Expected batch status to update to Passed');
  console.log(`   ✓ Inspection recorded successfully. Result: ${inspectionRes.body.data.overallResult}, Batch Status: ${inspectionRes.body.updatedBatchStatus}`);

  // 6. Test Dashboard Analytics
  console.log('6. Testing GET /api/analytics/dashboard...');
  const statsRes = await request('GET', '/api/analytics/dashboard');
  console.assert(statsRes.status === 200, 'Analytics fetch failed');
  console.assert(typeof statsRes.body.data.summary.totalBatches === 'number', 'Invalid summary metrics');
  console.assert(Array.isArray(statsRes.body.data.pareto), 'Invalid pareto data structure');
  console.log(`   ✓ Dashboard stats: Total Batches=${statsRes.body.data.summary.totalBatches}, FPY=${statsRes.body.data.summary.fpyRate}%`);

  // 7. Test Batch Comparison
  console.log('7. Testing POST /api/analytics/compare (Batch Comparison)...');
  const allBatches = batchesRes.body.data;
  const compareRes = await request('POST', '/api/analytics/compare', {
    batchIds: [allBatches[0]._id, allBatches[1]._id]
  });
  console.assert(compareRes.status === 200, 'Batch comparison failed');
  console.assert(compareRes.body.data.length === 2, 'Expected 2 comparative items');
  console.log(`   ✓ Batch comparison computed for ${compareRes.body.data[0].batchNumber} vs ${compareRes.body.data[1].batchNumber}`);

  // 8. Test Quality Report / Certificate Generation
  console.log(`8. Testing GET /api/reports/${allBatches[0]._id} (Certificate of Analysis)...`);
  const reportRes = await request('GET', `/api/reports/${allBatches[0]._id}`);
  console.assert(reportRes.status === 200, 'Report generation failed');
  console.assert(reportRes.body.data.certificateNumber, 'Missing certificateNumber in report');
  console.log(`   ✓ Quality Certificate generated: ${reportRes.body.data.certificateNumber} (Compliance: ${reportRes.body.data.inspectionSummary.complianceRate}%)`);

  console.log('--- ALL BACKEND API TESTS PASSED SUCCESSFULLY! ---');
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
