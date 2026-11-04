import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import { StatusBadge, ResultBadge, PriorityBadge } from '../components/Badge';
import { 
  ClipboardCheck, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Plus, 
  Trash2, 
  ArrowRight, 
  ShieldCheck, 
  FileText,
  Boxes,
  HelpCircle
} from 'lucide-react';

export const NewInspection = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialBatchId = searchParams.get('batchId') || '';

  const [batches, setBatches] = useState([]);
  const [selectedBatchId, setSelectedBatchId] = useState(initialBatchId);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Inspector & Session state
  const [inspectorName, setInspectorName] = useState('Sarah Chen (Lead QA)');
  const [summaryNotes, setSummaryNotes] = useState('');
  const [activeSampleIndex, setActiveSampleIndex] = useState(0);

  // Data structure for samples: array of sample objects
  const [samplesData, setSamplesData] = useState([]);
  
  // Defect logs
  const [defects, setDefects] = useState([]);
  const [newDefect, setNewDefect] = useState({
    category: 'Dimensional',
    severity: 'Major',
    description: '',
    checkpointName: 'General',
    actionTaken: 'Quarantine Tag Placed'
  });
  const [showDefectForm, setShowDefectForm] = useState(false);

  // Completion results state
  const [completedResult, setCompletedResult] = useState(null);

  // Load active batches list for selector
  useEffect(() => {
    const loadBatchList = async () => {
      try {
        const res = await api.getBatches();
        if (res.success) {
          setBatches(res.data);
          // If no initialBatchId provided, auto-select the first pending/in progress or first batch
          if (!initialBatchId && res.data.length > 0) {
            const defaultBatch = res.data.find(b => b.status === 'Pending' || b.status === 'In Progress') || res.data[0];
            setSelectedBatchId(defaultBatch._id);
          }
        }
      } catch (err) {
        console.error('Failed to load batch list', err);
      }
    };
    loadBatchList();
  }, [initialBatchId]);

  // Load batch details when selectedBatchId changes
  useEffect(() => {
    if (!selectedBatchId) return;

    const fetchBatch = async () => {
      try {
        setLoading(true);
        const res = await api.getBatchById(selectedBatchId);
        if (res.success) {
          const batch = res.data;
          setSelectedBatch(batch);
          setCompletedResult(null);

          // Initialize samples structure based on batch.sampleSize and batch.checkpoints
          const sampleCount = Math.min(batch.sampleSize || 3, 15); // reasonable count for interactive runner
          const initialSamples = [];

          for (let i = 0; i < sampleCount; i++) {
            const checkpointResults = (batch.checkpoints || []).map(cp => ({
              checkpointId: cp._id,
              checkpointName: cp.name,
              type: cp.type || 'quantitative',
              unit: cp.unit || 'mm',
              nominal: cp.nominal,
              minTolerance: cp.minTolerance,
              maxTolerance: cp.maxTolerance,
              critical: cp.critical,
              instructions: cp.instructions,
              // Pre-fill nominal or pass as initial starting point for fast entry
              value: cp.type === 'quantitative' ? cp.nominal : true
            }));

            initialSamples.push({
              sampleNumber: i + 1,
              results: checkpointResults,
              notes: ''
            });
          }

          setSamplesData(initialSamples);
          setActiveSampleIndex(0);
          setDefects([]);
        }
      } catch (err) {
        console.error('Error fetching batch spec', err);
      } finally {
        setLoading(false);
      }
    };

    fetchBatch();
  }, [selectedBatchId]);

  // Handle measurement change for a sample & checkpoint
  const handleMeasurementChange = (sampleIdx, cpIdx, value) => {
    setSamplesData(prev => {
      const updated = JSON.parse(JSON.stringify(prev));
      updated[sampleIdx].results[cpIdx].value = value;
      return updated;
    });
  };

  // Evaluate whether a checkpoint is passing
  const evaluateCheckpoint = (cp) => {
    if (cp.type === 'quantitative') {
      const val = parseFloat(cp.value);
      if (isNaN(val)) return { isPass: false, deviation: 0, text: 'Invalid' };
      const min = parseFloat(cp.minTolerance);
      const max = parseFloat(cp.maxTolerance);
      const nominal = parseFloat(cp.nominal) || min;
      const isPass = val >= min && val <= max;
      const deviation = Number((val - nominal).toFixed(3));
      return { isPass, deviation, text: isPass ? 'IN SPEC' : 'OUT OF SPEC' };
    } else {
      const isPass = cp.value === true || cp.value === 'Pass' || cp.value === 'pass';
      return { isPass, deviation: 0, text: isPass ? 'CONFORMS' : 'NON-CONFORMING' };
    }
  };

  // Real-time calculation of overall status across all samples
  const calculateRealTimeStatus = () => {
    if (samplesData.length === 0) return { passRate: 100, isOverallPass: true, failCount: 0, totalChecks: 0 };

    let totalChecks = 0;
    let passCount = 0;
    let failCount = 0;
    let hasCriticalFailure = false;

    samplesData.forEach(sample => {
      sample.results.forEach(cp => {
        totalChecks++;
        const { isPass } = evaluateCheckpoint(cp);
        if (isPass) {
          passCount++;
        } else {
          failCount++;
          if (cp.critical) hasCriticalFailure = true;
        }
      });
    });

    const hasCriticalDefects = defects.some(d => d.severity === 'Critical');
    const passRate = totalChecks > 0 ? Number(((passCount / totalChecks) * 100).toFixed(1)) : 100;
    const isOverallPass = failCount === 0 && !hasCriticalFailure && !hasCriticalDefects;

    return {
      passRate,
      isOverallPass,
      failCount,
      totalChecks,
      hasCriticalFailure: hasCriticalFailure || hasCriticalDefects
    };
  };

  const realTimeStatus = calculateRealTimeStatus();

  // Defect handler
  const handleAddDefect = (e) => {
    e.preventDefault();
    if (!newDefect.description) {
      alert('Please provide a defect description.');
      return;
    }

    setDefects(prev => [
      ...prev,
      {
        ...newDefect,
        sampleNumber: activeSampleIndex + 1,
        id: Date.now()
      }
    ]);

    setNewDefect({
      category: 'Dimensional',
      severity: 'Major',
      description: '',
      checkpointName: 'General',
      actionTaken: 'Flagged for MRB'
    });
    setShowDefectForm(false);
  };

  const handleRemoveDefect = (idx) => {
    setDefects(prev => prev.filter((_, i) => i !== idx));
  };

  // Final Submit
  const handleSubmitInspection = async () => {
    if (!selectedBatchId) return;

    if (!window.confirm(`Submit final quality inspection for batch ${selectedBatch?.batchNumber}? This will record official compliance data.`)) {
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        batchId: selectedBatchId,
        inspectorName,
        samples: samplesData,
        defects,
        summaryNotes
      };

      const res = await api.createInspection(payload);
      if (res.success) {
        setCompletedResult(res);
      }
    } catch (err) {
      alert(`Inspection submission error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (completedResult) {
    const isPass = completedResult.data.overallResult === 'PASS';
    return (
      <div className="max-w-2xl mx-auto my-8 p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-6">
        <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center ${isPass ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'}`}>
          {isPass ? <CheckCircle2 className="w-10 h-10" /> : <XCircle className="w-10 h-10" />}
        </div>

        <div>
          <span className="text-xs font-mono uppercase tracking-wider text-slate-400">Quality Inspection Recorded</span>
          <h2 className="text-2xl font-bold text-white mt-1">
            Batch Result: {completedResult.data.overallResult}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Batch Status Updated to: <span className="font-semibold text-slate-200">{completedResult.updatedBatchStatus}</span>
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700 max-w-md mx-auto text-xs space-y-2 font-mono">
          <div className="flex justify-between">
            <span className="text-slate-400">Certificate Serial:</span>
            <span className="text-sky-400 font-semibold">{completedResult.data.certificateNumber}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Compliance Pass Rate:</span>
            <span className={completedResult.data.passRate >= 90 ? 'text-emerald-400' : 'text-amber-400'}>
              {completedResult.data.passRate}%
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Inspector:</span>
            <span className="text-slate-200">{completedResult.data.inspectorName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Defects Logged:</span>
            <span className="text-slate-200">{completedResult.data.defects?.length || 0}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link
            to={`/reports?batchId=${selectedBatchId}`}
            className="px-5 py-2.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-lg shadow-sky-600/20 flex items-center gap-2"
          >
            <FileText className="w-4 h-4" />
            <span>View Certificate of Analysis (CoA)</span>
          </Link>
          <Link
            to="/batches"
            className="px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700"
          >
            Return to Batch List
          </Link>
          <button
            onClick={() => {
              setCompletedResult(null);
            }}
            className="px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700"
          >
            Run Another Inspection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">New Quality Inspection</h1>
          <p className="text-xs text-slate-400 mt-1">Multi-sample tolerance verification, real-time spec calculation & defect tagging</p>
        </div>

        {/* Batch Selector Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-mono whitespace-nowrap">Select Target Batch:</span>
          <select
            value={selectedBatchId}
            onChange={(e) => setSelectedBatchId(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500 font-mono"
          >
            {batches.map(b => (
              <option key={b._id} value={b._id}>
                {b.batchNumber} - {b.sku} ({b.status})
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-400">Loading batch specifications...</div>
      ) : selectedBatch ? (
        <div className="space-y-6">
          {/* Batch Meta Bar */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 font-bold">
                <Boxes className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold font-mono text-white">{selectedBatch.batchNumber}</h3>
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                    {selectedBatch.sku}
                  </span>
                  <StatusBadge status={selectedBatch.status} />
                </div>
                <p className="text-xs text-slate-400">{selectedBatch.productName} · {selectedBatch.productionLine}</p>
              </div>
            </div>

            <div className="flex items-center gap-6 text-xs font-mono">
              <div>
                <span className="text-slate-500 text-[10px] block uppercase">Lot Size</span>
                <span className="text-slate-200 font-semibold">{selectedBatch.totalQuantity} units</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] block uppercase">Sample Gate</span>
                <span className="text-slate-200 font-semibold">{selectedBatch.sampleSize} samples</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] block uppercase">Live Pass Rate</span>
                <span className={`font-semibold ${realTimeStatus.passRate >= 90 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {realTimeStatus.passRate}%
                </span>
              </div>
              <div className="pl-4 border-l border-slate-800">
                <span className="text-slate-500 text-[10px] block uppercase">Status Verdict</span>
                <ResultBadge result={realTimeStatus.isOverallPass ? 'PASS' : 'FAIL'} />
              </div>
            </div>
          </div>

          {/* Sample Navigation Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-800">
            {samplesData.map((sample, idx) => {
              // Check if this sample has any fail
              const sampleHasFail = sample.results.some(cp => !evaluateCheckpoint(cp).isPass);
              return (
                <button
                  key={idx}
                  onClick={() => setActiveSampleIndex(idx)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-t-lg font-mono text-xs font-semibold transition-all border-b-2 ${
                    activeSampleIndex === idx
                      ? 'bg-slate-800 text-sky-400 border-sky-400'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 border-transparent'
                  }`}
                >
                  <span>Sample #{sample.sampleNumber}</span>
                  {sampleHasFail ? (
                    <span className="w-2 h-2 rounded-full bg-rose-500" title="Out-of-spec checkpoint" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-emerald-500" title="All in spec" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Active Sample Inspection Grid */}
          {samplesData[activeSampleIndex] && (
            <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <h3 className="text-sm font-semibold text-white tracking-wide">
                    Inspecting Sample #{samplesData[activeSampleIndex].sampleNumber}
                  </h3>
                  <p className="text-xs text-slate-400">Enter measured dimensions or qualitative pass/fail status</p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowDefectForm(!showDefectForm)}
                  className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30 text-xs font-semibold flex items-center gap-1.5"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Log Defect / NCR</span>
                </button>
              </div>

              {/* Checkpoint Rows */}
              <div className="space-y-3">
                {samplesData[activeSampleIndex].results.map((cp, cpIdx) => {
                  const evalResult = evaluateCheckpoint(cp);
                  return (
                    <div
                      key={cpIdx}
                      className={`p-3.5 rounded-xl border transition-all ${
                        evalResult.isPass
                          ? 'bg-slate-800/40 border-slate-700/80'
                          : 'bg-rose-950/20 border-rose-500/50 shadow-sm shadow-rose-950'
                      }`}
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        {/* Checkpoint Name & Spec Description */}
                        <div className="space-y-1 md:w-1/3">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white">{cp.checkpointName}</span>
                            {cp.critical && (
                              <span className="px-1.5 py-0.5 rounded bg-rose-950 text-rose-400 border border-rose-800 text-[9px] uppercase font-mono">
                                Critical Gate
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400">{cp.instructions || 'Standard test protocol'}</p>
                        </div>

                        {/* Nominal & Tolerance Target */}
                        <div className="font-mono text-xs text-slate-300 md:w-1/4">
                          {cp.type === 'quantitative' ? (
                            <div>
                              <span className="text-[10px] uppercase text-slate-500 block">Spec Envelope</span>
                              <span>Target: {cp.nominal} {cp.unit}</span>
                              <div className="text-[11px] text-slate-400">
                                Limits: [{cp.minTolerance} - {cp.maxTolerance}] {cp.unit}
                              </div>
                            </div>
                          ) : (
                            <div>
                              <span className="text-[10px] uppercase text-slate-500 block">Visual Criterion</span>
                              <span>Conforming vs Non-Conforming</span>
                            </div>
                          )}
                        </div>

                        {/* Measurement Input */}
                        <div className="md:w-1/4">
                          <span className="text-[10px] uppercase text-slate-500 block mb-1">Measured Value</span>
                          {cp.type === 'quantitative' ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                step="any"
                                value={cp.value}
                                onChange={(e) => handleMeasurementChange(activeSampleIndex, cpIdx, e.target.value)}
                                className={`w-32 bg-slate-900 border rounded-lg px-3 py-1.5 text-xs font-mono font-bold focus:outline-none ${
                                  evalResult.isPass
                                    ? 'border-slate-700 text-white focus:border-sky-500'
                                    : 'border-rose-500 text-rose-400 focus:border-rose-400 bg-rose-950/30'
                                }`}
                              />
                              <span className="text-xs font-mono text-slate-400">{cp.unit}</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleMeasurementChange(activeSampleIndex, cpIdx, true)}
                                className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                                  cp.value === true
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                }`}
                              >
                                Pass
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMeasurementChange(activeSampleIndex, cpIdx, false)}
                                className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                                  cp.value === false
                                    ? 'bg-rose-600 text-white'
                                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                }`}
                              >
                                Fail
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Instant Real-Time Status & Deviation */}
                        <div className="md:w-1/5 text-right font-mono">
                          <span className="text-[10px] uppercase text-slate-500 block mb-1">Evaluation</span>
                          <div className="flex items-center justify-end gap-2">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase border ${
                                evalResult.isPass
                                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                  : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                              }`}
                            >
                              {evalResult.text}
                            </span>
                          </div>
                          {cp.type === 'quantitative' && (
                            <span className="text-[10px] text-slate-400 block mt-0.5">
                              Δ {evalResult.deviation >= 0 ? `+${evalResult.deviation}` : evalResult.deviation} {cp.unit}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Inline Defect Logger Form */}
          {showDefectForm && (
            <div className="p-5 rounded-xl bg-amber-950/20 border border-amber-500/40 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-amber-400 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Log Quality Defect for Sample #{activeSampleIndex + 1}</span>
                  </h3>
                  <p className="text-xs text-amber-300/80">Tag non-conformance severity and trigger corrective action trail</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDefectForm(false)}
                  className="text-xs text-amber-400 hover:text-amber-200"
                >
                  Close
                </button>
              </div>

              <form onSubmit={handleAddDefect} className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] font-mono text-slate-300 mb-1">Defect Category *</label>
                  <select
                    value={newDefect.category}
                    onChange={(e) => setNewDefect({ ...newDefect, category: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  >
                    <option value="Dimensional">Dimensional</option>
                    <option value="Cosmetic">Cosmetic</option>
                    <option value="Functional">Functional</option>
                    <option value="Material">Material</option>
                    <option value="Packaging">Packaging</option>
                    <option value="Assembly">Assembly</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-slate-300 mb-1">Severity Level *</label>
                  <select
                    value={newDefect.severity}
                    onChange={(e) => setNewDefect({ ...newDefect, severity: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  >
                    <option value="Minor">Minor (Non-critical cosmetic)</option>
                    <option value="Major">Major (Out-of-spec requirement)</option>
                    <option value="Critical">Critical (Immediate Quarantine)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-slate-300 mb-1">Associated Checkpoint</label>
                  <input
                    type="text"
                    value={newDefect.checkpointName}
                    onChange={(e) => setNewDefect({ ...newDefect, checkpointName: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                    placeholder="e.g. Wall Thickness"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-mono text-slate-300 mb-1">Defect Description *</label>
                  <input
                    type="text"
                    required
                    placeholder="Describe exact breach, visual defect, or anomaly observed..."
                    value={newDefect.description}
                    onChange={(e) => setNewDefect({ ...newDefect, description: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-slate-300 mb-1">Action Taken</label>
                  <input
                    type="text"
                    value={newDefect.actionTaken}
                    onChange={(e) => setNewDefect({ ...newDefect, actionTaken: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  />
                </div>

                <div className="sm:col-span-3 flex justify-end">
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs shadow"
                  >
                    Confirm Defect Log
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Active Defects List */}
          {defects.length > 0 && (
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
              <h4 className="text-xs font-mono font-semibold uppercase text-rose-400">
                Logged Defects for this Inspection Run ({defects.length})
              </h4>
              <div className="space-y-2">
                {defects.map((d, i) => (
                  <div key={i} className="p-2.5 rounded-lg bg-rose-950/20 border border-rose-800/40 flex items-center justify-between text-xs">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-200">Sample #{d.sampleNumber}: {d.category}</span>
                        <span className="px-1.5 py-0.2 rounded bg-rose-900 text-rose-200 text-[10px] font-mono uppercase font-bold">
                          {d.severity}
                        </span>
                        <span className="text-slate-400 text-[11px]">({d.checkpointName})</span>
                      </div>
                      <p className="text-slate-300">{d.description}</p>
                      <p className="text-[11px] text-slate-400 font-mono">Action: {d.actionTaken}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveDefect(i)}
                      className="p-1 text-slate-500 hover:text-rose-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Inspector Sign-Off & Submission Footer */}
          <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
            <h3 className="text-sm font-semibold text-white tracking-wide">Inspection Authorization & Sign-Off</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">Inspector Full Name *</label>
                <input
                  type="text"
                  required
                  value={inspectorName}
                  onChange={(e) => setInspectorName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1">Overall Inspection Summary Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Dimensions verified within 50 micron tolerance envelope."
                  value={summaryNotes}
                  onChange={(e) => setSummaryNotes(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-slate-800">
              <div className="text-xs text-slate-400">
                <span>Calculated Outcome: </span>
                <span className={`font-mono font-bold ${realTimeStatus.isOverallPass ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {realTimeStatus.isOverallPass ? 'PASS (100% Conforming)' : 'FAIL / QUARANTINE TRIGGERED'}
                </span>
                <span className="text-slate-500 ml-2">({realTimeStatus.passRate}% compliance)</span>
              </div>

              <button
                type="button"
                disabled={submitting}
                onClick={handleSubmitInspection}
                className={`px-6 py-2.5 rounded-lg text-white font-semibold text-xs shadow-lg transition-all flex items-center gap-2 ${
                  realTimeStatus.isOverallPass
                    ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
                    : 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/20'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>{submitting ? 'Recording Inspection...' : 'Record & Complete Inspection'}</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-12 text-center text-slate-500 bg-slate-900 rounded-xl border border-slate-800">
          Please select a batch from above to begin inspection.
        </div>
      )}
    </div>
  );
};

