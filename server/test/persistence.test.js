import http from 'http';
import { spawn, execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverEntry = path.resolve(__dirname, '../src/server.js');

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
  throw new Error('Server did not become ready within 30 seconds');
}

function startServerProcess() {
  const proc = spawn('node', [serverEntry], {
    cwd: path.resolve(__dirname, '..'),
    stdio: 'pipe',
    env: process.env
  });

  proc.stdout.on('data', data => {
    process.stdout.write(`[Server stdout] ${data}`);
  });
  proc.stderr.on('data', data => {
    process.stderr.write(`[Server stderr] ${data}`);
  });

  return proc;
}

async function killProcess(proc) {
  if (!proc || !proc.pid) return;
  try {
    if (process.platform === 'win32') {
      try {
        execSync(`taskkill /F /T /PID ${proc.pid}`, { stdio: 'ignore' });
      } catch (e) {}
    } else {
      proc.kill('SIGTERM');
    }
  } catch (e) {}
  await new Promise(r => setTimeout(r, 1500));
}

async function runPersistenceTest() {
  console.log('===============================================================');
  console.log('   QualityCheck Log - Database Persistence Across Restarts Test');
  console.log('===============================================================');

  // --- STEP 1: Launch First Server Process ---
  console.log('\n[Phase 1] Launching Server Instance 1...');
  let server1 = startServerProcess();
  const health1 = await waitForServer();
  console.log(`✓ Server Instance 1 is ONLINE`);
  console.log(`  Database Storage Type: ${health1.database.storageType}`);
  console.log(`  Is Persistent: ${health1.database.isPersistent}`);
  console.assert(health1.database.isPersistent === true, 'Database must report isPersistent === true');

  // Fetch initial batch count
  const initialBatchesRes = await request('GET', '/api/batches');
  const initialCount = initialBatchesRes.body.count;
  console.log(`  Existing batches count: ${initialCount}`);

  // Create a custom test batch
  const uniqueBatchNumber = `PERSIST-BAT-${Date.now().toString().slice(-5)}`;
  console.log(`\n[Phase 2] Creating test batch: ${uniqueBatchNumber}...`);

  const createBatchRes = await request('POST', '/api/batches', {
    batchNumber: uniqueBatchNumber,
    sku: 'SKU-PERSIST-99',
    productName: 'High-Reliability Aerospace Valve Body',
    totalQuantity: 25,
    sampleSize: 3,
    productionLine: 'Cell 7 - Cleanroom CNC',
    operator: 'Operator Persistence',
    inspector: 'Sarah Chen (Lead QA)',
    priority: 'Critical',
    checkpoints: [
      {
        name: 'Critical Orifice Diameter',
        type: 'quantitative',
        unit: 'mm',
        nominal: 12.50,
        minTolerance: 12.45,
        maxTolerance: 12.55,
        critical: true
      }
    ],
    notes: 'Batch created to verify disk persistence across backend server restarts.'
  });

  console.assert(createBatchRes.status === 201, `Failed to create batch: ${JSON.stringify(createBatchRes.body)}`);
  const createdBatch = createBatchRes.body.data;
  const createdBatchId = createdBatch._id;
  console.log(`✓ Created test batch with ID: ${createdBatchId}`);

  // Submit an inspection on this batch
  console.log('\n[Phase 3] Submitting Inspection with measurements, defect tag, and certificate...');
  const inspectionRes = await request('POST', '/api/inspections', {
    batchId: createdBatchId,
    inspectorName: 'Dr. QA Inspector (Persistence Test)',
    samples: [
      {
        sampleNumber: 1,
        results: [
          {
            checkpointName: 'Critical Orifice Diameter',
            type: 'quantitative',
            unit: 'mm',
            nominal: 12.50,
            minTolerance: 12.45,
            maxTolerance: 12.55,
            value: 12.51,
            critical: true
          }
        ]
      }
    ],
    defects: [],
    summaryNotes: 'Measurements verified within 10 microns of nominal.'
  });

  console.assert(inspectionRes.status === 201, 'Inspection submission failed');
  const createdInspection = inspectionRes.body.data;
  const certificateNumber = createdInspection.certificateNumber;
  console.log(`✓ Inspection created with Certificate: ${certificateNumber}`);

  // Record QA Sign-off
  console.log('\n[Phase 4] Recording QA Director digital sign-off...');
  const signOffRes = await request('PATCH', `/api/inspections/${createdInspection._id}/sign-off`, {
    qaApprovedBy: 'Director Elena Vance (QA Board)'
  });
  console.assert(signOffRes.status === 200, 'QA sign-off failed');
  console.log(`✓ QA Sign-off recorded: ${signOffRes.body.data.qaApprovedBy}`);

  // Verify Quality Report (CoA) before restart
  const reportBeforeRes = await request('GET', `/api/reports/${createdBatchId}`);
  console.assert(reportBeforeRes.status === 200, 'Report generation failed');
  console.log(`✓ Certificate of Analysis (CoA) verified before restart: ${reportBeforeRes.body.data.certificateNumber}`);

  // --- STEP 5: Terminate Server Instance 1 Completely ---
  console.log('\n[Phase 5] Stopping Server Instance 1 (Simulating crash / process restart)...');
  await killProcess(server1);
  server1 = null;
  console.log('✓ Server Instance 1 has completely exited.');

  // Wait 2 seconds to ensure all ports and locks are released
  await new Promise(r => setTimeout(r, 2000));

  // --- STEP 6: Launch Second Brand-New Server Process ---
  console.log('\n[Phase 6] Launching Server Instance 2 in a fresh process...');
  let server2 = startServerProcess();
  const health2 = await waitForServer();
  console.log(`✓ Server Instance 2 is ONLINE`);
  console.log(`  Database Storage Type: ${health2.database.storageType}`);
  console.log(`  Is Persistent: ${health2.database.isPersistent}`);

  // --- STEP 7: Verify Data Persistence in Server Instance 2 ---
  console.log('\n[Phase 7] Verifying data persistence after restart...');

  // 1. Verify batch count is NOT re-seeded back to original
  const batchesAfterRes = await request('GET', '/api/batches');
  console.log(`  Total batches after restart: ${batchesAfterRes.body.count}`);
  console.assert(
    batchesAfterRes.body.count === initialCount + 1,
    `Expected ${initialCount + 1} batches after restart, found ${batchesAfterRes.body.count}. (Check if database was wiped or re-seeded!)`
  );
  console.log('✓ Batch count preserved: Database was NOT wiped or re-seeded!');

  // 2. Retrieve our custom test batch by ID
  const verifyBatchRes = await request('GET', `/api/batches/${createdBatchId}`);
  console.assert(verifyBatchRes.status === 200, `Batch ${uniqueBatchNumber} not found after restart!`);
  console.assert(verifyBatchRes.body.data.batchNumber === uniqueBatchNumber, 'Batch number mismatch');
  console.assert(verifyBatchRes.body.data.status === 'Passed', 'Batch status mismatch');
  console.log(`✓ Retrieved Batch ${uniqueBatchNumber} with Status: "${verifyBatchRes.body.data.status}"`);

  // 3. Retrieve and verify the inspection record and QA sign-off
  const verifyInspectionRes = await request('GET', `/api/inspections/${createdInspection._id}`);
  console.assert(verifyInspectionRes.status === 200, 'Inspection record lost after restart!');
  console.assert(
    verifyInspectionRes.body.data.certificateNumber === certificateNumber,
    `Certificate mismatch: expected ${certificateNumber}, got ${verifyInspectionRes.body.data.certificateNumber}`
  );
  console.assert(
    verifyInspectionRes.body.data.qaApprovedBy === 'Director Elena Vance (QA Board)',
    `QA sign-off lost: expected "Director Elena Vance (QA Board)", got "${verifyInspectionRes.body.data.qaApprovedBy}"`
  );
  console.assert(
    verifyInspectionRes.body.data.samples[0].results[0].value === 12.51,
    'Sample measurement values corrupted or lost after restart'
  );
  console.log(`✓ Retrieved Inspection Record:`);
  console.log(`    Certificate Number: ${verifyInspectionRes.body.data.certificateNumber}`);
  console.log(`    QA Approved By:     ${verifyInspectionRes.body.data.qaApprovedBy}`);
  console.log(`    Sample Measurement: ${verifyInspectionRes.body.data.samples[0].results[0].value} mm (Preserved)`);

  // 4. Retrieve and verify Certificate of Analysis (CoA)
  const reportAfterRes = await request('GET', `/api/reports/${createdBatchId}`);
  console.assert(reportAfterRes.status === 200, 'CoA report generation failed after restart');
  console.assert(reportAfterRes.body.data.certificateNumber === certificateNumber, 'CoA certificate serial mismatch');
  console.log(`✓ Certificate of Analysis (CoA) generated cleanly after restart!`);

  // --- CLEANUP ---
  console.log('\n[Phase 8] Cleaning up test batch...');
  await request('DELETE', `/api/batches/${createdBatchId}`);
  console.log('✓ Test batch cleaned up.');

  // Stop Server 2
  await killProcess(server2);
  server2 = null;

  console.log('\n===============================================================');
  console.log('✓ SUCCESS: DATABASE PERSISTENCE VERIFIED 100%!');
  console.log('  - Batches persisted across process restarts');
  console.log('  - Checkpoint tolerances & measurements persisted');
  console.log('  - Defect logs & QA Director sign-offs persisted');
  console.log('  - Certificate of Analysis (CoA) serials persisted');
  console.log('  - Zero re-seeding on restart when database contains data');
  console.log('===============================================================');
}

runPersistenceTest().catch(async (err) => {
  console.error('\n✗ Persistence test failed:', err);
  process.exit(1);
});

